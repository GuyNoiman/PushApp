/**
 * AppTabs — the native bottom navigation (mature redesign 2026-08-07,
 * `mature_proposal.html`): five calm icon+label tabs — Home · Journeys · Circle ·
 * Inbox · Settings. One accent does the work: the active tab is turquoise
 * (`theme.teal`), inactive tabs are muted neutral (`theme.textMuted`) — no
 * per-tab rainbow, no active-pill background. Small text labels sit under each
 * icon (the mature nav shows labels). Icons are Ionicons; each swaps
 * outline→filled when focused.
 *
 * Inbox was re-added to the bar (founder feedback 2026-08-07); Settings is back
 * as the 5th tab (founder feedback 2026-08-07) and now hosts the user's identity.
 * Coach, Explore and Buddy remain ARCHIVED out of the bar (`href: null`) — their
 * route files still exist and open if navigated to directly, but they are no
 * longer tabbable. See 04_Product/UX/Archived_Screens.md.
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

// The bar carries an icon plus a small label, so it needs a touch more room than
// the old icon-only strip. Keep a compact content height and add the device's
// home-indicator inset on top so nothing sits under the gesture bar.
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The mature nav shows small labels under each icon.
        tabBarShowLabel: true,
        // One accent for the active tab; muted neutral for the rest (Design
        // System — colour is meaning, used sparingly: teal = active/progress).
        tabBarActiveTintColor: theme.teal,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          // Nav sits on the LIFTED surface (not the darkest ground) so in dark mode
          // it reads as a distinct bar with a little life, not a black void.
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.hairline,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: 'Journeys',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'git-branch' : 'git-branch-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          // The Support-Circle surface is labelled "Circle" in the mature nav.
          title: 'Circle',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'mail' : 'mail-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
      {/* ARCHIVED / off-bar. `href: null` keeps the routes reachable directly but
          hides them from the tab bar. Coach is NO LONGER a tab (founder 2026-08-07):
          it's opened from a prominent entry on Home instead. Explore + Buddy stay
          archived. See 04_Product/UX/Archived_Screens.md. */}
      <Tabs.Screen name="coach" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="buddy" options={{ href: null }} />
    </Tabs>
  );
}
