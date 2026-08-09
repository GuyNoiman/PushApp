/**
 * DeleteAccountSheet — the destructive, irreversible confirmation for "Delete
 * account" (O1). Permanently removing an account is a decision we make the user
 * commit to deliberately: a one-tap button is NOT enough, so the final action is
 * gated behind an explicit affirmative gesture — the user must tick "I understand"
 * before the destructive button unlocks.
 *
 * Presentational + a little local confirm state (Engineering Bible §19): the
 * actual work is the injected `onConfirm` (the useAccountActions orchestrator).
 * This component owns only the acknowledgement toggle, the in-flight spinner, and
 * turning a failure into a translated, human message. On success it calls
 * `onDeleted` so the screen can navigate to the clean first-run state.
 *
 * i18n + RTL aware; mature styling (hairlines, one danger accent, no gloss).
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BackendUnreachableError } from '@/state/useAccountActions';

export function DeleteAccountSheet({
  visible,
  onCancel,
  onConfirm,
  onDeleted,
}: {
  visible: boolean;
  onCancel: () => void;
  /** Runs the actual deletion; throws to signal failure (offline / server). */
  onConfirm: () => Promise<void>;
  /** Called once deletion succeeded, so the screen can leave for a clean state. */
  onDeleted: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('settings');
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the transient state whenever the sheet is dismissed, so a re-open starts
  // clean (no stale acknowledgement / error carried over).
  const close = () => {
    if (deleting) return; // never dismiss mid-delete
    setAcknowledged(false);
    setError(null);
    onCancel();
  };

  const confirm = async () => {
    if (!acknowledged || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      // Leave the sheet clean for any future mount, then hand off to navigation.
      setAcknowledged(false);
      setDeleting(false);
      onDeleted();
    } catch (e) {
      setDeleting(false);
      setError(
        e instanceof BackendUnreachableError
          ? t('data.delete.errorOffline')
          : t('data.delete.errorGeneric'),
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        {/* Tapping the scrim cancels (disabled mid-delete). */}
        <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" />

        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.background, borderColor: theme.hairline },
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.dangerTint }]}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </View>

          <ThemedText type="subtitle" style={styles.centered}>
            {t('data.delete.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {t('data.delete.body')}
          </ThemedText>

          {/* The explicit affirmative gesture: the destructive button stays locked
              until this is ticked. */}
          <Pressable
            onPress={() => setAcknowledged((v) => !v)}
            disabled={deleting}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            style={({ pressed }) => [
              styles.ack,
              { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={acknowledged ? 'checkbox' : 'square-outline'}
              size={22}
              color={acknowledged ? theme.danger : theme.textMuted}
            />
            <ThemedText type="small" style={styles.ackText}>
              {t('data.delete.acknowledge')}
            </ThemedText>
          </Pressable>

          {error ? (
            <ThemedText type="small" style={[styles.centered, { color: theme.danger }]}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={confirm}
            disabled={!acknowledged || deleting}
            accessibilityRole="button"
            accessibilityLabel={t('data.delete.confirm')}
            style={({ pressed }) => [
              styles.dangerButton,
              { backgroundColor: theme.danger },
              (!acknowledged || deleting) && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="smallBold" style={styles.dangerLabel}>
                {t('data.delete.confirm')}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={close}
            disabled={deleting}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('data.delete.cancel')}
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
  ack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  ackText: {
    flex: 1,
  },
  dangerButton: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
