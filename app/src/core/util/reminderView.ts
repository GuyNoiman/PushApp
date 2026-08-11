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
import type { ReminderRule } from '../types/domain';

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

/** The default Fixed time offered when a Journey has no reminder yet. */
export const DEFAULT_REMINDER_HOUR = 9;
export const DEFAULT_REMINDER_MINUTE = 0;

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
