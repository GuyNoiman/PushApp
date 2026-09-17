/**
 * Deleting the account — the order of operations, and the dead end it used to have.
 *
 * THE BUG (partner, 2026-08-20): he wanted to start over, tapped Delete account, and was told his
 * data had NOT been deleted. It had not. The remote call was made with no session to make it with,
 * the server correctly answered 401, and the strict "remote before local" rule refused to touch
 * anything — so he was left holding data he had explicitly asked to be rid of, with no way to get
 * rid of it, on behalf of an account that did not exist.
 *
 * These tests pin both halves: the safety rule stays (a real account is deleted server-side FIRST,
 * and a failure there leaves everything intact), and "nobody is signed in" is treated as nothing to
 * delete rather than as a failure.
 */
import { createElement, type ReactElement } from 'react';

const mockCancelAll = jest.fn(async () => {});
const mockMultiRemove = jest.fn(async () => {});
const mockResetToFirstRun = jest.fn(async () => {});
const mockDeleteRemote = jest.fn(async () => {});
const mockSignOut = jest.fn(async () => {});
const mockEnsureSession = jest.fn(async () => {});
const mockSaveOnboardingProgress = jest.fn((_step: string, _answers: unknown) => {});
const mockFlushSaves = jest.fn(async () => {});
const mockRestartApp = jest.fn(() => {});
type Health = 'reachable' | 'unreachable' | 'unconfigured';
const mockCheckBackendHealth = jest.fn<Promise<Health>, []>(async () => 'reachable');

interface FakeAuth {
  enabled: boolean;
  user: { id: string; isAnonymous: boolean } | null;
  deleteAccount: typeof mockDeleteRemote;
  signOut: typeof mockSignOut;
  ensureSession: typeof mockEnsureSession;
}
let mockAuth: FakeAuth = {
  enabled: true,
  user: { id: 'u1', isAnonymous: true },
  deleteAccount: mockDeleteRemote,
  signOut: mockSignOut,
  ensureSession: mockEnsureSession,
};

jest.mock('@/global.css', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: '' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false, shareAsync: async () => {} }));
jest.mock('expo-notifications', () => ({ cancelAllScheduledNotificationsAsync: mockCancelAll }));
const mockStoredKeys: string[] = [];
const mockForgetDeviceKeys = jest.fn(async () => {});
const mockTraceClear = jest.fn(async (_kind: string) => {});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, getAllKeys: async () => mockStoredKeys, multiRemove: mockMultiRemove },
}));
jest.mock('@/core/messaging', () => ({ forgetDeviceKeys: mockForgetDeviceKeys }));
jest.mock('@/core/llm/conversationTrace', () => ({
  ...jest.requireActual('@/core/llm/conversationTrace'),
  asyncStorageConversationTrace: { tagFor: jest.fn(), clear: (kind: string) => mockTraceClear(kind) },
}));
jest.mock('@/core/social/backendHealth', () => ({ checkBackendHealth: mockCheckBackendHealth }));
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({
    core: {
      resetToFirstRun: mockResetToFirstRun,
      exportStateJson: () => '{}',
      saveOnboardingProgress: (step: string, answers: unknown) => mockSaveOnboardingProgress(step, answers),
      getOnboardingAnswers: () => ({ version: 1, selections: {}, freeText: {}, skipped: [] }),
      flushSaves: () => mockFlushSaves(),
    },
  }),
}));
jest.mock('@/i18n/restart', () => ({ canRestartApp: () => true, restartApp: () => mockRestartApp() }));
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ profile: null }) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAccountActions, BackendUnreachableError } = require('../useAccountActions');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SWITCH_ACCOUNT_RESUME_STEP } = require('../useAccountSession');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { accountStoreWritesHeld, releaseAccountStoreWrites } = require('../accountStoreWrites');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: {
  create(e: ReactElement): unknown;
  act(cb: () => Promise<void> | void): Promise<void> | void;
} = require('react-test-renderer');

