/**
 * useFocusRefresh — run something when the screen comes back into view, WITHOUT requiring a
 * navigation container to exist.
 *
 * React Navigation's `useFocusEffect` throws when there is no navigation object, and our screens are
 * rendered bare in unit tests (react-test-renderer, no container). The repo already made that
 * decision once, for the tab-press hook: a screen should not need navigation plumbing just to be
 * testable. This is the same leniency for the focus event.
 *
 * With no navigation, the callback still runs once on mount — which is the honest degradation: the
 * data loads, it simply does not refresh on a focus event that cannot happen.
 */
import { NavigationContext } from '@react-navigation/native';
import { useContext, useEffect, useRef } from 'react';

export function useFocusRefresh(effect: () => void): void {
  const navigation = useContext(NavigationContext);
  const latest = useRef(effect);
  latest.current = effect;

  // Always once, container or not.
  useEffect(() => {
    latest.current();
  }, []);

  useEffect(() => {
    if (!navigation) return;
    return navigation.addListener('focus' as never, (() => latest.current()) as never);
  }, [navigation]);
}
