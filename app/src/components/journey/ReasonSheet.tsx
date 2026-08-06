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
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { REASON_PROMPT, REASONS } from '@/core/config/reasons';
import type { ReasonId } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';

export function ReasonSheet({
  visible,
  onSubmit,
  onBack,
}: {
  visible: boolean;
  /** Report the chosen reason and, for "Something else", the on-device-only note. */
  onSubmit: (reasonId: ReasonId, note?: string) => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<ReasonId | null>(null);
  const [note, setNote] = useState('');

  const capturesNote = REASONS.find((r) => r.id === selected)?.capturesNote ?? false;
  const caring = REASONS.find((r) => r.id === selected)?.caringCopy;

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
      <Pressable
        accessibilityLabel="Dismiss"
        style={styles.backdrop}
        onPress={() => {
          reset();
          onBack();
        }}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            {REASON_PROMPT}
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
                    {r.label}
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

          {capturesNote && (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="In your own words… (stays on your device)"
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
              accessibilityLabel="Back"
              onPress={() => {
                reset();
                onBack();
              }}
              style={({ pressed }) => [styles.button, styles.ghost, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Back
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              disabled={!selected}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: !selected ? theme.backgroundSelected : theme.coral },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: !selected ? theme.textMuted : theme.text }}>
                Continue
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
