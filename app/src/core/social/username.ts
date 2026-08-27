/**
 * Username generation + validation for the Circle identity section (POC).
 *
 * The founder direction (2026-08-07): a new user should NOT have to invent a
 * username. We auto-generate a friendly, unique-looking one (`adjective-animal-####`,
 * e.g. `swift-otter-4821`) that the user can then edit. This module is pure,
 * framework-free logic (Engineering Bible §19) — the screen owns state + rendering.
 *
 * TODO(auth): real uniqueness can only be enforced by the backend registry once
 * auth lands. Until then `usernameError` validates against a LOCAL demo set (the
 * dev sample friends + a few reserved words) so the edit flow reads realistically.
 */

// Small, friendly word lists — kept short on purpose. Combined with a 4-digit
// suffix they give ~9M combinations, plenty to look unique in the POC demo.
const ADJECTIVES: readonly string[] = [
  'swift', 'brave', 'calm', 'bright', 'keen', 'bold', 'sunny', 'lucky',
  'quiet', 'nimble', 'gentle', 'steady', 'clever', 'happy', 'eager', 'kind',
];

const ANIMALS: readonly string[] = [
  'otter', 'fox', 'owl', 'lynx', 'wren', 'hare', 'seal', 'crane',
  'panda', 'koala', 'robin', 'heron', 'moth', 'finch', 'ibex', 'newt',
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Generate a friendly, unique-looking username, e.g. `swift-otter-4821`. */
export function generateUsername(): string {
  const suffix = 1000 + Math.floor(Math.random() * 9000); // 1000–9999
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${suffix}`;
}

/**
 * THE ONE FORM A HANDLE IS STORED AND SEARCHED IN.
 *
 * ── THE BUG THIS EXISTS TO CLOSE (device, 2026-08-27) ──────────────────────────────────────────
 *
 * A handle was saved exactly as typed and looked up with an exact, case-sensitive equality — so
 * `Liam` never found `liam`, a trailing space never found anything, and an `@` somebody typed out of
 * habit was stored as part of their name. Two people could not find each other and neither had any
 * way to see why.
 *
 * ── WHY IT KEEPS HYPHENS, WHEN {@link normalizeUsername} DOES NOT ──────────────────────────────
 *
 * The two answer different questions, and reading the wrong one is how this drifts again:
 *
 *  - **`canonicalHandle`** — *"what string do we store, and what string do we look up?"* It must stay
 *    readable, because it is shown to people and typed by people: `quiet-otter-9019` keeps its
 *    hyphens.
 *  - **`normalizeUsername`** — *"would these two count as the SAME name for a collision?"* It strips
 *    everything but letters and digits on purpose, so `Ronit Levi`, `ronit-levi` and `RonitLevi`
 *    collide the way a real registry would.
 *
 * The `@` is decoration the UI draws, never part of the name. It is stripped here so that typing it
 * cannot change who you are.
 */
export function canonicalHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Brand / role words nobody may claim (already normalized). */
export const RESERVED_WORDS: readonly string[] = ['guy', 'admin', 'steady', 'pushapp'];

/**
 * Lowercase + strip everything but a–z0–9 so "Ronit Levi", "ronit-levi" and
 * "RonitLevi" all collide the way a real registry would.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Minimum meaningful length after normalization. */
export const MIN_USERNAME_LENGTH = 3;

/**
 * Returns an error string when `raw` is empty/too-short or already taken, else
 * null. `taken` is a set of ALREADY-normalized usernames.
 *
 * TODO(auth): real uniqueness check needs the backend registry — this only
 * checks the local demo set passed in by the caller.
 */
export function usernameError(raw: string, taken: ReadonlySet<string>): string | null {
  const norm = normalizeUsername(raw);
  // Validate what will actually be STORED, not what was typed: somebody who types only "@" or "---"
  // has given us nothing, and the length check below would otherwise pass a name that canonicalises
  // to an empty string.
  if (canonicalHandle(raw).length < MIN_USERNAME_LENGTH) {
    return `Use at least ${MIN_USERNAME_LENGTH} letters or numbers`;
  }
  if (norm.length < MIN_USERNAME_LENGTH) {
    return `Use at least ${MIN_USERNAME_LENGTH} letters or numbers`;
  }
  if (taken.has(norm)) return 'That username is taken, try another';
  return null;
}
