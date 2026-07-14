/**
 * BuddyScene — presentational only. The Buddy's dedicated "stage": a calm forest
 * scene with the Buddy centered in it and two glossy side-buttons (Customize /
 * Shop) floating on the scene's right edge. The Buddy's name + stage read at the
 * top of the screen, under the level/XP meter (see buddy.tsx), not on this scene.
 * When a Shop cosmetic is equipped it shows here — an accessory worn
 * on the Buddy or a colour tint behind it. The shared `ResourceBar` (level/XP/
 * coins) lives ABOVE this scene in `buddy.tsx`, not inside it, so Buddy and Home
 * read as one visual language (Design System: reward surfaces get the game-juice).
 * No business logic here (Engineering Bible §19); the core computes every value.
 */
import { StyleSheet, View } from 'react-native';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { GlossyTile } from '@/components/GlossyTile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BuddyView } from '@/core/AppCore';
import { type ShopItem } from '@/core/config/shopItems';

// The Buddy scene's "forest" backdrop — a soft sky-teal top fading into a green
// ground band. Layered flat colours (no gradient dependency) keep the warm,
// on-brand game-world feel per the mockup.
const SCENE_SKY = '#D9EEE9';
const SCENE_GROUND = '#8FCB8F';

export function BuddyScene({
  buddy,
  cosmetic,
  onOpenShop,
  onCustomize,
}: {
  buddy: BuddyView;
  /** The equipped cosmetic, resolved by the screen via the core facade (§19). */
  cosmetic?: ShopItem;
  onOpenShop?: () => void;
  onCustomize?: () => void;
}) {
  const tint = cosmetic?.kind === 'tint' ? cosmetic.value : undefined;
  const accessory = cosmetic?.kind === 'accessory' ? cosmetic.value : undefined;

  return (
    <View style={[styles.scene, { backgroundColor: SCENE_SKY }]}>
      {/* Green ground band anchoring the buddy in a little world. */}
      <View style={[styles.ground, { backgroundColor: SCENE_GROUND }]} />

      {/* Customize (purple, sparkle) + Shop (gold, bag) — stacked on the right edge. */}
      <View style={styles.sideButtons}>
        <GlossyTile color="purple" accessibilityLabel="Customize your Buddy" onPress={onCustomize}>
          <ThemedText style={styles.tileIcon}>✨</ThemedText>
        </GlossyTile>
        <GlossyTile color="gold" accessibilityLabel="Open the Shop" onPress={onOpenShop}>
          <ThemedText style={styles.tileIcon}>🛍️</ThemedText>
        </GlossyTile>
      </View>

      <View style={styles.center}>
        <View style={styles.buddyStack}>
          {tint && <View style={[styles.tint, { backgroundColor: tint }]} />}
          {/* Glossy 3D-look Buddy (its own soft ground shadow is baked in). */}
          <BuddyAvatar stage={buddy.stage} size={200} />
          {accessory && (
            <ThemedText style={styles.accessory} accessibilityElementsHidden>
              {accessory}
            </ThemedText>
          )}
        </View>
        {/* Name + stage no longer sit under the Buddy — they now read directly
            below the level/XP meter at the top of the screen (see buddy.tsx). */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    // Full-bleed: the scene fills the screen edge-to-edge (no rounded corners /
    // side margins) and runs up behind the floating ResourceBar, per the mockup.
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
  sideButtons: {
    // Sit below the floating ResourceBar (which overlays the top of the scene)
    // so the Customize/Shop tiles never collide with the level/coins strip.
    position: 'absolute',
    top: 64,
    right: Spacing.three,
    gap: Spacing.two,
    zIndex: 3,
  },
  tileIcon: {
    fontSize: 22,
    lineHeight: 26,
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
});
