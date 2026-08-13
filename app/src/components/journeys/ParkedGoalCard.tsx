/**
 * ParkedGoalCard — one "For later" goal on the Journeys "Future" tab (Parked/deferred goals, L1).
 * The coach detected it in an opening the user chose NOT to build first; this card lets the user
 * activate it into a real Journey or dismiss it. Presentational only — it takes a {@link ParkedGoal}
 * plus two callbacks; the activate/remove logic lives in AppCore (Engineering Bible §19).
 *
 * Mirrors the JourneyCard language: a domain eyebrow above the title, a one-line description derived
 * from the goal's process shape, on an elegant white/near-black card with a hairline. RTL-aware.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { ParkedGoal } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function ParkedGoalCard({
  goal,
  onActivate,
  onDismiss,
}: {
  goal: ParkedGoal;
  onActivate: () => void;
  onDismiss: () => void;
}) {
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

      <View style={[styles.actions, { borderTopColor: theme.hairline }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parked.activate')}
          onPress={onActivate}
          style={({ pressed }) => [
            styles.activate,
            { backgroundColor: theme.teal },
            pressed && styles.pressed,
          ]}>
          <Ionicons
            name={isRTL() ? 'arrow-back' : 'arrow-forward'}
            size={16}
            color={theme.backgroundElement}
          />
          <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
            {t('parked.activate')}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parked.dismiss')}
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </Pressable>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  activate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Radius.button,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  dismiss: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
