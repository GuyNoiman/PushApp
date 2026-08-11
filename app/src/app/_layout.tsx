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
import { I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontAssets } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
// Importing the i18n instance runs its init (side-effect) before any screen
// renders, so `t(...)` is ready and the boot language is resolved.
import '@/i18n';
import { AppProvider } from '@/state/AppProvider';
import { AuthProvider } from '@/state/AuthProvider';
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

  return (
    <ThemeProvider value={NavThemes[scheme]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* Settings › Language picker — a card push from the Settings tab. */}
        <Stack.Screen name="settings/language" />
        {/* My Profile (Own_Profile) — the private self-view/edit, opened from the Settings
            profile header; and its searchable country picker. */}
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/country" />
        <Stack.Screen name="journey/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="journey/[id]" />
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
        {/* Coach conversation — a root Stack route (NOT a tab), opened from the
            Home hero via router.push('/coach'). A card push with its own back
            button so it slides over the tabs. */}
        <Stack.Screen name="coach" />
        {/* DEV-only adaptive report→replan trigger — reachable from Settings when the
            founder-device-only adaptiveCoachDev flag is on; inert otherwise. */}
        <Stack.Screen name="dev-adaptive" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
