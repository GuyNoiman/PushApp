/**
 * RecoveryEngine unit tests (Miss-Recovery slice) — pure TS, no RN/OS. Verifies the
 * user-triggered loop: reminder-affecting levers drive the reminder facade, deferred
 * levers only log (still recorded in leverIds), exactly one correct ReasonEntry is
 * written, the on-device `note` never leaks into an event (G1), and Cancel is FREE —
 * StepCancelled carries NO Grace-Token cost.
 */
import { NullCalendarGateway } from '../../calendar/CalendarGateway';
import { JourneyEngine } from '../../engines/JourneyEngine';
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
import { NullLocationGateway } from '../../location/LocationGateway';
import type { AppState, Buddy, Journey, ReminderRule } from '../../types/domain';
import { createId } from '../../util/id';
import { deriveStepStatus } from '../../status/stepStatus';
import { RecoveryEngine, type ReminderMutations } from '../RecoveryEngine';

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
  const journeys = new JourneyEngine(bus, () => state);

  const added: { journeyId: string }[] = [];
  const updated: { id: string }[] = [];
  const reminders: ReminderMutations = {
    listReminderRules: (journeyId) =>
      state.reminderRules.filter((r) => !journeyId || r.journeyId === journeyId),
    addReminderRule: async (input) => {
      const rule: ReminderRule = {
        id: createId('reminder'),
        journeyId: input.journeyId,
        trigger: input.trigger,
        title: input.title,
        body: input.body,
        enabled: input.enabled ?? true,
        scheduledNotificationIds: [],
      };
      state.reminderRules.push(rule);
      added.push({ journeyId: input.journeyId });
      return rule;
    },
    updateReminderRule: async (id, changes) => {
      updated.push({ id });
      const idx = state.reminderRules.findIndex((r) => r.id === id);
      if (idx < 0) return null;
      state.reminderRules[idx] = { ...state.reminderRules[idx], ...changes, scheduledNotificationIds: [] };
      return state.reminderRules[idx];
    },
  };

  const engine = new RecoveryEngine(
    bus,
    () => state,
    journeys,
    reminders,
    NullLocationGateway,
    NullCalendarGateway,
  );

  const events: DomainEvent[] = [];
  bus.on('StepPostponed', (e) => events.push(e));
  bus.on('StepCancelled', (e) => events.push(e));
  bus.on('ReminderRescheduled', (e) => events.push(e));

  const journey = journeys.createJourney({
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ title: 'Walk', estimatedDuration: 40 }],
  });

  return { bus, state, journeys, engine, events, added, updated, journey };
}

/** The Step id under test. */
function stepId(journey: Journey): string {
  return journey.steps[0].id;
}

describe('RecoveryEngine.submitReason — reminder levers', () => {
  it('Forgot + a chosen time reschedules and adds a pre-reminder (retime + refrequency)', async () => {
    const { engine, journey, events, added } = setup();
    const chosenTime = new Date(2026, 6, 15, 9, 0, 0).getTime();

    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'forgot',
      chosenTime,
    });

    // retime (no existing rule → add) + refrequency (pre-reminder → add) = 2 adds.
    expect(added).toHaveLength(2);
    expect(entry.leverIds).toEqual(['retime', 'refrequency']);
    expect(entry.outcome).toBe('rescheduled');
    // A schedule change emits ReminderRescheduled carrying lever ids only.
    const resched = events.find((e) => e.type === 'ReminderRescheduled');
    expect(resched).toMatchObject({ journeyId: journey.id, leverIds: ['retime', 'refrequency'] });
  });

  it('reuses the Journey rule on retime when one already exists (update, not add)', async () => {
    const { engine, journey, state, added, updated } = setup();
    state.reminderRules.push({
      id: 'reminder_existing',
      journeyId: journey.id,
      trigger: { kind: 'fixedTime', hour: 8, minute: 0 },
      title: 't',
      body: 'b',
      enabled: true,
      scheduledNotificationIds: [],
    });

    await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'forgot',
      chosenTime: new Date(2026, 6, 15, 9, 0, 0).getTime(),
    });

    expect(updated.map((u) => u.id)).toContain('reminder_existing');
    // refrequency still adds one pre-reminder; retime updated the existing rule.
    expect(added).toHaveLength(1);
  });
});

