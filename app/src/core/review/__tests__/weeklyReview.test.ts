/**
 * weeklyReview — the pure Weekly Review analysis engine (Weekly_Review_PRD, D40/D41). Covers the
 * three product rules: the past-week SUMMARY (frozen never counted, only named — §7), the NEVER-
 * empty next-week fallback chain (§8), and the OPTIONAL forward-only PROPOSAL that excludes frozen /
 * completed Journeys (§7). Deterministic — `now`, the id, and the window are all injected.
 */
import {
  buildWeeklyReview,
  computeJourneyProposals,
  planNextWeek,
  summarizeWeek,
} from '../weeklyReview';
import type {
  Dream,
  InsightModel,
  Journey,
  ReasonEntry,
  Step,
} from '../../types/domain';
import type { PlanConstraints } from '../../learning/types';

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_START = Date.UTC(2026, 7, 3, 0, 0, 0); // Mon
const WINDOW_END = WINDOW_START + 7 * DAY;
const IN_WINDOW = WINDOW_START + 2 * DAY;

function step(overrides: Partial<Step> = {}): Step {
  return {
    id: overrides.id ?? `step_${Math.random().toString(36).slice(2)}`,
    title: overrides.title ?? 'A Step',
    isStarterStep: false,
    cadence: 'weekly',
    done: false,
    ...overrides,
  };
}

function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    id: overrides.id ?? `j_${Math.random().toString(36).slice(2)}`,
    title: overrides.title ?? 'A Journey',
    why: [],
    durationDays: 30,
    rhythm: 'weekly',
    steps: overrides.steps ?? [],
    createdAt: WINDOW_START,
    status: 'active',
    ...overrides,
  };
}

const INSIGHT: InsightModel = {
  reliabilityByMilestone: {},
  slipRate: 0,
  preferredDaypart: 'morning',
  typicalSessionMinutes: 0,
  paceRatio: 1,
  atRisk: false,
  lastActivityAt: null,
  daysSinceLastActivity: 0,
};

/** A deadline constraint so an unscheduled remaining Step gets PLACED (a rescheduled change). */
const constraintsFor = (): PlanConstraints => ({
  weeklyAvailabilityMinutes: 600,
  preferredDays: [1, 3, 5],
  daypart: 'morning',
  targetDate: WINDOW_END + 14 * DAY,
});

describe('summarizeWeek', () => {
  it('counts each derived status for Steps planned in the reviewed week', () => {
    const done = step({ id: 's_done', done: true, plannedFor: IN_WINDOW });
    const partial = step({ id: 's_partial', plannedFor: IN_WINDOW });
    const letGo = step({ id: 's_letgo', plannedFor: IN_WINDOW });
    const unreported = step({ id: 's_unrep', plannedFor: IN_WINDOW });
    const outOfWindow = step({ id: 's_out', done: true, plannedFor: WINDOW_END + DAY });

    const reasonLog: ReasonEntry[] = [
      { id: 'r1', stepId: 's_partial', journeyId: 'j', reasonId: 'did_partially', leverIds: [], outcome: 'partial', at: IN_WINDOW },
      { id: 'r2', stepId: 's_letgo', journeyId: 'j', reasonId: 'couldnt', leverIds: [], outcome: 'accepted', at: IN_WINDOW, action: 'cancel' },
    ];

    const summary = summarizeWeek(
      [journey({ steps: [done, partial, letGo, unreported, outOfWindow] })],
      reasonLog,
      WINDOW_START,
      WINDOW_END,
    );

    expect(summary.completed).toBe(1); // the out-of-window done Step is excluded
    expect(summary.partial).toBe(1);
    expect(summary.notCompleted).toBe(1);
    expect(summary.unreported).toBe(1);
  });

  it('never counts a frozen Journey as non-completion — only names it (§7)', () => {
    const frozen = journey({
      title: 'Paused thing',
      status: 'frozen',
      steps: [step({ plannedFor: IN_WINDOW })], // would be "unreported" if counted
    });
    const summary = summarizeWeek([frozen], [], WINDOW_START, WINDOW_END);

    expect(summary.unreported).toBe(0);
    expect(summary.frozenJourneyTitles).toEqual(['Paused thing']);
  });

  it('mentions a Journey that completed during the reviewed week', () => {
    const completed = journey({
      title: 'Finished thing',
      status: 'completed',
      completedAt: IN_WINDOW,
      steps: [step({ done: true, plannedFor: IN_WINDOW })],
    });
    const summary = summarizeWeek([completed], [], WINDOW_START, WINDOW_END);
    expect(summary.completedJourneyTitles).toEqual(['Finished thing']);
    expect(summary.completed).toBe(1);
  });
});

