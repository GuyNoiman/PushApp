/**
 * availability tests — the single Active-Hours resolver (D40). Cover: in/out of an
 * enabled window, cross-midnight windows, a disabled day (nothing allowed), all-day
 * (start === end), the legacy `window` fallback + single-source-of-truth precedence,
 * uniformity detection, the shared schedule clamp, and the UI materializer.
 */
import type { ActiveHours, AllowedWindow, SchedulingPrefs } from '../../types/domain';
import {
  activeHoursShape,
  allDayWindow,
  allowedWindowFor,
  clampScheduleMinute,
  dayAvailability,
  isAllowed,
  isDayUniform,
  resolveActiveHours,
} from '../availability';

const base = (over: Partial<SchedulingPrefs> = {}): SchedulingPrefs => ({
  dayPart: 'either',
  preferredDays: [],
  ...over,
});

const w = (sh: number, sm: number, eh: number, em: number): AllowedWindow => ({
  start: { hour: sh, minute: sm },
  end: { hour: eh, minute: em },
});

/** 7 days, all enabled with `window`. */
function sharedHours(window: AllowedWindow, mode: 'shared' | 'perDay' = 'shared'): ActiveHours {
  return { mode, days: Array.from({ length: 7 }, () => ({ enabled: true, window })) };
}

describe('dayAvailability + isAllowed — enabled window', () => {
  const prefs = base({ activeHours: sharedHours(w(9, 0, 17, 0)) });

  it('allows a minute inside the window', () => {
    expect(isAllowed(3, 10 * 60, prefs)).toBe(true); // Wed 10:00
  });

  it('rejects a minute before the window', () => {
    expect(isAllowed(3, 8 * 60, prefs)).toBe(false); // 08:00
  });

  it('rejects a minute at/after the window end (half-open)', () => {
    expect(isAllowed(3, 17 * 60, prefs)).toBe(false); // 17:00 excluded
  });

  it('exposes the window through allowedWindowFor', () => {
    expect(allowedWindowFor(3, prefs)).toEqual(w(9, 0, 17, 0));
  });
});

describe('cross-midnight window', () => {
  const prefs = base({ activeHours: sharedHours(w(22, 0, 6, 0)) });

  it('allows late-night and early-morning minutes', () => {
    expect(isAllowed(1, 23 * 60, prefs)).toBe(true);
    expect(isAllowed(1, 2 * 60, prefs)).toBe(true);
  });

  it('rejects a midday minute', () => {
    expect(isAllowed(1, 12 * 60, prefs)).toBe(false);
  });
});

describe('disabled day — nothing allowed', () => {
  const hours = sharedHours(w(9, 0, 17, 0), 'perDay');
  hours.days[2] = { enabled: false, window: w(9, 0, 17, 0) }; // Tuesday off
  const prefs = base({ activeHours: hours });

  it('rejects every minute of the disabled day', () => {
    expect(isAllowed(2, 10 * 60, prefs)).toBe(false);
    expect(isAllowed(2, 0, prefs)).toBe(false);
    expect(dayAvailability(2, prefs)).toEqual({ kind: 'none' });
  });

  it('allowedWindowFor is null for a disabled day', () => {
    expect(allowedWindowFor(2, prefs)).toBeNull();
  });

  it('still allows other days', () => {
    expect(isAllowed(3, 10 * 60, prefs)).toBe(true);
  });
});

describe('all-day (start === end) means no constraint', () => {
  const prefs = base({ activeHours: sharedHours(allDayWindow()) });

  it('allows any minute', () => {
    expect(isAllowed(0, 0, prefs)).toBe(true);
    expect(isAllowed(0, 23 * 60 + 59, prefs)).toBe(true);
    expect(dayAvailability(0, prefs)).toEqual({ kind: 'allDay' });
  });

  it('allowedWindowFor is null (nothing to clamp into)', () => {
    expect(allowedWindowFor(0, prefs)).toBeNull();
  });
});

describe('all-days-quiet — every day disabled', () => {
  const hours = sharedHours(w(9, 0, 17, 0), 'perDay');
  for (let d = 0; d < 7; d++) hours.days[d] = { enabled: false, window: w(9, 0, 17, 0) };
  const prefs = base({ activeHours: hours });

  it('allows nothing on any day', () => {
    for (let d = 0; d < 7; d++) expect(isAllowed(d, 10 * 60, prefs)).toBe(false);
  });

  it('is uniform (all days identically none)', () => {
    expect(isDayUniform(prefs)).toBe(true);
  });
});

