/**
 * StepStatusChip — the small, calm badge that marks a Step's DERIVED Daily-Reporting status
 * (D36 §5) on a Step row. Shared by TodayFocusCard, WeekDreamGroup, and the Journey detail so the
 * visual is defined ONCE and can never drift.
 *
 * A `completed` Step renders NOTHING here (founder, device pass 2026-08-17). A Step just reported
 * done keeps its full identity on the row — title, Journey, Milestone — and its check mark plus its
 * settled card already say it is finished; a "Completed" pill only repeated them. The rule lives
 * HERE, once, so no surface can drift back into showing one. (A completed Step also never borrows
 * the amber urgency role: something finished is the opposite of urgent, and the eye belongs on what
 * is still open.)
 * A `partially_completed` Step is a NON-FAILURE: it uses a warm, calm token (gold tint), NEVER the
 * danger colour. A `not_completed` Step uses a muted neutral — honest, not punishing. `unreported`
 * renders nothing (there is no report to show yet).
 *
 * Presentational only (Engineering Bible §19).
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { StepStatus } from '@/core/status/stepStatus';
import { useTheme } from '@/hooks/use-theme';

export function StepStatusChip({ status }: { status: StepStatus }) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  // Nothing to show for a Step with no report yet — or for a finished one, whose check mark and
  // settled row already carry the meaning (see the note above).
  if (status === 'unreported' || status === 'completed') return null;

  // TODO(ux-designer): partial color token — this reuses the gold role as a calm, non-failure
  // placeholder until the Design System defines the dedicated Partial treatment.
  const isPartial = status === 'partially_completed';
  const bg = isPartial ? theme.goldTint : theme.backgroundSelected;
  const ink = isPartial ? theme.goldStrong : theme.textSecondary;
  const label = isPartial
    ? t('report.status.partiallyCompleted')
    : t('report.status.notCompleted');

  return (
    <ThemedText
      type="small"
      accessibilityLabel={t('report.status.a11y', { status: label })}
      style={[styles.chip, { backgroundColor: bg, color: ink }]}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.chip,
    overflow: 'hidden',
    fontSize: 11,
  },
});
