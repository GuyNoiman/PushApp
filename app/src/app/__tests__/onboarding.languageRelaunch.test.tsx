/**
 * The first run's language step relaunches WITHOUT asking when direction flips — and Settings still asks.
 *
 * The first device test (2026-09-16) showed English laid out right-to-left on the account screen. The
 * language step used to ask through a dialog whose "Not now" left the whole first run mirrored. On
 * the first run nothing has been entered yet, so it now relaunches at once, onto the WELCOME: the
 * resume point is moved past the language step and both writes (the step and the language) are
 * awaited before the relaunch. These pin that sequence, that nothing restarts when direction does not
 * change, that nothing new appears when the app cannot relaunch itself, and that Settings › Language
 * is untouched.
 *
 * What a renderer cannot show is the relaunched app's layout; that is a device check.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));

import { createElement, type ReactElement } from 'react';
import { I18nManager } from 'react-native';

import { canRestartApp, confirmAndRestartApp, restartApp } from '@/i18n/restart';
import OnboardingScreen from '../onboarding';
import LanguagePickerScreen from '../settings/language';

jest.mock('@/i18n/restart', () => ({
  canRestartApp: jest.fn(() => true),
  restartApp: jest.fn(),
  confirmAndRestartApp: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/** The language the fake preference holds, and the store write a caller can wait on. */
const mockLanguage: { current: 'en' | 'he'; stored: () => void } = { current: 'en', stored: () => {} };
const mockSetLanguage = jest.fn(
  (code: 'en' | 'he') =>
    new Promise<void>((resolve) => {
      mockLanguage.current = code;
      mockLanguage.stored = resolve;
    }),
);
jest.mock('@/state/LanguagePreference', () => ({
  useLanguagePreference: () => ({ language: mockLanguage.current, setLanguage: mockSetLanguage, pendingRestart: false }),
}));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ profile: null }) }));
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({
    enabled: false,
    status: 'anonymous',
    signInFailure: null,
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

// react-test-renderer ships no types; type just the surface used here.
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

const mockCanRestart = canRestartApp as jest.Mock;
const mockRestart = restartApp as jest.Mock;
const mockConfirm = confirmAndRestartApp as jest.Mock;

/** A save loop the test decides when to finish. */
let finishSaves: () => void = () => {};
function setApp(step: string) {
  const core = {
    getOnboardingStep: () => step,
    getOnboardingAnswers: () => ({ selections: {}, freeText: {}, skipped: [] }),
    saveOnboardingProgress: jest.fn(),
    flushSaves: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSaves = resolve;
        }),
    ),
  };
  mockApp.current = { core };
  return core;
}

let mounted: TestRoot | null = null;
async function render(element: ReactElement): Promise<TestRoot> {
  await act(async () => {
    mounted = TestRenderer.create(element);
  });
  return mounted!;
}

async function press(r: TestRoot, label: string) {
  const hits = r.root.findAllByProps({ accessibilityLabel: label }).filter((h) => typeof h.props.onPress === 'function');
  if (hits.length === 0) throw new Error(`nothing pressable labelled "${label}" is on screen`);
  await act(async () => {
    hits[0].props.onPress();
  });
}

/** Is the language step still the screen showing? (The echoed key of its title.) */
function onLanguageStep(r: TestRoot): boolean {
  return r.root.findAllByProps({ children: 'language.title' }).length > 0;
}

function withDirection(rtl: boolean) {
  Object.defineProperty(I18nManager, 'isRTL', { value: rtl, configurable: true });
}
const originalRTL = I18nManager.isRTL;

beforeEach(() => {
  mockLanguage.current = 'en';
  mockSetLanguage.mockClear();
  mockCanRestart.mockReset().mockReturnValue(true);
  mockRestart.mockReset();
  mockConfirm.mockReset();
  withDirection(false);
});
afterEach(async () => {
  await act(async () => mounted?.unmount());
  mounted = null;
  withDirection(originalRTL);
});

describe('the first-run language step', () => {
  it('relaunches onto the welcome, without a dialog, once both writes have landed', async () => {
    const core = setApp('language');
    const r = await render(createElement(OnboardingScreen));

    await press(r, 'Hebrew');

    expect(mockSetLanguage).toHaveBeenCalledWith('he');
    expect(mockConfirm).not.toHaveBeenCalled();
    // The resume point is past the language step before anything relaunches...
    expect(core.saveOnboardingProgress).toHaveBeenCalledWith('welcome', expect.anything());
    expect(core.flushSaves).toHaveBeenCalled();
    // ...and the screen has NOT moved on in the old direction.
    expect(onLanguageStep(r)).toBe(true);

    // Neither write has landed: no relaunch yet.
    expect(mockRestart).not.toHaveBeenCalled();
    await act(async () => mockLanguage.stored());
    expect(mockRestart).not.toHaveBeenCalled();
    await act(async () => finishSaves());
    expect(mockRestart).toHaveBeenCalledTimes(1);
  });

  it('ignores further taps once a relaunch is on its way', async () => {
    const core = setApp('language');
    const r = await render(createElement(OnboardingScreen));
    await press(r, 'Hebrew');
    await press(r, 'English');
    await press(r, 'language.continue');
    expect(mockSetLanguage).toHaveBeenCalledTimes(1);
    expect(core.saveOnboardingProgress).toHaveBeenCalledTimes(1);
  });

  it('does not relaunch when the choice keeps the direction', async () => {
    const core = setApp('language');
    const r = await render(createElement(OnboardingScreen));

    await press(r, 'English');
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
    expect(core.saveOnboardingProgress).not.toHaveBeenCalled();
    expect(mockRestart).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();

    // Continue simply walks on.
    await press(r, 'language.continue');
    expect(core.saveOnboardingProgress).toHaveBeenCalledWith('welcome', expect.anything());
    expect(core.flushSaves).not.toHaveBeenCalled();
    expect(mockRestart).not.toHaveBeenCalled();
    expect(onLanguageStep(r)).toBe(false);
  });

  it('relaunches on Continue when the layout already disagrees with the selected language', async () => {
    // A phone set to a right-to-left language we do not ship: English pre-selected, opened RTL.
    withDirection(true);
    const core = setApp('language');
    const r = await render(createElement(OnboardingScreen));

    await press(r, 'language.continue');
    expect(mockSetLanguage).toHaveBeenCalledWith('en');
    expect(core.saveOnboardingProgress).toHaveBeenCalledWith('welcome', expect.anything());
    expect(onLanguageStep(r)).toBe(true);
    await act(async () => {
      mockLanguage.stored();
      finishSaves();
    });
    expect(mockRestart).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('where the app cannot relaunch itself, applies the choice and adds nothing', async () => {
    mockCanRestart.mockReturnValue(false);
    const core = setApp('language');
    const r = await render(createElement(OnboardingScreen));

    await press(r, 'Hebrew');
    expect(mockSetLanguage).toHaveBeenCalledWith('he');
    expect(mockRestart).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(core.saveOnboardingProgress).not.toHaveBeenCalled();
    expect(onLanguageStep(r)).toBe(true);
  });
});

describe('Settings › Language', () => {
  it('still asks before relaunching', async () => {
    await render(createElement(LanguagePickerScreen));
    await press(mounted!, 'Hebrew');
    expect(mockSetLanguage).toHaveBeenCalledWith('he');
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockRestart).not.toHaveBeenCalled();
  });

  it('does not ask when the direction stays the same', async () => {
    await render(createElement(LanguagePickerScreen));
    await press(mounted!, 'English');
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
