/**
 * The encryption boundary for direct messages — the one place plaintext becomes ciphertext, and the
 * only file in the app that touches key material.
 *
 * THE GUARANTEE (Inbox PRD §14.1): a message body is readable by the two participants' devices and
 * by nobody else. Not by the server, not by us, not by the coach, not by analytics. That is why this
 * is a module with a seam rather than a few lines inside a gateway: everything that could weaken it
 * has to pass through here, where it can be read and tested.
 *
 * WHAT IS IMPLEMENTED, and its honest limits. Each device generates a Curve25519 keypair; the public
 * half is published on the person's profile and the secret half never leaves the device's secure
 * store. A message is sealed twice — once to the recipient and once to the sender — so both can read
 * the thread and the server holds only two sealed boxes. `nacl.box` is X25519 key agreement with
 * XSalsa20-Poly1305, authenticated, with a fresh random nonce per message.
 *
 * WHAT THIS DOES NOT DO, said plainly rather than implied:
 *  · **One device per account.** A second device generates a different key and CANNOT read history
 *    sealed to the first. The PRD anticipates exactly this (§14.2): when secure restoration cannot
 *    decrypt, the product does not bypass encryption — it says so and continues with a new session.
 *  · **No forward secrecy.** A compromised secret key can open every past message sealed to it.
 *    Ratcheting is a later decision, not a silent assumption.
 *  · **No key verification between people.** The server states which public key belongs to whom; a
 *    dishonest server could substitute one. Safety numbers are the answer and are not built.
 * These are written here because an encryption module that overstates itself is worse than none.
 *
 * Pure TypeScript over `tweetnacl` — no React, no storage, no network. The key STORE is injected.
 */
import nacl from 'tweetnacl';

/** A device's keypair. The secret half must never be logged, synced or exported. */
export interface DeviceKeyPair {
  publicKey: string;
  secretKey: string;
}

/** What travels: a sealed box, its nonce, and who it is sealed for. */
export interface SealedMessage {
  /** Base64 ciphertext for the recipient. */
  forRecipient: string;
  /** Base64 ciphertext for the sender, so their own thread is readable. */
  forSender: string;
  /** Base64 nonce, unique per message. */
  nonce: string;
  /** Which key version sealed it, for a future rotation to be able to tell. */
  keyVersion: string;
}

export const KEY_VERSION = 'x25519-xsalsa20-poly1305.v1';

// ── base64 without a vendor dependency, because `tweetnacl-util` is not RN-safe everywhere ──
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let byte = 0;
  let bits = 0;
  let index = 0;
  for (const char of clean) {
    const value = B64.indexOf(char);
    if (value < 0) continue;
    byte = (byte << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (byte >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, index);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** A fresh device identity. Called once per install, then stored in the device's secure store. */
export function generateDeviceKeys(): DeviceKeyPair {
  const pair = nacl.box.keyPair();
  return { publicKey: toBase64(pair.publicKey), secretKey: toBase64(pair.secretKey) };
}

/**
 * Seal a message to the recipient AND to the sender.
 *
 * Sealing twice is what makes an encrypted thread readable by the person who wrote it without the
 * server ever holding a key. The nonce is shared between the two boxes and is random per message —
 * never a counter, which would repeat across devices.
 */
export function seal(
  body: string,
  senderSecretKey: string,
  senderPublicKey: string,
  recipientPublicKey: string,
): SealedMessage {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = encoder.encode(body);
  const secret = fromBase64(senderSecretKey);
  return {
    forRecipient: toBase64(nacl.box(message, nonce, fromBase64(recipientPublicKey), secret)),
    forSender: toBase64(nacl.box(message, nonce, fromBase64(senderPublicKey), secret)),
    nonce: toBase64(nonce),
    keyVersion: KEY_VERSION,
  };
}

/**
 * Open a sealed box.
 *
 * Returns `null` — never throws, and never returns ciphertext — when it cannot be opened: a message
 * sealed to another device, a rotated key, a corrupted payload. The screen shows an unavailable
 * message and a recovery path (PRD §20); showing the bytes would be both useless and alarming.
 */
export function open(
  sealed: Pick<SealedMessage, 'nonce'> & { ciphertext: string },
  mySecretKey: string,
  theirPublicKey: string,
): string | null {
  try {
    const opened = nacl.box.open(
      fromBase64(sealed.ciphertext),
      fromBase64(sealed.nonce),
      fromBase64(theirPublicKey),
      fromBase64(mySecretKey),
    );
    return opened ? decoder.decode(opened) : null;
  } catch {
    return null;
  }
}

/** Which of the two boxes this reader should try. */
export function boxFor(sealed: SealedMessage, iAmSender: boolean): string {
  return iAmSender ? sealed.forSender : sealed.forRecipient;
}
