/**
 * BuddyScene — presentational only. The Buddy's dedicated "stage": a calm scene
 * with the Buddy centered in it, a floating level meter (level + XP bar) top-left,
 * a Coins pill + Shop button top-right, and the Buddy's name + stage on a pill
 * beneath it. When a Shop cosmetic is equipped it shows here — an accessory worn
 * on the Buddy or a colour tint behind it.
 * No business logic here (Engineering Bible §19); the core computes every value.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { STAGE_FACE } from '@/components/buddy/stageFaces';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { BuddyView } from '@/core/AppCore';
import { resolveCosmetic } from '@/core/config/shopItems';
import { useTheme } from '@/hooks/use-theme';

export function BuddyScene({ buddy, onOpenShop }: { buddy: BuddyView; onOpenShop?: () => void }) {
  const theme = useTheme();
  const progress = Math.max(0, Math.min(1, buddy.xpIntoLevel / buddy.xpForNextLevel));

  const cosmetic = resolveCosmetic(buddy.equippedCosmetic);
  const tint = cosmetic?.kind === 'tint' ? cosmetic.value : undefined;
  const accessory = cosmetic?.kind === 'accessory' ? cosmetic.value : undefined;

  return (
    <ThemedView type="backgroundElement" style={styles.scene}>
      <View style={styles.topRow}>
        {/* Level meter: a level circle joined to the XP bar. */}
        <ThemedView type="backgroundSelected" style={styles.levelMeter}>
          <View style={[styles.levelCircle, { backgroundColor: theme.text }]}>
            <ThemedText type="smallBold" style={[styles.levelNumber, { color: theme.background }]}>
              {buddy.level}
            </ThemedText>
          </View>
          <View style={styles.levelInfo}>
            <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.text, width: `${progress * 100}%` },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.xpText}>
              {buddy.xpIntoLevel} / {buddy.xpForNextLevel} XP
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.topRight}>
          <ThemedView type="backgroundSelected" style={styles.coinPill}>
            <ThemedText type="smallBold">🪙 {buddy.coins}</ThemedText>
          </ThemedView>
          {onOpenShop && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the Shop"
              onPress={onOpenShop}>
              <ThemedView type="backgroundSelected" style={styles.shopPill}>
                <ThemedText type="smallBold">🛍️ Shop</ThemedText>
              </ThemedView>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.buddyStack}>
          {tint && <View style={[styles.tint, { backgroundColor: tint }]} />}
          <ThemedText style={styles.face}>{STAGE_FACE[buddy.stage]}</ThemedText>
          {accessory && (
            <ThemedText style={styles.accessory} accessibilityElementsHidden>
              {accessory}
            </ThemedText>
          )}
        </View>
        <ThemedView type="backgroundSelected" style={styles.namePill}>
          <ThemedText type="smallBold">{buddy.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {buddy.stageDisplayName}
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  levelMeter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingRight: Spacing.three,
    borderRadius: Spacing.five,
  },
  levelCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    lineHeight: 20,
  },
  levelInfo: {
    gap: Spacing.half,
    minWidth: 96,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    lineHeight: 16,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  coinPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  shopPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  buddyStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tint: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.9,
  },
  accessory: {
    position: 'absolute',
    top: -8,
    fontSize: 64,
    lineHeight: 72,
  },
  face: {
    fontSize: 128,
    lineHeight: 148,
  },
  namePill: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
  },
});
