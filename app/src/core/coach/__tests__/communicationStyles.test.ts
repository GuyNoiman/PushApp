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

const STUB_IDS: CommunicationStyleId[] = ['direct', 'gentle', 'spark'];

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

  it('leaves the other three styles as empty stubs', () => {
    for (const id of STUB_IDS) {
      const style = COMMUNICATION_STYLES[id];
      expect(style.systemPromptFragment).toBeUndefined();
      expect(style.description).toBeUndefined();
    }
  });

  it('defaults to steady', () => {
    expect(DEFAULT_STYLE_ID).toBe('steady');
    expect(getStyle('steady')).toBe(COMMUNICATION_STYLES.steady);
  });

  it('falls back to steady for a not-yet-written stub', () => {
    for (const id of STUB_IDS) {
      expect(getStyle(id)).toBe(COMMUNICATION_STYLES.steady);
    }
  });

  it('falls back to steady for an unknown or undefined id', () => {
    expect(getStyle(undefined)).toBe(COMMUNICATION_STYLES.steady);
    expect(getStyle('nope' as CommunicationStyleId)).toBe(COMMUNICATION_STYLES.steady);
  });
});
