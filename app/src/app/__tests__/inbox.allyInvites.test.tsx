/**
 * Inbox — incoming Support-Circle (Ally) invites in the Requested tab (Journey Support Circle, D2).
 *
 * Renders the REAL Inbox screen over a MOCK SocialProvider (react-test-renderer) to prove the
 * recipient's consent surface: an incoming Ally invite shows under Requested with a preview that
 * states exactly what accepting exposes (Encourager vs Companion), and Accept / Decline call
 * `respondToAllyInvite(journeyId, ownerId, true|false)`.
 *
 * `t` is stubbed to echo its key so previews/labels are asserted by i18n key; theme + safe-area are
 * stubbed so the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import InboxScreen from '../inbox';
import type { AllyInvite, SocialProfile } from '@/core/social';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));
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
  return { owner: profile('o1', 'dan'), journeyId: 'j1', bundle, status: 'requested' };
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

/** Render the Inbox and switch to the Requested tab. */
async function openRequested(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(InboxScreen));
  });
  if (!r) throw new Error('render failed');
  await act(async () => {
    byLabel(r!, 'tabs.requested')[0].props.onPress();
  });
  return r;
}

beforeEach(() => jest.clearAllMocks());

describe('Inbox — Ally invites in the Requested tab (D2)', () => {
  it('shows a Companion invite with the Companion preview', async () => {
    setSocial([invite('companion')]);
    const r = await openRequested();
    expect(json(r)).toContain('@dan');
    expect(json(r)).toContain('preview.allyCompanion');
    expect(json(r)).not.toContain('preview.allyEncourager');
  });

  it('shows an Encourager invite with the Encourager preview', async () => {
    setSocial([invite('encourager')]);
    const r = await openRequested();
    expect(json(r)).toContain('preview.allyEncourager');
    expect(json(r)).not.toContain('preview.allyCompanion');
  });

  it('Accept calls respondToAllyInvite(journeyId, ownerId, true)', async () => {
    const respond = jest.fn(async () => {});
    setSocial([invite('companion')], respond);
    const r = await openRequested();
    await act(async () => {
      byLabel(r, 'accept')[0].props.onPress();
    });
    expect(respond).toHaveBeenCalledWith('j1', 'o1', true);
  });

  it('Decline calls respondToAllyInvite(journeyId, ownerId, false)', async () => {
    const respond = jest.fn(async () => {});
    setSocial([invite('encourager')], respond);
    const r = await openRequested();
    await act(async () => {
      byLabel(r, 'decline')[0].props.onPress();
    });
    expect(respond).toHaveBeenCalledWith('j1', 'o1', false);
  });
});
