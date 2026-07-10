/**
 * BuddyInventory — the raised inventory sheet filling the lower ~40% of the Buddy
 * screen (v14 mockup screen-10): 5 category tabs (Character · Clothing · Items ·
 * Location · Furniture, last one locked) above a scrollable grid of item tiles,
 * with a teal "Select" CTA pinned to the bottom that equips the highlighted item.
 *
 * Data mapping (POC — see Engineering Bible §3 configuration-before-code):
 * - "Character" = the catalog's `tint` cosmetics (a colour wash behind the Buddy).
 * - "Clothing"  = the catalog's `accessory` cosmetics (an emoji worn on the Buddy).
 * - "Items" / "Location" / "Furniture" have no real data model yet (POC scope is
 *   Buddy cosmetics only, see POC_and_MVP_Scope §1.5) — Furniture's tab itself is
 *   locked (padlock, "Unlocks at level 20") and Items/Location show clearly
 *   locked placeholder tiles rather than inventing fake owned items.
 *
 * Presentational only — no business logic (Engineering Bible §19); equipping
 * calls straight into `core.equipItem` / `core.unequipItem`.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SHOP_ITEMS, type ShopItem } from '@/core/config/shopItems';
import { useTheme } from '@/hooks/use-theme';

type CategoryId = 'character' | 'clothing' | 'items' | 'location' | 'furniture';

interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  /** Locked categories show a padlock on the tab itself and can't be selected. */
  locked?: boolean;
}

const CATEGORIES: Category[] = [
  { id: 'character', label: 'Character', icon: '🙂' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'items', label: 'Items', icon: '⬡' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'furniture', label: 'Furniture', icon: '🛋️', locked: true },
];

/** Placeholder tiles for categories with no real data model yet — clearly locked, never fake-owned. */
const PLACEHOLDER_LOCKED_COUNT = 4;

export function BuddyInventory({
  ownedCosmetics,
  equippedCosmetic,
  onSelect,
}: {
  ownedCosmetics: string[];
  equippedCosmetic: string | null;
  onSelect: (itemId: string | null) => void;
}) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<CategoryId>('character');
  const [highlighted, setHighlighted] = useState<string | null>(equippedCosmetic);

  const tintItems = useMemo(() => SHOP_ITEMS.filter((i) => i.kind === 'tint'), []);
  const accessoryItems = useMemo(() => SHOP_ITEMS.filter((i) => i.kind === 'accessory'), []);

  const items: ShopItem[] =
    activeTab === 'character' ? tintItems : activeTab === 'clothing' ? accessoryItems : [];
  const showPlaceholders = activeTab === 'items' || activeTab === 'location';

  const selectTab = (cat: Category) => {
    if (cat.locked) return;
    setActiveTab(cat.id);
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.cream }]}>
      {/* Category tabs — icon-only, selected one highlighted as a white pill. */}
      <View style={[styles.tabRow, { backgroundColor: theme.backgroundSelected }]}>
        {CATEGORIES.map((cat) => {
          const active = cat.id === activeTab;
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={cat.locked ? `${cat.label} — locked` : cat.label}
              accessibilityState={{ selected: active, disabled: cat.locked }}
              onPress={() => selectTab(cat)}
              style={[
                styles.tab,
                active && { backgroundColor: theme.backgroundElement },
                cat.locked && styles.tabLocked,
              ]}>
              <ThemedText style={styles.tabIcon}>{cat.icon}</ThemedText>
              {cat.locked && (
                <View style={[styles.lockDot, { backgroundColor: theme.textMuted }]}>
                  <ThemedText style={styles.lockGlyph}>🔒</ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Item grid — real owned cosmetics for Character/Clothing; locked placeholders elsewhere. */}
      <ScrollView
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.gridRow}>
          {items.map((item) => {
            const owned = ownedCosmetics.includes(item.id);
            const selected = highlighted === item.id;
            return (
              <ItemTile
                key={item.id}
                item={item}
                owned={owned}
                selected={selected}
                onPress={() => owned && setHighlighted(item.id)}
              />
            );
          })}
          {showPlaceholders &&
            Array.from({ length: PLACEHOLDER_LOCKED_COUNT }).map((_, i) => (
              <LockedTile key={`${activeTab}-locked-${i}`} />
            ))}
          {activeTab === 'furniture' &&
            Array.from({ length: PLACEHOLDER_LOCKED_COUNT }).map((_, i) => (
              <LockedTile key={`furniture-locked-${i}`} />
            ))}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select this item"
        disabled={!highlighted}
        onPress={() => onSelect(highlighted)}
        style={[
          styles.selectButton,
          { backgroundColor: theme.teal },
          !highlighted && styles.selectDisabled,
        ]}>
        <ThemedText type="smallBold" style={styles.selectText}>
          Select
        </ThemedText>
      </Pressable>
    </View>
  );
}

function ItemTile({
  item,
  owned,
  selected,
  onPress,
}: {
  item: ShopItem;
  owned: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  if (!owned) return <LockedTile />;

  const face = item.kind === 'tint' ? item.value : theme.gold;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.itemTile,
        { backgroundColor: item.kind === 'tint' ? item.value : theme.purple },
        selected && { borderColor: theme.teal, borderWidth: 3 },
      ]}>
      {item.kind === 'accessory' ? (
        <ThemedText style={styles.itemEmoji}>{item.value}</ThemedText>
      ) : (
        <View style={[styles.itemSwatchDot, { backgroundColor: face }]} />
      )}
    </Pressable>
  );
}

function LockedTile() {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Locked slot"
      style={[styles.itemTile, styles.lockedTile, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={[styles.lockGlyphLarge, { color: theme.textMuted }]}>🔒</ThemedText>
    </View>
  );
}

const TILE_SIZE = 56;

const styles = StyleSheet.create({
  panel: {
    borderTopLeftRadius: Radius.card + 8,
    borderTopRightRadius: Radius.card + 8,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLocked: {
    opacity: 0.5,
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  lockDot: {
    position: 'absolute',
    top: 2,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: {
    fontSize: 8,
    lineHeight: 10,
  },
  grid: {
    maxHeight: TILE_SIZE * 2 + Spacing.two * 3,
  },
  gridContent: {
    paddingVertical: Spacing.one,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  itemTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: Radius.iconButton + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  itemSwatchDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  lockedTile: {
    opacity: 0.9,
  },
  lockGlyphLarge: {
    fontSize: 18,
  },
  selectButton: {
    height: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDisabled: {
    opacity: 0.5,
  },
  selectText: {
    color: '#ffffff',
    fontSize: 15,
  },
});
