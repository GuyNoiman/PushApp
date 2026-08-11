/**
 * JourneyEngine unit tests — pure TS, no RN rendering needed. Verifies the
 * create + check-in flow and the events other engines depend on
 * (Engineering Bible §18: every major engine has independent tests).
 *
 * Model (confirmed with founder 2026-07-14): a Journey holds a finite set of Steps,
 * each completed once; the Journey completes when EVERY Step is done. No Step recurrence.
 */
import { REWARDS } from '../../config/rewards';
import { EventBus } from '../../events/EventBus';
import type { DomainEvent, RewardGranted, StepCheckedIn, StepReportReversed } from '../../events/events';
import type { AppState, Buddy, ReasonEntry } from '../../types/domain';
import { JourneyEngine } from '../JourneyEngine';
import { RewardEngine } from '../RewardEngine';

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
  const record = (event: DomainEvent) => events.push(event);
  bus.on('JourneyCreated', record);
  bus.on('StepCheckedIn', record);
  bus.on('JourneyCompleted', record);
  return { bus, state, engine, events };
}

describe('JourneyEngine.createJourney', () => {
  it('creates a Journey, stores it, and emits JourneyCreated', () => {
    const { engine, state, events } = setup();

    const journey = engine.createJourney({
      title: 'Run 5km',
      why: ['Feel stronger'],
      durationDays: 30,
      rhythm: 'few-times-week',
      steps: [
        { title: 'Lace up and walk', isStarterStep: true, cadence: 'once' },
        { title: 'Jog 15 minutes' },
      ],
    });

    expect(state.journeys).toHaveLength(1);
    expect(journey.title).toBe('Run 5km');
    expect(journey.why).toEqual(['Feel stronger']);
    expect(journey.steps).toHaveLength(2);
    expect(journey.steps.every((s) => s.id.length > 0)).toBe(true);
    expect(journey.steps.every((s) => !s.done)).toBe(true);
    // A new Journey starts explicitly `active` — the authoritative field the tabs bucket by.
    expect(journey.status).toBe('active');
    expect(events.map((e) => e.type)).toEqual(['JourneyCreated']);
  });

  it('applies Step defaults: isStarterStep false and cadence once', () => {
    const { engine } = setup();

    const journey = engine.createJourney({
      title: 'Learn to draw',
      why: [],
      durationDays: 60,
      rhythm: 'daily',
      steps: [{ title: 'Sketch one shape' }],
    });

    expect(journey.steps[0].isStarterStep).toBe(false);
    expect(journey.steps[0].cadence).toBe('once');
  });

  it('carries the Journey description through to the stored Journey', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      description: 'Build up to a 5k over a month',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }],
    });
    expect(journey.description).toBe('Build up to a 5k over a month');
  });
});

describe('JourneyEngine.checkInStep', () => {
  it('marks a Step done, records a CheckIn, and emits StepCheckedIn', () => {
    const { engine, state, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);

    expect(journey.steps[0].done).toBe(true);
    expect(journey.steps[0].lastCheckInAt).toBeDefined();
    expect(state.checkIns).toHaveLength(1);
    expect(events.filter((e) => e.type === 'StepCheckedIn')).toHaveLength(1);
    // Every Step gates completion — one of two done ≠ complete.
    expect(events.some((e) => e.type === 'JourneyCompleted')).toBe(false);
  });

  it('completes the Journey only when the LAST Step is done (every Step gates)', () => {
    const { engine, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [
        { title: 'Sign up', cadence: 'once' },
        { title: 'Walk', cadence: 'daily' },
        { title: 'Jog', cadence: 'weekly' },
      ],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);
    engine.checkInStep(journey.id, journey.steps[1].id);
    // Not done yet — one Step remains.
    expect(journey.completedAt).toBeUndefined();
    expect(events.some((e) => e.type === 'JourneyCompleted')).toBe(false);

    engine.checkInStep(journey.id, journey.steps[2].id); // last Step
    expect(journey.completedAt).toBeDefined();
    // Completion flips the authoritative status too, so the Journey moves to the Completed tab.
    expect(journey.status).toBe('completed');
    expect(events.filter((e) => e.type === 'JourneyCompleted')).toHaveLength(1);
  });

  it('emits StepCheckedIn for every Step (each completion = a celebration)', () => {
    const { engine, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);
    engine.checkInStep(journey.id, journey.steps[1].id);

    expect(events.filter((e) => e.type === 'StepCheckedIn')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'JourneyCompleted')).toHaveLength(1);
  });

  it('is a no-op for a missing Journey/Step or an already-done Step', () => {
    const { engine, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }],
    });

    engine.checkInStep('missing', journey.steps[0].id);
    engine.checkInStep(journey.id, 'missing');
    engine.checkInStep(journey.id, journey.steps[0].id); // completes it
    engine.checkInStep(journey.id, journey.steps[0].id); // already done

    expect(events.filter((e) => e.type === 'StepCheckedIn')).toHaveLength(1);
  });
});

