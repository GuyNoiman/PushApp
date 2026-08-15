/**
 * proposal — PRD §5 of Smart Notification Timing, rule by rule and in the order they are allowed to
 * fire. These are the tests that protect the user from the app moving their reminder on a whim: the
 * sparse guard, the percentage rule, the 15-minute step, the alternating exploration, the
 * three-hour cap, and the boundary clamp that stops us proposing a time we cannot actually send at.
 *
 * Pure — `now` is injected everywhere, nothing reads the clock.
 */
import { computeTimingProposal, eligibleTrialsFor, type TimingProposalInput } from '../proposal';
import type {
  ActiveHours,
  SchedulingPrefs,
  TimingDayKey,
  TimingModel,
  TimingOutcome,
  TimingTrial,
} from '../../types/domain';
import { TIMING_MODEL_VERSION } from '../../config/timingPolicy';
import { modelKey } from '../timingModel';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 2, 10, 12, 0, 0, 0).getTime(); // Tuesday 10 March 2026, local noon

/** All-permissive prefs — the default account, where nothing constrains a candidate. */
function openPrefs(over: Partial<SchedulingPrefs> = {}): SchedulingPrefs {
  return { dayPart: 'either', preferredDays: [], ...over };
}

/** Active Hours where every day shares one window. */
function sharedHours(start: { hour: number; minute: number }, end: { hour: number; minute: number }): ActiveHours {
  return {
    mode: 'shared',
    days: Array.from({ length: 7 }, () => ({ enabled: true, window: { start, end } })),
  };
}

function model(over: Partial<TimingModel> = {}): TimingModel {
  return {
    journeyId: 'journey_1',
    dayKey: '*',
    anchor: { hour: 9, minute: 0 },
    currentCandidate: { hour: 9, minute: 0 },
    eligibleCount: 0,
    positive: 0,
    negative: 0,
    confidence: 0,
    exploreDirection: 'later',
    rejectedCandidates: [],
    lastUpdatedAt: NOW,
    modelVersion: TIMING_MODEL_VERSION,
    ...over,
  };
}

/** `n` trials for a model, one per day going back from yesterday, with the given outcomes. */
function trialsFor(m: TimingModel, outcomes: TimingOutcome[], daysBack = 1): TimingTrial[] {
  const key = modelKey(m.journeyId, m.dayKey);
  return outcomes.map((outcome, i) => ({
    modelKey: key,
    scheduledAt: NOW - (daysBack + i) * DAY,
    outcome,
    journeyIds: [m.journeyId],
  }));
}

function propose(m: TimingModel, outcomes: TimingOutcome[], prefs = openPrefs()) {
  const input: TimingProposalInput = { model: m, trials: trialsFor(m, outcomes), prefs, now: NOW };
  return computeTimingProposal(input);
}

describe('1. the eligible set', () => {
  it('counts only positive and negative trials', () => {
    const m = model();
    const eligible = eligibleTrialsFor(
      m,
      trialsFor(m, ['positive', 'neutral', 'contaminated', 'pending', 'negative']),
      NOW,
    );
    expect(eligible.map((t) => t.outcome).sort()).toEqual(['negative', 'positive']);
  });

  it('ignores trials belonging to another model', () => {
    const m = model();
    const foreign: TimingTrial = {
      modelKey: 'journey_2|*',
      scheduledAt: NOW - DAY,
      outcome: 'negative',
      journeyIds: ['journey_2'],
    };
    expect(eligibleTrialsFor(m, [...trialsFor(m, ['positive']), foreign], NOW)).toHaveLength(1);
  });

  it('ignores anything older than four weeks', () => {
    const m = model();
    const old = trialsFor(m, ['negative', 'negative'], 29);
    expect(eligibleTrialsFor(m, old, NOW)).toHaveLength(0);
  });

  it('uses at most the newest six, so ancient successes cannot dilute a bad run', () => {
    const m = model();
    const trials = [
      ...trialsFor(m, ['negative', 'negative', 'negative', 'negative', 'negative', 'negative'], 1),
      ...trialsFor(m, ['positive', 'positive'], 20),
    ];
    const eligible = eligibleTrialsFor(m, trials, NOW);
    expect(eligible).toHaveLength(6);
    expect(eligible.every((t) => t.outcome === 'negative')).toBe(true);
  });
});

describe('2. the sparse guard (AC3)', () => {
  it('never moves the time on no evidence at all', () => {
    expect(propose(model(), [])).toBeNull();
  });

  it('never moves the time after ONE sample, however bad it was', () => {
    expect(propose(model(), ['negative'])).toBeNull();
  });

  it('never counts non-evidence towards the two-sample minimum', () => {
    expect(propose(model(), ['negative', 'neutral', 'contaminated', 'pending'])).toBeNull();
  });

  it('proposes once there are two eligible samples and both are negative', () => {
    expect(propose(model(), ['negative', 'negative'])).not.toBeNull();
  });
});

