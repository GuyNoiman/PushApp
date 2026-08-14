/**
 * dreamView — presentational derivations for the Dreams cluster (Dream Management, D40).
 *
 * A Dream is VIEW-ONLY on these screens (the coach owns creation/editing — D40), so this module
 * holds no mutation: it only groups a Dream's linked Journeys by lifecycle state for the detail
 * screen. The Journey↔Dream membership itself is derived by the framework-free `core/dreams`
 * selectors; here we take an already-linked Journey list and bucket it for display.
 *
 * GUARDRAIL (PRD §4.2): a Dream is never "completed" and has no progress of its own. We only label
 * each linked Journey's OWN state — there is no Dream-level percentage, completion, or Milestone.
 *
 * DISPLAY math only (Engineering Bible §19) — no rewards/Buddy/Journey logic lives here.
 */
import type { Journey } from '@/core/types/domain';

import { resolveJourneyStatus } from '@/core/util/journeyStatus';

import { historyStepStatus, toJourneyView, type JourneyView } from '@/components/journey/journeyView';
import type { ReasonEntry } from '@/core/types/domain';

/**
 * The lifecycle state a linked Journey reads as under a Dream. `frozen` (paused, resumable — J3) is
 * split out from `active` here so the detail screen can label a paused Journey honestly; `future` is
 * a still-`active` Journey scheduled to begin later; `canceled` is a Journey the user stopped
 * (`abandoned`), which lives under its Dream as part of the record and NEVER among the completed
 * ones. Maps 1:1 to the `dreams:status.*` labels.
 */
export type DreamJourneyState = 'active' | 'frozen' | 'future' | 'completed' | 'canceled';

export interface DreamJourneyGroup {
  state: DreamJourneyState;
  journeys: JourneyView[];
}

/** Display order: what's running now, then paused, then upcoming, then finished, then stopped. */
const STATE_ORDER: readonly DreamJourneyState[] = [
  'active',
  'frozen',
  'future',
  'completed',
  'canceled',
];

/** The state a single Journey reads as, from its derived {@link JourneyView}. */
function stateOf(view: JourneyView): DreamJourneyState {
  // BEFORE the bucket check on purpose: `bucketOf` files a canceled Journey under the `completed`
  // bucket (History is that tab), so reading the bucket first would label it "Completed" here —
  // exactly the success reading a canceled Journey must never get.
  if (view.status === 'abandoned') return 'canceled';
  if (view.bucket === 'completed') return 'completed';
  if (view.bucket === 'future') return 'future';
  if (view.status === 'frozen') return 'frozen';
  return 'active';
}

/**
 * Which of a Dream's linked Journeys are SHOWN under it (founder decision, 2026-08-14).
 *
 * Everything is shown, with ONE exception: a Journey the user canceled is shown only if at least one
 * Step on it was reported **done or partially done** (founder, 2026-08-14 — an earlier cut of this
 * rule counted only `done`, and was widened on his correction). A canceled Journey with no such Step
 * left no trace of showing up, so it is not part of the Dream's record — putting it there would turn
 * the Dream screen into a list of things that didn't happen. One that DID carry real work stays,
 * tagged "Canceled": the effort belongs to the Dream, and the tag keeps it from reading as a success.
 *
 * A partial counts because a partial IS work — the product's whole reporting model treats it that way
 * (D35/D36). A "couldn't" report does NOT count: it records that the Step did not happen, so it is
 * honest history on the Journey itself but nothing the Dream can show as progress toward it.
 *
 * Read through {@link historyStepStatus}, not `deriveStepStatus`, because cancelling marks every kept
 * non-done Step `dropped` and the plain derivation reads a dropped Step as `unreported` — which would
 * silently hide exactly the partials this rule exists to count.
 *
 * Shared so the Dream detail groups and the My Dreams Journey COUNT can never disagree about what
 * belongs to a Dream.
 */
export function visibleDreamJourneys(
  journeys: Journey[],
  reasonLog: readonly ReasonEntry[] = [],
): Journey[] {
  return journeys.filter(
    (j) =>
      resolveJourneyStatus(j) !== 'abandoned' ||
      j.steps.some((s) => {
        const status = historyStepStatus(s, reasonLog);
        return status === 'completed' || status === 'partially_completed';
      }),
  );
}

/**
 * Group a Dream's linked Journeys by lifecycle state, in a stable display order, dropping empty
 * groups. `journeys` is expected to already be the Dream's membership (via `core/dreams`
 * `journeysForDream`); this applies {@link visibleDreamJourneys}, then derives each Journey's view
 * and buckets it.
 */
export function groupDreamJourneys(
  journeys: Journey[],
  now: number = Date.now(),
  reasonLog: readonly ReasonEntry[] = [],
): DreamJourneyGroup[] {
  const views = visibleDreamJourneys(journeys, reasonLog).map((j) => toJourneyView(j, now));
  return STATE_ORDER.map((state) => ({
    state,
    journeys: views.filter((v) => stateOf(v) === state),
  })).filter((group) => group.journeys.length > 0);
}
