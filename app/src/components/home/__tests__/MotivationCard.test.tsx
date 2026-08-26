/**
 * MotivationCard — the Home surface of the motivation slice.
 *
 * The engines decide; this file renders. So what is proved here is only what the component itself
 * can get wrong: silence renders nothing at all, the day's slot is spent when the card actually
 * REACHES the screen, a verdict is reported once and the card stops asking, and "not now" is sent
 * as a dismissal rather than as a dislike.
 */
import { createElement, type ReactElement } from 'react';

import { MotivationCard } from '../MotivationCard';
import type { MotivationCard as Card } from '@/core/motivation/motivationCopy';

jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('i18next', () => ({ __esModule: true, default: { language: 'en' } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// `mock`-prefixed so jest allows the factory to close over it.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (href: string) => mockPush(href) } }));

const mockCore = {
  getMotivationCard: jest.fn<Card | null, []>(),
  noteMotivationShown: jest.fn(),
  rateMotivation: jest.fn(),
};
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore, snapshot: {} }) }));

interface Node {
  props: Record<string, any>;
}
interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): Node[] };
  toJSON(): any;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

const aCard = (over: Partial<Card> = {}): Card => ({
  itemId: 'weekPace',
  version: 1,
  theme: 'progress',
  title: 'This week is moving',
  body: 'You have reported 4 Steps done.',
  ...over,
});

function render() {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(createElement(MotivationCard));
  });
  return root;
}

/** Press the first pressable carrying this accessibility label. */
function press(root: TestRoot, label: string) {
  const target = root.root.findAllByProps({ accessibilityLabel: label }).find((n) => n.props.onPress);
  if (!target) throw new Error(`no pressable labelled ${label}`);
  TestRenderer.act(() => target.props.onPress());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MotivationCard', () => {
  it('renders nothing — and spends nothing — when the engine chose silence', () => {
    mockCore.getMotivationCard.mockReturnValue(null);
    const root = render();
    expect(root.toJSON()).toBeNull();
    expect(mockCore.noteMotivationShown).not.toHaveBeenCalled();
  });

  it('records the card as shown once it actually reaches the screen', () => {
    mockCore.getMotivationCard.mockReturnValue(aCard());
    render();
    expect(mockCore.noteMotivationShown).toHaveBeenCalledTimes(1);
    expect(mockCore.noteMotivationShown).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'weekPace', version: 1, theme: 'progress' }),
    );
  });

  it('reports Helpful, and then stops asking', () => {
    mockCore.getMotivationCard.mockReturnValue(aCard());
    const root = render();
    press(root, 'card.helpful');
    expect(mockCore.rateMotivation).toHaveBeenCalledWith('weekPace', 'helpful');
    expect(root.root.findAllByProps({ accessibilityLabel: 'card.helpful' })).toHaveLength(0);
  });

  it('sends "not now" as a DISMISSAL — never as a dislike', () => {
    mockCore.getMotivationCard.mockReturnValue(aCard());
    const root = render();
    press(root, 'card.dismiss');
    expect(mockCore.rateMotivation).toHaveBeenCalledWith('weekPace', 'dismissed');
  });

  it('shows no door when the item has none', () => {
    mockCore.getMotivationCard.mockReturnValue(aCard());
    const root = render();
    expect(root.root.findAllByProps({ accessibilityLabel: 'card.doorJourney' })).toHaveLength(0);
    expect(root.root.findAllByProps({ accessibilityLabel: 'card.doorToday' })).toHaveLength(0);
  });

  it('opens the Journey a door points at', () => {
    mockCore.getMotivationCard.mockReturnValue(aCard({ door: 'journey', journeyId: 'j1' }));
    const root = render();
    press(root, 'card.doorJourney');
    expect(mockPush).toHaveBeenCalledWith('/journey/j1');
  });
});
