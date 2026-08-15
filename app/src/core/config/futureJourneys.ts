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
  /**
   * The day offsets the creation surfaces offer as one-tap start presets. Deliberately COARSE — the
   * question at final approval is "roughly when", not "at what minute". A user who wants a different
   * day nudges from a preset a day at a time; the app ships no native date picker, so every surface
   * is built from ordinary chips and buttons and keeps working in Expo Go and the web preview.
   */
  startPresetDays: [7, 14, 30],
  /**
   * The local hour a scheduled start lands on. A calm morning start rather than "the same minute of
   * the day you happened to approve the plan". The stored {@link Journey.startsAt} is an absolute
   * instant derived from this on the chosen calendar day, so DST can never move it afterwards.
   */
  defaultStartHour: 9,
  /** The window a start may be scheduled into, in days from today. */
  minScheduleDays: 1,
  maxScheduleDays: 365,
} as const;
