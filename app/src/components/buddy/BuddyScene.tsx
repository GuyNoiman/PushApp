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
import { Radius, Spacing } from '@/constants/theme';
import type { BuddyView } from '@/core/AppCore';
import { resolveCosmetic } from '@/core/config/shopItems';
import { useTheme } from '@/hooks/use-theme';

// The Buddy scene's "forest" backdrop — a soft sky-teal top fading into a green
// ground band. Layered flat colours (no gradient dependency) keep the warm,
// on-brand game-world feel per the mockup.
const SCENE_SKY = '#D9EEE9';
const SCENE_GROUND = '#8FCB8F';

export function BuddyScene({ buddy, onOpenShop }: { buddy: BuddyView; onOpenShop?: () => void }) {
  const theme = useTheme();
  const progress = Math.max(0, Math.min(1, buddy.xpIntoLevel / buddy.xpForNextLevel));

  const cosmetic = resolveCosmetic(buddy.equippedCosmetic);
  const tint = cosmetic?.kind === 'tint' ? cosmetic.value : undefined;
  const accessory = cosmetic?.kind === 'accessory' ? cosmetic.value : undefined;

  return (
    <View style={[styles.scene, { backgroundColor: SCENE_SKY }]}>
      {/* Green ground band anchoring the buddy in a little world. */}
      <View style={[styles.ground, { backgroundColor: SCENE_GROUND }]} />

      <View style={styles.topRow}>
        {/* Level meter: a blue level circle joined to a blue XP bar (game XP). */}
        <View style={styles.levelMeter}>
          <View style={[styles.levelCircle, { backgroundColor: theme.blue }]}>
            <ThemedText type="smallBold" style={styles.levelNumber}>
              {buddy.level}
            </ThemedText>
          </View>
          <View style={styles.levelInfo}>
            <View style={[styles.progressTrack, { backgroundColor: theme.blueTint }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.blue, width: `${progress * 100}%` },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.xpText}>
              {buddy.xpIntoLevel} / {buddy.xpForNextLevel} XP
            </ThemedText>
          </View>
        </View>

        <View style={styles.topRight}>
          {/* Coins = gold reward chip. */}
          <View style={[styles.coinPill, { backgroundColor: theme.goldTint }]}>
            <ThemedText type="smallBold" style={{ color: theme.goldStrong }}>
              🪙 {buddy.coins}
            </ThemedText>
          </View>
          {onOpenShop && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the Shop"
              onPress={onOpenShop}
              style={({ pressed }) => [
                styles.shopButton,
                { backgroundColor: theme.gold },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.shopIcon}>🛍️</ThemedText>
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
          {/* Soft ground shadow under the buddy. */}
          <View style={styles.buddyShadow} />
        </View>
        <View style={[styles.namePill, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
            {buddy.name} · {buddy.stageDisplayName}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.four,
    overflow: 'hidden',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '32%',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    transform: [{ scaleX: 1.6 }],
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
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
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
    color: '#ffffff',
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
    borderRadius: Radius.pill,
  },
  shopButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.iconButton + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopIcon: {
    fontSize: 24,
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.7,
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
  buddyShadow: {
    position: 'absolute',
    bottom: -8,
    width: 120,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  namePill: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
});