/**
 * The hook has no UI, so a probe component is the whole harness: render it, keep what the hook
 * returned, and call it from the test.
 */
function grabActions(): { deleteAccount: () => Promise<void> } {
  let actions!: { deleteAccount: () => Promise<void> };
  function Probe() {
    actions = useAccountActions();
    return null;
  }
  TestRenderer.act(() => {
    TestRenderer.create(createElement(Probe));
  });
  return actions;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoredKeys.length = 0;
  mockCheckBackendHealth.mockResolvedValue('reachable');
  mockAuth = { enabled: true, user: { id: 'u1', isAnonymous: true }, deleteAccount: mockDeleteRemote, signOut: mockSignOut, ensureSession: mockEnsureSession };
  releaseAccountStoreWrites();
});

const run = async () => {
  const actions = grabActions();
  await TestRenderer.act(async () => {
    await actions.deleteAccount();
  });
};

describe('when there IS an account on the server', () => {
  it('deletes it FIRST, then wipes the device', async () => {
    await run();
    expect(mockDeleteRemote).toHaveBeenCalledTimes(1);
    expect(mockResetToFirstRun).toHaveBeenCalledTimes(1);
    expect(mockMultiRemove).toHaveBeenCalledTimes(1); // no prefixed keys stored in this case
  });

  it('removes the conversation budget and trace keys, and forgets the messaging device key', async () => {
    mockStoredKeys.push(
      'pushapp.conversationBudget.v1.introduction',
      'pushapp.conversationTrace.v1.planning',
      'pushapp.languagePreference',
    );
    await run();
    expect(mockMultiRemove).toHaveBeenCalledWith([
      'pushapp.conversationBudget.v1.introduction',
      'pushapp.conversationTrace.v1.planning',
    ]);
    // The trace store keeps the id in memory as well; clearing each kind drops both copies.
    expect(mockTraceClear.mock.calls.map((call) => call[0]).sort()).toEqual(['introduction', 'planning']);
    expect(mockForgetDeviceKeys).toHaveBeenCalledTimes(1);
  });

  it('touches nothing local when the server cannot be reached', async () => {
    mockCheckBackendHealth.mockResolvedValue('unreachable');
    await expect(grabActions().deleteAccount()).rejects.toBeInstanceOf(BackendUnreachableError);
    expect(mockDeleteRemote).not.toHaveBeenCalled();
    expect(mockResetToFirstRun).not.toHaveBeenCalled();
    expect(mockForgetDeviceKeys).not.toHaveBeenCalled();
  });

  it('touches nothing local when the server refuses', async () => {
    mockDeleteRemote.mockRejectedValueOnce(new Error('401'));
    await expect(grabActions().deleteAccount()).rejects.toThrow('401');
    expect(mockResetToFirstRun).not.toHaveBeenCalled();
    expect(mockMultiRemove).not.toHaveBeenCalled();
    expect(mockRestartApp).not.toHaveBeenCalled();
    expect(accountStoreWritesHeld()).toBe(false);
  });
});

