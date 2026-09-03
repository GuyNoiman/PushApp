/**
 * "Getting to know PushApp" — the Journey that replaced the profile page in onboarding.
 *
 * ── WHY IT EXISTS (founder, 2026-09-03) ────────────────────────────────────────────────────────
 *
 * The first run used to stop on a page of profile fields: name, username, birth date, country, form
 * of address, language, active hours, week start. It was already the gentlest possible version of
 * that page — everything pre-filled, one button to confirm — and it was still a form standing
 * between somebody and the reason they opened the app. Nothing on it has to be answered before the
 * conversation; every one of those fields has a real screen of its own that is reachable forever.
 *
 * So the page LEAVES the first run and its contents become the first Journey instead. The person
 * arrives at Home with something already in it: a small Journey whose Steps walk them into the app
 * they just installed. That is not a workaround for a deleted page. A Journey with Steps is what
 * this product IS, so learning the app in the shape of the app is the demonstration.
 *
 * ── WHAT IT IS NOT ─────────────────────────────────────────────────────────────────────────────
 *
 * Not a tutorial overlay, not a checklist widget, not a badge. It is an ordinary Journey: it shows
 * up on Home and in the Journeys tab, its Steps are reported like any others, it can be paused, and
 * it can be abandoned by somebody who does not want it. Anything else would be a second mechanism
 * doing the job of the first one.
 *
 * ── ENGLISH IS NOT IN THIS FILE ────────────────────────────────────────────────────────────────
 *
 * The engines are framework-free (Engineering Bible §19) and i18n is a UI concern, so the caller
 * hands the already-translated strings in. That also keeps the Hebrew and English versions in the
 * one place translations live, rather than half here and half there.
 */
import type { NewJourneyInput } from '../engines/JourneyEngine';

/**
 * NO MARKER FIELD, deliberately. `libraryRef` means "an authored library definition built this",
 * which is not true here, and a `createdVia: 'intro'` would make every switch on that field carry a
 * third case for one Journey. What we actually need is "has this device had one?", and
 * {@link AppCore.completeOnboarding} already answers that: it runs its first-run branch exactly once
 * in the life of an install. An intro Journey is otherwise an ordinary Journey and should stay one.
 */

/** How long the intro Journey runs before it is simply over. */
export const INTRO_JOURNEY_DURATION_DAYS = 14;

/** Every string the Journey needs, already translated by the caller. */
export interface IntroJourneyContent {
  title: string;
  why: string[];
  steps: { title: string; description: string }[];
}

/**
 * The in-app destination for each Step, positionally paired with `content.steps`. Kept HERE rather
 * than in the translations: a route is not a translatable string, and a mistyped one in a locale
 * file would be a dead Step in one language only.
 */
export const INTRO_JOURNEY_LINKS: readonly string[] = [
  '/settings/profile',
  '/settings/active-hours',
  '/tools',
];

/**
 * The create-input for the intro Journey. Pure — it builds a value and creates nothing; the caller
 * decides whether this device should have one at all.
 */
export function introJourneyInput(content: IntroJourneyContent): NewJourneyInput {
  return {
    title: content.title,
    why: content.why,
    durationDays: INTRO_JOURNEY_DURATION_DAYS,
    rhythm: 'few-times-week',
    steps: content.steps.map((step, index) => ({
      title: step.title,
      description: step.description,
      // The first one is the Starter Step: the profile is the page this Journey exists to replace,
      // so it is the one that should be sitting at the top waiting to be easy.
      isStarterStep: index === 0,
      cadence: 'once' as const,
      estimatedDuration: 3,
      ...(INTRO_JOURNEY_LINKS[index] !== undefined ? { appLink: INTRO_JOURNEY_LINKS[index] } : {}),
    })),
  };
}
