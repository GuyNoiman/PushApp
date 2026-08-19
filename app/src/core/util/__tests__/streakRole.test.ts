/**
 * streakRole tests — pins the SHOWN label to the SAME predicate the streak rule resets on
 * (D26.4, surfaced per Open Work 1.1). The whole point of the badge is that it cannot disagree
 * with the rule, so every case here asserts `streakRole` and `isUrgentMiss` in lockstep.
 *
 * Pure TS with an injected clock, mirroring StreakEngine.test.ts's fixture style. Dates are anchored
 * inside a known week so "days left" is a fact of the fixture, not of the day the suite runs.
 */
import { STREAK_CONFIG } from '../../config/streak';
import type { Journey, Step } from '../../types/domain';
import { isUrgentMiss, streakRole } from '../urgency';
import { remainingDaysInWeek } from '../week';

const DAY = 24 * 60 * 60 * 1000;
// Wednesday 2026-07-15, mid-week: a few-times-week Journey still has slack here, a daily one does not.
const WED = new Date(2026, 6, 15, 10, 0, 0).getTime();

function step(over: Partial<Step> = {}): Step {
  return { id: 'step_1', title: 'Do the thing', isStarterStep: false, cadence: 'once', done: false, ...over };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [step()],
    createdAt: 1000,
    ...over,
  };
}

describe('streakRole', () => {
  it('is `recommended` while the week still has slack — a miss then costs the streak nothing', () => {
    const j = journey({ rhythm: 'few-times-week' });
    // Mid-week there are more days left than the 3 sessions the rhythm still needs.
    expect(remainingDaysInWeek(WED)).toBeGreaterThan(3);
    expect(streakRole(j, WED, STREAK_CONFIG)).toBe('recommended');
    expect(isUrgentMiss(j, WED, STREAK_CONFIG)).toBe(false);
  });

  it('is `binding` once every remaining day must carry a session', () => {
    // A daily Journey needs 7 sessions a week, so it is binding from the week's first day on.
    const j = journey({ rhythm: 'daily' });
    expect(streakRole(j, WED, STREAK_CONFIG)).toBe('binding');
    expect(isUrgentMiss(j, WED, STREAK_CONFIG)).toBe(true);
  });

  it('falls back to `recommended` once the week\'s target is already met — nothing is at stake', () => {
    // One session done this week satisfies a `weekly` rhythm, so no remaining day binds.
    const j = journey({
      rhythm: 'weekly',
      steps: [step({ done: true, lastCheckInAt: WED - DAY })],
    });
    expect(streakRole(j, WED, STREAK_CONFIG)).toBe('recommended');
    expect(isUrgentMiss(j, WED, STREAK_CONFIG)).toBe(false);
  });

  it('never disagrees with the rule the StreakEngine applies, on any rhythm or day of the week', () => {
    for (const rhythm of ['daily', 'few-times-week', 'weekly'] as const) {
      for (let offset = 0; offset < 7; offset += 1) {
        const at = WED + offset * DAY;
        const j = journey({ rhythm });
        const expected = isUrgentMiss(j, at, STREAK_CONFIG) ? 'binding' : 'recommended';
        expect(streakRole(j, at, STREAK_CONFIG)).toBe(expected);
      }
    }
  });
});
