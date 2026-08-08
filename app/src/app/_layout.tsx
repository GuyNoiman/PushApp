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
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontAssets } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider } from '@/state/AppProvider';
import { AuthProvider } from '@/state/AuthProvider';
import { EntitlementProvider } from '@/state/EntitlementProvider';
import { SocialProvider } from '@/state/SocialProvider';

SplashScreen.preventAutoHideAsync();

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
  const scheme = useColorScheme();

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
              <ThemeProvider value={NavThemes[scheme]}>
                <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                <AnimatedSplashOverlay />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
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
                  {/* Coach conversation — a root Stack route (NOT a tab), opened from the
                      Home hero via router.push('/coach'). A card push with its own back
                      button so it slides over the tabs. */}
                  <Stack.Screen name="coach" />
                  {/* DEV-only adaptive report→replan trigger — reachable from Settings when the
                      founder-device-only adaptiveCoachDev flag is on; inert otherwise. */}
                  <Stack.Screen name="dev-adaptive" options={{ presentation: 'modal' }} />
                </Stack>
              </ThemeProvider>
            </SocialProvider>
          </EntitlementProvider>
        </AuthProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
