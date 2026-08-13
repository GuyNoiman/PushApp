/**
 * useReducedMotion — reports whether the OS "Reduce Motion" accessibility setting
 * is on, so animated surfaces (e.g. the Step celebration) can swap to a calm,
 * static acknowledgement (Completion Celebration PRD §2.1 / §7).
 *
 * Reads the current value once on mount and then follows live changes via an
 * `AccessibilityInfo` subscription (cleaned up on unmount). Defaults to `false`
 * and degrades quietly on web / unsupported platforms / any API rejection, so a
 * missing accessibility API never suppresses the celebration or crashes.
 *
 * Presentational glue (Engineering Bible §19): local UI state only.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (mounted) setReduced(enabled);
      } catch {
        // Web / unsupported — leave the calm default (false) rather than crash.
      }
    })();

    // Follow live changes so toggling Reduce Motion while a screen is open takes
    // effect immediately. The subscription object cleans itself up on unmount.
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduced(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