describe('when there is NOBODY signed in', () => {
  it('wipes the device instead of failing on behalf of an account that does not exist', async () => {
    mockAuth = { ...mockAuth, user: null };
    await run();
    expect(mockDeleteRemote).not.toHaveBeenCalled();
    expect(mockCheckBackendHealth).not.toHaveBeenCalled();
    expect(mockResetToFirstRun).toHaveBeenCalledTimes(1);
    expect(mockMultiRemove).toHaveBeenCalledTimes(1);
  });

  it('still cancels the reminders it scheduled', async () => {
    mockAuth = { ...mockAuth, user: null };
    await run();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});

describe('when there is no backend at all', () => {
  it('wipes the device', async () => {
    mockAuth = { ...mockAuth, enabled: false };
    await run();
    expect(mockDeleteRemote).not.toHaveBeenCalled();
    expect(mockResetToFirstRun).toHaveBeenCalledTimes(1);
  });
});

describe('the device the deletion leaves behind', () => {
  /**
   * The partner deleted his account to look at the new first run, and the first run opened on
   * "we cannot reach the server" — which his own Try again then fixed (2026-09-03). Nothing was
   * broken; the device had simply been signed out and nobody had minted the anonymous session a
   * genuine fresh install gets at launch.
   */
  it('holds a session again, so the first run does not open on an error', async () => {
    await run();
    expect(mockEnsureSession).toHaveBeenCalledTimes(1);
  });

  it('mints it only after the wipe, so the new session is not caught by it', async () => {
    await run();
    expect(mockEnsureSession.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockMultiRemove.mock.invocationCallOrder[0],
    );
  });

  it('still counts the deletion as done when the network is not there for the new session', async () => {
    mockEnsureSession.mockRejectedValueOnce(new Error('offline'));
    await expect(run()).resolves.toBeUndefined();
    expect(mockResetToFirstRun).toHaveBeenCalledTimes(1);
  });
});

describe('the first run the deletion resumes at (2026-09-17)', () => {
  /**
   * A switch of account saved a resume point straight after the reset and deletion did not, so
   * anything persisted after the reset could make the empty state look like an old install that had
   * already finished onboarding.
   */
  it('saves the same resume point a switch of account saves', async () => {
    await run();
    expect(mockSaveOnboardingProgress).toHaveBeenCalledTimes(1);
    expect(mockSaveOnboardingProgress.mock.calls[0][0]).toBe(SWITCH_ACCOUNT_RESUME_STEP);
  });

  it('saves it in the same place in the order: right after the reset, before the keys go', async () => {
    await run();
    const reset = mockResetToFirstRun.mock.invocationCallOrder[0];
    const resume = mockSaveOnboardingProgress.mock.invocationCallOrder[0];
    const wipe = mockMultiRemove.mock.invocationCallOrder[0];
    expect(reset).toBeLessThan(resume);
    expect(resume).toBeLessThan(wipe);
  });
});

describe('what the deleted account leaves in memory (2026-09-17)', () => {
  it('restarts the app LAST, after the fresh session and after the core has written the emptied state', async () => {
    await run();
    const ensure = mockEnsureSession.mock.invocationCallOrder[0];
    const flush = mockFlushSaves.mock.invocationCallOrder[0];
    const restart = mockRestartApp.mock.invocationCallOrder[0];
    expect(mockRestartApp).toHaveBeenCalledTimes(1);
    expect(ensure).toBeLessThan(flush);
    expect(flush).toBeLessThan(restart);
  });

  it('still restarts when the network is not there for the new session', async () => {
    mockEnsureSession.mockRejectedValueOnce(new Error('offline'));
    await run();
    expect(mockRestartApp).toHaveBeenCalledTimes(1);
  });

  it('holds the account stores from before the reset until the restart', async () => {
    const heldAt: Record<string, boolean> = {};
    mockResetToFirstRun.mockImplementationOnce(async () => {
      heldAt.reset = accountStoreWritesHeld();
    });
    mockMultiRemove.mockImplementationOnce(async () => {
      heldAt.wipe = accountStoreWritesHeld();
    });
    mockRestartApp.mockImplementationOnce(() => {
      heldAt.restart = accountStoreWritesHeld();
    });
    await run();
    expect(heldAt).toEqual({ reset: true, wipe: true, restart: true });
  });

  it('lets the stores save again when the local wipe fails, and does not restart', async () => {
    mockResetToFirstRun.mockRejectedValueOnce(new Error('storage refused'));
    await expect(grabActions().deleteAccount()).rejects.toThrow('storage refused');
    expect(mockRestartApp).not.toHaveBeenCalled();
    expect(accountStoreWritesHeld()).toBe(false);
  });
});
