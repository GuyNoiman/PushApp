/**
 * Leaving the coach — the X that did nothing (partner, 2026-09-03).
 *
 * The expression was `canGoBack() ? back() : replace('/')`, which is correct everywhere except the
 * one place it mattered most. On the FIRST RUN both arms are dead at once: onboarding reaches the
 * coach with `router.replace`, so there is no back stack, and `(tabs)` is behind the onboarding gate
 * in `_layout`, so `'/'` is a route the router refuses. The person tapped the only way out of the
 * conversation and stayed exactly where they were.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));

// The doubles are created INSIDE the factory: the `import` below is hoisted above this file's
// consts, so a factory that closed over them would run while they were still uninitialized.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
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
jest.mock('@/components/coach/useLiveCoach', () => ({ useLiveCoach: () => ({}) }));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: {}, snapshot: null }) }));

import { router } from 'expo-router';

import { leaveCoach } from '../coach';

const mockBack = router.back as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockCanGoBack = router.canGoBack as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
});

describe('during the first run', () => {
  it('goes back to onboarding, which is the only place that exists yet', () => {
    mockCanGoBack.mockReturnValue(false);
    leaveCoach(true);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('does NOT try for Home, which the onboarding gate would refuse', () => {
    leaveCoach(true);
    expect(mockReplace).not.toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('every other time', () => {
  it('goes back where the person came from', () => {
    leaveCoach(false);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to Home when there is no back stack', () => {
    mockCanGoBack.mockReturnValue(false);
    leaveCoach(false);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
