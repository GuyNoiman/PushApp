/**
 * JourneySupportCircle — the owner's Support-Circle panel (Journey Support Circle, D2).
 *
 * Renders the REAL component over a MOCK SocialProvider (react-test-renderer) to prove the
 * presentational contract:
 *   (a) member rows show each member's name + status label;
 *   (b) the invite sheet offers only invitable friends — accepted friends who aren't already
 *       members (existing members + non-accepted friends are filtered out);
 *   (c) the Companion option is disabled on a manual Journey, enabled on a coach Journey;
 *   (d) picking a friend + the default (Encourager) bundle calls `inviteAlly(journeyId, id, 'encourager')`;
 *   (e) the Invite CTA is hidden on a completed AND on a frozen Journey (members still render);
 *   (f) a failed load shows the retry line, never the empty "no members yet" state.
 *
 * The Companion gate + `resolveJourneyStatus` are the REAL pure helpers; only the provider and
 * theme are mocked. `t` is stubbed to echo its key so labels are asserted by i18n key.
 */
import { createElement, type ReactElement } from 'react';

import { JourneySupportCircle } from '../JourneySupportCircle';
import type { AllyBundle, AllyInviteStatus, AllyMember, Friend, SocialProfile } from '@/core/social';
import type { Journey } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
// Keep the REAL pure Companion helper the panel calls (isCompanionEligible) but drop the Supabase
// gateway barrel so the AsyncStorage/Supabase native chain never loads under jest.
jest.mock('@/core/social', () => ({ ...jest.requireActual('@/core/social/companion') }));
// The provider the panel reads/acts through. A mutable ref lets each test set its own state.
const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));
// Echo the i18n key so we can assert on keys without booting i18next.
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
// Theme pulls in ThemePreference/color-scheme; a proxy returns a colour for any token.
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));

// react-test-renderer ships no types; type just the surface used here.
interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): unknown;
  unmount(): void;
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
function accepted(id: string, handle: string): Friend {
  return { profile: profile(id, handle), status: 'accepted', direction: 'outgoing' };
}
function member(id: string, handle: string, bundle: AllyBundle, status: AllyInviteStatus): AllyMember {
  return { profile: profile(id, handle), bundle, status };
}
function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: { type: 'daily' },
    steps: [],
    createdAt: 0,
    createdVia: 'manual',
    status: 'active',
    ...overrides,
  } as unknown as Journey;
}

function setSocial(overrides: Record<string, unknown> = {}) {
  mockSocial.current = {
    enabled: true,
    friends: [],
    listJourneyAllies: jest.fn(async () => []),
    inviteAlly: jest.fn(async () => {}),
    cancelInvite: jest.fn(async () => {}),
    removeAlly: jest.fn(async () => {}),
    changeAllyBundle: jest.fn(async () => {}),
    ...overrides,
  };
}

/** Mount the panel and flush the mount-time listJourneyAllies read. */
async function mount(j: Journey, status?: Journey['status']): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(
      createElement(JourneySupportCircle, { journey: j, journeyStatus: status }),
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
  if (!r) throw new Error('render failed');
  return r;
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
// findAllByProps returns each Pressable's composite + forwarded host View; the composite carries a
// function `onPress`. Filter to it so a match is one logical element (and pressable).
const byLabel = (r: TestRoot, label: string) =>
  r.root
    .findAllByProps({ accessibilityLabel: label })
    .filter((n) => typeof n.props.onPress === 'function');
const has = (r: TestRoot, label: string) => byLabel(r, label).length > 0;
/** Press the first element carrying this accessibility label, flushing any async handler. */
async function press(r: TestRoot, label: string) {
  await act(async () => {
    byLabel(r, label)[0].props.onPress();
    await Promise.resolve();
  });
}
/** Open the invite sheet — RN Modal only mounts its children once visible. */
const openInvite = (r: TestRoot) => press(r, 'supportCircle.inviteA11y');

beforeEach(() => jest.clearAllMocks());

describe('JourneySupportCircle — members + invite surface (D2)', () => {
  it('(a) renders member rows with their status labels', async () => {
    setSocial({
      listJourneyAllies: jest.fn(async () => [
        member('a1', 'alice', 'encourager', 'accepted'),
        member('a2', 'bob', 'companion', 'requested'),
      ]),
    });
    const r = await mount(journey());
    expect(json(r)).toContain('@alice');
    expect(json(r)).toContain('@bob');
    expect(json(r)).toContain('supportCircle.status.accepted');
    expect(json(r)).toContain('supportCircle.status.requested');
  });

  it('(b) invite sheet lists only invitable friends (drops members + non-accepted)', async () => {
    setSocial({
      friends: [
        accepted('a1', 'alice'),
        accepted('a2', 'bob'),
        { profile: profile('a3', 'carol'), status: 'pending', direction: 'incoming' },
      ],
      listJourneyAllies: jest.fn(async () => [member('a2', 'bob', 'encourager', 'accepted')]),
    });
    const r = await mount(journey());
    await openInvite(r);
    // alice is invitable; bob is already a member; carol isn't an accepted friend.
    expect(has(r, '@alice')).toBe(true);
    expect(has(r, '@bob')).toBe(false);
    expect(has(r, '@carol')).toBe(false);
  });

  it('(c) Companion is disabled on a manual Journey, enabled on a coach Journey', async () => {
    setSocial({ friends: [accepted('a1', 'alice')] });

    const manual = await mount(journey({ createdVia: 'manual' }));
    await openInvite(manual);
    expect(byLabel(manual, 'supportCircle.companion')[0].props.accessibilityState.disabled).toBe(true);

    const coach = await mount(journey({ createdVia: 'coach' }));
    await openInvite(coach);
    expect(byLabel(coach, 'supportCircle.companion')[0].props.accessibilityState.disabled).toBe(false);
  });

  it('(d) selecting a friend + Encourager sends inviteAlly with the encourager bundle', async () => {
    const inviteAlly = jest.fn(async () => {});
    setSocial({ friends: [accepted('a1', 'alice')], inviteAlly });
    const r = await mount(journey());

    await openInvite(r);
    await press(r, '@alice'); // select the friend (default bundle is Encourager)
    await press(r, 'supportCircle.send');
    expect(inviteAlly).toHaveBeenCalledWith('j1', 'a1', 'encourager');
  });

  it('(e) hides the Invite CTA on a completed AND a frozen Journey; members still render', async () => {
    setSocial({
      listJourneyAllies: jest.fn(async () => [member('a1', 'alice', 'encourager', 'accepted')]),
    });

    const done = await mount(journey({ status: 'completed' }), 'completed');
    expect(byLabel(done, 'supportCircle.inviteA11y')).toHaveLength(0);
    expect(json(done)).toContain('supportCircle.closedForCompleted');
    expect(json(done)).toContain('@alice'); // existing members still render

    const frozen = await mount(journey({ status: 'frozen' }), 'frozen');
    expect(byLabel(frozen, 'supportCircle.inviteA11y')).toHaveLength(0);
    expect(json(frozen)).toContain('supportCircle.pausedNote');
    expect(json(frozen)).toContain('@alice'); // existing members still render
  });

  it('(f) a failed load shows the retry line, not the empty state', async () => {
    setSocial({
      listJourneyAllies: jest.fn(async () => {
        throw new Error('offline');
      }),
    });
    const r = await mount(journey());
    expect(has(r, 'supportCircle.retry')).toBe(true);
    expect(json(r)).toContain('supportCircle.loadError');
    expect(json(r)).not.toContain('supportCircle.empty');
  });
});
