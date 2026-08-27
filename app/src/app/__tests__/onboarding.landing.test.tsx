/**
 * Onboarding — where the user LANDS when the first-run gate closes.
 *
 * ── THE FINDING THIS FILE HAS ALWAYS PROTECTED (Device QA 2026-08-17, B1) ──────────────────────
 *
 * Finishing onboarding used to drop the user straight into the Coach conversation, before they had
 * seen their own app — and behind that conversation Home was EMPTY. The founder's decision was to
 * land on Home instead.
 *
 * ── AND WHAT CHANGED UNDER IT (Onboarding v2, 2026-08-27) ─────────────────────────────────────
 *
 * The conversation is now the onboarding rather than something waiting behind it: the welcome screen
 * says so, and the conversation ends by creating a Journey, so Home has something in it on arrival.
 * B1's actual objection — a conversation sprung on somebody in front of an empty app — is answered
 * rather than overruled, and these tests hold the part that still matters: **the person is always
 * taken somewhere reachable, and "maybe later" is a real answer that invents nothing.**
 *
 * `t` is stubbed to echo its key; theme, safe-area and the providers the page uses are stubbed so it
 * renders without a provider tree.
 */
import { createElement, type ReactElement } from 'react';

import OnboardingScreen from '../onboarding';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/global.css', () => ({}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: (path: string) => mockReplace(path) },
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' },
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
jest.mock('@/state/LanguagePreference', () => ({
  useLanguagePreference: () => ({ language: 'en', setLanguage: jest.fn(), pendingRestart: false }),
}));
jest.mock('@/state/ProfileProvider', () => ({
  useProfile: () => ({
    profile: { addressForm: 'neutral', weekStartDay: 0, country: 'IL', birthDate: null, displayName: null },
    setAddressForm: jest.fn(),
    setWeekStartDay: jest.fn(),
  }),
}));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ profile: null }) }));

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

// react-test-renderer ships no types; type just the surface used here.
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

/** A core parked on the welcome — the last page before the conversation. */
function setApp() {
  const core = {
    getOnboardingStep: () => 'intro',
    getOnboardingAnswers: () => ({ selections: {}, freeText: {}, skipped: [] }),
    saveOnboardingProgress: jest.fn(),
    completeOnboarding: jest.fn(),
    initReminders: jest.fn(async () => {}),
  };
  mockApp.current = { core };
  return core;
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(OnboardingScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

/** Tap a footer action by its accessibility label, then let the deferred navigation run. */
async function tap(r: TestRoot, label: string) {
  await act(async () => {
    r.root.findAllByProps({ accessibilityLabel: label })[0].props.onPress();
  });
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

beforeEach(() => mockReplace.mockClear());

describe('Onboarding — the hand-off at the welcome (B1, revised by v2)', () => {
  it('opens the conversation the welcome just promised', async () => {
    const core = setApp();
    const r = await render();

    await tap(r, 'intro.start');

    // The gate closes FIRST, and that is what makes the coach route reachable at all — until
    // onboarding is complete, `/coach` sits behind the first-run guard.
    expect(core.completeOnboarding).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/coach?firstRun=1');
  });

  it('"maybe later" opens the app, and invents nothing', async () => {
    const core = setApp();
    const r = await render();

    await tap(r, 'intro.later');

    expect(core.completeOnboarding).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
    // Non-punitive: no answers are fabricated on the way out, and the coach is one tap away on Home.
    expect(core.completeOnboarding.mock.calls[0][0].skipped ?? []).toEqual([]);
  });

  it('never leaves somebody nowhere — every exit navigates', async () => {
    for (const label of ['intro.start', 'intro.later']) {
      mockReplace.mockClear();
      setApp();
      const r = await render();
      await tap(r, label);
      expect(mockReplace).toHaveBeenCalledTimes(1);
    }
  });
});
