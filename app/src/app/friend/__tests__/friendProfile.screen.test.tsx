/**
 * Friend Profile screen (Friend_Profile_PRD.md §4/§6) — the four states, and the discipline about
 * what a profile may say about a real person.
 *
 * Renders the REAL screen over a MOCK SocialProvider (react-test-renderer). The load contract it
 * pins down: `loadFriendProfile` REJECTS, it never resolves to null, so the screen branches on the
 * error TYPE —
 *   · `NotFriendsError`  → the calm "not connected" card with ZERO data (no handle, no name, no
 *     Journey row). Its `.message` is English and is never rendered;
 *   · anything else      → the error card + Retry, which re-asks with `{ force: true }`;
 *   · resolved           → loaded. There is no stale-render path by design.
 *
 * And the omissions, which are decisions rather than gaps (PRD §4.6, founder 2026-08-13): no Level,
 * no Achievements entry, and no message action (D29/D40). Those are asserted as ABSENCES here so a
 * future "small addition" trips a test rather than shipping.
 *
 * `t` echoes its key + interpolation options; theme, safe-area and the addressed-`t` hook are stubbed
 * so the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import FriendProfileScreen from '../[id]';
import { NotFriendsError } from '@/core/social/SocialGateway';
import type { AllyProgress, FriendProfileView, SocialProfile } from '@/core/social/SocialGateway';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'friend-1' }),
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace, canGoBack: () => true }),
}));
const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));
const echo = (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: echo }) }));
// The addressed `t` (D31) reads the user's form of address from ProfileProvider; stub the hook so
// the profile screen doesn't need that provider just to render two cards.
jest.mock('@/i18n/useAddressedTranslation', () => ({ useAddressedTranslation: () => ({ t: echo }) }));
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
/**
 * The friend as the wire delivers them, with the two fields the MVP slice deliberately does NOT
 * render: `buddySummary.level` (Level, deferred with B1) and `stage`. Distinctive values, so a
 * regression that starts rendering either is unmissable in the tree.
 */
const FRIEND: SocialProfile = {
  id: 'friend-1',
  handle: 'sam',
  buddySummary: { name: 'Pip', stage: 'STAGE-SPROUT', level: 87 },
};

function journey(overrides: Partial<AllyProgress> = {}): AllyProgress {
  return {
    owner: FRIEND,
    journeyId: 'j1',
    title: 'Run 5km',
    progress: 0.4,
    streak: 3,
    updatedAt: 1_000,
    visibility: 'full',
    ...overrides,
  };
}

function view(overrides: Partial<FriendProfileView> = {}): FriendProfileView {
  return {
    profile: FRIEND,
    relationship: { theySupportMe: 1, iSupportThem: 2, total: 3, lifecycle: null },
    sharedActive: [journey()],
    fetchedAt: Date.now(),
    ...overrides,
  };
}

function setSocial(overrides: Record<string, unknown> = {}) {
  mockSocial.current = {
    enabled: true,
    error: null,
    loadFriendProfile: jest.fn(async () => view()),
    loadUnfriendImpact: jest.fn(async () => ({
      journeysTheySupportForMe: 0,
      journeysISupportForThem: 0,
      pendingInvites: 0,
    })),
    removeFriend: jest.fn(async () => {}),
    sendCheer: jest.fn(async () => {}),
    ...overrides,
  };
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
/** The same string as it appears inside the stringified tree (quotes escaped once more). */
const tKey = (k: string, opts?: Record<string, unknown>) => JSON.stringify(echo(k, opts)).slice(1, -1);
/**
 * The @handle as it lands in the tree. The header renders it through `isolate()`, which wraps the
 * whole "@sam" in Unicode isolate marks so a Latin handle can't be reordered by RTL copy around it —
 * so it arrives as ONE contiguous string, bracketed by FSI…PDI.
 */
const HANDLE = '⁨@sam⁩';
// findAllByProps returns each Pressable's composite + forwarded host View; the composite carries a
// function `onPress`. Filter to it so a match is one logical element (and pressable).
const byLabel = (r: TestRoot, a11yLabel: string) =>
  r.root.findAllByProps({ accessibilityLabel: a11yLabel }).filter((n) => typeof n.props.onPress === 'function');

/** Mount the screen and flush the load-on-mount effect. */
async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(FriendProfileScreen));
  });
  await act(async () => {
    await Promise.resolve();
  });
  if (!r) throw new Error('render failed');
  return r;
}

