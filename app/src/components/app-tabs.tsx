/**
 * AppTabs — the native bottom navigation (mature redesign 2026-08-07,
 * `mature_proposal.html`): five calm icon+label tabs — Home · Journeys · Circle ·
 * Inbox · Settings. One accent does the work: the active tab is turquoise
 * (`theme.teal`), inactive tabs are muted neutral (`theme.textMuted`) — no
 * per-tab rainbow, no active-pill background. Small text labels sit under each
 * icon (the mature nav shows labels). Icons are Ionicons; each swaps
 * outline→filled when focused.
 *
 * Tapping the tab you are ALREADY on returns that page to the top (founder device
 * pass 2026-08-17). That doesn't live here: the bar can't reach a screen's scroll
 * position, so each tab screen scrolls itself through TabScrollView, which listens
 * for this navigator's `tabPress`. A tab screen gets the behaviour by using
 * `<TabScrollView>` instead of a bare `<ScrollView>` — see
 * `components/ui/TabScrollView.tsx`.
 *
 * INBOX LEFT THE BAR on 2026-08-20 (founder's option 1, chosen from rendered options): it is now a
 * root Stack route reached from the mail button in Home's status strip, the pattern people already
 * know from Instagram. Messages are correspondence, not a place to live in, and the slot it freed
 * became TOOLS — the home for questionnaires and small in-app experiences. Settings stays the fifth
 * tab (founder feedback 2026-08-07) and hosts the user's identity.
 * Coach, Explore and Buddy remain ARCHIVED out of the bar (`href: null`) — their
 * route files still exist and open if navigated to directly, but they are no
 * longer tabbable. See 04_Product/UX/Archived_Screens.md.
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

// The bar carries an icon plus a small label, so it needs a touch more room than
// the old icon-only strip. Keep a compact content height and add the device's
// home-indicator inset on top so nothing sits under the gesture bar.
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation('common');

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
          title: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: t('tabs.journeys'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'git-branch' : 'git-branch-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          // The Support-Circle surface is labelled "Circle" in the mature nav.
          title: t('tabs.circle'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabs.tools'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
      {/* ARCHIVED / off-bar. `href: null` keeps the route reachable directly but
          hides it from the tab bar. (Coach is NOT here: it's a root Stack route
          `app/coach.tsx`, opened from the Home hero — a tab's `href:null` route is
          not navigable via router.push, which is why it lives outside the group.)
          Explore stays archived. Buddy left the tree entirely — its route file now
          lives in 12_Future_Assets/. See 04_Product/UX/Archived_Screens.md. */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
