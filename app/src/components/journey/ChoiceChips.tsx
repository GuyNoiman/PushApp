/**
 * ChoiceChips — a small single-select control rendered as pill chips.
 * Presentational only: it reports the chosen value upward (Engineering Bible §19).
 * Used across the Journey wizard for rhythm, duration, and Step cadence.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Choice<T extends string | number> {
  value: T;
  label: string;
}

export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              { borderColor: theme.backgroundSelected },
              selected && { backgroundColor: theme.text, borderColor: theme.text },
            ]}>
            <ThemedText
              type="smallBold"
              style={selected ? { color: theme.background } : undefined}
              themeColor={selected ? undefined : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
