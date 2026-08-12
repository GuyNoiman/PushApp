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

import { toJourneyView, type JourneyView } from '@/components/journey/journeyView';

/**
 * The lifecycle state a linked Journey reads as under a Dream. `frozen` (paused, resumable — J3) is
 * split out from `active` here so the detail screen can label a paused Journey honestly; `future` is
 * a still-`active` Journey scheduled to begin later. Maps 1:1 to the `dreams:status.*` labels.
 */
export type DreamJourneyState = 'active' | 'frozen' | 'future' | 'completed';

export interface DreamJourneyGroup {
  state: DreamJourneyState;
  journeys: JourneyView[];
}

/** Display order: what's running now, then paused, then upcoming, then finished. */
const STATE_ORDER: readonly DreamJourneyState[] = ['active', 'frozen', 'future', 'completed'];

/** The state a single Journey reads as, from its derived {@link JourneyView}. */
function stateOf(view: JourneyView): DreamJourneyState {
  if (view.bucket === 'completed') return 'completed';
  if (view.bucket === 'future') return 'future';
  if (view.status === 'frozen') return 'frozen';
  return 'active';
}

/**
 * Group a Dream's linked Journeys by lifecycle state, in a stable display order, dropping empty
 * groups. `journeys` is expected to already be the Dream's membership (via `core/dreams`
 * `journeysForDream`); this only derives each Journey's view and buckets it.
 */
export function groupDreamJourneys(
  journeys: Journey[],
  now: number = Date.now(),
): DreamJourneyGroup[] {
  const views = journeys.map((j) => toJourneyView(j, now));
  return STATE_ORDER.map((state) => ({
    state,
    journeys: views.filter((v) => stateOf(v) === state),
  })).filter((group) => group.journeys.length > 0);
}
