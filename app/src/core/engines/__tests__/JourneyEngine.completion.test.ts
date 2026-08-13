/**
 * JourneyEngine completion tests (Completion Celebration, I1) — the pure willCompleteJourney
 * selector's truth table, and the durable completion card that is minted EXACTLY ONCE on first
 * completion (idempotent, latched — no duplicate/throw on a rapid second check-in), with dropped
 * Steps not blocking completion.
 */
import { EventBus } from '../../events/EventBus';
import type { AppState, Buddy } from '../../types/domain';
import { JourneyEngine } from '../JourneyEngine';

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

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const engine = new JourneyEngine(bus, () => state);
  return { bus, state, engine };
}

/** Create a two-Step Journey and return its ids. */
function twoStepJourney(engine: JourneyEngine) {
  const journey = engine.createJourney({
    title: 'Run 5km',
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [
      { title: 'Lace up', isStarterStep: true, cadence: 'once' },
      { title: 'Jog', isStarterStep: false, cadence: 'once' },
    ],
  });
  return { journeyId: journey.id, first: journey.steps[0].id, second: journey.steps[1].id };
}

describe('JourneyEngine.willCompleteJourney', () => {
  it('is true for the LAST required Step and false for a non-last Step', () => {
    const { engine } = setup();
    const { journeyId, first, second } = twoStepJourney(engine);

    // Neither Step done yet → checking either in is not the last.
    expect(engine.willCompleteJourney(journeyId, first)).toBe(false);
    expect(engine.willCompleteJourney(journeyId, second)).toBe(false);

    engine.checkInStep(journeyId, first);
    // Now the second Step is the last required one.
    expect(engine.willCompleteJourney(journeyId, second)).toBe(true);
  });

  it('is false for an already-done Step', () => {
    const { engine } = setup();
    const { journeyId, first } = twoStepJourney(engine);
    engine.checkInStep(journeyId, first);
    expect(engine.willCompleteJourney(journeyId, first)).toBe(false);
  });

  it('is false for an already-completed Journey', () => {
    const { engine } = setup();
    const { journeyId, first, second } = twoStepJourney(engine);
    engine.checkInStep(journeyId, first);
    engine.checkInStep(journeyId, second); // Journey now completed
    expect(engine.willCompleteJourney(journeyId, first)).toBe(false);
    expect(engine.willCompleteJourney(journeyId, second)).toBe(false);
  });

  it('is false for unknown journey or step ids', () => {
    const { engine } = setup();
    const { journeyId, first } = twoStepJourney(engine);
    expect(engine.willCompleteJourney('nope', first)).toBe(false);
    expect(engine.willCompleteJourney(journeyId, 'nope')).toBe(false);
    expect(engine.willCompleteJourney('nope', 'nope')).toBe(false);
  });

  it('treats a dropped Step as out of scope so it does not block completion', () => {
    const { engine, state } = setup();
    const { journeyId, first, second } = twoStepJourney(engine);
    // Drop the second Step: the first is now the last required Step.
    const journey = state.journeys.find((j) => j.id === journeyId)!;
    journey.steps[1].dropped = true;
    expect(engine.willCompleteJourney(journeyId, first)).toBe(true);
    // A dropped Step itself never "completes" the Journey.
    expect(engine.willCompleteJourney(journeyId, second)).toBe(false);
  });
});

describe('JourneyEngine completion card', () => {
  it('attaches a completion card exactly once on first completion', () => {
    const { engine, state } = setup();
    const { journeyId, first, second } = twoStepJourney(engine);

    engine.checkInStep(journeyId, first);
    const midway = state.journeys.find((j) => j.id === journeyId)!;
    expect(midway.completionCard).toBeUndefined(); // not completed yet

    engine.checkInStep(journeyId, second);
    const done = state.journeys.find((j) => j.id === journeyId)!;
    expect(done.completionCard).toBeDefined();
    expect(done.completionCard!.journeyTitleSnapshot).toBe('Run 5km');
    expect(done.completionCard!.completedAt).toBe(done.completedAt);
    expect(done.completionCard!.ceremonyShownAt).toBeUndefined(); // pending
  });

  it('does not rebuild or overwrite the card on a rapid duplicate check-in (idempotent, no throw)', () => {
    const { engine, state } = setup();
    const { journeyId, first, second } = twoStepJourney(engine);
    engine.checkInStep(journeyId, first);
    engine.checkInStep(journeyId, second);
    const card = state.journeys.find((j) => j.id === journeyId)!.completionCard;

    // A second check-in of the same (already-done) Step is a no-op — same card object, no throw.
    expect(() => engine.checkInStep(journeyId, second)).not.toThrow();
    expect(state.journeys.find((j) => j.id === journeyId)!.completionCard).toBe(card);
  });

  it('completes (and cards) a Journey even when a Step is dropped', () => {
    const { engine, state } = setup();
    const { journeyId, first, second } = twoStepJourney(engine);
    state.journeys.find((j) => j.id === journeyId)!.steps[1].dropped = true;

    engine.checkInStep(journeyId, first); // last required Step
    const done = state.journeys.find((j) => j.id === journeyId)!;
    expect(done.status).toBe('completed');
    expect(done.completionCard).toBeDefined();
    // The dropped Step is out of scope, so the card counts one in-scope Step.
    expect(done.completionCard!.totalSteps).toBe(1);
    expect(engine.willCompleteJourney(journeyId, second)).toBe(false);
  });
});
