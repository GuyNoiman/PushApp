/**
 * AppCore — abandoning (canceling) a Journey. Verifies the facade wiring end to end over a mocked
 * expo-notifications + a mocked Social gateway:
 *   • the terminal `abandoned` status is persisted through the JourneyAbandoned → onChanged hook;
 *   • reminders reconcile off the same event — an abandoned Journey schedules nothing, ever again;
 *   • a pending postpone one-shot is cancelled (both on a removed and on a surviving Step);
 *   • Support-Circle invites are closed exactly like the delete path (best-effort, never blocking);
 *   • completion is FINAL (D41) — abandoning a completed Journey changes nothing;
 *   • abandon KEEPS the Journey while deleteJourney still hard-removes it (two distinct paths).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSchedule = jest.fn(async () => `notif_${Math.random().toString(36).slice(2)}`);
const mockCancel = jest.fn(async (_id?: string) => {});
const mockCancelAll = jest.fn(async () => {});
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: () => mockSchedule(),
  cancelScheduledNotificationAsync: (id: string) => mockCancel(id),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
}));

// The Social pillar is server-gated. The abandon path makes three calls — read the Circle, tell it,
// close the invites — and every one of them must survive a rejecting gateway (signed out / offline)
// without failing the local transition.
const mockCloseJourneyInvites = jest.fn(async (_journeyId: string) => {});
const mockListJourneyAllies = jest.fn(async (_journeyId: string): Promise<unknown[]> => []);
const mockCurrentProfile = jest.fn(async (): Promise<unknown> => ({
  id: 'me',
  handle: 'sam',
  buddySummary: { name: 'Dana' },
}));
const socialEnabled = { current: true };
jest.mock('../social', () => ({
  getSocialGateway: () => ({
    get enabled() {
      return socialEnabled.current;
    },
    closeJourneyInvites: (journeyId: string) => mockCloseJourneyInvites(journeyId),
    listJourneyAllies: (journeyId: string) => mockListJourneyAllies(journeyId),
    currentProfile: () => mockCurrentProfile(),
  }),
}));

import { AppCore } from '../AppCore';
import { setCircleNoticeSink, type CircleNotice } from '../notify/circleNotice';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

function memRepo(): { repo: Repository; saved: () => AppState | null } {
  let saved: AppState | null = null;
  return {
    repo: {
      async load() {
        return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
      },
      async save(state: AppState) {
        saved = JSON.parse(JSON.stringify(state)) as AppState;
      },
      async clear() {
        saved = null;
      },
    },
    saved: () => saved,
  };
}

function memFlag(): FirstRunFlag {
  return {
    async isConsumed() {
      return true; // consumed ⇒ no demo seed ⇒ a clean, empty store
    },
    async markConsumed() {},
  };
}

/** A started core with one Journey ('Jog' first, 'Run' second) and reminder permission granted. */
async function coreWithJourney() {
  const { repo, saved } = memRepo();
  const core = new AppCore(repo, memFlag());
  await core.start();
  await core.initReminders();
  const journey = core.createJourney({
    title: 'Run 5km',
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [{ title: 'Jog 15 minutes', cadence: 'weekly' }, { title: 'Run 5km', cadence: 'weekly' }],
  });
  return { core, journey, saved };
}

/** Let the fire-and-forget reconcile / save promises settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The Journey as currently held in the core's snapshot. */
function liveJourney(core: AppCore, journeyId: string) {
  return core.getSnapshot().journeys.find((j) => j.id === journeyId);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  socialEnabled.current = true;
  setCircleNoticeSink(null);
});

