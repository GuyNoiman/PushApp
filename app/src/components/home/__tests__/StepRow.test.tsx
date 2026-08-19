/**
 * StepRow — the compact row that replaced the tall Today's-focus card (2026-08-19 redesign).
 *
 * The row is smaller, and the risk of a smaller row is that things quietly stop being said. These
 * tests are the list of what may NOT be lost in the shrink, carried over from the card's own tests
 * and extended for what the row added:
 *   · a completed Step keeps its whole identity and ANNOUNCES itself as done, so the state is never
 *     colour-only, and it stops being swipeable while staying tappable;
 *   · a PARTIAL keeps its chip and stays actionable — a partial is real work and must never read as
 *     nothing;
 *   · the streak role is shown before the fact on an open Step and never on a settled one;
 *   · the Dream, the Journey · Milestone line and the WHEN note all still appear;
 *   · a pull-forward row is visibly an offer (dashed, unfilled), not something the day is asking for.
 *
 * `ReanimatedSwipeable` is stubbed (the gesture is native); everything else here is the real row.
 */
import { createElement, type ReactElement } from 'react';

import { StepRow } from '../StepRow';
import type { StepStatus } from '@/core/status/stepStatus';
import type { StreakRole } from '@/core/util/urgency';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
    default: function SwipeableStub({ ref, ...props }: Record<string, any>) {
      React.useImperativeHandle(ref, () => ({ close: jest.fn() }), []);
      return React.createElement(View, { ...props, testID: 'swipeable' }, props.children);
    },
  };
});

interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): any;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');

const TITLE = 'Jog 15 minutes';
const META = 'Run 5km · Milestone 2 of 4';
const DREAM = 'Get fit and strong';

function render(over: Record<string, unknown> = {}) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(StepRow, {
        icon: 'walk',
        title: TITLE,
        meta: META,
        urgency: 'calm',
        status: 'unreported' as StepStatus,
        onPress: jest.fn(),
        onDone: jest.fn(),
        onPostpone: jest.fn(),
        onLetGo: jest.fn(),
        ...over,
      } as any),
    );
  });
  return root;
}

/** Is this row wrapped in the (stubbed) swipe gesture at all? */
function isSwipeable(root: TestRoot): boolean {
  return root.root
    .findAllByProps({ testID: 'swipeable' })
    .some((n) => typeof n.props.onSwipeableWillOpen === 'function');
}

const tree = (root: TestRoot) => JSON.stringify(root.toJSON());

describe('what the row still says', () => {
  it('renders the title, the Dream it serves, and the Journey · Milestone line', () => {
    const json = tree(render({ dream: DREAM }));
    expect(json).toContain(TITLE);
    expect(json).toContain(DREAM);
    expect(json).toContain(META);
  });

  it('renders the WHEN note when there is one, and nothing when there is not', () => {
    expect(tree(render({ note: 'week.carriedFrom' }))).toContain('week.carriedFrom');
    expect(tree(render())).not.toContain('week.carriedFrom');
  });
});

describe('a COMPLETED Step', () => {
  it('announces itself in words, never by colour alone', () => {
    expect(
      render({ status: 'completed' }).root.findAllByProps({ accessibilityLabel: 'step.doneA11y' })
        .length,
    ).toBeGreaterThan(0);
  });

  it('keeps its identity and stays tappable, but is no longer swipeable', () => {
    const done = render({ status: 'completed', dream: DREAM });
    expect(tree(done)).toContain(TITLE);
    expect(tree(done)).toContain(DREAM);
    expect(isSwipeable(done)).toBe(false);
    expect(isSwipeable(render())).toBe(true);
  });

  it('carries no streak badge — the question the badge answers is about a Step still open', () => {
    const done = render({ status: 'completed', streakRole: 'binding' as StreakRole });
    expect(tree(done)).not.toContain('streakRole.binding');
  });
});

describe('a PARTIAL is real work', () => {
  it('keeps its chip and stays actionable', () => {
    const partial = render({ status: 'partially_completed' });
    expect(tree(partial)).toContain('report.status.partial');
    expect(isSwipeable(partial)).toBe(true);
  });
});

describe('the streak role, shown before the fact', () => {
  it.each(['recommended', 'binding'] as StreakRole[])('shows the %s badge on an open Step', (role) => {
    expect(tree(render({ streakRole: role }))).toContain(`streakRole.${role}`);
  });

  it('shows none when the caller gives none — another day of the week says nothing about today', () => {
    const json = tree(render());
    expect(json).not.toContain('streakRole.recommended');
    expect(json).not.toContain('streakRole.binding');
  });
});

describe('a pull-forward row is an OFFER, not a demand', () => {
  it('is dashed and unfilled, which a day s own Step never is', () => {
    const styleOf = (root: TestRoot) => JSON.stringify(root.toJSON().children?.[0]?.props?.style);
    expect(styleOf(render({ pullForward: true }))).toContain('dashed');
    expect(styleOf(render())).not.toContain('dashed');
  });

  it('is locked out of swipe only when the week is closed, not because it is an offer', () => {
    expect(isSwipeable(render({ pullForward: true }))).toBe(true);
    expect(isSwipeable(render({ locked: true }))).toBe(false);
  });
});
