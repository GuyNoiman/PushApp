/**
 * Streak config — the tunable numbers behind the day-count streak (founder decision D26.4).
 * Configuration-before-code (Engineering Bible §3): the streak RULE lives here, not as magic
 * numbers inside the StreakEngine, so its definition can be adjusted without touching logic.
 *
 * CURRENT, ADJUSTABLE DEFINITION: the streak breaks ONLY when an URGENT Step is missed. A Step
 * is urgent when its Journey has "no slack left this week" — the sessions still required this
 * week are at least the days still left in the week. `requiredSessionsPerWeek` maps a Journey's
 * rhythm to how many check-in sessions a full week asks for; the urgency test reads it.
 */
import type { Rhythm } from '../types/domain';

export interface StreakConfig {
  /**
   * Check-in sessions a full week asks for, per Journey rhythm — the basis of the "no slack
   * left" urgency test. Daily = one a day; few-times-week = a representative three; weekly = one.
   */
  requiredSessionsPerWeek: Record<Rhythm, number>;
}

export const STREAK_CONFIG: StreakConfig = {
  requiredSessionsPerWeek: {
    daily: 7,
    'few-times-week': 3,
    weekly: 1,
  },
};
