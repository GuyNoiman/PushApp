/**
 * InactivityEngine unit tests (Account Inactivity Freeze, J5, LOCAL-FIRST POC) — pure TS, `now`
 * injected so every case is deterministic. Verifies first-sight grace, the exact threshold boundary,
 * provenance-tagged freezing that reuses the J3 path, status guards, idempotence, the
 * nothing-to-review resolve, backward-clock safety, and the scalar-only event payloads.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
import { INACTIVITY_POLICY } from '../../config/inactivityPolicy';
import type { AppState, Buddy, Journey } from '../../types/domain';
import { InactivityEngine } from '../InactivityEngine';
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

/** A minimal active Journey created at `createdAt` with `n` un-done Steps. */
function makeJourney(id: string, createdAt: number, n = 1): Journey {
  return {
    id,
    title: id,
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    createdAt,
    status: 'active',
    steps: Array.from({ length: n }, (_, i) => ({
      id: `${id}_s${i}`,
      title: `step ${i}`,
      isStarterStep: false,
      cadence: 'once' as const,
      done: false,
    })),
  };
}

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const journeyEngine = new JourneyEngine(bus, () => state);
  const engine = new InactivityEngine(bus, () => state, journeyEngine);
  const events: DomainEvent[] = [];
  bus.on('AccountInactivityFrozen', (e) => events.push(e));
  bus.on('AccountInactivityReturned', (e) => events.push(e));
  return { state, engine, events };
}

const T0 = 1_000_000_000_000;
const OVER = T0 + INACTIVITY_POLICY.thresholdMs; // exactly the threshold gap

describe('InactivityEngine.tick — first sight seeds, never freezes', () => {
  it('seeds lastAuthenticatedActivityAt on the first tick and freezes nothing', () => {
    const { state, engine, events } = setup();
    state.journeys.push(makeJourney('j', T0 - INACTIVITY_POLICY.thresholdMs * 2));

    engine.tick(T0);

    expect(state.lastAuthenticatedActivityAt).toBe(T0);
    expect(state.accountInactivity).toBeUndefined();
    expect(state.journeys[0].status).toBe('active');
    expect(events).toHaveLength(0);
  });
});

describe('InactivityEngine.tick — threshold boundary', () => {
  it('freezes all active Journeys with account_inactivity at exactly the threshold', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = T0;
    state.journeys.push(makeJourney('a', T0), makeJourney('b', T0));

    engine.tick(OVER);

    expect(state.journeys.every((j) => j.status === 'frozen')).toBe(true);
    expect(state.journeys.every((j) => j.freezeReason === 'account_inactivity')).toBe(true);
    expect(state.accountInactivity).toMatchObject({ frozenAt: OVER, returnedAt: OVER });
    expect(state.accountInactivity?.resolved).toBeFalsy();
    expect(state.lastAuthenticatedActivityAt).toBe(OVER);
    expect(events.map((e) => e.type)).toEqual([
      'AccountInactivityFrozen',
      'AccountInactivityReturned',
    ]);
  });

  it('does NOT freeze one millisecond under the threshold', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = T0;
    state.journeys.push(makeJourney('a', T0));

    engine.tick(OVER - 1);

    expect(state.journeys[0].status).toBe('active');
    expect(state.accountInactivity).toBeUndefined();
    expect(state.lastAuthenticatedActivityAt).toBe(OVER - 1);
    expect(events).toHaveLength(0);
  });
});

describe('InactivityEngine.tick — status guards + provenance preserved', () => {
  it('skips completed / abandoned / already-manual-frozen Journeys', () => {
    const { state, engine } = setup();
    state.lastAuthenticatedActivityAt = T0;
    const completed = { ...makeJourney('done', T0), status: 'completed' as const, completedAt: T0 };
    const abandoned = { ...makeJourney('gone', T0), status: 'abandoned' as const };
    const manual = { ...makeJourney('paused', T0), status: 'frozen' as const, freezeReason: 'manual' as const };
    const active = makeJourney('go', T0);
    state.journeys.push(completed, abandoned, manual, active);

    engine.tick(OVER);

    expect(state.journeys.find((j) => j.id === 'done')!.status).toBe('completed');
    expect(state.journeys.find((j) => j.id === 'gone')!.status).toBe('abandoned');
    // The manual pause keeps its provenance — the sweep never re-tags an already-frozen Journey.
    const stillManual = state.journeys.find((j) => j.id === 'paused')!;
    expect(stillManual.status).toBe('frozen');
    expect(stillManual.freezeReason).toBe('manual');
    // Only the genuinely-active one is swept.
    const swept = state.journeys.find((j) => j.id === 'go')!;
    expect(swept.status).toBe('frozen');
    expect(swept.freezeReason).toBe('account_inactivity');
  });
});

describe('InactivityEngine.tick — idempotence', () => {
  it('a later tick never re-freezes or re-emits once a cycle exists', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = T0;
    const active = makeJourney('go', T0);
    state.journeys.push(active);

    engine.tick(OVER);
    expect(events).toHaveLength(2);

    // A user resumes the Journey; a much-later tick must NOT freeze it again.
    active.status = 'active';
    active.freezeReason = undefined;
    engine.tick(OVER + INACTIVITY_POLICY.thresholdMs * 3);

    expect(active.status).toBe('active');
    expect(events).toHaveLength(2); // no new events
    expect(state.lastAuthenticatedActivityAt).toBe(OVER + INACTIVITY_POLICY.thresholdMs * 3);
  });
});

