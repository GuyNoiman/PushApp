/**
 * RescheduleModal — the "Reschedule / defer this Step" surface (founder decision
 * 2026-07-14). Reached two ways from Home: swipe-left on a Step card, or the
 * card's ⋯ menu → "Reschedule". A calm work surface (Design_System §1 "calm where
 * it works", §1 "never shame") — deferring a Step is a gentle, blame-free choice.
 *
 * PLACEHOLDER: there is no reschedule/defer data model yet (no field on the domain
 * Step, no engine that moves a Step's window). Confirm and Cancel both just close;
 * the reason + timing selections are collected but not persisted. Wire to a real
 * engine when the defer/schedule model lands (see TODO in `onConfirm`).
 *
 * Presentational only — reports intent upward; no business logic here (Bible §19).
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Placeholder deferral windows — no scheduling model backs these yet (TODO). */
const WHEN_OPTIONS = ['Later today', 'Tomorrow', 'This week'] as const;
type WhenOption = (typeof WHEN_OPTIONS)[number];

export function RescheduleModal({
  visible,
  stepTitle,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  /** The Step being deferred — shown for context. */
  stepTitle?: string;
  /** Confirm the deferral. PLACEHOLDER: nothing is persisted yet — just closes. */
  onConfirm: () => void;
  /** Dismiss without deferring. */
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [reason, setReason] = useState('');
  const [when, setWhen] = useState<WhenOption | null>(null);

  // Reset the transient placeholder inputs whenever the sheet closes, so the next
  // Step opens on a clean slate (there is no per-Step persistence to restore).
  const close = (commit: boolean) => {
    setReason('');
    setWhen(null);
    // TODO(data model): once a defer/schedule engine exists, pass { reason, when }
    // and the Step's id up so the engine can move the Step's window. For now both
    // paths simply dismiss.
    (commit ? onConfirm : onCancel)();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable
        accessibilityLabel="Dismiss"
        style={styles.backdrop}
        onPress={() => close(false)}>
        {/* Stop backdrop taps from closing when they land on the card itself. */}
        <Pressable
          style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}
          onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            Reschedule this step
          </ThemedText>
          {stepTitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {stepTitle}
            </ThemedText>
          ) : null}

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Why are you deferring? (optional)
            </ThemedText>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="A word about what happened…"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[
                styles.input,
                { borderColor: theme.hairline, color: theme.text, backgroundColor: theme.background },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              When would you like to do it?
            </ThemedText>
            <View style={styles.whenRow}>
              {WHEN_OPTIONS.map((opt) => {
                const selected = when === opt;
                return (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setWhen(opt)}
                    style={[
                      styles.whenChip,
                      { borderColor: selected ? theme.teal : theme.hairline },
                      selected && { backgroundColor: theme.tealTint },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: selected ? theme.tealStrong : theme.textSecondary }}>
                      {opt}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => close(false)}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm reschedule"
              onPress={() => close(true)}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.coral },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                Confirm
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(20, 20, 18, 0.45)',
  },
  card: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontFamily: FontFamily.headingBold,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
    textAlignVertical: 'top',
    fontFamily: FontFamily.bodyRegular,
  },
  whenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  whenChip: {
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  button: {
    minWidth: 96,
    height: 44,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  cancel: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
});
