/**
 * ConnectionNotice — the card that says a capability is off because there is no session.
 *
 * The point of this card is that it is HONEST and ACTIONABLE, so those two things are what is
 * pinned: it shows what does not work, and where a retry is possible it offers one that fires. The
 * dismiss is offered only where the caller passes one — the Coach deliberately has no dismiss,
 * because dismissing a screen that cannot do its job leaves nothing behind.
 *
 * `t` is stubbed to echo its key, so the assertions read as the copy keys the card must show.
 */
import { createElement, type ReactElement } from 'react';

import { ConnectionNotice } from '../ConnectionNotice';

jest.mock('@/global.css', () => ({}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));

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

async function render(props: Parameters<typeof ConnectionNotice>[0]): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(ConnectionNotice, props));
  });
  if (!r) throw new Error('render failed');
  return r;
}

const json = (r: TestRoot) => JSON.stringify(r.toJSON());

describe('ConnectionNotice', () => {
  it('shows the title and the body it was given', async () => {
    const r = await render({ title: 'no.server', body: 'what.stopped.working' });
    expect(json(r)).toContain('no.server');
    expect(json(r)).toContain('what.stopped.working');
  });

  it('fires the retry it offers', async () => {
    const onRetry = jest.fn();
    const r = await render({ title: 't', body: 'b', onRetry });

    await act(async () => {
      r.root.findAllByProps({ accessibilityLabel: 'connection.retry' })[0].props.onPress();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows it is working and refuses a second tap mid-retry', async () => {
    const onRetry = jest.fn();
    const r = await render({ title: 't', body: 'b', onRetry, retrying: true });

    expect(json(r)).toContain('connection.retrying');
    const button = r.root.findAllByProps({ accessibilityLabel: 'connection.retry' })[0];
    expect(button.props.disabled).toBe(true);
  });

  it('offers no retry and no dismiss unless the caller passes them', async () => {
    const r = await render({ title: 't', body: 'b' });
    expect(r.root.findAllByProps({ accessibilityLabel: 'connection.retry' })).toHaveLength(0);
    expect(r.root.findAllByProps({ accessibilityLabel: 'dismiss' })).toHaveLength(0);
  });

  it('dismisses when a dismiss is offered', async () => {
    const onDismiss = jest.fn();
    const r = await render({ title: 't', body: 'b', onDismiss });

    await act(async () => {
      r.root.findAllByProps({ accessibilityLabel: 'dismiss' })[0].props.onPress();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
