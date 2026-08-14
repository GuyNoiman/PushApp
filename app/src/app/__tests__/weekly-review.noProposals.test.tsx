/**
 * Weekly Review screen — the NO-PROPOSALS state (Weekly_Review_PRD §8). This is the normal state in
 * plain production: the week-close summary + never-empty next week ship, while the adaptive Step-plan
 * half stays gated, so the review arrives with `proposals: []`.
 *
 * Renders the REAL screen over a MOCK AppCore (react-test-renderer) to prove the branch reads
 * sensibly with zero proposals: the reassurance heading + copy, and the acknowledge outcome (never
 * an Approve button that would apply nothing). Acknowledge resolves the review via the facade.
 *
 * `t` is stubbed to echo its key so copy is asserted by i18n key; theme + safe-area + router are
 * stubbed so the screen renders without their providers.
 */
import { createElement, type ReactElement } from 'react';

import WeeklyReviewScreen from '../weekly-review';
import type { WeeklyReview } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

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

/** A production-shaped review: real summary + next week, EMPTY proposal list. */
function review(): WeeklyReview {
  return {
    id: 'review_1',
    weekKey: '2026-W32',
    generatedAt: Date.now(),
    summary: {
      completed: 4,
      partial: 1,
      notCompleted: 0,
      unreported: 2,
      frozenJourneyTitles: [],
      completedJourneyTitles: [],
    },
    nextWeek: { kind: 'steps', stepCount: 3 },
    proposals: [],
    status: 'pending',
  };
}

function setApp(pending: WeeklyReview | null) {
  const core = {
    getPendingWeeklyReview: () => pending,
    markWeeklyReviewOpened: jest.fn(),
    approveWeeklyReview: jest.fn(() => true),
    dismissWeeklyReview: jest.fn(() => true),
  };
  mockApp.current = { core, ready: true };
  return core;
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(WeeklyReviewScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

beforeEach(() => jest.clearAllMocks());

describe('Weekly Review screen — no proposals (the plain-production state)', () => {
  it('shows the summary, the never-empty next week, and the no-changes reassurance', async () => {
    setApp(review());
    const r = await render();
    const out = json(r);

    expect(out).toContain('screen.stepsDone');
    expect(out).toContain('screen.breakdown');
    expect(out).toContain('screen.nextSteps');
    // The section heading reads as reassurance, not as a change that isn't there.
    expect(out).toContain('screen.noChangesHeading');
    expect(out).toContain('screen.noChanges');
    expect(out).not.toContain('screen.changesLead');
  });

  it('offers acknowledge + coach as the outcomes, never an Approve that applies nothing', async () => {
    setApp(review());
    const r = await render();

    // findAllByProps returns the composite + host nodes of one Pressable, so assert presence.
    expect(byLabel(r, 'screen.acknowledge').length).toBeGreaterThan(0);
    expect(byLabel(r, 'screen.openCoach').length).toBeGreaterThan(0);
    expect(byLabel(r, 'screen.approve')).toHaveLength(0);
    expect(byLabel(r, 'screen.keepOut')).toHaveLength(0);
  });

  it('acknowledge resolves the review through the facade', async () => {
    const core = setApp(review());
    const r = await render();

    await act(async () => {
      byLabel(r, 'screen.acknowledge')[0].props.onPress();
    });

    expect(core.dismissWeeklyReview).toHaveBeenCalledTimes(1);
    expect(core.approveWeeklyReview).not.toHaveBeenCalled();
  });

  it('stamps the review opened so the auto-open fires only once (§9)', async () => {
    const core = setApp(review());
    await render();
    expect(core.markWeeklyReviewOpened).toHaveBeenCalled();
  });
});
