/**
 * JourneyEngine.abandonJourney tests — the ABANDON (user-facing "canceled") path, the first writer of
 * the `abandoned` status. Pins: the refusals (completed — completion is FINAL, D41 — and already
 * abandoned); that it works from active / frozen / future; the drop-vs-splice rule (a Step with NO
 * history is spliced, every other Step is kept with its record and shed from scope); the honest
 * `stepsAtAbandon` denominator, so a cancel can never render as 100%; that no Step is left waiting or
 * pointing at a removed predecessor (Step Dependencies); and that abandon is NOT delete — the Journey
 * stays in state, and the hard delete still hard-removes. Pure TS.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
import { isStepLocked } from '../../status/stepDependencies';
import type { AppState, Buddy, ReasonEntry } from '../../types/domain';
import { JourneyEngine, type NewStepInput } from '../JourneyEngine';

function initialBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null };
}

function emptyState(): AppState {
  return {
    dreams: [],
    journeys: [],
    buddy: initialBuddy(),
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: {
      remindersEnabled: true,
      socialCheerEnabled: true,
      socialNudgeEnabled: true,
      locationOptIn: false,
      calendarOptIn: false,
    },
    schedulingPrefs: { window: undefined, dayPart: 'either', preferredDays: [] },
    reasonLog: [],
  };
}

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const engine = new JourneyEngine(bus, () => state);
  const events: DomainEvent[] = [];
  bus.on('JourneyAbandoned', (event: DomainEvent) => events.push(event));
  return { bus, state, engine, events };
}

function seedJourney(engine: JourneyEngine, steps?: NewStepInput[], title = 'Run 5km') {
  return engine.createJourney({
    title,
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: steps ?? [
      { title: 'Lace up and walk', isStarterStep: true, cadence: 'once' },
      { title: 'Jog 15 minutes', cadence: 'weekly' },
      { title: 'Run 5km', cadence: 'weekly' },
    ],
  });
}

/** A let-go ("couldn't") report row for a Step — the reasonLog shape deriveStepStatus reads. */
function letGo(journeyId: string, stepId: string, at = 5_000): ReasonEntry {
  return {
    id: `reason_${stepId}`,
    stepId,
    journeyId,
    reasonId: 'couldnt',
    leverIds: [],
    outcome: 'logged',
    at,
    action: 'cancel',
  };
}

describe('JourneyEngine.abandonJourney — refusals', () => {
  it('REFUSES a completed Journey (completion is FINAL — D41): null, no event, status untouched', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);
    journey.status = 'completed';
    journey.completedAt = 9_000;

    expect(engine.abandonJourney(journey.id)).toBeNull();
    expect(state.journeys[0].status).toBe('completed');
    expect(state.journeys[0].steps).toHaveLength(3);
    expect(events).toHaveLength(0);
  });

  it('REFUSES a legacy completed Journey carrying only completedAt', () => {
    const { engine, events } = setup();
    const journey = seedJourney(engine);
    journey.status = undefined;
    journey.completedAt = 9_000;

    expect(engine.abandonJourney(journey.id)).toBeNull();
    expect(events).toHaveLength(0);
  });

  it('REFUSES an already-abandoned Journey (terminal, idempotent): null, no second event', () => {
    const { engine, events } = setup();
    const journey = seedJourney(engine);

    expect(engine.abandonJourney(journey.id)).not.toBeNull();
    expect(engine.abandonJourney(journey.id)).toBeNull();
    expect(events).toHaveLength(1);
  });

  it('returns null and emits nothing for an unknown id', () => {
    const { engine, events } = setup();
    seedJourney(engine);

    expect(engine.abandonJourney('journey_does_not_exist')).toBeNull();
    expect(events).toHaveLength(0);
  });
});

describe('JourneyEngine.abandonJourney — allowed lifecycle states', () => {
  it('abandons an ACTIVE Journey and emits exactly one JourneyAbandoned', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);

    const abandoned = engine.abandonJourney(journey.id);

    expect(abandoned?.status).toBe('abandoned');
    expect(state.journeys[0].status).toBe('abandoned');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'JourneyAbandoned', journey: state.journeys[0] });
  });

  it('abandons a FROZEN Journey and clears the freeze provenance', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);
    engine.freezeJourney(journey.id);
    expect(journey.freezeReason).toBe('manual');

    expect(engine.abandonJourney(journey.id)?.status).toBe('abandoned');
    expect(state.journeys[0].freezeReason).toBeUndefined();
    expect(events).toHaveLength(1);
  });

  it('abandons a FUTURE Journey (a plan saved for later the user gives up on)', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);
    journey.status = 'future';
    journey.startsAt = 50_000;

    expect(engine.abandonJourney(journey.id)?.status).toBe('abandoned');
    expect(state.journeys[0].status).toBe('abandoned');
    expect(events).toHaveLength(1);
  });

  it('never stamps completedAt — a canceled Journey must not read as a success', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);

    engine.abandonJourney(journey.id);

    expect(state.journeys[0].completedAt).toBeUndefined();
    expect(state.journeys[0].completionCard).toBeUndefined();
  });
});

