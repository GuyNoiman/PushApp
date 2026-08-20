/**
 * Settings — the account & record hub, brought back as the 5th bottom-nav TAB
 * (founder feedback 2026-08-07): Home · Journeys · Circle · Inbox · Settings.
 * A calm, mature sectioned list (04_Product/UX/Profile_Screen.md — a utilitarian
 * "hub of sections"), the opposite of the inviting Buddy/Home surfaces.
 *
 * Sections:
 *   · Profile   — the auto-generated, editable @username (MOVED here from Circle)
 *     plus a display-name/avatar placeholder that sign-in will fill.
 *   · Account   — "Sign in with Apple / Google", marked "Coming soon".
 *   · App       — Notifications (reads the REAL OS permission status and taps to request / open OS
 *     settings — E2), Appearance/Theme (wired), Language (wired), About (real app version from the
 *     Expo config). No longer just placeholders.
 *   · Your data — Export my data (local JSON share) + a destructive Delete account
 *     (O1). These two ARE wired: they orchestrate through useAccountActions.
 *
 * Presentational only (Engineering Bible §19): local UI state (username via ProfileIdentity →
 * SocialProvider; appearance/language prefs; the read-only notification permission status).
 * Hairlines, one teal accent, no gloss, no emoji-as-UI.
 *
 * TODO(auth): Apple/Google sign-in will supply a real display name/identity and
 * turn the Account rows into working actions.
 */
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountSheet } from '@/components/settings/DeleteAccountSheet';
import { ProfileIdentity } from '@/components/settings/ProfileIdentity';
import { SettingsOptionSheet } from '@/components/settings/SettingsOptionSheet';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { featureFlags } from '@/core/config/featureFlags';
import { getSimulatedUser } from '@/core/profile/simulatedUser';
import { activeHoursShape, resolveActiveHours } from '@/core/util/availability';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';
import { useCelebrationPreference } from '@/state/CelebrationPreference';
import { useTheme } from '@/hooks/use-theme';
import { useServerConnection } from '@/hooks/useServerConnection';
import { findLanguage } from '@/i18n/languages';
import type { AddressForm } from '@/i18n/addressForm';
import type { Weekday } from '@/core/util/week';
import { useLanguagePreference } from '@/state/LanguagePreference';
import { useNotificationPermission } from '@/state/useNotificationPermission';
import { useProfile } from '@/state/ProfileProvider';
import { useThemePreference, type ThemePreference } from '@/state/ThemePreference';
import { useAccountActions } from '@/state/useAccountActions';

// Appearance cycles System → Light → Dark → System on tap; the row shows the
// current choice as its value and applies it instantly (the whole app re-themes).
const APPEARANCE_ORDER: readonly ThemePreference[] = ['system', 'light', 'dark'];

