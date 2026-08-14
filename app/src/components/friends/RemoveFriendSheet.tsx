/**
 * RemoveFriendSheet — the destructive, irreversible confirmation for "Remove friend"
 * (Friend_Profile_PRD §4.5). Modelled directly on `settings/DeleteAccountSheet`: same scrim, same
 * danger-tinted icon circle, same explicit "I understand" gesture before the destructive button
 * unlocks, same in-flight spinner and translated failure. One destructive pattern in this app, not two.
 *
 * The one thing this sheet adds is the IMPACT COUNTS, and their whole point is that they are never
 * guessed. On open it asks the gateway what removal will actually cut:
 *   · loading  → a spinner; acknowledge AND the destructive button are both disabled;
 *   · error    → an explicit "we couldn't check" line + Retry; the destructive button STAYS disabled,
 *                so nobody can confirm against unknown counts and no `0` is ever shown as a fact;
 *   · loaded   → the real X/Y sentence, or a MEASURED "this won't affect any shared Journeys".
 *
 * On failure the sheet stays open with a translated message (the provider's `removeFriend` re-throws
 * for exactly this reason). Presentational + local confirm state; the work is the injected
 * `onConfirm` / `loadImpact` (Engineering Bible §19). i18n + RTL aware.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { UnfriendImpact } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';

export function RemoveFriendSheet({
  visible,
  friendName,
  loadImpact,
  onCancel,
  onConfirm,
  onRemoved,
}: {
  visible: boolean;
  friendName: string;
  /** Reads the real impact counts. Rejects rather than returning zeros (PRD §4.5). */
  loadImpact: () => Promise<UnfriendImpact>;
  onCancel: () => void;
  /** Runs the actual removal; throws to signal failure (offline / server refused). */
  onConfirm: () => Promise<void>;
  /** Called once removal succeeded, so the screen can leave the now-unreachable profile. */
  onRemoved: () => void;
}) {
  const theme = useTheme();
  // Addressed (D31): the acknowledgement speaks to the user, so it inflects by form of address.
  // Every other key here has no gendered variant and resolves to its neutral base.
  const { t } = useAddressedTranslation('friendProfile');

  const [impact, setImpact] = useState<UnfriendImpact | null>(null);
  const [impactFailed, setImpactFailed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so `checkImpact` stays stable: the caller passes a fresh closure on every render,
  // and depending on it directly would re-read the counts on any unrelated parent re-render.
  const loadImpactRef = useRef(loadImpact);
  loadImpactRef.current = loadImpact;

  const checkImpact = useCallback(async () => {
    setImpact(null);
    setImpactFailed(false);
    try {
      setImpact(await loadImpactRef.current());
    } catch {
      // The provider already surfaced the message; here we only flag it so the counts area shows
      // the retry line and the destructive button stays locked.
      setImpactFailed(true);
    }
  }, []);

  // Read the counts fresh every time the sheet opens — they sit in front of an irreversible action,
  // and the other person may have shared or withdrawn a Journey since the profile loaded.
  useEffect(() => {
    if (visible) void checkImpact();
  }, [visible, checkImpact]);

  // Reset the transient state whenever the sheet is dismissed, so a re-open starts clean.
  const close = () => {
    if (removing) return; // never dismiss mid-removal
    setAcknowledged(false);
    setError(null);
    onCancel();
  };

  const ready = impact !== null;
  const canConfirm = ready && acknowledged && !removing;

  const confirm = async () => {
    if (!canConfirm) return;
    setRemoving(true);
    setError(null);
    try {
      await onConfirm();
      // Leave the sheet clean for any future mount, then hand off to navigation.
      setAcknowledged(false);
      setRemoving(false);
      onRemoved();
    } catch {
      setRemoving(false);
      setError(t('remove.errorGeneric', { name: friendName }));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        {/* Tapping the scrim cancels (disabled mid-removal). */}
        <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" />

        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.hairline }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.dangerTint }]}>
            <Ionicons name="person-remove-outline" size={22} color={theme.danger} />
          </View>

          <ThemedText type="subtitle" style={styles.centered}>
            {t('remove.title', { name: friendName })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {t('remove.body')}
          </ThemedText>

          {/* ── The impact counts: real, or honestly unknown. Never a fabricated zero. ── */}
          <View style={[styles.impact, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
            {impactFailed ? (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  {t('remove.checkError')}
                </ThemedText>
                <Pressable
                  onPress={() => void checkImpact()}
                  accessibilityRole="button"
                  accessibilityLabel={t('remove.checkRetry')}
                  style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    {t('remove.checkRetry')}
                  </ThemedText>
                </Pressable>
              </>
            ) : !impact ? (
              <View style={styles.checking}>
                <ActivityIndicator color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('remove.checking')}
                </ThemedText>
              </View>
            ) : (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  {impact.journeysTheySupportForMe === 0 && impact.journeysISupportForThem === 0
                    ? t('remove.none')
                    : t('remove.summary', {
                        name: friendName,
                        theirs: impact.journeysTheySupportForMe,
                        yours: impact.journeysISupportForThem,
                      })}
                </ThemedText>
                {impact.pendingInvites > 0 ? (
                  <ThemedText type="small" themeColor="textMuted" style={styles.centered}>
                    {t('remove.pending', { pending: impact.pendingInvites })}
                  </ThemedText>
                ) : null}
              </>
            )}
          </View>

          {/* The explicit affirmative gesture: locked until the counts are actually known. */}
          <Pressable
            onPress={() => setAcknowledged((v) => !v)}
            disabled={!ready || removing}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged, disabled: !ready || removing }}
            accessibilityLabel={t('remove.acknowledge')}
            style={({ pressed }) => [
              styles.ack,
              { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
              (!ready || removing) && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Ionicons
              name={acknowledged ? 'checkbox' : 'square-outline'}
              size={22}
              color={acknowledged ? theme.danger : theme.textMuted}
            />
            <ThemedText type="small" style={styles.ackText}>
              {t('remove.acknowledge')}
            </ThemedText>
          </Pressable>

          {error ? (
            <ThemedText type="small" style={[styles.centered, { color: theme.danger }]}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={confirm}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityLabel={t('remove.confirm')}
            accessibilityState={{ disabled: !canConfirm }}
            style={({ pressed }) => [
              styles.dangerButton,
              { backgroundColor: theme.danger },
              !canConfirm && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {removing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="smallBold" style={styles.dangerLabel}>
                {t('remove.confirm')}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={close}
            disabled={removing}
            accessibilityRole="button"
            accessibilityLabel={t('remove.cancel')}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('remove.cancel')}
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
  impact: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  checking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  retry: {
    // ≥44pt target for the one recovery action in this sheet.
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
    minHeight: 44,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
