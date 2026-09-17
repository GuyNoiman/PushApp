/**
 * Letting go of an account held in memory — the restart, its fallback, and the window between the
 * wipe and the restart.
 *
 * THE LEAK (2026-09-17): after a switch of account or a deletion, the Profile store, the Tools stores,
 * the celebration switch and the tester flag still held the previous person's data in memory, and
 * `ProfileProvider` writes its WHOLE profile on the next edit. So one edit after the wipe put the last
 * person's Personal Details straight back on the phone for the next account. These pin the decided
 * fix: the app restarts last; where it cannot, everything that belongs to the account mounts again;
 * and nothing an account store holds is written between the wipe and either of those.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockCanRestart = false;
const mockRestartApp = jest.fn(() => {});
jest.mock('@/i18n/restart', () => ({
  canRestartApp: () => mockCanRestart,
  restartApp: () => mockRestartApp(),
}));

// The switch's collaborators. Only the parts this suite is about are real: the scope, the write hold,
// the Profile store and the orchestration in `useAccountSession`.
const mockSignOut = jest.fn(async () => {});
const mockEnsureSession = jest.fn(async () => {});
const mockWipeForAccountSwitch = jest.fn(async () => {});
jest.mock('expo-notifications', () => ({ cancelAllScheduledNotificationsAsync: async () => {} }));
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({
    core: {
      resetToFirstRun: async () => {},
      saveOnboardingProgress: () => {},
      getOnboardingAnswers: () => ({ version: 1, selections: {}, freeText: {}, skipped: [] }),
      flushSaves: async () => {},
    },
  }),
}));
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({ signOut: () => mockSignOut(), ensureSession: () => mockEnsureSession() }),
}));
jest.mock('@/state/StateBackupProvider', () => ({
  useStateBackup: () => ({
    flushNow: async () => 'saved',
    suspendWrites: () => {},
    restoreNow: async () => 'skipped',
  }),
}));
jest.mock('@/state/accountWipe', () => ({ wipeForAccountSwitch: () => mockWipeForAccountSwitch() }));
jest.mock('@/core/auth/singleUser', () => ({ getSingleUserConfig: () => null }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, useEffect, type ReactElement } from 'react';

import { AccountScope, useRestartForNextAccount, type AccountRestart } from '@/state/AccountScope';
import {
  accountStoreWritesHeld,
  holdAccountStoreWrites,
  releaseAccountStoreWrites,
  writeAccountStore,
} from '@/state/accountStoreWrites';
import { PROFILE_KEY, ProfileProvider, useProfile } from '@/state/ProfileProvider';
import { useAccountSession } from '@/state/useAccountSession';

interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

/** Let mount-time storage reads settle. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockCanRestart = false;
  releaseAccountStoreWrites();
  await AsyncStorage.clear();
});

describe('the restart', () => {
  let mounts = 0;
  let restart!: () => AccountRestart;
  function Child() {
    restart = useRestartForNextAccount();
    useEffect(() => {
      mounts += 1;
    }, []);
    return null;
  }

  beforeEach(async () => {
    mounts = 0;
    await act(async () => {
      TestRenderer.create(createElement(AccountScope, null, createElement(Child)));
    });
  });

  it('relaunches the app when it can, and mounts nothing again', async () => {
    mockCanRestart = true;
    let how: AccountRestart | undefined;
    await act(async () => {
      how = restart();
    });
    expect(how).toBe('restarted');
    expect(mockRestartApp).toHaveBeenCalledTimes(1);
    expect(mounts).toBe(1);
  });

  it('keeps the account stores held across a relaunch, which starts the app over anyway', async () => {
    mockCanRestart = true;
    holdAccountStoreWrites();
    await act(async () => {
      restart();
    });
    expect(accountStoreWritesHeld()).toBe(true);
  });

  it('where it cannot relaunch (web, Expo Go, jest), mounts everything inside the scope again', async () => {
    let how: AccountRestart | undefined;
    await act(async () => {
      how = restart();
    });
    expect(how).toBe('remounted');
    expect(mockRestartApp).not.toHaveBeenCalled();
    expect(mounts).toBe(2);
  });

  it('releases the hold once the fresh stores are mounted, since nothing old is left to write', async () => {
    holdAccountStoreWrites();
    await act(async () => {
      restart();
    });
    expect(accountStoreWritesHeld()).toBe(false);
  });
});

describe('the write hold', () => {
  it('drops a held write and lets the next one through once released', async () => {
    holdAccountStoreWrites();
    await writeAccountStore('pushapp.profile', 'held');
    expect(await AsyncStorage.getItem('pushapp.profile')).toBeNull();
    releaseAccountStoreWrites();
    await writeAccountStore('pushapp.profile', 'written');
    expect(await AsyncStorage.getItem('pushapp.profile')).toBe('written');
  });
});

describe('a switch of account, with the real Profile store', () => {
  let profile!: ReturnType<typeof useProfile>;
  let session!: ReturnType<typeof useAccountSession>;
  function Probe() {
    profile = useProfile();
    session = useAccountSession();
    return null;
  }

  async function mountApp(): Promise<void> {
    await act(async () => {
      TestRenderer.create(
        createElement(AccountScope, null, createElement(ProfileProvider, null, createElement(Probe))),
      );
    });
    await settle();
  }

  beforeEach(() => {
    // The wipe removes the profile key from storage, as `wipeForAccountSwitch` does.
    mockWipeForAccountSwitch.mockImplementation(async () => {
      await AsyncStorage.removeItem(PROFILE_KEY);
    });
  });

  it('writes nothing the Profile store holds between the wipe and the restart', async () => {
    await mountApp();
    await act(async () => {
      profile.setDisplayName('Dana');
      profile.setBirthDate('1990-01-01');
    });
    await settle();
    expect(JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) as string)).toMatchObject({
      displayName: 'Dana',
    });

    // An edit lands while the session is being replaced: after the wipe, before the restart. The
    // store still holds Dana in memory and writes its whole profile on any edit.
    const setItem = AsyncStorage.setItem as jest.Mock;
    let setItemCallsAtWipe = 0;
    mockWipeForAccountSwitch.mockImplementationOnce(async () => {
      await AsyncStorage.removeItem(PROFILE_KEY);
      setItemCallsAtWipe = setItem.mock.calls.length;
    });
    mockSignOut.mockImplementationOnce(async () => {
      profile.setCountry('FR');
    });
    mockCanRestart = true; // restart path: nothing remounts, so the hold is all that stands in the way

    await act(async () => {
      await session.switchAccount();
    });
    await settle();

    const writesAfterWipe = setItem.mock.calls.slice(setItemCallsAtWipe);
    expect(writesAfterWipe.filter(([key]) => key === PROFILE_KEY)).toEqual([]);
    expect(await AsyncStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(mockRestartApp).toHaveBeenCalledTimes(1);
  });

  it('where the app cannot relaunch, comes back with an empty profile rather than the last one', async () => {
    await mountApp();
    await act(async () => {
      profile.setDisplayName('Dana');
    });
    await settle();

    await act(async () => {
      await session.switchAccount();
    });
    await settle();

    expect(mockRestartApp).not.toHaveBeenCalled();
    expect(profile.profile.displayName).toBeNull();
    expect(profile.profile.birthDate).toBeNull();

    // And the fresh store saves again: the next person's edits are theirs to keep.
    await act(async () => {
      profile.setDisplayName('Noa');
    });
    await settle();
    expect(JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) as string)).toMatchObject({
      displayName: 'Noa',
    });
  });
});
