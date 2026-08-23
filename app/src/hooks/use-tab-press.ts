/**
 * useOnTabPress — run something when the ALREADY-ACTIVE bottom tab is tapped again.
 *
 * The gesture already means "take me back to the start of this tab":
 * {@link ./use-scroll-to-top} uses it to return a long screen to the top. Some tabs have a second
 * kind of "inside" — the Tools tab can be sitting inside one room — and tapping the tab should leave
 * it, exactly as it would leave a scroll position (founder, 2026-08-24).
 *
 * Written as its own hook rather than folded into the scroll one because the two are different
 * intentions and a screen may want either, both, or neither. Same deliberate leniency: it does NOT
 * require a navigation context, so a tab screen stays renderable in a bare unit test.
 */
import { NavigationContext, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useContext, useEffect, useRef } from 'react';

interface TabPressListener {
  addListener(
    type: 'tabPress',
    callback: (event: { defaultPrevented: boolean }) => void,
  ): () => void;
}

export function useOnTabPress(handler: () => void): void {
  const navigation = useContext(NavigationContext);
  // Kept in a ref so a handler that closes over changing state never re-subscribes the listener.
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!navigation) return;

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
        requestAnimationFrame(() => {
          if (focused && !event.defaultPrevented) latest.current();
        });
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [navigation]);
}
