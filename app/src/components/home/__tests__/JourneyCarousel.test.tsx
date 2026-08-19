/**
 * JourneyCarousel — the active Journeys on Home, one card at a time.
 *
 * What matters here is that the card tells the truth about an arc: the rail must fill up to the
 * Milestone the Journey is actually IN and no further, a Journey with no Milestones must not invent
 * one, and the pager must have a dot per card so "there are more" is visible without swiping first.
 */
import { createElement, type ReactElement } from 'react';

import { JourneyCarousel, type JourneyCard } from '../JourneyCarousel';

jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () =>
    new Proxy(
      {},
      {
        get: (_t, key) => (key === 'tint' ? '#TINT' : key === 'backgroundSelected' ? '#EMPTY' : '#111'),
      },
    ),
}));
jest.mock('i18next', () => ({ __esModule: true, default: { language: 'en' } }));

interface Node {
  props: Record<string, any>;
}
interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): Node[] };
  toJSON(): any;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

const card = (id: string, over: Partial<JourneyCard> = {}): JourneyCard => ({
  id,
  title: `${id} title`,
  progress: 0.4,
  onPress: jest.fn(),
  ...over,
});

function render(cards: JourneyCard[]) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(createElement(JourneyCarousel, { cards }));
  });
  return root;
}

const tree = (root: TestRoot) => JSON.stringify(root.toJSON());
/**
 * How many of these actually rendered. `findAllByProps` returns both the element and the host View
 * it renders to, so the raw list is exactly twice the truth.
 */
const count = (root: TestRoot, testID: string) => root.root.findAllByProps({ testID }).length / 2;
const filledDots = (root: TestRoot) => count(root, 'milestone-dot-filled');

describe('what a card says', () => {
  it('renders one card per Journey, with its Dream and its title', () => {
    const root = render([card('a', { dream: 'Get fit' }), card('b')]);
    expect(tree(root)).toContain('a title');
    expect(tree(root)).toContain('b title');
    expect(tree(root)).toContain('Get fit');
  });

  it('shows progress as a percentage of the whole Journey', () => {
    expect(tree(render([card('a', { progress: 0.4 })]))).toContain('40%');
  });

  it('fills the rail up to the Milestone the Journey is IN, and no further', () => {
    const root = render([card('a', { milestone: { current: 2, total: 5 } })]);
    // Two filled of five: the Milestone it is in, and the one before it.
    expect(filledDots(root)).toBe(2);
  });

  it('draws no rail at all for a Journey with no Milestones', () => {
    const root = render([card('a')]);
    expect(filledDots(root)).toBe(0);
  });
});

describe('the pager', () => {
  it('shows a dot per card, so "there are more" is visible before swiping', () => {
    expect(count(render([card('a'), card('b'), card('c')]), 'pager-dot')).toBe(3);
  });

  it('is hidden for a single Journey — a pager over one card is furniture', () => {
    expect(count(render([card('only')]), 'pager-dot')).toBe(0);
  });
});

describe('nothing to show', () => {
  it('renders nothing at all rather than an empty frame', () => {
    expect(render([]).toJSON()).toBeNull();
  });
});
