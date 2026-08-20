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
type Health = 'reachable' | 'unreachable' | 'unconfigured';
const mockCheckBackendHealth = jest.fn<Promise<Health>, []>(async () => 'reachable');

interface FakeAuth {
  enabled: boolean;
  user: { id: string; isAnonymous: boolean } | null;
  deleteAccount: typeof mockDeleteRemote;
  signOut: typeof mockSignOut;
}
let mockAuth: FakeAuth = {
  enabled: true,
  user: { id: 'u1', isAnonymous: true },
  deleteAccount: mockDeleteRemote,
  signOut: mockSignOut,
};

jest.mock('@/global.css', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: '' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false, shareAsync: async () => {} }));
jest.mock('expo-notifications', () => ({ cancelAllScheduledNotificationsAsync: mockCancelAll }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, multiRemove: mockMultiRemove },
}));
jest.mock('@/core/social/backendHealth', () => ({ checkBackendHealth: mockCheckBackendHealth }));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: { resetToFirstRun: mockResetToFirstRun, exportStateJson: () => '{}' } }) }));
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ profile: null }) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAccountActions, BackendUnreachableError } = require('../useAccountActions');
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
  mockCheckBackendHealth.mockResolvedValue('reachable');
  mockAuth = { enabled: true, user: { id: 'u1', isAnonymous: true }, deleteAccount: mockDeleteRemote, signOut: mockSignOut };
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
    expect(mockMultiRemove).toHaveBeenCalledTimes(1);
  });

  it('touches nothing local when the server cannot be reached', async () => {
    mockCheckBackendHealth.mockResolvedValue('unreachable');
    await expect(grabActions().deleteAccount()).rejects.toBeInstanceOf(BackendUnreachableError);
    expect(mockDeleteRemote).not.toHaveBeenCalled();
    expect(mockResetToFirstRun).not.toHaveBeenCalled();
  });

  it('touches nothing local when the server refuses', async () => {
    mockDeleteRemote.mockRejectedValueOnce(new Error('401'));
    await expect(grabActions().deleteAccount()).rejects.toThrow('401');
    expect(mockResetToFirstRun).not.toHaveBeenCalled();
    expect(mockMultiRemove).not.toHaveBeenCalled();
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
