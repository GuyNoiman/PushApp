/**
 * Onboarding — where the user LANDS when the flow finishes (Device QA 2026-08-17, B1).
 *
 * On device, finishing onboarding dropped the user straight into the Coach conversation, before they
 * had seen their own app. Founder decision: land on HOME; the Coach stays one tap away on Home's
 * hero card. This pins the destination on BOTH exits of the final reminders pre-prompt — turning
 * reminders on, and declining — because either one finishes onboarding (K1: a permission denial must
 * never block completion).
 *
 * `t` is stubbed to echo its key; theme, safe-area and the providers the earlier pages use are
 * stubbed so the last page renders without a provider tree.
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

/** A core parked on the LAST page of the flow — the reminders pre-prompt. */
function setApp() {
  const core = {
    getOnboardingStep: () => 'notifications',
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

describe('Onboarding — the hand-off at the end of the flow (B1)', () => {
  it('lands on Home after asking for reminders', async () => {
    const core = setApp();
    const r = await render();

    await tap(r, 'notifications.primary');

    expect(core.initReminders).toHaveBeenCalled();
    expect(core.completeOnboarding).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
    // Never the Coach: the user meets their own app first, and opens the conversation when they choose.
    expect(mockReplace).not.toHaveBeenCalledWith('/coach');
  });

  it('lands on Home when reminders are declined too — declining never blocks completion', async () => {
    const core = setApp();
    const r = await render();

    await tap(r, 'notifications.secondary');

    expect(core.initReminders).not.toHaveBeenCalled();
    expect(core.completeOnboarding).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
