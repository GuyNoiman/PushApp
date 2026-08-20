/**
 * SocialProvider — Allies see ACTIVE Journeys only (Friend_Profile_PRD.md §4.3).
 *
 * Drives the REAL provider over a MOCK gateway (react-test-renderer, mirroring
 * SocialProvider.companion.test) to pin the publish lifecycle: a shared Journey that is frozen,
 * completed, abandoned — or gone from this device — must stop being served to its Allies, and a
 * resumed Journey must come back on its own with the SAME Support Circle. Before this, every
 * shared Journey was republished forever regardless of its state, so a friend's completed Journey
 * kept showing on Home and in the Circle.
 */
import { createElement, type ReactElement } from 'react';

import { SocialProvider } from '../SocialProvider';

// The Journeys this device knows about; mutated per test to move one through its lifecycle.
let mockJourneys: { id: string; title: string; createdVia: string; status?: string; steps: unknown[] }[] = [];

// The debounced publish is driven by the core's change notification; capture it on mount.
let notifyCore: () => void = () => {};

const mockCore = {
  getSnapshot: () => ({ journeys: mockJourneys, streak: 4 }),
  journeyProgress: () => 0.5,
  getCompanionSteps: () => [{ stepId: 's1', title: 'Lace up', status: 'completed', reportedAt: null }],
  subscribe: (fn: () => void) => {
    notifyCore = fn;
    return () => {};
  },
};

const mockGateway = {
  enabled: true,
  currentProfile: jest.fn(async () => null),
  listFriends: jest.fn(async () => []),
  allyProgress: jest.fn(async () => []),
  incomingAllyInvites: jest.fn(async () => []),
  listAllAllies: jest.fn(async () => []),
  mySharedJourneyIds: jest.fn(async () => ['j-active', 'j-frozen', 'j-done', 'j-gone']),
  myCompanionJourneyIds: jest.fn(async () => ['j-active']),
  subscribeToCheers: jest.fn(() => () => {}),
  publishProgress: jest.fn(async () => {}),
  withdrawProgress: jest.fn(async (_journeyId: string) => {}),
  publishCompanionSteps: jest.fn(async () => {}),
  closeJourneyInvites: jest.fn(async () => {}),
};

jest.mock('@/core/social', () => ({
  getSocialGateway: () => mockGateway,
  ...jest.requireActual('@/core/social/companion'),
}));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore }) }));
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
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

/** Mount the provider, then let one debounced publish cycle run to completion. */
async function mountAndPublish(): Promise<void> {
  await act(async () => {
    TestRenderer.create(createElement(SocialProvider, null, null));
  });
  await publish();
}

/** Fire a core change and run out the ~1s publish debounce (fake timers keep the suite fast). */
async function publish(): Promise<void> {
  await act(async () => {
    notifyCore();
    jest.advanceTimersByTime(1100);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockJourneys = [
    { id: 'j-active', title: 'Run 5km', createdVia: 'coach', status: 'active', steps: [] },
    { id: 'j-frozen', title: 'Read nightly', createdVia: 'coach', status: 'frozen', steps: [] },
    { id: 'j-done', title: 'Learn to swim', createdVia: 'coach', status: 'completed', steps: [] },
    // 'j-gone' is shared server-side but no longer exists locally.
  ];
});

afterEach(() => jest.useRealTimers());

describe('publishAll — only an Active Journey is served to its Allies', () => {
  it('publishes the Active Journey and withdraws every other shared Journey', async () => {
    await mountAndPublish();
    expect(mockGateway.publishProgress).toHaveBeenCalledTimes(1);
    expect(mockGateway.publishProgress).toHaveBeenCalledWith(
      expect.objectContaining({ journeyId: 'j-active', title: 'Run 5km', progress: 0.5, streak: 4 }),
    );
    const withdrawn = mockGateway.withdrawProgress.mock.calls.map((c) => c[0]);
    expect(withdrawn).toEqual(expect.arrayContaining(['j-frozen', 'j-done', 'j-gone']));
    expect(withdrawn).not.toContain('j-active');
  });

  it('also stops serving the Step names of a withdrawn Journey', async () => {
    await mountAndPublish();
    expect(mockGateway.publishCompanionSteps).toHaveBeenCalledWith('j-frozen', []);
    expect(mockGateway.publishCompanionSteps).toHaveBeenCalledWith('j-done', []);
    expect(mockGateway.publishCompanionSteps).toHaveBeenCalledWith('j-gone', []);
    // The Active coach Journey still publishes its real Step progress.
    expect(mockGateway.publishCompanionSteps).toHaveBeenCalledWith('j-active', [
      { stepId: 's1', title: 'Lace up', status: 'completed', reportedAt: null },
    ]);
  });

  it('NEVER closes the Support Circle — withdrawing must stay reversible', async () => {
    await mountAndPublish();
    expect(mockGateway.closeJourneyInvites).not.toHaveBeenCalled();
  });

  it('brings a resumed Journey back by itself, with no re-invitation', async () => {
    await mountAndPublish();
    expect(mockGateway.withdrawProgress).toHaveBeenCalledWith('j-frozen');

    mockGateway.publishProgress.mockClear();
    mockGateway.withdrawProgress.mockClear();
    mockJourneys = mockJourneys.map((j) => (j.id === 'j-frozen' ? { ...j, status: 'active' } : j));
    await publish();

    expect(mockGateway.publishProgress).toHaveBeenCalledWith(
      expect.objectContaining({ journeyId: 'j-frozen', title: 'Read nightly' }),
    );
    expect(mockGateway.withdrawProgress).not.toHaveBeenCalledWith('j-frozen');
    expect(mockGateway.closeJourneyInvites).not.toHaveBeenCalled();
  });

  it('keeps any non-Active status private, including one this test did not anticipate', async () => {
    // The gate is an allowlist of "running", so a lifecycle state added later (a Journey saved for
    // later, say) is withheld by default rather than silently broadcast to Allies.
    mockJourneys = [{ id: 'j-active', title: 'Run 5km', createdVia: 'coach', status: 'future', steps: [] }];
    await mountAndPublish();
    expect(mockGateway.publishProgress).not.toHaveBeenCalled();
    expect(mockGateway.withdrawProgress).toHaveBeenCalledWith('j-active');
  });

  it('treats a legacy Journey with no explicit status as Active', async () => {
    mockJourneys = [{ id: 'j-active', title: 'Run 5km', createdVia: 'manual', steps: [] }];
    await mountAndPublish();
    expect(mockGateway.publishProgress).toHaveBeenCalledWith(expect.objectContaining({ journeyId: 'j-active' }));
    expect(mockGateway.withdrawProgress).not.toHaveBeenCalledWith('j-active');
  });
});
