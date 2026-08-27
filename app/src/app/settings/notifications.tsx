/**
 * Settings › Notifications — one switch per kind of thing the app may tell you about.
 *
 * ── WHY THIS SCREEN DID NOT EXIST UNTIL 2026-08-28 ─────────────────────────────────────────────
 *
 * The Settings row called "Notifications" was a shortcut to the OS permission and nothing else:
 * tap it once to be asked, tap it again to be sent to the system settings. There was no way inside
 * the app to say "cheers yes, nudges no".
 *
 * Underneath, `CommunicationPrefs` had been in the model — persisted, migrated, exported — since the
 * social pillar landed, and **nothing read it and no screen wrote it**. A stored preference that
 * changes nothing is worse than an absent one, because it looks like a promise. This screen and
 * `core/notify/notificationPrefs` are what make it true.
 *
 * ── THE HONEST PART, AND THE REASON THERE IS NO SECOND COLUMN OF SWITCHES ──────────────────────
 *
 * The founder asked for two controls per kind: whether it appears at all, and whether it also
 * appears OUTSIDE the app. The second one can only be offered for reminders, and pretending
 * otherwise would be drawing a dead switch — the same defect as the microphone that did nothing and
 * the Circle field that could not be tapped, both found the same week.
 *
 * Every reminder is a LOCAL notification scheduled on this device. We hold no push token and there
 * is no server that can reach a phone. So a cheer, a request or a friend's paused Journey arrives
 * when the app next asks — it appears in the bell, and it cannot appear on a lock screen at all.
 * Each row says which of the two it is, in a line, rather than offering a choice that does not exist.
 *
 * Presentational (Engineering Bible §19): every decision lives in AppCore and in the pure prefs module.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { NOTIFICATION_SETTINGS, isSettingOn } from '@/core/notify/notificationPrefs';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('settings');
  const { core, snapshot } = useApp();

  // Read so the rows re-render the moment a preference is written.
  void snapshot;
  const prefs = core.getCommunicationPrefs();

  // OS permission, read WITHOUT prompting. It gates only the one row that can leave the app.
  const [granted, setGranted] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void core.refreshReminderPermission().then((ok) => {
      if (active) setGranted(ok);
    });
    return () => {
      active = false;
    };
  }, [core]);

  const remindersOn = isSettingOn(prefs, 'remindersEnabled');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('notifications.title')}</ThemedText>
        </View>

        <KeyboardSafeScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="default" themeColor="textSecondary">
            {t('notifications.intro')}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            {NOTIFICATION_SETTINGS.map((setting, index) => (
              <View key={setting.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.hairline }]} />}
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <ThemedText type="default">{t(`notifications.kinds.${setting.id}.label`)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t(`notifications.kinds.${setting.id}.detail`)}
                    </ThemedText>
                    {/* Where it can appear. Said in a line, because it is a fact about this app and
                        not a second choice the person gets to make. */}
                    <ThemedText type="small" themeColor="textMuted">
                      {setting.canLeaveTheApp
                        ? t('notifications.reach.outside')
                        : t('notifications.reach.inApp')}
                    </ThemedText>
                  </View>
                  <Switch
                    accessibilityLabel={t(`notifications.kinds.${setting.id}.label`)}
                    value={isSettingOn(prefs, setting.key)}
                    onValueChange={(next) => core.setCommunicationPref(setting.key, next)}
                    trackColor={{ true: theme.teal, false: theme.hairline }}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* The one thing this screen genuinely cannot decide. Shown only when it actually bites:
              reminders are on here, and the OS is refusing them. */}
          {remindersOn && granted === false && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('notifications.osBlocked.cta')}
              onPress={() => void Linking.openSettings().catch(() => {})}
              style={({ pressed }) => [
                styles.banner,
                { backgroundColor: theme.goldTint, borderColor: theme.gold },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="notifications-off-outline" size={18} color={theme.goldStrong} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={{ color: theme.goldStrong }}>
                  {t('notifications.osBlocked.title')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('notifications.osBlocked.body')}
                </ThemedText>
              </View>
            </Pressable>
          )}

          <ThemedText type="small" themeColor="textMuted">
            {t('notifications.footnote')}
          </ThemedText>
        </KeyboardSafeScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: { padding: Spacing.one },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowText: { flex: 1, gap: 2 },
  divider: { height: 1, marginStart: Spacing.three },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
});
