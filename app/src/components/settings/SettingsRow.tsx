/**
 * SettingsRow — one presentational row inside a SettingsSection. A leading icon
 * in a soft tinted circle, a label (with an optional supporting line), and an
 * optional trailing element: a "coming soon" badge, a muted value, or a chevron
 * when the row is tappable. No logic lives here — the screen wires `onPress`.
 *
 * Mature styling: hairlines, one teal accent, muted neutrals, no gloss/emoji.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SettingsRow({
  icon,
  label,
  detail,
  value,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Optional supporting line under the label. */
  detail?: string;
  /** Optional right-aligned muted value (e.g. the current setting). */
  value?: string;
  /** Optional pill on the right (e.g. "Coming soon") — marks a not-yet row. */
  badge?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const inert = !onPress;

  const body = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: theme.tealTint }]}>
        <Ionicons name={icon} size={18} color={theme.tealStrong} />
      </View>

      <View style={styles.main}>
        <ThemedText type="default" numberOfLines={1}>
          {label}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {detail}
          </ThemedText>
        ) : null}
      </View>

      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="small" themeColor="textMuted">
            {badge}
          </ThemedText>
        </View>
      ) : value ? (
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {value}
        </ThemedText>
      ) : null}

      {onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
    </>
  );

  if (inert) {
    return <View style={styles.row}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const ICON = 34;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  iconWrap: {
    width: ICON,
    height: ICON,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    gap: 1,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
