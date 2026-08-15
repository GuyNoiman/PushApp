/**
 * aggregateCopy — the TYPE-ONLY contract for the words of a low-frequency ADAPTIVE AGGREGATE
 * notification (Smart_Notification_Timing_PRD §3): one send that may summarize several pending
 * Steps across several Journeys and opens Home / Today's Focus.
 *
 * WHY THIS EXISTS NOW, EMPTY: the CommunicationScheduler is a pure, i18n-free timing algorithm and
 * must stay that way (Engineering Bible §19), so it is HANDED its copy rather than building it —
 * exactly like {@link ReminderCopyBuilder}. Declaring the seam here settles the scheduler's
 * constructor signature in ONE place and in ONE pass, instead of reopening it when the aggregate
 * slice lands. There is deliberately no implementation yet: the aggregate itself is deferred, and
 * with no builder injected the scheduler simply never plans an aggregate.
 *
 * PRIVACY: mirrors the reminder builder — the aggregate is described by COUNTS and Journey titles
 * the user wrote themselves, never Step titles (PRD §6 Q3: no Step names on the lock screen).
 *
 * Pure TS — no React, no vendor imports.
 */

/** What an aggregate covers: how many Journeys, and how many actionable pending Steps in total. */
export interface AggregateCopyInput {
  /** The Journeys included in this send, in plan order. */
  journeys: { journeyId: string; journeyTitle: string }[];
  /** Total actionable pending Steps across those Journeys — a count, never a title. */
  pendingStepCount: number;
}

/**
 * Build the copy for one adaptive aggregate, or `null` when it cannot be built — in which case the
 * caller sends nothing rather than something blank.
 */
export type AggregateCopyBuilder = (
  input: AggregateCopyInput,
) => { title: string; body: string } | null;
