/**
 * Journeys — the Future tab (Future Journey Management, §7 / §10 / §12).
 *
 * Renders the REAL Journeys screen over a mock snapshot (react-test-renderer) to pin what a Journey
 * saved for later must and must not say:
 *
 *  · real Future Journeys are the tab's primary content — the hard-coded sample is long gone, and
 *    they arrive in the pure selector's order (scheduled by nearest start, then manual-start);
 *  · a Future card shows NO progress signal of any kind: no bar, no percentage, no Milestone count,
 *    no "ends in…" projection. It shows its Dream, its name, one start line, and a calendar chip;
 *  · a scheduled Journey whose day passed while activation was blocked reads "ready when you are" —
 *    never late, never overdue, never behind;
 *  · Future Journeys and PARKED GOALS stay structurally distinct: the parked ideas keep their own
 *    "Ideas for later" heading and their own card, and neither is ever presented as the other;
 *  · the capacity line appears at the review threshold and at the cap, and NOTHING on this tab is
 *    blocked by either.
 *
 * `t` is stubbed to echo its key (plus its interpolation options); theme and safe-area are stubbed so
 * the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import JourneysScreen from '../journeys';
import { shortDate } from '@/components/journey/journeyView';
import { FUTURE_JOURNEY_POLICY } from '@/core/config/futureJourneys';
import { futureCapacity } from '@/core/journeys/futureJourneys';
import type { Journey, ParkedGoal, Step } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  // journeyView imports the shared i18next instance at module load, which calls `.use()`.
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
/** The stubbed `t()` output as it appears inside the stringified tree (quotes escaped once more). */
const tKey = (k: string, opts?: Record<string, unknown>) =>
  JSON.stringify(opts ? `${k}|${JSON.stringify(opts)}` : k).slice(1, -1);
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });
/** The stubbed `t()` output as an accessibilityLabel PROP value (unescaped, unlike {@link tKey}). */
const tLabel = (k: string, opts: Record<string, unknown>) => `${k}|${JSON.stringify(opts)}`;

const DAY = 24 * 60 * 60 * 1000;

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'active',
    steps: [step('s1'), step('s2')],
    createdAt: 1_000,
    ...over,
  };
}

function parked(id: string, title: string): ParkedGoal {
  return { id, title, processType: 'recurring', domain: 'general' };
}

function setSnapshot(over: Record<string, unknown>) {
  const journeys = (over.journeys as Journey[]) ?? [];
  mockApp.current = {
    snapshot: {
      journeys,
      dreams: [],
      parkedGoals: [],
      futureCapacity: futureCapacity(journeys),
      ...over,
    },
  };
}

/** Render the Journeys screen and switch to the Future tab. */
async function openFuture(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(JourneysScreen));
  });
  if (!r) throw new Error('render failed');
  await act(async () => {
    byLabel(r!, 'tabs.future')[0].props.onPress();
  });
  return r;
}

