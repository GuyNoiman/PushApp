/**
 * Switching account — the order of operations, and what a failure at each step leaves behind.
 *
 * THE LEAK (found 2026-09-17): Settings › Sign out only ended the session. The next account to sign in
 * kept the previous person's Journeys and backed them up as its own. Sign-out now empties the phone
 * first, and every step's position matters: the last backup before anything is touched, writes
 * suspended before the core is emptied, the session ended only after the account's keys are gone, and
 * the app restarted last of all, once the core's writes have landed (2026-09-17).
 */
import { createElement, type ReactElement } from 'react';

const mockCancelAll = jest.fn(async () => {});
const mockResetToFirstRun = jest.fn(async () => {});
const mockSaveOnboardingProgress = jest.fn((_step: string, _answers: unknown) => {});
const mockSignOut = jest.fn(async () => {});
const mockEnsureSession = jest.fn(async () => {});
const mockFlushNow = jest.fn<Promise<'saved' | 'nothingToBackUp' | 'failed'>, []>(async () => 'saved');
const mockSuspendWrites = jest.fn(() => {});
const mockWipeForAccountSwitch = jest.fn(async () => {});
const mockFlushSaves = jest.fn(async () => {});
const mockRestartApp = jest.fn(() => {});
let mockCanRestart = true;
let mockSingleUser: object | null = null;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({ cancelAllScheduledNotificationsAsync: () => mockCancelAll() }));
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({
    core: {
      resetToFirstRun: () => mockResetToFirstRun(),
      saveOnboardingProgress: (step: string, answers: unknown) => mockSaveOnboardingProgress(step, answers),
      getOnboardingAnswers: () => ({ version: 1, selections: {}, freeText: {}, skipped: [] }),
      flushSaves: () => mockFlushSaves(),
    },
  }),
}));
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({ signOut: () => mockSignOut(), ensureSession: () => mockEnsureSession() }),
}));
jest.mock('@/state/StateBackupProvider', () => ({
  useStateBackup: () => ({
    flushNow: () => mockFlushNow(),
    suspendWrites: () => mockSuspendWrites(),
    restoreNow: async () => 'skipped',
  }),
}));
jest.mock('@/state/accountWipe', () => ({ wipeForAccountSwitch: () => mockWipeForAccountSwitch() }));
jest.mock('@/core/auth/singleUser', () => ({ getSingleUserConfig: () => mockSingleUser }));
jest.mock('@/i18n/restart', () => ({
  canRestartApp: () => mockCanRestart,
  restartApp: () => mockRestartApp(),
}));

import { accountStoreWritesHeld, releaseAccountStoreWrites } from '../accountStoreWrites';
import {
  SWITCH_ACCOUNT_RESUME_STEP,
  SWITCH_FLUSH_TIMEOUT_MS,
  useAccountSession,
  type SwitchAccountOptions,
  type SwitchAccountResult,
} from '../useAccountSession';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): unknown; act(cb: () => void | Promise<void>): Promise<void> } =
  require('react-test-renderer');

type Session = ReturnType<typeof useAccountSession>;
async function grab(): Promise<Session> {
  let session!: Session;
  function Probe() {
    session = useAccountSession();
    return null;
  }
  await TestRenderer.act(async () => {
    TestRenderer.create(createElement(Probe));
  });
  return session;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSingleUser = null;
  mockCanRestart = true;
  mockFlushNow.mockImplementation(async () => 'saved');
  releaseAccountStoreWrites();
});

const order = (fn: jest.Mock) => fn.mock.invocationCallOrder[0];

