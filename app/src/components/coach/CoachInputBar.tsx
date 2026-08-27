/**
 * The persistent bottom input bar for the Coach conversation: a rounded text field and a turquoise
 * send affordance. Shown while the coach is waiting on a free-text reply.
 *
 * ── THE MICROPHONE THAT WAS HERE, AND WHY IT IS GONE (device report, 2026-08-27) ───────────────
 *
 * There was a mic button beside Send. It had no handler at all — a decorative icon, marked as such
 * in a comment nobody reading the screen could see. Somebody tapped it and nothing happened, which
 * is the same defect as a disabled field with no explanation: a control that looks pressable is a
 * promise.
 *
 * It was also a promise we had published the opposite of. The privacy policy went live the day
 * before saying, in both languages, **"No microphone, camera or photo library."** An app showing a
 * microphone button contradicts its own policy, whatever the button does.
 *
 * Speech-to-text is a real and wanted feature (Engineering Bible E6), and it is not a small one: it
 * needs a native module, a microphone permission, a new BUILD rather than an over-the-air update,
 * a line in the privacy policy and an answer on both stores' data forms. It comes back when that is
 * done, not before.
 */
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

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
  const { t } = useTranslation('coach');
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
        accessibilityLabel={t('send')}
        onPress={onSend}
        style={({ pressed }) => [styles.round, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
        {/* The paper plane flies the way the language reads — mirrored under RTL.
            Ionicons has no mirrored variant, so flip the glyph itself. */}
        <Ionicons
          name="send"
          size={17}
          color={theme.backgroundElement}
          style={isRTL() ? styles.mirrored : undefined}
        />
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
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  pressed: {
    opacity: 0.7,
  },
});
