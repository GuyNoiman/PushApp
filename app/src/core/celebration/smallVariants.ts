/**
 * Small-celebration variant descriptors (Completion Celebration, I1) — the config for the brief
 * per-Step "Done" celebration, as DATA (Engineering Bible §3, configuration-before-code; PRD §9
 * "versioned/config-driven small variants"). Pure TS — the presentational component consumes these
 * in a later slice; no rendering happens here.
 *
 * PRD §2.1: every variant is tuned to COMPARABLE duration/intensity so a random pick never implies
 * a different achievement value. Structural params only (piece count, shape, palette token keys,
 * spread) — the actual colours resolve from design tokens at render time.
 */

/**
 * The version of this variant set. Bump when the set changes so a persisted preference / analytics
 * signal can reason about which generation of variants was in play.
 */
export const SMALL_VARIANT_VERSION = 1;

/** The visual family a small celebration draws from. */
export type SmallCelebrationShape = 'confetti' | 'stars' | 'sparkles';

/** One small-celebration variant — structural parameters only (no copy, no colours). */
export interface SmallCelebrationVariant {
  /** Stable id (never reused) — selected at random for variety. */
  id: string;
  /** Which visual family this variant renders. */
  shape: SmallCelebrationShape;
  /** How many pieces the burst emits (kept comparable across variants — PRD §2.1). */
  pieceCount: number;
  /** Design-token keys for this variant's palette (resolved to colours at render time). */
  paletteTokens: string[];
  /** How wide the burst spreads, 0..1 (kept comparable across variants — PRD §2.1). */
  spread: number;
}

/**
 * The approved small-celebration variants, selected at random for variety. All tuned to comparable
 * duration/intensity (similar piece count + spread) so randomness never signals different value.
 */
export const SMALL_CELEBRATION_VARIANTS: SmallCelebrationVariant[] = [
  {
    id: 'confetti',
    shape: 'confetti',
    pieceCount: 24,
    paletteTokens: ['celebration.a', 'celebration.b', 'celebration.c'],
    spread: 0.7,
  },
  {
    id: 'stars',
    shape: 'stars',
    pieceCount: 22,
    paletteTokens: ['celebration.a', 'celebration.d'],
    spread: 0.65,
  },
  {
    id: 'sparkles',
    shape: 'sparkles',
    pieceCount: 26,
    paletteTokens: ['celebration.b', 'celebration.c', 'celebration.d'],
    spread: 0.72,
  },
];
