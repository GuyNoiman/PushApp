/**
 * LanguagePreference sets BOTH of React Native's direction switches, and says when the choice is stored.
 *
 * React Native lays the app out right-to-left when `forceRTL || (allowRTL && the phone's locale is
 * RTL)`. Setting only `forceRTL(false)` therefore leaves English mirrored on a phone set to Hebrew,
 * however many times the app restarts — the first device test, 2026-09-16. An LTR language must turn
 * `allowRTL` off too.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';
import { I18nManager } from 'react-native';

import { changeLanguage } from '@/i18n';
import { LANGUAGE_PREFERENCE_KEY, LanguagePreferenceProvider, useLanguagePreference } from '../LanguagePreference';

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

let pref: ReturnType<typeof useLanguagePreference> | null = null;
function Probe() {
  pref = useLanguagePreference();
  return null;
}

const originalRTL = I18nManager.isRTL;
let allowRTL: jest.SpyInstance;
let forceRTL: jest.SpyInstance;
let mounted: { unmount(): void } | null = null;

async function mount(rtl: boolean) {
  Object.defineProperty(I18nManager, 'isRTL', { value: rtl, configurable: true });
  await act(async () => {
    mounted = TestRenderer.create(createElement(LanguagePreferenceProvider, null, createElement(Probe)));
  });
  allowRTL.mockClear();
  forceRTL.mockClear();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  allowRTL = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => {});
  forceRTL = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => mounted?.unmount());
  mounted = null;
  allowRTL.mockRestore();
  forceRTL.mockRestore();
  Object.defineProperty(I18nManager, 'isRTL', { value: originalRTL, configurable: true });
  await changeLanguage('en');
});

describe('LanguagePreference direction', () => {
  it('English on a right-to-left launch turns BOTH switches off and asks for the restart', async () => {
    await mount(true);
    await act(async () => {
      await pref!.setLanguage('en');
    });
    expect(allowRTL).toHaveBeenCalledWith(false);
    expect(forceRTL).toHaveBeenCalledWith(false);
    expect(pref!.pendingRestart).toBe(true);
  });

  it('Hebrew on a left-to-right launch turns both on', async () => {
    await mount(false);
    await act(async () => {
      await pref!.setLanguage('he');
    });
    expect(allowRTL).toHaveBeenCalledWith(true);
    expect(forceRTL).toHaveBeenCalledWith(true);
    expect(pref!.pendingRestart).toBe(true);
  });

  it('choosing back the running direction cancels the pending flip', async () => {
    await mount(false);
    await act(async () => {
      await pref!.setLanguage('he');
    });
    await act(async () => {
      await pref!.setLanguage('en');
    });
    expect(allowRTL).toHaveBeenLastCalledWith(false);
    expect(forceRTL).toHaveBeenLastCalledWith(false);
    expect(pref!.pendingRestart).toBe(false);
  });

  it('settles once the choice is stored, so a relaunch can wait for it', async () => {
    await mount(false);
    await act(async () => {
      await pref!.setLanguage('he');
      expect(await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY)).toBe('he');
    });
  });
});
