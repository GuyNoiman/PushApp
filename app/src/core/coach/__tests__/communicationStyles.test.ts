/**
 * communicationStyles tests — assert the meta-agent's tone registry is WELL-FORMED: all four named
 * styles exist with display names, only `steady` carries content (the other three are stubs), and
 * getStyle always resolves to a usable voice (falling back to steady for a stub, an unknown id, or
 * undefined).
 */
import {
  COMMUNICATION_STYLES,
  DEFAULT_STYLE_ID,
  STYLE_IDS,
  getStyle,
  type CommunicationStyleId,
} from '../communicationStyles';

/** The three that WERE stubs until 2026-08-24, and now carry real tone content. */
const ONCE_STUBBED: CommunicationStyleId[] = ['direct', 'gentle', 'spark'];

describe('communicationStyles', () => {
  it('registers exactly the four named styles', () => {
    expect(STYLE_IDS).toEqual(['steady', 'direct', 'gentle', 'spark']);
    expect(Object.keys(COMMUNICATION_STYLES).sort()).toEqual(
      ['direct', 'gentle', 'spark', 'steady'].sort(),
    );
  });

  it('gives every style an id and a display name', () => {
    const expectedNames: Record<CommunicationStyleId, string> = {
      steady: 'Steady',
      direct: 'Direct',
      gentle: 'Gentle',
      spark: 'Spark',
    };
    for (const id of STYLE_IDS) {
      const style = COMMUNICATION_STYLES[id];
      expect(style.id).toBe(id);
      expect(style.displayName).toBe(expectedNames[id]);
      expect(style.displayName.length).toBeGreaterThan(0);
    }
  });

  it('populates only the steady style with content', () => {
    const steady = COMMUNICATION_STYLES.steady;
    expect(steady.systemPromptFragment && steady.systemPromptFragment.length).toBeGreaterThan(0);
    expect(steady.description && steady.description.length).toBeGreaterThan(0);
  });

  it('gives all four styles real tone content', () => {
    // They were named stubs, which meant every style resolved back to steady and the whole
    // Communication Style feature changed nothing anybody could hear (PRD AC#4).
    for (const id of ONCE_STUBBED) {
      const style = COMMUNICATION_STYLES[id];
      expect(style.systemPromptFragment?.length ?? 0).toBeGreaterThan(0);
      expect(style.description?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('says what each voice must NEVER do, not only what it should sound like', () => {
    // The limit is the half that keeps a tone from becoming a caricature — PRD §4 states one for
    // every style, and a fragment without it is an instruction to overdo the voice.
    for (const id of STYLE_IDS) {
      expect(COMMUNICATION_STYLES[id].systemPromptFragment).toMatch(/NEVER|never/);
    }
  });

  it('gives the four styles four DIFFERENT fragments', () => {
    const fragments = new Set(STYLE_IDS.map((id) => COMMUNICATION_STYLES[id].systemPromptFragment));
    expect(fragments.size).toBe(STYLE_IDS.length);
  });

  it('defaults to steady', () => {
    expect(DEFAULT_STYLE_ID).toBe('steady');
    expect(getStyle('steady')).toBe(COMMUNICATION_STYLES.steady);
  });

  it('returns each written style now that all four carry content', () => {
    for (const id of ONCE_STUBBED) {
      expect(getStyle(id)).toBe(COMMUNICATION_STYLES[id]);
    }
  });

  it('still falls back to steady for an unknown or contentless style', () => {
    // The fallback is the safety net for a style added later and left empty, and for a stored id
    // from a build that knew a style this one does not.
    expect(getStyle(undefined)).toBe(COMMUNICATION_STYLES.steady);
    expect(getStyle('a-style-from-another-build' as CommunicationStyleId)).toBe(
      COMMUNICATION_STYLES.steady,
    );
  });

  it('falls back to steady for an unknown or undefined id', () => {
    expect(getStyle(undefined)).toBe(COMMUNICATION_STYLES.steady);
    expect(getStyle('nope' as CommunicationStyleId)).toBe(COMMUNICATION_STYLES.steady);
  });
});