describe('planNextWeek (never empty — §8)', () => {
  it('1. surfaces remaining Steps across active Journeys', () => {
    const next = planNextWeek(
      [journey({ steps: [step(), step({ done: true }), step({ dropped: true })] })],
      [],
    );
    expect(next).toEqual({ kind: 'steps', stepCount: 1 });
  });

  it('2. falls back to a coach CTA when active Journeys have no remaining Steps', () => {
    const next = planNextWeek([journey({ steps: [step({ done: true })] })], []);
    expect(next.kind).toBe('coachCta');
  });

  it('3. offers a Dream-based suggestion when there are no active Journeys at all', () => {
    const dream: Dream = { id: 'd1', title: 'Run a marathon', journeyIds: [] };
    const next = planNextWeek(
      [journey({ status: 'completed', completedAt: IN_WINDOW, steps: [step({ done: true })] })],
      [dream],
    );
    expect(next.kind).toBe('dreamSuggestion');
    expect(next.dreamTitle).toBe('Run a marathon');
    expect(next.dreamAddressed).toBe(false);
  });

  it('3b. still never empty — a coach CTA when there are neither active Journeys nor Dreams', () => {
    const next = planNextWeek([journey({ status: 'abandoned', steps: [] })], []);
    expect(next.kind).toBe('coachCta');
  });

  it('3c. marks a Dream addressed when only a finished/paused Journey links it', () => {
    const dream: Dream = { id: 'd1', title: 'Run a marathon', journeyIds: ['j1'] };
    const finished = journey({
      id: 'j1',
      dreamId: 'd1',
      status: 'completed',
      completedAt: IN_WINDOW,
      steps: [step({ done: true })],
    });
    const next = planNextWeek([finished], [dream]);
    expect(next.kind).toBe('dreamSuggestion');
    expect(next.dreamTitle).toBe('Run a marathon');
    // Addressed by a non-active Journey → honestly reads as addressed (not dead-always-false).
    expect(next.dreamAddressed).toBe(true);
  });

  it('3d. prefers a NOT-yet-addressed Dream over an addressed one', () => {
    const addressed: Dream = { id: 'd1', title: 'Addressed', journeyIds: ['j1'] };
    const fresh: Dream = { id: 'd2', title: 'Fresh', journeyIds: [] };
    const finished = journey({
      id: 'j1',
      dreamId: 'd1',
      status: 'completed',
      completedAt: IN_WINDOW,
      steps: [step({ done: true })],
    });
    const next = planNextWeek([finished], [addressed, fresh]);
    expect(next.dreamTitle).toBe('Fresh');
    expect(next.dreamAddressed).toBe(false);
  });
});

describe('computeJourneyProposals (§7 — frozen/completed excluded)', () => {
  it('proposes a forward-only change for an active Journey and excludes frozen/completed ones', () => {
    const active = journey({
      id: 'j_active',
      steps: [step({ id: 's1' })], // unscheduled → replan places it (a rescheduled change)
    });
    const frozen = journey({ id: 'j_frozen', status: 'frozen', steps: [step()] });
    const completed = journey({
      id: 'j_done',
      status: 'completed',
      completedAt: IN_WINDOW,
      steps: [step({ done: true })],
    });

    const proposals = computeJourneyProposals(
      [active, frozen, completed],
      INSIGHT,
      constraintsFor,
      WINDOW_END,
    );

    expect(proposals.map((p) => p.journeyId)).toEqual(['j_active']);
    expect(proposals[0].stepAdjustments.length).toBeGreaterThan(0);
    expect(proposals[0].adjustments).toContain('rescheduled');
  });
});

describe('buildWeeklyReview', () => {
  it('composes the summary, next-week plan, and proposals into one pending review', () => {
    const j = journey({ id: 'j1', steps: [step({ id: 's1' })] });
    const review = buildWeeklyReview(
      {
        journeys: [j],
        dreams: [],
        reasonLog: [],
        insight: INSIGHT,
        constraintsFor,
        id: 'review_1',
        windowStart: WINDOW_START,
        windowEnd: WINDOW_END,
      },
      WINDOW_END,
    );

    expect(review.id).toBe('review_1');
    expect(review.status).toBe('pending');
    expect(review.generatedAt).toBe(WINDOW_END);
    expect(review.nextWeek.kind).toBe('steps');
    expect(review.proposals).toHaveLength(1);
  });
});
