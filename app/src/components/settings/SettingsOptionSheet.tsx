/**
 * SettingsOptionSheet — a calm bottom sheet that shows ALL the values a setting can take and lets
 * the user pick one (founder, 2026-08-19).
 *
 * It replaces a "tap to cycle" row, which was the wrong shape for a choice: cycling never shows the
 * options, so the only way to learn what exists is to tap until the list repeats, and the only way to
 * reach the value before the current one is to go all the way round. Seven weekdays make that
 * six taps in the worst case, past six values the user did not want. A list answers "what can this
 * be" and "give me that one" in a single gesture.
 *
 * The current value is marked with a checkmark AND announced as selected, so the state never rests
 * on the tick alone. Picking closes the sheet — the choice is the whole interaction, and a sheet that
 * lingers invites a second, accidental pick.
 *
 * Presentational only (Engineering Bible §19): the caller owns the value and the write. Generic over
 * the value type so any settings row can adopt it (the form-of-address row is the obvious next one).
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** One selectable value and the label shown for it. */
export interface SettingsOption<T> {
  value: T;
  label: string;
}

export function SettingsOptionSheet<T extends string | number>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  /** The setting's own name — the sheet says WHICH setting is being changed. */
  title: string;
  options: SettingsOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('common');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('dismiss')} style={styles.backdrop} onPress={onClose}>
        {/* Swallows the tap so a press inside the sheet never dismisses it. */}
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>

          {/* Scrolls rather than clips: a longer option list must stay fully reachable on a short screen. */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {options.map((option, i) => {
              const isSelected = option.value === selected;
              return (
                <Pressable
                  key={String(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  // Announced, not just ticked — the current value is never carried by the mark alone.
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <ThemedText type="default" style={{ color: theme.text }}>
                    {option.label}
                  </ThemedText>
                  {isSelected ? <Ionicons name="checkmark" size={20} color={theme.tint} /> : null}
                  {i < options.length - 1 ? (
                    <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
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
    gap: Spacing.two,
  },
  title: {
    fontFamily: FontFamily.headingBold,
  },
  list: {
    // Never taller than roughly half a phone screen, so the sheet stays a sheet.
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    height: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
