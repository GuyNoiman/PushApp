/**
 * Personal Details — Active Hours live here now, and a save here is reported (Gap Register B2).
 *
 * Founder, 2026-09-16: "שעות הפעילות שייכות לפרטים אישיים" — Active Hours stopped being a Step of the
 * intro Journey and are edited from this screen, through a row that opens the EXISTING editor. And
 * "הפרופיל נשמר → הצעד נסגר": saving a Personal Detail tells the core `profileSaved`, which decides on
 * its own which Steps that closes. This proves the screen's half of both — the row is there and goes
 * to the editor, and a real save is reported while a blur that changed nothing is not.
 *
 * Providers are stubbed; the screen and its rows are real.
 */
jest.mock('@/global.css', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
jest.mock('@/i18n/useAddressedTranslation', () => ({
  useAddressedTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/ui/KeyboardSafeScrollView', () => ({
  KeyboardSafeScrollView: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/core/profile/simulatedUser', () => ({
  getSimulatedUser: () => ({ signedIn: false, name: null, email: null }),
}));
jest.mock('@/hooks/useActiveHoursSummary', () => ({ useActiveHoursSummary: () => '08:00–22:00' }));

const mockProfile = {
  profile: { displayName: 'Dana', birthDate: null, addressForm: 'neutral', country: 'IL', weekStartDay: 0 },
  setDisplayName: jest.fn(),
  setBirthDate: jest.fn(),
  setAddressForm: jest.fn(),
  setWeekStartDay: jest.fn(),
};
jest.mock('@/state/ProfileProvider', () => ({ useProfile: () => mockProfile }));
jest.mock('@/state/SocialProvider', () => ({
  useSocial: () => ({ profile: { id: 'u1', handle: 'dana', buddySummary: {} }, setHandle: jest.fn() }),
}));
const mockCore = { noteInAppAction: jest.fn() };
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore, snapshot: {} }) }));

import { createElement, type ReactElement } from 'react';

import MyProfileScreen from '../profile';

interface Node {
  props: Record<string, any>;
}
interface TestRoot {
  root: { findAll(predicate: (n: Node) => boolean): Node[] };
  unmount(): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

let mounted: TestRoot | undefined;
function render(): TestRoot {
  TestRenderer.act(() => {
    mounted = TestRenderer.create(createElement(MyProfileScreen));
  });
  return mounted!;
}
afterEach(() => {
  if (mounted) TestRenderer.act(() => mounted!.unmount());
  mounted = undefined;
});
beforeEach(() => jest.clearAllMocks());

/** The composite row with this label — the one that carries `onPress`. */
const row = (r: TestRoot, label: string) =>
  r.root.findAll((n) => n.props.label === label && typeof n.props.onPress === 'function')[0];

describe('Personal Details — Active Hours', () => {
  it('has an Active Hours row that shows the current hours and opens the existing editor', () => {
    const r = render();
    const activeHours = row(r, 'activeHours.title');

    expect(activeHours).toBeDefined();
    expect(activeHours.props.value).toBe('08:00–22:00');
    TestRenderer.act(() => activeHours.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/settings/active-hours');
  });

  it('does not report opening the editor as a save — Active Hours report their own save', () => {
    const r = render();
    TestRenderer.act(() => row(r, 'activeHours.title').props.onPress());
    expect(mockCore.noteInAppAction).not.toHaveBeenCalled();
  });
});

describe('Personal Details — a save is reported to the core', () => {
  it('reports a changed form of address', () => {
    const r = render();
    TestRenderer.act(() => row(r, 'profile.addressForm').props.onPress());

    expect(mockProfile.setAddressForm).toHaveBeenCalledWith('feminine');
    expect(mockCore.noteInAppAction).toHaveBeenCalledWith('profileSaved');
  });

  it('reports a name that actually changed, and not a blur that changed nothing', () => {
    const r = render();
    const nameSave = r.root.findAll((n) => n.props.label === 'profile.name' && typeof n.props.onSave === 'function')[0];

    TestRenderer.act(() => nameSave.props.onSave('Dana'));
    expect(mockCore.noteInAppAction).not.toHaveBeenCalled();

    TestRenderer.act(() => nameSave.props.onSave('Dana Levi'));
    expect(mockProfile.setDisplayName).toHaveBeenCalledWith('Dana Levi');
    expect(mockCore.noteInAppAction).toHaveBeenCalledWith('profileSaved');
  });

  it('reports a saved birth date', () => {
    const r = render();
    const birth = r.root.findAll((n) => n.props.label === 'profile.birthDate' && typeof n.props.onSave === 'function')[0];

    TestRenderer.act(() => birth.props.onSave('1990-05-01'));
    expect(mockProfile.setBirthDate).toHaveBeenCalledWith('1990-05-01');
    expect(mockCore.noteInAppAction).toHaveBeenCalledWith('profileSaved');
  });
});
