import {
  DarkTheme as NavDarkDefault,
  DefaultTheme,
  ThemeProvider,
  type Theme,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { resolveMediaGateway } from '@/core/media/ExpoMediaGateway';
import { setMediaGateway } from '@/core/media/MediaGateway';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontAssets } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
// Importing the i18n instance runs its init (side-effect) before any screen
// renders, so `t(...)` is ready and the boot language is resolved.
import '@/i18n';
import { AppProvider, useApp } from '@/state/AppProvider';
import { AuthProvider } from '@/state/AuthProvider';
import { CelebrationPreferenceProvider } from '@/state/CelebrationPreference';
import { LifeWheelProvider } from '@/state/LifeWheelStore';
import { ToolsShelfProvider } from '@/state/ToolsShelf';
import { PassionMapProvider } from '@/state/PassionMapStore';
import { MessagingProvider } from '@/state/MessagingProvider';
import { StateBackupProvider } from '@/state/StateBackupProvider';
import { ToolRecordsProvider } from '@/state/ToolRecordsStore';
import { ReflectionsProvider } from '@/state/ReflectionsStore';
import { ValuesProvider } from '@/state/ValuesStore';
import { EntitlementProvider } from '@/state/EntitlementProvider';
import { LanguagePreferenceProvider } from '@/state/LanguagePreference';
import { NotificationCopySync } from '@/state/NotificationCopySync';
import { ProfileProvider } from '@/state/ProfileProvider';
import { SocialProvider } from '@/state/SocialProvider';
import { ThemePreferenceProvider } from '@/state/ThemePreference';

SplashScreen.preventAutoHideAsync();

// Enable RTL support as early as possible (module scope, before the first
// render). We deliberately do NOT force a direction here: React Native persists
// the last forced direction natively across launches, so a returning RTL user
// already opens right-to-left. Forcing from the *device* locale would fight a
// user whose chosen app language differs in direction from their device and loop
// the reopen prompt — so LanguagePreference resolves direction from the persisted
// choice at its first async opportunity and prompts a reopen only on a real flip.
I18nManager.allowRTL(true);

// Force the navigation chrome onto OUR palette (both schemes) so screen
// backgrounds, cards, and borders are on-brand rather than the stock white/black
// react-navigation defaults. The light/dark pair mirrors `Colors` in theme.ts.
const NavThemes: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.tint,
      background: Colors.light.background,
      card: Colors.light.backgroundElement,
      text: Colors.light.text,
      border: Colors.light.hairline,
    },
  },
  dark: {
    ...NavDarkDefault,
    colors: {
      ...NavDarkDefault.colors,
      primary: Colors.dark.tint,
      background: Colors.dark.background,
      card: Colors.dark.backgroundElement,
      text: Colors.dark.text,
      border: Colors.dark.hairline,
    },
  },
};

/**
 * Install the media gateway once, at module load. It resolves to the real one when the native
 * modules are in this build and to the Null one when they are not, so a JS-only build, Expo Go and
 * every jest run all keep working — they simply do not offer a camera.
 */
setMediaGateway(resolveMediaGateway());

