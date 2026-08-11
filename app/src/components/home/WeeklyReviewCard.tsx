/**
 * WeeklyReviewCard — the Home pending-proposal card for Weekly Review (Weekly_Review_PRD §9, D40).
 * It surfaces that a review is waiting: a calm heading (a suggested change vs just a summary), the
 * "X Steps done last week" line, the time left in the 48-hour window, and a Continue CTA that opens
 * the full Weekly Review screen. It is the persistent entry point after the screen auto-opens once.
 *
 * Presentational only (Engineering Bible §19): every value is read from the AppCore-owned
 * {@link WeeklyReview}; this component computes no analysis. Mature turquoise palette, light + dark,
 * RTL-safe. TODO(ux-designer): the PRD's prominent-vs-compact split within the 48-hour window is left
 * as one calm card for this slice — style the compact variant when the timeline design lands.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WEEKLY_REVIEW_TTL_MS } from '@/core/AppCore';
import type { WeeklyReview } from '@/core/types/domain';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HOUR_MS = 60 * 60 * 1000;

export function WeeklyReviewCard({
  review,
  onContinue,
}: {
  review: WeeklyReview;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('weeklyReview');

  const hasChanges = review.proposals.length > 0;
  const summary = t('card.summary', { count: review.summary.completed });
  const hoursLeft = Math.max(
    0,
    Math.ceil((review.generatedAt + WEEKLY_REVIEW_TTL_MS - Date.now()) / HOUR_MS),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('a11y.card', { summary })}
      onPress={onContinue}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.tealTint, borderColor: theme.tint },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.orb, { backgroundColor: theme.tint }]}>
        <Ionicons name="calendar-outline" size={16} color={theme.backgroundElement} />
      </View>

      <View style={styles.body}>
        <ThemedText style={[styles.title, { color: theme.tealStrong }]}>
          {hasChanges ? t('card.titleChanges') : t('card.title')}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {summary}
        </ThemedText>
        <ThemedText type="small" style={[styles.timeLeft, { color: theme.textMuted }]}>
          {t('card.timeLeft', { count: hoursLeft })}
        </ThemedText>
      </View>

      <View style={[styles.cta, { backgroundColor: theme.tint }]}>
        <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
          {t('card.continue')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  orb: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  timeLeft: {
    marginTop: 2,
  },
  cta: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
