/**
 * date.ts window helper tests — the minute-of-day maths the CommunicationScheduler
 * relies on for quiet-hours / day-part clamping. Pure functions, so no mocks: just
 * assert the half-open `[start, end)` semantics, cross-midnight handling, and the
 * nearest-edge clamp.
 */
import {
  clampMinuteToWindow,
  dayPartBand,
  isMinuteInWindow,
  minuteOfDay,
} from '../date';

const w = (sh: number, sm: number, eh: number, em: number) => ({
  start: { hour: sh, minute: sm },
  end: { hour: eh, minute: em },
});

describe('minuteOfDay', () => {
  it('converts hour/minute to minutes since midnight', () => {
    expect(minuteOfDay({ hour: 0, minute: 0 })).toBe(0);
    expect(minuteOfDay({ hour: 8, minute: 30 })).toBe(510);
    expect(minuteOfDay({ hour: 23, minute: 59 })).toBe(1439);
  });
});

describe('isMinuteInWindow', () => {
  it('treats the window as half-open [start, end)', () => {
    const window = w(9, 0, 17, 0); // 540..1020
    expect(isMinuteInWindow(540, window)).toBe(true); // start is inclusive
    expect(isMinuteInWindow(1019, window)).toBe(true);
    expect(isMinuteInWindow(1020, window)).toBe(false); // end is exclusive
    expect(isMinuteInWindow(539, window)).toBe(false);
  });

  it('handles a window that crosses midnight', () => {
    const window = w(22, 0, 6, 0); // 1320..(next)360
    expect(isMinuteInWindow(1320, window)).toBe(true);
    expect(isMinuteInWindow(0, window)).toBe(true);
    expect(isMinuteInWindow(359, window)).toBe(true);
    expect(isMinuteInWindow(360, window)).toBe(false); // end exclusive
    expect(isMinuteInWindow(720, window)).toBe(false); // midday is outside
  });

  it('a zero-length window contains nothing', () => {
    expect(isMinuteInWindow(600, w(10, 0, 10, 0))).toBe(false);
  });
});

describe('clampMinuteToWindow', () => {
  it('leaves an in-window minute unchanged', () => {
    expect(clampMinuteToWindow(600, w(9, 0, 17, 0))).toBe(600);
  });

  it('clamps to the nearest edge for a simple window', () => {
    const window = w(9, 0, 17, 0); // 540..1020, last allowed = 1019
    expect(clampMinuteToWindow(300, window)).toBe(540); // before start → start
    expect(clampMinuteToWindow(1200, window)).toBe(1019); // after end → last allowed
  });

  it('clamps into a cross-midnight window by nearest edge', () => {
    const window = w(22, 0, 6, 0); // allowed 1320..1439, 0..359; forbidden 360..1319
    // 12:00 (720): closer to the last-allowed edge (359) than to start (1320).
    expect(clampMinuteToWindow(720, window)).toBe(359);
    // 20:00 (1200): closer to start (1320) than to last-allowed (359) → start.
    expect(clampMinuteToWindow(1200, window)).toBe(1320);
  });

  it('returns the value unchanged for a zero-length window', () => {
    expect(clampMinuteToWindow(600, w(10, 0, 10, 0))).toBe(600);
  });
});

describe('dayPartBand', () => {
  it('returns fixed morning/evening bands and null for either', () => {
    expect(dayPartBand('morning')).toEqual(w(6, 0, 12, 0));
    expect(dayPartBand('evening')).toEqual(w(17, 0, 22, 0));
    expect(dayPartBand('either')).toBeNull();
  });
});
