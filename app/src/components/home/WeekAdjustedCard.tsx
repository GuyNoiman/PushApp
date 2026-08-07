/**
 * WeekAdjustedCard — the calm, dismissible banner Home shows after the adaptive coach re-planned
 * the week (report→replan loop). It surfaces the coach's on-device `narration` ("I adjusted your
 * week…") in the coach's supportive voice — NEVER a scoreboard, a streak count, or a scold. When
 * the plan is honestly tight it adds one gentle at-risk line; it never punishes a miss.
 *
 * Presentational only (Engineering Bible §19): the copy is computed on-device by the AppCore
 * facade; this component only renders it and reports a dismiss. Mature turquoise palette, works in
 * light + dark.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function WeekAdjustedCard({
  narration,
  atRisk,
  onDismiss,
}: {
  /** The coach's on-device human line describing what changed. */
  narration: string;
  /** When true, the plan is honestly still tight — shown as a gentle heads-up, never a scold. */
  atRisk?: boolean;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.tealTint, borderColor: theme.tint }]}
      accessibilityRole="summary"
      accessibilityLabel={`Your week was adjusted. ${narration}`}>
      <View style={[styles.orb, { backgroundColor: theme.tint }]}>
        <Ionicons name="sparkles" size={16} color={theme.backgroundElement} />
      </View>

      <View style={styles.body}>
        <ThemedText style={[styles.title, { color: theme.tealStrong }]}>
          I adjusted your week
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {narration}
        </ThemedText>
        {atRisk ? (
          <ThemedText type="small" style={[styles.atRisk, { color: theme.goldStrong }]}>
            It&apos;s a little tight, but we&apos;ve got this together.
          </ThemedText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        hitSlop={8}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <Ionicons name="close" size={18} color={theme.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
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
  atRisk: {
    marginTop: 2,
  },
  close: {
    padding: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
