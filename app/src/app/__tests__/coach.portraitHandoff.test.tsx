/**
 * Coach screen: the second conversation continues from the Portrait, once (Planning_From_Portrait_Plan,
 * Stage 1).
 *
 * The screen owns the door to the core, so it is the one that hands the Portrait to a planning
 * conversation and the one that spends the handoff when a Journey is really built from it. This
 * renders the REAL screen over a stubbed live coach and core to pin both:
 *
 *  · planning is handed `core.getPortraitForPlanning()`;
 *  · a build from a RESUMED conversation marks the handoff used, so the next one opens as today;
 *  · a build from an ordinary conversation, or a build the cap declined, marks nothing.
 */
// `makeCoachLlm` reaches the shared Supabase client, which pulls in AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import CoachScreen from '../coach';
import type { GoalSpec } from '@/core/coach/interviewPlaybook';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/i18n/useAddressedTranslation', () => ({
  useAddressedTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
  }),
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
// The handoff belongs to the LIVE path (the one that actually builds a Journey).
jest.mock('@/core/config/featureFlags', () => ({ featureFlags: { liveCoach: true } }));

const goalSpec = { title: 'Find work that fits', domain: 'career' } as unknown as GoalSpec;
const mockHookOptions: { current: Record<string, unknown> | undefined } = { current: undefined };
const mockResumed: { current: boolean } = { current: false };
jest.mock('@/components/coach/useLiveCoach', () => ({
  useLiveCoach: (options: Record<string, unknown>) => {
    mockHookOptions.current = options;
    return {
      items: [],
      question: undefined,
      status: 'idle',
      goalSpec,
      handoff: false,
      awaitingOpening: false,
      sendOpening: jest.fn(),
      selectSingle: jest.fn(),
      selectMulti: jest.fn(),
      answerOther: jest.fn(),
      journeyCreated: jest.fn(),
      introductionComplete: false,
      personalName: null,
      portrait: null,
      resumed: mockResumed.current,
    };
  },
}));

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const REMEMBERED = { primaryWant: { value: 'leave marketing', confidence: 'high', source: 'stated', updatedAt: 1 } };

function setApp({ builds = true } = {}) {
  const core = {
    createJourneyFromGoalSpec: jest.fn(() => (builds ? { id: 'j1', title: 'Find work that fits' } : null)),
    getOnboardingCoachSummary: jest.fn(() => null),
    getPortraitForPlanning: jest.fn(() => REMEMBERED),
    markPortraitHandoffUsed: jest.fn(),
  };
  mockApp.current = { core, snapshot: { journeys: [], dreams: [], futureCapacity: { capReached: false } } };
  return core;
}

async function renderAndBuild() {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(CoachScreen));
  });
  await act(async () => {
    r!.root.findAllByProps({ accessibilityLabel: 'build' })[0].props.onPress();
  });
}

beforeEach(() => {
  mockResumed.current = false;
  mockHookOptions.current = undefined;
});

describe('Coach — continuing from the Portrait', () => {
  it('hands the planning conversation what the first conversation understood', async () => {
    const core = setApp();
    await act(async () => {
      TestRenderer.create(createElement(CoachScreen));
    });

    expect(core.getPortraitForPlanning).toHaveBeenCalled();
    expect(mockHookOptions.current).toMatchObject({ mode: 'planning', portrait: REMEMBERED });
  });

  it('spends the handoff when a Journey is built from a resumed conversation', async () => {
    mockResumed.current = true;
    const core = setApp();

    await renderAndBuild();

    expect(core.createJourneyFromGoalSpec).toHaveBeenCalled();
    expect(core.markPortraitHandoffUsed).toHaveBeenCalledTimes(1);
    expect(typeof core.markPortraitHandoffUsed.mock.calls[0][0]).toBe('number');
  });

  it('marks nothing for an ordinary conversation', async () => {
    const core = setApp();

    await renderAndBuild();

    expect(core.createJourneyFromGoalSpec).toHaveBeenCalled();
    expect(core.markPortraitHandoffUsed).not.toHaveBeenCalled();
  });

  it('marks nothing when no Journey was actually created', async () => {
    mockResumed.current = true;
    const core = setApp({ builds: false });

    await renderAndBuild();

    expect(core.markPortraitHandoffUsed).not.toHaveBeenCalled();
  });
});