describe('JourneyEngine.getTodaySteps', () => {
  it('returns only not-done Steps of active (incomplete) Journeys', () => {
    const { engine } = setup();
    const a = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });
    const b = engine.createJourney({
      title: 'Read daily',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Read a page' }],
    });

    engine.checkInStep(a.id, a.steps[0].id); // one Step of A done
    engine.checkInStep(b.id, b.steps[0].id); // completes B entirely

    const today = engine.getTodaySteps();
    expect(today).toHaveLength(1);
    expect(today[0].journeyId).toBe(a.id);
    expect(today[0].step.title).toBe('Jog');
    expect(today[0].journeyTitle).toBe('Run 5km');
  });
});

describe('JourneyEngine.getWeekSteps', () => {
  it('includes done AND not-done Steps of active Journeys (so a checked-in Step stays visible)', () => {
    const { engine } = setup();
    const a = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });

    engine.checkInStep(a.id, a.steps[0].id); // Walk done, Jog still pending

    const week = engine.getWeekSteps();
    expect(week).toHaveLength(2);
    expect(week.map((w) => w.step.title)).toEqual(['Walk', 'Jog']);
    expect(week.find((w) => w.step.title === 'Walk')?.step.done).toBe(true);
    expect(week.find((w) => w.step.title === 'Jog')?.step.done).toBe(false);
  });

  it('drops Steps of a fully-completed Journey (its completion is a bigger moment)', () => {
    const { engine } = setup();
    const b = engine.createJourney({
      title: 'Read daily',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Read a page' }],
    });

    engine.checkInStep(b.id, b.steps[0].id); // completes the whole Journey

    expect(engine.getWeekSteps()).toHaveLength(0);
  });
});

describe('JourneyEngine.checkInStep — idempotent rewards (D36)', () => {
  it('flags firstCompletion true on the first check-in of a Step', () => {
    const { bus, engine } = setup();
    const checkedIn: StepCheckedIn[] = [];
    bus.on('StepCheckedIn', (e) => checkedIn.push(e));
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);

    expect(checkedIn).toHaveLength(1);
    expect(checkedIn[0].firstCompletion).toBe(true);
  });

  it('latches Journey.completionRewarded and flags the completion firstCompletion once', () => {
    const { bus, engine } = setup();
    const completed: DomainEvent[] = [];
    bus.on('JourneyCompleted', (e) => completed.push(e));
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);

    expect(journey.completionRewarded).toBe(true);
    expect(completed).toHaveLength(1);
    expect((completed[0] as { firstCompletion: boolean }).firstCompletion).toBe(true);
  });
});

