/**
 * The encryption boundary: both participants can read a message, nobody else can, and a failure
 * returns null rather than ciphertext.
 */
import { boxFor, fromBase64, generateDeviceKeys, KEY_VERSION, open, seal, toBase64 } from '../crypto';

describe('base64', () => {
  it('round-trips, including lengths that need padding', () => {
    for (const text of ['a', 'ab', 'abc', 'abcd', 'שלום', '🙂 hello']) {
      const bytes = new TextEncoder().encode(text);
      expect(new TextDecoder().decode(fromBase64(toBase64(bytes)))).toBe(text);
    }
  });
});

describe('sealing a message', () => {
  const alice = generateDeviceKeys();
  const bob = generateDeviceKeys();

  it('gives each side a keypair nobody else has', () => {
    expect(alice.publicKey).not.toBe(bob.publicKey);
    expect(alice.secretKey).not.toBe(alice.publicKey);
  });

  it('lets the recipient read it', () => {
    const sealed = seal('are you ok?', alice.secretKey, alice.publicKey, bob.publicKey);
    const text = open({ ciphertext: boxFor(sealed, false), nonce: sealed.nonce }, bob.secretKey, alice.publicKey);
    expect(text).toBe('are you ok?');
  });

  it('lets the SENDER read their own thread back', () => {
    const sealed = seal('I am here', alice.secretKey, alice.publicKey, bob.publicKey);
    const text = open({ ciphertext: boxFor(sealed, true), nonce: sealed.nonce }, alice.secretKey, alice.publicKey);
    expect(text).toBe('I am here');
  });

  it('carries Hebrew and emoji intact', () => {
    const body = 'אני איתך 🤍';
    const sealed = seal(body, alice.secretKey, alice.publicKey, bob.publicKey);
    expect(open({ ciphertext: boxFor(sealed, false), nonce: sealed.nonce }, bob.secretKey, alice.publicKey)).toBe(body);
  });

  it('is unreadable to a third device', () => {
    const eve = generateDeviceKeys();
    const sealed = seal('private', alice.secretKey, alice.publicKey, bob.publicKey);
    expect(open({ ciphertext: boxFor(sealed, false), nonce: sealed.nonce }, eve.secretKey, alice.publicKey)).toBeNull();
  });

  it('never repeats a nonce', () => {
    const nonces = new Set(
      Array.from({ length: 50 }, () => seal('hi', alice.secretKey, alice.publicKey, bob.publicKey).nonce),
    );
    expect(nonces.size).toBe(50);
  });

  it('produces different ciphertext for the same words', () => {
    const a = seal('hi', alice.secretKey, alice.publicKey, bob.publicKey);
    const b = seal('hi', alice.secretKey, alice.publicKey, bob.publicKey);
    expect(a.forRecipient).not.toBe(b.forRecipient);
  });

  it('stamps the key version, so a later rotation can tell what sealed it', () => {
    expect(seal('hi', alice.secretKey, alice.publicKey, bob.publicKey).keyVersion).toBe(KEY_VERSION);
  });

  it('refuses a tampered box instead of returning something', () => {
    const sealed = seal('hello', alice.secretKey, alice.publicKey, bob.publicKey);
    const tampered = `${sealed.forRecipient.slice(0, -4)}AAAA`;
    expect(open({ ciphertext: tampered, nonce: sealed.nonce }, bob.secretKey, alice.publicKey)).toBeNull();
  });

  it('returns null — never ciphertext — for rubbish', () => {
    expect(open({ ciphertext: 'not base64 at all!!', nonce: 'x' }, bob.secretKey, alice.publicKey)).toBeNull();
  });

  it('the plaintext is nowhere in what travels', () => {
    const sealed = seal('the secret sentence', alice.secretKey, alice.publicKey, bob.publicKey);
    expect(JSON.stringify(sealed)).not.toContain('secret');
  });
});