describe('JourneyEngine.abandonJourney — Steps: no history goes, history stays', () => {
  it('removes the never-reported Steps and keeps a checked-in Step with its history intact', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const [done, , untouched] = journey.steps;
    engine.checkInStep(journey.id, done.id);
    const checkedInAt = done.lastCheckInAt;

    engine.abandonJourney(journey.id);

    const steps = state.journeys[0].steps;
    expect(steps.map((s) => s.id)).toEqual([done.id]);
    expect(steps[0].done).toBe(true);
    expect(steps[0].lastCheckInAt).toBe(checkedInAt);
    expect(steps[0].dropped).toBeFalsy(); // a completed Step keeps reading as completed
    expect(state.checkIns).toHaveLength(1); // the CheckIn record survives untouched
    expect(steps.some((s) => s.id === untouched.id)).toBe(false);
  });

  it('keeps a Step reported "couldn\'t" (a reasonLog row is history), shed from scope', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const letGoStep = journey.steps[1];
    state.reasonLog = [letGo(journey.id, letGoStep.id)];

    engine.abandonJourney(journey.id);

    const steps = state.journeys[0].steps;
    expect(steps.map((s) => s.id)).toEqual([letGoStep.id]);
    expect(steps[0].dropped).toBe(true); // kept, but nothing stays actionable after a cancel
    expect(state.reasonLog).toHaveLength(1); // the report itself is untouched
  });

  it('keeps a REVERSED report — it derives as `unreported` but really happened (D36)', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine, [{ title: 'reversed' }, { title: 'pristine' }]);
    const [reversed, pristine] = journey.steps;
    engine.checkInStep(journey.id, reversed.id);
    engine.reverseReport(journey.id, reversed.id);

    engine.abandonJourney(journey.id);

    const steps = state.journeys[0].steps;
    expect(steps.map((s) => s.id)).toEqual([reversed.id]);
    expect(steps[0].lastReportClearedAt).toBeDefined();
    expect(steps.some((s) => s.id === pristine.id)).toBe(false);
  });

  it('removes an UNREPORTED Step whatever week it sits in and however it was handled', () => {
    // No history = no record to keep: a past-week Step, a future-week Step, a merely postponed
    // occurrence (a postpone is an action, not a report — D37) and a planner-shed Step all go.
    const { engine, state } = setup();
    const journey = seedJourney(engine, [
      { title: 'past', plannedFor: 1_000 },
      { title: 'future', plannedFor: 9_000_000_000 },
      { title: 'postponed' },
      { title: 'shed' },
    ]);
    engine.postponeStep(journey.id, journey.steps[2].id, { postponedUntil: 60_000 });
    engine.dropStep(journey.id, journey.steps[3].id);

    engine.abandonJourney(journey.id);

    expect(state.journeys[0].steps).toEqual([]);
    expect(state.journeys[0].status).toBe('abandoned');
  });
});

describe('JourneyEngine.abandonJourney — honest progress (a cancel is never a success)', () => {
  it('snapshots the pre-splice Step count so progress stays "1 of 3", not "1 of 1"', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine); // 3 Steps
    engine.checkInStep(journey.id, journey.steps[0].id);

    engine.abandonJourney(journey.id);

    expect(state.journeys[0].stepsAtAbandon).toBe(3);
    expect(state.journeys[0].steps).toHaveLength(1); // the other two never happened
    expect(engine.journeyProgress(journey.id)).toBeCloseTo(1 / 3);
  });

  it('never reports 100% for a canceled Journey whose surviving Steps are all done/shed', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    state.reasonLog = [letGo(journey.id, journey.steps[1].id)]; // one let-go, nothing done

    engine.abandonJourney(journey.id);

    expect(engine.journeyProgress(journey.id)).toBe(0);
    expect(state.journeys[0].stepsAtAbandon).toBe(3);
  });
});

