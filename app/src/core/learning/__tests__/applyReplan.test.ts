/**
 * applyReplan tests — the impure apply step (S1.11). It enacts a hand-built
 * {@link ReplanResult} on a fixture Journey through a real {@link JourneyEngine} + bus, then
 * asserts the Steps end up rescheduled / resized / difficulty-adjusted / dropped as specified,
 * and that the right events fired. No planner is invoked here — replan's own maths is covered by
 * AdaptivePlanner.test.ts; this isolates the bridge from ReplanResult → engine mutators.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
import { JourneyEngine } from '../../engines/JourneyEngine';
import type { AppState, Buddy, Journey, Step } from '../../types/domain';
import { applyReplan } from '../applyReplan';
import type { NudgeHint, ReplanResult, StepAdjustment } from '../types';

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
  };
}

let seq = 0;
function step(over: Partial<Step> = {}): Step {
  return {
    id: `step_${seq++}`,
    title: 'Practice',
    isStarterStep: false,
    cadence: 'daily',
    done: false,
    milestoneId: 'm1',
    estimatedDuration: 30,
    difficulty: 3,
    plannedFor: 1000,
    ...over,
  };
}

const NUDGE: NudgeHint = { daypart: 'morning', days: [2], leadMinutes: 30, extra: false };

function setup(steps: Step[]) {
  const bus = new EventBus();
  const state = emptyState();
  const journey: Journey = {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 60,
    rhythm: 'daily',
    steps,
    createdAt: 1000,
  };
  state.journeys.push(journey);
  const engine = new JourneyEngine(bus, () => state);
  const events: DomainEvent[] = [];
  bus.on('PlanAdapted', (e) => events.push(e));
  bus.on('StepDropped', (e) => events.push(e));
  return { engine, journey, events };
}

function result(stepAdjustments: StepAdjustment[], over: Partial<ReplanResult> = {}): ReplanResult {
  return {
    changed: stepAdjustments.length > 0,
    adjustments: stepAdjustments.length > 0 ? ['rescheduled'] : ['none'],
    stepAdjustments,
    atRisk: false,
    nudge: NUDGE,
    ...over,
  };
}

beforeEach(() => {
  seq = 0;
});

describe('applyReplan', () => {
  it('reschedules a Step and emits PlanAdapted', () => {
    const s = step();
    const { engine, journey, events } = setup([s]);

    applyReplan(engine, journey, result([{ stepId: s.id, kind: 'rescheduled', plannedFor: 5000 }]));

    expect(journey.steps[0].plannedFor).toBe(5000);
    expect(events).toEqual([
      { type: 'PlanAdapted', journeyId: 'journey_1', stepId: s.id, plannedFor: 5000 },
    ]);
  });

  it('resizes a Step (duration + difficulty) via resizeStep', () => {
    const s = step({ estimatedDuration: 30, difficulty: 4 });
    const { engine, journey } = setup([s]);

    applyReplan(
      engine,
      journey,
      result([{ stepId: s.id, kind: 'resized', estimatedDuration: 20, difficulty: 2 }]),
    );

    expect(journey.steps[0].estimatedDuration).toBe(20);
    expect(journey.steps[0].difficulty).toBe(2);
  });

  it('drops a Step, marks it dropped, and emits StepDropped', () => {
    const s = step();
    const { engine, journey, events } = setup([s]);

    applyReplan(engine, journey, result([{ stepId: s.id, kind: 'removed' }]));

    expect(journey.steps[0].dropped).toBe(true);
    expect(events).toEqual([{ type: 'StepDropped', journeyId: 'journey_1', stepId: s.id }]);
  });

  it('enacts a mixed result: reschedule + resize + drop across Steps', () => {
    const a = step({ estimatedDuration: 40, difficulty: 5 });
    const b = step();
    const c = step();
    const { engine, journey, events } = setup([a, b, c]);

    applyReplan(
      engine,
      journey,
      result([
        { stepId: a.id, kind: 'rescheduled', plannedFor: 7000 },
        { stepId: a.id, kind: 'resized', estimatedDuration: 25, difficulty: 3 },
        { stepId: c.id, kind: 'removed' },
      ]),
    );

    expect(journey.steps[0].plannedFor).toBe(7000);
    expect(journey.steps[0].estimatedDuration).toBe(25);
    expect(journey.steps[0].difficulty).toBe(3);
    expect(journey.steps[1].plannedFor).toBe(1000); // untouched
    expect(journey.steps[2].dropped).toBe(true);

    expect(events.map((e) => e.type)).toEqual(['PlanAdapted', 'StepDropped']);
  });

  it('is a safe no-op when the result made no change', () => {
    const s = step();
    const { engine, journey, events } = setup([s]);

    applyReplan(engine, journey, result([]));

    expect(journey.steps[0].plannedFor).toBe(1000);
    expect(journey.steps[0].dropped).toBeUndefined();
    expect(events).toEqual([]);
  });

  it('is harmless to re-apply the same result (dropStep re-drops nothing)', () => {
    const s = step();
    const { engine, journey, events } = setup([s]);
    const r = result([{ stepId: s.id, kind: 'removed' }]);

    applyReplan(engine, journey, r);
    applyReplan(engine, journey, r);

    expect(journey.steps[0].dropped).toBe(true);
    expect(events).toHaveLength(1); // second apply emits nothing — already dropped.
  });
});
