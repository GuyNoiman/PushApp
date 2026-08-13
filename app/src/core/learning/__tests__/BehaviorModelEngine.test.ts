/**
 * BehaviorModelEngine tests. A fixed clock + hand-built AppState fixtures, mirroring
 * CommunicationScheduler.test.ts. A real JourneyEngine drives the outcome events over the
 * same bus (exercising the S1.5 markPartial/rescheduleStep hooks too); the engine's own
 * `tick` drives slip detection. No OS, no async.
 */
import { JourneyEngine } from '../../engines/JourneyEngine';
import { EventBus } from '../../events/EventBus';
import type { EventOf } from '../../events/events';
import type { AppState, Journey, Step } from '../../types/domain';
import { BehaviorModelEngine, MAX_RECORDS_PER_STEP } from '../BehaviorModelEngine';

// A fixed clock so record timestamps + insight maths are deterministic.
const NOW = new Date(2026, 6, 14, 10, 0, 0).getTime();

function step(over: Partial<Step> = {}): Step {
  return {
    id: 'step_1',
    title: 'Do the thing',
    isStarterStep: false,
    cadence: 'once',
    done: false,
    ...over,
  };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [step()],
    createdAt: 1000,
    ...over,
  };
}

function stateWith(journeys: Journey[]): AppState {
  return {
    dreams: [],
    journeys,
    buddy: { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null },
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
  };
}

/** A bus + JourneyEngine + BehaviorModelEngine all sharing one mutable state. */
function harness(journeys: Journey[]) {
  const bus = new EventBus();
  const state = stateWith(journeys);
  const journeyEngine = new JourneyEngine(bus, () => state);
  const model = new BehaviorModelEngine(bus, () => state, () => NOW);
  return { bus, state, journeyEngine, model };
}

describe('BehaviorModelEngine — event → record mapping', () => {
  it('records a `done` on StepCheckedIn', () => {
    const { journeyEngine, model } = harness([journey({ steps: [step({ milestoneId: 'm1', plannedFor: NOW })] })]);
    journeyEngine.checkInStep('journey_1', 'step_1');
    const log = model.getRawLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ stepId: 'step_1', journeyId: 'journey_1', kind: 'done', milestoneId: 'm1', plannedFor: NOW, at: NOW });
  });

  it('records a `partial` on StepPartial (markPartial hook)', () => {
    const { journeyEngine, model } = harness([journey()]);
    journeyEngine.markPartial('journey_1', 'step_1');
    expect(model.getRawLog().map((r) => r.kind)).toEqual(['partial']);
  });

  it('records a `postponed` on StepPostponed', () => {
    const { journeyEngine, model } = harness([journey()]);
    journeyEngine.postponeStep('journey_1', 'step_1');
    expect(model.getRawLog().map((r) => r.kind)).toEqual(['postponed']);
  });

  it('records a `couldnt` on StepCancelled', () => {
    const { journeyEngine, model } = harness([journey()]);
    journeyEngine.cancelStep('journey_1', 'step_1', 'no_time');
    expect(model.getRawLog().map((r) => r.kind)).toEqual(['couldnt']);
  });

  it('emits InsightUpdated when a record lands', () => {
    const { bus, journeyEngine } = harness([journey()]);
    const fired = jest.fn();
    bus.on('InsightUpdated', fired);
    journeyEngine.markPartial('journey_1', 'step_1');
    expect(fired).toHaveBeenCalledTimes(1);
  });
});

describe('BehaviorModelEngine — per-Step cap (G5)', () => {
  it('keeps at most MAX_RECORDS_PER_STEP for a single Step', () => {
    const { journeyEngine, model } = harness([journey()]);
    for (let i = 0; i < MAX_RECORDS_PER_STEP + 10; i++) {
      journeyEngine.markPartial('journey_1', 'step_1'); // partial never marks the Step done
    }
    const log = model.getRawLog();
    expect(log).toHaveLength(MAX_RECORDS_PER_STEP);
    expect(log.every((r) => r.stepId === 'step_1')).toBe(true);
  });

  it('caps per Step independently (one Step overflowing does not evict another)', () => {
    const j = journey({ steps: [step({ id: 'step_1' }), step({ id: 'step_2' })] });
    const { journeyEngine, model } = harness([j]);
    for (let i = 0; i < MAX_RECORDS_PER_STEP + 5; i++) journeyEngine.markPartial('journey_1', 'step_1');
    journeyEngine.markPartial('journey_1', 'step_2');
    const log = model.getRawLog();
    expect(log.filter((r) => r.stepId === 'step_1')).toHaveLength(MAX_RECORDS_PER_STEP);
    expect(log.filter((r) => r.stepId === 'step_2')).toHaveLength(1);
  });
});

