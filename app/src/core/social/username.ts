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
  if (norm.length < MIN_USERNAME_LENGTH) {
    return `Use at least ${MIN_USERNAME_LENGTH} letters or numbers`;
  }
  if (taken.has(norm)) return 'That username is taken, try another';
  return null;
}
