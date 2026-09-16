/**
 * Home — a Step that NAMES a screen opens it instead of asking how it went.
 *
 * This behaviour shipped with the "Getting to know PushApp" Journey and lived only inside Home's
 * `openStep`; it now comes from the shared `useStepLink`, which is what let the Journey detail
 * screen have it too. So Home gets the test it never had: what was already true here must stay
 * exactly true after the extraction.
 *
 * The day's Step rows and the report sheet are stubbed to plain host elements — this is about which
 * of the two a tap reaches, not about how either of them looks. Everything else is the real screen.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useFocusEffect: () => {},
  // TabScrollView reads this to answer a second tap on the active tab; outside a navigator there
  // is simply no navigation object, which the hook already handles.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NavigationContext: require('react').createContext(null),
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
  }),
}));
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
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/useServerConnection', () => ({ useServerConnection: () => ({ online: true }) }));
jest.mock('@/hooks/useNotificationActivity', () => ({ useNotificationActivity: () => 0 }));
// The update banner asks the network whether this build is current — a question this test has no
// business making, and one that outlives the test if it is left to resolve.
jest.mock('@/hooks/use-update-standing', () => ({
  useUpdateStanding: () => ({ state: 'unknown', reason: 'no-manifest' }),
  resetUpdateStanding: () => {},
}));
jest.mock('@/state/ProfileProvider', () => ({ useProfile: () => ({ profile: {} }) }));
jest.mock('@/state/CelebrationPreference', () => ({
  useCelebrationPreference: () => ({ celebrationsEnabled: false }),
}));
jest.mock('@/state/SocialProvider', () => ({
  useSocial: () => ({
    enabled: false,
    allyProgress: [],
    friends: [],
    sendCheer: jest.fn(async () => {}),
  }),
}));
// The two ends of the tap: the row that receives it, and the sheet it must NOT open.
jest.mock('@/components/home/StepRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    StepRow: (props: Record<string, unknown>) => React.createElement('step-row', props),
  };
});
jest.mock('@/components/home/StepReportFlow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    StepReportFlow: (props: Record<string, unknown>) =>
      React.createElement('step-report-flow', props),
  };
});

import { createElement, type ReactElement } from 'react';

import HomeScreen from '../index';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import type { Journey, Step } from '@/core/types/domain';

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

// react-test-renderer ships no types; type just the surface used here.
interface TestInstance {
  findAllByType(type: string): { props: Record<string, any> }[];
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): unknown;
  unmount(): void;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const NOW = Date.now();

function step(id: string, title: string, over: Partial<Step> = {}): Step {
  return {
    id,
    title,
    isStarterStep: false,
    cadence: 'once',
    done: false,
    plannedFor: NOW,
    ...over,
  };
}

const journey: Journey = {
  id: 'j1',
  title: 'Getting to know PushApp',
  why: [],
  durationDays: 14,
  rhythm: 'few-times-week',
  steps: [
    step('s1', 'Tell us who you are', { appLink: '/settings/profile' }),
    step('s2', 'Look around the Tools'),
  ],
  createdAt: NOW,
};

function todayStep(s: Step): TodayStep {
  return {
    journeyId: journey.id,
    journeyTitle: journey.title,
    step: s,
    status: 'unreported',
    locked: false,
  };
}

/** Home over a stub core whose week holds both Steps on today. */
function setApp() {
  const core = {
    weekByDay: () => ({
      days: [
        {
          dayStart: NOW,
          weekday: new Date(NOW).getDay(),
          isToday: true,
          isPast: false,
          mark: 'open',
          steps: journey.steps.map((s) => ({ item: todayStep(s) })),
        },
      ],
      todayIndex: 0,
    }),
    weekSummary: () => ({ done: 0, total: 2, progress: 0 }),
    pullForward: () => [],
    streakRole: () => undefined,
    journeyProgress: () => 0,
    getPendingWeeklyReview: () => null,
    pendingJourneyFeedback: () => null,
    getPendingCompletionCeremony: () => null,
    getInactivityReturn: () => null,
    weeklyReviewNeedsAutoOpen: () => false,
    completionCeremonyNeedsAutoOpen: () => false,
    inactivityReturnNeedsAutoOpen: () => false,
    willCompleteJourney: () => false,
    checkInStep: jest.fn(),
    submitJourneyFeedback: jest.fn(),
    reviewWeek: jest.fn(),
    getMotivationCard: () => null,
  };
  mockApp.current = {
    core,
    ready: true,
    snapshot: {
      journeys: [journey],
      dreams: [],
      streak: 0,
      buddy: { level: 1, xpIntoLevel: 0, xpForNextLevel: 100 },
    },
  };
  return core;
}

/** Every render is torn down after the test — Home subscribes to AppState, and a screen left
 *  mounted keeps the worker alive after the suite is over. */
let mounted: TestRoot | undefined;

async function render(): Promise<TestRoot> {
  await act(async () => {
    mounted = TestRenderer.create(createElement(HomeScreen));
  });
  if (!mounted) throw new Error('render failed');
  return mounted;
}

afterEach(async () => {
  const r = mounted;
  mounted = undefined;
  if (r) await act(async () => r.unmount());
});

/** Tap the day's Step row with this title. */
async function tap(r: TestRoot, title: string) {
  const row = r.root.findAllByType('step-row').find((n) => n.props.title === title);
  if (!row) throw new Error(`no Step row titled "${title}"`);
  await act(async () => {
    row.props.onPress();
  });
}

/** The Step the report sheet is currently open on (null when it is closed). */
const openReport = (r: TestRoot) => r.root.findAllByType('step-report-flow')[0]?.props.step ?? null;

beforeEach(() => mockPush.mockReset());

describe('Home — a Step that names a screen still opens it (unchanged by the shared rule)', () => {
  it('goes to the screen and does NOT ask how it went', async () => {
    setApp();
    const r = await render();

    await tap(r, 'Tell us who you are');

    expect(mockPush).toHaveBeenCalledWith('/settings/profile');
    expect(openReport(r)).toBeNull();
  });

  it('still opens the report sheet for an ordinary Step, and goes nowhere', async () => {
    setApp();
    const r = await render();

    await tap(r, 'Look around the Tools');

    expect(mockPush).not.toHaveBeenCalled();
    expect(openReport(r)?.step?.id).toBe('s2');
  });
});

/**
 * Gap Register B2: a linked Step's tap belongs to its screen and the swipe cannot be seen on a device,
 * so the report sheet needs a visible way in. The row's ⋯ is that way — for linked Steps only, so an
 * ordinary row (whose tap already asks how it went) is exactly what it was.
 */
describe('Home — the ⋯ reaches the report sheet on a linked Step', () => {
  it('hands a linked row an ⋯ that opens the report sheet, and goes nowhere', async () => {
    setApp();
    const r = await render();

    const row = r.root.findAllByType('step-row').find((n) => n.props.title === 'Tell us who you are')!;
    expect(typeof row.props.onMore).toBe('function');
    await act(async () => {
      row.props.onMore();
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(openReport(r)?.step?.id).toBe('s1');
  });

  it('gives an ordinary row no separate ⋯ button', async () => {
    setApp();
    const r = await render();

    const row = r.root.findAllByType('step-row').find((n) => n.props.title === 'Look around the Tools')!;
    expect(row.props.onMore).toBeUndefined();
  });
});
