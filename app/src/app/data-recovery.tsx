/**
 * Data recovery — the calm, honest screen shown when the app finds stored data it cannot open
 * (Encryption_Design §6.3, Phase C0). It is the ONLY reachable surface while that is true, because
 * every other surface would be a lie: an empty Home would suggest the user's Journeys are gone.
 *
 * What it promises, and what the engine actually guarantees:
 *   - the data is still on the device (quarantined, byte for byte)
 *   - nothing has been deleted, and nothing will be written over it
 *   - the only way to lose it is the explicit, two-step "start fresh"
 *
 * Presentational only (Engineering Bible §19): the classification, the quarantine and the write
 * lock all live in the Repository + AppCore; this screen renders the read model and calls the
 * facade. Copy is gender-aware through useAddressedTranslation (D31).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import { useApp } from '@/state/AppProvider';

/** The reason key each classification renders. Kept exhaustive so a new reason cannot go unhandled. */
const INTRO_KEY = {
  'key-lost': 'intro.keyLost',
  corrupt: 'intro.corrupt',
  malformed: 'intro.malformed',
} as const;

export default function DataRecoveryScreen() {
  const { core, snapshot } = useApp();
  const theme = useTheme();
  const { t } = useAddressedTranslation('recovery');

  const recovery = snapshot?.dataRecovery ?? null;
  const [confirming, setConfirming] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Resolved (retried successfully, or wiped): the gate is already routing away, so render nothing
  // rather than flash an empty recovery message.
  if (!recovery) return null;

  const retry = async () => {
    setBusy(true);
    const opened = await core.retryLoad();
    setRetryFailed(!opened);
    setBusy(false);
  };

  const startFresh = async () => {
    setBusy(true);
    await core.startFreshAfterUnreadableData();
    setBusy(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">{t('title')}</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {t(INTRO_KEY[recovery.reason])}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {t('kept')}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            {t('privacy')}
          </ThemedText>
          {retryFailed && !confirming ? (
            <ThemedText type="small" themeColor="textMuted">
              {t('tryAgainFailed')}
            </ThemedText>
          ) : null}

          {/* Step two of the destructive path: the wipe is never one tap away. */}
          {confirming ? (
            <View style={[styles.confirmCard, { borderColor: theme.hairline }]}>
              <ThemedText type="smallBold">{t('confirm.title')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('confirm.body')}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {confirming ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('confirm.cancel')}
                disabled={busy}
                onPress={() => setConfirming(false)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('confirm.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('confirm.confirm')}
                disabled={busy}
                onPress={startFresh}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  {t('confirm.confirm')}
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tryAgain')}
                disabled={busy}
                onPress={retry}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('tryAgain')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('startFresh')}
                disabled={busy}
                onPress={() => setConfirming(true)}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textMuted">
                  {t('startFresh')}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  confirmCard: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