describe('JourneyEngine.reverseReport (D36)', () => {
  function reverseSetup() {
    const { bus, state, engine } = setup();
    const reversed: StepReportReversed[] = [];
    bus.on('StepReportReversed', (e) => reversed.push(e));
    return { bus, state, engine, reversed };
  }

  it('clears done + lastCheckInAt, stamps lastReportClearedAt, and KEEPS the CheckIn history', () => {
    const { state, engine, reversed } = reverseSetup();
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });
    engine.checkInStep(journey.id, journey.steps[0].id);
    expect(state.checkIns).toHaveLength(1);

    const ok = engine.reverseReport(journey.id, journey.steps[0].id);

    expect(ok).toBe(true);
    expect(journey.steps[0].done).toBe(false);
    expect(journey.steps[0].lastCheckInAt).toBeUndefined();
    expect(journey.steps[0].lastReportClearedAt).toBeDefined();
    // History retained — the CheckIn row survives (no clawback of evidence).
    expect(state.checkIns).toHaveLength(1);
    expect(reversed.map((e) => e.reopenedJourney)).toEqual([false]);
  });

  it('REFUSES to reverse a report on a completed Journey — completion is final (I1/D32)', () => {
    const { engine, reversed } = reverseSetup();
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }],
    });
    engine.checkInStep(journey.id, journey.steps[0].id); // completes it
    expect(journey.completedAt).toBeDefined();
    expect(journey.status).toBe('completed');

    const ok = engine.reverseReport(journey.id, journey.steps[0].id);

    // Locked: the completion cannot be undone. Step stays done, Journey stays completed, no event.
    expect(ok).toBe(false);
    expect(journey.completedAt).toBeDefined();
    expect(journey.status).toBe('completed');
    expect(journey.steps[0].done).toBe(true);
    expect(reversed).toHaveLength(0);
  });

  it('re-completing after a reversal grants NO XP (idempotent — completionRewarded latched)', () => {
    const { bus, engine } = reverseSetup();
    const rewardEngine = new RewardEngine(bus, REWARDS);
    rewardEngine.start();
    const rewards: RewardGranted[] = [];
    bus.on('RewardGranted', (e) => rewards.push(e));

    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }],
    });
    engine.checkInStep(journey.id, journey.steps[0].id); // first completion → Step + Journey reward
    const grantedFirst = rewards.length;
    expect(grantedFirst).toBeGreaterThan(0);

    engine.reverseReport(journey.id, journey.steps[0].id);
    engine.checkInStep(journey.id, journey.steps[0].id); // re-completion → nothing

    expect(rewards).toHaveLength(grantedFirst); // no new RewardGranted
    expect(journey.completionRewarded).toBe(true);
  });

  it('is a no-op (false) for a missing Journey/Step', () => {
    const { engine, reversed } = reverseSetup();
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }],
    });
    expect(engine.reverseReport('missing', journey.steps[0].id)).toBe(false);
    expect(engine.reverseReport(journey.id, 'missing')).toBe(false);
    expect(reversed).toHaveLength(0);
  });
});

describe('JourneyEngine snapshot status (D36)', () => {
  it('derives completed vs unreported on getWeekSteps / getTodaySteps', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });
    engine.checkInStep(journey.id, journey.steps[0].id);

    const week = engine.getWeekSteps();
    expect(week.find((w) => w.step.title === 'Walk')?.status).toBe('completed');
    expect(week.find((w) => w.step.title === 'Jog')?.status).toBe('unreported');

    // getTodaySteps carries the status too (Walk is done, so only Jog is actionable).
    const today = engine.getTodaySteps();
    expect(today.every((s) => s.status === 'unreported')).toBe(true);
  });

  it('keeps the newest terminal report when the reason-log cap evicts (status survives, D36)', () => {
    const { engine, state } = setup();
    const journey = engine.createJourney({
      title: 'Run', why: [], durationDays: 30, rhythm: 'daily', steps: [{ title: 'Walk' }],
    });
    const stepId = journey.steps[0].id;

    // A terminal Partial report, then a long burst of later postpones (> MAX_REASONS_PER_STEP=20).
    const entry = (i: number, over: Partial<ReasonEntry>): ReasonEntry => ({
      id: `r_${i}`, stepId, journeyId: journey.id, reasonId: 'forgot', leverIds: [],
      outcome: 'logged', at: i, action: 'postpone', ...over,
    });
    engine.recordReason(entry(1, { reasonId: 'did_partially', outcome: 'partial' }));
    for (let i = 2; i <= 30; i += 1) engine.recordReason(entry(i, {}));

    // The Partial row is well outside the newest-20 window but must be retained.
    expect(state.reasonLog?.some((e) => e.reasonId === 'did_partially')).toBe(true);
    const week = engine.getWeekSteps();
    expect(week.find((w) => w.step.id === stepId)?.status).toBe('partially_completed');
  });
});

