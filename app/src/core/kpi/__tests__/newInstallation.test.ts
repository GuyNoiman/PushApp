/**
 * A switch of account is a new installation for measurement (2026-09-17).
 *
 * Sign-out now returns the phone to a fresh install, so the install id is replaced and the
 * once-per-install markers are forgotten. Both in storage AND in the running stream: `wireKpi` holds
 * the id and the markers in memory, and removing the keys alone would keep stamping every event with
 * the old id until the next launch.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../social/supabaseClient', () => ({ supabase: null }));
jest.mock('../../util/buildInfo', () => ({ readRunningBundle: () => ({ kind: 'development' }) }));
jest.mock('../reportRuntime', () => ({ getRuntimeReporter: () => ({ report: () => undefined }) }));

type Captured = { context: () => KpiContext; once: OnceStore };
const mockCaptured: { current: Captured | null } = { current: null };
jest.mock('../index', () => ({
  getKpiGateway: (context: () => KpiContext, once: OnceStore) => {
    mockCaptured.current = { context, once };
    return { enabled: true, record: () => undefined };
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { KPI_INSTALL_ID_KEY } from '../installId';
import type { KpiContext, OnceStore } from '../KpiGateway';
import { KPI_ONCE_PREFIX, liveKpiInstallId, startNewKpiInstallation, wireKpiGateway } from '../wireKpi';

const OLD_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockCaptured.current = null;
});

it('replaces the install id in the running stream and in storage, and forgets the once markers', async () => {
  await AsyncStorage.multiSet([
    [KPI_INSTALL_ID_KEY, OLD_ID],
    [`${KPI_ONCE_PREFIX}first_open`, '1'],
    ['pushapp.languagePreference', 'he'],
  ]);
  await wireKpiGateway();
  const wired = mockCaptured.current!;
  expect(wired.context().installId).toBe(OLD_ID);
  expect(wired.once.has('first_open')).toBe(true);

  const fresh = await startNewKpiInstallation();

  expect(fresh).not.toBeNull();
  expect(fresh).not.toBe(OLD_ID);
  // The very gateway already handed out now stamps events with the new id.
  expect(wired.context().installId).toBe(fresh);
  expect(liveKpiInstallId()).toBe(fresh);
  expect(wired.once.has('first_open')).toBe(false);

  await new Promise((resolve) => setImmediate(resolve)); // the id write is fire-and-forget
  expect(await AsyncStorage.getItem(KPI_INSTALL_ID_KEY)).toBe(fresh);
  expect(await AsyncStorage.getItem(`${KPI_ONCE_PREFIX}first_open`)).toBeNull();
  // Nothing else is touched.
  expect(await AsyncStorage.getItem('pushapp.languagePreference')).toBe('he');
});
