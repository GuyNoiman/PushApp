/**
 * Journeys — the Milestone line on a card (Device QA 2026-08-17, A1).
 *
 * The defect: this card derived "Milestone X of Y" from the STEP count (`min(4, steps)`) while Home
 * read the Journey's real `milestones`. A Journey with 3 Milestones and 8 Steps therefore said
 * "Milestone 1 of 3" on Home and "Milestone 1 of 4" here — a Milestone the user had never seen.
 *
 * These render the REAL Journeys screen over the SAME fixture the shared derivation is tested
 * against (`core/util/__tests__/milestones.test.ts`) and assert the rendered card agrees with the
 * read Home makes for the same Journey's next Step, so the two surfaces cannot drift again.
 *
 * `t` is stubbed to echo its key + interpolation options; theme and safe-area are stubbed so the
 * screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import JourneysScreen from '../journeys';
import { futureCapacity } from '@/core/journeys/futureJourneys';
import { milestoneOfStep } from '@/core/util/milestones';
import type { Journey, Step } from '@/core/types/domain';

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

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

/** THE fixture: 3 real Milestones, 8 Steps across them, the first `doneCount` done. */
function threeMilestones(doneCount = 0, over: Partial<Journey> = {}): Journey {
  const placement = ['m1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3'];
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'active',
    milestones: [
      { id: 'm1', title: 'Get moving', order: 0 },
      { id: 'm2', title: 'Build the habit', order: 1 },
      { id: 'm3', title: 'Go the distance', order: 2 },
    ],
    steps: placement.map((milestoneId, i) =>
      step(`s${i + 1}`, { milestoneId, done: i < doneCount }),
    ),
    createdAt: 1_000,
    ...over,
  };
}

function setSnapshot(journeys: Journey[]) {
  mockApp.current = {
    snapshot: { journeys, dreams: [], parkedGoals: [], futureCapacity: futureCapacity(journeys) },
  };
}

async function renderScreen(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(JourneysScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

/** Render and switch to the History tab, where completed Journeys are listed. */
async function openHistory(): Promise<TestRoot> {
  const r = await renderScreen();
  await act(async () => {
    r.root.findAllByProps({ accessibilityLabel: 'tabs.history' })[0].props.onPress();
  });
  return r;
}

describe('Journeys card — the Milestone line comes from the REAL Milestones', () => {
  it('reports the same position the Home meta line reads for the same Journey', async () => {
    const journey = threeMilestones(4); // four Steps done → the user is inside Milestone 2
    setSnapshot([journey]);
    const r = await renderScreen();

    // What Home renders for this Journey: the position of the next Step the user has to do.
    const onHome = milestoneOfStep(journey, journey.steps.find((s) => !s.done)!);
    expect(onHome).toEqual({ current: 2, total: 3 });
    // What this card renders — the same two numbers, from the same derivation.
    expect(json(r)).toContain(tKey('card.milestone', { current: 2, total: 3 }));
  });

  it('never reports a Step-derived count — 8 Steps do not make a fourth Milestone', async () => {
    setSnapshot([threeMilestones()]);
    const r = await renderScreen();

    const shown = json(r);
    expect(shown).toContain(tKey('card.milestone', { current: 1, total: 3 }));
    expect(shown).not.toContain('"total":4');
  });

  it('shows NO Milestone line at all for a Journey that has none', async () => {
    // A manually-built (or pre-Planner) Journey has no Milestone arc. "Milestone 1 of 1" would be a
    // number the user never approved, so the card says nothing here.
    setSnapshot([threeMilestones(1, { milestones: undefined })]);
    const r = await renderScreen();

    const shown = json(r);
    expect(shown).not.toContain('card.milestone');
    // The honest signals are untouched: the card still shows its title, its bar and its percentage.
    expect(shown).toContain('Run 5km');
    expect(shown).toContain('13%');
  });

  it('reads a completed Journey as finishing its LAST real Milestone', async () => {
    setSnapshot([threeMilestones(8, { status: 'completed', completedAt: 2_000 })]);
    const r = await openHistory();

    const shown = json(r);
    expect(shown).toContain(tKey('card.milestoneComplete', { total: 3 }));
    expect(shown).not.toContain('"total":4');
  });
});
