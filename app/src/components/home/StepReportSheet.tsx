/**
 * StepReportSheet — the ⋯ report menu a Step row opens (2026-08-07 redesign). It
 * replaces the old instant "+ done" affordance (founder direction: instant-complete
 * was wrong). A calm bottom sheet offering the report options from the old design:
 *
 *   Done · Partial · Couldn't · Postpone · Reschedule
 *
 * Presentational only — it reports the chosen option upward (no business logic,
 * Engineering Bible §19). The parent (StepReportFlow) routes each choice to the
 * AppCore facade and to the reused Miss-Recovery sheets. Copy stays caring and
 * blame-free (Design System — "never shame").
 */
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type ReportChoice = 'done' | 'partial' | 'couldnt' | 'postpone' | 'reschedule';

export function StepReportSheet({
  visible,
  stepTitle,
  onChoose,
  onClose,
}: {
  visible: boolean;
  stepTitle: string;
  onChoose: (choice: ReportChoice) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Dismiss" style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
            {stepTitle}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
            How did it go?
          </ThemedText>

          {/* Done — the celebrated, primary choice (turquoise). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark done"
            onPress={() => onChoose('done')}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.tint },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="checkmark-circle" size={20} color={onAccent} />
            <ThemedText type="smallBold" style={[styles.primaryLabel, { color: onAccent }]}>
              Done
            </ThemedText>
          </Pressable>

          <Option
            icon="contract-outline"
            label="Partial"
            hint="I did some of it — progress counts."
            onPress={() => onChoose('partial')}
          />
          <Option
            icon="heart-outline"
            label="Couldn't"
            hint="Life happened. No penalty."
            onPress={() => onChoose('couldnt')}
          />
          <Option
            icon="time-outline"
            label="Postpone"
            hint="Not now — tell me what got in the way."
            onPress={() => onChoose('postpone')}
          />
          <Option
            icon="calendar-outline"
            label="Reschedule"
            hint="Move it to a better time."
            onPress={() => onChoose('reschedule')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, { borderColor: theme.hairline }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <View style={styles.optionText}>
        <ThemedText type="smallBold" style={{ color: theme.text }}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
    </Pressable>
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
  sub: {
    marginBottom: Spacing.one,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 50,
    borderRadius: Radius.button,
  },
  primaryLabel: {
    fontSize: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
