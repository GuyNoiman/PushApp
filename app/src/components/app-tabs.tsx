/**
 * AppTabs — the native bottom navigation (v14 mockup screen-01 / screen-10):
 * five icon-only tabs (Home · Explore · Friends · Buddy · Inbox), no labels, no
 * active-pill background. Inactive icons are muted gray; the active tab's icon
 * takes a per-tab meaning-based accent (mockup-evidenced: Home = coral,
 * Buddy = pink; Friends = purple and Inbox = coral per Design_System.md §2's
 * documented per-area accents "Friends purple · Inbox coral"; Explore = teal,
 * the default brand/navigation colour). Icons are Ionicons outline glyphs,
 * matching the mockup's icon set 1:1 (home/compass/people/happy/mail-outline).
 * Inbox carries a small unread dot to match the mockup.
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

// Per-tab active accent (Design System §2 — colour encodes meaning, not decoration).
const activeColors = {
  index: Colors.light.coral,
  explore: Colors.light.teal,
  friends: Colors.light.purple,
  buddy: Colors.light.pink,
  inbox: Colors.light.coral,
} as const;

// Mockup's inactive icon tint (#BCB8AF-family muted gray-beige, close to textMuted).
const inactiveColor = Colors.light.textMuted;

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.light.backgroundElement,
          borderTopColor: Colors.light.hairline,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarActiveTintColor: activeColors.index,
          tabBarInactiveTintColor: inactiveColor,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarActiveTintColor: activeColors.explore,
          tabBarInactiveTintColor: inactiveColor,
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarActiveTintColor: activeColors.friends,
          tabBarInactiveTintColor: inactiveColor,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buddy"
        options={{
          title: 'Buddy',
          tabBarActiveTintColor: activeColors.buddy,
          tabBarInactiveTintColor: inactiveColor,
          tabBarIcon: ({ color, size }) => <Ionicons name="happy-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarActiveTintColor: activeColors.inbox,
          tabBarInactiveTintColor: inactiveColor,
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="mail-outline" size={size} color={color} />
              {/* Unread dot (matches the mockup's inbox badge). */}
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -3,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.light.coral,
                }}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
