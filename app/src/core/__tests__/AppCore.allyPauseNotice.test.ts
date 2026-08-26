/**
 * AppCore — the Allies are told when a Journey pauses or resumes (R6, D79).
 *
 * The three things only this layer can get wrong: the event is published for a pause that actually
 * happened (and not for one that did not), the publish is best-effort so a pause still works
 * offline, and the payload is ids and a kind.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'n'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

const mockPublish = jest.fn(async (_journeyId: string, _kind: string) => {});
jest.mock('../social', () => ({
  ...jest.requireActual('../social/SocialGateway'),
  getSocialGateway: () => ({
    enabled: true,
    publishJourneyStatusEvent: (journeyId: string, kind: string) => mockPublish(journeyId, kind),
    closeJourneyInvites: async () => {},
    listJourneyAllies: async () => [],
    allyJourneyStatusEvents: async () => [],
  }),
}));

import { AppCore } from '../AppCore';
import type { NewJourneyInput } from '../engines/JourneyEngine';
import type { FirstRunFlag } from '../persistence/firstRunFlag';
import type { Repository } from '../persistence/Repository';
import type { AppState } from '../types/domain';

function memRepo(): Repository {
  let saved: AppState | null = null;
  return {
    async load() {
      return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
    },
    async save(state: AppState) {
      saved = state;
    },
    async clear() {
      saved = null;
    },
  };
}

const memFlag = (): FirstRunFlag => ({
  async isConsumed() {
    return true;
  },
  async markConsumed() {},
});

const JOURNEY: NewJourneyInput = {
  title: 'Run 5km',
  why: ['Feel stronger'],
  durationDays: 30,
  rhythm: 'daily',
  steps: [{ title: 'Jog 15 minutes', cadence: 'daily' }],
};

async function coreWithJourney() {
  const core = new AppCore(memRepo(), memFlag());
  await core.start();
  const journey = core.createJourney(JOURNEY);
  mockPublish.mockClear();
  return { core, journey };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('an Ally is told about a pause', () => {
  it('publishes exactly one event when a Journey is paused', async () => {
    const { core, journey } = await coreWithJourney();
    core.freezeJourney(journey.id);
    await settle();
    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(journey.id, 'paused');
  });

  it('publishes a resume when it comes back', async () => {
    const { core, journey } = await coreWithJourney();
    core.freezeJourney(journey.id);
    core.resumeJourney(journey.id);
    await settle();
    expect(mockPublish).toHaveBeenLastCalledWith(journey.id, 'resumed');
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it('says nothing when nothing happened', async () => {
    const { core } = await coreWithJourney();
    // Unknown id, and a resume of something that was never paused: both return null and must not
    // announce a transition that did not occur.
    core.freezeJourney('journey_that_does_not_exist');
    core.resumeJourney('journey_that_does_not_exist');
    await settle();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('does not announce the same pause twice', async () => {
    const { core, journey } = await coreWithJourney();
    core.freezeJourney(journey.id);
    core.freezeJourney(journey.id); // already frozen ⇒ null ⇒ nothing to tell anyone
    await settle();
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it('pauses fine when the publish fails — the pause is local and already committed', async () => {
    const { core, journey } = await coreWithJourney();
    mockPublish.mockRejectedValueOnce(new Error('offline'));
    const frozen = core.freezeJourney(journey.id);
    await settle();
    expect(frozen?.status).toBe('frozen');
  });
});
