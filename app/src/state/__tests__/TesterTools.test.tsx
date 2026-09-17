/**
 * TEMPORARY tester tools — the hidden unlock (founder, 2026-09-17). Remove with `../TesterTools.ts`.
 *
 * What this pins: seven taps in a row turn the tools on and not six; seven more turn them off; a
 * pause between taps starts the count again, so nobody wanders into it; the choice is stored under
 * its one key and read back on the next mount; and the account wipe clears that key.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';

import { ACCOUNT_STORAGE_KEYS } from '@/state/accountExport';
import {
  TESTER_TOOLS_KEY,
  TESTER_TOOLS_TAP_GAP_MS,
  TESTER_TOOLS_TAPS,
  useTesterTools,
  type TesterTools,
} from '../TesterTools';

interface TestRoot {
  unmount(): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void | Promise<void>): Promise<void> } =
  require('react-test-renderer');

let latest!: TesterTools;
let mounted: TestRoot | undefined;

async function mount(): Promise<void> {
  function Probe() {
    latest = useTesterTools();
    return null;
  }
  await TestRenderer.act(async () => {
    mounted = TestRenderer.create(createElement(Probe));
  });
}

let clock = 1_700_000_000_000;
async function tap(times: number, gapMs = 100): Promise<void> {
  for (let i = 0; i < times; i++) {
    clock += gapMs;
    await TestRenderer.act(async () => latest.tap());
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
  clock = 1_700_000_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(async () => {
  if (mounted) await TestRenderer.act(async () => mounted!.unmount());
  mounted = undefined;
  jest.restoreAllMocks();
});

describe('the hidden unlock', () => {
  it('is off on a fresh install', async () => {
    await mount();
    expect(latest.loaded).toBe(true);
    expect(latest.enabled).toBe(false);
    expect(latest.notice).toBeNull();
  });

  it('does not turn on before the seventh tap', async () => {
    await mount();
    await tap(TESTER_TOOLS_TAPS - 1);
    expect(latest.enabled).toBe(false);
    expect(latest.notice).toBeNull();
    expect(await AsyncStorage.getItem(TESTER_TOOLS_KEY)).toBeNull();
  });

  it('turns on at the seventh tap, says so, and stores it', async () => {
    await mount();
    await tap(TESTER_TOOLS_TAPS);
    expect(latest.enabled).toBe(true);
    expect(latest.notice).toBe('on');
    expect(await AsyncStorage.getItem(TESTER_TOOLS_KEY)).toBe('true');
  });

  it('turns off after seven more, and not after six', async () => {
    await mount();
    await tap(TESTER_TOOLS_TAPS);
    await tap(TESTER_TOOLS_TAPS - 1);
    expect(latest.enabled).toBe(true);
    await tap(1);
    expect(latest.enabled).toBe(false);
    expect(latest.notice).toBe('off');
    expect(await AsyncStorage.getItem(TESTER_TOOLS_KEY)).toBe('false');
  });

  it('starts counting again after a pause, so scattered taps never add up', async () => {
    await mount();
    await tap(TESTER_TOOLS_TAPS - 1);
    await tap(1, TESTER_TOOLS_TAP_GAP_MS + 1);
    expect(latest.enabled).toBe(false);
    await tap(TESTER_TOOLS_TAPS - 1);
    expect(latest.enabled).toBe(true);
  });

  it('is read back on the next mount', async () => {
    await AsyncStorage.setItem(TESTER_TOOLS_KEY, 'true');
    await mount();
    expect(latest.enabled).toBe(true);
    // Reading it back is not a flip, so there is nothing to announce.
    expect(latest.notice).toBeNull();
  });
});

describe('an account wipe', () => {
  it('clears the switch, so a wiped device starts with the tools off', async () => {
    expect(ACCOUNT_STORAGE_KEYS).toContain(TESTER_TOOLS_KEY);

    await AsyncStorage.setItem(TESTER_TOOLS_KEY, 'true');
    // Exactly what `useAccountActions.deleteAccount` does with the list.
    await AsyncStorage.multiRemove([...ACCOUNT_STORAGE_KEYS]);
    await mount();
    expect(latest.enabled).toBe(false);
  });
});