describe('JourneyEngine.freezeJourney / resumeJourney (J3)', () => {
  function frozenSetup() {
    const { bus, engine } = setup();
    const events: DomainEvent[] = [];
    bus.on('JourneyFrozen', (e) => events.push(e));
    bus.on('JourneyResumed', (e) => events.push(e));
    const journey = engine.createJourney({
      title: 'Meditate',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Breathe' }, { title: 'Sit' }],
    });
    return { engine, journey, events };
  }

  it('freezes an active Journey: status → frozen, emits JourneyFrozen, keeps Steps', () => {
    const { engine, journey, events } = frozenSetup();

    const frozen = engine.freezeJourney(journey.id);

    expect(frozen).not.toBeNull();
    expect(journey.status).toBe('frozen');
    expect(journey.steps).toHaveLength(2); // progress preserved, nothing removed
    expect(events.map((e) => e.type)).toEqual(['JourneyFrozen']);
  });

  it('resumes a frozen Journey: status → active, emits JourneyResumed', () => {
    const { engine, journey, events } = frozenSetup();
    engine.freezeJourney(journey.id);

    const resumed = engine.resumeJourney(journey.id);

    expect(resumed).not.toBeNull();
    expect(journey.status).toBe('active');
    expect(events.map((e) => e.type)).toEqual(['JourneyFrozen', 'JourneyResumed']);
  });

  it('is a no-op (null, no event) for an already-frozen freeze or a non-frozen resume', () => {
    const { engine, journey, events } = frozenSetup();

    expect(engine.resumeJourney(journey.id)).toBeNull(); // not frozen yet
    engine.freezeJourney(journey.id);
    expect(engine.freezeJourney(journey.id)).toBeNull(); // already frozen
    expect(events.map((e) => e.type)).toEqual(['JourneyFrozen']); // only the one real transition
  });

  it('refuses to freeze a completed Journey and an unknown id', () => {
    const { engine, journey } = frozenSetup();
    engine.checkInStep(journey.id, journey.steps[0].id);
    engine.checkInStep(journey.id, journey.steps[1].id); // completes it
    expect(journey.status).toBe('completed');

    expect(engine.freezeJourney(journey.id)).toBeNull();
    expect(engine.freezeJourney('nope')).toBeNull();
  });
});

describe('JourneyEngine — postpone field-writers (Step Postponement, D37)', () => {
  function postponeSetup() {
    const bus = new EventBus();
    const state = emptyState();
    const engine = new JourneyEngine(bus, () => state);
    const events: DomainEvent[] = [];
    bus.on('StepPostponed', (e) => events.push(e));
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: ['Feel stronger'],
      durationDays: 30,
      rhythm: 'few-times-week',
      steps: [{ title: 'Jog 15 minutes' }],
    });
    return { engine, state, journey, step: journey.steps[0], events };
  }

  it('postponeStep stamps postponedUntil/postponedAt, increments the count, and emits scalars', () => {
    const { engine, journey, step, events } = postponeSetup();
    const until = Date.now() + 2 * 60 * 60 * 1000;

    engine.postponeStep(journey.id, step.id, { postponedUntil: until });

    expect(step.postponedUntil).toBe(until);
    expect(step.postponedAt).toBeGreaterThan(0);
    expect(step.postponeCount).toBe(1);
    expect(step.done).toBe(false); // an ACTION, not a status (D37.1)
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'StepPostponed',
      journeyId: journey.id,
      stepId: step.id,
      postponedUntil: until,
      postponeCount: 1,
    });
  });

  it('increments the per-occurrence count on repeated postpones', () => {
    const { engine, journey, step } = postponeSetup();
    engine.postponeStep(journey.id, step.id);
    engine.postponeStep(journey.id, step.id);
    engine.postponeStep(journey.id, step.id);
    expect(step.postponeCount).toBe(3);
  });

  it('is a no-op on an already-done Step', () => {
    const { engine, journey, step, events } = postponeSetup();
    engine.checkInStep(journey.id, step.id);
    engine.postponeStep(journey.id, step.id, { postponedUntil: Date.now() + 1000 });
    expect(step.postponeCount).toBeUndefined();
    expect(events).toHaveLength(0);
  });

  it('setStepPostponeNotificationId stores and clears the OS id without an event', () => {
    const { engine, journey, step, events } = postponeSetup();
    engine.setStepPostponeNotificationId(journey.id, step.id, 'notif_abc');
    expect(step.postponeNotificationId).toBe('notif_abc');
    engine.setStepPostponeNotificationId(journey.id, step.id, undefined);
    expect(step.postponeNotificationId).toBeUndefined();
    expect(events).toHaveLength(0); // field-writer only
  });

  it('clearStepPostpone wipes all four fields and reports whether it changed anything', () => {
    const { engine, journey, step } = postponeSetup();
    engine.postponeStep(journey.id, step.id, { postponedUntil: Date.now() + 1000 });
    engine.setStepPostponeNotificationId(journey.id, step.id, 'notif_abc');

    expect(engine.clearStepPostpone(journey.id, step.id)).toBe(true);
    expect(step.postponedUntil).toBeUndefined();
    expect(step.postponeCount).toBeUndefined();
    expect(step.postponedAt).toBeUndefined();
    expect(step.postponeNotificationId).toBeUndefined();

    // Idempotent: a second clear reports no change.
    expect(engine.clearStepPostpone(journey.id, step.id)).toBe(false);
  });
});
