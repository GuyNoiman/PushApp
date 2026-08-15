/**
 * Circle — the Support Circle people list (Friend_Profile_PRD §8 criterion 1).
 *
 * Renders the REAL Circle screen over a MOCK SocialProvider (react-test-renderer) to prove the list
 * end to end, and to keep the defect it was rebuilt to fix from ever coming back:
 *   · a friend who shares NOTHING still has a row (they used to be invisible);
 *   · a friend who shares TWO Journeys has ONE row (they used to appear twice);
 *   · the Cheer pill exists only where a Cheer could actually land;
 *   · the whole row is the entry point to `/friend/<id>`;
 *   · an empty circle reads as empty, and a genuine failure reads as a failure.
 *
 * `t` echoes its key plus its interpolation options, so a row is asserted by i18n key AND by the
 * name/percentage it was handed; theme + safe-area are stubbed so the screen renders without their
 * providers.
 */
import { createElement, type ReactElement } from 'react';

import FriendsScreen from '../friends';
import type { AllyProgress, Friend, FriendStatus, SocialProfile } from '@/core/social';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
  }),
}));
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

// ── Fixtures ───────────────────────────────────────────────────────────────
function profile(id: string, handle: string): SocialProfile {
  return { id, handle, buddySummary: {} };
}
function friend(id: string, handle: string, status: FriendStatus = 'accepted'): Friend {
  return { profile: profile(id, handle), status, direction: 'outgoing' };
}
function progress(ownerId: string, journeyId: string, overrides: Partial<AllyProgress> = {}): AllyProgress {
  return {
    owner: profile(ownerId, ownerId),
    journeyId,
    title: 'Run 5km',
    progress: 0.5,
    streak: 3,
    updatedAt: 1_000,
    visibility: 'full',
    ...overrides,
  };
}

