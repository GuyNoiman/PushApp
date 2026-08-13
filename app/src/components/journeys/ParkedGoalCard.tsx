/**
 * ParkedGoalCard — one "For later" goal on the Journeys "Future" tab (Parked/deferred goals, L1).
 * The coach detected it in an opening the user chose NOT to build first. Read-only for now (founder
 * decision 2026-08-13): the card is a plain display of the parked goal; the coach will offer an
 * in-context way to activate/dismiss it later. Presentational only — it takes a {@link ParkedGoal};
 * the activate/remove logic lives in AppCore (Engineering Bible §19).
 *
 * Mirrors the JourneyCard language: a domain eyebrow above the title, a one-line description derived
 * from the goal's process shape, on an elegant white/near-black card with a hairline. RTL-aware.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { ParkedGoal } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function ParkedGoalCard({ goal }: { goal: ParkedGoal }) {
  const theme = useTheme();
  const { t } = useTranslation('journeys');
  const align = isRTL() ? 'right' : 'left';

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.hairline }]}>
      <View style={styles.text}>
        <ThemedText
          type="small"
          themeColor="textMuted"
          numberOfLines={1}
          style={[styles.eyebrow, { textAlign: align }]}>
          {t(`parked.domain.${goal.domain}`)}
        </ThemedText>
        <ThemedText type="subtitle" numberOfLines={2} style={{ textAlign: align }}>
          {goal.title}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          style={[styles.sub, { textAlign: align }]}>
          {t(`parked.kind.${goal.processType}`)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  text: {
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  sub: {
    marginTop: Spacing.half,
  },
});
