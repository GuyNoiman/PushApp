/**
 * THE PORTRAIT LIVES IN AppState, AND THAT IS THE WHOLE ARGUMENT.
 *
 * The founder approved holding what the coach understood about somebody inside `AppState` on one
 * specific basis, written down at `AppCore.ts` line ~422 for the smart-timing models: anything in
 * AppState is part of the data export and of the account wipe without a line of code in either path.
 * A Portrait in a store of its own would need one in both, and the day somebody forgot one of them
 * is the day a deleted account quietly kept a description of a person's life.
 *
 * So these are the two tests that make the argument true rather than merely stated — plus the third
 * promise, which is that it never leaves the phone at all.
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
import { backupCarriesRawText, redactForBackup } from '../backup/redactForBackup';
import { CoachOrchestrator } from '../coach/CoachOrchestrator';
import { INTERVIEW_PLAYBOOK } from '../coach/interviewPlaybook';
import { mergePortrait } from '../coach/portrait';
import { MockLlmClient } from '../llm/LlmClient';
import type { Portrait } from '../coach/portrait';
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

/** What one introduction understood about somebody. */
function aPortrait(): Portrait {
  return mergePortrait(
    {},
    [
      {
        field: 'primaryWant',
        value: 'leave marketing for something else',
        confidence: 'high',
        source: 'stated',
      },
      { field: 'bottleneck', value: 'lack_of_clarity', confidence: 'high', source: 'inferred' },
    ],
    1_700_000_000_000,
  ).portrait;
}

describe('what is held, and what is refused', () => {
  it('holds what the introduction understood', async () => {
    const { core } = await freshCore();

    core.setPortrait(aPortrait());

    expect(core.getPortrait()?.primaryWant?.value).toBe('leave marketing for something else');
    // The provenance survives the trip, which is the entire reason the field is shaped this way.
    expect(core.getPortrait()?.bottleneck?.source).toBe('inferred');
  });

  it('writes nothing for a conversation that understood nothing', async () => {
    const { core } = await freshCore();

    core.setPortrait({});

    // "We have never met" and "we met and learned nothing" are different states, and only the
    // absence of the field can mean the first one.
    expect(core.getPortrait()).toBeUndefined();
  });

  it('hands out a copy, so nothing outside can edit what we understood', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());

    const held = core.getPortrait()!;
    delete held.primaryWant;

    expect(core.getPortrait()?.primaryWant?.value).toBe('leave marketing for something else');
  });
});

describe('the export and the wipe, for free', () => {
  it('is in the data export the person can download', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());

    const exported = JSON.parse(core.exportStateJson({ appVersion: '1', exportedAt: 0 })) as {
      state: AppState;
    };

    // Their own copy of everything held about them on this device includes our reading of them.
    expect(exported.state.portrait?.primaryWant?.value).toBe('leave marketing for something else');
  });

  it('is gone after an account wipe', async () => {
    const { core, lastSaved } = await freshCore();
    core.setPortrait(aPortrait());
    expect(core.getPortrait()).toBeDefined();

    await core.resetToFirstRun();

    expect(core.getPortrait()).toBeUndefined();
    expect(lastSaved()).toBeNull();
    const exported = JSON.parse(core.exportStateJson({ appVersion: '1', exportedAt: 0 })) as {
      state: AppState;
    };
    expect(exported.state.portrait).toBeUndefined();
  });

  it('can be forgotten on its own', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());

    core.clearPortrait();

    expect(core.getPortrait()).toBeUndefined();
  });
});

describe('it never leaves the phone', () => {
  it('is stripped from the account backup', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());
    const state = JSON.parse(core.exportStateJson({ appVersion: '1', exportedAt: 0 })).state as AppState;

    const backup = redactForBackup(state);

    expect(backup.portrait).toBeUndefined();
    expect(backupCarriesRawText(state)).toBe(true);
    expect(backupCarriesRawText(backup)).toBe(false);
    expect(JSON.stringify(backup)).not.toContain('leave marketing');
  });
});

/**
 * THE HANDOFF TO THE SECOND CONVERSATION HAPPENS ONCE (Planning_From_Portrait_Plan, Stage 1).
 *
 * After a Journey is built from a planning conversation that opened from the Portrait, the next one
 * opens with its ordinary line. Quoting the same want back every time somebody plans something is
 * the coach not listening. It reopens only when what they want has changed since.
 */
describe('the handoff to the second conversation', () => {
  it('offers the Portrait until a Journey has been built from it', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());

    expect(core.getPortraitForPlanning()?.primaryWant?.value).toBe('leave marketing for something else');

    core.markPortraitHandoffUsed(1_700_000_000_001);

    expect(core.getPortraitForPlanning()).toBeUndefined();
    // The Portrait itself is untouched; only the handoff is spent.
    expect(core.getPortrait()?.primaryWant?.value).toBe('leave marketing for something else');
  });

  it('opens the next planning conversation with today’s line once the marker is set', async () => {
    const { core } = await freshCore();
    core.setPortrait(
      mergePortrait(
        aPortrait(),
        [{ field: 'domain', value: 'career', confidence: 'high', source: 'inferred' }],
        1_700_000_000_000,
      ).portrait,
    );

    const first = new CoachOrchestrator({ llm: new MockLlmClient(), portrait: core.getPortraitForPlanning() });
    expect(first.start().coachMessage).not.toBe(INTERVIEW_PLAYBOOK.opening);

    core.markPortraitHandoffUsed(1_700_000_000_001);

    const next = new CoachOrchestrator({ llm: new MockLlmClient(), portrait: core.getPortraitForPlanning() });
    expect(next.start().coachMessage).toBe(INTERVIEW_PLAYBOOK.opening);
    expect(next.isResumed()).toBe(false);
  });

  it('reopens when what they want has changed since', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());
    core.markPortraitHandoffUsed(1_700_000_000_001);

    core.setPortrait(
      mergePortrait(
        {},
        [{ field: 'primaryWant', value: 'lead a small team', confidence: 'high', source: 'stated' }],
        1_700_000_000_002,
      ).portrait,
    );

    expect(core.getPortraitForPlanning()?.primaryWant?.value).toBe('lead a small team');
  });

  it('is in the export and gone after a wipe, like the Portrait', async () => {
    const { core } = await freshCore();
    core.setPortrait(aPortrait());
    core.markPortraitHandoffUsed(1_700_000_000_001);

    const exported = JSON.parse(core.exportStateJson({ appVersion: '1', exportedAt: 0 })) as { state: AppState };
    expect(exported.state.portraitHandoffUsedAt).toBe(1_700_000_000_001);

    await core.resetToFirstRun();

    const after = JSON.parse(core.exportStateJson({ appVersion: '1', exportedAt: 0 })) as { state: AppState };
    expect(after.state.portraitHandoffUsedAt).toBeUndefined();
  });
});