// Form of address cycles Neutral → Feminine → Masculine on tap (D31). This interim Settings row
// lets the founder test gendered copy now; it will move into onboarding + the P1 profile redesign.
const ADDRESS_FORM_ORDER: readonly AddressForm[] = ['neutral', 'feminine', 'masculine'];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('settings');
  const { preference, setPreference } = useThemePreference();
  const { language } = useLanguagePreference();
  const { profile, setAddressForm, setWeekStartDay } = useProfile();
  const addressForm = profile.addressForm;
  const weekStartDay = profile.weekStartDay;
  const communicationProfile = profile.communicationProfile;
  const { status: notifStatus, request: requestNotif } = useNotificationPermission();
  const { celebrationsEnabled, setCelebrationsEnabled } = useCelebrationPreference();

  // Localized weekday names (Sun..Sat) for the week-start row's value.
  const weekdayNames = t('weekdays', { ns: 'common', returnObjects: true }) as string[];
  // Tapping the row OPENS the seven days and lets one be chosen (founder, 2026-08-19). It used to
  // cycle Sun → Mon → … on each tap, which never showed what the options were and made the day
  // just behind the current one a six-tap trip through six days nobody wanted.
  const [weekStartSheetVisible, setWeekStartSheetVisible] = useState(false);
  const weekStartOptions = useMemo(
    () => weekdayNames.map((label, i) => ({ value: i as Weekday, label })),
    [weekdayNames],
  );
  const { exportData, deleteAccount } = useAccountActions();
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  // Active Hours summary (D40) — recomputed when the scheduling prefs change (a
  // SchedulingPrefsChanged event refreshes the snapshot, re-rendering this tab).
  const { core, snapshot } = useApp();
  const activeHoursValue = useMemo(() => {
    void snapshot; // re-run when a SchedulingPrefsChanged event refreshes the snapshot
    const prefs = core.getSchedulingPrefs();
    const shape = activeHoursShape(prefs);
    if (shape === 'allDay') return t('activeHours.summaryAllDay');
    if (shape === 'off') return t('activeHours.summaryOff');
    if (shape === 'perDay') return t('activeHours.summaryPerDay');
    const w = resolveActiveHours(prefs).days[0].window;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return t('activeHours.range', {
      start: `${pad2(w.start.hour)}:${pad2(w.start.minute)}`,
      end: `${pad2(w.end.hour)}:${pad2(w.end.minute)}`,
    });
    // `snapshot` is intentionally a dependency: it changes on SchedulingPrefsChanged.
  }, [core, snapshot, t]);

  // Notifications row (E2): tapping requests permission the first time it's undetermined; once the OS
  // has a decision, it deep-links to the app's OS settings so the user can flip it there.
  const onNotificationsPress = () => {
    if (notifStatus === 'undetermined') void requestNotif();
    else void Linking.openSettings().catch(() => {});
  };

  // App version for the About row — read from the Expo config (app.json), never hard-coded.
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Local JSON export via the OS share sheet; a failure surfaces a calm alert
  // rather than crashing (the temp file is always cleaned up by the hook).
  const onExport = async () => {
    try {
      await exportData();
    } catch {
      Alert.alert(t('data.export.errorTitle'), t('data.export.errorBody'));
    }
  };

  // The current appearance choice, localised (System / Light / Dark).
  const appearanceLabel: Record<ThemePreference, string> = {
    system: t('appearance.system'),
    light: t('appearance.light'),
    dark: t('appearance.dark'),
  };

  const cycleAppearance = () => {
    const next = APPEARANCE_ORDER[(APPEARANCE_ORDER.indexOf(preference) + 1) % APPEARANCE_ORDER.length];
    setPreference(next);
  };

  const cycleAddressForm = () => {
    const next =
      ADDRESS_FORM_ORDER[(ADDRESS_FORM_ORDER.indexOf(addressForm) + 1) % ADDRESS_FORM_ORDER.length];
    setAddressForm(next);
  };

  // A dev-simulated Google sign-in (core/profile/simulatedUser) marks the Google row
  // as connected when the founder's env vars are set; Apple stays "coming soon".
  // TODO(auth): replace with a real OAuth session for both providers.
  const simUser = getSimulatedUser();

  // The REAL identity, if one is linked. `providers` carries only provider names (never PII), so
  // this is also all the UI is able to say about who the person is — by design (red-line R1).
  const { user, status, signOut } = useAuth();
  const signedIn = status === 'authenticated';
  /**
   * NO SESSION AT ALL, on a build that HAS a backend — the state that hid for days (2026-08-20).
   *
   * The app opens an anonymous session at launch, and that session is what the coach's proxy and
   * account deletion both authenticate with. Anonymous sign-ins turned out to be switched off on the
   * project, so it failed on every device — and failed SILENTLY: the app degrades politely, this
   * screen looked entirely normal, and the partner met it as three unrelated bugs (a coach that
   * invented a Journey out of his message, a delete that refused, a social pillar that did nothing).
   *
   * A capability that fails without saying so is one nobody fixes. So it says so.
   */
  const connection = useServerConnection();
  const disconnected = connection.disconnected;
  const linkedProvider = user?.providers.find((p) => p === 'apple' || p === 'google');
  const providerLabel = linkedProvider === 'apple' ? 'Apple' : 'Google';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="display">{t('title')}</ThemedText>
        </View>

        {/* Tab-aware: tapping this tab while already on it returns the page to the top. */}
        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile — the username lives here now (moved out of Circle). */}
          <ProfileIdentity />

          {/* My Dreams (Dream Management, D40) — a view-only window into the coach-owned Dreams
              behind the user's Journeys. Sits in the profile area (PRD §4.1). */}
          <SettingsSection title={t('sections.dreams')}>
            <SettingsRow
              icon="sparkles-outline"
              label={t('title', { ns: 'dreams' })}
              detail={t('dreams.rowDetail')}
              onPress={() => router.push('/my-dreams' as Href)}
            />
          </SettingsSection>

          {/* Account — real Apple/Google sign-in (P4/P5). Signed in ⇒ the linked provider and a way
              back out; not signed in ⇒ ONE row into the sign-in screen, which is where the two
              providers live and where it can be explained why anyone would bother. The row is not a
              wall: an anonymous session is a full session, and the app works without ever tapping it.
              The dev-simulated single-user sign-in is still shown when its env is set, labelled as
              simulated so it can never be mistaken for a real OAuth identity. */}
          <SettingsSection title={t('sections.account')}>
            {signedIn ? (
              <>
                <SettingsRow
                  icon={linkedProvider === 'apple' ? 'logo-apple' : 'logo-google'}
                  label={t('signIn.signedInWith', { provider: providerLabel })}
                  connected
                />
                <SettingsRow
                  icon="log-out-outline"
                  label={t('signIn.signOut')}
                  detail={t('signIn.signOutDetail')}
                  onPress={() => void signOut()}
                />
              </>
            ) : (
              <SettingsRow
                icon="person-circle-outline"
                label={t('signIn.title')}
                detail={t('signIn.rowDetail')}
                onPress={() => router.push('/sign-in' as Href)}
              />
            )}
            {/* Stated plainly, and stated as OURS: the user did nothing wrong, their Journeys are
                safe on the device, and the parts that need the server are the parts that are off. */}
            {disconnected ? (
              <SettingsRow
                icon="cloud-offline-outline"
                label={t('signIn.disconnected')}
                // Tapping it RETRIES. Saying "not connected" and giving no way to try again is only
                // half the fix: someone who was offline at first launch would otherwise stay cut off
                // until they reinstalled.
                detail={
                  connection.retrying
                    ? t('connection.retrying', { ns: 'common' })
                    : t('signIn.disconnectedDetail')
                }
                onPress={() => void connection.retry()}
              />
            ) : null}
            {simUser.signedIn ? (
              <SettingsRow
                icon="logo-google"
                label={t('account.google')}
                detail={
                  simUser.email
                    ? t('account.simulatedWithEmail', { email: simUser.email })
                    : t('account.simulatedDev')
                }
                connected
              />
            ) : null}
          </SettingsSection>

          {/* App — light presentational placeholders (no logic wired yet). */}
          <SettingsSection title={t('sections.app')}>
            <SettingsRow
              icon="notifications-outline"
              label={t('app.notifications')}
              detail={t('app.notificationsDetail')}
              value={t(`app.notificationsStatus.${notifStatus}`)}
              onPress={onNotificationsPress}
            />
            <SettingsRow
              icon="contrast-outline"
              label={t('app.appearance')}
              detail={t('app.appearanceDetail')}
              value={appearanceLabel[preference]}
              onPress={cycleAppearance}
            />
            <SettingsRow
              icon="language-outline"
              label={t('app.language')}
              value={findLanguage(language)?.endonym}
              onPress={() => router.push('/settings/language' as Href)}
            />
            <SettingsRow
              icon="chatbubble-ellipses-outline"
              label={t('app.addressForm')}
              detail={t('app.addressFormDetail')}
              value={t(`app.addressFormValue.${addressForm}`)}
              onPress={cycleAddressForm}
            />
            <SettingsRow
              icon="chatbubbles-outline"
              label={t('settings.rowLabel', { ns: 'communication' })}
              detail={t('settings.rowDetail', { ns: 'communication' })}
              value={t(`styleNames.${communicationProfile}`, { ns: 'communication' })}
              onPress={() => router.push('/settings/communication-style' as Href)}
            />
            <SettingsRow
              icon="calendar-outline"
              label={t('app.weekStart')}
              detail={t('app.weekStartDetail')}
              value={weekdayNames[weekStartDay]}
              onPress={() => setWeekStartSheetVisible(true)}
            />
            {/* Small Step celebrations on/off (Completion Celebration §2.1). Tap toggles;
                the big Journey completion ceremony can't be disabled (detail line). */}
            <SettingsRow
              icon="sparkles-outline"
              label={t('app.celebrations')}
              detail={t('app.celebrationsDetail')}
              value={celebrationsEnabled ? t('app.celebrationsOn') : t('app.celebrationsOff')}
              onPress={() => setCelebrationsEnabled(!celebrationsEnabled)}
            />
            <SettingsRow
              icon="time-outline"
              label={t('activeHours.title')}
              detail={t('activeHours.rowDetail')}
              value={activeHoursValue}
              onPress={() => router.push('/settings/active-hours' as Href)}
            />
            <SettingsRow icon="information-circle-outline" label={t('app.about')} value={`v${appVersion}`} />
          </SettingsSection>

          {/* Your data — the two wired account actions (O1). Export is local-only;
              Delete is destructive and gated behind an explicit confirmation. */}
          <SettingsSection title={t('sections.data')}>
            <SettingsRow
              icon="download-outline"
              label={t('data.export.label')}
              detail={t('data.export.detail')}
              onPress={onExport}
            />
            <SettingsRow
              icon="trash-outline"
              label={t('data.delete.label')}
              detail={t('data.delete.detail')}
              destructive
              onPress={() => setDeleteSheetVisible(true)}
            />
          </SettingsSection>

          {/* Developer — founder-device-only; shown only when the adaptive dev flag is on. */}
          {featureFlags.adaptiveCoachDev ? (
            <SettingsSection title={t('sections.developer')}>
              <SettingsRow
                icon="flask-outline"
                label={t('developer.adaptiveReplan')}
                detail={t('developer.adaptiveReplanDetail')}
                onPress={() => router.push('/dev-adaptive' as Href)}
              />
            </SettingsSection>
          ) : null}
        </TabScrollView>

        {/* The seven days, with today's choice ticked — see SettingsOptionSheet for why a list. */}
        <SettingsOptionSheet
          visible={weekStartSheetVisible}
          title={t('app.weekStart')}
          options={weekStartOptions}
          selected={weekStartDay}
          onSelect={setWeekStartDay}
          onClose={() => setWeekStartSheetVisible(false)}
        />

        <DeleteAccountSheet
          visible={deleteSheetVisible}
          onCancel={() => setDeleteSheetVisible(false)}
          onConfirm={deleteAccount}
          onDeleted={() => {
            setDeleteSheetVisible(false);
            // Land on a clean first-run state (onboarding gate takes over).
            router.replace('/' as Href);
          }}
        />
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
});
