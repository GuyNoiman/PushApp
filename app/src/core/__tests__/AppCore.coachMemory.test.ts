/**
 * AppCore — Coach Context Summaries: consent, what gets written, and what deletion really means.
 *
 * The four things worth holding still, all of them promises rather than features:
 *   • nothing is written until somebody says yes, and a decline is recorded so it is never re-asked;
 *   • withdrawing DELETES what was kept, in the same breath as stopping the next write;
 *   • a summary dies with the Journey it belongs to, whatever killed the Journey;
 *   • the memory never reaches the account backup (its own PRD §9 — see redactForBackup).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notif'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

import { AppCore } from '../AppCore';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

function capturingRepo(): { repo: Repository; lastSaved: () => AppState | null } {
  let saved: AppState | null = null;
  return {
    repo: {
      async load() {
        return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
      },
      async save(state: AppState) {
        saved = state;
      },
      async clear() {
        saved = null;
      },
    },
    lastSaved: () => saved,
  };
}

function consumedFlag(): FirstRunFlag {
  return {
    async isConsumed() {
      return true;
    },
    async markConsumed() {},
  };
}

async function freshCore() {
  const { repo, lastSaved } = capturingRepo();
  const core = new AppCore(repo, consumedFlag());
  await core.start();
  return { core, lastSaved };
}

function buildJourney(core: AppCore) {
  return core.createJourney({
    title: 'Run three times a week',
    why: ['so I can keep up with my daughter'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [{ title: 'Jog 15 minutes', cadence: 'weekly' }],
  });
}

describe('consent', () => {
  it('asks on a fresh account and never again after a no', async () => {
    const { core } = await freshCore();
    expect(core.coachMemoryNeedsAsking()).toBe(true);

    core.setCoachMemoryConsent('declined', 'he');
    expect(core.coachMemoryNeedsAsking()).toBe(false);
    expect(core.coachMemoryActive()).toBe(false);
  });

  it('records the answer with the language it was given in', async () => {
    const { core } = await freshCore();
    core.setCoachMemoryConsent('granted', 'he');
    expect(core.getCoachMemory()?.consent?.locale).toBe('he');
    expect(core.coachMemoryActive()).toBe(true);
  });
});

describe('what gets remembered', () => {
  it('writes nothing at all while consent is missing', async () => {
    const { core } = await freshCore();
    buildJourney(core);
    expect(core.getCoachMemory()).toBeUndefined();
  });

  it('remembers an approved Journey once consent is active, and only what it approved', async () => {
    const { core } = await freshCore();
    core.setCoachMemoryConsent('granted', 'en');
    const journey = buildJourney(core);

    const remembered = core.getCoachMemory()?.journeys ?? [];
    expect(remembered).toHaveLength(1);
    expect(remembered[0].id).toBe(journey.id);
    expect(remembered[0].outcome).toBe('Run three times a week');
    expect(remembered[0].reasons).toEqual(['so I can keep up with my daughter']);
    // The Steps are the Journey. A second, staler copy of them is not memory, it is a bug waiting.
    expect(JSON.stringify(remembered)).not.toContain('Jog 15 minutes');
  });

  it('hands the coach only the record its request is about', async () => {
    const { core } = await freshCore();
    core.setCoachMemoryConsent('granted', 'en');
    const journey = buildJourney(core);

    expect(core.getCoachContextBrief({ journeyId: journey.id })?.journey?.id).toBe(journey.id);
    expect(core.getCoachContextBrief({ journeyId: 'someone-elses' })).toBeNull();
  });
});

describe('turning it off', () => {
  it('deletes what was kept rather than merely stopping the next write', async () => {
    const { core } = await freshCore();
    core.setCoachMemoryConsent('granted', 'en');
    buildJourney(core);
    expect(core.getCoachMemory()?.journeys).toHaveLength(1);

    core.setCoachMemoryConsent('withdrawn', 'en');

    expect(core.getCoachMemory()?.journeys).toEqual([]);
    expect(core.getCoachMemory()?.dreams).toEqual([]);
    expect(core.coachMemoryActive()).toBe(false);
    // The answer itself survives — that is the record of what they chose, not a summary of them.
    expect(core.getCoachMemory()?.consent?.state).toBe('withdrawn');
  });
});

describe('deletion cascade', () => {
  it('forgets a Journey the moment the Journey itself is gone', async () => {
    const { core } = await freshCore();
    core.setCoachMemoryConsent('granted', 'en');
    const journey = buildJourney(core);
    expect(core.getCoachMemory()?.journeys).toHaveLength(1);

    core.deleteJourney(journey.id);

    expect(core.getCoachMemory()?.journeys).toEqual([]);
  });
});

describe('the backup', () => {
  it('never carries the memory off the device', async () => {
    const { core, lastSaved } = await freshCore();
    core.setCoachMemoryConsent('granted', 'en');
    buildJourney(core);
    await core.flushSaves();

    // It IS in the local store — that is where it lives.
    expect(lastSaved()?.coachMemory?.journeys).toHaveLength(1);
    // And `backup/redactForBackup` is what stands between the local store and the server; its own
    // test asserts the strip. This one only proves the field is real enough to need it.
    expect(JSON.stringify(lastSaved())).toContain('keep up with my daughter');
  });
});