describe('Journeys — the Future tab holds REAL Future Journeys', () => {
  it('renders them as cards, in the pure selector order (nearest start first, manual last)', async () => {
    const now = Date.now();
    setSnapshot({
      journeys: [
        journey({ id: 'jm', title: 'When I am ready', status: 'future' }),
        journey({ id: 'jf', title: 'Far off', status: 'future', startsAt: now + 30 * DAY }),
        journey({ id: 'jn', title: 'Soon enough', status: 'future', startsAt: now + 3 * DAY }),
      ],
    });
    const r = await openFuture();

    const shown = json(r);
    const at = (title: string) => shown.indexOf(title);
    expect(at('Soon enough')).toBeGreaterThan(-1);
    expect(at('Soon enough')).toBeLessThan(at('Far off'));
    expect(at('Far off')).toBeLessThan(at('When I am ready'));
  });

  it('keeps a Future Journey off the Active tab', async () => {
    setSnapshot({ journeys: [journey({ id: 'jf', title: 'Later thing', status: 'future' })] });
    let r: TestRoot | undefined;
    await act(async () => {
      r = TestRenderer.create(createElement(JourneysScreen));
    });

    // Active is the landing tab: it shows its empty state, never the Journey saved for later.
    expect(json(r!)).toContain('empty.title');
    expect(json(r!)).not.toContain('Later thing');
  });

  it('shows NO progress signal on a Future card: no bar, no %, no Milestone count, no projection', async () => {
    setSnapshot({
      journeys: [
        journey({ id: 'jf', title: 'Later thing', status: 'future', startsAt: Date.now() + 5 * DAY }),
      ],
    });
    const r = await openFuture();

    const shown = json(r);
    expect(shown).not.toContain('%'); // the bar's only width value, and the percentage label
    expect(shown).not.toContain('card.milestone');
    expect(shown).not.toContain('ends.'); // no "ends in 3 wks" projection on a Journey that hasn't begun
    expect(shown).not.toContain('card.stepsDone');
  });

  it('leads with the Dream eyebrow, one start line, and the calendar chip', async () => {
    const startsAt = Date.now() + 5 * DAY;
    setSnapshot({
      journeys: [journey({ id: 'jf', status: 'future', startsAt, dreamId: 'd1' })],
      dreams: [{ id: 'd1', title: 'Be someone who moves', createdAt: 1 }],
    });
    const r = await openFuture();

    const shown = json(r);
    expect(shown).toContain('Be someone who moves');
    expect(shown).toContain(tKey('card.starts', { date: shortDate(startsAt) }));
    expect(shown).toContain('card.planned');
    // The old SOON pill is gone; the amber PAUSED pill never belongs here either.
    expect(shown).not.toContain('card.soon');
    expect(shown).not.toContain('card.paused');
  });

  it('says "ready when you are" for a start whose day already passed — never late or overdue', async () => {
    setSnapshot({
      journeys: [journey({ id: 'jf', status: 'future', startsAt: Date.now() - 9 * DAY })],
    });
    const r = await openFuture();

    const shown = json(r);
    expect(shown).toContain('card.readyWhenYouAre');
    expect(shown.toLowerCase()).not.toContain('overdue');
    expect(shown.toLowerCase()).not.toContain('late');
  });

  it('says "start when you\'re ready" for a manual-start Journey, with no date at all', async () => {
    setSnapshot({ journeys: [journey({ id: 'jf', status: 'future' })] });
    const r = await openFuture();

    expect(json(r)).toContain('card.startWhenReady');
    expect(json(r)).not.toContain('card.starts|');
  });
});

describe('Journeys — Future Journeys and parked ideas stay distinct (§12)', () => {
  it('lists the Journeys first, then the parked ideas under their own heading', async () => {
    setSnapshot({
      journeys: [journey({ id: 'jf', title: 'A real plan', status: 'future' })],
      parkedGoals: [parked('p1', 'A loose idea')],
    });
    const r = await openFuture();

    const shown = json(r);
    expect(shown.indexOf('A real plan')).toBeLessThan(shown.indexOf('parked.heading'));
    expect(shown.indexOf('parked.heading')).toBeLessThan(shown.indexOf('A loose idea'));
  });

  it('never puts a parked idea under the Journeys, or a Journey under "Ideas for later"', async () => {
    // A parked goal has no plan behind it, so it never gets the Journey card's chip or start line.
    setSnapshot({ parkedGoals: [parked('p1', 'A loose idea')] });
    const r = await openFuture();

    const shown = json(r);
    expect(shown).toContain('parked.heading');
    expect(shown).not.toContain('card.planned');
    expect(shown).not.toContain('card.startWhenReady');
  });

  it('shows ONE quiet empty state only when there is neither', async () => {
    setSnapshot({});
    const r = await openFuture();

    const shown = json(r);
    expect(shown).toContain('future.empty.title');
    expect(shown).toContain('future.empty.body');
    expect(shown).not.toContain('parked.heading');
  });
});

describe('Journeys — the Future capacity line (§10)', () => {
  const futures = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      journey({ id: `f${i}`, title: `Plan ${i}`, status: 'future' }),
    );

  it('says nothing below the review threshold', async () => {
    setSnapshot({ journeys: futures(FUTURE_JOURNEY_POLICY.reviewThreshold - 1) });
    const r = await openFuture();

    expect(json(r)).not.toContain('future.capacity');
  });

  it('offers ONE calm line at the review threshold, and blocks nothing', async () => {
    const count = FUTURE_JOURNEY_POLICY.reviewThreshold;
    setSnapshot({ journeys: futures(count) });
    const r = await openFuture();

    const shown = json(r);
    expect(shown).toContain(tKey('future.capacity.review', { count }));
    // Every Journey is still listed and still opens: the line informs, it never gates.
    expect(byLabel(r, tLabel('card.open', { title: 'Plan 0' })).length).toBeGreaterThan(0);
  });

  it('states the cap plainly at the cap — no error, nothing disabled on this tab', async () => {
    setSnapshot({ journeys: futures(FUTURE_JOURNEY_POLICY.max) });
    const r = await openFuture();

    const shown = json(r);
    expect(shown).toContain(tKey('future.capacity.full', { max: FUTURE_JOURNEY_POLICY.max }));
    expect(shown).not.toContain('future.capacity.review');
    expect(byLabel(r, tLabel('card.open', { title: 'Plan 9' })).length).toBeGreaterThan(0);
  });
});
