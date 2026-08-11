/**
 * interpretPostponeResult — the SINGLE presentational reading of a {@link PostponeReminderResult}
 * (Step Postponement, D37), shared by every entry point (the fast RecoveryFlow and Home's
 * StepReportFlow) so they behave identically: neither silently closes on a failed or false-success
 * postpone (no-slot-today / in_past / reminders-off), and both surface the same honest notice
 * (no-slot-today, a day-crossing warning, or reminders-off). Pure — no React, no side effects.
 */
import type { TFunction } from 'i18next';

import type { PostponeReminderResult } from '@/core/AppCore';
import type { PostponeWarning } from '@/core/util/postpone';

const WARNING_KEY: Record<PostponeWarning, string> = {
  crosses_day: 'postpone.warnCrossesDay',
  crosses_week: 'postpone.warnCrossesWeek',
  crosses_journey_end: 'postpone.warnCrossesJourneyEnd',
};

/**
 * Decide whether the flow may CLOSE and what NOTICE (if any) to show:
 *   - a hard `no_slot_today` failure → keep open, show the no-slot message;
 *   - any other failure (e.g. `in_past`) → just close (should not reach the UI in practice);
 *   - a success WITH warnings / reminders-off → keep open, show the heads-up (the postpone still
 *     took effect);
 *   - a clean success → close.
 */
export function interpretPostponeResult(
  result: PostponeReminderResult,
  t: TFunction<'journey'>,
): { close: boolean; notice?: string } {
  if (!result.ok) {
    return result.error === 'no_slot_today'
      ? { close: false, notice: t('postpone.noSlotToday') }
      : { close: true };
  }
  const messages: string[] = [];
  for (const w of result.warnings ?? []) messages.push(t(WARNING_KEY[w]));
  if (result.scheduled === false) messages.push(t('postpone.permissionOff'));
  return messages.length > 0 ? { close: false, notice: messages.join(' ') } : { close: true };
}
