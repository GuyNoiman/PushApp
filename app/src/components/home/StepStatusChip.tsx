/**
 * StepStatusChip — the small, calm badge that marks a Step's DERIVED Daily-Reporting status
 * (D36 §5) on a Step row. Shared by TodayFocusCard, WeekDreamGroup, and the Journey detail so the
 * visual is defined ONCE and can never drift.
 *
 * A `partially_completed` Step is a NON-FAILURE: it uses a warm, calm token (gold tint), NEVER the
 * danger colour. A `not_completed` Step uses a muted neutral — honest, not punishing. `unreported`
 * and `completed` render nothing here (the row/tile already communicates those).
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

  if (status !== 'partially_completed' && status !== 'not_completed') return null;

  // TODO(ux-designer): partial color token — this reuses the gold role as a calm, non-failure
  // placeholder until the Design System defines the dedicated Partial treatment.
  const isPartial = status === 'partially_completed';
  const bg = isPartial ? theme.goldTint : theme.backgroundSelected;
  const ink = isPartial ? theme.goldStrong : theme.textSecondary;
  const label = isPartial ? t('report.status.partiallyCompleted') : t('report.status.notCompleted');

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