export default function RootLayout() {
  // Load the brand fonts (Baloo 2 headings + Inter body, Design System §3) before
  // revealing the app so headings never flash in a fallback face. The splash is
  // held (preventAutoHideAsync above) until they resolve — errors don't wedge the
  // splash forever, so a missing font degrades to the system stack rather than a
  // blank screen.
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // Required by react-native-gesture-handler v2 so any gesture (e.g. Home's
    // swipe-to-report Step cards / draggable Week's-steps sheet) works correctly
    // on native; harmless no-op wrapper on web. Wraps everything, once, at the root.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <AuthProvider>
          <EntitlementProvider>
            <SocialProvider>
              {/* Owns the user's Light/Dark/System override (Settings › Appearance).
                  It must wrap ThemedChrome — which resolves useColorScheme() for the
                  nav palette + StatusBar — so a preference change re-themes the app. */}
              <ThemePreferenceProvider>
                {/* Owns the user's on/off choice for SMALL Step celebrations
                    (Settings › App). A sibling concern to theme; the big Journey
                    ceremony is never governed by this flag. */}
                <CelebrationPreferenceProvider>
                  {/* Owns the user's language choice (Settings › Language) + the
                      RTL/restart bookkeeping. A sibling concern to theme. */}
                  <LanguagePreferenceProvider>
                    {/* The ONE profile store (Own_Profile) — the private source of truth for identity +
                        adaptation fields. It mirrors form-of-address (D31) + week-start day (D33) into
                        the framework-free modules the engines read, so there is a single home. */}
                    <ProfileProvider>
                      {/* What the person has opened and kept in the Tools tab. ON-DEVICE ONLY (G1):
                          which tools somebody reaches for is a picture of what they are struggling
                          with, and it never leaves the phone. */}
                      <ToolsShelfProvider>
                        {/* The Life Wheel's answers and the one summary the rest of the app may
                            read. ON-DEVICE ONLY (G1) — see the store's header. */}
                        <LifeWheelProvider>
                          {/* A Values Clarification in progress, and the five it ends with.
                              ON-DEVICE ONLY (G1) — see the store's header. */}
                          <ValuesProvider>
                            {/* Letters written to a future self, and what is due back. The most
                                personal thing the app holds — ON-DEVICE ONLY (G1). */}
                            <PassionMapProvider>
                            <ReflectionsProvider>
                            {/* What the record-keeping tools write (the 2026-08-21 set). ON-DEVICE
                                ONLY, and several of them read by nothing at all (D66). */}
                            {/* Direct conversations. Everything it holds is sealed on the device
                                before it leaves (`core/messaging/crypto.ts`). */}
                            <MessagingProvider>
                            <ToolRecordsProvider>
                        {/* Renders nothing: re-resolves pending reminder copy whenever the
                            language, form of address or communication style changes (D40). It sits
                            here because it needs the core, the language provider AND the profile. */}
                        <NotificationCopySync />
                        {/* Renders nothing: restores this account's state on a new device and keeps
                            the server copy current. The reason a lost phone is survivable (D73). */}
                        <StateBackupProvider />
                        <ThemedChrome />
                            </ToolRecordsProvider>
                            </MessagingProvider>
                            </ReflectionsProvider>
                            </PassionMapProvider>
                          </ValuesProvider>
                        </LifeWheelProvider>
                      </ToolsShelfProvider>
                    </ProfileProvider>
                  </LanguagePreferenceProvider>
                </CelebrationPreferenceProvider>
              </ThemePreferenceProvider>
            </SocialProvider>
          </EntitlementProvider>
        </AuthProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The scheme-dependent chrome. Rendered INSIDE ThemePreferenceProvider so its
 * useColorScheme() call resolves through the user's Light/Dark/System override:
 * changing the preference re-runs this component and re-themes the nav palette,
 * StatusBar, and every screen below the Stack.
 */
function ThemedChrome() {
  const scheme = useColorScheme();
  const { snapshot, ready } = useApp();

  // First-run gate (K2, Onboarding_Questionnaire_PRD): until onboarding is complete, only the
  // onboarding stack is reachable; once complete it is removed for good and the tabs take over.
  // While the core is still loading we keep the tabs available (today's behaviour — Home tolerates a
  // null snapshot and the splash covers), so an EXISTING user never flashes onboarding; a genuine
  // first run redirects to onboarding the moment the loaded state resolves. The Stack.Protected
  // guards are mutually exclusive, so expo-router redirects to the available anchor when they flip.
  const gateReady = ready && snapshot != null;
  const onboardingCompleted = snapshot?.onboardingCompleted === true;

  // Recovery gate (Encryption_Design §6, Phase C0): the core found stored data it could not open.
  // Nothing has been written over it and nothing will be, so the app must say so rather than show a
  // silently empty Home. It outranks the onboarding gate — this user is not new, we just cannot read
  // their data yet — and it clears itself the moment the recovery resolves.
  const inRecovery = gateReady && snapshot?.dataRecovery != null;

  return (
    <ThemeProvider value={NavThemes[scheme]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Unreadable stored data — the only reachable surface until it is resolved. */}
        <Stack.Protected guard={inRecovery}>
          <Stack.Screen name="data-recovery" />
        </Stack.Protected>
        {/* The first-run onboarding flow — the only reachable surface until it completes. */}
        <Stack.Protected guard={gateReady && !inRecovery && !onboardingCompleted}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!inRecovery && (onboardingCompleted || !gateReady)}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        {/* Settings › Language picker — a card push from the Settings tab. */}
        <Stack.Screen name="settings/language" />
        {/* My Profile (Own_Profile) — the private self-view/edit, opened from the Settings
            profile header; and its searchable country picker. */}
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/country" />
        {/* Account-level Active Hours editor — reused by Settings and by the onboarding
            Personal Information page. */}
        <Stack.Screen name="settings/active-hours" />
        {/* Communication Style (D40) — the view/retake settings page and the six-message
            questionnaire, reachable from Settings and from the onboarding completion seam. */}
        <Stack.Screen name="settings/communication-style" />
        <Stack.Screen name="settings/communication-style-quiz" />
        <Stack.Screen name="journey/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="journey/[id]" />
        {/* Friend Profile (Friend_Profile_PRD) — a pushed detail screen, not a modal: it has
            sub-navigation and a destructive action, so it belongs on the back stack. */}
        <Stack.Screen name="friend/[id]" />
        {/* My Dreams (Dream Management, D40) — the private, view-only Dream list opened from the
            Settings profile area, and each Dream's detail. Coach-owned; no CRUD controls. */}
        <Stack.Screen name="my-dreams" />
        <Stack.Screen name="dream/[id]" />
        {/* My Journeys is now a first-class TAB ((tabs)/journeys.tsx),
            not a pushed modal (mature redesign 2026-08-07). */}
        {/* Shop, Missions, Achievements and Weekly Planning were entry-point-less routes and are
            ARCHIVED — their screens now live outside app/ entirely, in 12_Future_Assets/.
            See 04_Product/UX/Archived_Screens.md before reviving one. */}
        {/* Weekly Review — the one user-level review after a week closes (D40). A modal so it
            opens over the tabs on the first app entry after week close, minimizable but not
            dismissible without choosing an outcome. */}
        <Stack.Screen name="weekly-review" options={{ presentation: 'modal' }} />
        {/* Completion ceremony (Completion Celebration, I1) — the big Journey-completion moment +
            reusable share flow. A modal that auto-opens the first foreground after a Journey
            completes, and reopens (mode=reopen) from the completed Journey's Share completion. */}
        <Stack.Screen name="completion" options={{ presentation: 'modal' }} />
        {/* Inactivity return (Account Inactivity Freeze, J5) — the calm "welcome back" modal that
            auto-opens the first foreground after the app paused Journeys for a long absence. */}
        <Stack.Screen name="return" options={{ presentation: 'modal' }} />
        {/* Coach conversation — a root Stack route (NOT a tab), opened from the
            Home hero via router.push('/coach'). A card push with its own back
            button so it slides over the tabs. */}
        <Stack.Screen name="coach" />
        {/* Inbox — a root Stack route since 2026-08-20, opened from the mail button in Home's
            status strip. It LEFT the tab bar so the fifth slot could become Tools (founder's
            option 1): messages are correspondence, not a place you live in, and Instagram's
            pattern of an envelope at the top of the feed is what people already expect. */}
        <Stack.Screen name="inbox" />
        {/* The nine onboarding questions, taken again from the Tools tab. A root route rather than a
            nested one so it slides over the tabs like every other full-screen flow. */}
        <Stack.Screen name="questionnaire" />
        {/* DEV-only adaptive report→replan trigger — reachable from Settings when the
            founder-device-only adaptiveCoachDev flag is on; inert otherwise. */}
        <Stack.Screen name="dev-adaptive" options={{ presentation: 'modal' }} />
      </Stack>
      {/* First-run gate cover: until the persisted state resolves (`gateReady`), keep a neutral,
          on-brand fill over everything so a genuine first run never briefly shows the tabs (with
          seeded demo data) before redirecting into onboarding. The animated splash may finish before
          the async load does, so this is the reliable no-flash cover. */}
      {!gateReady && (
        <View
          pointerEvents="none"
          style={[styles.gateCover, { backgroundColor: NavThemes[scheme].colors.background }]}
        />
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  gateCover: { ...StyleSheet.absoluteFillObject },
});
