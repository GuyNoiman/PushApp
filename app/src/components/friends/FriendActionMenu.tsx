/**
 * FriendActionMenu — the circular 3-dot button + neutral popover menu on a friend
 * row (v14 mockup screen-09: "Friends — bigger 3-dot, neutral menu"). The button
 * is a plain circled dots glyph (no accent colour); the menu is icon + label,
 * neutral ink, no per-item colour — reads like a standard app menu, not a game
 * surface (Design System: keep work/list surfaces calm).
 *
 * Presentational only — it takes callbacks and reports taps; no social/business
 * logic lives here (Engineering Bible §19). "Gift" and "Message" have no gateway
 * action yet (SocialGateway has no gift/DM methods), so those items are inert
 * placeholders rather than invented calls — see Friends_Screen.md.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FriendMenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

export function FriendActionMenu({ friendName, items }: { friendName: string; items: FriendMenuItem[] }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${friendName}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.dots,
          { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menuAnchor}>
            <View style={[styles.menu, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              {items.map((item, i) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  disabled={item.disabled}
                  onPress={() => {
                    setOpen(false);
                    item.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    i > 0 && [styles.itemBorder, { borderTopColor: theme.hairline }],
                    item.disabled && styles.itemDisabled,
                    pressed && !item.disabled && styles.pressed,
                  ]}>
                  <Ionicons name={item.icon} size={16} color={theme.textSecondary} />
                  <ThemedText type="smallBold">{item.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
  },
  // Centers the menu card on screen — simplest reliable anchoring across
  // platforms without measuring the trigger button's layout.
  menuAnchor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  menu: {
    width: 190,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.one,
    shadowColor: '#32200A',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius.chip + 2,
  },
  itemBorder: {
    borderTopWidth: 1,
  },
  itemDisabled: {
    opacity: 0.4,
  },
});
