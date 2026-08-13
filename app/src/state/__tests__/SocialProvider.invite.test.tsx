/**
 * SocialProvider — Support-Circle invite plumbing (Journey Support Circle, D2).
 *
 * Drives the REAL provider over a MOCK gateway (react-test-renderer, mirroring
 * SocialProvider.companion.test) to prove two invite-side contracts:
 *   1. `inviteAlly` with `'companion'` on a MANUAL (non-coach) Journey is refused by
 *      `assertCompanionAllowed` BEFORE any gateway write — the gateway `inviteAlly` is never
 *      called, so a user-typed Step title can never be unmasked.
 *   2. `respondToAllyInvite` refreshes the social state afterwards, so an accepted/declined
 *      invite leaves the Requested list in sync (the gateway read runs again).
 */
import { createElement, type ReactElement } from 'react';

import { SocialProvider, useSocial, type SocialContextValue } from '../SocialProvider';

// A journey the app "knows about" locally — one coach, one manual.
const COACH_JOURNEY = { id: 'coach-j', title: 'Run 5km', createdVia: 'coach', steps: [] };
const MANUAL_JOURNEY = { id: 'manual-j', title: 'My private plan', createdVia: 'manual', steps: [] };

// The AppCore facade the provider reads (only the members it touches).
const mockCore = {
  getSnapshot: () => ({ journeys: [COACH_JOURNEY, MANUAL_JOURNEY], streak: 0 }),
  journeyProgress: () => 0,
  getCompanionSteps: () => [],
  subscribe: () => () => {},
};

// A mock SocialGateway; `enabled: true` mounts the ActiveSocialProvider without any Supabase env.
const mockGateway = {
  enabled: true,
  currentProfile: jest.fn(async () => null),
  listFriends: jest.fn(async () => []),
  allyProgress: jest.fn(async () => []),
  incomingAllyInvites: jest.fn(async () => []),
  mySharedJourneyIds: jest.fn(async () => []),
  myCompanionJourneyIds: jest.fn(async () => []),
  subscribeToCheers: jest.fn(() => () => {}),
  inviteAlly: jest.fn(async () => {}),
  respondToAllyInvite: jest.fn(async () => {}),
  publishProgress: jest.fn(async () => {}),
  publishCompanionSteps: jest.fn(async () => {}),
};

// Provide getSocialGateway from the mock, but keep the REAL pure Companion helpers (the gate under
// test). Require only `companion` so the Supabase SDK chain (supabaseClient) never loads.
jest.mock('@/core/social', () => ({
  getSocialGateway: () => mockGateway,
  ...jest.requireActual('@/core/social/companion'),
}));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore }) }));
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
// The provider imports expo-notifications for the cheer toast (never fired here) — stub it so the
// Expo-Go push-usage side-effect stays quiet under jest.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => {}),
}));

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

/** Mount the provider and capture its context value for direct action calls. */
async function mountSocial(): Promise<() => SocialContextValue> {
  let ctx: SocialContextValue | undefined;
  function Capture() {
    ctx = useSocial();
    return null;
  }
  await act(async () => {
    TestRenderer.create(createElement(SocialProvider, null, createElement(Capture)));
  });
  return () => {
    if (!ctx) throw new Error('context not captured');
    return ctx;
  };
}

beforeEach(() => jest.clearAllMocks());

describe('inviteAlly — coach-only Companion gate runs before any write (D2)', () => {
  it('REFUSES Companion on a manual Journey and never touches the gateway', async () => {
    const get = await mountSocial();
    await act(async () => {
      await get().inviteAlly('manual-j', 'ally-1', 'companion');
    });
    expect(mockGateway.inviteAlly).not.toHaveBeenCalled();
    expect(mockGateway.publishProgress).not.toHaveBeenCalled();
    expect(mockGateway.publishCompanionSteps).not.toHaveBeenCalled();
    expect(get().error).toBeTruthy();
  });
});

describe('respondToAllyInvite — refresh after a decision (D2)', () => {
  it('accepts and refreshes the social state', async () => {
    const get = await mountSocial();
    // Mount ran one refresh (uid effect); count only the calls the action itself triggers.
    mockGateway.incomingAllyInvites.mockClear();
    await act(async () => {
      await get().respondToAllyInvite('coach-j', 'owner-1', true);
    });
    expect(mockGateway.respondToAllyInvite).toHaveBeenCalledWith('coach-j', 'owner-1', true);
    // refresh() re-reads the incoming invites so the Requested list stays in sync.
    expect(mockGateway.incomingAllyInvites).toHaveBeenCalledTimes(1);
    expect(get().error).toBeNull();
  });

  it('declines and refreshes the social state', async () => {
    const get = await mountSocial();
    mockGateway.incomingAllyInvites.mockClear();
    await act(async () => {
      await get().respondToAllyInvite('coach-j', 'owner-1', false);
    });
    expect(mockGateway.respondToAllyInvite).toHaveBeenCalledWith('coach-j', 'owner-1', false);
    expect(mockGateway.incomingAllyInvites).toHaveBeenCalledTimes(1);
  });
});
