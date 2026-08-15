/**
 * NotificationCopySync — the single re-resolution trigger for notification copy (D40,
 * Communication_Style_Profile_PRD §10/§11). Proves the two things that matter: it does NOT reconcile
 * while the core or the profile are still settling (that would re-resolve against boot defaults), and
 * a LANGUAGE change re-resolves exactly once — the stale-language bug this closes, where copy baked at
 * rule-creation time kept its old wording forever.
 *
 * The two providers are mocked so this exercises the effect's gating/keying, not AsyncStorage or a
 * real AppCore; i18n is the real instance so the language change is genuine.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

const mockReconcile = jest.fn();
const mockCore = { reconcileNotificationCopy: mockReconcile };
const mockAppValue = { core: mockCore, snapshot: null, ready: false };
const mockProfileValue = {
  profile: { addressForm: 'neutral', communicationProfile: 'warm' },
  hydrated: false,
};

jest.mock('@/state/AppProvider', () => ({ useApp: () => mockAppValue }));
jest.mock('@/state/ProfileProvider', () => ({ useProfile: () => mockProfileValue }));

import { createElement, type ReactElement } from 'react';

import { changeLanguage } from '@/i18n';
import { NotificationCopySync } from '@/state/NotificationCopySync';

// react-test-renderer ships no types; type just the surface used here (mirrors the Provider tests).
interface TestRendererModule {
  create(element: ReactElement): { update(element: ReactElement): void; unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

describe('NotificationCopySync', () => {
  // Unmounted (inside act) after every test, so the language reset below never lands on a live tree.
  let tree: { update(element: ReactElement): void; unmount(): void } | null = null;

  async function mount(): Promise<void> {
    await act(async () => {
      tree = TestRenderer.create(createElement(NotificationCopySync));
    });
  }

  async function rerender(): Promise<void> {
    await act(async () => {
      tree?.update(createElement(NotificationCopySync));
    });
  }

  beforeEach(async () => {
    mockReconcile.mockClear();
    mockAppValue.ready = false;
    mockProfileValue.hydrated = false;
    mockProfileValue.profile = { addressForm: 'neutral', communicationProfile: 'warm' };
    await changeLanguage('en');
  });

  afterEach(async () => {
    await act(async () => {
      tree?.unmount();
    });
    tree = null;
  });

  it('does not reconcile until BOTH the core is ready and the profile has hydrated', async () => {
    await mount();
    expect(mockReconcile).not.toHaveBeenCalled();

    // Core ready, profile still settling — the style in hand is still the boot default.
    mockAppValue.ready = true;
    await rerender();
    expect(mockReconcile).not.toHaveBeenCalled();

    // Both gates open: exactly one reconcile.
    mockProfileValue.hydrated = true;
    await rerender();
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });

  it('reconciles exactly once when the language changes', async () => {
    mockAppValue.ready = true;
    mockProfileValue.hydrated = true;
    await mount();
    expect(mockReconcile).toHaveBeenCalledTimes(1); // the initial resolve

    await act(async () => {
      await changeLanguage('he');
    });
    expect(mockReconcile).toHaveBeenCalledTimes(2);

    // A re-render with nothing changed must not reconcile again.
    await rerender();
    expect(mockReconcile).toHaveBeenCalledTimes(2);
  });

  it('reconciles when the communication style changes', async () => {
    mockAppValue.ready = true;
    mockProfileValue.hydrated = true;
    await mount();
    expect(mockReconcile).toHaveBeenCalledTimes(1);

    mockProfileValue.profile = { addressForm: 'neutral', communicationProfile: 'direct' };
    await rerender();
    expect(mockReconcile).toHaveBeenCalledTimes(2);
  });
});
