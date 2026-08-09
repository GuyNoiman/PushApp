/**
 * CoachEditProposalCard — the approval card for a coach-led Journey edit (task J1). It renders the
 * language-free {@link EditChange}[] the orchestrator proposed, LOCALIZING each change through `t()`
 * with interpolation. It deliberately renders from the STRUCTURED changes, never from model prose, so
 * what the user approves is always the exact, validated diff.
 *
 * Presentational only — the Apply / Adjust actions live on the screen's CTA bar.
 */
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { EditChange } from '@/core/coach/journeyEdit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Localize ONE structured change into a user-facing line (the card never shows raw model prose). */
function describeChange(change: EditChange, t: TFunction): string {
  switch (change.kind) {
    case 'rename':
      return t('edit.change.rename', { title: change.title });
    case 'why':
      return t('edit.change.why', { count: change.count });
    case 'rhythm':
      return t('edit.change.rhythm', { rhythm: t(`edit.rhythm.${change.rhythm}`) });
    case 'duration':
      return t('edit.change.duration', { days: change.durationDays });
    case 'addStep':
      return t('edit.change.addStep', { title: change.title });
    case 'editStep':
      return t('edit.change.editStep', { title: change.title });
    case 'removeStep':
      return t('edit.change.removeStep', { title: change.title });
    default:
      return '';
  }
}

export function CoachEditProposalCard({ changes }: { changes: EditChange[] }) {
  const theme = useTheme();
  const { t } = useTranslation('coach');

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.hairline }, CARD_SHADOW]}>
      <ThemedText type="smallBold" style={[styles.title, { color: theme.tealStrong }]}>
        {t('edit.proposalTitle')}
      </ThemedText>
      <View style={styles.list}>
        {changes.map((change, index) => (
          <View key={index} style={styles.row}>
            <ThemedText type="small" style={{ color: theme.tealStrong }}>
              •
            </ThemedText>
            <ThemedText type="default" style={styles.rowText}>
              {describeChange(change, t)}
            </ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

/** Calm work-surface card depth (matches the Journey detail cards) — subtle, not game-juice. */
const CARD_SHADOW = {
  shadowColor: '#2E2E2C',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    letterSpacing: 0.5,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
});
