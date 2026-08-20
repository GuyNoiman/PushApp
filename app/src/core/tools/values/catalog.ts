/**
 * The value pool for Values Clarification — the second tool, and the first one that sorts rather
 * than scores.
 *
 * SIXTY-FIVE VALUES, in two pools. The DEEP pass uses all of them; the QUICK pass uses the fifteen
 * marked `quick`, which is a deliberately different set rather than the first fifteen — a five-minute
 * mapping needs values far enough apart that choosing between them means something, and the long
 * pool is full of near neighbours (`honesty` and `integrity`, `compassion` and `kindness`) that are
 * a real distinction after twenty minutes and a coin toss after two.
 *
 * WHAT IS DELIBERATELY NOT IN IT (founder, 2026-08-20). Money, success, status, comfort, a home, a
 * relationship. They are common answers and they are not values — they are OUTCOMES, or areas of
 * life. Somebody who says "money" means one of: security, independence, freedom, stability,
 * abundance, or the ability to give — and which one it is tells a coach what actually drives them,
 * while "money" tells it nothing. Every one of those six is in the pool by name.
 *
 * THE CATEGORIES ARE FOR US, NOT FOR THE USER. They exist so the pool can be maintained and checked
 * for balance. **The cards are always shuffled**, because presenting ten "independence" values in a
 * row makes the eleventh card feel like a change of subject rather than a choice.
 *
 * The names and the behavioural descriptions live in the `tools` i18n namespace under
 * `values.names.<key>` and `values.descriptions.<key>` — never here, so this file holds no
 * translatable string.
 *
 * Pure TypeScript — no React, no i18n, no clock reads.
 */

/** Content-management grouping. Never shown to the user; see the header. */
export type ValueCategory = 'self' | 'doing' | 'courage' | 'people' | 'care' | 'integrity';

export interface ValueCard {
  /** Stable id, and the i18n key. Never shown. */
  key: string;
  category: ValueCategory;
  /** In the fifteen-card quick pool as well as the full one. */
  quick?: true;
}

/**
 * The key a person's OWN value is stored under. It is not in the pool: it has no authored name or
 * description, because both are theirs.
 */
export const CUSTOM_VALUE_KEY = 'custom';

export const VALUE_POOL: readonly ValueCard[] = [
  { key: 'authenticity', category: 'self', quick: true },
  { key: 'independence', category: 'self' },
  { key: 'freedom', category: 'self', quick: true },
  { key: 'choice', category: 'self' },
  { key: 'creativity', category: 'self', quick: true },
  { key: 'curiosity', category: 'self' },
  { key: 'learning', category: 'self' },
  { key: 'growth', category: 'self', quick: true },
  { key: 'openness', category: 'self' },
  { key: 'adaptability', category: 'self' },
  { key: 'achievement', category: 'doing' },
  { key: 'excellence', category: 'doing' },
  { key: 'perseverance', category: 'doing' },
  { key: 'selfDiscipline', category: 'doing' },
  { key: 'ambition', category: 'doing' },
  { key: 'initiative', category: 'doing' },
  { key: 'responsibility', category: 'doing' },
  { key: 'professionalism', category: 'doing' },
  { key: 'efficiency', category: 'doing' },
  { key: 'impact', category: 'doing' },
  { key: 'fulfilment', category: 'doing', quick: true },
  { key: 'courage', category: 'courage', quick: true },
  { key: 'determination', category: 'courage' },
  { key: 'boldness', category: 'courage' },
  { key: 'resilience', category: 'courage' },
  { key: 'adjusting', category: 'courage' },
  { key: 'risk', category: 'courage' },
  { key: 'patience', category: 'courage' },
  { key: 'selfAcceptance', category: 'courage' },
  { key: 'selfCompassion', category: 'courage' },
  { key: 'hope', category: 'courage' },
  { key: 'stability', category: 'courage', quick: true },
  { key: 'health', category: 'courage', quick: true },
  { key: 'balance', category: 'courage', quick: true },
  { key: 'love', category: 'people', quick: true },
  { key: 'family', category: 'people', quick: true },
  { key: 'familyLife', category: 'people' },
  { key: 'friendship', category: 'people' },
  { key: 'intimacy', category: 'people' },
  { key: 'belonging', category: 'people', quick: true },
  { key: 'trust', category: 'people' },
  { key: 'loyalty', category: 'people' },
  { key: 'partnership', category: 'people' },
  { key: 'listening', category: 'people' },
  { key: 'respect', category: 'people' },
  { key: 'kindness', category: 'care' },
  { key: 'empathy', category: 'care' },
  { key: 'compassion', category: 'care' },
  { key: 'generosity', category: 'care' },
  { key: 'helping', category: 'care' },
  { key: 'contribution', category: 'care', quick: true },
  { key: 'community', category: 'care' },
  { key: 'equality', category: 'care' },
  { key: 'justice', category: 'care' },
  { key: 'environment', category: 'care' },
  { key: 'honesty', category: 'integrity' },
  { key: 'integrity', category: 'integrity', quick: true },
  { key: 'fairness', category: 'integrity' },
  { key: 'reliability', category: 'integrity' },
  { key: 'humility', category: 'integrity' },
  { key: 'meaning', category: 'integrity', quick: true },
  { key: 'purpose', category: 'integrity' },
  { key: 'spirituality', category: 'integrity' },
  { key: 'gratitude', category: 'integrity' },
  { key: 'presence', category: 'integrity' },
];

/** The fifteen-card pool for the quick mapping. */
export const QUICK_POOL: readonly ValueCard[] = VALUE_POOL.filter((v) => v.quick);

/** One value by key, or undefined — a stored key can outlive a pool. */
export function findValue(key: string): ValueCard | undefined {
  return VALUE_POOL.find((v) => v.key === key);
}

/**
 * The pool in a shuffled order, from a SEED rather than from `Math.random`.
 *
 * Seeded on purpose, twice over: a person who leaves halfway and comes back must not meet a
 * different deck, and a test that cannot fix the order cannot assert anything about the flow. The
 * caller owns the seed and stores it with the answers.
 */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  // Mulberry32 — small, fast, and deterministic for a given seed.
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