/** Press the first element carrying this accessibility label, flushing any async handler. */
async function press(r: TestRoot, a11yLabel: string) {
  await act(async () => {
    byLabel(r, a11yLabel)[0].props.onPress();
    await Promise.resolve();
  });
}

beforeEach(() => jest.clearAllMocks());

describe('Friend Profile — loading → loaded', () => {
  it('shows the spinner while the friendship is being verified, then the profile', async () => {
    // A load that never settles keeps the screen in its first state.
    setSocial({ loadFriendProfile: jest.fn(() => new Promise<FriendProfileView>(() => {})) });
    let pending: TestRoot | undefined;
    await act(async () => {
      pending = TestRenderer.create(createElement(FriendProfileScreen));
    });
    expect(json(pending!)).toContain(tKey('loadingA11y'));
    expect(json(pending!)).not.toContain('Pip');

    setSocial();
    const r = await render();
    expect(json(r)).not.toContain(tKey('loadingA11y'));
    expect(json(r)).toContain('Pip');
  });

  it('renders identity, the relationship counts and the shared Journey', async () => {
    setSocial();
    const r = await render();
    const shown = json(r);

    expect(shown).toContain('Pip'); // Buddy name as the display name
    expect(shown).toContain(HANDLE); // the public handle
    expect(shown).toContain(tKey('relationship.title'));
    expect(shown).toContain(tKey('shared.title'));
    expect(shown).toContain('Run 5km');
    // 0.4 published progress, as the visible label (two text children) AND the bar width.
    expect(shown).toContain('["40","%"]');
    expect(shown).toContain('"width":"40%"');
    expect(shown).toContain(tKey('shared.streak', { days: 3 }));
  });

  it('renders a MASKED (Encourager) Journey with the neutral placeholder, never a guess', async () => {
    setSocial({
      loadFriendProfile: jest.fn(async () =>
        view({ sharedActive: [journey({ title: null, visibility: 'progress' })] }),
      ),
    });
    const r = await render();

    expect(json(r)).toContain(tKey('shared.aJourney'));
    expect(json(r)).not.toContain('Run 5km');
  });
});

describe('Friend Profile — the two rejection states (loadFriendProfile never returns null)', () => {
  it('a generic rejection shows the error card + Retry, and Retry re-asks with force', async () => {
    const loadFriendProfile = jest
      .fn<Promise<FriendProfileView>, [string, { force?: boolean }?]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(view());
    setSocial({ loadFriendProfile });
    const r = await render();

    expect(json(r)).toContain(tKey('error.title'));
    expect(json(r)).toContain(tKey('error.body'));
    // The raw gateway string is English-only and covers the expected guest state — never rendered.
    expect(json(r)).not.toContain('offline');

    await press(r, 'error.retry');
    expect(loadFriendProfile).toHaveBeenLastCalledWith('friend-1', { force: true });
    expect(json(r)).toContain('Pip');
    expect(json(r)).not.toContain(tKey('error.title'));
  });

  it('NotFriendsError shows the calm not-connected card with ZERO data', async () => {
    setSocial({ loadFriendProfile: jest.fn(async () => { throw new NotFriendsError(); }) });
    const r = await render();
    const shown = json(r);

    expect(shown).toContain(tKey('notConnected.title'));
    expect(shown).toContain(tKey('notConnected.body'));
    // Nothing about the person: not their name, not their handle, not one Journey row.
    expect(shown).not.toContain('Pip');
    expect(shown).not.toContain(HANDLE);
    expect(shown).not.toContain('Run 5km');
    expect(shown).not.toContain(tKey('shared.title'));
    expect(shown).not.toContain(tKey('relationship.title'));
    // It is an authorization STATE, not a failure: no error card, and no Retry to hammer.
    expect(shown).not.toContain(tKey('error.title'));
    expect(byLabel(r, 'error.retry')).toHaveLength(0);
  });

  it('never renders the English NotFriendsError message — the screen branches on the TYPE', async () => {
    const thrown = new NotFriendsError();
    setSocial({ loadFriendProfile: jest.fn(async () => { throw thrown; }) });
    const r = await render();

    expect(thrown.message).toBe('You are not connected with this person.');
    expect(json(r)).not.toContain(thrown.message);
  });

  it('offers no actions menu at all while there is no loaded profile', async () => {
    setSocial({ loadFriendProfile: jest.fn(async () => { throw new NotFriendsError(); }) });
    const r = await render();

    expect(byLabel(r, tKey('moreActionsA11y', { name: '' }))).toHaveLength(0);
    expect(json(r)).not.toContain('moreActionsA11y');
  });
});

