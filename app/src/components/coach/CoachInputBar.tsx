/**
 * The persistent bottom input bar for the Coach conversation: a rounded text
 * field, a circular voice button (visual only), and a turquoise send affordance.
 * Shown while the coach is waiting on a free-text reply.
 *
 * Presentational + local draft state. `onSend` fires with the trimmed text (or an
 * empty string when the user sends without typing — the prototype then advances
 * with the next canned turn). The mic is decorative; real speech-to-text is not
 * wired yet.
 */
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CoachInputBar({
  value,
  placeholder,
  bottomInset = 0,
  onChangeText,
  onSend,
}: {
  value: string;
  placeholder: string;
  /** Extra bottom padding so the bar clears the floating tab bar / safe area. */
  bottomInset?: number;
  onChangeText: (text: string) => void;
  onSend: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.hairline,
          paddingBottom: styles.bar.paddingBottom + bottomInset,
        },
      ]}>
      <View style={[styles.pill, { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          returnKeyType="send"
          onSubmitEditing={onSend}
          style={[styles.input, { color: theme.text }]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Speak (coming soon)"
        style={({ pressed }) => [
          styles.round,
          { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline, borderWidth: 1 },
          pressed && styles.pressed,
        ]}>
        {/* Voice input is visual only for now — no speech-to-text wired yet. */}
        <Ionicons name="mic-outline" size={19} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        onPress={onSend}
        style={({ pressed }) => [styles.round, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
        <Ionicons name="send" size={17} color={theme.backgroundElement} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three - 2,
    paddingBottom: Spacing.three,
    borderTopWidth: 1,
  },
  pill: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    padding: 0,
  },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
