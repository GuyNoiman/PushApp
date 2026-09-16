/**
 * The first run's funnel, as the screen records it (founder, 2026-09-16).
 *
 * The one thing a funnel must not do is count somebody twice: a person who goes Back from the
 * account wall and forward again did not reach it twice, and a funnel that said so would show the
 * wall as less costly than it is. The once is enforced by the gateway, so this test records through
 * the real once guard rather than a spy that would count every call.
 *
 * It also pins the escape: the account step's no-provider path advances with NO session, and it
 * must be visible if it ever happens on a real device.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));

import { createElement, type ReactElement } from 'react';

import i18n, { changeLanguage } from '@/i18n';
import { appKpi } from '@/core/kpi/appKpi';
import { withOnceGuard, type KpiInput } from '@/core/kpi/KpiGateway';
import OnboardingScreen from '../onboarding';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/state/LanguagePreference', () => ({
  useLanguagePreference: () => ({ language: 'en', setLanguage: jest.fn(), pendingRestart: false }),
}));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ profile: null }) }));
// A build with no backend: the one path where the account step offers its escape.
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({
    enabled: false,
    status: 'anonymous',
    error: null,
    signInWithApple: jest.fn(),
    signInWithGoogle: jest.fn(),
  }),
}));
jest.mock('@/core/auth/nativeIdentity', () => ({
  isAppleSignInAvailable: async () => false,
  isGoogleSignInAvailable: () => false,
}));

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  unmount(): void;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const T = (key: string) => i18n.t(key, { ns: 'onboarding' }) as string;

// ONE installation for the whole file: what it remembers is what a phone would remember.
const sent: KpiInput[] = [];
const remembered = new Set<string>();
appKpi.attach(
  withOnceGuard(
    { enabled: true, record: (input) => void sent.push(input) },
    { has: (k) => remembered.has(k), remember: (k) => void remembered.add(k) },
  ),
);

function setApp(step: string) {
  mockApp.current = {
    core: {
      getOnboardingStep: () => step,
      getOnboardingAnswers: () => ({ selections: {}, freeText: {}, skipped: [] }),
      saveOnboardingProgress: jest.fn(),
      completeOnboarding: jest.fn(),
    },
  };
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(OnboardingScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

async function tap(r: TestRoot, label: string) {
  const hits = r.root.findAllByProps({ accessibilityLabel: label });
  if (hits.length === 0) throw new Error(`nothing labelled "${label}" is on screen`);
  await act(async () => {
    hits[0].props.onPress();
  });
}

const steps = () => sent.filter((e) => e.name === 'onboarding_step_reached').map((e) => e.bucket);

beforeAll(async () => {
  await act(async () => {
    await changeLanguage('en');
  });
});

describe('the funnel', () => {
  it('records each step once, however the person moves through it', async () => {
    setApp('language');
    const r = await render();
    expect(steps()).toEqual(['language']);

    await tap(r, T('language.continue'));
    await tap(r, T('flow.welcome.primary'));
    await tap(r, T('flow.purpose.primary'));
    await tap(r, T('flow.prepare.primary'));
    expect(steps()).toEqual(['language', 'welcome', 'purpose', 'prepare', 'account']);

    // Back from the account wall, and forward to it again. Nobody reached it twice.
    await tap(r, T('flow.account.back'));
    await tap(r, T('flow.prepare.primary'));
    expect(steps()).toEqual(['language', 'welcome', 'purpose', 'prepare', 'account']);

    await act(async () => r.unmount());

    // The app closes and resumes on the account step tomorrow. Still once.
    setApp('account');
    const resumed = await render();
    expect(steps()).toEqual(['language', 'welcome', 'purpose', 'prepare', 'account']);

    // THE ESCAPE: a build that can sign nobody in. It is counted, with why it was offered.
    await tap(resumed, T('flow.account.unavailableContinue'));
    expect(sent.filter((e) => e.name === 'account_escape_used')).toEqual([
      { name: 'account_escape_used', bucket: 'no_backend' },
    ]);
    await act(async () => resumed.unmount());
  });
});
