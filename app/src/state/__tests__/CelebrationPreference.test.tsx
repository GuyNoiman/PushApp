/**
 * CelebrationPreference — the on/off choice for SMALL Step celebrations (Completion Celebration
 * §2.1 / §7). Proves the persisted shape: celebrations default ON for a fresh install, turning
 * them off round-trips into `pushapp.celebrationsEnabled`, a stored 'false' rehydrates as off, and
 * anything else (missing / garbage) degrades to the ON default rather than silently disabling.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';

import {
  CELEBRATIONS_ENABLED_KEY,
  CelebrationPreferenceProvider,
  useCelebrationPreference,
} from '@/state/CelebrationPreference';

// react-test-renderer ships no types; type just the surface used here (mirrors ProfileProvider test).
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

// Capture the live context value so a test can read the flag + call the setter.
let ctx: ReturnType<typeof useCelebrationPreference>;
function Probe() {
  ctx = useCelebrationPreference();
  return null;
}

async function mount(): Promise<void> {
  await act(async () => {
    TestRenderer.create(createElement(CelebrationPreferenceProvider, null, createElement(Probe)));
  });
  // Let the mount-time AsyncStorage read reconcile.
  await act(async () => {
    await Promise.resolve();
  });
}

describe('CelebrationPreference — small-celebration on/off persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to enabled on a fresh install', async () => {
    await mount();
    expect(ctx.celebrationsEnabled).toBe(true);
  });

  it('persists an off choice into storage', async () => {
    await mount();
    await act(async () => {
      ctx.setCelebrationsEnabled(false);
      await Promise.resolve();
    });
    expect(ctx.celebrationsEnabled).toBe(false);
    expect(await AsyncStorage.getItem(CELEBRATIONS_ENABLED_KEY)).toBe('false');
  });

  it("rehydrates a stored 'false' as off", async () => {
    await AsyncStorage.setItem(CELEBRATIONS_ENABLED_KEY, 'false');
    await mount();
    expect(ctx.celebrationsEnabled).toBe(false);
  });

  it('degrades a garbage stored value to the enabled default', async () => {
    await AsyncStorage.setItem(CELEBRATIONS_ENABLED_KEY, 'maybe');
    await mount();
    expect(ctx.celebrationsEnabled).toBe(true);
  });
});
