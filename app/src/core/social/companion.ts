/**
 * Companion helpers (Journey Support Circle, D2) — the pure, framework-free rules for the
 * Companion bundle. Kept out of the gateway/UI so both share ONE definition (Bible §19).
 *
 * SECURITY-PRIVACY (G2 whitelist): {@link companionStepsFor} builds the ONLY Step data that may
 * cross to a Companion Ally — a Step's id, its (coach-generated) title, its DERIVED status, and the
 * report date. It DELIBERATELY reads no reason/note/description/"why"/postpone field. Companion is
 * offered ONLY for coach-created Journeys ({@link isCompanionEligible}); a manual Journey's user-typed
 * Step titles must never reach here.
 */
import { deriveStepStatus } from '../status/stepStatus';
import type { Journey, ReasonEntry } from '../types/domain';
import type { AllyBundle, CompanionStepInput } from './SocialGateway';

/**
 * Whether a Journey may offer the Companion bundle: ONLY coach-created Journeys (D2). A `'manual'`
 * or legacy/undefined `createdVia` is Companion-INELIGIBLE (its Step titles are user free text).
 */
export function isCompanionEligible(journey: Pick<Journey, 'createdVia'>): boolean {
  return journey.createdVia === 'coach';
}

/**
 * The REAL second layer behind the coach-only Companion rule (D2, security-privacy #3): throws before
 * any write that would set a Journey to the Companion bundle ('full' visibility, which unmasks the
 * title) when that Journey is not coach-eligible. Callers (the SocialProvider invite/change actions)
 * MUST run this before touching the gateway, so a manual Journey's user-typed title can never be
 * exposed — even from an older/rogue client that ignores the disabled UI button. A missing Journey is
 * treated as ineligible (fail-closed). Encourager is always allowed.
 */
export function assertCompanionAllowed(
  journey: Pick<Journey, 'createdVia'> | undefined,
  bundle: AllyBundle,
): void {
  if (bundle === 'companion' && !(journey && isCompanionEligible(journey))) {
    throw new Error('Companion is available on coach-built Journeys only.');
  }
}

/**
 * Build the Companion Step payload for a coach Journey — system-generated data only. Dropped Steps
 * are excluded (out of scope). The `reasonLog` is passed in (never read here for its text) purely so
 * {@link deriveStepStatus} can classify Partial / Not-completed. Returns `[]` for a Journey with no
 * in-scope Steps.
 */
export function companionStepsFor(
  journey: Journey,
  reasonLog: readonly ReasonEntry[] = [],
): CompanionStepInput[] {
  return journey.steps
    .filter((s) => !s.dropped)
    .map((s) => ({
      stepId: s.id,
      title: s.title,
      status: deriveStepStatus(s, reasonLog),
      reportedAt: s.lastCheckInAt ?? null,
    }));
}
