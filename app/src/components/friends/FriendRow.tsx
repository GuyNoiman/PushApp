/**
 * FriendRow — one row in the Friends list (v14 mockup screen-09): a round tinted
 * avatar (smiley glyph), the friend's name + optional level / status line, and a
 * trailing action — either the coral "Cheer" pill (for "Needs your cheer" rows)
 * or the circular 3-dot menu (for regular "Your friends" rows). Rows are CARDS
 * (white, rounded, hairline border) per the mockup, distinct from Inbox's plain
 * rows — Friends and Inbox intentionally read differently (list of people to
 * support vs. a message list).
 *
 * Presentational only — data + callbacks in, no social/business logic (§19).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { FriendActionMenu, type FriendMenuItem } from '@/components/friends/FriendActionMenu';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FriendRow({
  name,
  subtitle,
  tint,
  tintInk,
  needsCheer,
  onCheer,
  menuItems,
}: {
  name: string;
  /** "Lv N" or a status line like "Behind on her run". Optional. */
  subtitle?: string;
  tint: string;
  tintInk: string;
  /** True for a "Needs your cheer" row — shows the coral Cheer pill instead of the 3-dot menu. */
  needsCheer?: boolean;
  onCheer?: () => void;
  menuItems: FriendMenuItem[];
}) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={[styles.avatar, { backgroundColor: tint }]}>
        <Ionicons name="happy-outline" size={20} color={tintInk} />
      </View>

      <View style={styles.main}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {name}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>

      {needsCheer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cheer ${name}`}
          onPress={onCheer}
          style={({ pressed }) => [styles.cheerPill, { backgroundColor: theme.coral }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={[styles.cheerLabel, { color: theme.text }]}>
            Cheer
          </ThemedText>
        </Pressable>
      ) : (
        <FriendActionMenu friendName={name} items={menuItems} />
      )}
    </View>
  );
}

const AVATAR = 44;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    shadowColor: '#46321A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    gap: 1,
  },
  cheerPill: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheerLabel: {
    fontFamily: FontFamily.headingBold,
  },
  pressed: {
    opacity: 0.7,
  },
});
