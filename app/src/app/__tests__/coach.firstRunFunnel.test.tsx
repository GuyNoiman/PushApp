/**
 * The first run's conversation, COUNTED (founder, 2026-09-16).
 *
 * Four numbers come from this screen: that the conversation was reached, that the person STARTED it
 * (their first answer — opening the screen is not starting), that they COMPLETED it (the confirmed
 * understanding check, which is the only thing that sets `introductionComplete`), and the two tail
 * steps the real path shows from here rather than from `/onboarding`. Recorded through the real once
 * guard, so "exactly once" is tested as a phone would enforce it.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import { appKpi } from '@/core/kpi/appKpi';
import { withOnceGuard, type KpiInput } from '@/core/kpi/KpiGateway';
import CoachScreen from '../coach';

jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  // THE FIRST RUN. The welcome routes here with `firstRun=1`, which is what selects the
  // introduction over the planning conversation.
  useLocalSearchParams: () => ({ firstRun: '1' }),
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
// The first Journey page reads its Steps as an array; the key-echo `t` above cannot produce one.
jest.mock('@/components/onboarding/introJourneyContent', () => ({
  introJourneyContent: () => ({ title: 'introJourney.title', why: [], steps: [] }),
}));
jest.mock('@/core/config/featureFlags', () => ({ featureFlags: { liveCoach: true } }));

/** The live coach's view-model, stubbed at the moment the introduction has landed. */
const mockCoachView: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/components/coach/useLiveCoach', () => ({
  useLiveCoach: () => mockCoachView.current,
}));

const mockSetDisplayName = jest.fn();
const mockProfileState: { current: { displayName: string | null } } = { current: { displayName: null } };
jest.mock('@/state/ProfileProvider', () => ({
  useProfile: () => ({ profile: mockProfileState.current, setDisplayName: mockSetDisplayName }),
}));

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): unknown;
  update(element: ReactElement): void;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
const byLabel = (r: TestRoot, label: string) => r.root.findAllByProps({ accessibilityLabel: label });

function baseCoach(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ kind: 'coach', text: 'It was good to meet you.' }],
    question: null,
    status: 'idle',
    goalSpec: null,
    handoff: false,
    awaitingOpening: false,
    technicalMode: false,
    introductionComplete: false,
    personalName: null,
    portrait: null,
    budgetZone: 'open',
    canAskOpenQuestion: true,
    sendOpening: jest.fn(),
    selectSingle: jest.fn(),
    selectMulti: jest.fn(),
    answerOther: jest.fn(),
    retryOpening: jest.fn(),
    journeyCreated: jest.fn(),
    ...overrides,
  };
}

function setApp() {
  const core = {
    createJourneyFromGoalSpec: jest.fn(),
    getOnboardingCoachSummary: jest.fn(() => null),
    getOnboardingAnswers: jest.fn(() => ({ focus: 'general' })),
    completeOnboarding: jest.fn(),
    initReminders: jest.fn(async () => undefined),
    getLastJourneyBuildTrace: jest.fn(() => []),
    setPortrait: jest.fn(),
  };
  mockApp.current = { core, snapshot: { journeys: [], dreams: [], futureCapacity: {} } };
  return core;
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(CoachScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

async function tap(r: TestRoot, label: string) {
  await act(async () => {
    byLabel(r, label)[0].props.onPress();
  });
}


const sent: KpiInput[] = [];
const remembered = new Set<string>();
appKpi.attach(
  withOnceGuard(
    { enabled: true, record: (input) => void sent.push(input) },
    { has: (k) => remembered.has(k), remember: (k) => void remembered.add(k) },
  ),
);

const names = () => sent.map((e) => (e.bucket ? `${e.name}.${e.bucket}` : e.name));

beforeEach(() => {
  sent.length = 0;
  remembered.clear();
});

describe('the first-run conversation, counted', () => {
  it('counts the conversation as reached on arrival, and not as started until the person answers', async () => {
    setApp();
    mockCoachView.current = baseCoach();

    const r = await render();
    expect(names()).toEqual(['onboarding_step_reached.conversation']);

    // The person answers, and keeps talking. Started once.
    mockCoachView.current = baseCoach({
      items: [
        { kind: 'coach', text: 'What should I call you?' },
        { kind: 'user', text: 'Guy' },
      ],
    });
    await act(async () => r.update(createElement(CoachScreen)));
    mockCoachView.current = baseCoach({
      items: [
        { kind: 'coach', text: 'What should I call you?' },
        { kind: 'user', text: 'Guy' },
        { kind: 'coach', text: 'What brings you here?' },
        { kind: 'user', text: 'Work' },
      ],
    });
    await act(async () => r.update(createElement(CoachScreen)));

    expect(names()).toEqual(['onboarding_step_reached.conversation', 'introduction_started']);
    // What they typed is not in the stream.
    expect(JSON.stringify(sent)).not.toContain('Guy');
  });

  it('counts completion when the understanding is confirmed, then the handoff', async () => {
    setApp();
    mockCoachView.current = baseCoach({
      items: [{ kind: 'user', text: 'Guy' }],
      introductionComplete: true,
    });

    const r = await render();
    // Order within one render is React's (a child's effects run before its parent's) and means
    // nothing to a count; what matters is that each is there exactly once.
    expect([...names()].sort()).toEqual([
      'introduction_completed',
      'introduction_started',
      'onboarding_step_reached.conversation',
    ]);

    await tap(r, 'continue');
    await tap(r, 'notifications.secondary');

    // The handoff is the last step of the funnel since screen 07 was dropped (founder, 2026-09-18),
    // and its button goes to Home rather than to one more page of onboarding.
    expect(names().slice(3)).toEqual(['onboarding_step_reached.handoff']);
    expect(names()).toHaveLength(4);

    await tap(r, 'flow.handoff.primary');
    expect(names()).toHaveLength(4);
  });

  it('counts no completion while the introduction is still running', async () => {
    setApp();
    mockCoachView.current = baseCoach();
    await render();
    expect(names()).not.toContain('introduction_completed');
  });
});