describe('RecoveryEngine.submitReason — non-reminder levers', () => {
  it('Couldn’t (life happened) accepts with no reminder change (Grace)', async () => {
    const { engine, journey, events, added, updated } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'couldnt',
    });
    expect(entry.leverIds).toEqual(['grace']);
    expect(entry.outcome).toBe('accepted');
    expect(added).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(events.some((e) => e.type === 'ReminderRescheduled')).toBe(false);
  });

  it('Lost motivation only LOGS its placeholders (no reminder change), still recorded in leverIds', async () => {
    const { engine, journey, added, events } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'lost_motivation',
    });
    expect(entry.leverIds).toEqual(['reconnect_why', 'rally']);
    expect(entry.outcome).toBe('logged');
    expect(added).toHaveLength(0);
    expect(events.some((e) => e.type === 'ReminderRescheduled')).toBe(false);
  });

  it('Too hard reshapes the Step (halves its estimatedDuration)', async () => {
    const { engine, journey, state } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'too_hard',
    });
    expect(entry.outcome).toBe('edited');
    expect(state.journeys[0].steps[0].estimatedDuration).toBe(20); // 40 → 20
  });

  it('Did it partially marks a partial touch and records the partial outcome', async () => {
    const { engine, journey, state } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'did_partially',
    });
    expect(entry.outcome).toBe('partial');
    expect(state.journeys[0].steps[0].lastCheckInAt).toBeDefined();
    expect(state.journeys[0].steps[0].done).toBe(false);
  });
});

describe('RecoveryEngine.submitReason — logging, privacy, and free Cancel', () => {
  it('writes exactly one ReasonEntry, retrievable via getReasonHistory', async () => {
    const { engine, journey, state } = setup();
    await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'couldnt',
    });
    expect(state.reasonLog).toHaveLength(1);
    expect(engine.getReasonHistory(stepId(journey))).toHaveLength(1);
  });

  it('keeps the "other" note on the entry ONLY — never in an emitted event (G1)', async () => {
    const { engine, journey, events } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'cancel',
      reasonId: 'other',
      note: 'my private context',
    });
    expect(entry.note).toBe('my private context');
    // No emitted event carries the note (serialize + scan).
    expect(JSON.stringify(events)).not.toContain('my private context');
  });

  it('Cancel emits StepCancelled with the reason id and NO Grace-Token cost (free)', async () => {
    const { engine, journey, events } = setup();
    await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'cancel',
      reasonId: 'no_time',
    });
    const cancelled = events.find((e) => e.type === 'StepCancelled');
    expect(cancelled).toMatchObject({ journeyId: journey.id, reasonId: 'no_time' });
    expect(Object.keys(cancelled!)).not.toContain('graceTokenCost');
  });

  it('Postpone emits StepPostponed (kept, not cancelled)', async () => {
    const { engine, journey, events } = setup();
    await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'forgot',
    });
    expect(events.some((e) => e.type === 'StepPostponed')).toBe(true);
    expect(events.some((e) => e.type === 'StepCancelled')).toBe(false);
  });

  it('records the Screen-1 action on the entry, and it never leaks into an event (D36/G1)', async () => {
    const { engine, journey, state, events } = setup();
    const cancel = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'cancel',
      reasonId: 'couldnt',
    });
    const postpone = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'did_partially',
    });
    expect(cancel.action).toBe('cancel');
    expect(postpone.action).toBe('postpone');
    // Persisted on the on-device entries.
    expect(state.reasonLog?.map((e) => e.action)).toEqual(['cancel', 'postpone']);
    // The emitted events (ids/enums only) never carry the `action` key.
    for (const e of events) expect(Object.keys(e)).not.toContain('action');
  });

  it('keeps an optional Partial (did_partially) note on the entry ONLY — never emitted (D36/G1)', async () => {
    const { engine, journey, state, events } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'did_partially',
      note: 'got through the warm-up only',
    });
    expect(entry.note).toBe('got through the warm-up only');
    expect(state.reasonLog?.[0].note).toBe('got through the warm-up only');
    // The Partial note rides the SAME on-device-only path as the `other` note — no event carries it.
    expect(JSON.stringify(events)).not.toContain('got through the warm-up only');
  });

  it('a pure postpone (forgot, no time) leaves the Step unreported and emits NO StepPartial (D37)', async () => {
    // Mirrors Home's swipe-Postpone path: a plain postpone is an ACTION, not a Partial report.
    const { bus, engine, journey, state } = setup();
    const partials: DomainEvent[] = [];
    bus.on('StepPartial', (e) => partials.push(e));

    await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'forgot',
    });

    expect(partials).toHaveLength(0);
    expect(state.journeys[0].steps[0].done).toBe(false);
    expect(deriveStepStatus(state.journeys[0].steps[0], state.reasonLog ?? [])).toBe('unreported');
  });

  it('an empty Partial note is simply omitted (optional, never blocks the report)', async () => {
    const { engine, journey, state } = setup();
    const entry = await engine.submitReason({
      journeyId: journey.id,
      stepId: stepId(journey),
      action: 'postpone',
      reasonId: 'did_partially',
    });
    expect(entry.note).toBeUndefined();
    expect(state.reasonLog?.[0].outcome).toBe('partial');
  });
});
