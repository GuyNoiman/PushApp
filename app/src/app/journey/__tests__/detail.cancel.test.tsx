/**
 * Journey detail — "Cancel this Journey" (Journey Abandonment).
 *
 * Renders the REAL detail screen with the REAL confirmation sheet over a mock AppCore
 * (react-test-renderer) to pin the consent surface and the lifecycle gating:
 *
 *  · Cancel lives behind the ⋯ overflow at the END of the action list, never as a visible row
 *    (founder decision 2026-08-14) — so every path here opens the menu first;
 *  · the confirmation opens and states the FACTUAL number of never-reported Steps it will remove;
 *  · confirming calls `AppCore.abandonJourney` (and only then — opening it changes nothing);
 *  · a COMPLETED Journey never offers Cancel (D41: completion is final);
 *  · a FUTURE Journey offers Delete and never Cancel — it never ran, so it is deleted, not canceled
 *    (founder decision 2026-08-14);
 *  · a canceled Journey shows its kept Steps and no progress bar.
 *
 * `t` is stubbed to echo its key (plus its interpolation options) so copy is asserted by i18n key and
 * the real count is visible; theme, safe-area and the heavier child cards are stubbed so the screen
 * renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import JourneyDetailScreen from '../[id]';
import type { Journey, Step } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'j1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  // journeyView imports the shared i18next instance at module load, which calls `.use()`.
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      opts ? `${k}|${JSON.stringify(opts)}` : k,
  }),
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
// The reminder / Circle / Dream cards reach for notifications + the social gateway; the cancel flow
// doesn't involve them, so they're stubbed to nothing.
jest.mock('@/components/journey/JourneyReminderCard', () => ({ JourneyReminderCard: () => null }));
jest.mock('@/components/journey/JourneySupportCircle', () => ({ JourneySupportCircle: () => null }));
jest.mock('@/components/journey/JourneyDreamLink', () => ({ JourneyDreamLink: () => null }));
jest.mock('@/components/celebration/FinalStepConfirmSheet', () => ({
  FinalStepConfirmSheet: () => null,
}));
const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

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

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
/**
 * The stubbed `t()` output as it appears INSIDE the stringified tree — the interpolation options are
 * JSON, so their quotes are escaped once more by the outer stringify.
 */
const tKey = (k: string, opts?: Record<string, unknown>) =>
  JSON.stringify(opts ? `${k}|${JSON.stringify(opts)}` : k).slice(1, -1);
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

/** A Journey with 2 lived Steps (one done, one checked in) and 2 that never happened. */
function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'active',
    steps: [
      step('s1', { done: true }),
      step('s2', { lastCheckInAt: 1_000 }),
      step('s3'),
      step('s4'),
    ],
    createdAt: 1_000,
    ...over,
  };
}

/** One Support-Circle member as `listJourneyAllies` returns it (only `status` matters here). */
function member(id: string, status: string) {
  return { profile: { id, handle: id }, bundle: 'encourager', status };
}

/**
 * The social pillar for one test. Default: OFF — the local cancel flow must be complete without it,
 * and every pre-existing test in this file runs that way.
 */
function setSocial(over: Record<string, unknown> = {}) {
  const social = {
    enabled: false,
    closeJourneyInvites: jest.fn(async () => {}),
    listJourneyAllies: jest.fn(async () => []),
    ...over,
  };
  mockSocial.current = social;
  return social;
}

beforeEach(() => setSocial());

