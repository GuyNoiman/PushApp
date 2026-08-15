/**
 * Journey detail — FUTURE mode (Future Journey Management, §7–§9).
 *
 * Renders the REAL detail screen over a mock AppCore (react-test-renderer) to pin what a Journey
 * saved for later shows, and what it must never show:
 *
 *  · the PLANNED window in place of progress — no Phase, no bar, no percentage, no "N of M done";
 *  · a calm banner that says it hasn't started, and, once its day has come around, the neutral
 *    "ready when you are" wording — never late, never overdue, never behind;
 *  · ONE "Start Journey" action, behind ONE confirmation that states the effective start and, when
 *    starting a scheduled Journey early, the resulting plan shift. Nothing activates before confirm;
 *  · Steps are read-only: no check-in CTA and no "next" Step to act on;
 *  · Pause is hidden (there is nothing running to pause), while Edit and Delete stay available.
 *
 * `t` is stubbed to echo its key (plus its interpolation options); theme, safe-area and the heavier
 * child cards are stubbed so the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import JourneyDetailScreen from '../[id]';
import { shortDate } from '@/components/journey/journeyView';
import type { Journey, Step } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'j1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
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
jest.mock('@/components/journey/JourneyReminderCard', () => ({ JourneyReminderCard: () => null }));
jest.mock('@/components/journey/JourneySupportCircle', () => ({ JourneySupportCircle: () => null }));
jest.mock('@/components/journey/JourneyDreamLink', () => ({ JourneyDreamLink: () => null }));
jest.mock('@/components/celebration/FinalStepConfirmSheet', () => ({
  FinalStepConfirmSheet: () => null,
}));
jest.mock('@/state/SocialProvider', () => ({
  useSocial: () => ({ enabled: false, closeJourneyInvites: jest.fn(async () => {}) }),
}));

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
/** The stubbed `t()` output as it appears INSIDE the stringified tree (quotes escaped once more). */
const tKey = (k: string, opts?: Record<string, unknown>) =>
  JSON.stringify(opts ? `${k}|${JSON.stringify(opts)}` : k).slice(1, -1);
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });

const DAY = 24 * 60 * 60 * 1000;

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

/** A Future Journey exactly as the engine stores one: complete, approved, and inactive. */
function futureJourney(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'future',
    steps: [step('s1'), step('s2'), step('s3')],
    createdAt: 1_000,
    ...over,
  };
}

