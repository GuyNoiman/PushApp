/**
 * StepCard — a single check-off card for a Step the user can act on now.
 * Presentational only: it reports the check-in intent upward; all reward/Buddy
 * logic runs in the engines (Engineering Bible §19).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import { useTheme } from '@/hooks/use-theme';

export function StepCard({
  item,
  onCheckIn,
}: {
  item: TodayStep;
  onCheckIn: (journeyId: string, stepId: string) => void;
}) {
  const theme = useTheme();
  const { step } = item;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <ThemedText type="default" style={styles.title}>
            {step.title}
          </ThemedText>
          {step.isStarterStep && (
            <ThemedView type="backgroundSelected" style={styles.badge}>
              <ThemedText type="small" themeColor="textSecondary">
                Starter Step
              </ThemedText>
            </ThemedView>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {item.journeyTitle}
          {step.description ? ` · ${step.description}` : ''}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Check in on ${step.title}`}
        onPress={() => onCheckIn(item.journeyId, step.id)}
        style={({ pressed }) => [
          styles.check,
          { borderColor: theme.text },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold">Check in</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  title: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  check: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