describe('3. the percentage rule', () => {
  it('says nothing when exactly half are negative (§9, the 50/50 case)', () => {
    expect(propose(model(), ['negative', 'positive'])).toBeNull();
    expect(propose(model(), ['negative', 'negative', 'positive', 'positive'])).toBeNull();
  });

  it('says nothing when the time is mostly working', () => {
    expect(propose(model(), ['negative', 'positive', 'positive'])).toBeNull();
  });

  it('proposes as soon as MORE than half are negative', () => {
    const proposal = propose(model(), ['negative', 'negative', 'positive']);
    expect(proposal?.evidence).toEqual({ eligible: 3, positive: 1, negative: 2 });
  });
});

describe('4./5. exploration', () => {
  it('moves exactly 15 minutes, never more', () => {
    const proposal = propose(model(), ['negative', 'negative']);
    expect(proposal?.from).toEqual({ hour: 9, minute: 0 });
    expect(proposal?.to).toEqual({ hour: 9, minute: 15 });
    expect(proposal?.direction).toBe('later');
  });

  it('alternates: the next proposal goes the other way', () => {
    const first = propose(model(), ['negative', 'negative']);
    expect(first?.nextExploreDirection).toBe('earlier');

    // Apply it the way Weekly Review would, then ask again.
    const applied = model({
      currentCandidate: first!.to,
      exploreDirection: first!.nextExploreDirection,
    });
    const second = propose(applied, ['negative', 'negative']);
    expect(second?.from).toEqual({ hour: 9, minute: 15 });
    expect(second?.to).toEqual({ hour: 9, minute: 0 });
    expect(second?.direction).toBe('earlier');
    expect(second?.nextExploreDirection).toBe('later');
  });

  it('honours an earlier-first model', () => {
    const proposal = propose(model({ exploreDirection: 'earlier' }), ['negative', 'negative']);
    expect(proposal?.to).toEqual({ hour: 8, minute: 45 });
    expect(proposal?.direction).toBe('earlier');
  });

  it('prefers a previously BETTER time over exploring somewhere new', () => {
    const m = model({
      currentCandidate: { hour: 9, minute: 30 },
      previousCandidate: { hour: 9, minute: 0 },
      previousPositive: 4,
      previousNegative: 0,
    });
    const proposal = propose(m, ['negative', 'negative']);
    expect(proposal?.to).toEqual({ hour: 9, minute: 0 });
    expect(proposal?.direction).toBe('revert');
    // A return is not an exploration, so the alternation is left where it was.
    expect(proposal?.nextExploreDirection).toBe('later');
  });

  it('does NOT revert to a previous time that was no better', () => {
    const m = model({
      currentCandidate: { hour: 9, minute: 30 },
      previousCandidate: { hour: 9, minute: 0 },
      previousPositive: 0,
      previousNegative: 4,
    });
    expect(propose(m, ['negative', 'negative'])?.direction).toBe('later');
  });

  it('does NOT revert on history too thin to mean anything', () => {
    const m = model({
      currentCandidate: { hour: 9, minute: 30 },
      previousCandidate: { hour: 9, minute: 0 },
      previousPositive: 1,
      previousNegative: 0,
    });
    expect(propose(m, ['negative', 'negative'])?.direction).toBe('later');
  });
});

describe('6. the three-hour cap, measured from the user own anchor', () => {
  it('refuses to go further LATER and turns around instead', () => {
    const m = model({ currentCandidate: { hour: 12, minute: 0 }, exploreDirection: 'later' });
    const proposal = propose(m, ['negative', 'negative']);
    expect(proposal?.to).toEqual({ hour: 11, minute: 45 });
    expect(proposal?.direction).toBe('earlier');
  });

  it('refuses to go further EARLIER and turns around instead', () => {
    const m = model({ currentCandidate: { hour: 6, minute: 0 }, exploreDirection: 'earlier' });
    const proposal = propose(m, ['negative', 'negative']);
    expect(proposal?.to).toEqual({ hour: 6, minute: 15 });
    expect(proposal?.direction).toBe('later');
  });

  it('still allows the very last step up to the cap', () => {
    const m = model({ currentCandidate: { hour: 11, minute: 45 }, exploreDirection: 'later' });
    expect(propose(m, ['negative', 'negative'])?.to).toEqual({ hour: 12, minute: 0 });
  });

  it('proposes nothing at all when both directions are exhausted', () => {
    // Later is past the cap; earlier is outside the account window, so neither is offerable.
    const m = model({ currentCandidate: { hour: 12, minute: 0 }, exploreDirection: 'later' });
    const prefs = openPrefs({
      activeHours: sharedHours({ hour: 12, minute: 0 }, { hour: 13, minute: 0 }),
    });
    expect(propose(m, ['negative', 'negative'], prefs)).toBeNull();
  });
});