function setApp(j: Journey) {
  const core = {
    getReasonLog: () => [],
    noteJourneyViewed: jest.fn(),
    getStepStatus: () => 'unreported',
    willCompleteJourney: () => false,
    startJourneyNow: jest.fn(() => j),
    abandonJourney: jest.fn(() => j),
    deleteJourney: jest.fn(() => true),
    freezeJourney: jest.fn(() => j),
    resumeJourney: jest.fn(() => j),
    checkInStep: jest.fn(),
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

/** Tap "Start Journey" to open the confirmation. */
async function openStart(r: TestRoot) {
  await act(async () => {
    byLabel(r, 'detail.startJourneyA11y')[0].props.onPress();
  });
}

describe('Journey detail — a Future Journey shows its plan, never progress', () => {
  it('shows the planned window and the Step count, with no Phase, bar or percentage', async () => {
    const startsAt = Date.now() + 10 * DAY;
    setApp(futureJourney({ startsAt }));
    const r = await render();

    const shown = json(r);
    expect(shown).toContain(
      tKey('detail.futureWindow', {
        start: shortDate(startsAt),
        end: shortDate(startsAt + 30 * DAY),
      }),
    );
    expect(shown).toContain(tKey('detail.stepsPlanned', { count: 3 }));
    expect(shown).not.toContain('detail.phase');
    expect(shown).not.toContain('detail.stepsDone');
    expect(shown).not.toContain('%');
  });

  it('describes a manual-start Journey by its length, since it has no date', async () => {
    setApp(futureJourney());
    const r = await render();

    const shown = json(r);
    expect(shown).toContain(tKey('detail.futureLength', { count: 30 }));
    expect(shown).toContain('detail.futureManualBody');
    expect(shown).not.toContain('detail.futureWindow');
  });

  it('uses the neutral "ready when you are" state once the day has passed', async () => {
    setApp(futureJourney({ startsAt: Date.now() - 12 * DAY }));
    const r = await render();

    const shown = json(r);
    expect(shown).toContain('detail.futureReadyBody');
    expect(shown.toLowerCase()).not.toContain('overdue');
    expect(shown.toLowerCase()).not.toContain('behind');
  });

  it('keeps the Steps read-only: no check-in CTA and no "next" Step', async () => {
    setApp(futureJourney({ startsAt: Date.now() + 3 * DAY }));
    const r = await render();

    const shown = json(r);
    // The Steps are still listed (a Future Journey is a complete plan, and it is inspectable)…
    expect(shown).toContain('Step s1');
    // …but nothing asks for one. (Matched as a whole rendered string so the week pager's
    // `detail.nextWeekA11y` label isn't mistaken for the "Next" Step marker.)
    expect(shown).not.toContain('detail.checkIn');
    expect(shown).not.toContain('["detail.next"]');
  });

  it('hides Pause, and keeps Edit and Delete available (§8)', async () => {
    setApp(futureJourney());
    const r = await render();

    expect(byLabel(r, 'detail.freezeA11y')).toHaveLength(0);
    expect(byLabel(r, 'detail.resumeA11y')).toHaveLength(0);

    await act(async () => {
      byLabel(r, 'detail.moreActionsA11y')[0].props.onPress();
    });
    expect(byLabel(r, 'detail.deleteA11y').length).toBeGreaterThan(0);
  });
});

describe('Journey detail — Start Journey (§9)', () => {
  it('requires ONE confirmation, and activates nothing before it', async () => {
    const core = setApp(futureJourney({ startsAt: Date.now() + 10 * DAY }));
    const r = await render();

    expect(json(r)).not.toContain('detail.startConfirm.title');
    await openStart(r);

    expect(json(r)).toContain('detail.startConfirm.title');
    expect(core.startJourneyNow).not.toHaveBeenCalled();

    await act(async () => {
      byLabel(r, 'detail.startConfirm.confirmA11y')[0].props.onPress();
    });
    expect(core.startJourneyNow).toHaveBeenCalledWith('j1');
  });

  it('changes nothing when the confirmation is dismissed', async () => {
    const core = setApp(futureJourney());
    const r = await render();

    await openStart(r);
    await act(async () => {
      byLabel(r, 'detail.startConfirm.dismiss')[0].props.onPress();
    });

    expect(core.startJourneyNow).not.toHaveBeenCalled();
  });

  it('states the resulting plan shift when a scheduled Journey is started early', async () => {
    const startsAt = Date.now() + 10 * DAY;
    setApp(futureJourney({ startsAt }));
    const r = await render();
    await openStart(r);

    expect(json(r)).toContain(
      tKey('detail.startConfirm.shift', { count: 10, planned: shortDate(startsAt) }),
    );
  });

  it('states no shift for a manual-start Journey, or one whose day has come around', async () => {
    setApp(futureJourney());
    const manual = await render();
    await openStart(manual);
    expect(json(manual)).toContain('detail.startConfirm.window');
    expect(json(manual)).not.toContain('detail.startConfirm.shift');

    setApp(futureJourney({ startsAt: Date.now() - 4 * DAY }));
    const ready = await render();
    await openStart(ready);
    expect(json(ready)).not.toContain('detail.startConfirm.shift');
  });

  it('offers no Start action on a Journey that is already running', async () => {
    setApp(futureJourney({ status: 'active' }));
    const r = await render();

    expect(byLabel(r, 'detail.startJourneyA11y')).toHaveLength(0);
    expect(json(r)).toContain('detail.phase');
  });
});
