/**
 * deriveConstraints tests. The pure Journey + SchedulingPrefs → PlanConstraints bridge is
 * exercised directly with hand-built fixtures — no OS, no async, no clock. Fixed inputs →
 * deterministic output. Covers the habit/finite rule, the day-part/preferred-days pass-through,
 * and the weeklyAvailabilityMinutes approximation (including the dropped/done exclusion).
 */
import type { Journey, SchedulingPrefs, Step } from '../../types/domain';
import { deriveConstraints } from '../deriveConstraints';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CREATED_AT = new Date(2026, 6, 14, 9, 0, 0).getTime();

let stepSeq = 0;
function step(over: Partial<Step> = {}): Step {
  return {
    id: `step_${stepSeq++}`,
    title: 'Practice',
    isStarterStep: false,
    cadence: 'weekly',
    done: false,
    ...over,
  };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 28,
    rhythm: 'few-times-week',
    steps: [step({ estimatedDuration: 30 }), step({ estimatedDuration: 40 })],
    createdAt: CREATED_AT,
    ...over,
  };
}

const prefs: SchedulingPrefs = { window: undefined, dayPart: 'evening', preferredDays: [1, 3, 5] };

describe('deriveConstraints', () => {
  it('passes preferred days and maps dayPart → daypart', () => {
    const c = deriveConstraints(journey(), prefs);
    expect(c.preferredDays).toEqual([1, 3, 5]);
    expect(c.daypart).toBe('evening');
  });

  it('a finite (non-daily) Journey back-solves a targetDate from createdAt + durationDays', () => {
    const c = deriveConstraints(journey({ durationDays: 28 }), prefs);
    expect(c.targetDate).toBe(CREATED_AT + 28 * MS_PER_DAY);
  });

  it('a daily-rhythm Journey is an open-ended habit — no targetDate', () => {
    const c = deriveConstraints(journey({ rhythm: 'daily' }), prefs);
    expect(c.targetDate).toBeUndefined();
  });

  it('estimates weeklyAvailabilityMinutes from the remaining Steps over the week span', () => {
    // 70 remaining minutes over a 28-day (=4-week) span → round(70/4) = 18, floored to 20.
    const c = deriveConstraints(journey({ durationDays: 28 }), prefs);
    expect(c.weeklyAvailabilityMinutes).toBe(20);
  });

  it('excludes done and dropped Steps from the availability estimate', () => {
    const j = journey({
      rhythm: 'daily', // habit → weeks = 1, so weekly === remaining minutes
      steps: [
        step({ estimatedDuration: 30, done: true }),
        step({ estimatedDuration: 40, dropped: true }),
        step({ estimatedDuration: 25 }),
      ],
    });
    const c = deriveConstraints(j, prefs);
    // Only the single remaining 25-minute Step counts.
    expect(c.weeklyAvailabilityMinutes).toBe(25);
  });
});
