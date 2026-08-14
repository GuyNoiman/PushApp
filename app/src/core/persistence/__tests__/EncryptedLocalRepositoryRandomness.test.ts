/**
 * Randomness tests for EncryptedLocalRepository's aesCryptoProvider.
 *
 * The regression these lock down: the provider used to fall back to Math.random()
 * when no CSPRNG was reachable, so the 256-bit DEK protecting every Journey, why
 * and reflection could be guessable — and because Node/Jest DOES have Web Crypto,
 * the whole suite went green while a real device took the weak path. So we simulate
 * the device: strip globalThis.crypto and control what expo-crypto exposes.
 *
 * expo-crypto is a native module, so each environment needs a fresh module copy
 * (jest.isolateModules + doMock). globalThis.crypto is read at call time, so that
 * one can just be swapped in place.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

import { randomFillSync } from 'crypto';

import type { CryptoProvider } from '../EncryptedLocalRepository';

/** A stand-in for the expo-crypto module surface we depend on. */
type ExpoCryptoStub = { getRandomValues?: (a: Uint8Array) => Uint8Array };

/** Load a fresh copy of the module against a given expo-crypto stand-in. */
function providerWithExpoCrypto(stub: ExpoCryptoStub): CryptoProvider {
  let provider!: CryptoProvider;
  jest.isolateModules(() => {
    jest.doMock('expo-crypto', () => stub);
    provider = (require('../EncryptedLocalRepository') as typeof import('../EncryptedLocalRepository'))
      .aesCryptoProvider;
  });
  return provider;
}

/** Run fn on a runtime with no Web Crypto — i.e. Hermes on a real device. */
function withoutWebCrypto<T>(fn: () => T): T {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    return fn();
  } finally {
    if (real) Object.defineProperty(globalThis, 'crypto', real);
    else delete (globalThis as { crypto?: unknown }).crypto;
  }
}

/** The real native module's behaviour, modelled with Node's CSPRNG. */
const workingNativeRng: ExpoCryptoStub = {
  getRandomValues: (a) => {
    randomFillSync(a);
    return a;
  },
};

describe('there is no weak fallback: no CSPRNG means throw, never weak bytes', () => {
  it('throws when neither Web Crypto nor expo-crypto can supply randomness', () => {
    const provider = providerWithExpoCrypto({}); // native module without the method
    withoutWebCrypto(() => {
      expect(() => provider.randomKeyHex()).toThrow(
        /no cryptographically secure random source is available/,
      );
    });
  });

  it('throws with an InsecureRandomnessError, named so a crash report is unambiguous', () => {
    const provider = providerWithExpoCrypto({});
    withoutWebCrypto(() => {
      try {
        provider.randomKeyHex();
        throw new Error('expected randomKeyHex() to throw');
      } catch (e) {
        expect((e as Error).name).toBe('InsecureRandomnessError');
      }
    });
  });

  it('throws for the IV too, so encrypt() cannot produce a blob with a weak IV', () => {
    const provider = providerWithExpoCrypto({});
    withoutWebCrypto(() => {
      expect(() => provider.encrypt('secret', 'a'.repeat(64))).toThrow(
        /no cryptographically secure random source is available/,
      );
    });
  });

  it('throws when the RNG is a no-op stub that leaves the buffer all zeros', () => {
    // This is exactly what an unlinked/mocked native module does — and an
    // all-zero key would otherwise sail through looking completely normal.
    const provider = providerWithExpoCrypto({ getRandomValues: (a) => a });
    withoutWebCrypto(() => {
      expect(() => provider.randomKeyHex()).toThrow(/returned all-zero bytes/);
    });
  });
});

describe('the on-device path: expo-crypto when Hermes has no Web Crypto', () => {
  it('produces a full-length 256-bit key from the native CSPRNG', () => {
    const provider = providerWithExpoCrypto(workingNativeRng);
    withoutWebCrypto(() => {
      expect(provider.randomKeyHex()).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it('produces a different key on every call', () => {
    const provider = providerWithExpoCrypto(workingNativeRng);
    withoutWebCrypto(() => {
      const keys = new Set(Array.from({ length: 32 }, () => provider.randomKeyHex()));
      expect(keys.size).toBe(32);
    });
  });

  it('still round-trips a real AES payload with a natively-generated key + IV', () => {
    const provider = providerWithExpoCrypto(workingNativeRng);
    withoutWebCrypto(() => {
      const key = provider.randomKeyHex();
      const payload = provider.encrypt('because I choose to', key);
      expect(payload).not.toContain('because I choose to');
      expect(provider.decrypt(payload, key)).toBe('because I choose to');
    });
  });

  it('uses a fresh IV per encryption, so identical plaintext gives distinct blobs', () => {
    const provider = providerWithExpoCrypto(workingNativeRng);
    withoutWebCrypto(() => {
      const key = provider.randomKeyHex();
      const a = JSON.parse(provider.encrypt('same', key)) as { iv: string };
      const b = JSON.parse(provider.encrypt('same', key)) as { iv: string };
      expect(a.iv).toMatch(/^[0-9a-f]{32}$/); // 128-bit IV
      expect(b.iv).not.toBe(a.iv);
    });
  });
});

describe('the web/Node path: Web Crypto when it is present', () => {
  it('prefers Web Crypto and never touches expo-crypto', () => {
    const expoRng = jest.fn((a: Uint8Array) => a);
    const provider = providerWithExpoCrypto({ getRandomValues: expoRng });

    // globalThis.crypto is real here, so the no-op expo stub must not be reached
    // (if it were, the all-zero guard would throw).
    expect(provider.randomKeyHex()).toMatch(/^[0-9a-f]{64}$/);
    expect(expoRng).not.toHaveBeenCalled();
  });

  it('produces a different key on every call', () => {
    const provider = providerWithExpoCrypto({});
    const keys = new Set(Array.from({ length: 32 }, () => provider.randomKeyHex()));
    expect(keys.size).toBe(32);
  });
});
