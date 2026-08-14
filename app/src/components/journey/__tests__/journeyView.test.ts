/**
 * journeyView — status resolution + tab bucketing. The `status` field is the source of truth for
 * which tab a Journey appears under (Active · Completed · Future) and for freeze/resume (J3). These
 * tests pin: an explicit status wins; a Journey persisted BEFORE the field existed (no `status`) is
 * derived from `completedAt`; `frozen` stays under Active; and a Journey saved for later (the stored
 * `future` status) reads Future. Plus the start anchoring: display + week math read the Journey's
 * REAL start (activation → planned start → creation), never `createdAt` alone — and, at the other
 * end, the History date + order: when a Journey ENDED (stopped or completed), what happens when that
 * stamp is missing or corrupt, and the one newest-first rule both History groups share.
 */
import {
  byMostRecentlyEnded,
  computeWeekLayout,
  resolveJourneyStatus,
  stepsByWeek,
  toJourneyView,
} from '../journeyView';
import type { Journey, ReasonEntry, Step } from '@/core/types/domain';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/** A minimal Journey; override any field per case. */
function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ id: 's1', title: 'Walk', isStarterStep: false, cadence: 'daily', done: false }],
    createdAt: 1_000,
    ...over,
  };
}

describe('resolveJourneyStatus', () => {
  it('trusts an explicit status', () => {
    expect(resolveJourneyStatus(journey({ status: 'frozen' }))).toBe('frozen');
    expect(resolveJourneyStatus(journey({ status: 'completed' }))).toBe('completed');
  });

  it('derives a legacy Journey (no status field) from completedAt', () => {
    // Persisted before `status` existed: completedAt present → completed, else active.
    expect(resolveJourneyStatus(journey({ completedAt: 2_000 }))).toBe('completed');
    expect(resolveJourneyStatus(journey())).toBe('active');
  });
});

describe('toJourneyView bucketing', () => {
  const now = 100_000;

  it('buckets completed / active by status', () => {
    expect(toJourneyView(journey({ status: 'completed' }), now).bucket).toBe('completed');
    expect(toJourneyView(journey({ status: 'active' }), now).bucket).toBe('active');
  });

  it('keeps a frozen Journey under the Active tab, marked by its status', () => {
    const view = toJourneyView(journey({ status: 'frozen' }), now);
    expect(view.bucket).toBe('active');
    expect(view.status).toBe('frozen');
  });

  it('reads a Journey saved for later (stored future status) as Future', () => {
    const view = toJourneyView(journey({ status: 'future', startsAt: now + 14 * DAY }), now);
    expect(view.bucket).toBe('future');
    expect(view.status).toBe('future');
  });

  it('does NOT infer Future from a createdAt in the future (the old hack is gone)', () => {
    // createdAt means CREATION only (Future Journey Management §3/§14.3) — an `active` Journey stays
    // under the Active tab whatever its creation timestamp says.
    const view = toJourneyView(journey({ status: 'active', createdAt: now + 14 * DAY }), now);
    expect(view.bucket).toBe('active');
  });

  it('still completes a legacy Journey with only completedAt', () => {
    expect(toJourneyView(journey({ completedAt: 50_000 }), now).bucket).toBe('completed');
  });

  it('lists an abandoned (canceled) Journey under history, still reporting the abandoned status', () => {
    // The Completed tab IS the history surface; a canceled Journey belongs there, never under
    // Current. The status stays `abandoned` so the row can render its own label — a canceled
    // Journey must never read as a success.
    const view = toJourneyView(journey({ status: 'abandoned' }), now);
    expect(view.bucket).toBe('completed');
    expect(view.status).toBe('abandoned');
    expect(view.status).not.toBe('completed');
  });

  it('measures a canceled Journey against the Steps it HAD, not the ones that survived', () => {
    // Abandoning splices the never-lived Steps away, so counting the live array would read "1 of 1"
    // — a full progress bar on a Journey the user gave up on (Friend Profile PRD §4.2).
    const view = toJourneyView(
      journey({
        status: 'abandoned',
        stepsAtAbandon: 12,
        steps: [{ id: 's1', title: 'Walk', isStarterStep: false, cadence: 'daily', done: true }],
      }),
      now,
    );
    expect(view.doneSteps).toBe(1);
    expect(view.totalSteps).toBe(12);
    expect(view.progress).toBeCloseTo(1 / 12);
  });
});

