/**
 * useScrollToTopOnTabPress — tapping the tab you are already on returns that page to the top
 * (founder device pass 2026-08-17).
 *
 * The behaviour is easy to get subtly wrong, so this pins the four cases that matter:
 *   · pressing the tab while this screen is FOCUSED scrolls it to the top;
 *   · pressing a tab while this screen is NOT focused leaves it exactly where it was (otherwise
 *     every tab would silently rewind whenever any tab was tapped);
 *   · an event another listener already called `preventDefault()` on is left alone;
 *   · with no navigation above it the hook is a NO-OP rather than a throw — our screens are rendered
 *     bare in unit tests, and that is the reason this hook exists instead of React Navigation's.
 *
 * A fake navigator stands in for the real one: the hook only ever asks it three things (its state
 * type, its parent, whether the screen is focused) and subscribes to `tabPress`.
 */
import { NavigationContext, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { createElement, useRef, type ReactElement } from 'react';

import { useScrollToTopOnTabPress, type ScrollToTopTarget } from '../use-scroll-to-top';

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): unknown;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

// The hook defers the scroll by one frame so another listener's `preventDefault()` has run; make
// that frame synchronous so the assertions don't have to wait on the real clock.
const originalRaf = global.requestAnimationFrame;
beforeAll(() => {
  global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof global.requestAnimationFrame;
});
afterAll(() => {
  global.requestAnimationFrame = originalRaf;
});

/** A stand-in navigator that records its `tabPress` subscribers so a test can fire one. */
function fakeNavigator({ type = 'tab', focused = true }: { type?: string; focused?: boolean } = {}) {
  const listeners: ((event: { defaultPrevented: boolean }) => void)[] = [];
  const navigation = {
    getState: () => ({ type }),
    getParent: () => undefined,
    isFocused: () => focused,
    addListener: (event: string, callback: (event: { defaultPrevented: boolean }) => void) => {
      if (event === 'tabPress') listeners.push(callback);
      return () => {
        const at = listeners.indexOf(callback);
        if (at >= 0) listeners.splice(at, 1);
      };
    },
  } as unknown as NavigationProp<ParamListBase>;
  return {
    navigation,
    subscribers: () => listeners.length,
    pressTab: (defaultPrevented = false) => listeners.forEach((cb) => cb({ defaultPrevented })),
  };
}

/** A screen whose only job is to hand the hook a scroll surface we can watch. */
function Probe({ target }: { target: ScrollToTopTarget }) {
  const ref = useRef<ScrollToTopTarget | null>(target);
  useScrollToTopOnTabPress(ref);
  return null;
}

async function render(target: ScrollToTopTarget, navigation?: NavigationProp<ParamListBase>) {
  const probe = createElement(Probe, { target });
  await act(async () => {
    TestRenderer.create(
      navigation ? createElement(NavigationContext.Provider, { value: navigation }, probe) : probe,
    );
  });
}

const spy = () => ({ scrollTo: jest.fn() });

describe('useScrollToTopOnTabPress', () => {
  it('scrolls the focused screen to the top when its tab is pressed', async () => {
    const target = spy();
    const tab = fakeNavigator();
    await render(target, tab.navigation);

    await act(async () => tab.pressTab());

    expect(target.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('leaves an UNFOCUSED screen where it was — switching tabs must not rewind the others', async () => {
    const target = spy();
    const tab = fakeNavigator({ focused: false });
    await render(target, tab.navigation);

    await act(async () => tab.pressTab());

    expect(target.scrollTo).not.toHaveBeenCalled();
  });

  it('respects a tabPress another listener already prevented', async () => {
    const target = spy();
    const tab = fakeNavigator();
    await render(target, tab.navigation);

    await act(async () => tab.pressTab(true));

    expect(target.scrollTo).not.toHaveBeenCalled();
  });

  it('subscribes to nothing when the navigator above is not a tab navigator', async () => {
    const target = spy();
    const stack = fakeNavigator({ type: 'stack' });
    await render(target, stack.navigation);

    expect(stack.subscribers()).toBe(0);
  });

  it('is a no-op, not a crash, with no navigation above it (a screen rendered bare in a test)', async () => {
    const target = spy();
    await expect(render(target)).resolves.toBeUndefined();
    expect(target.scrollTo).not.toHaveBeenCalled();
  });
});
