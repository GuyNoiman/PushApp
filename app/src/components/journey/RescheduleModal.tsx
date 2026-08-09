/**
 * RescheduleModal — the propose-times / confirm sheet for the Retime lever
 * (Miss-Recovery slice). Given the candidate times the engine proposed (heuristic +
 * constraint/free-busy gating), the user confirms one, with an "Other time" fallback
 * that reveals a few more specific presets. Part of the "Forgot" bundle it can also
 * offer a zero-permission "Add to calendar" action (the user creates the event, so
 * the app needs no calendar-write permission).
 *
 * A calm work surface (Design_System §1 "calm where it works", "never shame") —
 * moving a Step is a gentle, blame-free choice. No Grace-Token / streak language.
 *
 * Presentational only — reports the chosen time upward; no business logic (Bible §19).
 */
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { Candidate } from '@/core/util/reschedule';
import { useTheme } from '@/hooks/use-theme';

export function RescheduleModal({
  visible,
  stepTitle,
  candidates,
  onConfirm,
  onCancel,
  onAddToCalendar,
}: {
  visible: boolean;
  /** The Step being moved — shown for context. */
  stepTitle?: string;
  /** Engine-proposed times (already gated). May be empty when everything was ruled out. */
  candidates: Candidate[];
  /** Confirm the chosen start time (epoch ms). */
  onConfirm: (chosenAt: number) => void;
  /** Dismiss without moving. */
  onCancel: () => void;
  /** Optional "add to calendar" (the "Forgot" bundle) — opens a zero-permission link. */
  onAddToCalendar?: (chosenAt: number) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const [chosen, setChosen] = useState<number | null>(null);
  const [showOther, setShowOther] = useState(false);

  // A few extra "specific time" presets revealed by "Other time" — pure UI presets
  // (no scheduling model needed): tomorrow morning / evening, and in three days.
  const otherPresets = useMemo<Candidate[]>(() => buildOtherPresets(), [visible]);

  const options = showOther ? [...candidates, ...otherPresets] : candidates;

  const close = (chosenAt: number | null) => {
    setChosen(null);
    setShowOther(false);
    if (chosenAt !== null) onConfirm(chosenAt);
    else onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(null)}>
      <Pressable accessibilityLabel={t('dismiss', { ns: 'common' })} style={styles.backdrop} onPress={() => close(null)}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}
          onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('reschedule.title')}
          </ThemedText>
          {stepTitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {stepTitle}
            </ThemedText>
          ) : null}

          <ScrollView style={styles.optionsBox} contentContainerStyle={styles.options}>
            {options.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('reschedule.noSlots')}
              </ThemedText>
            ) : (
              options.map((c) => {
                const selected = chosen === c.at;
                return (
                  <Pressable
                    key={`${c.kind}-${c.at}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setChosen(c.at)}
                    style={[
                      styles.timeChip,
                      { borderColor: selected ? theme.teal : theme.hairline },
                      selected && { backgroundColor: theme.tealTint },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: selected ? theme.tealStrong : theme.textSecondary }}>
                      {formatWhen(c.at, t)}
                    </ThemedText>
                  </Pressable>
                );
              })
            )}

            {!showOther && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('reschedule.otherTimeA11y')}
                onPress={() => setShowOther(true)}
                style={[styles.timeChip, { borderColor: theme.hairline }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('reschedule.otherTime')}
                </ThemedText>
              </Pressable>
            )}
          </ScrollView>

          {onAddToCalendar && chosen !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('reschedule.addToCalendarA11y')}
              onPress={() => onAddToCalendar(chosen)}
              style={({ pressed }) => [styles.calendarRow, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                {t('reschedule.addToCalendar')}
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancel', { ns: 'common' })}
              onPress={() => close(null)}
              style={({ pressed }) => [styles.button, styles.ghost, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('cancel', { ns: 'common' })}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('reschedule.confirmA11y')}
              disabled={chosen === null}
              onPress={() => close(chosen)}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: chosen === null ? theme.backgroundSelected : theme.coral },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: chosen === null ? theme.textMuted : theme.text }}>
                {t('reschedule.confirm')}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Friendly local label for a proposed time (Today/Tomorrow/weekday + clock). */
function formatWhen(at: number, t: TFunction<'journey'>): string {
  const d = new Date(at);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return t('reschedule.when.today', { time });
  if (d.toDateString() === tomorrow.toDateString()) return t('reschedule.when.tomorrow', { time });
  return t('reschedule.when.weekday', {
    weekday: d.toLocaleDateString([], { weekday: 'short' }),
    time,
  });
}

/** Build the "Other time" presets (specific times), computed from the current clock. */
function buildOtherPresets(): Candidate[] {
  const at = (addDays: number, hour: number): Candidate => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    d.setHours(hour, 0, 0, 0);
    return { at: d.getTime(), hour, minute: 0, kind: 'tomorrow' };
  };
  return [at(1, 9), at(1, 19), at(3, 9)];
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
  optionsBox: {
    maxHeight: 220,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  timeChip: {
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  calendarRow: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
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
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
});
