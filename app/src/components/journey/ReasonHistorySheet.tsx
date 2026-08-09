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
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { reasonLabel as reasonLabelForId, resolveReason } from '@/core/config/reasons';
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
  const { t } = useTranslation('journey');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('dismiss', { ns: 'common' })} style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('reasonHistory.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {stepTitle}
          </ThemedText>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('reasonHistory.empty')}
              </ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.listBox} contentContainerStyle={styles.list}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
                {t('reasonHistory.lead')}
              </ThemedText>
              {entries.map((e) => (
                <View key={e.id} style={[styles.row, { borderColor: theme.hairline }]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {reasonLabel(e.reasonId, t)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {formatAgo(e.at, t)}
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
            accessibilityLabel={t('close', { ns: 'common' })}
            onPress={onClose}
            style={({ pressed }) => [styles.button, { backgroundColor: theme.coral }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('close', { ns: 'common' })}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Map a reason id to its human label (translated), with a translated fallback for unknown ids. */
function reasonLabel(id: ReasonId, t: TFunction<'journey'>): string {
  return resolveReason(id) ? reasonLabelForId(id) : t('reasonHistory.fallbackReason');
}

/** A soft "how long ago" label — never an exact timestamp (this is reflection, not a log). */
function formatAgo(at: number, t: TFunction<'journey'>): string {
  const days = Math.floor((Date.now() - at) / (24 * 60 * 60 * 1000));
  if (days <= 0) return t('reasonHistory.ago.today');
  if (days === 1) return t('reasonHistory.ago.yesterday');
  if (days < 7) return t('reasonHistory.ago.days', { count: days });
  const weeks = Math.floor(days / 7);
  return t('reasonHistory.ago.weeks', { count: weeks });
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
