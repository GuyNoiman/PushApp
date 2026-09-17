/**
 * THE INTRODUCTION'S HEADER IS NOT "NEW PLAN" (partner's device test, 2026-09-17).
 *
 * The first-run conversation chooses and builds nothing (D105), and its header said "תוכנית חדשה"
 * ("New plan") anyway. Approved build spec §5 gives it "המאמן שלך / שיחת היכרות" · "Your coach /
 * Introduction". The Coach tab is a plan being made, and keeps its title.
 *
 * The translation hook is the REAL catalogue here, in the language each test picks, so what is
 * asserted is the copy a person reads rather than a key.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import CoachScreen from '../coach';

jest.mock('@/global.css', () => ({}));
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en' },
  }),
}));
const mockLanguage: { current: 'en' | 'he' } = { current: 'en' };
jest.mock('@/i18n/useAddressedTranslation', () => ({
  useAddressedTranslation: (ns: string) => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/i18n').default.t(k, { ns, lng: mockLanguage.current, ...opts }),
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
jest.mock('@/components/coach/useLiveCoach', () => ({
  useLiveCoach: () => ({
    items: [{ kind: 'coach', text: 'Hello.' }],
    question: null,
    status: 'idle',
    goalSpec: null,
    handoff: false,
    awaitingOpening: true,
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
    isResumed: false,
  }),
}));
jest.mock('@/state/ProfileProvider', () => ({
  useProfile: () => ({ profile: { displayName: null }, setDisplayName: jest.fn() }),
}));
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({
    core: {
      createJourneyFromGoalSpec: jest.fn(),
      getOnboardingCoachSummary: jest.fn(() => null),
      getOnboardingAnswers: jest.fn(() => ({ focus: 'general' })),
      getPortraitForPlanning: jest.fn(() => null),
      markPortraitHandoffUsed: jest.fn(),
      completeOnboarding: jest.fn(),
      initReminders: jest.fn(async () => undefined),
      getLastJourneyBuildTrace: jest.fn(() => []),
      setPortrait: jest.fn(),
    },
    snapshot: { journeys: [], dreams: [], futureCapacity: { capReached: false } },
  }),
}));

interface TestRoot {
  toJSON(): unknown;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');

async function renderText(params: Record<string, string>, language: 'en' | 'he'): Promise<string> {
  mockParams.current = params;
  mockLanguage.current = language;
  let r: TestRoot | undefined;
  await TestRenderer.act(async () => {
    r = TestRenderer.create(createElement(CoachScreen));
  });
  if (!r) throw new Error('render failed');
  return JSON.stringify(r.toJSON());
}

describe('the coach header', () => {
  it('reads "Your coach / Introduction" in the introduction (en)', async () => {
    const text = await renderText({ firstRun: '1' }, 'en');
    expect(text).toContain('"Your coach"');
    expect(text).toContain('"Introduction"');
    expect(text).not.toContain('"New plan"');
  });

  it('reads "המאמן שלך / שיחת היכרות" in the introduction (he)', async () => {
    const text = await renderText({ firstRun: '1' }, 'he');
    expect(text).toContain('"המאמן שלך"');
    expect(text).toContain('"שיחת היכרות"');
    expect(text).not.toContain('"תוכנית חדשה"');
  });

  it('keeps "New plan" / "תוכנית חדשה" in planning', async () => {
    const en = await renderText({}, 'en');
    expect(en).toContain('"New plan"');
    expect(en).not.toContain('"Your coach"');

    const he = await renderText({}, 'he');
    expect(he).toContain('"תוכנית חדשה"');
    expect(he).not.toContain('"שיחת היכרות"');
  });
});
