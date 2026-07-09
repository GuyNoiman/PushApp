import { Tabs } from 'expo-router';
import { Image } from 'react-native';

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
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="buddy"
        options={{
          title: 'Buddy',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.buddy}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
