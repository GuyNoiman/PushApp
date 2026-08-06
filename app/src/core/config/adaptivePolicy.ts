/**
 * AdaptivePolicy — the tunable thresholds the adaptive coach's re-planner
 * ({@link ../learning/AdaptivePlanner}.replan) reasons with. Config-before-code: every
 * knob that decides HOW HARD the coach reacts lives here, NEVER hard-coded in the engine,
 * so the founder can tune the coach's temperament without touching logic (mirrors the
 * config/levers.ts + config/reasons.ts pattern).
 *
 * All numbers are CANDIDATE defaults for the POC — deliberately conservative — and are
 * expected to be tuned later against real behaviour. They are aligned with the (currently
 * inline) thresholds in insights/deriveInsights.ts so the two layers agree on what
 * "behind"/"at-risk"/"strong" means.
 *
 * Pure TS — no React, no UI, no vendor imports.
 */

/**
 * paceRatio (0..1 = planned occurrences completed on-plan / planned occurrences) bands. The
 * re-planner picks a response by which band the user's pace falls into.
 */
export interface PaceBands {
  /** paceRatio AT/ABOVE which the user is ON-TRACK — no compression is needed. */
  onTrack: number;
  /** paceRatio AT/ABOVE which the user is merely BEHIND (compress); BELOW ⇒ CRITICAL (compress, then shed). */
  behind: number;
  /** paceRatio AT/ABOVE which the user is performing STRONGLY — allow larger Steps and bank buffer. */
  strong: number;
}

/** Slip-rate (0..1 share of occurrences that slipped) cutoffs. */
export interface SlipPolicy {
  /** slipRate AT/ABOVE which the slip response fires (redistribute the Milestone's Steps + shrink). */
  high: number;
}

/** Per-Milestone reliability (0..1 = done / total for that Milestone) cutoffs. */
export interface ReliabilityPolicy {
  /** Reliability BELOW which a Milestone's remaining Steps are eased (shrink + easier). */
  low: number;
  /** Reliability AT/ABOVE which a Milestone counts as strong (safe to grow). */
  high: number;
}

/** Session-size (minutes) bounds and the step size the coach resizes by. */
export interface SessionPolicy {
  /** Never shrink a Step below this many minutes (keeps it worth doing). */
  minMinutes: number;
  /** Never grow a Step beyond this many minutes (avoids overload). */
  maxMinutes: number;
  /** Assumed minutes for a Step with no estimate, used ONLY for deadline feasibility maths. */
  defaultMinutes: number;
  /** Fraction to shrink a Step's minutes by when easing load (0.25 = −25%). */
  shrinkFactor: number;
  /** Fraction to grow a Step's minutes by when the user is strong (0.25 = +25%). */
  growFactor: number;
}

/** Difficulty (1..5) bounds and the step size the coach moves difficulty by. */
export interface DifficultyPolicy {
  /** How many difficulty points to move per adjustment. */
  step: number;
  /** Difficulty floor. */
  min: number;
  /** Difficulty ceiling. */
  max: number;
}

/** Deadline handling. */
export interface DeadlinePolicy {
  /** Days of buffer to try to leave before the targetDate when compressing (finish early). */
  bufferDays: number;
}

/** Nudge-timing knobs that feed the {@link ../learning/types}.NudgeHint the re-plan emits. */
export interface NudgePolicy {
  /** Minutes before a planned Step the nudge hint suggests firing. */
  leadMinutes: number;
  /** Add an extra pre-reminder when the plan is at-risk. */
  extraWhenAtRisk: boolean;
}

/** The full policy the re-planner consumes. */
export interface AdaptivePolicy {
  pace: PaceBands;
  slip: SlipPolicy;
  reliability: ReliabilityPolicy;
  session: SessionPolicy;
  difficulty: DifficultyPolicy;
  deadline: DeadlinePolicy;
  nudge: NudgePolicy;
}

/**
 * The default POC policy. Bands intentionally echo deriveInsights.ts (onTrack≈0.75 mirrors
 * STREAK_STRONG_PACE, behind≈0.5 mirrors ATRISK_PACE_RATIO, slip.high≈0.3 mirrors
 * ATRISK_SLIP_RATE) so the derived model and the re-planner share one notion of trouble.
 */
export const defaultAdaptivePolicy: AdaptivePolicy = {
  pace: { onTrack: 0.75, behind: 0.5, strong: 0.9 },
  slip: { high: 0.3 },
  reliability: { low: 0.5, high: 0.85 },
  session: { minMinutes: 5, maxMinutes: 60, defaultMinutes: 20, shrinkFactor: 0.25, growFactor: 0.25 },
  difficulty: { step: 1, min: 1, max: 5 },
  deadline: { bufferDays: 2 },
  nudge: { leadMinutes: 30, extraWhenAtRisk: true },
};
