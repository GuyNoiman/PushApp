/**
 * MediaGateway — the seam between anything that wants a photo or a voice note and the two native
 * modules that provide them.
 *
 * WHY A SEAM AND NOT A DIRECT CALL. The founder's own framing: these are capabilities we will need in
 * several places — a letter to a future self, a moment worth recording, a hard day, a challenge's
 * proof. A screen that calls `expo-image-picker` directly is a screen that has to be rewritten when
 * the module changes, and four screens that do it are four places where a permission prompt gets
 * worded differently. It also keeps every test free of native modules, which is what lets the tools
 * be tested at all.
 *
 * ── WHAT AN ATTACHMENT IS, AND IS NOT ──────────────────────────────────────────────────────────
 *
 * An {@link Attachment} is a FILE ON THIS DEVICE and a little metadata. It is not a URL, not a
 * blob in memory, and not something that has been uploaded anywhere. Nothing in this layer sends
 * anything: the tools that use it are on-device-only by design (G1), and the day one of them needs
 * to leave the phone that is a decision with a review, not a new parameter here.
 *
 * ── PERMISSION IS PART OF THE CALL ─────────────────────────────────────────────────────────────
 *
 * Every method asks for what it needs and returns a plain `'denied'` rather than throwing. A denied
 * permission is an ordinary answer — somebody said no — and code that treats it as an exception ends
 * up showing an error where it should show the rest of the app working fine.
 *
 * Pure TypeScript at the seam; the implementation loads the vendor modules lazily so a build without
 * them still runs (the same pattern `core/auth/nativeIdentity` uses).
 */

/** What a stored attachment is. The `uri` is a file on THIS device. */
export interface Attachment {
  id: string;
  kind: 'image' | 'audio';
  /** A local file URI. Never a remote URL — nothing here uploads. */
  uri: string;
  /** Bytes on disk, so a caller can enforce a size budget without reading the file. */
  bytes?: number;
  /** Seconds, for audio only. */
  seconds?: number;
  createdAt: number;
}

/** Why nothing came back. Each is an ordinary outcome, not an error. */
export type MediaFailure =
  /** The person said no to the permission, or has denied it before. */
  | 'denied'
  /** They opened the picker or the recorder and backed out. Not a failure at all. */
  | 'cancelled'
  /** The module is not in this build. A JS-only build has no camera; it must still run. */
  | 'unavailable'
  /** Something went wrong and there is nothing useful to say about it. */
  | 'failed';

export type MediaResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: MediaFailure };

/** A recording in progress. Stopping it is what produces the attachment. */
export interface Recording {
  stop: () => Promise<MediaResult>;
  cancel: () => Promise<void>;
}

export interface MediaGateway {
  /** Whether this build can do each thing at all, without prompting for anything. */
  readonly capabilities: { images: boolean; camera: boolean; audio: boolean };
  /** Choose an existing photo. */
  pickImage: () => Promise<MediaResult>;
  /** Take one now. */
  captureImage: () => Promise<MediaResult>;
  /** Begin a voice note. `null` when it could not start, with the reason already surfaced. */
  startRecording: () => Promise<{ ok: true; recording: Recording } | { ok: false; reason: MediaFailure }>;
  /** Delete an attachment's file. Called when the thing it belonged to is deleted. */
  discard: (attachment: Attachment) => Promise<void>;
}

/**
 * The gateway a build without the native modules gets — and the one every test gets.
 *
 * It reports no capabilities and answers `unavailable` to everything, which is the truth. A screen
 * built against this never crashes; it simply does not offer what it cannot do.
 */
export const NullMediaGateway: MediaGateway = {
  capabilities: { images: false, camera: false, audio: false },
  pickImage: async () => ({ ok: false, reason: 'unavailable' }),
  captureImage: async () => ({ ok: false, reason: 'unavailable' }),
  startRecording: async () => ({ ok: false, reason: 'unavailable' }),
  discard: async () => {},
};

let gateway: MediaGateway = NullMediaGateway;

/** Install the real gateway at startup. Tests leave the null one in place. */
export function setMediaGateway(next: MediaGateway): void {
  gateway = next;
}

export function getMediaGateway(): MediaGateway {
  return gateway;
}
