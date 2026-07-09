import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
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
  return (
    <AppProvider>
      <SocialProvider>
        <ThemeProvider value={NavTheme}>
          <StatusBar style="dark" />
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="journey/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="shop" options={{ presentation: 'modal' }} />
            <Stack.Screen name="missions" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SocialProvider>
    </AppProvider>
  );
}
