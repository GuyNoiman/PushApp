/**
 * secureSessionStore — a chunking, SecureStore-backed key/value adapter for the
 * Supabase session (Auth_Backend_Proposal red-line R2: the refresh token must be
 * encrypted at rest in the OS keychain/keystore, not plaintext AsyncStorage).
 *
 * Two SecureStore gotchas this adapter handles:
 *
 * 1) SIZE — values are capped at ~2048 UTF-8 BYTES each (see
 *    node_modules/expo-secure-store/build/byteCounter.js). A Supabase session
 *    (access + refresh JWTs + user object) routinely exceeds that. The limit is
 *    BYTES, not JS chars, so a non-ASCII payload (emoji, an accented name once
 *    real sign-in lands) can blow a "1800-char" chunk past 2048 bytes and get
 *    silently dropped → logged out next launch. We therefore split on a UTF-8
 *    BYTE budget, never on a char count, keeping every chunk comfortably under
 *    the cap and never severing a surrogate pair.
 *
 * 2) ATOMICITY — writing chunks in place then the manifest last means an
 *    interrupted write can leave new fragments + an old tail + a stale manifest
 *    → a corrupt splice on the next read. We stage the new value under a fresh
 *    generation of chunk keys, then publish by flipping the manifest to that
 *    generation and deleting the previous one. A crash mid-write leaves the OLD
 *    generation fully intact (the manifest still points at it), so the session
 *    survives instead of corrupting.
 *
 * The backend is injected so this is pure-TS testable without a device keychain.
 */

/** The subset of expo-secure-store this adapter needs (injected for testability). */
export interface SecureStoreBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/** Supabase's session-store shape (a subset of the Web Storage-like contract). */
export interface SessionStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Per-chunk UTF-8 byte budget. Well under SecureStore's 2048-byte cap to leave
 * headroom for OS entry overhead and to guarantee we never straddle the limit.
 */
const CHUNK_BYTES = 1500;

/**
 * Manifest stored at the base key. `gen` disambiguates which staged generation the
 * chunks belong to so a swap is atomic-ish: the manifest flip is the single commit
 * point, and each write uses a new generation so the old one stays readable.
 */
type ChunkManifest = { chunks: number; gen: number };

function chunkKey(key: string, gen: number, i: number): string {
  return `${key}.${gen}.${i}`;
}

/** UTF-8 byte length of a code point (matches expo-secure-store's byteCounter). */
function utf8Bytes(codePoint: number): number {
  return codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
}

/**
 * Split a string into pieces whose UTF-8 encoding never exceeds `maxBytes`,
 * never breaking a surrogate pair (a pair is emitted as one 4-byte unit).
 */
function splitByUtf8Bytes(value: string, maxBytes: number): string[] {
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    let unit = value[i];
    let bytes: number;
    // High surrogate followed by a low surrogate → one 4-byte code point.
    if (code >= 0xd800 && code < 0xdc00 && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next < 0xe000) {
        unit = value[i] + value[i + 1];
        bytes = 4;
        i += 1;
      } else {
        bytes = utf8Bytes(code);
      }
    } else {
      bytes = utf8Bytes(code);
    }
    if (currentBytes + bytes > maxBytes && current.length > 0) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += unit;
    currentBytes += bytes;
  }
  if (current.length > 0 || parts.length === 0) parts.push(current);
  return parts;
}

export function createSecureSessionStore(backend: SecureStoreBackend): SessionStore {
  async function readManifest(key: string): Promise<ChunkManifest | null> {
    const header = await backend.getItemAsync(key);
    if (header == null) return null;
    try {
      const parsed = JSON.parse(header) as Partial<ChunkManifest>;
      if (typeof parsed.chunks === 'number' && typeof parsed.gen === 'number') {
        return { chunks: parsed.chunks, gen: parsed.gen };
      }
    } catch {
      // Not our manifest — a legacy/foreign value (see getItem below).
    }
    return null;
  }

  async function deleteGeneration(key: string, gen: number, chunks: number): Promise<void> {
    for (let i = 0; i < chunks; i += 1) {
      await backend.deleteItemAsync(chunkKey(key, gen, i));
    }
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const header = await backend.getItemAsync(key);
      if (header == null) return null;
      const manifest = await readManifest(key);
      if (!manifest) {
        // Legacy/foreign value written without our manifest — return it as-is.
        return header;
      }
      if (manifest.chunks < 1) return null;
      const parts: string[] = [];
      for (let i = 0; i < manifest.chunks; i += 1) {
        const part = await backend.getItemAsync(chunkKey(key, manifest.gen, i));
        // Missing mid-chunk (corrupt/partial) → treat as no session: logged out, not crashed.
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key: string, value: string): Promise<void> {
      const prev = await readManifest(key);
      const nextGen = prev ? prev.gen + 1 : 0;
      const pieces = splitByUtf8Bytes(value, CHUNK_BYTES);
      try {
        // Stage the new generation's chunks (the old generation stays untouched).
        for (let i = 0; i < pieces.length; i += 1) {
          await backend.setItemAsync(chunkKey(key, nextGen, i), pieces[i]);
        }
        // COMMIT POINT: flip the manifest to the new generation. A crash before
        // this leaves the old generation live; a crash after leaves the new one live.
        await backend.setItemAsync(
          key,
          JSON.stringify({ chunks: pieces.length, gen: nextGen } satisfies ChunkManifest),
        );
        // Publish succeeded → reclaim the previous generation's chunks.
        if (prev) await deleteGeneration(key, prev.gen, prev.chunks);
      } catch (e) {
        // Roll back any staged (uncommitted) chunks so we don't leak fragments.
        // The previous generation + manifest are still intact and readable.
        try {
          await deleteGeneration(key, nextGen, pieces.length);
        } catch {
          // best-effort cleanup — never mask the original write error
        }
        throw e;
      }
    },

    async removeItem(key: string): Promise<void> {
      const manifest = await readManifest(key);
      if (manifest) await deleteGeneration(key, manifest.gen, manifest.chunks);
      await backend.deleteItemAsync(key);
    },
  };
}