describe('AppCore.abandonJourney — state + persistence', () => {
  it('flips the status to abandoned, keeps the Journey, and persists it', async () => {
    const { core, journey, saved } = await coreWithJourney();

    const abandoned = core.abandonJourney(journey.id);
    await flush();

    expect(abandoned?.status).toBe('abandoned');
    expect(liveJourney(core, journey.id)?.status).toBe('abandoned');
    expect(saved()!.journeys.find((j) => j.id === journey.id)!.status).toBe('abandoned');
  });

  it('keeps the reported Steps, removes the never-reported ones, and stays honest about progress', async () => {
    const { core, journey } = await coreWithJourney();
    const [reported, untouched] = journey.steps;
    core.checkInStep(journey.id, reported.id);

    core.abandonJourney(journey.id);
    await flush();

    const live = liveJourney(core, journey.id)!;
    expect(live.steps.map((s) => s.id)).toEqual([reported.id]);
    expect(live.steps[0].done).toBe(true);
    expect(live.steps.some((s) => s.id === untouched.id)).toBe(false);
    // 1 of the 2 Steps the user actually had — never 1 of 1 (a full bar on a canceled Journey).
    expect(live.stepsAtAbandon).toBe(2);
    expect(core.journeyProgress(journey.id)).toBeCloseTo(0.5);
  });

  it('refuses on a completed Journey (D41) and on a second abandon', async () => {
    const { core, journey } = await coreWithJourney();
    for (const step of journey.steps) core.checkInStep(journey.id, step.id);
    expect(liveJourney(core, journey.id)!.status).toBe('completed');

    expect(core.abandonJourney(journey.id)).toBeNull();
    expect(liveJourney(core, journey.id)!.status).toBe('completed');

    const other = core.createJourney({
      title: 'Read more',
      why: [],
      durationDays: 30,
      rhythm: 'weekly',
      steps: [{ title: 'Read a chapter', cadence: 'weekly' }],
    });
    expect(core.abandonJourney(other.id)).not.toBeNull();
    expect(core.abandonJourney(other.id)).toBeNull();
  });
});

describe('AppCore.abandonJourney — reminders', () => {
  it('reconciles: an abandoned Journey schedules nothing and its notifications are cancelled', async () => {
    const { core, journey } = await coreWithJourney();
    await core.addReminderRule({
      journeyId: journey.id,
      trigger: { kind: 'fixedTime', hour: 9, minute: 0 },
      title: 'Time to move',
      body: 'Your Step is waiting',
    });
    expect(mockSchedule).toHaveBeenCalled(); // the rule is live while the Journey runs
    mockSchedule.mockClear();
    mockCancel.mockClear();

    core.abandonJourney(journey.id);
    await flush();

    expect(mockCancel).toHaveBeenCalled(); // the scheduler tore its owned notifications down
    expect(mockSchedule).not.toHaveBeenCalled(); // and planned nothing to replace them
  });

  it('cancels the pending postpone one-shot of a Step the cancel REMOVES (no orphan notification)', async () => {
    const { core, journey } = await coreWithJourney();
    const stepId = journey.steps[0].id;
    await core.postponeStepReminder(journey.id, stepId);
    const notifId = liveJourney(core, journey.id)!.steps[0].postponeNotificationId;
    expect(notifId).toBeTruthy();
    mockCancel.mockClear();

    core.abandonJourney(journey.id);
    await flush();

    // A postpone is an action, not a report (D37) — the Step has no history, so it is spliced. Its
    // OS id must therefore be cancelled BEFORE the removal (the facade reads the ids up front, the
    // same reason deleteJourney does), or the one-shot would fire for a Journey that is gone.
    expect(mockCancel).toHaveBeenCalledWith(notifId);
    expect(liveJourney(core, journey.id)!.steps.some((s) => s.id === stepId)).toBe(false);
  });

  it('wipes the postpone fields of a SURVIVING Step (the JourneyAbandoned clear hook)', async () => {
    const { core, journey } = await coreWithJourney();
    const stepId = journey.steps[0].id;
    await core.postponeStepReminder(journey.id, stepId);
    core.checkInStep(journey.id, stepId); // a report makes it history → the Step survives

    core.abandonJourney(journey.id);
    await flush();

    const step = liveJourney(core, journey.id)!.steps.find((s) => s.id === stepId)!;
    expect(step.postponeNotificationId).toBeUndefined();
    expect(step.postponedUntil).toBeUndefined();
    expect(step.postponeCount).toBeUndefined();
  });
});

