/**
 * Coach — WHAT THE COACH DOES WHEN IT HAS NO SESSION (2026-08-20).
 *
 * The live coach understands the opening through our proxy, which authenticates with the device's
 * own session. Anonymous sign-ins were switched off on the project, so devices had no session at all
 * — and the coach carried on anyway: the understanding call failed, the interview fell back, and the
 * person's raw sentence became the title of a Journey they never asked for. It failed SILENTLY,
 * which is why it took a second person using the app to find it.
 *
 * These tests pin the rule that came out of it: a coach that cannot do its job says so and offers to
 * try again, rather than quietly becoming a worse coach.
 *
 * `t` is stubbed to echo its key, so the assertions read as the copy keys the screen must show.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import CoachScreen from '../coach';

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
  useAddressedTranslation: () => ({ t: (k: string) => k }),
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
// Only the LIVE coach needs a session; the scripted prototype is deliberately never gated.
jest.mock('@/core/config/featureFlags', () => ({ featureFlags: { liveCoach: true } }));

// The screen must not even construct the interview when there is no session, so this double fails
// loudly if it is ever reached.
const mockLiveCoach = jest.fn(() => {
  throw new Error('the live coach must not start an interview with no session');
});
jest.mock('@/components/coach/useLiveCoach', () => ({
  useLiveCoach: () => mockLiveCoach(),
}));

jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({ core: { getOnboardingCoachSummary: () => null }, snapshot: { journeys: [] } }),
}));

const mockEnsureSession = jest.fn(async () => {});
const mockAuth: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => mockAuth.current }));

// react-test-renderer ships no types; type just the surface used here.
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

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(CoachScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

beforeEach(() => {
  mockEnsureSession.mockClear();
  mockLiveCoach.mockClear();
  mockAuth.current = { enabled: true, status: 'signedOut', ensureSession: mockEnsureSession };
});

describe('Coach with no session', () => {
  it('says the coach cannot reach the server instead of starting an interview', async () => {
    const r = await render();

    const shown = json(r);
    expect(shown).toContain('connection.coachTitle');
    expect(shown).toContain('connection.coachBody');
    expect(mockLiveCoach).not.toHaveBeenCalled();
  });

  it('offers a retry that actually asks for a session again', async () => {
    const r = await render();

    const retry = r.root.findAllByProps({ accessibilityLabel: 'connection.retry' });
    expect(retry.length).toBeGreaterThan(0);

    await act(async () => {
      retry[0].props.onPress();
    });

    expect(mockEnsureSession).toHaveBeenCalledTimes(1);
  });

  it('shows the normal coach the moment a session exists', async () => {
    mockAuth.current = { enabled: true, status: 'anonymous', ensureSession: mockEnsureSession };
    // Reaching the live path is the assertion: the double throws, proving the gate let it through.
    await expect(render()).rejects.toThrow('must not start an interview');
  });
});
