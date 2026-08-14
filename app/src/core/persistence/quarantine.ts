/**
 * Quarantine — what we do with a stored snapshot we cannot open.
 *
 * THE RULE (Encryption_Design §6.2, invariant I1): at no point does the only
 * copy of the user's data stop existing. A snapshot that fails to decrypt or to
 * parse is NOT deleted and is NOT left sitting in the live slot where the next
 * write would clobber it. It is copied, byte for byte, to a quarantine key that
 * nothing in the normal write path ever touches, and a marker records why.
 *
 * WHY A MARKER. Once the unreadable bytes have been moved aside, the live slot is
 * empty — which looks exactly like a first run. The marker (`pushapp.recovery.state`)
 * is what stops the next launch from cheerfully seeding demo data over a user who
 * still has data on the device. It survives relaunches and is only removed by an
 * explicit wipe.
 *
 * WHY THE MARKER ALSO INDEXES THE BLOBS. AsyncStorage's key enumeration is not part
 * of our injected KeyValueStore seam, so the marker carries the list of quarantined
 * keys itself. That keeps storage bounded (at most {@link MAX_QUARANTINED_SNAPSHOTS},
 * oldest dropped first) without a directory scan.
 *
 * WRITE ORDER, and what a crash in the middle leaves behind:
 *   1. copy the bytes to the quarantine key   nothing has been removed yet
 *   2. write/refresh the marker  ← COMMIT     the copy is now indexed
 *   3. clear the live slot                    tidy-up only; safe to fail
 *   4. drop blobs beyond the cap              tidy-up only; safe to fail
 * A crash between 1 and 2 leaves an unindexed copy and an intact live slot, so the
 * next launch simply quarantines again — one orphaned blob is the entire cost, and
 * it is the right side to fail on.
 *
 * The marker is deliberately SEPARATE from `firstRunConsumed` (§6.5): "the user
 * deleted their account" and "we cannot read the data" are different states and
 * neither may imply the other.
 */
import type { KeyValueStore } from './keyValueStore';
import type { LoadFailureReason } from './Repository';

/** Prefix of every quarantined snapshot key; the epoch-ms of the failure follows. */
export const QUARANTINE_KEY_PREFIX = 'pushapp.state.quarantine.';
/** Where the "we could not open the data" marker lives (plaintext; holds no personal data). */
export const RECOVERY_MARKER_KEY = 'pushapp.recovery.state';
/** How many unreadable snapshots we keep. Oldest is dropped, so storage stays bounded. */
export const MAX_QUARANTINED_SNAPSHOTS = 2;

/**
 * The persisted marker. It holds a classification and timestamps only — never any
 * of the user's content, which stays inside the (still encrypted) quarantined blob.
 */
export interface RecoveryMarker {
  /** Marker schema version, so a later shape can be read without guessing. */
  v: 1;
  reason: LoadFailureReason;
  /** When the failure was FIRST seen (epoch ms); preserved across later failures. */
  at: number;
  /** Quarantined snapshot keys, newest first. */
  blobs: string[];
}

/** Narrow a value read back off disk to a known classification. */
function isFailureReason(value: unknown): value is LoadFailureReason {
  return value === 'key-lost' || value === 'corrupt' || value === 'malformed';
}

/** The marker, or null when there is none / it is unreadable (a marker never blocks a load). */
export async function readRecoveryMarker(kv: KeyValueStore): Promise<RecoveryMarker | null> {
  let raw: string | null = null;
  try {
    raw = await kv.getItem(RECOVERY_MARKER_KEY);
  } catch {
    return null;
  }
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RecoveryMarker>;
    if (!isFailureReason(parsed.reason) || typeof parsed.at !== 'number') return null;
    return {
      v: 1,
      reason: parsed.reason,
      at: parsed.at,
      blobs: Array.isArray(parsed.blobs) ? parsed.blobs.filter((b) => typeof b === 'string') : [],
    };
  } catch {
    return null;
  }
}

export interface QuarantineInput {
  /**
   * The live storage key the unreadable bytes currently occupy, cleared once the
   * copy is committed. Pass null to COPY ONLY and leave the original in place —
   * used when the failure may be transient (a keychain that was simply unavailable),
   * so the next launch can still find and read the real slot.
   */
  sourceKey: string | null;
  /** The bytes themselves, exactly as read — never re-encoded. */
  raw: string;
  reason: LoadFailureReason;
  /** Clock, injected so tests are deterministic. */
  now: number;
}

