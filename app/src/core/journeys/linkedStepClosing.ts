/**
 * linkedStepClosing — which open Steps a thing the person just DID inside the app closes.
 *
 * ── WHY IT EXISTS (founder, 2026-09-16, Gap Register B2) ───────────────────────────────────────
 *
 * A Step that names a screen ({@link Step.appLink}) spends its tap on going there, so the report
 * sheet was out of reach and nothing ever marked it done. Every Step of a new account's intro Journey
 * is linked, which meant a brand-new account's first Journey could not be finished by any visible
 * means. The founder chose the fix in one line: "הפרופיל נשמר → הצעד נסגר" — the action itself closes
 * the Step.
 *
 * ── WHY BY DESTINATION, NOT BY POSITION ───────────────────────────────────────────────────────
 *
 * The rule reads what a Step's link POINTS AT, never where the Step sits in its Journey. Two reasons:
 *  - the intro Journey changed shape (three Steps became four, and Active Hours left it), and the
 *    phones that already hold the old three-Step version must be finishable without anybody
 *    rewriting a Journey they already have. Their Steps still carry `/settings/profile`,
 *    `/settings/active-hours` and `/tools`, so they close by the same rules as the new ones;
 *  - a Step authored anywhere else — the library, one day the coach — that names one of these
 *    screens closes the same way, with nothing to register.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────────────────────────
 *
 * It decides and closes nothing itself. It answers "which Steps", and {@link AppCore.noteInAppAction}
 * closes each one through the SAME `checkInStep` a manual "Done" uses, so streaks, XP, KPI events and
 * Journey completion cannot tell the difference. A second completion path would be a second set of
 * rules to keep in step with the first.
 *
 * Pure, framework-free (Engineering Bible §19): no clock, no router, no React.
 */
import type { Journey } from '../types/domain';
import { isRunning } from '../util/journeyStatus';
import { stepLinkOf } from './stepLink';

/**
 * The in-app destinations a Step may name, as their canonical paths. The ONE list: the intro Journey
 * builds its links from these, and the closing rules below read the same values, so a route cannot be
 * renamed in one place and silently stop closing in the other.
 */
export const IN_APP_DESTINATIONS = {
  profile: '/settings/profile',
  activeHours: '/settings/active-hours',
  tools: '/tools',
  friends: '/friends',
  // The Coach tab route with no `mode` is the Journey-building (planning) conversation; the first-run
  // introduction and the edit flow are reached only with parameters this link does not carry.
  coach: '/coach',
} as const;

/**
 * Something the person just did inside the app that a linked Step may be waiting for. Each is a FACT
 * reported by the surface where it happened; none of them knows about Steps.
 *
 *  - `profileSaved`        a Personal Details field was saved on the Personal Details screen;
 *  - `activeHoursSaved`    Active Hours were saved;
 *  - `toolUsed`            a Tool was opened from the Tools tab (see the note on {@link ACTION_CLOSES});
 *  - `friendsVisited`      the friends area came into view;
 *  - `journeyBuiltWithCoach` a Journey was actually created from a coach conversation.
 */
export type InAppAction =
  | 'profileSaved'
  | 'activeHoursSaved'
  | 'toolUsed'
  | 'friendsVisited'
  | 'journeyBuiltWithCoach';

/**
 * Which destination each action satisfies.
 *
 * `toolUsed` is "a Tool was OPENED", and that is a deliberate, stated compromise: the Tools do not
 * share one "an entry was saved" signal. They write to five different stores, and some (Self-
 * Compassion's breathing) are complete without saving anything at all. Opening one from the Tools tab
 * is the one moment every Tool has in common.
 */
export const ACTION_CLOSES: Readonly<Record<InAppAction, string>> = {
  profileSaved: IN_APP_DESTINATIONS.profile,
  activeHoursSaved: IN_APP_DESTINATIONS.activeHours,
  toolUsed: IN_APP_DESTINATIONS.tools,
  friendsVisited: IN_APP_DESTINATIONS.friends,
  journeyBuiltWithCoach: IN_APP_DESTINATIONS.coach,
};

/**
 * A link reduced to the screen it names, so that spellings of the same place compare equal: the query
 * and fragment are dropped, an expo-router `(group)` segment contributes nothing (`/(tabs)/tools` IS
 * `/tools`), and a trailing slash is ignored. Undefined for anything {@link stepLinkOf} rejects.
 */
export function destinationOf(link: string | undefined): string | undefined {
  const valid = stepLinkOf({ appLink: link });
  if (valid === undefined) return undefined;
  const path = valid.split(/[?#]/, 1)[0];
  const segments = path.split('/').filter((s) => s.length > 0 && !(s.startsWith('(') && s.endsWith(')')));
  return `/${segments.join('/')}`;
}

/** One Step to close, addressed the way `checkInStep` takes it. */
export interface StepToClose {
  journeyId: string;
  stepId: string;
}

/**
 * The Steps `action` closes: every OPEN Step, of a RUNNING Journey, whose link names the destination
 * the action satisfies.
 *
 *  - open = not already done and not shed by the coach. A done Step is never closed again, which is
 *    also what keeps a second save from paying twice;
 *  - running = `active` only ({@link isRunning}). A paused, completed, abandoned or not-yet-started
 *    Journey is left exactly as it is: doing the thing again later is not a report on a Journey the
 *    person stopped.
 */
export function stepsClosedBy(journeys: readonly Journey[], action: InAppAction): StepToClose[] {
  const target = ACTION_CLOSES[action];
  const found: StepToClose[] = [];
  for (const journey of journeys) {
    if (!isRunning(journey)) continue;
    for (const step of journey.steps) {
      if (step.done || step.dropped) continue;
      if (destinationOf(step.appLink) !== target) continue;
      found.push({ journeyId: journey.id, stepId: step.id });
    }
  }
  return found;
}
