/**
 * InboxTabs — the category tab row above the Inbox list: Friends · Allies ·
 * Groups · Requested (founder feedback 2026-08-07, restoring the category tabs
 * and adding Requested for incoming connection requests). Calm text tabs with an
 * active turquoise underline (Design System §2 accent) — the mature styling kept
 * from the previous round. "Requested" carries a muted count when it holds
 * pending requests; a tab shows a danger dot when it has an unread item
 * underneath (Inbox_Screen.md).
 *
 * Presentational only — it takes the tabs + selection and reports taps (§19).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InboxTabKey = 'friends' | 'allies' | 'groups' | 'requested';

export interface InboxTab {
  key: InboxTabKey;
  label: string;
  /** Optional count shown after the label (e.g. pending requests). */
  count?: number;
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
    <View style={[styles.row, { borderBottomColor: theme.hairline }]}>
      {tabs.map((tab) => {
        const on = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <View style={styles.labelRow}>
              <ThemedText
                type="smallBold"
                themeColor={on ? 'text' : 'textSecondary'}
                style={styles.label}>
                {tab.label}
              </ThemedText>
              {tab.count ? (
                <ThemedText type="smallBold" themeColor="textMuted" style={styles.count}>
                  {tab.count}
                </ThemedText>
              ) : tab.unread && !on ? (
                <View style={[styles.dot, { backgroundColor: theme.danger }]} />
              ) : null}
            </View>
            <View style={[styles.underline, { backgroundColor: on ? theme.tint : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
  },
  count: {
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  underline: {
    height: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
  },
});
