/**
 * The first run's conversation is an INTRODUCTION, and what happens when it ends (D105).
 *
 * The conversation used to end by BUILDING a Journey, and the screen's "Build my Journey" CTA was
 * the door into the rest of the first run. The introduction chooses nothing and builds nothing, so
 * that door had to be replaced rather than reused — this pins the replacement:
 *
 *   · no Build CTA and no Journey card, because there is no `goalSpec` and there must not be one;
 *   · a Continue CTA that completes onboarding with the INTRO Journey and enters the existing tail
 *     (reminders → handoff → first Journey). It is a tap, not an effect: advancing the moment the
 *     coach stops talking would replace its closing line before anybody read it;
 *   · the NAME the conversation captured lands on the profile, which is what makes the handoff
 *     screen's "It's good to know you, ⟨name⟩" true for the first time since the personal-details
 *     page left the flow on 2026-09-03.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

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

beforeEach(() => {
  mockSetDisplayName.mockClear();
  mockProfileState.current = { displayName: null };
});

describe('when the introduction ends, nothing is built', () => {
  it('offers Continue rather than Build, and completes onboarding with the intro Journey', async () => {
    const core = setApp();
    mockCoachView.current = baseCoach({ introductionComplete: true });

    const r = await render();

    // No Build CTA: there is no GoalSpec, and that is the decision rather than a gap.
    expect(byLabel(r, 'build')).toHaveLength(0);
    expect(byLabel(r, 'continue').length).toBeGreaterThan(0);
    expect(core.completeOnboarding).not.toHaveBeenCalled();

    await tap(r, 'continue');

    expect(core.createJourneyFromGoalSpec).not.toHaveBeenCalled();
    expect(core.completeOnboarding).toHaveBeenCalledTimes(1);
    // The intro Journey rides along with completion, exactly as it did on the build path.
    expect(core.completeOnboarding.mock.calls[0][1]).toBeDefined();
    // And the first run continues into its existing tail, starting with the reminder ask.
    expect(json(r)).toContain('notifications.title');
  });

  it('shows nothing extra while the introduction is still running', async () => {
    setApp();
    mockCoachView.current = baseCoach();

    const r = await render();

    expect(byLabel(r, 'continue')).toHaveLength(0);
    expect(byLabel(r, 'build')).toHaveLength(0);
  });
});

/**
 * THE PORTRAIT (דיוקן) is what the first run actually produces, and this is the one line that lands
 * it. It goes into `AppState`, which is what puts it in the data export and takes it out with an
 * account deletion without either path knowing it exists.
 */
describe('the Portrait the conversation built', () => {
  it('is written to AppState as the conversation goes, not only at the end', async () => {
    const core = setApp();
    const portrait = {
      primaryWant: {
        value: 'leave marketing',
        confidence: 'high' as const,
        source: 'stated' as const,
        updatedAt: 1,
      },
    };
    mockCoachView.current = baseCoach({ portrait, introductionComplete: false });

    await render();

    expect(core.setPortrait).toHaveBeenCalledWith(portrait);
  });

  it('writes nothing at all in the Coach tab, where there is no Portrait', async () => {
    const core = setApp();
    mockCoachView.current = baseCoach({ portrait: null });

    await render();

    expect(core.setPortrait).not.toHaveBeenCalled();
  });
});

describe('the name the conversation captured', () => {
  it('is written to the profile, with no form field anywhere', async () => {
    setApp();
    mockCoachView.current = baseCoach({ personalName: 'Guy' });

    await render();

    expect(mockSetDisplayName).toHaveBeenCalledWith('Guy');
  });

  it('never overwrites a name the person already set', async () => {
    setApp();
    mockProfileState.current = { displayName: 'Guy N.' };
    mockCoachView.current = baseCoach({ personalName: 'Guy' });

    await render();

    expect(mockSetDisplayName).not.toHaveBeenCalled();
  });
});
