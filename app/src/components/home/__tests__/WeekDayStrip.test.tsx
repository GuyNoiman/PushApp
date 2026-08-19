/**
 * WeekDayStrip — the seven pills at the top of Home.
 *
 * Two things are worth holding down here, and neither is about layout. First, the marks: a day with
 * open Steps, a day whose Steps are all done, and a day with nothing at all must be three visibly
 * different states — an empty day is information, not an absence. Second, the a11y: the strip is a
 * row of nearly identical shapes, so the selected day and each day's state must be spoken, never
 * left to the fill colour alone.
 *
 * Same stub set as the card tests (i18n echoes keys, theme is a proxy).
 */
import { createElement, type ReactElement } from 'react';

import { WeekDayStrip } from '../WeekDayStrip';
import type { WeekDay } from '@/core/util/weekByDay';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'week.letters') return ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      if (key === 'week.days') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return options?.day ? `${key}:${String(options.day)}` : key;
    },
  }),
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));

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

const DAY = 24 * 60 * 60 * 1000;

function days(marks: WeekDay['mark'][]): WeekDay[] {
  return marks.map((mark, i) => ({
    dayStart: i * DAY,
    weekday: i,
    isToday: i === 2,
    isPast: i < 2,
    mark,
    steps: [],
  }));
}

/**
 * The pills, deduplicated. `findAllByProps` matches both the Pressable element and the host View it
 * renders to, so every pill would otherwise be counted twice; the press handler is on one of them.
 */
function pills(root: TestRoot) {
  return root.root
    .findAllByProps({ accessibilityRole: 'button' })
    .filter((node) => typeof node.props.onPress === 'function');
}

function render(marks: WeekDay['mark'][], selectedIndex = 2) {
  let root!: TestRoot;
  const onSelect = jest.fn();
  TestRenderer.act(() => {
    root = TestRenderer.create(
      createElement(WeekDayStrip, { days: days(marks), selectedIndex, onSelect }),
    );
  });
  return { root, onSelect };
}

const ALL_EMPTY: WeekDay['mark'][] = ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'];

describe('the strip', () => {
  it('renders exactly seven pills — the current week and nothing else', () => {
    const { root } = render(ALL_EMPTY);
    expect(pills(root)).toHaveLength(7);
  });

  it('announces which day is selected, instead of leaving it to the fill', () => {
    const { root } = render(ALL_EMPTY, 4);
    const selected = pills(root).filter((node) => node.props.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
  });

  it('says each day and its state in words', () => {
    const marks: WeekDay['mark'][] = ['done', 'open', 'empty', 'empty', 'empty', 'empty', 'empty'];
    const { root } = render(marks);
    const labels = pills(root).map((node) => node.props.accessibilityLabel as string);
    expect(labels[0]).toContain('week.state.done');
    expect(labels[1]).toContain('week.state.open');
    expect(labels[2]).toContain('week.state.empty');
    expect(labels[0]).toContain('Sun');
  });

  it('reports the tapped day to its caller', () => {
    const { root, onSelect } = render(ALL_EMPTY);
    pills(root)[5].props.onPress();
    expect(onSelect).toHaveBeenCalledWith(5);
  });
});

describe('the mark under the letter', () => {
  const glyphs = (root: TestRoot) =>
    root.root
      .findAllByProps({ importantForAccessibility: 'no-hide-descendants' })
      .filter((node) => Array.isArray(node.props.children));

  it('gives every day the same mark box, so a day completing never moves the strip', () => {
    const open = render(['open', ...ALL_EMPTY.slice(1)] as WeekDay['mark'][]);
    const done = render(['done', ...ALL_EMPTY.slice(1)] as WeekDay['mark'][]);
    expect(glyphs(open.root)[0].props.style).toEqual(glyphs(done.root)[0].props.style);
  });

  it('hides the mark from screen readers — the state is already in the label', () => {
    const { root } = render(['open', ...ALL_EMPTY.slice(1)] as WeekDay['mark'][]);
    expect(glyphs(root)[0].props.accessibilityElementsHidden).toBe(true);
  });

  it('draws nothing at all on an empty day', () => {
    const { root } = render(ALL_EMPTY);
    for (const glyph of glyphs(root)) {
      expect(glyph.props.children.filter(Boolean)).toEqual([]);
    }
  });
});
