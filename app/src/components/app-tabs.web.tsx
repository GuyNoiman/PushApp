import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

// The five nav tabs (v14 mockup screen-01 / screen-10): Home · Explore · Friends ·
// Buddy · Inbox — icon-only, no labels, no active-pill background. Inactive icons
// are muted gray; the active tab takes a per-tab meaning-based accent (mockup-
// evidenced: Home = coral, Buddy = pink; Friends = purple / Inbox = coral per
// Design_System.md §2's documented per-area accents; Explore = teal, the default
// brand colour). Kept in sync with the native tab bar in `app-tabs.tsx`.
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const activeColors: Record<string, string> = {
  home: Colors.light.coral,
  explore: Colors.light.teal,
  friends: Colors.light.purple,
  buddy: Colors.light.pink,
  inbox: Colors.light.coral,
};

export default function AppTabs() {
  return (
    <Tabs>
      {/* The tab bar is a fixed BOTTOM strip (own layer, not absolute-over-content),
          so it never overlays the top of the screen underneath it. */}
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton name="home" icon="home-outline" />
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton name="explore" icon="compass-outline" />
          </TabTrigger>
          <TabTrigger name="friends" href="/friends" asChild>
            <TabButton name="friends" icon="people-outline" />
          </TabTrigger>
          <TabTrigger name="buddy" href="/buddy" asChild>
            <TabButton name="buddy" icon="happy-outline" />
          </TabTrigger>
          <TabTrigger name="inbox" href="/inbox" asChild>
            <TabButton name="inbox" icon="mail-outline" hasUnread />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  isFocused,
  icon,
  name,
  hasUnread,
  ...props
}: TabTriggerSlotProps & { icon: IoniconName; name: string; hasUnread?: boolean }) {
  const color = isFocused ? activeColors[name] : Colors.light.textMuted;
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={24} color={color} />
      {hasUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Anchored to the BOTTOM of the viewport (a real bottom nav), not an absolute
  // overlay sitting on top of page content — fixes the web-harness bug where the
  // bar used to clip ~140px off the top of every screen.
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderTopWidth: 1,
    borderTopColor: Colors.light.hairline,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  tabButton: {
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.coral,
  },
});
