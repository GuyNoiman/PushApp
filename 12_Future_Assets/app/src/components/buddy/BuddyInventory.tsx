/**
 * BuddyInventory — the raised inventory sheet filling the lower ~40% of the Buddy
 * screen (v14 mockup screen-10): 5 category tabs (Character · Clothing · Items ·
 * Location · Furniture, last one locked) above a scrollable grid of item tiles,
 * with a teal "Select" CTA pinned to the bottom that equips the highlighted item.
 *
 * Interior visual language (v14 screen-10 + Shop parity): item tiles are glossy
 * 2-tone rounded squares — a saturated base colour with a soft top highlight and
 * an inner shadow for volume, mirroring Shop's `.itemTile` treatment
 * (app/src/app/shop.tsx) so the two surfaces read as one system. Four states are
 * visually distinct: owned-not-equipped (plain glossy tile), equipped (persistent
 * small teal check badge — "what's on the Buddy now"), selected-for-Select (a
 * teal ring, separate from equipped so mid-browse taps don't look like a change
 * that hasn't happened yet), and locked (dim flat tile + padlock).
 *
 * Data mapping (POC — see Engineering Bible §3 configuration-before-code):
 * - "Character" = the catalog's `tint` cosmetics (a colour wash behind the Buddy).
 * - "Clothing"  = the catalog's `accessory` cosmetics (an emoji worn on the Buddy).
 * - "Items" / "Location" / "Furniture" have no real data model yet (POC scope is
 *   Buddy cosmetics only, see POC_and_MVP_Scope §1.5) — Furniture's tab itself is
 *   locked (padlock, "Unlocks at level 20") and Items/Location show a calm
 *   "coming soon" treatment rather than inventing fake owned items.
 *
 * Presentational only — no business logic (Engineering Bible §19); equipping
 * calls straight into `core.equipItem` / `core.unequipItem`.
 */
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { type ShopItem } from '@/core/config/shopItems';
import { useTheme } from '@/hooks/use-theme';

type CategoryId = 'character' | 'clothing' | 'items' | 'location' | 'furniture';

interface Category {
  id: CategoryId;
  icon: string;
  /** Locked categories show a padlock on the tab itself and can't be selected. */
  locked?: boolean;
  /** Level a locked category unlocks at — surfaced in the tap tooltip. */
  unlockLevel?: number;
}

// Structure only; the label is resolved per-render from the `buddy` namespace
// (`inventory.categories.<id>`) so the tabs follow the user's language.
const CATEGORIES: Category[] = [
  { id: 'character', icon: '🙂' },
  { id: 'clothing', icon: '👕' },
  { id: 'items', icon: '⬡' },
  { id: 'location', icon: '📍' },
  { id: 'furniture', icon: '🛋️', locked: true, unlockLevel: 20 },
];

/** The translated label for a category tab. */
function categoryLabel(id: CategoryId, t: TFunction<'buddy'>): string {
  return t(`inventory.categories.${id}`);
}

/** How long the "Unlocks at level N" tooltip stays up after tapping a locked tab. */
const LOCKED_TOOLTIP_MS = 2600;

/** Placeholder tiles for categories with no real data model yet — clearly locked, never fake-owned. */
const PLACEHOLDER_LOCKED_COUNT = 8;

/**
 * Gloss gradients cycled across owned tiles for shelf variety, mirroring the
 * mockup's gold/purple/blue/green mix and Shop's tile treatment — colour here is
 * decorative rotation, not semantic (a cosmetic has no fixed category yet).
 */
const TILE_GRADIENTS = [
  { top: '#F6D97A', bottom: '#E9B23E' }, // gold
  { top: '#B49CF0', bottom: '#8A6FDD' }, // purple
  { top: '#8FC0F2', bottom: '#5C97E4' }, // blue
  { top: '#8FE0C4', bottom: '#3EB48C' }, // green
];

