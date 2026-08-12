/**
 * StyleMessageCard — one selectable formulation on a Communication Style questionnaire page. It renders
 * a message preview (title + body) as the user would receive it, with NO style name, score, or "correct"
 * hint (PRD §5). A subtle notification-like frame signals "this is a message". Selection state mirrors
 * the onboarding option cards (teal border + check) so the questionnaire reads as the same app.
 *
 * Presentational only (Engineering Bible §19): it renders the copy it's handed and calls `onSelect`; the
 * style behind it is the caller's private business (the vote), never shown here.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StyleMessageCard({
  title,
  body,
  selected,
  onSelect,
}: {
  title: string;
  body: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${body}`}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
        selected && { borderColor: theme.teal, backgroundColor: theme.tealTint },
        pressed && styles.pressed,
      ]}>
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>
          {body}
        </ThemedText>
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: theme.hairline },
          selected && { borderColor: theme.teal, backgroundColor: theme.teal },
        ]}>
        {selected ? <Ionicons name="checkmark" size={13} color={theme.backgroundElement} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    borderRadius: Radius.card,
    borderWidth: 1.4,
    padding: Spacing.three,
  },
  text: { flex: 1, minWidth: 0, gap: Spacing.one },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pressed: { opacity: 0.7 },
});
