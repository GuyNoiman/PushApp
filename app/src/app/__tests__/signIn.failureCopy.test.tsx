/**
 * What a person reads when signing in does not work — on BOTH screens that sign in, in both languages.
 *
 * The first device test (2026-09-16) printed Google's `DEVELOPER_ERROR: Follow troubleshooting
 * instructions at https://…` in red on the first run's account screen. This walks each way a sign-in
 * can end through the REAL AuthProvider and the real translations, and asserts two things per
 * outcome: the sentence that should be there is there, and nothing the error itself said is.
 *
 * Only the gateway (the backend) and the native availability checks are fakes.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));

import { createElement, type ReactElement } from 'react';

import i18n, { changeLanguage } from '@/i18n';
import { AuthNotAvailableError, AuthTokenRejectedError } from '@/core/auth/AuthGateway';
import { SignInCancelledError, SignInMisconfiguredError } from '@/core/auth/nativeIdentity';
import { AuthProvider } from '@/state/AuthProvider';
import OnboardingScreen from '../onboarding';
import SignInScreen from '../sign-in';

const mockGateway = {
  enabled: true,
  ensureSession: jest.fn(async () => ({ id: 'anon', isAnonymous: true, providers: ['anonymous'] })),
  getCurrentUser: jest.fn(async () => null),
  onAuthChange: jest.fn(() => () => undefined),
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(async () => undefined),
  deleteAccount: jest.fn(async () => undefined),
};
jest.mock('@/core/auth', () => ({ getAuthGateway: () => mockGateway }));
jest.mock('@/core/social/backendHealth', () => ({ checkBackendHealth: async () => 'reachable' }));
jest.mock('@/core/auth/nativeIdentity', () => {
  const actual = jest.requireActual('@/core/auth/nativeIdentity');
  return { ...actual, isAppleSignInAvailable: async () => false, isGoogleSignInAvailable: () => true };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
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
  useLanguagePreference: () => ({ language: 'en', setLanguage: jest.fn(async () => {}), pendingRestart: false }),
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

const S = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'settings', ...opts }) as string;

/** Every string rendered, flattened. */
function textOf(r: TestRoot): string {
  const walk = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join(' ');
    if (node && typeof node === 'object' && 'children' in (node as Record<string, unknown>)) {
      return walk((node as { children: unknown }).children);
    }
    return '';
  };
  return walk(r.toJSON());
}

async function press(r: TestRoot, label: string) {
  const hits = r.root.findAllByProps({ accessibilityLabel: label }).filter((h) => typeof h.props.onPress === 'function');
  if (hits.length === 0) throw new Error(`nothing pressable labelled "${label}" is on screen`);
  await act(async () => {
    hits[0].props.onPress();
  });
}

let mounted: TestRoot | null = null;
async function render(screen: 'onboarding' | 'settings'): Promise<TestRoot> {
  mockApp.current = {
    core: {
      getOnboardingStep: () => 'account',
      getOnboardingAnswers: () => ({ selections: {}, freeText: {}, skipped: [] }),
      saveOnboardingProgress: jest.fn(),
    },
  };
  const body = screen === 'onboarding' ? createElement(OnboardingScreen) : createElement(SignInScreen);
  await act(async () => {
    mounted = TestRenderer.create(createElement(AuthProvider, null, body));
  });
  return mounted!;
}

afterEach(async () => {
  await act(async () => mounted?.unmount());
  mounted = null;
  mockGateway.signInWithGoogle.mockReset();
});

const DEVELOPER_ERROR =
  'DEVELOPER_ERROR: Follow troubleshooting instructions at https://react-native-google-signin.github.io/docs/troubleshooting';
const SECRET = 'google: Passed nonce and nonce in id_token should either both exist or not. guy@example.com';

/** Anything an error's own text could put on screen. None of it may appear. */
const LEAKS = ['DEVELOPER_ERROR', 'troubleshooting', 'https://', 'nonce', 'example.com', 'misconfigured', 'Error'];

const OUTCOMES: [string, () => unknown, 'unavailable' | 'failed' | null][] = [
  ['a cancel', () => new SignInCancelledError(), null],
  ['an unavailable provider', () => new AuthNotAvailableError(SECRET), 'unavailable'],
  ['a server refusal', () => new AuthTokenRejectedError(SECRET), 'failed'],
  ['Google DEVELOPER_ERROR, as nativeIdentity names it', () => new SignInMisconfiguredError('google'), 'failed'],
  ['a raw DEVELOPER_ERROR-shaped rejection', () => Object.assign(new Error(DEVELOPER_ERROR), { code: '10' }), 'failed'],
  ['anything else', () => new Error(SECRET), 'failed'],
];

describe.each(['en', 'he'] as const)('sign-in failure copy in %s', (lang) => {
  beforeEach(async () => {
    await act(async () => {
      await changeLanguage(lang);
    });
  });

  describe.each(['onboarding', 'settings'] as const)('on the %s screen', (screen) => {
    it.each(OUTCOMES)('%s', async (_label, makeError, notice) => {
      mockGateway.signInWithGoogle.mockRejectedValueOnce(makeError());
      const r = await render(screen);
      const google = screen === 'onboarding' ? i18n.t('flow.account.google', { ns: 'onboarding' }) : S('account.google');
      await press(r, google);

      const text = textOf(r);
      for (const leak of LEAKS) expect(text).not.toContain(leak);

      const tryAgain = r.root.findAllByProps({ accessibilityLabel: S('signIn.failure.tryAgain') });
      if (notice === null) {
        // Closing the sheet is a choice: no sentence, no Try again.
        expect(text).not.toContain(S('signIn.failure.unavailable', { provider: 'Google' }));
        expect(text).not.toContain(S('signIn.failure.failed', { provider: 'Google' }));
        expect(tryAgain).toHaveLength(0);
        return;
      }
      expect(text).toContain(S(`signIn.failure.${notice}`, { provider: 'Google' }));
      expect(tryAgain.length).toBeGreaterThan(0);
    });

    it('Try again retries the same provider, and a success clears the sentence', async () => {
      mockGateway.signInWithGoogle
        .mockRejectedValueOnce(new SignInMisconfiguredError('google'))
        .mockResolvedValueOnce({ id: 'anon', isAnonymous: true, providers: ['anonymous'] });
      const r = await render(screen);
      const google = screen === 'onboarding' ? i18n.t('flow.account.google', { ns: 'onboarding' }) : S('account.google');
      await press(r, google);
      expect(textOf(r)).toContain(S('signIn.failure.failed', { provider: 'Google' }));

      await press(r, S('signIn.failure.tryAgain'));
      expect(mockGateway.signInWithGoogle).toHaveBeenCalledTimes(2);
      expect(textOf(r)).not.toContain(S('signIn.failure.failed', { provider: 'Google' }));
    });
  });
});