export function BuddyInventory({
  ownedCosmetics,
  equippedCosmetic,
  cosmetics,
  onSelect,
}: {
  ownedCosmetics: string[];
  equippedCosmetic: string | null;
  /** The cosmetic catalog, supplied by the screen via the core facade (§19). */
  cosmetics: ShopItem[];
  onSelect: (itemId: string | null) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('buddy');
  const [activeTab, setActiveTab] = useState<CategoryId>('character');
  const [highlighted, setHighlighted] = useState<string | null>(equippedCosmetic);
  // Which locked tab is currently showing its "Unlocks at level N" tooltip (v8
  // spec / screen-10): a locked tab can't be entered, so tapping it explains why.
  const [lockedHint, setLockedHint] = useState<CategoryId | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const tintItems = useMemo(() => cosmetics.filter((i) => i.kind === 'tint'), [cosmetics]);
  const accessoryItems = useMemo(() => cosmetics.filter((i) => i.kind === 'accessory'), [cosmetics]);

  const items: ShopItem[] =
    activeTab === 'character' ? tintItems : activeTab === 'clothing' ? accessoryItems : [];
  const showPlaceholders = activeTab === 'items' || activeTab === 'location';
  const activeCategory = CATEGORIES.find((c) => c.id === activeTab)!;
  // Pad Character/Clothing out to a full grid row so a couple of owned cosmetics
  // never look like a broken half-row — mirrors the mockup's 2-row, 5-across grid.
  const catalogPadCount =
    activeTab === 'character' || activeTab === 'clothing'
      ? Math.max(0, TILES_PER_ROW * 2 - items.length)
      : 0;

  const selectTab = (cat: Category) => {
    if (cat.locked) {
      // Reveal the tooltip pointing at this tab, then auto-dismiss it.
      setLockedHint(cat.id);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setLockedHint(null), LOCKED_TOOLTIP_MS);
      return;
    }
    setLockedHint(null);
    setActiveTab(cat.id);
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      {/* Grabber handle — signals the whole sheet is one liftable object. */}
      <View style={[styles.grabber, { backgroundColor: theme.hairline }]} />

      {/* Category tabs — icon-only, selected one highlighted as a white pill. The
          wrapper anchors the locked-tab tooltip above the tab row. Furniture (the
          only locked tab today) is rightmost, so the bubble hugs the right edge and
          its caret points down at that tab; a differently-placed future locked tab
          would want its anchor revisited. */}
      <View style={styles.tabArea}>
      {lockedHint && (
        <View pointerEvents="none" style={styles.tooltipRow}>
          <View style={[styles.tooltip, { backgroundColor: theme.text }]}>
            <ThemedText type="small" style={[styles.tooltipText, { color: theme.background }]}>
              {t('inventory.unlocksAtLevel', {
                level: CATEGORIES.find((c) => c.id === lockedHint)?.unlockLevel ?? '—',
              })}
            </ThemedText>
            <View style={[styles.tooltipCaret, { backgroundColor: theme.text }]} />
          </View>
        </View>
      )}
      <View style={[styles.tabRow, { backgroundColor: theme.backgroundSelected }]}>
        {CATEGORIES.map((cat) => {
          const active = cat.id === activeTab;
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="button"
              accessibilityLabel={
                cat.locked
                  ? t('inventory.lockedTabA11y', { label: categoryLabel(cat.id, t) })
                  : categoryLabel(cat.id, t)
              }
              accessibilityState={{ selected: active, disabled: cat.locked }}
              onPress={() => selectTab(cat)}
              style={[
                styles.tab,
                active && [styles.tabActive, { backgroundColor: theme.backgroundElement }],
                cat.locked && styles.tabLocked,
              ]}>
              <ThemedText style={styles.tabIcon}>{cat.icon}</ThemedText>
              {cat.locked && (
                <View style={[styles.lockDot, { backgroundColor: theme.textMuted, borderColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.lockGlyph}>🔒</ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      </View>

      {/* Active-category label so it's always clear what the grid below is showing. */}
      <View style={styles.sectionLabelRow}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          {categoryLabel(activeCategory.id, t)}
        </ThemedText>
        {activeTab === 'furniture' && (
          <ThemedText type="small" themeColor="textMuted" style={styles.sectionHint}>
            {t('inventory.unlocksAtLevel', { level: 20 })}
          </ThemedText>
        )}
      </View>

      {/* Item grid — real owned cosmetics for Character/Clothing; locked placeholders elsewhere. */}
      <View style={styles.gridRow}>
        <ScrollView
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}>
          {items.length === 0 && !showPlaceholders ? (
            <EmptyState label={categoryLabel(activeCategory.id, t)} />
          ) : (
            <View style={styles.tiles}>
              {items.map((item, index) => {
                const owned = ownedCosmetics.includes(item.id);
                const equipped = equippedCosmetic === item.id;
                const selected = highlighted === item.id;
                const gradient = TILE_GRADIENTS[index % TILE_GRADIENTS.length];
                return (
                  <ItemTile
                    key={item.id}
                    item={item}
                    owned={owned}
                    equipped={equipped}
                    selected={selected}
                    gradient={gradient}
                    onPress={() => owned && setHighlighted(item.id)}
                  />
                );
              })}
              {catalogPadCount > 0 &&
                Array.from({ length: catalogPadCount }).map((_, i) => (
                  <LockedTile key={`${activeTab}-pad-${i}`} />
                ))}
              {showPlaceholders &&
                Array.from({ length: PLACEHOLDER_LOCKED_COUNT }).map((_, i) => (
                  <LockedTile key={`${activeTab}-locked-${i}`} />
                ))}
              {activeTab === 'furniture' &&
                Array.from({ length: PLACEHOLDER_LOCKED_COUNT }).map((_, i) => (
                  <LockedTile key={`furniture-locked-${i}`} />
                ))}
            </View>
          )}
        </ScrollView>
        {/* A subtle track+thumb scroll affordance, matching the mockup's right-edge scroller. */}
        <View style={[styles.scrollTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.scrollThumb, { backgroundColor: theme.hairline }]} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('inventory.selectA11y')}
        disabled={!highlighted}
        onPress={() => onSelect(highlighted)}
        style={[
          styles.selectButton,
          { backgroundColor: theme.teal },
          !highlighted && styles.selectDisabled,
        ]}>
        <ThemedText type="smallBold" style={styles.selectText}>
          {t('inventory.select')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function ItemTile({
  item,
  owned,
  equipped,
  selected,
  gradient,
  onPress,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  selected: boolean;
  gradient: { top: string; bottom: string };
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('buddy');
  if (!owned) return <LockedTile />;

  // Character tints show their own colour as the tile face (the tint IS the
  // preview); Clothing accessories use the rotating gloss gradient as a neutral
  // shelf backdrop for the emoji glyph.
  const base = item.kind === 'tint' ? item.value : gradient.bottom;
  const highlightColor = item.kind === 'tint' ? '#ffffff' : gradient.top;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={equipped ? t('inventory.currentlyWornA11y', { name: item.name }) : item.name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.itemTile,
        { backgroundColor: base },
        selected && { borderColor: theme.teal, borderWidth: 3 },
      ]}>
      {/* Soft top highlight — the 2-tone glossy look shared with Shop's item tiles. */}
      <View pointerEvents="none" style={[styles.itemTileHighlight, { backgroundColor: highlightColor }]} />

      {item.kind === 'accessory' ? (
        <ThemedText style={styles.itemEmoji}>{item.value}</ThemedText>
      ) : (
        <View style={[styles.itemSwatchDot, { backgroundColor: base }]} />
      )}

      {/* Equipped badge — persistent, distinct from the selection ring: shows
          what's currently worn on the Buddy regardless of what's highlighted. */}
      {equipped && (
        <View style={[styles.equippedBadge, { backgroundColor: theme.teal, borderColor: theme.backgroundElement }]}>
          <ThemedText style={styles.equippedGlyph}>✓</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function LockedTile() {
  const theme = useTheme();
  const { t } = useTranslation('buddy');
  return (
    <View
      accessibilityLabel={t('inventory.lockedSlotA11y')}
      style={[styles.itemTile, styles.lockedTile, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={[styles.lockGlyphLarge, { color: theme.textMuted }]}>🔒</ThemedText>
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  const theme = useTheme();
  const { t } = useTranslation('buddy');
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyGlyphWrap, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.emptyGlyph}>✨</ThemedText>
      </View>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.emptyTitle}>
        {t('inventory.comingSoon', { label })}
      </ThemedText>
    </View>
  );
}

const TILES_PER_ROW = 5;

const styles = StyleSheet.create({
  panel: {
    // One unified, raised sheet: rounded top, a top hairline + upward shadow that
    // lift it off the scene so the tabs + grid + Select read as a single object.
    // `flex: 1` inside `buddy.tsx`'s column so it takes exactly the space the
    // scene leaves it — the grid (not the whole sheet) is what scrolls, so the
    // Select CTA always stays pinned on screen regardless of item count.
    flex: 1,
    minHeight: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    paddingTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
    shadowColor: '#283C1E',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.half,
  },
  tabArea: {
    // Relative anchor so the tooltip can be positioned above a specific tab; a
    // high zIndex/elevation keeps it above the grid below.
    position: 'relative',
    zIndex: 10,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tooltipRow: {
    // Sits directly above the tab row, hugging its right edge (over the rightmost
    // locked tab). pointerEvents:none on the container keeps taps flowing through.
    position: 'absolute',
    right: 0,
    bottom: '100%',
    marginBottom: Spacing.two,
    alignItems: 'flex-end',
    zIndex: 20,
  },
  tooltip: {
    maxWidth: 180,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    alignItems: 'center',
    shadowColor: 'rgba(40,20,50,0.4)',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  tooltipText: {
    textAlign: 'center',
  },
  tooltipCaret: {
    // Points down at the furniture (rightmost) tab: offset in from the right so it
    // lands roughly over that tab's centre rather than the bubble's corner.
    position: 'absolute',
    bottom: -4,
    right: 26,
    width: 10,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    shadowColor: 'rgba(70,50,25,0.3)',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
    top: -2,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: {
    fontSize: 8,
    lineHeight: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  sectionLabel: {
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHint: {
    fontSize: 11,
  },
  gridRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingVertical: Spacing.one,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  itemTile: {
    // A percentage width (fixed 5-across, like the v14 grid) rather than a fixed
    // px size — keeps exactly TILES_PER_ROW per row at any panel width instead of
    // however many happen to fit, which read wrong (7-across) at wider viewports.
    width: `${100 / TILES_PER_ROW - 3}%`,
    aspectRatio: 1,
    borderRadius: Radius.iconButton + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: 'rgba(40,20,50,0.3)',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  itemTileHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
    opacity: 0.5,
  },
  itemEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  itemSwatchDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  equippedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedGlyph: {
    color: '#ffffff',
    fontFamily: FontFamily.headingBold,
    fontSize: 10,
    lineHeight: 12,
  },
  lockedTile: {
    shadowOpacity: 0,
    elevation: 0,
  },
  lockGlyphLarge: {
    fontSize: 17,
  },
  scrollTrack: {
    width: 4,
    borderRadius: 2,
    marginVertical: Spacing.one,
  },
  scrollThumb: {
    width: 4,
    height: '42%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  emptyGlyphWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyph: {
    fontSize: 20,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  selectButton: {
    height: 46,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(31,124,134,0.5)',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  selectDisabled: {
    opacity: 0.5,
  },
  selectText: {
    color: '#ffffff',
    fontSize: 15,
  },
});
