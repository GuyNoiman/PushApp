import { Ionicons } from '@expo/vector-icons';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { useMemo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The five mature nav tabs (mature redesign 2026-08-07, `mature_proposal.html`):
// Home · Journeys · Circle · Tools · Settings — a calm icon+label bar. One accent
// does the work: the active tab is turquoise (`theme.teal`), inactive tabs are
// muted neutral (`theme.textMuted`) — no per-tab rainbow, no active-pill
// background. INBOX LEFT THE BAR on 2026-08-20 (founder's option 1): it is reached
// from the mail button in Home's status strip, and Tools took the slot. Coach,
// Explore and Buddy stay archived out of the bar (routes still exist).
//
// KEPT IN SYNC BY HAND with the native bar in `app-tabs.tsx`, and that is a trap
// worth naming: this file is the `.web` variant, so a change made only to the
// other one is invisible on native and vice versa. Any tab added, removed or
// renamed has to be done twice.
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function AppTabs() {
  return (
    <Tabs>
      {/* The tab bar is a fixed BOTTOM strip (own layer, not absolute-over-content),
          so it never overlays the top of the screen underneath it. */}
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton label="Home" icon="home-outline" iconActive="home" />
          </TabTrigger>
          <TabTrigger name="journeys" href="/journeys" asChild>
            <TabButton label="Journeys" icon="git-branch-outline" iconActive="git-branch" />
          </TabTrigger>
          {/* The Support-Circle surface is labelled "Circle" in the mature nav. */}
          <TabTrigger name="friends" href="/friends" asChild>
            <TabButton label="Circle" icon="people-outline" iconActive="people" />
          </TabTrigger>
          <TabTrigger name="tools" href="/tools" asChild>
            <TabButton label="Tools" icon="sparkles-outline" iconActive="sparkles" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton label="Settings" icon="settings-outline" iconActive="settings" />
          </TabTrigger>
          {/* ARCHIVED (2026-08-07, mature redesign): Coach, Explore and Buddy stay
              removed from the nav — their routes still exist but are no longer
              tabbable. See 04_Product/UX/Archived_Screens.md. */}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  isFocused,
  icon,
  iconActive,
  label,
  ...props
}: TabTriggerSlotProps & { icon: IoniconName; iconActive: IoniconName; label: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // One accent for the active tab; muted neutral for the rest (Design System —
  // colour is meaning, used sparingly: teal = active/progress).
  const color = isFocused ? theme.teal : theme.textMuted;
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Ionicons name={isFocused ? iconActive : icon} size={22} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View {...props} style={styles.tabListContainer}>
      {props.children}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  // Anchored to the BOTTOM of the viewport (a real bottom nav), not an absolute
  // overlay sitting on top of page content.
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: c.backgroundElement,
    borderTopWidth: 1,
    borderTopColor: c.hairline,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
