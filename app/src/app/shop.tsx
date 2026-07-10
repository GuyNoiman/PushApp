/**
 * Shop — where the user spends earned Coins on Buddy cosmetics (POC pillar 3,
 * the POC subset of 04_Product/UX/Shop_Screen.md). Opened from the Shop button on
 * the Buddy screen and presented as a modal over the tabs.
 *
 * POC subset: Coins are the only currency (no gems), a small cosmetic catalog,
 * Buy + Equip/Unequip. Visually this follows the v14 mockup (screen-11): a
 * structured header (back chevron + title + coin pill), scrollable category
 * sub-tabs, a "Cosmetics" section header, and a glossy 3-up grid of item cards
 * (icon tile, name, price chip, owned/equipped state). The mockup's Featured
 * pack (real-money, value badge), Daily shop refresh timer, discount badges and
 * "Purchases left" caps have no data model yet in the POC and are deferred —
 * the Featured/Coins/Offers tabs are shown (for the sub-tab rhythm) but only
 * Cosmetics is wired to real data; the others show a gentle "coming soon" note
 * rather than fake content.
 *
 * Presentational only — it reads the snapshot and calls the AppCore facade to buy
 * and equip. No Coin/purchase logic lives here (Engineering Bible §19); the
 * ShopEngine owns it. Rendered in PushApp's warm palette (cream / teal accents).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { ShopItem } from '@/core/config/shopItems';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Shop is a reward surface: prices in GOLD, the Buy CTA in CORAL, equipped state
// in TEAL, icon tiles cycle through the reward palette for variety (Design
// System §2 — colour by meaning, glossy game-juice concentrated here).
const TEAL = Colors.light.teal;
const TEAL_TINT = Colors.light.tealTint;
const GOLD = Colors.light.gold;
const GOLD_TINT = Colors.light.goldTint;
const GOLD_STRONG = Colors.light.goldStrong;
const CORAL = Colors.light.coral;
const INK = Colors.light.text;

type SubTab = 'featured' | 'cosmetics' | 'coins' | 'offers';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'cosmetics', label: 'Cosmetics' },
  { id: 'coins', label: 'Coins' },
  { id: 'offers', label: 'Offers' },
];

// Item icon tiles cycle through these gloss gradients purely for shelf variety
// (mirrors the mockup's purple/blue/green/gold tile mix) — colour here is
// decorative rotation, not semantic, since a cosmetic has no fixed category yet.
const TILE_GRADIENTS = [
  { top: '#B49CF0', bottom: '#8A6FDD' }, // purple
  { top: '#8FC0F2', bottom: '#5C97E4' }, // blue
  { top: '#8FE0C4', bottom: '#3EB48C' }, // green
  { top: '#F6D97A', bottom: '#E9B23E' }, // gold
];

export default function ShopScreen() {
  const { core, snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<SubTab>('cosmetics');

  const items = core.getShopItems();
  const buddy = snapshot?.buddy;
  const coins = buddy?.coins ?? 0;

  // Dismiss safely — router.back() is a no-op with no history (web reload /
  // deep-link straight onto this route), which would otherwise trap the user.
  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={dismiss}
            hitSlop={8}
            style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.backGlyph}>‹</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            Shop
          </ThemedText>
          <View style={[styles.coinPill, { backgroundColor: GOLD_TINT, borderColor: GOLD }]}>
            <View style={[styles.coinStar, { backgroundColor: GOLD }]}>
              <ThemedText style={styles.coinStarGlyph}>★</ThemedText>
            </View>
            <ThemedText style={[styles.coinCount, { color: GOLD_STRONG }]}>{coins}</ThemedText>
            <View style={styles.coinPlus}>
              <ThemedText style={[styles.coinPlusGlyph, { color: GOLD_STRONG }]}>+</ThemedText>
            </View>
          </View>
        </View>

        {/* Category sub-tabs (Shop_Screen.md §D) — scrollable, Cosmetics selected by default. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          style={styles.tabScroll}>
          {SUB_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  active
                    ? { backgroundColor: GOLD_TINT }
                    : { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={[styles.tabText, active && { color: GOLD_STRONG }]}
                  themeColor={active ? undefined : 'textSecondary'}>
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'cosmetics' ? (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                Cosmetics
              </ThemedText>

              <View style={styles.grid}>
                {items.map((item, index) => {
                  const owned = buddy?.ownedCosmetics.includes(item.id) ?? false;
                  const equipped = buddy?.equippedCosmetic === item.id;
                  const affordable = coins >= item.price;
                  const gradient = TILE_GRADIENTS[index % TILE_GRADIENTS.length];

                  return (
                    <ShopCard
                      key={item.id}
                      item={item}
                      owned={owned}
                      equipped={equipped}
                      affordable={affordable}
                      gradient={gradient}
                      onBuy={() => core.purchaseItem(item.id)}
                      onEquip={() => core.equipItem(item.id)}
                      onUnequip={() => core.unequipItem()}
                    />
                  );
                })}
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
                Earn more Coins by checking in on your Steps and completing Journeys.
              </ThemedText>
            </>
          ) : (
            <View style={styles.comingSoon}>
              <ThemedText style={styles.comingSoonGlyph}>✨</ThemedText>
              <ThemedText type="smallBold" style={styles.comingSoonTitle}>
                {activeTab === 'featured'
                  ? 'Featured packs are coming soon'
                  : activeTab === 'coins'
                    ? 'Coin packs are coming soon'
                    : 'Offers are coming soon'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.comingSoonBody}>
                For now, spend Coins you&apos;ve earned on Cosmetics for your Buddy.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** One item card in the Cosmetics grid: icon tile, name, price/owned/equipped state. */
