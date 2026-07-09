/**
 * AppTabs — the bottom navigation (v14 mockup screen-01): five icon-only tabs
 * (Home · Explore · Friends · Buddy · Inbox) with a TEAL active tint (brand /
 * navigation, Design System §2) and a muted inactive tint. Home and Buddy use the
 * app's own tab-icon assets; Explore / Friends / Inbox use Ionicons until bespoke
 * assets exist. Inbox carries a small unread dot to match the mockup.
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Image, View } from 'react-native';

import { Colors } from '@/constants/theme';

const tabIcons = {
  index: require('@/assets/images/tabIcons/home.png'),
  buddy: require('@/assets/images/tabIcons/buddy.png'),
} as const;

export default function AppTabs() {
  const colors = Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Teal active tint = brand/navigation (Design System §2); muted inactive.
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.hairline,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.index}
              style={{ width: 26, height: 26, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="buddy"
        options={{
          title: 'Buddy',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.buddy}
              style={{ width: 26, height: 26, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
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
                  backgroundColor: colors.coral,
                }}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
