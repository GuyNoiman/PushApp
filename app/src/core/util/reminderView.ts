/**
 * reminderView — the pure resolver that turns a Journey's managed {@link ReminderRule}
 * into the singular view the UI edits: a mode (Off / Fixed / Smart), a wall-clock time,
 * and the enabled weekdays (Journey Reminder Management, D40).
 *
 * Backward-compat is the whole point of resolving here rather than reading `mode` raw: a
 * rule persisted before `mode` existed has none, so an ENABLED rule resolves to `'fixed'`
 * and a disabled one to `'off'` — matching how the scheduler already treats `enabled`.
 * `'smart'` is only ever produced when it was explicitly stored (a reserved value; not
 * selectable in the current UI). Pure TS — no clock read, no vendor imports.
 */
import type { Journey, ReminderRule, SchedulingPrefs } from '../types/domain';
import { minuteOfDay } from './date';

export type ReminderMode = 'off' | 'fixed' | 'smart';

/** The singular per-Journey reminder view the detail screen renders + edits. */
export interface JourneyReminder {
  /** The managed rule's id when one exists (absent when the Journey has no reminder yet). */
  ruleId?: string;
  mode: ReminderMode;
  /** 0-23 local hour of the Fixed time (a sensible default when there is no rule). */
  hour: number;
  /** 0-59 local minute of the Fixed time. */
  minute: number;
  /** Enabled weekdays in JS `Date.getDay()` convention (0=Sun … 6=Sat); empty = every day. */
  weekdays: number[];
}

/**
 * The last-resort Fixed time, used ONLY when a Journey carries no schedule and the account has no
 * Active Hours — i.e. when the app genuinely knows nothing about when this person is available.
 * Prefer {@link defaultReminderTimeFor}, which asks the plan and the account first.
 */
export const DEFAULT_REMINDER_HOUR = 9;
export const DEFAULT_REMINDER_MINUTE = 0;

/** A wall-clock time of day, local. */
export interface TimeOfDay {
  hour: number;
  minute: number;
}

/**
 * WHEN a Journey's default reminder should fire — derived, never a constant.
 *
 * The app used to answer this in two places with two different numbers: the creation wizard
 * pre-selected 08:00 and the engine's default rule used 09:00, so the same Journey was reminded at
 * a different time depending on which screen it was born on. Worse, both were fixed hours that
 * ignored the user's own Active Hours entirely — 08:00 can sit outside the window someone told us
 * they are available in, which is the one thing the setting exists to prevent.
 *
 * The order below is "ask the most specific thing that knows":
 *
 *  1. **The plan itself.** The interview already asks when the user can do this, and the Planner
 *     schedules every Step at that hour. So the first scheduled Step IS the user's answer to "when
 *     is this happening" — reminding at any other time would be the app disagreeing with a plan the
 *     user just approved.
 *  2. **The account's Active Hours**, when the plan carries no dates (a frequency-based plan): the
 *     start of the shared window, which is the earliest moment the user has said they are reachable.
 *  3. **{@link DEFAULT_REMINDER_HOUR}**, only when neither exists.
 *
 * Per-day Active Hours are deliberately NOT resolved here: this returns one time for the whole
 * rule, and the scheduler already clamps each firing into that specific day's window at send time
 * (D40 — enforcement is clamp, not disable). Duplicating the per-day clamp here would be a second
 * definition of the same rule, which is how the two defaults drifted apart in the first place.
 *
 * Pure — no clock read.
 */
export function defaultReminderTimeFor(
  journey: Pick<Journey, 'steps'>,
  prefs: SchedulingPrefs | undefined,
): TimeOfDay {
  const planned = journey.steps
    .filter((s) => !s.dropped && typeof s.plannedFor === 'number')
    .map((s) => s.plannedFor!)
    .sort((a, b) => a - b);

  if (planned.length > 0) {
    const at = new Date(planned[0]);
    return { hour: at.getHours(), minute: at.getMinutes() };
  }

  const shared = prefs?.activeHours?.days.find((d) => d.enabled)?.window ?? prefs?.window;
  if (shared && shared.start !== shared.end) {
    const minutes = minuteOfDay(shared.start);
    return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
  }

  return { hour: DEFAULT_REMINDER_HOUR, minute: DEFAULT_REMINDER_MINUTE };
}

/**
 * Resolve a Journey's managed reminder rule (or none) into a {@link JourneyReminder}. A
 * missing rule ⇒ Off at the default time; an existing rule's mode is the stored one, else
 * derived from `enabled` (see file header). Only a `fixedTime` trigger carries a wall-clock
 * time; the dormant calendar/location kinds fall back to the default time.
 */
export function resolveReminderRule(rule: ReminderRule | undefined): JourneyReminder {
  if (!rule) {
    return { mode: 'off', hour: DEFAULT_REMINDER_HOUR, minute: DEFAULT_REMINDER_MINUTE, weekdays: [] };
  }
  const mode: ReminderMode = rule.mode ?? (rule.enabled ? 'fixed' : 'off');
  if (rule.trigger.kind === 'fixedTime') {
    return {
      ruleId: rule.id,
      mode,
      hour: rule.trigger.hour,
      minute: rule.trigger.minute,
      weekdays: rule.trigger.weekdays ?? [],
    };
  }
  return {
    ruleId: rule.id,
    mode,
    hour: DEFAULT_REMINDER_HOUR,
    minute: DEFAULT_REMINDER_MINUTE,
    weekdays: [],
  };
}