describe('legacy window fallback + single source of truth', () => {
  it('applies the legacy window uniformly when activeHours is absent', () => {
    const prefs = base({ window: w(9, 0, 17, 0) });
    expect(isAllowed(3, 8 * 60, prefs)).toBe(false);
    expect(isAllowed(3, 10 * 60, prefs)).toBe(true);
    expect(allowedWindowFor(3, prefs)).toEqual(w(9, 0, 17, 0));
  });

  it('treats an undefined window as all-day', () => {
    const prefs = base();
    expect(isAllowed(3, 3 * 60, prefs)).toBe(true);
    expect(dayAvailability(3, prefs)).toEqual({ kind: 'allDay' });
  });

  it('activeHours WINS over a stale legacy window (never consulted together)', () => {
    const prefs = base({
      window: w(0, 0, 1, 0), // stale narrow legacy window …
      activeHours: sharedHours(allDayWindow()), // … but activeHours says all-day
    });
    expect(isAllowed(3, 12 * 60, prefs)).toBe(true);
  });
});

describe('isDayUniform', () => {
  it('is true with no activeHours (legacy window applies uniformly)', () => {
    expect(isDayUniform(base({ window: w(9, 0, 17, 0) }))).toBe(true);
    expect(isDayUniform(base())).toBe(true);
  });

  it('is true when every day shares an identical window', () => {
    expect(isDayUniform(base({ activeHours: sharedHours(w(8, 0, 20, 0)) }))).toBe(true);
  });

  it('is false when one day differs', () => {
    const hours = sharedHours(w(8, 0, 20, 0), 'perDay');
    hours.days[5] = { enabled: true, window: w(10, 0, 12, 0) };
    expect(isDayUniform(base({ activeHours: hours }))).toBe(false);
  });
});

describe('activeHoursShape (settings summary)', () => {
  it('is allDay for the default / unset preference', () => {
    expect(activeHoursShape(base())).toBe('allDay');
    expect(activeHoursShape(base({ activeHours: sharedHours(allDayWindow()) }))).toBe('allDay');
  });

  it('is sharedWindow when every day shares one real window', () => {
    expect(activeHoursShape(base({ activeHours: sharedHours(w(9, 0, 17, 0)) }))).toBe('sharedWindow');
  });

  it('is off when every day is disabled (all-quiet)', () => {
    const hours = sharedHours(w(9, 0, 17, 0), 'perDay');
    for (let d = 0; d < 7; d++) hours.days[d] = { enabled: false, window: w(9, 0, 17, 0) };
    expect(activeHoursShape(base({ activeHours: hours }))).toBe('off');
  });

  it('is perDay when days differ', () => {
    const hours = sharedHours(w(9, 0, 17, 0), 'perDay');
    hours.days[5] = { enabled: true, window: w(10, 0, 12, 0) };
    expect(activeHoursShape(base({ activeHours: hours }))).toBe('perDay');
  });
});

describe('resolveActiveHours (UI materializer)', () => {
  it('defaults an unset preference to shared all-day, all-days-enabled', () => {
    const ah = resolveActiveHours(base());
    expect(ah.mode).toBe('shared');
    expect(ah.days).toHaveLength(7);
    expect(ah.days.every((d) => d.enabled)).toBe(true);
    expect(ah.days[0].window).toEqual(allDayWindow());
  });

  it('seeds the all-day view from a legacy window', () => {
    const ah = resolveActiveHours(base({ window: w(9, 0, 17, 0) }));
    expect(ah.days[0].window).toEqual(w(9, 0, 17, 0));
  });

  it('heals a short days array to 7 entries', () => {
    const prefs = base({ activeHours: { mode: 'perDay', days: [{ enabled: true, window: w(9, 0, 17, 0) }] } });
    const ah = resolveActiveHours(prefs);
    expect(ah.days).toHaveLength(7);
    expect(ah.days[6].enabled).toBe(true);
  });
});

describe('clampScheduleMinute — the ONE definition of when a reminder may fire', () => {
  it('leaves an allowed time exactly where it is', () => {
    const prefs = base({ activeHours: sharedHours(w(9, 0, 17, 0)) });
    expect(clampScheduleMinute(10 * 60, 3, prefs)).toBe(10 * 60);
  });

  it('moves a time outside the window to the nearest allowed minute', () => {
    const prefs = base({ activeHours: sharedHours(w(9, 0, 17, 0)) });
    expect(clampScheduleMinute(8 * 60 + 45, 3, prefs)).toBe(9 * 60);
  });

  it('applies the day-part band before the window, so the window wins', () => {
    const prefs = base({ dayPart: 'morning', activeHours: sharedHours(w(13, 0, 17, 0)) });
    // 'morning' would pull 18:00 back to 11:59, then the window pushes it to 13:00.
    expect(clampScheduleMinute(18 * 60, 3, prefs)).toBe(13 * 60);
  });

  it('returns null for a day the user disabled — nothing is allowed at all', () => {
    const hours = sharedHours(w(9, 0, 17, 0), 'perDay');
    hours.days[2] = { enabled: false, window: w(9, 0, 17, 0) };
    expect(clampScheduleMinute(10 * 60, 2, base({ activeHours: hours }))).toBeNull();
  });

  it('leaves any minute untouched on an all-day, unconstrained account', () => {
    expect(clampScheduleMinute(23 * 60 + 59, 0, base())).toBe(23 * 60 + 59);
  });
});
