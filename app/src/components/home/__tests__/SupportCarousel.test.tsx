/**
 * SupportCarousel — the one section of Home that is about somebody else.
 *
 * The behaviours held down here are the ones where a bug would be a social mistake rather than a
 * visual one: sending a cheer to someone who went quiet, keeping the focus on a person who is not in
 * the list you switched to, or offering an action that does nothing.
 */
import { createElement, type ReactElement } from 'react';

import { SupportCarousel, type SupportPerson } from '../SupportCarousel';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
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

const person = (key: string, over: Partial<SupportPerson> = {}): SupportPerson => ({
  key,
  initials: key.slice(0, 2).toUpperCase(),
  name: key,
  status: `${key} status`,
  onPress: jest.fn(),
  onMessage: jest.fn(),
  ...over,
});

function render(needSupport: SupportPerson[], deservePraise: SupportPerson[]) {
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(createElement(SupportCarousel, { needSupport, deservePraise }));
  });
  return root;
}

/** Buttons that carry a press handler (the host View duplicates every element). */
const buttons = (root: TestRoot) =>
  root.root.findAllByProps({ accessibilityRole: 'button' }).filter((n) => typeof n.props.onPress === 'function');
const tabs = (root: TestRoot) =>
  root.root.findAllByProps({ accessibilityRole: 'tab' }).filter((n) => typeof n.props.onPress === 'function');
const tree = (root: TestRoot) => JSON.stringify(root.toJSON());
/** The WHY line of the person currently in focus — not every person's label in the tree. */
const focusedStatus = (root: TestRoot) =>
  root.root.findAllByProps({ testID: 'support-status' })[0]?.props.children;

describe('one person at a time', () => {
  it('opens on the first person who needs support, and says why they surfaced', () => {
    const root = render([person('maya'), person('adam')], []);
    expect(focusedStatus(root)).toBe('maya status');
  });

  it('moves the focus to whoever is tapped', () => {
    const root = render([person('maya'), person('adam')], []);
    const adam = buttons(root).find((b) => String(b.props.accessibilityLabel).startsWith('adam'))!;
    TestRenderer.act(() => adam.props.onPress());
    expect(focusedStatus(root)).toBe('adam status');
  });

  it('never leaves the focus past the end of a shorter tab', () => {
    // Two quiet friends, one to praise: switching after focusing the second must not read off the end.
    const root = render([person('maya'), person('adam')], [person('noa')]);
    TestRenderer.act(() =>
      buttons(root).find((b) => String(b.props.accessibilityLabel).startsWith('adam'))!.props.onPress(),
    );
    TestRenderer.act(() => tabs(root).find((t) => t.props.accessibilityLabel === 'support.tab.cheer')!.props.onPress());
    expect(focusedStatus(root)).toBe('noa status');
  });
});

describe('the two tones stay separate', () => {
  it('offers a nudge on the support tab and a cheer on the praise tab', () => {
    const root = render([person('maya')], [person('noa')]);
    expect(tree(root)).toContain('support.action.nudge');
    expect(tree(root)).not.toContain('support.action.cheer');
    TestRenderer.act(() => tabs(root).find((t) => t.props.accessibilityLabel === 'support.tab.cheer')!.props.onPress());
    expect(tree(root)).toContain('support.action.cheer');
    expect(tree(root)).not.toContain('support.action.nudge');
  });

  it('sends the tone-appropriate outreach for the FOCUSED person', () => {
    const maya = person('maya');
    const adam = person('adam');
    const root = render([maya, adam], []);
    TestRenderer.act(() =>
      buttons(root).find((b) => String(b.props.accessibilityLabel).startsWith('adam'))!.props.onPress(),
    );
    TestRenderer.act(() =>
      buttons(root).find((b) => b.props.accessibilityLabel === 'support.action.nudge')!.props.onPress(),
    );
    expect(adam.onPress).toHaveBeenCalledTimes(1);
    expect(maya.onPress).not.toHaveBeenCalled();
  });
});

describe('Message is offered even though messaging is not built yet', () => {
  it('is present and goes somewhere — a button that answers with silence teaches people to stop tapping', () => {
    const maya = person('maya');
    const root = render([maya], []);
    TestRenderer.act(() =>
      buttons(root).find((b) => b.props.accessibilityLabel === 'support.action.message')!.props.onPress(),
    );
    expect(maya.onMessage).toHaveBeenCalledTimes(1);
  });
});

describe('an empty tab', () => {
  it('says something true instead of showing a person who is not there', () => {
    const root = render([], [person('noa')]);
    expect(tree(root)).toContain('support.empty.nudge');
    expect(focusedStatus(root)).toBeUndefined();
  });
});