describe('7. the boundary clamp — we never propose a time we would not send', () => {
  it('refuses a candidate the clamp would move, and explores the other way', () => {
    // Active Hours open at 09:00, so 08:45 would be delivered at 09:00. Offering it would be a lie.
    const m = model({ exploreDirection: 'earlier' });
    const prefs = openPrefs({
      activeHours: sharedHours({ hour: 9, minute: 0 }, { hour: 17, minute: 0 }),
    });
    const proposal = propose(m, ['negative', 'negative'], prefs);
    expect(proposal?.to).toEqual({ hour: 9, minute: 15 });
    expect(proposal?.direction).toBe('later');
  });

  it('refuses a candidate the day-part band would move', () => {
    // 'morning' ends at 12:00, so 12:15 is not reachable — it turns around instead.
    const m = model({ currentCandidate: { hour: 11, minute: 45 }, exploreDirection: 'later' });
    const proposal = propose(m, ['negative', 'negative'], openPrefs({ dayPart: 'morning' }));
    expect(proposal?.to).toEqual({ hour: 11, minute: 30 });
  });

  it('yields NO candidate at all on a day the user disabled', () => {
    const disabledTuesday: ActiveHours = {
      mode: 'perDay',
      days: Array.from({ length: 7 }, (_, wd) => ({
        enabled: wd !== 2,
        window: { start: { hour: 0, minute: 0 }, end: { hour: 0, minute: 0 } },
      })),
    };
    const m = model({ dayKey: 2 as TimingDayKey });
    expect(
      propose(m, ['negative', 'negative'], openPrefs({ activeHours: disabledTuesday })),
    ).toBeNull();
  });

  it('lets a SHARED model keep learning even though one day is quiet', () => {
    const quietSunday: ActiveHours = {
      mode: 'perDay',
      days: Array.from({ length: 7 }, (_, wd) => ({
        enabled: wd !== 0,
        window: { start: { hour: 0, minute: 0 }, end: { hour: 0, minute: 0 } },
      })),
    };
    const proposal = propose(model(), ['negative', 'negative'], openPrefs({ activeHours: quietSunday }));
    expect(proposal?.to).toEqual({ hour: 9, minute: 15 });
  });

  it('proposes nothing when every day is quiet', () => {
    const allQuiet: ActiveHours = {
      mode: 'shared',
      days: Array.from({ length: 7 }, () => ({
        enabled: false,
        window: { start: { hour: 0, minute: 0 }, end: { hour: 0, minute: 0 } },
      })),
    };
    expect(propose(model(), ['negative', 'negative'], openPrefs({ activeHours: allQuiet }))).toBeNull();
  });
});

describe('8. a time the user already declined', () => {
  it('is not offered again while the evidence is unchanged — it explores the other way', () => {
    const m = model({
      rejectedCandidates: [{ hour: 9, minute: 15, atEligibleCount: 2 }],
    });
    const proposal = propose(m, ['negative', 'negative']);
    expect(proposal?.to).toEqual({ hour: 8, minute: 45 });
    expect(proposal?.direction).toBe('earlier');
  });

  it('may be offered again once the evidence set has changed', () => {
    const m = model({
      rejectedCandidates: [{ hour: 9, minute: 15, atEligibleCount: 2 }],
    });
    const proposal = propose(m, ['negative', 'negative', 'negative']);
    expect(proposal?.to).toEqual({ hour: 9, minute: 15 });
  });

  it('proposes nothing when both directions have been declined', () => {
    const m = model({
      rejectedCandidates: [
        { hour: 9, minute: 15, atEligibleCount: 2 },
        { hour: 8, minute: 45, atEligibleCount: 2 },
      ],
    });
    expect(propose(m, ['negative', 'negative'])).toBeNull();
  });
});

describe('the engine itself', () => {
  it('never mutates the model it reasons about', () => {
    const m = model();
    const snapshot = JSON.parse(JSON.stringify(m));
    const proposal = propose(m, ['negative', 'negative']);
    expect(m).toEqual(snapshot);
    // …and the returned `from` is a copy, not the model's own object.
    expect(proposal?.from).not.toBe(m.currentCandidate);
  });

  it('reports which Journey and window it is about', () => {
    const proposal = propose(model({ dayKey: 3 }), ['negative', 'negative']);
    expect(proposal?.journeyId).toBe('journey_1');
    expect(proposal?.dayKey).toBe(3);
  });
});
