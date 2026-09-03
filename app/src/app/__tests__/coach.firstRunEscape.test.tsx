/**
 * The first run when the conversation cannot happen (founder, 2026-09-03).
 *
 * ── WHAT CHANGED ──────────────────────────────────────────────────────────────────────────────
 *
 * Onboarding used to be uncompletable until the coach had built a Journey, for a good reason:
 * nobody should reach Home empty. It also meant that a person whose model or session was
 * unreachable could not get into an app that otherwise works entirely offline, on a path they had
 * no way to fix themselves.
 *
 * The founder replaced the guarantee rather than the promise: EVERY user now gets the "Getting to
 * know PushApp" Journey, so Home is never empty whatever happened in the conversation, and the
 * condition can go.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────────────────────────
 *
 * A skip button. The escape appears only where the conversation genuinely cannot happen, and the
 * last test here is the one that pins that.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));

import { createElement, type ReactElement } from 'react';

import CoachScreen from '../coach';

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    // Echo the key, except the two that must come back as arrays or the Journey has no Steps.
    t: (k: string) =>
      k === 'introJourney.why'
        ? ['why one']
        : k === 'introJourney.steps'
          ? [{ title: 'Fill in your profile', description: 'Name, username.' }]
          : k,
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/i18n/useAddressedTranslation', () => ({ useAddressedTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/core/config/featureFlags', () => ({ featureFlags: { liveCoach: true } }));
jest.mock('@/components/coach/useLiveCoach', () => ({
  useLiveCoach: () => {
    throw new Error('the live coach must not start an interview with no session');
  },
}));

const mockComplete = jest.fn();
const mockAnswers = { selections: {} };
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({
    core: {
      completeOnboarding: mockComplete,
      getOnboardingAnswers: () => mockAnswers,
      getOnboardingCoachSummary: () => null,
    },
    snapshot: { journeys: [] },
  }),
}));
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({ enabled: true, status: 'signedOut', ensureSession: async () => {} }),
}));

interface TestRoot {
  root: { findAllByProps(p: Record<string, unknown>): { props: Record<string, any> }[] };
  toJSON(): unknown;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void | Promise<void>): Promise<void> } =
  require('react-test-renderer');
const { act } = TestRenderer;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { router } = require('expo-router');

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(CoachScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

const escape = (r: TestRoot) => r.root.findAllByProps({ accessibilityLabel: 'firstRunContinue' });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { firstRun: '1' };
});

describe('a first run whose coach cannot be reached', () => {
  it('still offers the retry first — that is the outcome the person actually wants', async () => {
    const r = await render();
    expect(r.root.findAllByProps({ accessibilityLabel: 'connection.retry' }).length).toBeGreaterThan(0);
  });

  it('lets the person into the app rather than holding them at a screen they cannot fix', async () => {
    const r = await render();
    expect(escape(r).length).toBeGreaterThan(0);
  });

  it('completes onboarding WITH the intro Journey, so Home is not empty', async () => {
    const r = await render();
    await act(async () => {
      escape(r)[0].props.onPress();
    });

    expect(mockComplete).toHaveBeenCalledTimes(1);
    const [answers, intro] = mockComplete.mock.calls[0];
    expect(answers).toBe(mockAnswers);
    expect(intro.steps[0].title).toBe('Fill in your profile');
    expect(intro.why).toEqual(['why one']);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('goes through the SAME completion the coach path uses, not a second one', async () => {
    // A person who arrives here must not become a second kind of user with a different Home.
    const r = await render();
    await act(async () => {
      escape(r)[0].props.onPress();
    });
    expect(mockComplete.mock.calls[0]).toHaveLength(2);
  });
});

describe('an ordinary conversation with no session', () => {
  it('offers no way out into the app, because there is nothing to complete', async () => {
    // The conversation is still the onboarding. This is a failure path, not a skip button.
    mockParams.current = {};
    const r = await render();
    expect(escape(r)).toHaveLength(0);
    expect(mockComplete).not.toHaveBeenCalled();
  });
});
