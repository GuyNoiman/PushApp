/**
 * InboxTabs — the Friends · Allies · Groups sub-tabs above the Inbox list (v14
 * mockup screen-15). Friends is the default. The selected tab is a soft
 * purpleTint pill with purpleStrong text (social accent, Design System §2/§6 —
 * same "active chip" pattern as Achievements' filter row); the rest are calm
 * neutral pills. A danger dot rides a tab when it holds an unread item
 * underneath (Inbox_Screen.md).
 *
 * Presentational only — it takes the tabs + selection and reports taps (§19).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InboxTabKey = 'friends' | 'allies' | 'groups';

export interface InboxTab {
  key: InboxTabKey;
  label: string;
  /** Danger dot on the tab when it has an unread item underneath. */
  unread?: boolean;
}

export function InboxTabs({
  tabs,
  selected,
  onSelect,
}: {
  tabs: InboxTab[];
  selected: InboxTabKey;
  onSelect: (key: InboxTabKey) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const on = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: on ? theme.purpleTint : theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={[styles.label, { color: on ? theme.purpleStrong : theme.textSecondary }]}>
              {tab.label}
            </ThemedText>
            {tab.unread && !on && <View style={[styles.dot, { backgroundColor: theme.danger }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