describe('InactivityEngine.tick — nothing to review resolves immediately', () => {
  it('records the cycle already resolved when no active or future Journey exists', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = T0;
    state.journeys.push({ ...makeJourney('done', T0), status: 'completed', completedAt: T0 });

    engine.tick(OVER);

    expect(state.accountInactivity).toMatchObject({ frozenAt: OVER, resolved: true });
    // Still emits the scalar events (journeyCount 0) so a listener persists the marker.
    expect(events.map((e) => e.type)).toEqual([
      'AccountInactivityFrozen',
      'AccountInactivityReturned',
    ]);
  });

  it('resolves immediately when NOTHING was frozen even though a Future Journey exists (no lingering CTA)', () => {
    const { state, engine } = setup();
    state.lastAuthenticatedActivityAt = T0;
    // Created in the future relative to `now` — the sweep leaves it. Nothing was actually frozen, so
    // the cycle records already resolved (a Future Journey is surfaced elsewhere, not a return CTA).
    state.journeys.push(makeJourney('future', OVER + INACTIVITY_POLICY.thresholdMs));

    engine.tick(OVER);

    expect(state.journeys[0].status).toBe('active'); // untouched
    expect(state.accountInactivity).toMatchObject({ frozenAt: OVER, resolved: true });
  });
});

describe('InactivityEngine.tick — re-arms across cycles (per-absence, not once per lifetime)', () => {
  it('freezes AGAIN on a fresh gap after the prior cycle was resolved', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = T0;
    state.journeys.push(makeJourney('a', T0));

    // First absence: freezes.
    engine.tick(OVER);
    expect(state.journeys[0].status).toBe('frozen');
    expect(events).toHaveLength(2);

    // User returns, resolves the cycle, and resumes the Journey.
    state.accountInactivity!.resolved = true;
    state.journeys[0].status = 'active';
    state.journeys[0].freezeReason = undefined;

    // A fresh tick close to the resolve does NOT re-freeze (anchor was refreshed to OVER, tiny gap).
    engine.tick(OVER + 1000);
    expect(state.journeys[0].status).toBe('active');
    expect(events).toHaveLength(2);

    // A SECOND full ≥threshold absence re-arms and freezes again.
    const secondGap = OVER + 1000 + INACTIVITY_POLICY.thresholdMs;
    engine.tick(secondGap);
    expect(state.journeys[0].status).toBe('frozen');
    expect(state.journeys[0].freezeReason).toBe('account_inactivity');
    expect(state.accountInactivity).toMatchObject({ frozenAt: secondGap });
    expect(state.accountInactivity?.resolved).toBeFalsy();
    expect(events).toHaveLength(4); // a fresh frozen + returned pair
  });

  it('a RESOLVED zero-frozen cycle re-arms and freezes on a later real gap', () => {
    const { state, engine } = setup();
    state.lastAuthenticatedActivityAt = T0;
    // No active Journey to freeze now, but a Future one exists ⇒ cycle records already resolved.
    const future = makeJourney('later', OVER + INACTIVITY_POLICY.thresholdMs * 5);
    state.journeys.push(future);

    engine.tick(OVER);
    expect(state.accountInactivity?.resolved).toBe(true);

    // The Future Journey has since begun (its start is now in the past); a later ≥threshold gap must
    // re-arm and freeze it — the resolved zero-frozen marker never blocks a future absence.
    const later = OVER + INACTIVITY_POLICY.thresholdMs * 6;
    engine.tick(later);
    expect(state.journeys[0].status).toBe('frozen');
    expect(state.journeys[0].freezeReason).toBe('account_inactivity');
    expect(state.accountInactivity).toMatchObject({ frozenAt: later });
    expect(state.accountInactivity?.resolved).toBeFalsy();
  });
});

describe('InactivityEngine.tick — backward clock never freezes', () => {
  it('clamps a negative gap to zero', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = OVER; // anchor is AFTER now (device clock moved back)
    state.journeys.push(makeJourney('go', T0));

    engine.tick(T0);

    expect(state.journeys[0].status).toBe('active');
    expect(state.accountInactivity).toBeUndefined();
    expect(events).toHaveLength(0);
    expect(state.lastAuthenticatedActivityAt).toBe(T0);
  });
});

describe('InactivityEngine.tick — scalar-only event payloads (G1)', () => {
  it('carries only a timestamp + a plain count, no titles/reasons/ids', () => {
    const { state, engine, events } = setup();
    state.lastAuthenticatedActivityAt = T0;
    state.journeys.push(makeJourney('a', T0), makeJourney('b', T0));

    engine.tick(OVER);

    const frozen = events.find((e) => e.type === 'AccountInactivityFrozen')!;
    expect(frozen).toEqual({ type: 'AccountInactivityFrozen', frozenAt: OVER, journeyCount: 2 });
    const returned = events.find((e) => e.type === 'AccountInactivityReturned')!;
    expect(returned).toEqual({ type: 'AccountInactivityReturned', returnedAt: OVER });
  });
});
