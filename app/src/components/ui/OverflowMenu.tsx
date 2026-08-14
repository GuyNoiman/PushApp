/**
 * OverflowMenu — the shared circular 3-dot button + neutral popover menu (v14 mockup screen-09:
 * "bigger 3-dot, neutral menu"). Extracted from `friends/FriendActionMenu` when the Journey detail
 * screen needed the same control, so there is ONE overflow menu in the app rather than two that
 * drift apart.
 *
 * The button is a plain circled dots glyph (no accent colour); the menu is icon + label, neutral
 * ink — it reads like a standard app menu, not a game surface (Design System: keep work/list
 * surfaces calm). An item may add a second `hint` line where two neighbouring actions must be told
 * apart, and may mark itself `destructive` (danger ink) when it ERASES data. Marking a heavy but
 * legitimate action destructive is deliberately NOT what that flag is for: the menu's own
 * de-emphasis already says "this is weighty", and colouring a legitimate choice red would put
 * judgement on it.
 *
 * Presentational only — it takes callbacks and reports taps; no business logic lives here
 * (Engineering Bible §19). The caller decides which items exist, so the menu never renders a dead
 * or misleading action.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface OverflowMenuItem {
  key: string;
  label: string;
  /** Screen-reader label when the visible label needs more context ("Delete" → "Delete this Journey"). */
  a11yLabel?: string;
  /** An optional second line under the label — what this action actually does. */
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  /** Danger ink — for an action that permanently ERASES data (see the file header). */
  destructive?: boolean;
}

export function OverflowMenu({
  a11yLabel,
  items,
  size = 34,
  width = 190,
}: {
  /** The trigger's accessibility label — the caller owns it, so it names its own surface. */
  a11yLabel: string;
  items: OverflowMenuItem[];
  /** Diameter of the trigger. Standalone triggers pass 44 to meet the tap-target minimum. */
  size?: number;
  /** Width of the popover card. Menus with `hint` lines need more room than a label-only menu. */
  width?: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.dots,
          { width: size, height: size, borderRadius: size / 2 },
          { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menuAnchor}>
            <View
              style={[
                styles.menu,
                { width, backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
              ]}>
              {items.map((item, i) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.a11yLabel ?? item.label}
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
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={item.destructive ? theme.danger : theme.textSecondary}
                  />
                  <View style={styles.itemText}>
                    <ThemedText
                      type="smallBold"
                      style={item.destructive ? { color: theme.danger } : undefined}>
                      {item.label}
                    </ThemedText>
                    {item.hint ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.hint}
                      </ThemedText>
                    ) : null}
                  </View>
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
  itemText: {
    flex: 1,
    gap: 1,
  },
  itemBorder: {
    borderTopWidth: 1,
  },
  itemDisabled: {
    opacity: 0.4,
  },
});
