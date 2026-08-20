/**
 * SocialProvider — the friend-profile wrappers and their memory-only cache
 * (Friend_Profile_PRD.md §6/§7).
 *
 * Drives the REAL provider over a MOCK gateway (react-test-renderer, mirroring
 * SocialProvider.companion.test). The point of these tests is the PRIVACY contract, not the
 * plumbing: a friend profile may be reused only for a short authorization lease, it is dropped on
 * foreground / sign-out / remove, a failed refresh never falls back to stale data, and a failure is
 * always distinguishable from an empty profile.
 */
import { createElement, type ReactElement } from 'react';
import { AppState } from 'react-native';

import { NotFriendsError, type FriendProfileView } from '@/core/social/SocialGateway';

import { SocialProvider, useSocial, type SocialContextValue } from '../SocialProvider';

const mockCore = {
  getSnapshot: () => ({ journeys: [], streak: 0 }),
  journeyProgress: () => 0,
  getCompanionSteps: () => [],
  subscribe: () => () => {},
};

/** The signed-in uid the mocked AuthProvider reports; flipped to null to simulate sign-out. */
let mockUid: string | null = 'me';

function viewFor(friendId: string): FriendProfileView {
  return {
    profile: { id: friendId, handle: 'sam', buddySummary: { name: 'Pip' } },
    relationship: { theySupportMe: 1, iSupportThem: 0, total: 1, lifecycle: null },
    sharedActive: [],
    fetchedAt: Date.now(),
  };
}

const mockGateway = {
  enabled: true,
  currentProfile: jest.fn(async () => null),
  listFriends: jest.fn(async () => []),
  allyProgress: jest.fn(async () => []),
  incomingAllyInvites: jest.fn(async () => []),
  listAllAllies: jest.fn(async () => []),
  mySharedJourneyIds: jest.fn(async () => []),
  myCompanionJourneyIds: jest.fn(async () => []),
  subscribeToCheers: jest.fn(() => () => {}),
  friendProfile: jest.fn(async (friendId: string) => viewFor(friendId)),
  unfriendImpact: jest.fn(async () => ({
    journeysTheySupportForMe: 2,
    journeysISupportForThem: 1,
    pendingInvites: 0,
  })),
  removeFriend: jest.fn(async () => {}),
  removeAlly: jest.fn(async () => {}),
};

jest.mock('@/core/social', () => ({
  getSocialGateway: () => mockGateway,
  ...jest.requireActual('@/core/social/companion'),
}));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore }) }));
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => ({ user: mockUid ? { id: mockUid } : null }) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => {}),
}));

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void; update(element: ReactElement): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

/** Mount the provider and capture its context value, plus a re-render hook for uid changes. */
async function mountSocial(): Promise<{ get: () => SocialContextValue; rerender: () => Promise<void> }> {
  let ctx: SocialContextValue | undefined;
  function Capture() {
    ctx = useSocial();
    return null;
  }
  // A FRESH element every render: React bails out of re-rendering an identical element reference,
  // which would swallow the uid change this helper exists to trigger.
  const tree = () => createElement(SocialProvider, null, createElement(Capture));
  let renderer: { unmount(): void; update(element: ReactElement): void } | undefined;
  await act(async () => {
    renderer = TestRenderer.create(tree());
  });
  return {
    get: () => {
      if (!ctx) throw new Error('context not captured');
      return ctx;
    },
    rerender: async () => {
      await act(async () => {
        renderer?.update(tree());
      });
    },
  };
}

/** The AppState 'change' handler the provider registered, so foreground can be simulated. */
let appStateHandler: ((status: string) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  mockUid = 'me';
  appStateHandler = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: (s: string) => void) => {
    appStateHandler = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => jest.restoreAllMocks());

