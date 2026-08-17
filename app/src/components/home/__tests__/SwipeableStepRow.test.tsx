/**
 * SwipeableStepRow — the swipe contract of a Step row on Home.
 *
 * The founder's device pass (2026-08-17) found the worst possible bug in a reporting gesture: a
 * swipe toward the Postpone / Let-go buttons — the opposite direction from completion — reported the
 * Step DONE. The cause was a misread of gesture-handler's callback: `onSwipeableWillOpen` reports the
 * direction the ROW MOVED, not which panel appeared, so the mapping was inverted in BOTH languages.
 * These tests pin the mapping in both directions and both layouts:
 *   · LTR — the Done wash is the LEFT panel, uncovered by dragging RIGHT: only RIGHT commits;
 *   · RTL — the whole axis mirrors, so only LEFT commits;
 *   · neither direction ever fires Postpone / Let go by itself (those need a button press).
 * …plus the geometry fix beside it: a row that is NOT swipeable (a completed Step, a closed week)
 * must still sit inside the same container, so it comes out exactly as wide as every other row
 * instead of growing to full bleed.
 *
 * `ReanimatedSwipeable` is replaced with a prop-capturing stub — the gesture itself is native and is
 * the founder's to verify on device; what is testable (and what broke) is the mapping we hand it.
 */
import { type ReactElement } from 'react';
import { Text } from 'react-native';

import { SwipeableStepRow, doneSwipeDirection } from '../SwipeableStepRow';

// ── Mocks ──────────────────────────────────────────────────────────────────
// theme.ts pulls in the NativeWind global stylesheet, which jest can't parse — stub it.
jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
// The applied layout direction, flipped per test (I18nManager.forceRTL can't be exercised here).
const mockRtl = { current: false };
jest.mock('@/i18n/rtl', () => ({ isRTL: () => mockRtl.current }));
// A stub Swipeable that renders its children and exposes the props it was handed. The enum values
// are the REAL ones from gesture-handler 2.28 (`SwipeDirection.LEFT = 'left'`), so this stub speaks
// exactly what the library dispatches at runtime.
const mockClose = jest.fn();
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    SwipeDirection: { LEFT: 'left', RIGHT: 'right' },
    default: function SwipeableStub({ ref, ...props }: Record<string, any>) {
      // The imperative surface the row uses to settle itself back to rest after a commit.
      React.useImperativeHandle(ref, () => ({ close: mockClose }), []);
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

const CONTAINER = { marginHorizontal: 16 };

function handlers() {
  return { onDone: jest.fn(), onPostpone: jest.fn(), onLetGo: jest.fn() };
}

function renderRow(props: ReturnType<typeof handlers>, enabled = true) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      <SwipeableStepRow {...props} enabled={enabled} containerStyle={CONTAINER}>
        <Text>Jog 15 minutes</Text>
      </SwipeableStepRow>,
    );
  });
  return root;
}

/** The stub Swipeable's captured props (one logical node — the one carrying the callback). */
function swipeableProps(root: TestRoot): Record<string, any> {
  const nodes = root.root
    .findAllByProps({ testID: 'swipeable' })
    .filter((n) => typeof n.props.onSwipeableWillOpen === 'function');
  return nodes[0]?.props;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRtl.current = false;
});

describe('doneSwipeDirection — which DRAG commits Done', () => {
  it('is a RIGHT drag in LTR (the drag that uncovers the left-hand Done wash)', () => {
    expect(doneSwipeDirection(false)).toBe('right');
  });

  it('mirrors to a LEFT drag under RTL (the Done wash moves to the right-hand panel)', () => {
    expect(doneSwipeDirection(true)).toBe('left');
  });
});

describe('SwipeableStepRow — only the Done wash reports Done', () => {
  it('LTR: a LEFT swipe (the Postpone / Let-go buttons) never reports the Step done', () => {
    const h = handlers();
    const props = swipeableProps(renderRow(h));

    props.onSwipeableWillOpen('left');

    expect(h.onDone).not.toHaveBeenCalled();
    expect(h.onPostpone).not.toHaveBeenCalled();
    expect(h.onLetGo).not.toHaveBeenCalled();
  });

  it('LTR: a RIGHT swipe (the Done wash) reports the Step done, once', () => {
    const h = handlers();
    const props = swipeableProps(renderRow(h));

    props.onSwipeableWillOpen('right');

    expect(h.onDone).toHaveBeenCalledTimes(1);
    expect(h.onPostpone).not.toHaveBeenCalled();
    expect(h.onLetGo).not.toHaveBeenCalled();
    // …and the row settles back to rest rather than staying parked on the green wash.
    expect(mockClose).toHaveBeenCalled();
  });

  it('RTL: the mirrored buttons swipe (RIGHT) never reports done, and LEFT does', () => {
    mockRtl.current = true;
    const h = handlers();
    const props = swipeableProps(renderRow(h));

    props.onSwipeableWillOpen('right');
    expect(h.onDone).not.toHaveBeenCalled();

    props.onSwipeableWillOpen('left');
    expect(h.onDone).toHaveBeenCalledTimes(1);
  });

  it('renders the Done wash on the panel the committing drag uncovers, in both layouts', () => {
    // LTR: dragging RIGHT uncovers the LEFT panel, so the Done wash must be the left one.
    expect(swipeableProps(renderRow(handlers())).renderLeftActions).toBeDefined();
    const ltr = swipeableProps(renderRow(handlers()));
    mockRtl.current = true;
    const rtl = swipeableProps(renderRow(handlers()));
    // The two layouts swap which panel renders which content — the mirroring the fix depends on.
    expect(rtl.renderLeftActions).not.toBe(ltr.renderLeftActions);
    expect(rtl.renderRightActions).not.toBe(ltr.renderRightActions);
  });
});

describe('SwipeableStepRow — a non-swipeable row keeps the same box', () => {
  it('wraps the row in the SAME container, so it is not wider than a swipeable one', () => {
    const enabled = renderRow(handlers(), true);
    const disabled = renderRow(handlers(), false);

    // Nothing to swipe: no gesture wrapper at all.
    expect(swipeableProps(disabled)).toBeUndefined();
    // …but the same outer container style the swipeable one was given (the card's margins).
    expect(swipeableProps(enabled).containerStyle).toEqual(CONTAINER);
    expect(disabled.toJSON().props.style).toEqual(CONTAINER);
  });

  it('still renders the row content (a settled Step never becomes an empty block)', () => {
    const disabled = renderRow(handlers(), false);
    expect(JSON.stringify(disabled.toJSON())).toContain('Jog 15 minutes');
  });
});
