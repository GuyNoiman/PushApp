/**
 * Journeys — the History tab (Journey Abandonment).
 *
 * Renders the REAL Journeys screen over a mock snapshot (react-test-renderer) to pin the two things
 * the feature must never get wrong:
 *
 *  · History holds BOTH kinds and labels them apart — a "Completed" group and a "Stopped" group —
 *    so a canceled Journey is never filed under Current and never sits unlabelled among finished ones;
 *  · a canceled card never reads as a success: no percentage, no progress bar, no DONE pill. It shows
 *    the honest "N of M Steps done" counted against `stepsAtAbandon`, not against the shortened array;
 *  · History reads newest-first by ONE rule across both groups (the stop date, or the completion
 *    date), and a Journey canceled before the stop date existed still renders — no date, sorted last.
 *
 * `t` is stubbed to echo its key (plus its interpolation options); theme and safe-area are stubbed so
 * the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import JourneysScreen from '../journeys';
import { shortDate } from '@/components/journey/journeyView';
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
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });

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
    steps: [step('s1')],
    createdAt: 1_000,
    ...over,
  };
}

const DAY = 24 * 60 * 60 * 1000;
/** Fixed instants so the stop date on the card and the History order are both deterministic. */
const STOPPED_AT = new Date(2026, 6, 20, 12, 0, 0).getTime();

/** A canceled Journey as the engine leaves it: one done Step kept, 11 unlived Steps spliced away. */
const canceled = journey({
  id: 'jc',
  title: 'Learn to draw',
  status: 'abandoned',
  stepsAtAbandon: 12,
  abandonedAt: STOPPED_AT,
  steps: [step('c1', { done: true })],
});
const completed = journey({
  id: 'jd',
  title: 'Read 10 books',
  status: 'completed',
  completedAt: STOPPED_AT - 5 * DAY,
  steps: [step('d1', { done: true })],
});

function setJourneys(journeys: Journey[]) {
  mockApp.current = { snapshot: { journeys, dreams: [], parkedGoals: [] } };
}

/** Render the Journeys screen and switch to the History tab. */
async function openHistory(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(JourneysScreen));
  });
  if (!r) throw new Error('render failed');
  await act(async () => {
    byLabel(r!, 'tabs.history')[0].props.onPress();
  });
  return r;
}

describe('Journeys — History tab', () => {
  it('groups Completed and Stopped inside History', async () => {
    setJourneys([completed, canceled]);
    const r = await openHistory();

    const shown = json(r);
    expect(shown).toContain('history.groups.completed');
    expect(shown).toContain('history.groups.stopped');
    expect(shown).toContain('Read 10 books');
    expect(shown).toContain('Learn to draw');
  });

  it('shows no "Stopped" group when the user has never canceled anything', async () => {
    setJourneys([completed]);
    const r = await openHistory();

    expect(json(r)).toContain('history.groups.completed');
    expect(json(r)).not.toContain('history.groups.stopped');
  });

  it('keeps a canceled Journey out of the Active tab', async () => {
    setJourneys([canceled]);
    let r: TestRoot | undefined;
    await act(async () => {
      r = TestRenderer.create(createElement(JourneysScreen));
    });
    // Active is the landing tab: it must show the empty state, not the canceled Journey.
    expect(json(r!)).toContain('empty.title');
    expect(json(r!)).not.toContain('Learn to draw');
  });

  it('never renders a canceled card as a success: no percentage, no bar, no DONE pill', async () => {
    setJourneys([canceled]);
    const r = await openHistory();

    const shown = json(r);
    // The honest line, measured against the Steps it held when it was stopped.
    expect(shown).toContain(tKey('card.stepsDone', { done: 1, total: 12 }));
    expect(shown).toContain('card.canceled');
    // No completion language, and no percentage anywhere (the card's only "%" would be the bar
    // width, which is why both are asserted).
    expect(shown).not.toContain('card.done');
    expect(shown).not.toContain('card.milestoneComplete');
    expect(shown).not.toContain('%');
  });

  it('still renders the percentage and bar for a completed Journey', async () => {
    setJourneys([completed]);
    const r = await openHistory();

    expect(json(r)).toContain('card.done');
    expect(json(r)).toContain('%');
  });

  it('dates a canceled card by the day it was stopped', async () => {
    setJourneys([canceled]);
    const r = await openHistory();

    expect(json(r)).toContain(tKey('card.stopped', { date: shortDate(STOPPED_AT) }));
  });

  it('shows no footer date for a Journey canceled before the stop date existed', async () => {
    // A legacy cancel carries no `abandonedAt`: it renders, and it renders nothing where the date
    // would be — never "Invalid Date", never a guess.
    setJourneys([journey({ id: 'jl', title: 'Old cancel', status: 'abandoned', stepsAtAbandon: 5 })]);
    const r = await openHistory();

    const shown = json(r);
    expect(shown).toContain('Old cancel');
    expect(shown).not.toContain('card.stopped');
    expect(shown).not.toContain('Invalid Date');
  });

  it('orders History newest-first across BOTH groups, undated last', async () => {
    const older = journey({
      id: 'jo',
      title: 'Older stop',
      status: 'abandoned',
      stepsAtAbandon: 3,
      abandonedAt: STOPPED_AT - 10 * DAY,
    });
    const undated = journey({ id: 'ju', title: 'Undated stop', status: 'abandoned', stepsAtAbandon: 2 });
    const olderDone = journey({
      id: 'je',
      title: 'Older finish',
      status: 'completed',
      completedAt: STOPPED_AT - 20 * DAY,
      steps: [step('e1', { done: true })],
    });
    // Deliberately handed over in the WRONG order — the screen must not just echo the snapshot.
    setJourneys([undated, olderDone, older, canceled, completed]);
    const r = await openHistory();

    const shown = json(r);
    const at = (title: string) => shown.indexOf(title);
    // Completed group: the recent finish before the older one.
    expect(at('Read 10 books')).toBeLessThan(at('Older finish'));
    // Stopped group: newest stop first, then the older one, and the undated one last.
    expect(at('Learn to draw')).toBeLessThan(at('Older stop'));
    expect(at('Older stop')).toBeLessThan(at('Undated stop'));
  });
});
