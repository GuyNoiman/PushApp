/**
 * SocialProvider — Companion coach-only enforcement (security-privacy #3, D2).
 *
 * Drives the real provider over a MOCK gateway (via react-test-renderer, mirroring
 * useLiveCoach.test) to prove the SECOND layer behind the coach-only Companion rule: a
 * `companion` invite/bundle-switch on a manual (non-coach) Journey is REFUSED before any
 * write — the gateway is never asked to set `visibility='full'`, so a user-typed Step
 * title can never be unmasked, even from a client that ignores the disabled UI button.
 * A coach Journey still goes through.
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
  listAllAllies: jest.fn(async () => []),
  mySharedJourneyIds: jest.fn(async () => []),
  myCompanionJourneyIds: jest.fn(async () => []),
  subscribeToCheers: jest.fn(() => () => {}),
  inviteAlly: jest.fn(async () => {}),
  changeAllyBundle: jest.fn(async () => {}),
  publishProgress: jest.fn(async () => {}),
  publishCompanionSteps: jest.fn(async () => {}),
};

// Provide getSocialGateway from the mock, but keep the REAL pure Companion helpers (the #3 gate
// under test). Require only `companion` so the Supabase SDK chain (supabaseClient) never loads.
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

describe('inviteAlly — coach-only Companion (security #3)', () => {
  it('REFUSES Companion on a manual Journey and never writes to the gateway', async () => {
    const get = await mountSocial();
    await act(async () => {
      await get().inviteAlly('manual-j', 'ally-1', 'companion');
    });
    expect(mockGateway.inviteAlly).not.toHaveBeenCalled();
    expect(mockGateway.publishCompanionSteps).not.toHaveBeenCalled();
    expect(get().error).toBeTruthy();
  });

  it('allows Encourager on a manual Journey', async () => {
    const get = await mountSocial();
    await act(async () => {
      await get().inviteAlly('manual-j', 'ally-1', 'encourager');
    });
    expect(mockGateway.inviteAlly).toHaveBeenCalledWith('manual-j', 'ally-1', 'encourager');
    expect(get().error).toBeNull();
  });

  it('allows Companion on a coach Journey', async () => {
    const get = await mountSocial();
    await act(async () => {
      await get().inviteAlly('coach-j', 'ally-1', 'companion');
    });
    expect(mockGateway.inviteAlly).toHaveBeenCalledWith('coach-j', 'ally-1', 'companion');
    expect(mockGateway.publishCompanionSteps).toHaveBeenCalledWith('coach-j', []);
  });
});

describe('changeAllyBundle — coach-only Companion (security #3)', () => {
  it('REFUSES switching a manual Journey to Companion and never writes to the gateway', async () => {
    const get = await mountSocial();
    await act(async () => {
      await get().changeAllyBundle('manual-j', 'ally-1', 'companion');
    });
    expect(mockGateway.changeAllyBundle).not.toHaveBeenCalled();
    expect(get().error).toBeTruthy();
  });

  it('allows switching a coach Journey to Companion', async () => {
    const get = await mountSocial();
    await act(async () => {
      await get().changeAllyBundle('coach-j', 'ally-1', 'companion');
    });
    expect(mockGateway.changeAllyBundle).toHaveBeenCalledWith('coach-j', 'ally-1', 'companion');
  });
});
