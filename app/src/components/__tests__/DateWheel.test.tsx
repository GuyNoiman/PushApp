/**
 * DateWheel — the column has to report a change that arrives WITHOUT momentum.
 *
 * ── THE DEVICE REPORT (2026-08-27) ─────────────────────────────────────────────────────────────
 *
 * "There is a problem changing the birth date." The column listened only to `onMomentumScrollEnd`,
 * which fires when a flick leaves the list coasting. Nudging the wheel one or two rows — which is
 * what changing a birth date actually is — ends the gesture with no momentum, so the column snapped
 * to the new row on screen and reported nothing upward. The right number sat under the line while
 * the value stayed as it was.
 */
import { createElement, useState, type ReactElement } from 'react';

import { DateWheel, daysInMonth, fromIsoDate, toIsoDate } from '../DateWheel';

jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('i18next', () => ({ __esModule: true, default: { language: 'en' } }));

interface Node { props: Record<string, any> }
interface TestRoot { root: { findAllByProps(p: Record<string, unknown>): Node[] } }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROW = 36;

function render(onChange: (p: any) => void) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(DateWheel, {
        value: { year: 1994, month: 1, day: 2 },
        monthNames: MONTHS,
        thisYear: 2026,
        onChange,
      }),
    );
  });
  return root;
}

/**
 * The three scrolling columns, in render order: day, month, year.
 *
 * De-duplicated on the handler identity: the renderer returns both the composite and the host node
 * for each element, and they share the same closure — so three columns arrive as nine matches.
 */
function columns(root: TestRoot): Node[] {
  const seen = new Set<unknown>();
  const out: Node[] = [];
  for (const node of root.root.findAllByProps({ snapToInterval: ROW })) {
    const handler = node.props.onScrollEndDrag;
    if (typeof handler !== 'function' || seen.has(handler)) continue;
    seen.add(handler);
    out.push(node);
  }
  return out;
}

const scroll = (col: Node, handler: 'onScrollEndDrag' | 'onMomentumScrollEnd', rowIndex: number) =>
  TestRenderer.act(() => col.props[handler]({ nativeEvent: { contentOffset: { y: rowIndex * ROW } } }));

describe('DateWheel', () => {
  it('reports a change from a DRAG that never coasted — the bug', () => {
    const onChange = jest.fn();
    const [day] = columns(render(onChange));
    // The day column sits on the 2nd (index 1). Nudge it one row to the 3rd.
    scroll(day, 'onScrollEndDrag', 2);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ day: 3 }));
  });

  it('still reports a flick that did coast', () => {
    const onChange = jest.fn();
    const [day] = columns(render(onChange));
    scroll(day, 'onMomentumScrollEnd', 5);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ day: 6 }));
  });

  it('does not report twice when a gesture both drags AND coasts to the same row', () => {
    // Rendered under a parent that actually HOLDS the value, because that is what makes the second
    // event a no-op: the drag reports, the parent re-renders with the new day, and by the time the
    // momentum event arrives the column already knows it is on that row. A mock parent that never
    // updates would report twice and prove nothing about the real screen.
    const changes: number[] = [];
    function Host() {
      const [parts, setParts] = useState({ year: 1994, month: 1, day: 2 });
      return createElement(DateWheel, {
        value: parts,
        monthNames: MONTHS,
        thisYear: 2026,
        onChange: (next: any) => {
          changes.push(next.day);
          setParts(next);
        },
      });
    }
    let root!: TestRoot;
    TestRenderer.act(() => {
      root = TestRenderer.create(createElement(Host));
    });
    const [day] = columns(root);
    scroll(day, 'onScrollEndDrag', 4);
    scroll(columns(root)[0], 'onMomentumScrollEnd', 4);
    expect(changes).toEqual([5]);
  });

  it('reports nothing when the wheel comes back to where it started', () => {
    const onChange = jest.fn();
    const [day] = columns(render(onChange));
    scroll(day, 'onScrollEndDrag', 1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has all three columns listening, not just one', () => {
    expect(columns(render(jest.fn()))).toHaveLength(3);
  });
});

describe('the date arithmetic the wheel rests on', () => {
  it('cannot produce 31 February, leap years included', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it('round-trips an ISO date', () => {
    expect(toIsoDate(fromIsoDate('1994-01-02')!)).toBe('1994-01-02');
  });

  it('refuses a date that is not real', () => {
    expect(fromIsoDate('1994-02-31')).toBeNull();
    expect(fromIsoDate('1994-13-01')).toBeNull();
    expect(fromIsoDate('not a date')).toBeNull();
  });
});