describe('BehaviorModelEngine — slip detector (tick)', () => {
  it('emits StepMissed + records a `slipped` for a Step whose plannedFor has passed', () => {
    const { bus, model } = harness([journey({ steps: [step({ plannedFor: NOW - 1000 })] })]);
    let missed: EventOf<'StepMissed'> | null = null;
    bus.on('StepMissed', (e) => (missed = e));

    model.tick(NOW);

    expect(missed).not.toBeNull();
    expect(missed!).toMatchObject({ journeyId: 'journey_1', stepId: 'step_1' });
    expect(model.getRawLog().map((r) => r.kind)).toEqual(['slipped']);
    expect(model.getRawLog()[0]).toMatchObject({ plannedFor: NOW - 1000, at: NOW });
  });

  it('does NOT flag a LOCKED Step whose plannedFor elapsed, but still flags a non-locked one', () => {
    // b depends on a; a is unreported → b is locked. Both have an elapsed plannedFor.
    const a = step({ id: 'a', milestoneId: 'm1', plannedFor: NOW - 1000 });
    const b = step({ id: 'b', milestoneId: 'm1', plannedFor: NOW - 1000, dependsOnStepId: 'a' });
    const { bus, model } = harness([journey({ steps: [a, b] })]);
    const missed: string[] = [];
    bus.on('StepMissed', (e) => missed.push(e.stepId));

    model.tick(NOW);

    // Only the non-locked predecessor slips; the locked dependent never emits StepMissed.
    expect(missed).toEqual(['a']);
    expect(model.getRawLog().filter((r) => r.kind === 'slipped').map((r) => r.stepId)).toEqual(['a']);
  });

  it('does not flag a future, an unplanned, a done, or a completed-Journey Step', () => {
    const j = journey({
      steps: [
        step({ id: 's_future', plannedFor: NOW + 1000 }),
        step({ id: 's_unplanned' }),
        step({ id: 's_done', plannedFor: NOW - 1000, done: true }),
      ],
    });
    const completed = journey({ id: 'j_done', completedAt: NOW, steps: [step({ id: 's_c', plannedFor: NOW - 1000 })] });
    const { bus, model } = harness([j, completed]);
    const fired = jest.fn();
    bus.on('StepMissed', fired);
    model.tick(NOW);
    expect(fired).not.toHaveBeenCalled();
    expect(model.getRawLog()).toHaveLength(0);
  });

  it('dedupes: re-ticking the same elapsed occurrence does not re-flag it', () => {
    const { bus, model } = harness([journey({ steps: [step({ plannedFor: NOW - 1000 })] })]);
    const fired = jest.fn();
    bus.on('StepMissed', fired);
    model.tick(NOW);
    model.tick(NOW + 5000);
    model.tick(NOW + 9000);
    expect(fired).toHaveBeenCalledTimes(1);
    expect(model.getRawLog().filter((r) => r.kind === 'slipped')).toHaveLength(1);
  });

  it('re-flags after the Step is re-planned to a new (still-past) occurrence', () => {
    const s = step({ plannedFor: NOW - 1000 });
    const { journeyEngine, model } = harness([journey({ steps: [s] })]);
    model.tick(NOW);
    // Reschedule to another already-elapsed occurrence (S1.5 rescheduleStep hook).
    journeyEngine.rescheduleStep('journey_1', 'step_1', NOW - 500);
    model.tick(NOW);
    expect(model.getRawLog().filter((r) => r.kind === 'slipped')).toHaveLength(2);
  });
});

describe('JourneyEngine.rescheduleStep — PlanAdapted (S1.5)', () => {
  it('updates plannedFor and emits PlanAdapted with the new scalar timestamp', () => {
    const { bus, state, journeyEngine } = harness([journey({ steps: [step()] })]);
    let adapted: EventOf<'PlanAdapted'> | null = null;
    bus.on('PlanAdapted', (e) => (adapted = e));
    journeyEngine.rescheduleStep('journey_1', 'step_1', NOW + 3600_000);
    expect(state.journeys[0].steps[0].plannedFor).toBe(NOW + 3600_000);
    expect(adapted!).toMatchObject({ journeyId: 'journey_1', stepId: 'step_1', plannedFor: NOW + 3600_000 });
  });
});

describe('BehaviorModelEngine — getInsights reflects the log', () => {
  it('derives slipRate from the recorded outcomes', () => {
    // 3 dones + 1 slip → slipRate 0.25 across 4 records.
    const steps = [
      step({ id: 's1' }),
      step({ id: 's2' }),
      step({ id: 's3' }),
      step({ id: 's4', plannedFor: NOW - 1000 }),
    ];
    const { journeyEngine, model } = harness([journey({ steps })]);
    journeyEngine.checkInStep('journey_1', 's1');
    journeyEngine.checkInStep('journey_1', 's2');
    journeyEngine.checkInStep('journey_1', 's3');
    model.tick(NOW);

    const insights = model.getInsights();
    expect(model.getRawLog()).toHaveLength(4);
    expect(insights.slipRate).toBeCloseTo(0.25);
    expect(insights.lastActivityAt).toBe(NOW);
  });

  it('is neutral and non-at-risk with an empty log', () => {
    const { model } = harness([journey()]);
    const insights = model.getInsights();
    expect(insights.slipRate).toBe(0);
    expect(insights.atRisk).toBe(false);
    expect(insights.lastActivityAt).toBeNull();
  });
});
