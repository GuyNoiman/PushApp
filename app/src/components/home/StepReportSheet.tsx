/**
 * StepReportSheet — the ⋯ report menu a Step row opens (2026-08-07 redesign). It
 * replaces the old instant "+ done" affordance (founder direction: instant-complete
 * was wrong). A calm bottom sheet offering the report options from the old design:
 *
 *   Done · Partial · Couldn't · Postpone
 *
 * POSTPONE AND RESCHEDULE ARE ONE ACTION (founder, device pass 2026-08-19). They used to be two
 * rows here and read as the same thing, because they were: both said "not now", and the difference
 * — whether you name the new time yourself — is a choice you make AFTER deciding to postpone, not
 * a different decision. So the menu asks the one question, and the postpone sheet behind it offers
 * an automatic time, a specific one, and an optional reason. Do not re-add a second row.
 *
 * Presentational only — it reports the chosen option upward (no business logic,
 * Engineering Bible §19). The parent (StepReportFlow) routes each choice to the
 * AppCore facade and to the reused Miss-Recovery sheets. Copy stays caring and
 * blame-free (Design System — "never shame").
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import type { StepStatus } from '@/core/status/stepStatus';

export type ReportChoice =
  | 'done'
  | 'partial'
  | 'couldnt'
  | 'postpone'
  /** Reverse the report and leave the Step unreported (D36 — "Mark not reported yet"). */
  | 'notReportedYet';

/** The human label for a derived {@link StepStatus} (home ns). */
function statusLabel(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return 'report.status.completed';
    case 'partially_completed':
      return 'report.status.partiallyCompleted';
    case 'not_completed':
      return 'report.status.notCompleted';
    default:
      return 'report.status.unreported';
  }
}

export function StepReportSheet({
  visible,
  stepTitle,
  status,
  locked,
  onChoose,
  onClose,
}: {
  visible: boolean;
  stepTitle: string;
  /** The Step's current derived status — drives the "change report" framing + the reverse option. */
  status: StepStatus;
  /** True when the Step sits in a closed (past) week — report actions are disabled (D36). */
  locked: boolean;
  onChoose: (choice: ReportChoice) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  // A Step that already carries a report reframes the sheet as "change report" and offers the
  // reverse ("not reported yet") path (D36). An unreported Step shows the plain "how did it go?".
  const isReported = status !== 'unreported';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('dismiss', { ns: 'common' })} style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
            {stepTitle}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
            {isReported
              ? `${t(statusLabel(status))} · ${t('report.change')}`
              : t('report.prompt')}
          </ThemedText>

          {locked ? (
            // Past weeks are read-only (product-history convention, D35.3): show the status but no
            // report actions.
            <ThemedText type="small" themeColor="textMuted" style={styles.locked}>
              {t('report.locked')}
            </ThemedText>
          ) : (
            <>
              {/* Done — the celebrated, primary choice (turquoise). */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('report.doneA11y')}
                onPress={() => onChoose('done')}
                style={({ pressed }) => [
                  styles.primary,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <Ionicons name="checkmark-circle" size={20} color={onAccent} />
                <ThemedText type="smallBold" style={[styles.primaryLabel, { color: onAccent }]}>
                  {t('done', { ns: 'common' })}
                </ThemedText>
              </Pressable>

              <Option
                icon="contract-outline"
                label={t('report.partial.label')}
                hint={t('report.partial.hint')}
                onPress={() => onChoose('partial')}
              />
              <Option
                icon="heart-outline"
                label={t('report.couldnt.label')}
                hint={t('report.couldnt.hint')}
                onPress={() => onChoose('couldnt')}
              />
              {/* The single "not now" action — picking a time lives INSIDE it, not beside it. */}
              <Option
                icon="time-outline"
                label={t('report.postpone.label')}
                hint={t('report.postpone.hint')}
                onPress={() => onChoose('postpone')}
              />

              {/* Only offered once a report exists — clears it back to unreported (reverse only). */}
              {isReported && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('report.notReportedYet')}
                  onPress={() => onChoose('notReportedYet')}
                  style={({ pressed }) => [styles.reverse, pressed && styles.pressed]}>
                  {/* "Undo" curls back toward the start of the line, so it becomes the redo glyph
                      under RTL rather than pointing out of the reading flow. */}
                  <Ionicons
                    name={isRTL() ? 'arrow-redo-outline' : 'arrow-undo-outline'}
                    size={16}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('report.notReportedYet')}
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
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
  reverse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  locked: {
    paddingVertical: Spacing.three,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