export interface QuarantineOutcome {
  /** Where the bytes were copied to, or null when even the copy failed. */
  quarantinedKey: string | null;
  /** When the failure was first seen (epoch ms) — from an earlier marker if there is one. */
  at: number;
  reason: LoadFailureReason;
}

/**
 * Move an unreadable snapshot out of harm's way. Returns what happened rather than
 * throwing: a failure to quarantine must still leave the caller able to report the
 * problem, and it must never turn into "start empty and overwrite".
 *
 * The live slot is cleared ONLY after the copy exists. If the copy could not be
 * written, the original stays exactly where it is — still unreadable, still safe.
 */
export async function quarantineSnapshot(
  kv: KeyValueStore,
  input: QuarantineInput,
): Promise<QuarantineOutcome> {
  const previous = await readRecoveryMarker(kv);
  const firstSeen = previous?.at ?? input.now;

  // Unique even if two failures land in the same millisecond (a re-quarantine of a
  // second slot on one launch), so a copy can never overwrite an earlier copy. The
  // store is consulted as well as the index: a blob whose marker was lost is still
  // somebody's only copy.
  let key = `${QUARANTINE_KEY_PREFIX}${input.now}`;
  const taken = new Set(previous?.blobs ?? []);
  for (let n = 1; taken.has(key) || (await kv.getItem(key)) != null; n += 1) {
    key = `${QUARANTINE_KEY_PREFIX}${input.now}.${n}`;
  }

  try {
    await kv.setItem(key, input.raw); // 1) copy first — always
  } catch {
    // No copy, so nothing may be removed. Record the classification if we can, and
    // leave the original bytes in the live slot for the next attempt.
    await writeMarker(kv, { v: 1, reason: input.reason, at: firstSeen, blobs: previous?.blobs ?? [] });
    return { quarantinedKey: null, at: firstSeen, reason: input.reason };
  }

  const blobs = [key, ...(previous?.blobs ?? [])];
  const kept = blobs.slice(0, MAX_QUARANTINED_SNAPSHOTS);
  const dropped = blobs.slice(MAX_QUARANTINED_SNAPSHOTS);

  // 2) COMMIT. The live slot is cleared only if this lands: an uncommitted copy plus
  //    an emptied slot would read as a first run on the next launch, which is the
  //    exact silent reset we are here to prevent.
  const committed = await writeMarker(kv, { v: 1, reason: input.reason, at: firstSeen, blobs: kept });

  if (committed) {
    if (input.sourceKey != null) {
      try {
        await kv.removeItem(input.sourceKey); // 3) the live slot is now safe to clear
      } catch {
        // Tidy-up only: the copy is committed, so a stale live blob costs storage, not data.
      }
    }
    for (const old of dropped) {
      try {
        await kv.removeItem(old); // 4) keep the quarantine bounded
      } catch {
        // Same: a leftover blob is a storage leak, never a correctness problem.
      }
    }
  }

  return { quarantinedKey: key, at: firstSeen, reason: input.reason };
}

/**
 * Drop the quarantine and the marker. Called ONLY from a deliberate wipe
 * (account deletion, or the user choosing to start fresh from the recovery
 * screen) — never from the load or save path.
 */
export async function clearQuarantine(kv: KeyValueStore): Promise<void> {
  const marker = await readRecoveryMarker(kv);
  for (const blob of marker?.blobs ?? []) {
    try {
      await kv.removeItem(blob);
    } catch {
      // A wipe is best-effort per key; one stubborn key must not abort the rest.
    }
  }
  try {
    await kv.removeItem(RECOVERY_MARKER_KEY);
  } catch {
    // Nothing more we can do; the next launch re-reads whatever is actually there.
  }
}

/**
 * Write the marker. Never throws — losing the marker must not break the load path —
 * and reports whether it landed, because the caller's next step depends on it.
 */
async function writeMarker(kv: KeyValueStore, marker: RecoveryMarker): Promise<boolean> {
  try {
    await kv.setItem(RECOVERY_MARKER_KEY, JSON.stringify(marker));
    return true;
  } catch {
    // Without the marker the next launch re-derives the state from what is on disk
    // (the live slot is left alone above), so this is survivable.
    return false;
  }
}
