/**
 * useStepLink — the ONE way a Step row goes to the screen it names.
 *
 * What is pinned here is the CONTRACT every surface leans on: it returns true only when it actually
 * navigated, so `if (openStepLink(step)) return;` is a safe way to write "…and otherwise do what you
 * always do". The failure case is the point of the file — a route that goes nowhere must hand the
 * caller its ordinary behaviour back, never a crash and never a dead tap.
 */
import { createElement, type ReactElement } from 'react';

import { useStepLink } from '../useStepLink';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: (href: string) => mockPush(href) }) }));

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): unknown;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

/** Render a throwaway host and hand back the hook's `openStepLink`. */
async function open(step: { appLink?: string } | undefined): Promise<boolean> {
  let result = false;
  function Host() {
    const openStepLink = useStepLink();
    result = openStepLink(step);
    return null;
  }
  await act(async () => {
    TestRenderer.create(createElement(Host));
  });
  return result;
}

beforeEach(() => mockPush.mockReset());

describe('useStepLink', () => {
  it('navigates to the screen a Step names, and says it did', async () => {
    expect(await open({ appLink: '/settings/active-hours' })).toBe(true);
    expect(mockPush).toHaveBeenCalledWith('/settings/active-hours');
  });

  it('navigates nowhere for a Step that names no screen, so the caller reports as usual', async () => {
    expect(await open({})).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('refuses a destination outside the app', async () => {
    expect(await open({ appLink: 'https://example.com' })).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('fails QUIETLY when the route goes nowhere — the caller falls back, nothing throws', async () => {
    mockPush.mockImplementation(() => {
      throw new Error('No route named "/gone" exists');
    });
    expect(await open({ appLink: '/gone' })).toBe(false);
  });
});
