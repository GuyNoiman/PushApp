/**
 * Shop — where the user spends earned Coins on Buddy cosmetics (POC pillar 3,
 * the POC subset of 04_Product/UX/Shop_Screen.md). Opened from the Shop button on
 * the Buddy screen and presented as a modal over the tabs.
 *
 * POC subset: Coins are the only currency (no gems), a small cosmetic catalog,
 * Buy + Equip/Unequip. Deferred to later stages: Featured pack, real money, daily
 * shop refresh, category sub-tabs, purchase caps.
 *
 * Presentational only — it reads the snapshot and calls the AppCore facade to buy
 * and equip. No Coin/purchase logic lives here (Engineering Bible §19); the
 * ShopEngine owns it. Rendered in PushApp's warm palette (cream / teal accents).
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { ShopItem } from '@/core/config/shopItems';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Shop is a reward surface: prices in GOLD, the Buy CTA in CORAL, equipped state
// in TEAL (Design System §2).
const TEAL = Colors.light.teal;
const GOLD_TINT = Colors.light.goldTint;
const GOLD_STRONG = Colors.light.goldStrong;
const CORAL = Colors.light.coral;
const INK = Colors.light.text;

export default function ShopScreen() {
  const { core, snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();

  const items = core.getShopItems();
  const buddy = snapshot?.buddy;

  // Dismiss safely — router.back() is a no-op with no history (web reload /
  // deep-link straight onto this route), which would otherwise trap the user.
  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle" style={styles.title}>
              Shop
            </ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Close
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.headerRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Dress up your Buddy with what you&apos;ve earned.
            </ThemedText>
            <View style={[styles.coinPill, { backgroundColor: GOLD_TINT }]}>
              <ThemedText type="smallBold" style={styles.coinText}>
                🪙 {buddy?.coins ?? 0}
              </ThemedText>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {items.map((item) => {
              const owned = buddy?.ownedCosmetics.includes(item.id) ?? false;
              const equipped = buddy?.equippedCosmetic === item.id;
              const affordable = (buddy?.coins ?? 0) >= item.price;

              return (
                <ThemedView key={item.id} type="backgroundElement" style={styles.card}>
                  <CosmeticPreview item={item} />
                  <ThemedText type="smallBold" style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </ThemedText>

                  {!owned ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Buy ${item.name} for ${item.price} Coins`}
                      disabled={!affordable}
                      onPress={() => core.purchaseItem(item.id)}
                      style={[
                        styles.action,
                        { backgroundColor: affordable ? CORAL : GOLD_TINT },
                        !affordable && styles.disabled,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: affordable ? INK : GOLD_STRONG }}>
                        🪙 {item.price}
                      </ThemedText>
                    </Pressable>
                  ) : equipped ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unequip ${item.name}`}
                      onPress={() => core.unequipItem()}
                      style={[styles.action, styles.equipped, { borderColor: TEAL }]}>
                      <ThemedText type="smallBold" style={{ color: TEAL }}>
                        ✓ Equipped
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Equip ${item.name}`}
                      onPress={() => core.equipItem(item.id)}
                      style={[styles.action, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="smallBold">Equip</ThemedText>
                    </Pressable>
                  )}
                </ThemedView>
              );
            })}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
            Earn more Coins by checking in on your Steps and completing Journeys.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Presentational preview of a cosmetic: the emoji for an accessory, a swatch for a tint. */
function CosmeticPreview({ item }: { item: ShopItem }) {
  if (item.kind === 'tint') {
    return (
      <View style={styles.preview}>
        <View style={[styles.swatch, { backgroundColor: item.value }]} />
      </View>
    );
  }
  return (
    <View style={styles.preview}>
      <ThemedText style={styles.previewEmoji}>{item.value}</ThemedText>
    </View>
  );
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  title: {
    lineHeight: 40,
  },
  coinPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  coinText: {
    color: GOLD_STRONG,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    width: 150,
    flexGrow: 1,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.light.hairline,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  preview: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 52,
    lineHeight: 60,
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  itemName: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipped: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  footnote: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
