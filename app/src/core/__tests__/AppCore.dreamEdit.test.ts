/**
 * AppCore — reshaping the Dream layer through conversation (Dream Management §7, D40).
 *
 * Everything here is about what happens AFTER the model was believed, because D40 says the coach
 * applies its own changes. The three that matter:
 *
 *   • ORDER, not input order — "move this Journey to the other Dream, then drop this one" has to
 *     work whichever way round the two changes arrive, or a granted request silently half-lands.
 *   • A REMOVAL NEVER ORPHANS a running Journey. It refuses instead, and the refusal is visible in
 *     what `applyDreamEdit` returns, so the screen never claims something that did not happen.
 *   • A MERGE keeps every relationship and touches no Journey's own content.
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

const consumedFlag: FirstRunFlag = {
  async isConsumed() {
    return true;
  },
  async markConsumed() {},
};

async function coreWithTwoDreams() {
  const core = new AppCore(memRepo(), consumedFlag);
  await core.start();
  const body = core.createDream({ title: 'Be someone my body can rely on' })!;
  const health = core.createDream({ title: 'Be healthy' })!;
  const journey = core.createJourney({
    title: 'Run three times a week',
    why: ['to keep up'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [{ title: 'Jog 15 minutes', cadence: 'weekly' }],
  });
  core.linkJourneyToDream(journey.id, body.id, { primary: true });
  return { core, body, health, journey };
}

describe('rewording', () => {
  it('changes the words and nothing else', async () => {
    const { core, body, journey } = await coreWithTwoDreams();

    const applied = core.applyDreamEdit({
      changes: [{ kind: 'reword', dreamId: body.id, title: 'Be someone my body trusts' }],
    });

    expect(applied).toHaveLength(1);
    expect(core.getDreams().find((d) => d.id === body.id)?.title).toBe('Be someone my body trusts');
    const after = core.getSnapshot().journeys.find((j) => j.id === journey.id)!;
    expect(after.title).toBe('Run three times a week');
    expect(after.dreamId).toBe(body.id);
    expect(after.steps).toHaveLength(1);
  });
});

describe('merging', () => {
  it('keeps every relationship on the Dream that survives, and hides the other', async () => {
    const { core, body, health, journey } = await coreWithTwoDreams();
    core.linkJourneyToDream(journey.id, health.id, { primary: false });

    const applied = core.applyDreamEdit({
      changes: [{ kind: 'merge', keepId: body.id, mergedId: health.id }],
    });

    expect(applied).toHaveLength(1);
    expect(core.getDreams().map((d) => d.id)).toEqual([body.id]);
    const after = core.getSnapshot().journeys.find((j) => j.id === journey.id)!;
    expect(after.dreamId).toBe(body.id);
    expect(after.secondaryDreamIds ?? []).not.toContain(health.id);
    // The Journey itself is untouched — merging Dreams is not an edit to anybody's plan.
    expect(after.steps).toHaveLength(1);
  });
});

describe('removing', () => {
  it('refuses to leave a running Journey with no Dream at all', async () => {
    const { core, body, journey } = await coreWithTwoDreams();

    const applied = core.applyDreamEdit({ changes: [{ kind: 'remove', dreamId: body.id }] });

    expect(applied).toEqual([]);
    expect(core.getDreams().map((d) => d.id)).toContain(body.id);
    expect(core.getSnapshot().journeys.find((j) => j.id === journey.id)?.dreamId).toBe(body.id);
  });

  it('does it once the Journey has somewhere else to belong — whatever order the changes arrive in', async () => {
    const { core, body, health, journey } = await coreWithTwoDreams();

    // Deliberately the "wrong" order: the removal is listed FIRST. Applying it as given would refuse
    // the removal and leave the person told nothing happened.
    const applied = core.applyDreamEdit({
      changes: [
        { kind: 'remove', dreamId: body.id },
        { kind: 'link', journeyId: journey.id, dreamId: health.id, primary: true },
      ],
    });

    expect(applied.map((c) => c.kind)).toEqual(['link', 'remove']);
    expect(core.getDreams().map((d) => d.id)).toEqual([health.id]);
    expect(core.getSnapshot().journeys.find((j) => j.id === journey.id)?.dreamId).toBe(health.id);
  });

  it('leaves a COMPLETED Journey its attribution — history is not tidied away', async () => {
    const { core, body, health, journey } = await coreWithTwoDreams();
    // Finish it, so it is no longer running.
    const step = core.getSnapshot().journeys.find((j) => j.id === journey.id)!.steps[0];
    core.checkInStep(journey.id, step.id);

    const applied = core.applyDreamEdit({ changes: [{ kind: 'remove', dreamId: body.id }] });

    expect(applied).toHaveLength(1);
    expect(core.getDreams().map((d) => d.id)).toEqual([health.id]);
    // Still pointing at the Dream it was part of, which no longer appears in any list.
    expect(core.getSnapshot().journeys.find((j) => j.id === journey.id)?.dreamId).toBe(body.id);
  });
});

describe('what the screen is told', () => {
  it('reports only the changes that actually landed', async () => {
    const { core, body } = await coreWithTwoDreams();
    const before = core.getDreamEditContext();

    const applied = core.applyDreamEdit({
      changes: [
        { kind: 'reword', dreamId: body.id, title: 'Be someone my body trusts' },
        { kind: 'remove', dreamId: body.id }, // refused: it would orphan the running Journey
      ],
    });

    const lines = core.describeDreamChanges(applied, before);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Be someone my body trusts');
  });
});
