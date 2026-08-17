/**
 * OnboardingScaffold — the shared page frame for every first-run onboarding step (K2,
 * Onboarding_Questionnaire_PRD). One calm layout: an optional Back chevron, an optional overall
 * progress bar + "Question X of 6" + section label (PRD §8), a scrolling body, and a pinned footer
 * for the primary/secondary actions. Mirrors the mature settings-screen chrome (header hairline,
 * max content width, teal accent) so onboarding reads as the same app.
 *
 * Presentational only (Engineering Bible §19): it renders what the flow container hands it and calls
 * `onBack`; it owns no answer state.
 */
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export interface OnboardingProgress {
  /** 1-based current question. */
  current: number;
  /** Total questions (6). */
  total: number;
  /** The section label above the progress ("How can we help you?" / "What holds you back?"). */
  section: string;
}

export function OnboardingScaffold({
  onBack,
  progress,
  children,
  footer,
}: {
  /** Shows a Back chevron when provided (omitted on the first, non-reversible steps). */
  onBack?: () => void;
  /** Question progress header (only on the six question pages — PRD §8). */
  progress?: OnboardingProgress;
  children: ReactNode;
  /** Pinned action area at the bottom (primary + optional secondary). */
  footer: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation('onboarding');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {(onBack || progress) && (
          <View style={styles.header}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('back', { ns: 'common' })}
                onPress={onBack}
                hitSlop={8}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.backButton} />
            )}
            {progress ? (
              <View style={styles.progressWrap}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
                  {progress.section}
                </ThemedText>
                <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: theme.teal, width: `${(progress.current / progress.total) * 100}%` },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textMuted" style={styles.progressLabel}>
                  {t('progress', { current: progress.current, total: progress.total })}
                </ThemedText>
              </View>
            ) : null}
          </View>
        )}

        {/* The body scrolls the focused field out from behind the keyboard (A3). */}
        <KeyboardSafeScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </KeyboardSafeScrollView>

        <View style={[styles.footer, { borderTopColor: theme.hairline }]}>{footer}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** The primary (filled teal) footer action shared by every step. */
export function OnboardingPrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: theme.teal },
        disabled && styles.dim,
        pressed && !disabled && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** A quiet secondary footer action (e.g. "Skip", "Maybe later", "Edit details"). */
export function OnboardingSecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { flex: 1, gap: Spacing.one },
  section: { fontFamily: 'Inter_600SemiBold' },
  progressTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: Radius.pill },
  progressLabel: {},
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  primary: {
    height: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.two },
  dim: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