function setApp(j: Journey) {
  const core = {
    getReasonLog: () => [],
    // Smart Notification Timing: the screen notes the view on mount; a no-op when the flag is off.
    noteJourneyViewed: jest.fn(),
    getStepStatus: () => 'unreported',
    willCompleteJourney: () => false,
    abandonJourney: jest.fn(() => j),
    deleteJourney: jest.fn(() => true),
    freezeJourney: jest.fn(() => j),
    resumeJourney: jest.fn(() => j),
    linkJourneyToDream: jest.fn(),
  };
  mockApp.current = { core, snapshot: { journeys: [j], dreams: [] } };
  return core;
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(JourneyDetailScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

/**
 * Open the ⋯ overflow at the end of the action list. Cancel and Delete live in there (founder
 * decision 2026-08-14), so every test that reaches one of them opens this first — and until it is
 * opened, neither action is in the tree at all, which is exactly the de-emphasis that was asked for.
 */
async function openMenu(r: TestRoot) {
  await act(async () => {
    byLabel(r, 'detail.moreActionsA11y')[0].props.onPress();
  });
}

/** Render, open the ⋯, and tap one of its items by accessibility label. */
async function tapMenuItem(r: TestRoot, label: string) {
  await openMenu(r);
  await act(async () => {
    byLabel(r, label)[0].props.onPress();
  });
}

describe('Journey detail — cancel', () => {
  it('opens a confirmation that states how many Steps will be removed, and removes nothing yet', async () => {
    const core = setApp(journey());
    const r = await render();

    // Nothing is confirmed before the user opens it — and Cancel isn't even on screen until the ⋯ is.
    expect(json(r)).not.toContain('detail.cancelConfirm.title');
    expect(byLabel(r, 'detail.cancelA11y')).toHaveLength(0);

    await tapMenuItem(r, 'detail.cancelA11y');

    const shown = json(r);
    expect(shown).toContain('detail.cancelConfirm.title');
    // The FACTUAL count: two Steps carry a record and stay, two never happened and go.
    expect(shown).toContain(tKey('detail.cancelConfirm.removes', { count: 2 }));
    // It says plainly that this can't be undone, and never dangles what the user would "lose".
    expect(shown).toContain('detail.cancelConfirm.final');
    expect(core.abandonJourney).not.toHaveBeenCalled();
  });

  it('says "no Steps left to remove" instead of a bare zero', async () => {
    setApp(journey({ steps: [step('s1', { done: true })] }));
    const r = await render();

    await tapMenuItem(r, 'detail.cancelA11y');

    expect(json(r)).toContain('detail.cancelConfirm.removesNone');
    expect(json(r)).not.toContain('detail.cancelConfirm.removes|');
  });

  it('calls abandonJourney only on confirm', async () => {
    const core = setApp(journey());
    const r = await render();

    await tapMenuItem(r, 'detail.cancelA11y');
    await act(async () => {
      byLabel(r, 'detail.cancelConfirm.confirmA11y')[0].props.onPress();
    });

    expect(core.abandonJourney).toHaveBeenCalledWith('j1');
    expect(core.deleteJourney).not.toHaveBeenCalled();
  });

  it('offers "Pause it instead" on a running Journey, and pausing never cancels', async () => {
    const core = setApp(journey());
    const r = await render();

    await tapMenuItem(r, 'detail.cancelA11y');
    await act(async () => {
      byLabel(r, 'detail.cancelConfirm.pauseInsteadA11y')[0].props.onPress();
    });

    expect(core.freezeJourney).toHaveBeenCalledWith('j1');
    expect(core.abandonJourney).not.toHaveBeenCalled();
  });

  it('never offers Cancel on a completed Journey (completion is final), only Delete', async () => {
    setApp(journey({ status: 'completed', completedAt: 5_000 }));
    const r = await render();
    await openMenu(r);

    expect(byLabel(r, 'detail.cancelA11y')).toHaveLength(0);
    expect(byLabel(r, 'detail.deleteA11y').length).toBeGreaterThan(0);
  });

  it('never offers Cancel on an already-canceled Journey, only Delete', async () => {
    setApp(journey({ status: 'abandoned', stepsAtAbandon: 12 }));
    const r = await render();
    await openMenu(r);

    expect(byLabel(r, 'detail.cancelA11y')).toHaveLength(0);
    expect(byLabel(r, 'detail.deleteA11y').length).toBeGreaterThan(0);
  });

  it('offers Delete and NOT Cancel on a Future Journey — it never ran, so it disappears', async () => {
    setApp(journey({ status: 'future', startsAt: Date.now() + 7 * 24 * 3600 * 1000 }));
    const r = await render();
    await openMenu(r);

    expect(byLabel(r, 'detail.cancelA11y')).toHaveLength(0);
    expect(byLabel(r, 'detail.deleteA11y').length).toBeGreaterThan(0);
  });

  it('reads a canceled Journey as read-only history: kept Steps, no check-in, no pause', async () => {
    // What the engine leaves behind: the lived Steps, the unlived ones spliced away, and the honest
    // denominator latched in `stepsAtAbandon`.
    setApp(
      journey({
        status: 'abandoned',
        stepsAtAbandon: 12,
        steps: [step('s1', { done: true }), step('s2', { lastCheckInAt: 1_000, dropped: true })],
      }),
    );
    const r = await render();

    const shown = json(r);
    expect(shown).toContain('detail.whatHappened');
    // Both kept Steps are shown, including the one shed from scope by the cancel.
    expect(shown).toContain('Step s1');
    expect(shown).toContain('Step s2');
    // The honest count, against the Steps it held when it was stopped.
    expect(shown).toContain(tKey('detail.stepsDone', { done: 1, total: 12 }));
    // Nothing asks for more work, and there is no Phase read-out to imply progress.
    expect(byLabel(r, 'detail.freezeA11y')).toHaveLength(0);
    expect(byLabel(r, 'detail.resumeA11y')).toHaveLength(0);
    expect(shown).not.toContain('detail.phase');
    expect(shown).not.toContain('detail.checkIn');
  });
});

/**
 * The ⋯ overflow at the end of the action list (founder decision, 2026-08-14). Cancel is a heavy
 * action, so it is de-emphasised by POSITION — last in the list, one tap deeper — and never by
 * warning iconography: a prohibition symbol on a legitimate life choice would tell the user they are
 * not allowed to stop, which is the same thing the confirmation copy refuses to do.
 */
describe('Journey detail — the ⋯ overflow menu', () => {
  /**
   * Every action item currently in the open menu, in render order. `findAllByProps` returns the
   * composite AND the host node for the same Pressable, so consecutive repeats are collapsed.
   */
  const menuItems = (r: TestRoot) =>
    r.root
      .findAllByProps({ accessibilityRole: 'button' })
      .map((n) => n.props.accessibilityLabel as string)
      .filter((l) => l === 'detail.cancelA11y' || l === 'detail.deleteA11y')
      .filter((l, i, all) => l !== all[i - 1]);

  it('keeps Cancel and Delete off the screen until the ⋯ is opened', async () => {
    setApp(journey());
    const r = await render();

    expect(byLabel(r, 'detail.moreActionsA11y').length).toBeGreaterThan(0);
    expect(byLabel(r, 'detail.cancelA11y')).toHaveLength(0);
    expect(byLabel(r, 'detail.deleteA11y')).toHaveLength(0);
    // Pause stays VISIBLE — it is reversible and everyday, so it never moves into the overflow.
    expect(byLabel(r, 'detail.freezeA11y').length).toBeGreaterThan(0);
  });

  it('lists Cancel before Delete — the record-keeping exit ahead of the erase', async () => {
    setApp(journey());
    const r = await render();
    await openMenu(r);

    expect(menuItems(r)).toEqual(['detail.cancelA11y', 'detail.deleteA11y']);
  });

  it('uses no prohibition icon on either action', async () => {
    setApp(journey());
    const r = await render();
    await openMenu(r);

    // Ordinary destructive-action iconography only: a stop glyph and a trash can. Anything from the
    // "ban / close-circle / remove-circle" family would put judgement on the choice.
    expect(r.root.findAllByProps({ name: 'stop-circle-outline' }).length).toBeGreaterThan(0);
    expect(r.root.findAllByProps({ name: 'trash-outline' }).length).toBeGreaterThan(0);
    for (const forbidden of ['ban', 'ban-outline', 'close-circle', 'close-circle-outline', 'remove-circle', 'remove-circle-outline']) {
      expect(r.root.findAllByProps({ name: forbidden })).toHaveLength(0);
    }
  });

  it('tapping Delete opens the delete confirmation, and deletes nothing before it is confirmed', async () => {
    const core = setApp(journey());
    const r = await render();

    await tapMenuItem(r, 'detail.deleteA11y');
    expect(json(r)).toContain('detail.deleteConfirmTitle');
    expect(core.deleteJourney).not.toHaveBeenCalled();
  });
});

/**
 * The Support Circle disclosure (PRD §8.4.4). The rule is the same one DeleteAccountSheet set: a
 * consequence is stated only when it is TRUE and KNOWN. Unlike the remove-friend sheet, the counts
 * never gate the destructive action — canceling is local and must work offline.
 */
describe('Journey detail — cancel: who else is affected', () => {
  const open = async () => {
    const r = await render();
    await tapMenuItem(r, 'detail.cancelA11y');
    return r;
  };

  it('states the REAL counts: who stops seeing it, and which invitations are withdrawn', async () => {
    const social = setSocial({
      enabled: true,
      listJourneyAllies: jest.fn(async () => [
        member('a1', 'accepted'),
        member('a2', 'accepted'),
        member('a3', 'requested'),
        // Neither of these is a live consequence, so neither is counted.
        member('a4', 'declined'),
        member('a5', 'closed'),
      ]),
    });
    setApp(journey());
    const r = await open();

    const shown = json(r);
    expect(shown).toContain(tKey('detail.cancelConfirm.circleStops', { count: 2 }));
    expect(shown).toContain(tKey('detail.cancelConfirm.invitesWithdrawn', { count: 1 }));
    expect(social.listJourneyAllies).toHaveBeenCalledWith('j1');
  });

  it('says nothing about a Circle nobody is in', async () => {
    setSocial({ enabled: true, listJourneyAllies: jest.fn(async () => []) });
    setApp(journey());
    const r = await open();

    expect(json(r)).not.toContain('detail.cancelConfirm.circleStops');
    expect(json(r)).not.toContain('detail.cancelConfirm.invitesWithdrawn');
  });

  it('says nothing WHILE the read is in flight — a number is shown only once it is known', async () => {
    setSocial({ enabled: true, listJourneyAllies: jest.fn(() => new Promise(() => {})) });
    setApp(journey());
    const r = await open();

    const shown = json(r);
    // The rest of the confirmation is fully usable meanwhile; only the Circle line waits.
    expect(shown).toContain('detail.cancelConfirm.title');
    expect(shown).not.toContain('detail.cancelConfirm.circleStops');
    expect(shown).not.toContain('detail.cancelConfirm.invitesWithdrawn');
  });

  it('stays silent when the read FAILS, and the cancel still goes through (offline-safe)', async () => {
    setSocial({
      enabled: true,
      listJourneyAllies: jest.fn(async () => {
        throw new Error('offline');
      }),
    });
    const core = setApp(journey());
    const r = await open();

    expect(json(r)).not.toContain('detail.cancelConfirm.circleStops');
    await act(async () => {
      byLabel(r, 'detail.cancelConfirm.confirmA11y')[0].props.onPress();
    });
    expect(core.abandonJourney).toHaveBeenCalledWith('j1');
  });

  it('reads nothing at all with the social pillar off, or before the sheet is opened', async () => {
    const social = setSocial({ enabled: true });
    setApp(journey());
    await render();
    // Opening a Journey talks to nobody; the read is scoped to the open confirmation.
    expect(social.listJourneyAllies).not.toHaveBeenCalled();

    const off = setSocial({ enabled: false });
    setApp(journey());
    const r = await open();
    expect(off.listJourneyAllies).not.toHaveBeenCalled();
    expect(json(r)).not.toContain('detail.cancelConfirm.circleStops');
  });
});