describe('the order of a switch', () => {
  it('backs up, suspends, cancels reminders, resets, wipes, signs out, opens a fresh session, flushes, then restarts', async () => {
    const session = await grab();
    await expect(session.switchAccount()).resolves.toBe<SwitchAccountResult>('switched');

    const steps = [
      mockFlushNow,
      mockSuspendWrites,
      mockCancelAll,
      mockResetToFirstRun,
      mockSaveOnboardingProgress,
      mockWipeForAccountSwitch,
      mockSignOut,
      mockEnsureSession,
      mockFlushSaves,
      mockRestartApp,
    ];
    for (const step of steps) expect(step).toHaveBeenCalledTimes(1);
    const positions = steps.map(order);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('restarts only after the core has finished writing the emptied state', async () => {
    let release!: () => void;
    mockFlushSaves.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
    const session = await grab();
    const running = session.switchAccount();
    // Let every step before the flush run.
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockFlushSaves).toHaveBeenCalledTimes(1);
    expect(mockRestartApp).not.toHaveBeenCalled();
    release();
    await running;
    expect(mockRestartApp).toHaveBeenCalledTimes(1);
  });

  it('holds the account stores from before the wipe until the restart', async () => {
    const heldAt: Record<string, boolean> = {};
    mockCancelAll.mockImplementationOnce(async () => {
      heldAt.cancel = accountStoreWritesHeld();
    });
    mockWipeForAccountSwitch.mockImplementationOnce(async () => {
      heldAt.wipe = accountStoreWritesHeld();
    });
    mockEnsureSession.mockImplementationOnce(async () => {
      heldAt.ensureSession = accountStoreWritesHeld();
    });
    mockRestartApp.mockImplementationOnce(() => {
      heldAt.restart = accountStoreWritesHeld();
    });
    const session = await grab();
    await session.switchAccount();
    expect(heldAt).toEqual({ cancel: true, wipe: true, ensureSession: true, restart: true });
  });

  it('resumes the first run at the language step', async () => {
    const session = await grab();
    await session.switchAccount();
    expect(SWITCH_ACCOUNT_RESUME_STEP).toBe('language');
    expect(mockSaveOnboardingProgress.mock.calls[0][0]).toBe('language');
  });
});

describe('when the last backup cannot be written', () => {
  it('asks, and stops with NOTHING changed when the answer is no', async () => {
    mockFlushNow.mockResolvedValue('failed');
    const confirmUnbackedLoss = jest.fn(async () => false);
    const session = await grab();

    await expect(session.switchAccount({ confirmUnbackedLoss })).resolves.toBe('cancelled');
    expect(confirmUnbackedLoss).toHaveBeenCalledTimes(1);
    for (const step of [mockSuspendWrites, mockCancelAll, mockResetToFirstRun, mockWipeForAccountSwitch, mockSignOut, mockRestartApp]) {
      expect(step).not.toHaveBeenCalled();
    }
    expect(accountStoreWritesHeld()).toBe(false);
  });

  it('goes on when the answer is yes', async () => {
    mockFlushNow.mockResolvedValue('failed');
    const session = await grab();
    await expect(session.switchAccount({ confirmUnbackedLoss: async () => true })).resolves.toBe('switched');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('does not ask when the backup was written, or when there was no account to back up to', async () => {
    const confirmUnbackedLoss = jest.fn(async () => false);
    const session = await grab();
    await session.switchAccount({ confirmUnbackedLoss });
    mockFlushNow.mockResolvedValue('nothingToBackUp');
    await session.switchAccount({ confirmUnbackedLoss });
    expect(confirmUnbackedLoss).not.toHaveBeenCalled();
  });

  it(`gives up waiting after ${SWITCH_FLUSH_TIMEOUT_MS} ms and asks`, async () => {
    jest.useFakeTimers();
    try {
      mockFlushNow.mockImplementation(() => new Promise(() => undefined)); // never answers
      const confirmUnbackedLoss = jest.fn(async () => false);
      const session = await grab();
      let result: SwitchAccountResult | undefined;
      const options: SwitchAccountOptions = { confirmUnbackedLoss };
      const running = session.switchAccount(options).then((r) => {
        result = r;
      });
      await jest.advanceTimersByTimeAsync(SWITCH_FLUSH_TIMEOUT_MS - 1);
      expect(confirmUnbackedLoss).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      await running;
      expect(confirmUnbackedLoss).toHaveBeenCalledTimes(1);
      expect(result).toBe('cancelled');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('when the phone cannot be wiped', () => {
  it('does NOT end the session, so no other account signs in onto the leftovers', async () => {
    mockWipeForAccountSwitch.mockRejectedValueOnce(new Error('storage refused'));
    const session = await grab();
    await expect(session.switchAccount()).rejects.toThrow('storage refused');
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockEnsureSession).not.toHaveBeenCalled();
  });

  it('does not restart, and lets the stores save again, because this account is still on the phone', async () => {
    mockWipeForAccountSwitch.mockRejectedValueOnce(new Error('storage refused'));
    const session = await grab();
    await expect(session.switchAccount()).rejects.toThrow('storage refused');
    expect(mockRestartApp).not.toHaveBeenCalled();
    expect(accountStoreWritesHeld()).toBe(false);
  });
});

describe('a single-user build', () => {
  it('does not offer switching', async () => {
    mockSingleUser = { email: 'e', password: 'p', uid: 'u' };
    expect((await grab()).canSwitchAccount).toBe(false);
  });

  it('offers it everywhere else', async () => {
    expect((await grab()).canSwitchAccount).toBe(true);
  });
});
