/**
 * Buddy — the companion's dedicated home (POC pillar 2). It shows the Buddy in
 * its current stage, its Level + XP + Coins (shared `ResourceBar`), reacts warmly
 * to each check-in, celebrates a stage-up with an evolution reveal, and lets the
 * user browse + equip cosmetics from an inventory panel. Presentational only: it
 * reads the snapshot the core computes and listens to domain events on the bus;
 * no business logic lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyInventory } from '@/components/buddy/BuddyInventory';
import { BuddyScene } from '@/components/buddy/BuddyScene';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { ResourceBar } from '@/components/ResourceBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatReactionReward, useBuddyMoments } from '@/hooks/use-buddy-moments';
import { useApp } from '@/state/AppProvider';

/** Warm, non-childish lines the Buddy can respond to a check-in with. */
const REACTION_LINES = [
  'That counts. Well done.',
  'You showed up — that is what matters.',
  'Another Step forward. I felt that.',
  'Steady progress. Keep going.',
  'Proud of you for that one.',
];

function pickReactionLine(): string {
  return REACTION_LINES[Math.floor(Math.random() * REACTION_LINES.length)];
}

export default function BuddyScreen() {
  const { core, snapshot, ready } = useApp();
  const router = useRouter();
  const { reaction, reveal, dismissReveal } = useBuddyMoments(core);

  // Pair the warm line with the reward once per reaction, so it stays stable
  // across re-renders instead of re-rolling on every frame.
  const reactionText = useMemo(() => {
    if (!reaction) return null;
    const reward = formatReactionReward(reaction);
    return reward ? `${pickReactionLine()}  ${reward}` : null;
  }, [reaction]);

  const buddy = snapshot?.buddy;

  return (
    <ThemedView style={styles.container}>
      {/* The tab bar already reserves the bottom safe-area inset, so excluding the
          bottom edge keeps the inventory sheet flush to the tab bar rather than
          floating above a safe-area gap. */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {!ready || !buddy ? (
          <View style={styles.loading}>
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          </View>
        ) : (
          <View style={styles.stage}>
            {/* Full-bleed scene: the sky/ground fills edge-to-edge and up behind the
                floating ResourceBar, exactly like the mockup — no side margins. */}
            <View style={styles.sceneWrap}>
              <BuddyScene
                buddy={buddy}
                cosmetic={core.resolveCosmetic(buddy.equippedCosmetic)}
                onOpenShop={() => router.push('/shop')}
                onCustomize={() => {
                  // TODO: customize flow — no dedicated route yet; the inventory
                  // panel below already covers browsing + equipping cosmetics.
                }}
              />
              <View style={styles.resourceOverlay} pointerEvents="box-none">
                <ResourceBar
                  level={buddy.level}
                  xpInto={buddy.xpIntoLevel}
                  xpForNext={buddy.xpForNextLevel}
                  coins={buddy.coins}
                  showGrace={false}
                  onAddCoins={() => router.push('/shop')}
                />
              </View>
              {reactionText && (
                <ThemedView type="backgroundSelected" style={styles.reaction}>
                  <ThemedText type="smallBold" style={styles.reactionText}>
                    {reactionText}
                  </ThemedText>
                </ThemedView>
              )}
            </View>

            <BuddyInventory
              ownedCosmetics={buddy.ownedCosmetics}
              equippedCosmetic={buddy.equippedCosmetic}
              cosmetics={core.getCosmetics()}
              onSelect={(itemId) => {
                if (itemId) {
                  core.equipItem(itemId);
                } else {
                  core.unequipItem();
                }
              }}
            />
          </View>
        )}
      </SafeAreaView>

      {reveal && (
        <EvolveReveal
          visible
          buddyName={reveal.buddyName}
          toStage={reveal.toStage}
          toStageDisplayName={reveal.toStageDisplayName}
          onCollect={dismissReveal}
        />
      )}
    </ThemedView>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
  },
  sceneWrap: {
    // ~63% of the stage for the scene (v14 mockup screen-10: the inventory sheet
    // top sits at ~37% of the stage), leaving the inventory sheet (flex:1) enough
    // room to show its full grid + the pinned Select button on phone heights. The
    // grid scrolls, so a slightly shorter sheet never hides the Select CTA.
    flex: 1.7,
  },
  resourceOverlay: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 5,
  },
  reaction: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  reactionText: {
    textAlign: 'center',
  },
});
