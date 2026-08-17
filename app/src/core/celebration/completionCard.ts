/**
 * buildCompletionCard (Completion Celebration, I1) — the PURE builder that mints a durable
 * {@link CompletionCard} for a completed {@link Journey}. Framework-free, no I/O, no `Date.now()`
 * (the caller injects `now`). Business logic lives in core, never in a component (Engineering
 * Bible §19).
 *
 * SECURITY-PRIVACY (PRD §3, §6, §9): this copies ONLY whitelisted safe fields. It NEVER reads a
 * Step's report / `why` / note, the Journey's Dream, or any Ally data — even when the source Journey
 * carries rich reports. The card is on-device only and whitelist-excluded from any social payload.
 */
import type { CompletionCard, Journey } from '../types/domain';
import { CARD_TEMPLATE_VERSION } from './cardTemplates';
import { journeyStepCounts } from '../util/journeyProgress';

/**
 * Build the completion card for `journey`. Snapshots the title at completion time (a later rename
 * never rewrites the card), stamps the current template version, and records only non-sensitive
 * display counts. `completedAt` reads the Journey's own completion time when present, else `now`
 * (so an explicit reopen that lazily builds a card still gets a sane timestamp).
 */
export function buildCompletionCard(journey: Journey, now: number): CompletionCard {
  // In-scope Steps only: a Step the adaptive coach dropped is out of scope and not part of the
  // completed work count. Read through the SHARED count (`core/util/journeyProgress`), so the
  // number printed on a durable card can never disagree with the progress the user watched climb.
  const { totalSteps } = journeyStepCounts(journey);
  return {
    journeyId: journey.id,
    journeyTitleSnapshot: journey.title,
    completedAt: journey.completedAt ?? now,
    templateVersion: CARD_TEMPLATE_VERSION,
    totalSteps,
    durationDays: journey.durationDays,
  };
}