function ShopCard({
  item,
  owned,
  equipped,
  affordable,
  gradient,
  onBuy,
  onEquip,
  onUnequip,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  gradient: { top: string; bottom: string };
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  return (
    <View style={styles.card}>
      {equipped && (
        <View style={[styles.cardBadge, { backgroundColor: TEAL }]}>
          <ThemedText style={styles.cardBadgeText}>Equipped</ThemedText>
        </View>
      )}
      <ThemedText type="smallBold" style={styles.itemName} numberOfLines={2}>
        {item.name}
      </ThemedText>

      <View style={[styles.itemTile, { backgroundColor: gradient.bottom }]}>
        <View style={[styles.itemTileHighlight, { backgroundColor: gradient.top }]} />
        <CosmeticGlyph item={item} />
      </View>

      {!owned ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buy ${item.name} for ${item.price} Coins`}
          disabled={!affordable}
          onPress={onBuy}
          style={[styles.priceChip, { backgroundColor: GOLD_TINT }, !affordable && styles.disabled]}>
          <View style={[styles.coinStar, styles.coinStarSmall, { backgroundColor: GOLD }]}>
            <ThemedText style={styles.coinStarGlyphSmall}>★</ThemedText>
          </View>
          <ThemedText type="smallBold" style={{ color: GOLD_STRONG }}>
            {item.price}
          </ThemedText>
        </Pressable>
      ) : equipped ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Unequip ${item.name}`}
          onPress={onUnequip}
          style={[styles.actionButton, styles.equippedButton, { borderColor: TEAL }]}>
          <ThemedText type="smallBold" style={{ color: TEAL }}>
            ✓ Equipped
          </ThemedText>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Equip ${item.name}`}
          onPress={onEquip}
          style={[styles.actionButton, { backgroundColor: CORAL }]}>
          <ThemedText type="smallBold" style={styles.equipButtonText}>
            Equip
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

/** Presentational glyph for a cosmetic: the emoji for an accessory, a swatch dot for a tint. */
function CosmeticGlyph({ item }: { item: ShopItem }) {
  if (item.kind === 'tint') {
    return <View style={[styles.swatch, { backgroundColor: item.value }]} />;
  }
  return <ThemedText style={styles.itemEmoji}>{item.value}</ThemedText>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontFamily: FontFamily.headingBold,
    fontSize: 20,
    lineHeight: 22,
    color: INK,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingLeft: 3,
    paddingRight: 3,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    shadowColor: '#966400',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coinStar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinStarGlyph: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 14,
  },
  coinCount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
  },
  coinPlus: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinPlusGlyph: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    lineHeight: 15,
  },

  // ── Category sub-tabs ─────────────────────────────────────────────────
  tabScroll: {
    flexGrow: 0,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  tab: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  tabText: {
    fontSize: 13,
  },

  // ── Content ───────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  sectionLabel: {
    color: '#9A7B4A',
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },

  // ── Grid ──────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: 116,
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.card - 3,
    borderWidth: 1,
    borderColor: Colors.light.hairline,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
    alignItems: 'center',
    shadowColor: 'rgba(70,50,25,0.3)',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardBadge: {
    position: 'absolute',
    top: -6,
    left: -4,
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    zIndex: 1,
  },
  cardBadgeText: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 9,
    lineHeight: 11,
  },
  itemName: {
    textAlign: 'center',
    fontSize: 12.5,
  },
  itemTile: {
    width: 60,
    height: 60,
    borderRadius: Radius.iconButton + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: Spacing.one,
  },
  itemTileHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
    opacity: 0.55,
  },
  itemEmoji: {
    fontSize: 30,
    lineHeight: 34,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },

  // ── Price chip / action buttons ───────────────────────────────────────
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  coinStarSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  coinStarGlyphSmall: {
    color: '#fff',
    fontSize: 9,
    lineHeight: 11,
  },
  actionButton: {
    alignSelf: 'stretch',
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipButtonText: {
    color: '#fff',
  },
  equippedButton: {
    backgroundColor: TEAL_TINT,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  footnote: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },

  // ── Coming soon (Featured / Coins / Offers — no data model yet) ───────
  comingSoon: {
    alignItems: 'center',
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  comingSoonGlyph: {
    fontSize: 36,
    marginBottom: Spacing.two,
  },
  comingSoonTitle: {
    textAlign: 'center',
  },
  comingSoonBody: {
    textAlign: 'center',
  },
});