describe('toJourneyView — when a Journey ended (the History date + order)', () => {
  const now = 100_000;

  it('dates a canceled Journey by its stop, and a completed one by its completion', () => {
    expect(toJourneyView(journey({ status: 'abandoned', abandonedAt: 50_000 }), now).endedAt).toBe(
      50_000,
    );
    expect(toJourneyView(journey({ status: 'completed', completedAt: 60_000 }), now).endedAt).toBe(
      60_000,
    );
  });

  it('leaves a running Journey — and a legacy cancel with no stamp — with no end date at all', () => {
    expect(toJourneyView(journey({ status: 'active' }), now).endedAt).toBeUndefined();
    // Canceled before `abandonedAt` existed: no date is honest, an invented one is not.
    expect(
      toJourneyView(journey({ status: 'abandoned', stepsAtAbandon: 4 }), now).endedAt,
    ).toBeUndefined();
  });

  it('drops a corrupt (non-finite) stamp rather than handing the UI an "Invalid Date"', () => {
    expect(toJourneyView(journey({ status: 'abandoned', abandonedAt: NaN }), now).endedAt).toBeUndefined();
  });
});

describe('byMostRecentlyEnded — one order across the whole History surface', () => {
  const now = 100_000;
  const view = (over: Partial<Journey>) => toJourneyView(journey(over), now);

  it('sorts newest-first, mixing completed and canceled Journeys by the same rule', () => {
    const oldStop = view({ id: 'a', status: 'abandoned', abandonedAt: 10_000 });
    const newStop = view({ id: 'b', status: 'abandoned', abandonedAt: 40_000 });
    const done = view({ id: 'c', status: 'completed', completedAt: 30_000 });

    expect([oldStop, done, newStop].sort(byMostRecentlyEnded).map((v) => v.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('sorts an undated (legacy) Journey LAST, and keeps ties in snapshot order', () => {
    const undated = view({ id: 'legacy', status: 'abandoned' });
    const dated = view({ id: 'dated', status: 'abandoned', abandonedAt: 10_000 });
    const alsoUndated = view({ id: 'legacy2', status: 'completed' });

    expect([undated, dated, alsoUndated].sort(byMostRecentlyEnded).map((v) => v.id)).toEqual([
      'dated',
      'legacy',
      'legacy2',
    ]);
  });
});

describe('computeWeekLayout — Step Dependencies stacks (Slice 5)', () => {
  // A fixed noon anchor so week bucketing is deterministic: same-week Steps share `C`, next-week Steps
  // sit exactly one week (7 days, same weekday) later — a clean +1 bucket regardless of TZ/week-start.
  const C = new Date(2026, 0, 5, 12, 0, 0).getTime(); // a Monday noon

  function step(id: string, over: Partial<Step> = {}): Step {
    return {
      id,
      title: id,
      isStarterStep: false,
      cadence: 'daily',
      done: false,
      milestoneId: 'm1',
      plannedFor: C,
      ...over,
    };
  }

  function chained(steps: Step[]): Journey {
    return {
      id: 'j1',
      title: 'Chained',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [{ id: 'm1', title: 'M1', order: 0 }],
      steps,
      createdAt: C,
    };
  }

  function partialReason(stepId: string): ReasonEntry {
    return {
      id: `r_${stepId}`,
      stepId,
      journeyId: 'j1',
      reasonId: 'did_partially',
      leverIds: [],
      outcome: 'logged',
      at: C,
    };
  }

  it('stacks a same-week chain behind its actionable predecessor (depth = waiting count)', () => {
    const a = step('a');
    const b = step('b', { dependsOnStepId: 'a' });
    const c = step('c', { dependsOnStepId: 'b' });
    const units = computeWeekLayout(chained([a, b, c]), 0, C, []);

    expect(units).toEqual([{ kind: 'stack', top: a, hiddenChain: [b, c], depth: 2 }]);
  });

  it('promotes on unlock: a partial predecessor becomes normal, the next stacks behind the promoted', () => {
    const a = step('a');
    const b = step('b', { dependsOnStepId: 'a' });
    const c = step('c', { dependsOnStepId: 'b' });
    const units = computeWeekLayout(chained([a, b, c]), 0, C, [partialReason('a')]);

    expect(units).toEqual([
      { kind: 'step', step: a },
      { kind: 'stack', top: b, hiddenChain: [c], depth: 1 },
    ]);
  });

  it('cross-week UNDONE: pulls the predecessor into next week as the stack top (render-only)', () => {
    const a = step('a', { plannedFor: C }); // week 0
    const b = step('b', { dependsOnStepId: 'a', plannedFor: C + WEEK }); // week 1
    const j = chained([a, b]);

    // The current week does NOT stack across the boundary — only `a` shows.
    expect(computeWeekLayout(j, 0, C, [])).toEqual([{ kind: 'step', step: a }]);
    // Next week pulls the undone predecessor in as the top of the stack.
    expect(computeWeekLayout(j, 1, C, [])).toEqual([
      { kind: 'stack', top: a, hiddenChain: [b], depth: 1 },
    ]);
  });

  it('cross-week DONE: the dependent renders as a normal unit next week', () => {
    const a = step('a', { plannedFor: C, done: true }); // week 0, completed
    const b = step('b', { dependsOnStepId: 'a', plannedFor: C + WEEK }); // week 1, now unlocked
    const units = computeWeekLayout(chained([a, b]), 1, C, []);

    expect(units).toEqual([{ kind: 'step', step: b }]);
  });
});

describe('start anchoring — display + week math read the REAL start (Future Journey Management §5)', () => {
  // A fixed Monday-noon anchor so week bucketing is deterministic regardless of TZ/week-start.
  const CREATED = new Date(2026, 0, 5, 12, 0, 0).getTime();
  const STARTS_AT = CREATED + 4 * WEEK;

  /** A 28-day Journey with four dated Steps, one per week from `from`. */
  function fourWeekly(from: number, over: Partial<Journey> = {}): Journey {
    return {
      id: 'j1',
      title: 'Run 5km',
      why: [],
      durationDays: 28,
      rhythm: 'daily',
      createdAt: CREATED,
      steps: [0, 1, 2, 3].map((w) => ({
        id: `s${w}`,
        title: `s${w}`,
        isStarterStep: false,
        cadence: 'daily' as const,
        done: false,
        plannedFor: from + w * WEEK,
      })),
      ...over,
    };
  }

  it('anchors a Future Journey on its PLANNED start, not on creation day', () => {
    const j = fourWeekly(STARTS_AT, { status: 'future', startsAt: STARTS_AT });

    const view = toJourneyView(j, CREATED);
    expect(view.startedAt).toBe(STARTS_AT);
    expect(view.endsAt).toBe(STARTS_AT + 28 * DAY);

    // Its four Steps land one per week of the Journey's OWN span, not four weeks past the end.
    const { totalWeeks, weeks } = stepsByWeek(j, STARTS_AT);
    expect(totalWeeks).toBe(5); // a 28-day span starting mid-week touches 5 calendar weeks
    expect(weeks.slice(0, 4).map((w) => w.map((s) => s.id))).toEqual([['s0'], ['s1'], ['s2'], ['s3']]);
  });

  it('anchors on the ACTUAL activation once the Journey started early', () => {
    const activatedAt = CREATED + WEEK;
    const j = fourWeekly(activatedAt, { status: 'active', startsAt: STARTS_AT, activatedAt });

    const view = toJourneyView(j, activatedAt);
    expect(view.startedAt).toBe(activatedAt);
    expect(view.endsAt).toBe(activatedAt + 28 * DAY);
    expect(stepsByWeek(j, activatedAt).currentWeek).toBe(0);
  });

  it('falls back to createdAt for a legacy Journey carrying neither field', () => {
    const j = fourWeekly(CREATED);

    const view = toJourneyView(j, CREATED);
    expect(view.startedAt).toBe(CREATED);
    expect(view.endsAt).toBe(CREATED + 28 * DAY);
    expect(stepsByWeek(j, CREATED).currentWeek).toBe(0);
  });
});
