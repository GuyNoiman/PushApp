/**
 * Future Journey policy (Future Journey Management, §10) — the SINGLE source of how many complete
 * plans a user may hold "for later". Config before code: the numbers live ONLY here, never inlined
 * in an engine or a screen.
 *
 * WHY a cap at all: a Future Journey is a full, approved transformation plan, not a task-backlog
 * entry. An unbounded list turns into a guilt-producing backlog and quietly raises the cognitive
 * load the product exists to lower. The cap is a FOCUS mechanism — it is explicitly NOT storage
 * scarcity or a paywall lever. At the cap nothing is silently replaced or evicted: the user starts,
 * edits, reschedules, or removes one themselves.
 *
 * `reviewThreshold` is where the Coach MAY gently offer an optional relevance review ("are these
 * still what you want?"). An offer only — never a nag, never a block.
 *
 * Pure TS — no React, no vendor imports, no clock reads.
 */
export const FUTURE_JOURNEY_POLICY = {
  /** Hard maximum number of Journeys in the `future` status at once (§10). */
  max: 10,
  /** Count at which the Coach may offer an OPTIONAL relevance review (§10). */
  reviewThreshold: 5,
} as const;