function setSocial(overrides: Record<string, unknown> = {}) {
  mockSocial.current = {
    enabled: true,
    profile: profile('me', 'me'),
    needsHandle: false,
    error: null,
    friends: [],
    allyProgress: [],
    addFriendByHandle: jest.fn(),
    sendCheer: jest.fn(async () => {}),
    ...overrides,
  };
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
/** What the stubbed `t()` returns for a key + its interpolation options. */
const label = (k: string, opts?: Record<string, unknown>) =>
  opts ? `${k}|${JSON.stringify(opts)}` : k;
/** The same string as it appears inside the stringified tree (quotes escaped once more). */
const tKey = (k: string, opts?: Record<string, unknown>) => JSON.stringify(label(k, opts)).slice(1, -1);
// findAllByProps returns each Pressable's composite + forwarded host View; the composite carries a
// function `onPress`. Filter to it so a match is one logical element (and pressable).
const byLabel = (r: TestRoot, a11yLabel: string) =>
  r.root.findAllByProps({ accessibilityLabel: a11yLabel }).filter((n) => typeof n.props.onPress === 'function');
/** Every person row on screen, however many Journeys anyone shares. */
const rowsFor = (r: TestRoot, names: string[]) =>
  names.flatMap((name) => byLabel(r, label('openProfileA11y', { name })));

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(FriendsScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

beforeEach(() => jest.clearAllMocks());

describe('Circle — one row per PERSON (the defect this list was rebuilt to fix)', () => {
  it('shows a friend who shares NOTHING, with the honest status line and NO Cheer pill', async () => {
    setSocial({ friends: [friend('f1', 'dan')], allyProgress: [] });
    const r = await render();

    expect(rowsFor(r, ['@dan'])).toHaveLength(1);
    expect(json(r)).toContain(tKey('noSharedJourney'));
    // The pill is absent, not disabled: `cheers_send_ally` would refuse a Cheer with nothing shared.
    expect(byLabel(r, label('cheerA11y', { name: '@dan' }))).toHaveLength(0);
    expect(json(r)).not.toContain(tKey('cheer'));
  });

  it('shows a friend who shares TWO Journeys exactly ONCE', async () => {
    setSocial({
      friends: [friend('f1', 'dan')],
      allyProgress: [
        progress('f1', 'j1', { updatedAt: 100, title: 'Old', progress: 0.1 }),
        progress('f1', 'j2', { updatedAt: 900, title: 'New', progress: 0.9 }),
      ],
    });
    const r = await render();

    expect(rowsFor(r, ['@dan'])).toHaveLength(1);
    // One row, one status line — describing the Journey they moved on last.
    expect(json(r)).toContain(tKey('progressStatusMulti', { pct: 90, title: 'New', journeys: 2 }));
    expect(json(r)).not.toContain(tKey('progressStatus', { pct: 10, title: 'Old' }));
  });

  it('mixes both cases in one list: three friends, three rows', async () => {
    setSocial({
      friends: [friend('f1', 'dan'), friend('f2', 'sam'), friend('f3', 'ada')],
      allyProgress: [
        progress('f2', 'j1', { updatedAt: 100 }),
        progress('f2', 'j2', { updatedAt: 200 }),
        progress('f3', 'j3'),
      ],
    });
    const r = await render();

    expect(rowsFor(r, ['@dan', '@sam', '@ada'])).toHaveLength(3);
  });

  it('leaves a PENDING request out of the list — it belongs to the Inbox', async () => {
    setSocial({ friends: [friend('f1', 'dan'), friend('f2', 'sam', 'pending')] });
    const r = await render();

    expect(rowsFor(r, ['@dan'])).toHaveLength(1);
    expect(json(r)).not.toContain('@sam');
  });
});

describe('Circle — row actions', () => {
  it('tapping a row opens that friend’s profile at /friend/<id>', async () => {
    setSocial({ friends: [friend('f1', 'dan'), friend('f2', 'sam')] });
    const r = await render();

    await act(async () => {
      byLabel(r, label('openProfileA11y', { name: '@sam' }))[0].props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith('/friend/f2');
  });

  it('the Cheer pill lands on the most recently updated shared Journey', async () => {
    const sendCheer = jest.fn(async () => {});
    setSocial({
      friends: [friend('f1', 'dan')],
      allyProgress: [
        progress('f1', 'j-old', { updatedAt: 100 }),
        progress('f1', 'j-new', { updatedAt: 900 }),
      ],
      sendCheer,
    });
    const r = await render();

    await act(async () => {
      byLabel(r, label('cheerA11y', { name: '@dan' }))[0].props.onPress();
    });
    expect(sendCheer).toHaveBeenCalledWith('f1', 'j-new');
  });

  it('a friend with a Buddy name reads by that name, not their handle', async () => {
    setSocial({
      friends: [{ profile: { id: 'f1', handle: 'dan', buddySummary: { name: 'Pip' } }, status: 'accepted', direction: 'outgoing' }],
    });
    const r = await render();

    expect(rowsFor(r, ['Pip'])).toHaveLength(1);
  });
});

describe('Circle — empty and error states', () => {
  it('shows the calm empty state when nobody is in the circle yet', async () => {
    setSocial({ friends: [], allyProgress: [progress('stranger', 'j1')] });
    const r = await render();

    expect(json(r)).toContain(tKey('empty.title'));
    expect(json(r)).toContain(tKey('empty.body'));
    // Shared progress from someone who is NOT an accepted friend can never conjure a row.
    expect(json(r)).not.toContain('Run 5km');
  });

  it('surfaces a genuine failure in the banner, and never as an empty circle', async () => {
    setSocial({ error: 'Network request failed', friends: [friend('f1', 'dan')] });
    const r = await render();

    expect(json(r)).toContain('Network request failed');
    expect(rowsFor(r, ['@dan'])).toHaveLength(1);
  });

  it('does NOT show the expected guest "Not signed in." state as an error', async () => {
    setSocial({ error: 'Not signed in.', friends: [] });
    const r = await render();

    expect(json(r)).not.toContain('Not signed in.');
    expect(json(r)).toContain(tKey('empty.title'));
  });
});