describe('JourneyEngine.abandonJourney — when it was stopped', () => {
  it('stamps abandonedAt at the moment of the cancel, and never a completedAt', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);

    const before = Date.now();
    engine.abandonJourney(journey.id);
    const after = Date.now();

    const stopped = state.journeys[0].abandonedAt;
    expect(stopped).toBeGreaterThanOrEqual(before);
    expect(stopped).toBeLessThanOrEqual(after);
    // A cancel is not a completion: history must never be able to read it as one.
    expect(state.journeys[0].completedAt).toBeUndefined();
  });

  it('stamps it ONCE — a second cancel is refused and never rewrites the date', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);

    engine.abandonJourney(journey.id);
    const stopped = state.journeys[0].abandonedAt;

    const clock = jest.spyOn(Date, 'now').mockReturnValue((stopped ?? 0) + 60_000);
    try {
      expect(engine.abandonJourney(journey.id)).toBeNull();
    } finally {
      clock.mockRestore();
    }
    expect(state.journeys[0].abandonedAt).toBe(stopped);
  });
});

describe('JourneyEngine.abandonJourney — Step Dependencies', () => {
  it('never leaves a surviving dependent pointing at a removed predecessor', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine, [
      { title: 'a' },
      { title: 'b', dependsOnStepIndex: 0 },
      { title: 'c', dependsOnStepIndex: 1 },
    ]);
    const [a, b, c] = journey.steps;
    expect(b.dependsOnStepId).toBe(a.id);
    // `b` carries a report, `a` and `c` do not → `a` is removed under `b`'s feet.
    state.reasonLog = [letGo(journey.id, b.id)];

    engine.abandonJourney(journey.id);

    const steps = state.journeys[0].steps;
    expect(steps.map((s) => s.id)).toEqual([b.id]);
    expect(steps[0].dependsOnStepId).toBeUndefined();
    // Belt-and-braces: no surviving Step references an id that is gone.
    const ids = new Set(steps.map((s) => s.id));
    expect(steps.every((s) => !s.dependsOnStepId || ids.has(s.dependsOnStepId))).toBe(true);
    expect(steps.some((s) => s.id === c.id)).toBe(false);
  });

  it('leaves NO Step waiting: a kept predecessor is shed, so its dependent is unlocked', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine, [
      { title: 'a' },
      { title: 'b', dependsOnStepIndex: 0 },
    ]);
    const [a, b] = journey.steps;
    state.reasonLog = [letGo(journey.id, a.id, 4_000), letGo(journey.id, b.id, 5_000)];

    engine.abandonJourney(journey.id);

    const kept = state.journeys[0].steps;
    expect(kept.map((s) => s.id)).toEqual([a.id, b.id]);
    // The predecessor survives (it has a report) but is `dropped`, which isStepLocked reads as met.
    expect(kept[0].dropped).toBe(true);
    expect(isStepLocked(kept[1], state.journeys[0], state.reasonLog)).toBe(false);
  });

  it('keeps a still-valid dependency when both Steps survive', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine, [
      { title: 'a' },
      { title: 'b', dependsOnStepIndex: 0 },
    ]);
    const [a, b] = journey.steps;
    state.reasonLog = [letGo(journey.id, a.id, 4_000), letGo(journey.id, b.id, 5_000)];

    engine.abandonJourney(journey.id);

    const steps = state.journeys[0].steps;
    expect(steps.map((s) => s.id)).toEqual([a.id, b.id]);
    expect(steps[1].dependsOnStepId).toBe(a.id);
  });
});

describe('abandonJourney vs deleteJourney — two distinct paths', () => {
  it('abandon KEEPS the Journey in state; delete HARD-REMOVES it', () => {
    const { engine, state } = setup();
    const abandonMe = seedJourney(engine, undefined, 'Abandon me');
    const deleteMe = seedJourney(engine, undefined, 'Delete me');

    engine.abandonJourney(abandonMe.id);
    engine.deleteJourney(deleteMe.id);

    expect(state.journeys.map((j) => j.id)).toEqual([abandonMe.id]);
    expect(state.journeys[0].status).toBe('abandoned');
  });

  it('abandon emits JourneyAbandoned only — never JourneyDeleted', () => {
    const { bus, engine, events } = setup();
    const deleted: DomainEvent[] = [];
    bus.on('JourneyDeleted', (event: DomainEvent) => deleted.push(event));
    const journey = seedJourney(engine);

    engine.abandonJourney(journey.id);

    expect(events).toHaveLength(1);
    expect(deleted).toHaveLength(0);
  });

  it('deleteJourney still hard-removes an ALREADY-abandoned Journey (delete is unchanged)', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    engine.abandonJourney(journey.id);

    expect(engine.deleteJourney(journey.id)).toBe(true);
    expect(state.journeys).toHaveLength(0);
  });
});
