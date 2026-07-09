import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors, FontAssets } from '@/constants/theme';
import { AppProvider } from '@/state/AppProvider';
import { SocialProvider } from '@/state/SocialProvider';

SplashScreen.preventAutoHideAsync();

// The app is warm-light only (Design System §2). Force the navigation theme to
// our palette so screen backgrounds, cards, and borders are on-brand rather than
// the stock white/black defaults. Dark mode is future work.
const NavTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.backgroundElement,
    text: Colors.light.text,
    border: Colors.light.hairline,
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
    <AppProvider>
      <SocialProvider>
        <ThemeProvider value={NavTheme}>
          <StatusBar style="dark" />
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="journey/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="journey/[id]" />
            <Stack.Screen name="journeys" options={{ presentation: 'modal' }} />
            <Stack.Screen name="achievements" options={{ presentation: 'modal' }} />
            <Stack.Screen name="shop" options={{ presentation: 'modal' }} />
            <Stack.Screen name="missions" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SocialProvider>
    </AppProvider>
  );
}
