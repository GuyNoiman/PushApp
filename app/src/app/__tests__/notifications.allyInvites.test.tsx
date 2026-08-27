/**
 * The Notification Center — incoming Support-Circle (Ally) invites (Journey Support Circle, D2).
 *
 * MOVED FROM THE INBOX on 2026-08-24. An invitation is something a person DID, not a message, and
 * both approved specifications put it in the Notification Center (Notification Center PRD §5, Inbox
 * PRD §5). The guarantee being tested did not move: the recipient's consent surface must state
 * exactly what accepting exposes — Encourager sees progress, Companion also sees the Steps — and
 * Accept / Decline must call `respondToAllyInvite(journeyId, ownerId, true|false)`.
 *
 * `t` is stubbed to echo its key so previews/labels are asserted by i18n key; theme + safe-area are
 * stubbed so the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import NotificationsScreen from '../notifications';
import type { AllyInvite, SocialProfile } from '@/core/social';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, replace: jest.fn(), back: jest.fn(), push: jest.fn() },
}));
const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));
// The screen reads the notification preferences (Settings › Notifications, 2026-08-28). Stubbed
// rather than mounted: pulling the real provider in drags AppCore and expo-notifications behind it,
// and this file is about the invite rows.
jest.mock('@/state/AppProvider', () => ({
  useApp: () => ({ core: { getCommunicationPrefs: () => undefined } }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// react-test-renderer ships no types; type just the surface used here.
interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): unknown;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

function profile(id: string, handle: string): SocialProfile {
  return { id, handle, buddySummary: {} };
}
function invite(bundle: AllyInvite['bundle']): AllyInvite {
  // `requestedAt` is what the server row carries. Without it the feed SKIPS the invite rather than
  // inventing a time for it — so a fixture without one is testing a state that cannot reach a user.
  return {
    owner: profile('o1', 'dan'),
    journeyId: 'j1',
    bundle,
    status: 'requested',
    requestedAt: 1_700_000_000_000,
  };
}

function setSocial(invites: AllyInvite[], respondToAllyInvite = jest.fn(async () => {})) {
  mockSocial.current = {
    enabled: true,
    error: null,
    friends: [],
    incomingCheers: [],
    allyProgress: [],
    incomingAllyInvites: invites,
    respondToAllyInvite,
    respondToFriend: jest.fn(async () => {}),
  };
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });

/** Render the Notification Center. There is no tab to switch to: it is one chronological list. */
async function openCenter(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(NotificationsScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

beforeEach(() => jest.clearAllMocks());

describe('Notification Center — Ally invites (D2)', () => {
  it('shows a Companion invite with the Companion preview', async () => {
    setSocial([invite('companion')]);
    const r = await openCenter();
    // `t` echoes keys here, so the NAME reaches the tree through the avatar initial and the row's
    // accessible label rather than through the interpolated sentence.
    expect(json(r)).toContain('"D"');
    expect(json(r)).toContain('center.bundles.companion');
    expect(json(r)).not.toContain('center.bundles.encourager');
  });

  it('shows an Encourager invite with the Encourager preview', async () => {
    setSocial([invite('encourager')]);
    const r = await openCenter();
    expect(json(r)).toContain('center.bundles.encourager');
    expect(json(r)).not.toContain('center.bundles.companion');
  });

  it('Accept calls respondToAllyInvite(journeyId, ownerId, true)', async () => {
    const respond = jest.fn(async () => {});
    setSocial([invite('companion')], respond);
    const r = await openCenter();
    await act(async () => {
      byLabel(r, 'center.accept')[0].props.onPress();
    });
    expect(respond).toHaveBeenCalledWith('j1', 'o1', true);
  });

  it('Decline calls respondToAllyInvite(journeyId, ownerId, false)', async () => {
    const respond = jest.fn(async () => {});
    setSocial([invite('encourager')], respond);
    const r = await openCenter();
    await act(async () => {
      byLabel(r, 'center.decline')[0].props.onPress();
    });
    expect(respond).toHaveBeenCalledWith('j1', 'o1', false);
  });
});
