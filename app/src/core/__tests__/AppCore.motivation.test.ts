/**
 * AppCore — the motivation facade (`04_Product/PRD/Motivation_First_Slice_PRD.md`).
 *
 * The engines are proved pure elsewhere. What is proved HERE is what only the facade can be wrong
 * about: the day's one slot is spent by SHOWING a card and not by computing one, a verdict lands on
 * the right entry, and the whole record is carried by AppState — so account export and account
 * deletion cover it with no code of their own.
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
  scheduleNotificationAsync: jest.fn(async () => 'notif_1'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
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
  steps: [
    { title: 'Jog 15 minutes', cadence: 'daily' },
    { title: 'Jog 20 minutes', cadence: 'daily' },
    { title: 'Jog 25 minutes', cadence: 'daily' },
    { title: 'Jog 30 minutes', cadence: 'daily' },
  ],
};

/** A core with a Journey whose first three Steps are done — enough to open the `sustained` moment. */
async function coreWithProgress() {
  const core = new AppCore(memRepo(), memFlag());
  await core.start();
  const journey = core.createJourney(JOURNEY);
  for (const step of journey.steps.slice(0, 3)) core.checkInStep(journey.id, step.id);
  return core;
}

describe('AppCore — motivation', () => {
  it('says nothing on a brand-new account', async () => {
    const core = new AppCore(memRepo(), memFlag());
    await core.start();
    expect(core.getMotivationCard()).toBeNull();
  });

  it('offers a card once there is something true to say', async () => {
    const core = await coreWithProgress();
    const card = core.getMotivationCard();
    expect(card).not.toBeNull();
    expect(card!.title).toBeTruthy();
    expect(card!.body).not.toContain('{{');
  });

  it('COMPUTING a card does not spend the day — only SHOWING it does', async () => {
    const core = await coreWithProgress();
    core.getMotivationCard();
    core.getMotivationCard();
    expect(core.getMotivationLog()).toHaveLength(0);

    const card = core.getMotivationCard()!;
    core.noteMotivationShown(card);
    expect(core.getMotivationLog()).toHaveLength(1);
  });

  it('shows the SAME card for the rest of the day, and records it once', async () => {
    const core = await coreWithProgress();
    const first = core.getMotivationCard()!;
    core.noteMotivationShown(first);
    core.noteMotivationShown(first);

    expect(core.getMotivationLog()).toHaveLength(1);
    expect(core.getMotivationCard()!.itemId).toBe(first.itemId);
  });

  it('goes quiet for the day once the person answers, and remembers what they said', async () => {
    const core = await coreWithProgress();
    const card = core.getMotivationCard()!;
    core.noteMotivationShown(card);
    core.rateMotivation(card.itemId, 'notHelpful');

    expect(core.getMotivationCard()).toBeNull();
    expect(core.getMotivationLog()[0].verdict).toBe('notHelpful');
  });

  it('ignores a verdict for a card that was never shown', async () => {
    const core = await coreWithProgress();
    core.rateMotivation('weekPace', 'helpful');
    expect(core.getMotivationLog()).toHaveLength(0);
  });

  it('keeps NO user-authored text in the record', async () => {
    const core = await coreWithProgress();
    const card = core.getMotivationCard()!;
    core.noteMotivationShown(card);
    core.rateMotivation(card.itemId, 'helpful');

    const serialized = JSON.stringify(core.getMotivationLog());
    expect(serialized).not.toContain('Run 5km');
    expect(serialized).not.toContain('Jog');
    expect(serialized).not.toContain('Feel stronger');
  });

  it('survives a reload — the record is part of the state, not beside it', async () => {
    const repo = memRepo();
    const core = new AppCore(repo, memFlag());
    await core.start();
    const journey = core.createJourney(JOURNEY);
    for (const step of journey.steps.slice(0, 3)) core.checkInStep(journey.id, step.id);
    const card = core.getMotivationCard()!;
    core.noteMotivationShown(card);
    await core.flushSaves();

    const reopened = new AppCore(repo, memFlag());
    await reopened.start();
    expect(reopened.getMotivationLog()).toHaveLength(1);
    expect(reopened.getMotivationCard()!.itemId).toBe(card.itemId);
  });
});