describe('AppCore.abandonJourney — Support Circle + delete remain distinct', () => {
  it('closes the Journey invites exactly like the delete path', async () => {
    const { core, journey } = await coreWithJourney();

    core.abandonJourney(journey.id);
    await flush();

    expect(mockCloseJourneyInvites).toHaveBeenCalledWith(journey.id);
  });

  it('does NOT close invites when the abandon was refused', async () => {
    const { core, journey } = await coreWithJourney();
    for (const step of journey.steps) core.checkInStep(journey.id, step.id); // completed → refused

    core.abandonJourney(journey.id);
    await flush();

    expect(mockCloseJourneyInvites).not.toHaveBeenCalled();
  });

  it('survives a rejecting gateway (signed out / offline) without failing the abandon', async () => {
    const { core, journey } = await coreWithJourney();
    mockCloseJourneyInvites.mockRejectedValueOnce(new Error('not signed in'));

    expect(core.abandonJourney(journey.id)?.status).toBe('abandoned');
    await flush();

    expect(liveJourney(core, journey.id)!.status).toBe('abandoned');
  });

  it('reads the Circle BEFORE closing the invites (closing hides the members)', async () => {
    const { core, journey } = await coreWithJourney();
    const order: string[] = [];
    mockListJourneyAllies.mockImplementationOnce(async () => {
      order.push('read');
      return [];
    });
    mockCloseJourneyInvites.mockImplementationOnce(async () => {
      order.push('close');
    });

    core.abandonJourney(journey.id);
    await flush();

    // `closeJourneyInvites` flips the accepted rows to `closed` and `listJourneyAllies` hides those,
    // so reading afterwards would always find nobody and the notice would silently never be sent.
    expect(order).toEqual(['read', 'close']);
  });

  it('deleteJourney still hard-removes; abandonJourney never does', async () => {
    const { core, journey } = await coreWithJourney();
    const other = core.createJourney({
      title: 'Read more',
      why: [],
      durationDays: 30,
      rhythm: 'weekly',
      steps: [{ title: 'Read a chapter', cadence: 'weekly' }],
    });

    core.abandonJourney(journey.id);
    core.deleteJourney(other.id);
    await flush();

    expect(liveJourney(core, journey.id)).toBeDefined();
    expect(liveJourney(core, other.id)).toBeUndefined();
  });
});

/**
 * Telling the Support Circle that a Journey stopped (founder decision, 2026-08-14). The notice is a
 * CONSEQUENCE of a transition that has already committed — never a gate on it — and it says that
 * someone stopped a Journey, never which one.
 */
describe('AppCore.abandonJourney — the Support Circle notice', () => {
  /** Capture whatever the abandon path hands to the delivery seam. */
  function captureNotices(): CircleNotice[] {
    const sent: CircleNotice[] = [];
    setCircleNoticeSink((notice) => {
      sent.push(notice);
    });
    return sent;
  }

  const accepted = (id: string) => ({ profile: { id, handle: id, buddySummary: {} }, bundle: 'encourager', status: 'accepted' });

  it('sends ONE lock-safe notice to the accepted members', async () => {
    const sent = captureNotices();
    mockListJourneyAllies.mockResolvedValueOnce([
      accepted('a1'),
      accepted('a2'),
      { profile: { id: 'a3', handle: 'a3', buddySummary: {} }, bundle: 'encourager', status: 'requested' },
    ]);
    const { core, journey } = await coreWithJourney();

    core.abandonJourney(journey.id);
    await flush();

    expect(sent).toEqual([
      { type: 'journey_closed', recipientIds: ['a1', 'a2'], params: { name: 'Dana' } },
    ]);
    // The Journey's own title never travels with it — there is nowhere on the notice to put it.
    expect(JSON.stringify(sent)).not.toContain('Run 5km');
  });

  it('sends nothing when nobody accepted', async () => {
    const sent = captureNotices();
    mockListJourneyAllies.mockResolvedValueOnce([]);
    const { core, journey } = await coreWithJourney();

    core.abandonJourney(journey.id);
    await flush();

    expect(sent).toEqual([]);
  });

  it('sends nothing with the pillar off, and never reads the Circle', async () => {
    socialEnabled.current = false;
    const sent = captureNotices();
    const { core, journey } = await coreWithJourney();

    core.abandonJourney(journey.id);
    await flush();

    expect(mockListJourneyAllies).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
    // The invites are still closed: the notice is optional, the cleanup is not.
    expect(mockCloseJourneyInvites).toHaveBeenCalledWith(journey.id);
  });

  it('cancels fine when the social read FAILS — the notice is never a gate', async () => {
    const sent = captureNotices();
    mockListJourneyAllies.mockRejectedValueOnce(new Error('offline'));
    const { core, journey } = await coreWithJourney();

    expect(core.abandonJourney(journey.id)?.status).toBe('abandoned');
    await flush();

    expect(sent).toEqual([]);
    expect(liveJourney(core, journey.id)!.status).toBe('abandoned');
    expect(mockCloseJourneyInvites).toHaveBeenCalledWith(journey.id);
  });

  it('sends nothing when the abandon was refused', async () => {
    const sent = captureNotices();
    mockListJourneyAllies.mockResolvedValueOnce([accepted('a1')]);
    const { core, journey } = await coreWithJourney();
    for (const step of journey.steps) core.checkInStep(journey.id, step.id); // completed → refused

    core.abandonJourney(journey.id);
    await flush();

    expect(sent).toEqual([]);
  });
});
