/**
 * JourneyEngine Dreams tests (Dream Management, D40) — the coach-owned Dream layer. Covers
 * createDream (validation + normalization), createOrReuseDream (no duplicates), and the
 * Journey-side link model: link primary (demoting any current primary to a secondary), link
 * secondary (no dup, no primary/secondary overlap), unlink (promoting a secondary, never deleting
 * the Journey), and the id/boolean-only events. There is NO user-approval gate.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
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
  const events: DomainEvent[] = [];
  bus.on('DreamCreated', (e: DomainEvent) => events.push(e));
  bus.on('JourneyDreamLinked', (e: DomainEvent) => events.push(e));
  bus.on('JourneyDreamUnlinked', (e: DomainEvent) => events.push(e));
  return { bus, state, engine, events };
}

function seedJourney(engine: JourneyEngine, title = 'Run 5km') {
  return engine.createJourney({
    title,
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [{ title: 'Lace up and walk', isStarterStep: true, cadence: 'once' }],
  });
}

describe('JourneyEngine.createDream', () => {
  it('creates a normalized Dream (title + optional why) and emits DreamCreated (id only)', () => {
    const { engine, state, events } = setup();
    const dream = engine.createDream({ title: '  Become  a runner ', why: '  It clears my head ' });

    expect(dream).not.toBeNull();
    expect(dream!.title).toBe('Become a runner');
    expect(dream!.description).toBe('It clears my head');
    expect(state.dreams).toHaveLength(1);
    expect(events).toEqual([{ type: 'DreamCreated', dreamId: dream!.id }]);
  });

  it('rejects an empty/whitespace title (returns null, no Dream, no event)', () => {
    const { engine, state, events } = setup();
    expect(engine.createDream({ title: '   ' })).toBeNull();
    expect(state.dreams).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('caps an oversized title/why to a safe length', () => {
    const { engine } = setup();
    const dream = engine.createDream({ title: 'x'.repeat(500), why: 'y'.repeat(500) });
    expect(dream!.title).toHaveLength(120);
    expect(dream!.description).toHaveLength(280);
  });
});

describe('JourneyEngine.createOrReuseDream', () => {
  it('reuses an existing Dream with the same normalized title instead of duplicating', () => {
    const { engine, state } = setup();
    const first = engine.createDream({ title: 'Get fit and strong' });
    const reused = engine.createOrReuseDream({ title: '  get FIT and strong  ' });

    expect(reused!.id).toBe(first!.id);
    expect(state.dreams).toHaveLength(1);
  });

  it('creates a new Dream when none matches', () => {
    const { engine, state } = setup();
    engine.createDream({ title: 'Get fit and strong' });
    const other = engine.createOrReuseDream({ title: 'Read more books' });
    expect(other!.id).not.toBeUndefined();
    expect(state.dreams).toHaveLength(2);
  });
});

describe('JourneyEngine.linkJourneyToDream', () => {
  it('sets the primary relationship and emits JourneyDreamLinked', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);
    const dream = engine.createDream({ title: 'Be strong' })!;

    expect(engine.linkJourneyToDream(journey.id, dream.id, { primary: true })).toBe(true);
    expect(state.journeys[0].dreamId).toBe(dream.id);
    expect(events).toContainEqual({
      type: 'JourneyDreamLinked',
      journeyId: journey.id,
      dreamId: dream.id,
      primary: true,
    });
  });

  it('demotes the outgoing primary to a secondary when a new primary is set (link preserved)', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const first = engine.createDream({ title: 'First dream' })!;
    const second = engine.createDream({ title: 'Second dream' })!;

    engine.linkJourneyToDream(journey.id, first.id, { primary: true });
    engine.linkJourneyToDream(journey.id, second.id, { primary: true });

    expect(state.journeys[0].dreamId).toBe(second.id);
    expect(state.journeys[0].secondaryDreamIds).toEqual([first.id]);
  });

  it('adds a secondary relationship without duplicating and without overlapping the primary', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const primary = engine.createDream({ title: 'Primary' })!;
    const secondary = engine.createDream({ title: 'Secondary' })!;

    engine.linkJourneyToDream(journey.id, primary.id, { primary: true });
    expect(engine.linkJourneyToDream(journey.id, secondary.id, { primary: false })).toBe(true);
    // Re-adding the same secondary is a no-op; adding the primary as a secondary is refused.
    expect(engine.linkJourneyToDream(journey.id, secondary.id, { primary: false })).toBe(false);
    expect(engine.linkJourneyToDream(journey.id, primary.id, { primary: false })).toBe(false);

    expect(state.journeys[0].dreamId).toBe(primary.id);
    expect(state.journeys[0].secondaryDreamIds).toEqual([secondary.id]);
  });

  it('fails safely for an unknown Journey or an unknown Dream (no event)', () => {
    const { engine, events } = setup();
    const journey = seedJourney(engine);
    const dream = engine.createDream({ title: 'Real' })!;

    expect(engine.linkJourneyToDream('nope', dream.id, { primary: true })).toBe(false);
    expect(engine.linkJourneyToDream(journey.id, 'dream_nope', { primary: true })).toBe(false);
    expect(events.filter((e) => e.type === 'JourneyDreamLinked')).toHaveLength(0);
  });
});

describe('JourneyEngine.unlinkJourneyFromDream', () => {
  it('promotes the first secondary to primary when the primary is unlinked (Journey kept)', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const a = engine.createDream({ title: 'A' })!;
    const b = engine.createDream({ title: 'B' })!;
    engine.linkJourneyToDream(journey.id, a.id, { primary: true });
    engine.linkJourneyToDream(journey.id, b.id, { primary: false });

    expect(engine.unlinkJourneyFromDream(journey.id, a.id)).toBe(true);
    expect(state.journeys).toHaveLength(1); // never cascade-deleted
    expect(state.journeys[0].dreamId).toBe(b.id);
    expect(state.journeys[0].secondaryDreamIds).toBeUndefined();
  });

  it('clears the primary to unlinked when there is no secondary to promote', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);
    const dream = engine.createDream({ title: 'Only' })!;
    engine.linkJourneyToDream(journey.id, dream.id, { primary: true });

    expect(engine.unlinkJourneyFromDream(journey.id, dream.id)).toBe(true);
    expect(state.journeys[0].dreamId).toBeUndefined();
    expect(events).toContainEqual({ type: 'JourneyDreamUnlinked', journeyId: journey.id, dreamId: dream.id });
  });

  it('removes a secondary relationship, leaving the primary intact', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const primary = engine.createDream({ title: 'Primary' })!;
    const secondary = engine.createDream({ title: 'Secondary' })!;
    engine.linkJourneyToDream(journey.id, primary.id, { primary: true });
    engine.linkJourneyToDream(journey.id, secondary.id, { primary: false });

    expect(engine.unlinkJourneyFromDream(journey.id, secondary.id)).toBe(true);
    expect(state.journeys[0].dreamId).toBe(primary.id);
    expect(state.journeys[0].secondaryDreamIds).toBeUndefined();
  });

  it('is a no-op (false) for an unknown Journey or an unlinked Dream', () => {
    const { engine } = setup();
    const journey = seedJourney(engine);
    expect(engine.unlinkJourneyFromDream('nope', 'd1')).toBe(false);
    expect(engine.unlinkJourneyFromDream(journey.id, 'not_linked')).toBe(false);
  });
});
