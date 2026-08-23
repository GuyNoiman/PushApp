/**
 * ToolChoiceCard — one selectable option inside a tool: a chip, a condition, a person, a
 * consideration. Selected state is carried by BOTH the fill and the border and a check, never by
 * colour alone (Design System accessibility, and every one of these tools' PRDs says it again).
 *
 * Presentational only (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { START_TEXT_ALIGN } from '@/i18n/rtl';

export interface ToolChoiceCardProps {
  label: string;
  /** A second line under the label, when the option needs explaining. */
  detail?: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
  tintColor: string;
  /** 'radio' for one-of, 'checkbox' for many-of. It changes what a screen reader announces. */
  role?: 'radio' | 'checkbox';
  /** An optional leading number, for ordered selections. */
  order?: number;
}

export function ToolChoiceCard({
  label,
  detail,
  selected,
  onPress,
  accentColor,
  tintColor,
  role = 'checkbox',
  order,
}: ToolChoiceCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? tintColor : theme.backgroundElement,
          borderColor: selected ? accentColor : theme.hairline,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.row}>
        <View style={styles.text}>
          <ThemedText type="smallBold" style={{ color: theme.text }}>{label}</ThemedText>
          {detail ? (
            <ThemedText type="small" style={{ color: theme.textMuted }}>{detail}</ThemedText>
          ) : null}
        </View>
        {order !== undefined && selected ? (
          <View style={[styles.order, { backgroundColor: accentColor }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>{order}</ThemedText>
          </View>
        ) : selected ? (
          <Ionicons name="checkmark" size={18} color={accentColor} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1, gap: Spacing.one },
  order: { width: 22, height: 22, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
