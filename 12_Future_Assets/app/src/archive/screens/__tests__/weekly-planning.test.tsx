/**
 * Weekly Planning — only RUNNING Journeys plan a week (screen-18, `isRunning` gate).
 *
 * Renders the REAL "Your week" screen over a MOCK AppProvider (react-test-renderer) to prove the
 * lifecycle gate the engines already enforce: a FROZEN (paused) Journey and a FUTURE (not started
 * yet) Journey contribute no Steps and no "why" line — only an `active` Journey does. Regression
 * cover for the old negation (`!completedAt`), which leaked both.
 *
 * Theme + safe-area + router are stubbed so the screen renders without their providers; the
 * `isRunning` predicate under test is the REAL pure helper.
 *
 * ARCHIVED 2026-08-14 with its screen (see ../README.md) — jest no longer runs this file.
 * The `isRunning` predicate itself stays covered by core/util/__tests__/journeyStatus.test.ts;
 * only the screen-level wiring assertion is parked here until the surface is revived.
 */
import { createElement, type ReactElement } from 'react';

import WeeklyPlanningScreen from '../weekly-planning';
import type { Journey, Step } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// react-test-renderer ships no types; type just the surface used here.
interface TestRoot {
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
function step(title: string): Step {
  return { id: title, title, isStarterStep: false, cadence: 'once', done: false };
}
function journey(id: string, stepTitle: string, overrides: Partial<Journey> = {}): Journey {
  return {
    id,
    title: `${id} title`,
    why: [`${id} why`],
    durationDays: 30,
    rhythm: { type: 'daily' },
    steps: [step(stepTitle)],
    createdAt: 0,
    status: 'active',
    ...overrides,
  } as unknown as Journey;
}

function setJourneys(journeys: Journey[]) {
  mockApp.current = { core: { syncTime: jest.fn() }, snapshot: { journeys } };
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(WeeklyPlanningScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());

beforeEach(() => jest.clearAllMocks());

describe('Weekly Planning — only running Journeys plan a week', () => {
  it('leaves out the Steps of a FROZEN Journey, keeping the active one', async () => {
    setJourneys([
      journey('j-active', 'Active step'),
      journey('j-frozen', 'Frozen step', { status: 'frozen' }),
    ]);
    const r = await render();
    expect(json(r)).toContain('Active step');
    expect(json(r)).not.toContain('Frozen step');
  });

  it('leaves out the Steps of a FUTURE Journey, keeping the active one', async () => {
    setJourneys([
      journey('j-active', 'Active step'),
      journey('j-future', 'Future step', { status: 'future', startsAt: 5_000 }),
    ]);
    const r = await render();
    expect(json(r)).toContain('Active step');
    expect(json(r)).not.toContain('Future step');
  });

  it('shows the empty state when every Journey is frozen, future, or completed', async () => {
    setJourneys([
      journey('j-frozen', 'Frozen step', { status: 'frozen' }),
      journey('j-future', 'Future step', { status: 'future' }),
      journey('j-done', 'Done step', { status: 'completed', completedAt: 1_000 }),
    ]);
    const r = await render();
    expect(json(r)).not.toContain('Frozen step');
    expect(json(r)).not.toContain('Future step');
    expect(json(r)).not.toContain('Done step');
    expect(json(r)).toContain('Nothing planned yet');
  });

  it('grounds the week in the why of a RUNNING Journey, never a frozen or future one', async () => {
    setJourneys([
      journey('j-frozen', 'Frozen step', { status: 'frozen' }),
      journey('j-future', 'Future step', { status: 'future' }),
      journey('j-active', 'Active step'),
    ]);
    const r = await render();
    expect(json(r)).toContain('j-active why');
    expect(json(r)).not.toContain('j-frozen why');
    expect(json(r)).not.toContain('j-future why');
  });
});
