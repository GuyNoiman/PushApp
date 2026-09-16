/**
 * useActiveHoursSummary — the one-line value an Active Hours row shows ("All day", "08:00–22:00", …).
 *
 * It lived inside the Settings tab alone until Active Hours also got a row on Personal Details
 * (founder, 2026-09-16: "שעות הפעילות שייכות לפרטים אישיים"). Two rows over the same preference must
 * say the same thing, so the wording is read in one place and both rows call it.
 *
 * Presentational formatting only: the shape of the preference comes from `core/util/availability`.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { activeHoursShape, resolveActiveHours } from '@/core/util/availability';
import { useApp } from '@/state/AppProvider';

export function useActiveHoursSummary(): string {
  const { t } = useTranslation('settings');
  // Recomputed when the scheduling prefs change (a SchedulingPrefsChanged event refreshes the
  // snapshot, re-rendering whoever shows the row).
  const { core, snapshot } = useApp();
  return useMemo(() => {
    void snapshot; // re-run when a SchedulingPrefsChanged event refreshes the snapshot
    const prefs = core.getSchedulingPrefs();
    const shape = activeHoursShape(prefs);
    if (shape === 'allDay') return t('activeHours.summaryAllDay');
    if (shape === 'off') return t('activeHours.summaryOff');
    if (shape === 'perDay') return t('activeHours.summaryPerDay');
    const w = resolveActiveHours(prefs).days[0].window;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return t('activeHours.range', {
      start: `${pad2(w.start.hour)}:${pad2(w.start.minute)}`,
      end: `${pad2(w.end.hour)}:${pad2(w.end.minute)}`,
    });
    // `snapshot` is intentionally a dependency: it changes on SchedulingPrefsChanged.
  }, [core, snapshot, t]);
}
