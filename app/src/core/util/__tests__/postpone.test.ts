/**
 * postpone helper tests (Step Postponement, D37). The pure resolver + warning helper are exercised
 * with an injected `now` — no clock, no gateways. Locks: the fixed 2h default, the day-crossing
 * SHORTEN rule (2h / shortened-to-end-of-day / blocked under the 30-min floor, §4/§11.6c), an
 * explicit past pick (§9), and the day/week/Journey-end crossing warnings (§4).
 */
import {
  DAY_END_BUFFER_MS,
  DEFAULT_POSTPONE_MS,
  MIN_POSTPONE_MS,
  isPostponeError,
  postponeWarnings,
  resolvePostponeUntil,
} from '../postpone';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('resolvePostponeUntil — default 2h path (day-crossing shorten rule)', () => {
  it('lands at now + 2h when at least 2h remain in the day', () => {
    // 2026-07-14 10:00 local — ~14h left in the day.
    const now = new Date(2026, 6, 14, 10, 0, 0).getTime();
    const r = resolvePostponeUntil(now);
    expect(r).toEqual({ at: now + DEFAULT_POSTPONE_MS });
  });

  it('SHORTENS to the last same-day slot (strictly BEFORE midnight) when 30min ≤ remaining < 2h', () => {
    // 22:45 local → ~1h14m left before the buffered day end (between the floor and the 2h default).
    const now = new Date(2026, 6, 14, 22, 45, 0).getTime();
    const lastSlotToday = new Date(2026, 6, 15, 0, 0, 0).getTime() - DAY_END_BUFFER_MS;
    const r = resolvePostponeUntil(now);
    expect(r).toEqual({ at: lastSlotToday });
    expect(isPostponeError(r)).toBe(false);
    if (!isPostponeError(r)) {
      // Still fires TODAY (before midnight) and is under the fixed 2h default.
      expect(r.at).toBeLessThan(new Date(2026, 6, 15, 0, 0, 0).getTime());
      expect(r.at - now).toBeLessThan(DEFAULT_POSTPONE_MS);
      // Critically: the shortened same-day target must NOT be flagged as crossing the day (#1).
      expect(postponeWarnings({ now, at: r.at })).toEqual([]);
    }
  });

  it('lands exactly at now + 30min when precisely the floor remains before the buffered day end', () => {
    // now chosen so lastSlotToday − now == 30min exactly: midnight − buffer − 30min.
    const now = new Date(2026, 6, 15, 0, 0, 0).getTime() - DAY_END_BUFFER_MS - MIN_POSTPONE_MS;
    const r = resolvePostponeUntil(now);
    expect(r).toEqual({ at: now + MIN_POSTPONE_MS });
  });

  it('BLOCKS with no_slot_today when less than 30min remains in the day', () => {
    // 23:45 local → only ~14 minutes left before the buffered day end, under the floor.
    const now = new Date(2026, 6, 14, 23, 45, 0).getTime();
    expect(resolvePostponeUntil(now)).toEqual({ error: 'no_slot_today' });
  });
});

describe('resolvePostponeUntil — explicit chosen time', () => {
  it('honours a future pick', () => {
    const now = new Date(2026, 6, 14, 10, 0, 0).getTime();
    const chosen = now + 5 * HOUR;
    expect(resolvePostponeUntil(now, chosen)).toEqual({ at: chosen });
  });

  it('rejects a time at or before now (covers a DST non-advancing instant)', () => {
    const now = new Date(2026, 6, 14, 10, 0, 0).getTime();
    expect(resolvePostponeUntil(now, now)).toEqual({ error: 'in_past' });
    expect(resolvePostponeUntil(now, now - HOUR)).toEqual({ error: 'in_past' });
  });

  it('a future pick may still cross the day — that is a warning, not an error', () => {
    const now = new Date(2026, 6, 14, 23, 0, 0).getTime();
    const chosen = now + 3 * HOUR; // next day, but explicitly chosen
    expect(resolvePostponeUntil(now, chosen)).toEqual({ at: chosen });
  });
});

describe('postponeWarnings', () => {
  const now = new Date(2026, 6, 14, 10, 0, 0).getTime(); // Tuesday

  it('is empty when the target stays on the same day', () => {
    expect(postponeWarnings({ now, at: now + 2 * HOUR })).toEqual([]);
  });

  it('warns crosses_day for a day-specific occurrence landing tomorrow', () => {
    expect(postponeWarnings({ now, at: now + DAY })).toEqual(['crosses_day']);
  });

  it('a flexible-weekly occurrence does NOT warn when moving within the open week', () => {
    // + 1 day is still the same week — allowed for flexible weekly.
    expect(postponeWarnings({ now, at: now + DAY, flexibleWeekly: true })).toEqual([]);
  });

  it('warns crosses_week for a flexible-weekly occurrence landing next week', () => {
    expect(postponeWarnings({ now, at: now + 8 * DAY, flexibleWeekly: true })).toEqual([
      'crosses_week',
    ]);
  });

  it('warns crosses_journey_end when the target is past the Journey end', () => {
    const journeyEndsAt = now + 3 * HOUR;
    expect(postponeWarnings({ now, at: now + 5 * HOUR, journeyEndsAt })).toContain(
      'crosses_journey_end',
    );
  });
});
