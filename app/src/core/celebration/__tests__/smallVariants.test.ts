/**
 * Small-celebration variant config tests (Completion Celebration, I1) — the set is versioned, holds
 * 2–3 variants, and every variant carries the required structural fields (PRD §2.1: comparable
 * intensity, structural params only).
 */
import { SMALL_CELEBRATION_VARIANTS, SMALL_VARIANT_VERSION } from '../smallVariants';

describe('smallVariants config', () => {
  it('exposes a positive integer version', () => {
    expect(Number.isInteger(SMALL_VARIANT_VERSION)).toBe(true);
    expect(SMALL_VARIANT_VERSION).toBeGreaterThan(0);
  });

  it('holds 2–3 variants with unique ids', () => {
    expect(SMALL_CELEBRATION_VARIANTS.length).toBeGreaterThanOrEqual(2);
    expect(SMALL_CELEBRATION_VARIANTS.length).toBeLessThanOrEqual(3);
    const ids = SMALL_CELEBRATION_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every variant the required structural fields', () => {
    for (const v of SMALL_CELEBRATION_VARIANTS) {
      expect(v.id).toBeTruthy();
      expect(['confetti', 'stars', 'sparkles']).toContain(v.shape);
      expect(v.pieceCount).toBeGreaterThan(0);
      expect(Array.isArray(v.paletteTokens)).toBe(true);
      expect(v.paletteTokens.length).toBeGreaterThan(0);
      expect(v.spread).toBeGreaterThan(0);
      expect(v.spread).toBeLessThanOrEqual(1);
    }
  });
});
