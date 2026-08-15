/**
 * ChoiceChips — a small single-select control rendered as pill chips.
 * Presentational only: it reports the chosen value upward (Engineering Bible §19).
 * Used across the Journey wizard for rhythm, duration, and Step cadence.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  /**
   * Offered but not currently choosable — rendered dimmed and inert rather than removed, so the
   * option stays visible and the surface can explain WHY in its own calm line beside the chips
   * (Future Journey Management §10: at the Future cap the future start modes are unavailable, and
   * that is a fact to state, never an error to raise).
   */
  disabled?: boolean;
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
        const disabled = option.disabled ?? false;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            // Guarded in the handler as well as on the Pressable: a disabled chip must be inert
            // however it is reached, so an unavailable option can never quietly become the choice.
            onPress={() => {
              if (!disabled) onChange(option.value);
            }}
            style={[
              styles.chip,
              { borderColor: theme.hairline },
              selected && { backgroundColor: theme.teal, borderColor: theme.teal },
              disabled && styles.disabled,
            ]}>
            <ThemedText
              type="smallBold"
              style={selected ? { color: theme.backgroundElement } : undefined}
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
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  disabled: {
    opacity: 0.4,
  },
});
