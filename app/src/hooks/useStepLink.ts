/**
 * useStepLink — the ONE way a Step row goes to the screen it names ({@link Step.appLink}).
 *
 * Almost every Step in PushApp happens outside the app, so a tap asks how it went, which is right
 * and stays the default on every surface. A Step that NAMES a screen — the "Getting to know
 * PushApp" Journey walks somebody into their profile, the Tools tab, the friends area and the coach — opens
 * that screen instead: being asked "did you do it?" by the thing that has not taken you there yet
 * is a question nobody can answer.
 *
 * Contract: `openStepLink(step)` returns TRUE when it navigated and FALSE when it did not, so the
 * caller reads as "…and otherwise do what you always do":
 *
 *     if (openStepLink(item.step)) return;
 *     setReportStep(item);
 *
 * A FALSE is never an error state. It means either "this Step names no screen" (the ordinary case)
 * or "the name it carries went nowhere" — and in both the caller's normal behaviour is the right
 * thing to fall back to. A dead tap would be worse than a question.
 *
 * Reporting is UNTOUCHED everywhere. Swipe, Done, Postpone and Let go still work on a linked Step
 * exactly as they do on every other one; this only decides what a plain tap does.
 */
import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';

import { stepLinkOf, type StepWithLink } from '@/core/journeys/stepLink';

export function useStepLink(): (step: StepWithLink | undefined) => boolean {
  const router = useRouter();

  return useCallback(
    (step: StepWithLink | undefined) => {
      const link = stepLinkOf(step);
      if (link === undefined) return false;
      try {
        // `appLink` is a string at rest (a Step is data, and data does not carry expo-router's typed
        // Href), so the cast is where the validated value re-enters the typed router.
        router.push(link as Href);
        return true;
      } catch {
        // An unknown route does NOT crash the app — expo-router answers it with its unmatched-route
        // screen. This catch is for the rarer failures (navigating before the tree is mounted), and
        // it stays QUIET on purpose: a Step pointing at a screen we removed is our bug to fix, not
        // an alarm to hand the person mid-tap. They get the ordinary Step behaviour instead.
        return false;
      }
    },
    [router],
  );
}
