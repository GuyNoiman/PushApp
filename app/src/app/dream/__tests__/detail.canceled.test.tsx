/**
 * Dream detail — how a CANCELED Journey reads under its Dream (founder decision, 2026-08-14).
 *
 * Renders the REAL Dream detail screen over a mock snapshot (react-test-renderer) to pin:
 *  · a canceled Journey that had at least one Step done STAYS under the Dream, in its own "Stopped"
 *    group, wearing the same "Canceled" tag the History tab shows;
 *  · a canceled Journey with NOTHING done is not there at all;
 *  · neither ever reads as a success — the screen carries no percentage and no completion label for
 *    it, and it is never filed under Completed.
 *
 * `t` is stubbed to echo its key so copy is asserted by key; theme and safe-area are stubbed so the
 * screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import DreamDetailScreen from '../[id]';
import type { Dream, Journey, ReasonEntry, Step } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'd1' }),
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

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

// react-test-renderer ships no types; type just the surface used here.
interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[] };
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

const dream: Dream = { id: 'd1', title: 'Become someone who draws' };

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Draw daily for 30 days',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'active',
    dreamId: 'd1',
    steps: [step('s1')],
    createdAt: 1_000,
    ...over,
  };
}

async function render(journeys: Journey[], reasonLog: ReasonEntry[] = []): Promise<TestRoot> {
  // `core.getReasonLog()` is what lets the visibility rule see a PARTIAL report on a canceled
  // Journey — cancelling marks kept non-done Steps `dropped`, and without the log a partial is
  // indistinguishable from nothing at all (founder, 2026-08-14).
  mockApp.current = {
    snapshot: { journeys, dreams: [dream], parkedGoals: [] },
    core: { getReasonLog: () => reasonLog },
  };
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(DreamDetailScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

describe('Dream detail — a canceled Journey', () => {
  const withWork = journey({
    id: 'jc',
    title: 'Sketch every morning',
    status: 'abandoned',
    stepsAtAbandon: 12,
    abandonedAt: 5_000,
    steps: [step('c1', { done: true })],
  });

  it('stays under the Dream, in its own Stopped group, tagged Canceled', async () => {
    const r = await render([withWork]);

    const shown = json(r);
    expect(shown).toContain('Sketch every morning');
    expect(shown).toContain('status.canceled');
    // The SAME tag the History tab renders, from the shared CanceledPill.
    expect(shown).toContain('card.canceled');
  });

  it('never reads as a success: not under Completed, no percentage, no completion label', async () => {
    const r = await render([withWork, journey({ id: 'jd', title: 'Finished course', status: 'completed', completedAt: 4_000 })]);

    const shown = json(r);
    expect(shown).toContain('status.completed');
    // The completed group exists for the finished Journey only; the canceled one has its own.
    expect(shown).toContain('status.canceled');
    expect(shown).not.toContain('%');
    expect(shown).not.toContain('card.done');
  });

  it('is not shown at all when no Step was ever done', async () => {
    const r = await render([
      journey({ id: 'jn', title: 'Never started sketching', status: 'abandoned', stepsAtAbandon: 12, steps: [] }),
    ]);

    const shown = json(r);
    expect(shown).not.toContain('Never started sketching');
    expect(shown).not.toContain('status.canceled');
    // With nothing else linked, the Dream reads as having no Journeys — not as having a dead one.
    expect(shown).toContain('detail.emptyJourneys');
  });
});
