/**
 * ToolStep — the frame every screen INSIDE a tool shares: a header that can go back and can close, a
 * question, a line of help under it, the step's own content, and the actions pinned at the bottom.
 *
 * IT EXISTS FOR THE SAME REASON AS {@link ./ToolOpening}: the founder's shared UX rules say one
 * cognitive operation per screen, autosave, Back, exit and resume, and visible progress. Seven tools
 * hand-rolling that frame is seven chances for one of them to lose its Back button or bury its
 * primary action under a keyboard. The frame is here once, so a tool screen is a question and a
 * body.
 *
 * THE PRIMARY ACTION CAN BE DISABLED BUT NEVER HIDDEN. An action that disappears when it is not yet
 * available leaves people wondering what they did wrong; a disabled one that says what is missing
 * tells them.
 *
 * Presentational only (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';

export interface ToolStepProps {
  /** The quiet label in the header — where in the tool the person is. */
  stepLabel: string;
  /** Progress through the tool, 0 to 1. Omit on screens that are not part of the sequence. */
  progress?: number;
  question: string;
  help?: string;
  children?: React.ReactNode;
  /** The tool family's accent. */
  accentColor: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** A quiet line under the actions — "saved as you write", and the like. */
  footnote?: string;
  onBack?: () => void;
  onClose: () => void;
  backLabel: string;
  closeLabel: string;
  contentStyle?: ViewStyle;
}

export function ToolStep({
  stepLabel,
  progress,
  question,
  help,
  children,
  accentColor,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  footnote,
  onBack,
  onClose,
  backLabel,
  closeLabel,
  contentStyle,
}: ToolStepProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
              <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.icon} />
          )}
          <ThemedText type="small" style={{ color: theme.textMuted }}>{stepLabel}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        {progress !== undefined ? (
          <View style={[styles.track, { backgroundColor: theme.hairline }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: accentColor, width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` },
              ]}
            />
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText
            style={[
              styles.question,
              { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) },
            ]}>
            {question}
          </ThemedText>
          {help ? (
            <ThemedText type="small" style={[styles.help, { color: theme.textMuted }]}>{help}</ThemedText>
          ) : null}
          {children}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled }}
            disabled={primaryDisabled}
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: primaryDisabled ? theme.backgroundElement : accentColor },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: primaryDisabled ? theme.textMuted : theme.background }}>
              {primaryLabel}
            </ThemedText>
          </Pressable>
          {secondaryLabel && onSecondary ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSecondary}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <ThemedText type="small" style={{ color: theme.textMuted }}>{secondaryLabel}</ThemedText>
            </Pressable>
          ) : null}
          {footnote ? (
            <ThemedText type="small" style={[styles.footnote, { color: theme.textMuted }]}>{footnote}</ThemedText>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  icon: { padding: Spacing.two, minWidth: 38 },
  track: { height: 3, marginHorizontal: Spacing.four, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: 3, borderRadius: Radius.pill },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.three },
  question: { textAlign: START_TEXT_ALIGN },
  help: { textAlign: START_TEXT_ALIGN, lineHeight: 20 },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, gap: Spacing.two },
  primary: { borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
  secondary: { paddingVertical: Spacing.two, alignItems: 'center' },
  footnote: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
