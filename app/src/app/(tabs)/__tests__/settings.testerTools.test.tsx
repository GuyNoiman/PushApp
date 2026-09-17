/**
 * TEMPORARY — the Settings tab's half of the hidden tester tools. Remove with `state/TesterTools.ts`.
 *
 * What this pins: an ordinary Settings shows no tester section and the About row looks exactly as it
 * did (no chevron, because it has no `onPress` of its own); seven taps on About bring the section and
 * its one row in, with the notice saying so; and the row opens the Portrait tester view.
 *
 * Everything around the screen is stubbed; the screen, its rows and the unlock hook are real.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));
// `weekdays` is read as an array (returnObjects); every other key comes back as itself.
const mockWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => (k === 'weekdays' ? mockWeekdays : k),
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/ui/TabScrollView', () => ({
  TabScrollView: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/components/settings/ProfileIdentity', () => ({ ProfileIdentity: () => null }));
jest.mock('@/components/settings/DeleteAccountSheet', () => ({ DeleteAccountSheet: () => null }));
jest.mock('@/components/settings/SettingsOptionSheet', () => ({ SettingsOptionSheet: () => null }));
jest.mock('@/core/profile/simulatedUser', () => ({
  getSimulatedUser: () => ({ signedIn: false, name: null, email: null }),
}));
jest.mock('@/core/util/buildInfo', () => ({
  readRunningBundle: () => ({ kind: 'development' }),
  shortRuntime: (s: string) => s,
  shortUpdateId: (s: string) => s,
}));
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({ core: { coachMemoryActive: () => false }, snapshot: {} }),
}));
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({ user: null, status: 'anonymous', signOut: jest.fn() }),
}));
jest.mock('@/state/CelebrationPreference', () => ({
  useCelebrationPreference: () => ({ celebrationsEnabled: true, setCelebrationsEnabled: jest.fn() }),
}));
jest.mock('@/hooks/useActiveHoursSummary', () => ({ useActiveHoursSummary: () => '08:00–22:00' }));
jest.mock('@/hooks/useServerConnection', () => ({
  useServerConnection: () => ({ disconnected: false, retrying: false, retry: jest.fn() }),
}));
jest.mock('@/state/LanguagePreference', () => ({ useLanguagePreference: () => ({ language: 'en' }) }));
jest.mock('@/state/useNotificationPermission', () => ({
  useNotificationPermission: () => ({ status: 'granted', request: jest.fn() }),
}));
jest.mock('@/state/ProfileProvider', () => ({
  useProfile: () => ({
    profile: { addressForm: 'neutral', weekStartDay: 0, communicationProfile: 'balanced' },
    setAddressForm: jest.fn(),
    setWeekStartDay: jest.fn(),
  }),
}));
jest.mock('@/state/ThemePreference', () => ({
  useThemePreference: () => ({ preference: 'system', setPreference: jest.fn() }),
}));
jest.mock('@/state/useAccountActions', () => ({
  useAccountActions: () => ({ exportData: jest.fn(), deleteAccount: jest.fn() }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement, type ReactElement } from 'react';

import { TESTER_TOOLS_TAPS } from '@/state/TesterTools';

import SettingsScreen from '../settings';

interface Node {
  type: unknown;
  props: Record<string, any>;
  children: (Node | string)[];
}
interface TestRoot {
  root: { findAll(predicate: (n: Node) => boolean): Node[] };
  unmount(): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void | Promise<void>): Promise<void> } =
  require('react-test-renderer');

let mounted: TestRoot | undefined;
async function render(): Promise<TestRoot> {
  await TestRenderer.act(async () => {
    mounted = TestRenderer.create(createElement(SettingsScreen));
  });
  return mounted!;
}
afterEach(async () => {
  if (mounted) await TestRenderer.act(async () => mounted!.unmount());
  mounted = undefined;
});
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

function textsIn(node: Node | string): string[] {
  return typeof node === 'string' ? [node] : node.children.flatMap(textsIn);
}
const allTexts = (r: TestRoot) => r.root.findAll((n) => n.type === 'Text').flatMap((n) => textsIn(n));
const composite = (r: TestRoot, pred: (n: Node) => boolean) => r.root.findAll((n) => typeof n.type !== 'string' && pred(n));

async function tapAbout(r: TestRoot, times: number): Promise<void> {
  const about = composite(r, (n) => n.props.testID === 'settings-about')[0];
  for (let i = 0; i < times; i++) await TestRenderer.act(async () => about.props.onPress());
}

it('shows no tester section while the tools are locked, and About stays plain information', async () => {
  const r = await render();
  expect(allTexts(r)).not.toContain('testerTools.section');
  expect(allTexts(r)).not.toContain('testerTools.portraitRow');
  const aboutRow = composite(r, (n) => n.props.label === 'app.about')[0];
  expect(aboutRow.props.onPress).toBeUndefined();
});

it('does not unlock before the seventh tap on About', async () => {
  const r = await render();
  await tapAbout(r, TESTER_TOOLS_TAPS - 1);
  expect(allTexts(r)).not.toContain('testerTools.section');
  expect(allTexts(r)).not.toContain('testerTools.unlocked');
});

it('unlocks at the seventh tap, says so, and the row opens the Portrait tester view', async () => {
  const r = await render();
  await tapAbout(r, TESTER_TOOLS_TAPS);

  const texts = allTexts(r);
  expect(texts).toContain('testerTools.section');
  expect(texts).toContain('testerTools.unlocked');

  const row = composite(r, (n) => n.props.label === 'testerTools.portraitRow' && typeof n.props.onPress === 'function')[0];
  await TestRenderer.act(async () => row.props.onPress());
  expect(mockPush).toHaveBeenCalledWith('/settings/portrait-tester');
});

it('hides the section again after seven more taps', async () => {
  const r = await render();
  await tapAbout(r, TESTER_TOOLS_TAPS);
  await tapAbout(r, TESTER_TOOLS_TAPS);
  expect(allTexts(r)).not.toContain('testerTools.section');
  expect(allTexts(r)).toContain('testerTools.locked');
});
