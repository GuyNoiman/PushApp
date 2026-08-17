/**
 * useScrollToTopOnTabPress — tapping the ALREADY-ACTIVE bottom tab returns that
 * screen to the top (founder device pass 2026-08-17: standard iOS behaviour we
 * were missing).
 *
 * React Navigation ships this as `useScrollToTop`, and this is the same
 * mechanism — listen for the tab navigator's `tabPress` and scroll the ref to
 * the top while the screen is focused. Two deliberate differences:
 *   · it does NOT throw when there is no navigation context. Our tab screens are
 *     rendered bare in unit tests (react-test-renderer, no NavigationContainer),
 *     and a screen should not need navigation plumbing just to be testable.
 *   · it drops the nested-stack "is this the first screen" check: every tab
 *     screen here is a direct child of the Tabs navigator.
 *
 * `tabPress` fires for the active tab too, which is exactly the gesture we want.
 * Pressing a DIFFERENT tab scrolls nothing, because this screen isn't focused.
 */
import { NavigationContext, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useContext, useEffect, type RefObject } from 'react';

/** The scroll surface we can return to the top (React Native's ScrollView and friends). */
export interface ScrollToTopTarget {
  scrollTo(options: { y?: number; animated?: boolean }): void;
}

/** The slice of a tab navigator we use — `tabPress` only exists on tab navigators. */
interface TabPressListener {
  addListener(
    type: 'tabPress',
    callback: (event: { defaultPrevented: boolean }) => void,
  ): () => void;
}

export function useScrollToTopOnTabPress(ref: RefObject<ScrollToTopTarget | null>): void {
  const navigation = useContext(NavigationContext);

  useEffect(() => {
    if (!navigation) return;

    // A screen can sit inside more than one tab navigator; listen on each.
    const tabNavigators: NavigationProp<ParamListBase>[] = [];
    let current: NavigationProp<ParamListBase> | undefined = navigation;
    while (current) {
      if (current.getState().type === 'tab') tabNavigators.push(current);
      current = current.getParent();
    }
    if (tabNavigators.length === 0) return;

    const unsubscribers = tabNavigators.map((tab) =>
      (tab as unknown as TabPressListener).addListener('tabPress', (event) => {
        const focused = navigation.isFocused();
        // Next frame, so any other listener's `preventDefault()` has already run.
        requestAnimationFrame(() => {
          if (focused && !event.defaultPrevented) ref.current?.scrollTo({ y: 0, animated: true });
        });
      }),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [navigation, ref]);
}
