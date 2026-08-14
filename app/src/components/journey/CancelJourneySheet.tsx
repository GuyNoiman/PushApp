/**
 * CancelJourneySheet — the confirmation in front of "Cancel this Journey" (Journey Abandonment PRD
 * §8.4). Canceling is FINAL: there is no undo window (founder decision 2026-08-14), so this sheet is
 * the only place the decision can be taken back, and it says so plainly.
 *
 * It follows the destructive-confirmation language already shipped in
 * `components/settings/DeleteAccountSheet.tsx` — a bottom sheet, one `danger` accent, a centered
 * title + honest body, then the destructive action — rather than inventing a second pattern. It drops
 * that sheet's "I understand" tick: deleting an account is unrecoverable across the whole product,
 * while a cancel removes only the Steps that never happened, and an extra gate in front of stopping
 * would read as pressure to continue.
 *
 * What it states, and what it deliberately never states:
 *  - the FACTUAL number of Steps that will be removed (informed consent about data removal), and
 *    "there are no Steps left to remove" instead of a bare "0";
 *  - what is KEPT (check-ins and the record of what was done) and that the streak is untouched;
 *  - that reminders stop and the Journey leaves Home;
 *  - who else is affected — but ONLY when that is true and known: the Support Circle line renders
 *    from `supportCircle`, the caller's REAL counts, and not at all while they are unknown (still
 *    loading, the read failed, the pillar is off) or zero. Never a fabricated number, and never a
 *    reason to block the cancel: the transition is local and completes offline (PRD §8.4.4 / §11);
 *  - that it cannot be undone;
 *  - "Pause it instead", at equal weight, for the person who only needs a break (PRD §8.4.6).
 *
 * It NEVER shows what the user is about to lose as leverage: no streak warning, no "you're 60% there",
 * no guilt, no coach interstitial. That loss-aversion pattern works, and this product refuses it
 * (PRD §9.1). Presentational only (Engineering Bible §19) — the count is computed by the caller from
 * the shared `unlivedStepCount`, and the transition itself is `AppCore.abandonJourney`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SupportCircleImpact } from '@/hooks/useSupportCircleImpact';

export function CancelJourneySheet({
  visible,
  stepsToRemove,
  canPause,
  supportCircle,
  onDismiss,
  onPauseInstead,
  onConfirm,
}: {
  visible: boolean;
  /** How many never-reported Steps the cancel will remove — the real count, never an estimate. */
  stepsToRemove: number;
  /** Whether "Pause it instead" applies: only for a RUNNING Journey (an already-paused one is paused). */
  canPause: boolean;
  /**
   * The Journey's REAL Support-Circle counts, or null when they are unknown (loading, failed, or the
   * social pillar is off) — in which case no Circle line is shown at all.
   */
  supportCircle?: SupportCircleImpact | null;
  onDismiss: () => void;
  onPauseInstead: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.scrim}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('detail.cancelConfirm.dismiss')}
        />

        <View
          style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.hairline }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.dangerTint }]}>
            <Ionicons name="stop-circle-outline" size={22} color={theme.danger} />
          </View>

          <ThemedText type="subtitle" style={styles.centered}>
            {t('detail.cancelConfirm.title')}
          </ThemedText>

          {/* The consequences, in plain order: what is removed, what stays, what stops, and that it
              is final. The count line reads "there are no Steps left to remove" at zero rather than
              a fabricated "0 Steps" (the honesty rule DeleteAccountSheet set). */}
          <View style={styles.lines}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              {stepsToRemove === 0
                ? t('detail.cancelConfirm.removesNone')
                : t('detail.cancelConfirm.removes', { count: stepsToRemove })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              {t('detail.cancelConfirm.keeps')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              {t('detail.cancelConfirm.stops')}
            </ThemedText>
            {/* Who else is affected — stated only where it is TRUE. Each line needs a real, non-zero
                count of its own: a Journey nobody supports says nothing about a Circle, and an
                unknown count (`supportCircle` null) says nothing either. This is disclosure, not
                leverage — it never asks the user to stay for someone else's sake (PRD §9.1). */}
            {supportCircle && supportCircle.accepted > 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                {t('detail.cancelConfirm.circleStops', { count: supportCircle.accepted })}
              </ThemedText>
            )}
            {supportCircle && supportCircle.pending > 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                {t('detail.cancelConfirm.invitesWithdrawn', { count: supportCircle.pending })}
              </ThemedText>
            )}
            <ThemedText type="smallBold" style={[styles.centered, { color: theme.danger }]}>
              {t('detail.cancelConfirm.final')}
            </ThemedText>
          </View>

          {/* Pause is offered at equal weight, never as a footnote — someone who needs three weeks
              off should not have to choose between destroying a plan and pretending (PRD §8.4.6). */}
          {canPause && (
            <Pressable
              onPress={onPauseInstead}
              accessibilityRole="button"
              accessibilityLabel={t('detail.cancelConfirm.pauseInsteadA11y')}
              style={({ pressed }) => [
                styles.pauseButton,
                { borderColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                {t('detail.cancelConfirm.pauseInstead')}
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={t('detail.cancelConfirm.confirmA11y')}
            style={({ pressed }) => [
              styles.dangerButton,
              { backgroundColor: theme.danger },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.dangerLabel}>
              {t('detail.cancelConfirm.confirm')}
            </ThemedText>
          </Pressable>

          {/* The way out is neutral and never guilt-flavoured ("Not now", never "Don't give up"). */}
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('detail.cancelConfirm.dismiss')}
            style={({ pressed }) => [styles.dismissButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('detail.cancelConfirm.dismiss')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const ICON = 48;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'stretch',
  },
  iconWrap: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  lines: {
    gap: Spacing.two,
  },
  pauseButton: {
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    color: '#fff',
  },
  dismissButton: {
    minHeight: 44,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
