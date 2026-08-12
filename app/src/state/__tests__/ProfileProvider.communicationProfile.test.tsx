/**
 * ProfileProvider — the unified communication style lives in the ONE profile blob (D40,
 * Communication_Style_Profile_PRD §12: included in export, deleted with the account). Proves the
 * persisted shape: a fresh profile defaults to Warm, a set choice round-trips into `pushapp.profile`,
 * a valid stored id is rehydrated, and a garbage stored id degrades to the default.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';

import { PROFILE_KEY, ProfileProvider, useProfile } from '@/state/ProfileProvider';
import type { CommunicationProfileId } from '@/core/communication/communicationProfile';

// react-test-renderer ships no types; type just the surface used here (mirrors SocialProvider test).
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

// Capture the live context value so a test can read the profile + call setters.
let ctx: ReturnType<typeof useProfile>;
function Probe() {
  ctx = useProfile();
  return null;
}

async function mount(): Promise<void> {
  await act(async () => {
    TestRenderer.create(createElement(ProfileProvider, null, createElement(Probe)));
  });
  // Let the mount-time AsyncStorage read reconcile.
  await act(async () => {
    await Promise.resolve();
  });
}

async function storedProfile(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

describe('ProfileProvider — communication style persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults a fresh profile to Warm', async () => {
    await mount();
    expect(ctx.profile.communicationProfile).toBe('warm');
  });

  it('persists a set choice into the profile blob', async () => {
    await mount();
    await act(async () => {
      ctx.setCommunicationProfile('direct');
      await Promise.resolve();
    });
    expect(ctx.profile.communicationProfile).toBe('direct');
    expect((await storedProfile())?.communicationProfile).toBe('direct');
  });

  it('rehydrates a valid stored id', async () => {
    await AsyncStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ communicationProfile: 'energizing' satisfies CommunicationProfileId }),
    );
    await mount();
    expect(ctx.profile.communicationProfile).toBe('energizing');
  });

  it('degrades a garbage stored id to the Warm default', async () => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ communicationProfile: 'steady' }));
    await mount();
    expect(ctx.profile.communicationProfile).toBe('warm');
  });
});