describe('loadFriendProfile — the authorization lease', () => {
  it('serves a second read within the lease from memory, without re-asking the backend', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
      await get().loadFriendProfile('friend-1');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the lease has lapsed', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    // 61s later the lease is gone and the friendship must be proven again.
    const later = Date.now() + 61_000;
    jest.spyOn(Date, 'now').mockReturnValue(later);
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(2);
  });

  it('re-fetches on demand with { force: true }', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
      await get().loadFriendProfile('friend-1', { force: true });
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(2);
  });

  it('caches per friend — one profile never answers for another', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
      const other = await get().loadFriendProfile('friend-2');
      expect(other.profile.id).toBe('friend-2');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(2);
  });
});

describe('loadFriendProfile — failures stay distinguishable from an empty profile', () => {
  it('sets the error AND rejects when the gateway fails', async () => {
    const { get } = await mountSocial();
    mockGateway.friendProfile.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(get().loadFriendProfile('friend-1')).rejects.toThrow('offline');
    });
    expect(get().error).toBe('offline');
  });

  it('never falls back to a stale profile when the refresh fails', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    mockGateway.friendProfile.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(get().loadFriendProfile('friend-1', { force: true })).rejects.toThrow('offline');
    });
    // The lapsed entry was dropped before the refetch, so the next read goes to the backend too.
    mockGateway.friendProfile.mockClear();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(1);
  });

  it('does not raise the shared error banner for "not connected" — that is a screen state', async () => {
    const { get } = await mountSocial();
    mockGateway.friendProfile.mockRejectedValueOnce(new NotFriendsError());
    await act(async () => {
      await expect(get().loadFriendProfile('friend-1')).rejects.toBeInstanceOf(NotFriendsError);
    });
    expect(get().error).toBeNull();
  });
});

describe('cache invalidation', () => {
  it('drops every profile when the app returns to the foreground (PRD §6)', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    await act(async () => {
      appStateHandler?.('active');
    });
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(2);
  });

  it('drops every profile on sign-out', async () => {
    const { get, rerender } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    mockUid = null;
    await rerender();
    mockUid = 'me';
    await rerender();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(2);
  });
});

describe('loadUnfriendImpact', () => {
  it('reads fresh counts every time — they sit in front of an irreversible action', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      const impact = await get().loadUnfriendImpact('friend-1');
      expect(impact).toEqual({ journeysTheySupportForMe: 2, journeysISupportForThem: 1, pendingInvites: 0 });
      await get().loadUnfriendImpact('friend-1');
    });
    expect(mockGateway.unfriendImpact).toHaveBeenCalledTimes(2);
  });

  it('sets the error AND rejects on failure, so no invented 0 can be confirmed against', async () => {
    const { get } = await mountSocial();
    mockGateway.unfriendImpact.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(get().loadUnfriendImpact('friend-1')).rejects.toThrow('offline');
    });
    expect(get().error).toBe('offline');
  });
});

describe('removeFriend', () => {
  it('purges the cached profile and refreshes the Support Circle', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    mockGateway.listFriends.mockClear();
    await act(async () => {
      await get().removeFriend('friend-1');
    });
    expect(mockGateway.removeFriend).toHaveBeenCalledWith('friend-1');
    expect(mockGateway.listFriends).toHaveBeenCalledTimes(1);
    mockGateway.friendProfile.mockClear();
    await act(async () => {
      await get().loadFriendProfile('friend-1');
    });
    expect(mockGateway.friendProfile).toHaveBeenCalledTimes(1);
  });

  it('rejects when the server refused, and leaves the local state alone', async () => {
    const { get } = await mountSocial();
    mockGateway.removeFriend.mockRejectedValueOnce(new Error('denied'));
    mockGateway.listFriends.mockClear();
    await act(async () => {
      await expect(get().removeFriend('friend-1')).rejects.toThrow('denied');
    });
    expect(get().error).toBe('denied');
    expect(mockGateway.listFriends).not.toHaveBeenCalled();
  });

  it('removing one Ally never removes the friendship (PRD §4.5)', async () => {
    const { get } = await mountSocial();
    await act(async () => {
      await get().removeAlly('j1', 'friend-1');
    });
    expect(mockGateway.removeAlly).toHaveBeenCalledWith('j1', 'friend-1');
    expect(mockGateway.removeFriend).not.toHaveBeenCalled();
  });
});
