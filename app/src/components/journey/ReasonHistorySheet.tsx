/**
 * ReasonHistorySheet — the user-facing "see past reasons" view (internally the Mirror
 * lever). It reflects back what has come up before for a Step, so a pattern can gently
 * become visible to the user themselves.
 *
 * TERMINOLOGY (product-guardian, locked): the surface is labelled "see past reasons",
 * NEVER "Mirror" (which would collide with the official term Reflection). Copy is
 * reflective and curiosity-framed — NEVER a scoreboard or a guilt tally.
 *
 * PRIVACY: it shows only the on-device reason history for THIS Step (reason labels +
 * when). It renders the free-text `note` only for the user's own device — that data
 * never leaves it (G1). Presentational only (Bible §19).
 */
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { REASONS } from '@/core/config/reasons';
import type { ReasonEntry, ReasonId } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';

export function ReasonHistorySheet({
  visible,
  stepTitle,
  entries,
  onClose,
}: {
  visible: boolean;
  stepTitle: string;
  entries: ReasonEntry[];
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Dismiss" style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            Looking back
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {stepTitle}
          </ThemedText>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="small" themeColor="textSecondary">
                Nothing here yet — this is where we&apos;ll gently notice what tends to
                get in the way.
              </ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.listBox} contentContainerStyle={styles.list}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
                A few times it didn&apos;t happen — no judgement, just what came up:
              </ThemedText>
              {entries.map((e) => (
                <View key={e.id} style={[styles.row, { borderColor: theme.hairline }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {reasonLabel(e.reasonId)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {formatAgo(e.at)}
                  </ThemedText>
                  {e.note ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                      “{e.note}”
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [styles.button, { backgroundColor: theme.coral }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              Close
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Map a reason id to its human label (config source of truth). */
function reasonLabel(id: ReasonId): string {
  return REASONS.find((r) => r.id === id)?.label ?? 'Something came up';
}

/** A soft "how long ago" label — never an exact timestamp (this is reflection, not a log). */
function formatAgo(at: number): string {
  const days = Math.floor((Date.now() - at) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`;
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
    gap: Spacing.two,
  },
  title: {
    fontFamily: FontFamily.headingBold,
  },
  lead: {
    marginBottom: Spacing.one,
  },
  listBox: {
    maxHeight: 280,
    marginTop: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
    gap: 2,
  },
  note: {
    fontStyle: 'italic',
    marginTop: 2,
  },
  empty: {
    paddingVertical: Spacing.three,
  },
  button: {
    height: 44,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
