/**
 * TodayFocusCard — what a REPORTED Step looks like on Home's Today's-focus stack.
 *
 * The screen's job after a report is to leave the evidence visible, not to clear it away. The
 * founder's device pass (2026-08-17) caught the two ways that went wrong: a completed row lost its
 * content (only the green swipe-reveal was left), and the row that survived was visibly WIDER than
 * the pending ones and carried a redundant "Completed" pill. These tests hold the settled state
 * down:
 *   · a completed Step keeps its whole identity — title, Journey · Milestone meta, progress;
 *   · it is not swipeable, yet sits in the same container, so it is exactly as wide as the others;
 *   · it shows NO status pill (the check and the calm card say it) but still ANNOUNCES itself as
 *     done, so the state is never colour-only;
 *   · a PARTIAL and a couldn't keep their chip and stay actionable — a partial is real work.
 *
 * `ReanimatedSwipeable` is stubbed (the gesture is native); everything else here is the real card.
 */
import { createElement, type ReactElement } from 'react';

import { TodayFocusCard } from '../TodayFocusCard';
import type { StepStatus } from '@/core/status/stepStatus';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
// Echo the i18n key so labels are asserted by key, without booting i18next.
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

// react-test-renderer ships no types; type just the surface used here.
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

function renderCard(status: StepStatus) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(TodayFocusCard, {
        icon: 'walk',
        title: TITLE,
        meta: META,
        progress: 0.5,
        urgency: 'calm',
        status,
        onPress: jest.fn(),
        onDone: jest.fn(),
        onPostpone: jest.fn(),
        onLetGo: jest.fn(),
      }),
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

describe('TodayFocusCard — a COMPLETED Step keeps its identity', () => {
  it('still renders its title and its Journey · Milestone line', () => {
    const json = tree(renderCard('completed'));
    expect(json).toContain(TITLE);
    expect(json).toContain(META);
  });

  it('announces the completed state in words (never colour alone)', () => {
    const done = renderCard('completed');
    expect(done.root.findAllByProps({ accessibilityLabel: 'step.doneA11y' }).length).toBeGreaterThan(0);
  });

  it('drops the "Completed" pill — the check and the settled card already say it', () => {
    expect(tree(renderCard('completed'))).not.toContain('report.status.completed');
  });

  it('is not swipeable, and stays exactly as wide as a pending card', () => {
    const pending = renderCard('unreported');
    const completed = renderCard('completed');

    expect(isSwipeable(pending)).toBe(true);
    expect(isSwipeable(completed)).toBe(false);
    // Same outer container in both states ⇒ same box, same width.
    const pendingContainer = pending.root
      .findAllByProps({ testID: 'swipeable' })
      .find((n) => typeof n.props.onSwipeableWillOpen === 'function')!.props.containerStyle;
    expect(completed.toJSON().props.style).toEqual(pendingContainer);
  });
});

describe('TodayFocusCard — the settled card carries its own ground', () => {
  // The founder picked this treatment from rendered options (2026-08-19, "option ד1"): a done card
  // should stand out more than a plain white one, without becoming a coloured block.
  it('drops the urgency edge — a completed Step has no urgency left to accent', () => {
    expect(renderCard('unreported').root.findAllByProps({ testID: 'urgency-edge' }).length)
      .toBeGreaterThan(0);
    expect(renderCard('completed').root.findAllByProps({ testID: 'urgency-edge' }).length).toBe(0);
  });

  it('shows the check watermark only once done, and hides it from screen readers', () => {
    const marks = renderCard('completed').root.findAllByProps({ testID: 'done-watermark' });
    expect(marks.length).toBeGreaterThan(0);
    // It is texture, not content — a screen reader must never read a second check out loud.
    expect(marks[0].props.importantForAccessibility).toBe('no-hide-descendants');
    expect(renderCard('unreported').root.findAllByProps({ testID: 'done-watermark' }).length).toBe(0);
  });

  it('still says it is done in words — the new ground is never the only signal', () => {
    const completed = renderCard('completed');
    expect(completed.root.findAllByProps({ accessibilityLabel: 'step.doneA11y' }).length).toBeGreaterThan(0);
  });
});

describe('TodayFocusCard — PARTIAL and couldn’t are not nothing', () => {
  it('a partial keeps its title, its chip, and stays actionable', () => {
    const partial = renderCard('partially_completed');
    expect(tree(partial)).toContain(TITLE);
    expect(tree(partial)).toContain('report.status.partiallyCompleted');
    expect(isSwipeable(partial)).toBe(true);
  });

  it('a couldn’t keeps its title, its chip, and stays actionable', () => {
    const couldnt = renderCard('not_completed');
    expect(tree(couldnt)).toContain(TITLE);
    expect(tree(couldnt)).toContain('report.status.notCompleted');
    expect(isSwipeable(couldnt)).toBe(true);
  });
});
