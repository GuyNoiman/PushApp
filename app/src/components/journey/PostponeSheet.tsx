/**
 * PostponeSheet — the FAST Step-postponement sheet (Step Postponement, D37 §3/§11.2). The common
 * action is one tap: "Remind me in 2 hours" (the fixed default, §11.6b). The user may instead pick a
 * specific time, optionally add a reason (never required), or let this one go — all blame-free.
 *
 * BOTH postpone and let-go are FREE — there is NO Grace-Token cost and NO token/streak language
 * (founder decision). Copy is caring, never accusatory.
 *
 * Presentational only — reports the choice upward; no business logic (Bible §19). The primary button
 * is DEBOUNCED here so a double-tap can't schedule two one-shots before the parent closes the sheet.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PostponeSheet({
  visible,
  stepTitle,
  notice,
  onRemindDefault,
  onPickTime,
  onAddReason,
  onLetGo,
  onClose,
}: {
  visible: boolean;
  stepTitle: string;
  /** An honest heads-up to show in place of closing (no-slot-today / a day-crossing warning). */
  notice?: string;
  /** Primary one-tap: remind me again in two hours (the fixed default). */
  onRemindDefault: () => void;
  /** Pick a specific reminder time instead of the 2h default. */
  onPickTime: () => void;
  /** Add an OPTIONAL reason (never required to postpone). */
  onAddReason: () => void;
  /** Let this occurrence go (→ "what happened?"). Free — no penalty. */
  onLetGo: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');

  // Debounce the primary action: re-armed whenever the sheet (re)opens, disarmed on the first tap
  // so a rapid double-tap can't fire two postpones before the parent reacts.
  const [armed, setArmed] = useState(true);
  useEffect(() => {
    if (visible) setArmed(true);
  }, [visible]);

  const remindOnce = () => {
    if (!armed) return;
    setArmed(false);
    onRemindDefault();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('dismiss', { ns: 'common' })} style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('postpone.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.sub}>
            {stepTitle}
          </ThemedText>

          {notice ? (
            <ThemedText type="small" style={[styles.notice, { color: theme.coralStrong }]}>
              {notice}
            </ThemedText>
          ) : null}

          {/* Primary — the fast, fixed 2h default. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('postpone.remindIn2hA11y')}
            onPress={remindOnce}
            disabled={!armed}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.coral },
              pressed && styles.pressed,
              !armed && styles.disabled,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('postpone.remindIn2h')}
            </ThemedText>
          </Pressable>

          {/* Pick a specific time (per-occurrence one-shot, not a Journey retime). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('postpone.pickTimeA11y')}
            onPress={onPickTime}
            style={({ pressed }) => [styles.option, { borderColor: theme.hairline }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('postpone.pickTime')}
            </ThemedText>
          </Pressable>

          {/* Optional reason — never required. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('postpone.addReasonA11y')}
            onPress={onAddReason}
            style={({ pressed }) => [styles.option, { borderColor: theme.hairline }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('postpone.addReason')}
            </ThemedText>
          </Pressable>

          {/* Let this one go — free, no penalty. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('postpone.letGoA11y')}
            onPress={onLetGo}
            style={({ pressed }) => [styles.option, { borderColor: theme.hairline }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              {t('postpone.letGo')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('postpone.letGoHint')}
            </ThemedText>
          </Pressable>
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
  sub: {
    marginBottom: Spacing.two,
  },
  notice: {
    marginBottom: Spacing.one,
  },
  primary: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
  },
  option: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
});