describe('Friend Profile — the actions the menu may offer (PRD §4.5, D29/D40)', () => {
  /** Open the overflow menu — RN Modal only mounts its children once visible. */
  const openMenu = (r: TestRoot) => press(r, echo('moreActionsA11y', { name: 'Pip' }));

  it('offers Cheer + Remove when a Journey is shared, and NEVER a message action', async () => {
    setSocial();
    const r = await render();
    await openMenu(r);
    const shown = json(r);

    expect(shown).toContain(tKey('actions.cheer'));
    expect(shown).toContain(tKey('actions.remove'));
    // Direct messaging is deferred: the seam is the FriendAction union, not a greyed-out control,
    // so there is no message item and no i18n key for one.
    expect(shown).not.toContain('actions.message');
    expect(shown.toLowerCase()).not.toContain('message');
  });

  it('drops Cheer when nothing is shared — the database would refuse it', async () => {
    setSocial({ loadFriendProfile: jest.fn(async () => view({ sharedActive: [] })) });
    const r = await render();
    await openMenu(r);

    expect(json(r)).not.toContain(tKey('actions.cheer'));
    expect(json(r)).toContain(tKey('actions.remove'));
  });

  it('Cheer lands on the FIRST shared Journey — the one the gateway returns most-recent-first', async () => {
    const sendCheer = jest.fn(async () => {});
    setSocial({
      loadFriendProfile: jest.fn(async () =>
        view({
          // `sharedJourneysFrom` already sorted these; the screen trusts that order rather than
          // re-sorting a list the server authorized and ordered.
          sharedActive: [
            journey({ journeyId: 'j-new', updatedAt: 900 }),
            journey({ journeyId: 'j-old', updatedAt: 100 }),
          ],
        }),
      ),
      sendCheer,
    });
    const r = await render();
    await openMenu(r);
    await press(r, echo('actions.cheer'));

    expect(sendCheer).toHaveBeenCalledWith('friend-1', 'j-new');
  });

  it('Remove friend runs the removal and LEAVES the now-unreachable profile', async () => {
    const removeFriend = jest.fn(async () => {});
    setSocial({ removeFriend });
    const r = await render();

    await openMenu(r);
    await press(r, echo('actions.remove'));
    // The sheet reads the real impact counts before it will unlock (PRD §4.5).
    expect(mockSocial.current.loadUnfriendImpact).toHaveBeenCalledWith('friend-1');
    await press(r, echo('remove.acknowledge'));
    await press(r, echo('remove.confirm'));

    expect(removeFriend).toHaveBeenCalledWith('friend-1');
    // The provider purged the cache and refreshed the Circle; re-rendering this profile as "not
    // connected" would be a jump-scare, so the screen goes back instead.
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Friend Profile — what a profile must NOT say about a person (PRD §4.6)', () => {
  it('renders no Level and no Achievements entry', async () => {
    setSocial();
    const r = await render();
    const shown = json(r);

    // The Level seam stays on the wire (`buddySummary.level`); nothing reads it.
    expect(shown).not.toContain('87');
    expect(shown.toLowerCase()).not.toContain('level');
    expect(shown.toLowerCase()).not.toContain('achievement');
    expect(shown.toLowerCase()).not.toContain('badge');
    expect(shown.toLowerCase()).not.toContain('xp');
  });

  it('renders nothing beyond handle, Buddy summary name, and each Journey’s title/progress/streak', async () => {
    // Fields `public.profiles` cannot even hold, smuggled in to prove the screen never echoes an
    // unknown field it was handed.
    const smuggled = {
      ...FRIEND,
      email: 'sam@example.com',
      country: 'IL',
      gender: 'f',
      addressForm: 'feminine',
      authProvider: 'apple',
    } as unknown as SocialProfile;
    setSocial({ loadFriendProfile: jest.fn(async () => view({ profile: smuggled })) });
    const r = await render();
    const shown = json(r);

    for (const secret of ['sam@example.com', 'IL', 'apple', 'feminine', 'STAGE-SPROUT']) {
      expect(shown).not.toContain(secret);
    }
    // What IS allowed still renders.
    expect(shown).toContain('Pip');
    expect(shown).toContain(HANDLE);
    expect(shown).toContain('Run 5km');
  });
});
