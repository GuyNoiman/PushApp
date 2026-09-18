/**
 * The already-translated "Getting to know PushApp" content, read out of the `onboarding` namespace.
 *
 * It lives here rather than in `core/onboarding/introJourney` because the engines are framework-free
 * (Engineering Bible §19) and i18n is a UI concern — the engine takes strings, it does not fetch
 * them. It moved OUT of `app/coach.tsx` on 2026-09-15 so that more than one caller could read one
 * set of keys without becoming two copies of this function; the callers today are the two places
 * that COMPLETE onboarding (the coach's tail and the handoff's button), which is the moment the
 * Journey is built.
 */
import type { TFunction } from 'i18next';

import type { IntroJourneyContent } from '@/core/onboarding/introJourney';

/** `t` must be bound to the `onboarding` namespace. */
export function introJourneyContent(t: TFunction): IntroJourneyContent {
  return {
    title: t('introJourney.title'),
    why: t('introJourney.why', { returnObjects: true }) as string[],
    steps: t('introJourney.steps', { returnObjects: true }) as { title: string; description: string }[],
  };
}
