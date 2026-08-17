/**
 * ReasonSheet — Screen 2 of the Miss-Recovery loop (PRD §3). The closed reason list
 * ("what happened?") as chips, from the config source of truth (config/reasons.ts).
 * The header copy is LOCKED (product-guardian): caring, never accusatory. Choosing
 * "Something else" reveals a free-text field.
 *
 * PRIVACY (G1): the free-text note is captured here and handed up ONLY to be stored
 * on-device (ReasonEntry.note). It must never be sent anywhere — the placeholder even
 * reassures the user it stays on their device.
 *
 * Presentational only — reports the chosen reason (+ optional note) upward; no
 * business logic and no lever computation here (Bible §19).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { reasonCaringCopy, reasonLabel, reasonPrompt, REASONS } from '@/core/config/reasons';
import type { ReasonId } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';

export function ReasonSheet({
  visible,
  onSubmit,
  onBack,
  onSeePastReasons,
}: {
  visible: boolean;
  /** Report the chosen reason and, for "Something else", the on-device-only note. */
  onSubmit: (reasonId: ReasonId, note?: string) => void;
  onBack: () => void;
  /**
   * Open "see past reasons" for this Step. OMITTED when the Step has no history yet — a first
   * miss must not be offered a look back at nothing, and an empty link reads as an accusation
   * that there is something to look back at.
   */
  onSeePastReasons?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const [selected, setSelected] = useState<ReasonId | null>(null);
  const [note, setNote] = useState('');

  const capturesNote = REASONS.find((r) => r.id === selected)?.capturesNote ?? false;
  const caring = selected ? reasonCaringCopy(selected) : undefined;

  const reset = () => {
    setSelected(null);
    setNote('');
  };

  const submit = () => {
    if (!selected) return;
    const trimmed = note.trim();
    onSubmit(selected, capturesNote && trimmed ? trimmed : undefined);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBack}>
      {/* The sheet sits on the bottom edge, so the keyboard would cover the note field outright —
          lift the whole sheet above it (Device QA A3). There is no scroll body here, so
          KeyboardAvoidingView (not a scroll inset) is the right tool. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          accessibilityLabel={t('dismiss', { ns: 'common' })}
          style={styles.backdrop}
          onPress={() => {
            reset();
            onBack();
          }}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <ThemedText type="subtitle" style={styles.title}>
              {reasonPrompt()}
            </ThemedText>

            <View style={styles.chips}>
              {REASONS.map((r) => {
                const isSel = selected === r.id;
                return (
                  <Pressable
                    key={r.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    onPress={() => setSelected(r.id)}
                    style={[
                      styles.chip,
                      { borderColor: isSel ? theme.teal : theme.hairline },
                      isSel && { backgroundColor: theme.tealTint },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: isSel ? theme.tealStrong : theme.textSecondary }}>
                      {reasonLabel(r.id)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {caring ? (
              <ThemedText type="small" themeColor="textSecondary">
                {caring}
              </ThemedText>
            ) : null}

            {/* The quiet way into "see past reasons" — a plain link, never a badge or a count.
                It appears only once there IS history to look at (the parent omits the handler
                otherwise), so it can never read as "here is your record of failures". */}
            {onSeePastReasons ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('reasonHistory.title')}
                onPress={onSeePastReasons}
                style={({ pressed }) => [styles.historyLink, pressed && styles.pressed]}>
                <ThemedText type="small" style={{ color: theme.tealStrong }}>
                  {t('reasonHistory.open')}
                </ThemedText>
              </Pressable>
            ) : null}

            {capturesNote && (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('reason.notePlaceholder')}
                placeholderTextColor={theme.textMuted}
                multiline
                style={[
                  styles.input,
                  { borderColor: theme.hairline, color: theme.text, backgroundColor: theme.background },
                ]}
              />
            )}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('back', { ns: 'common' })}
                onPress={() => {
                  reset();
                  onBack();
                }}
                style={({ pressed }) => [styles.button, styles.ghost, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('back', { ns: 'common' })}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('continue', { ns: 'common' })}
                disabled={!selected}
                onPress={submit}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: !selected ? theme.backgroundSelected : theme.coral },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: !selected ? theme.textMuted : theme.text }}>
                  {t('continue', { ns: 'common' })}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 18, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontFamily: FontFamily.headingBold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
    textAlignVertical: 'top',
    fontFamily: FontFamily.bodyRegular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  button: {
    minWidth: 96,
    height: 44,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
  historyLink: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
});
