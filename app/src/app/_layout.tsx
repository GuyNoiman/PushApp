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

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontAssets } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
// Importing the i18n instance runs its init (side-effect) before any screen
// renders, so `t(...)` is ready and the boot language is resolved.
import '@/i18n';
import { AppProvider, useApp } from '@/state/AppProvider';
import { AuthProvider } from '@/state/AuthProvider';
import { CelebrationPreferenceProvider } from '@/state/CelebrationPreference';
import { EntitlementProvider } from '@/state/EntitlementProvider';
import { LanguagePreferenceProvider } from '@/state/LanguagePreference';
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
                      <ThemedChrome />
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
        <Stack.Screen name="achievements" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shop" options={{ presentation: 'modal' }} />
        {/* Missions is a centered floating modal (screen-16): a transparent
            presentation keeps Home visible (dimmed by the screen's own scrim)
            behind it, and a fade reads as a modal appearing over Home rather
            than a card sliding up over an opaque page. */}
        <Stack.Screen
          name="missions"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="weekly-planning" options={{ presentation: 'modal' }} />
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
