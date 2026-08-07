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
 *   · App       — Notifications, Appearance/Theme, About: light presentational
 *     rows so the screen reads complete (no logic wired yet).
 *
 * Presentational only (Engineering Bible §19): the one piece of state — the
 * username — lives in ProfileIdentity, which calls SocialProvider. Everything
 * else is a static row. Hairlines, one teal accent, no gloss, no emoji-as-UI.
 *
 * TODO(auth): Apple/Google sign-in will supply a real display name/identity and
 * turn the Account rows into working actions.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileIdentity } from '@/components/settings/ProfileIdentity';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getSimulatedUser } from '@/core/profile/simulatedUser';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();

  // A dev-simulated Google sign-in (core/profile/simulatedUser) marks the Google row
  // as connected when the founder's env vars are set; Apple stays "coming soon".
  // TODO(auth): replace with a real OAuth session for both providers.
  const simUser = getSimulatedUser();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="title">Settings</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile — the username lives here now (moved out of Circle). */}
          <ProfileIdentity />

          {/* Account — Apple is still "coming soon"; Google reads as connected via the
              dev-simulated sign-in when the founder's env vars are set. The email +
              "Simulated" note keep it honest that no real OAuth ran. TODO(auth). */}
          <SettingsSection title="Account">
            <SettingsRow icon="logo-apple" label="Sign in with Apple" badge="Coming soon" />
            {simUser.signedIn ? (
              <SettingsRow
                icon="logo-google"
                label="Sign in with Google"
                detail={
                  simUser.email ? `${simUser.email} · Simulated` : 'Simulated (dev testing)'
                }
                connected
              />
            ) : (
              <SettingsRow icon="logo-google" label="Sign in with Google" badge="Coming soon" />
            )}
          </SettingsSection>

          {/* App — light presentational placeholders (no logic wired yet). */}
          <SettingsSection title="App">
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              detail="Reminders and cheers"
              value="On"
            />
            <SettingsRow icon="contrast-outline" label="Appearance" detail="Theme" value="System" />
            <SettingsRow icon="information-circle-outline" label="About" value="v0.1" />
          </SettingsSection>
        </ScrollView>
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
