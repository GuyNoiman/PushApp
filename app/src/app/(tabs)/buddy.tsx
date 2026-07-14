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
      {/* Exclude the bottom edge: the native tab bar already owns the home-indicator
          inset, so insetting here too would leave a dead strip between the inventory
          sheet and the tab bar (same "floating panel" bug the Home tab had). With the
          bottom edge dropped, the column runs full-height and the inventory sits flush
          just above the tab bar. */}
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
                {/* Buddy identity, sitting directly under the level/XP meter: the
                    name reads prominent (heading) with the evolution stage as a
                    smaller sub-label beneath it. */}
                <View style={styles.identity} pointerEvents="none">
                  <ThemedText type="subtitle" themeColor="tealStrong" style={styles.buddyName}>
                    {buddy.name}
                  </ThemedText>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.buddyStage}>
                    {buddy.stageDisplayName}
                  </ThemedText>
                </View>
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
    // ~58% of the stage for the scene, leaving the inventory sheet (flex:1) enough
    // room to show its full grid + the pinned Select button on phone heights.
    flex: 1.4,
  },
  resourceOverlay: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 5,
  },
  identity: {
    // Under the meter, aligned to the level orb on the left.
    marginTop: Spacing.two,
    marginLeft: Spacing.half,
  },
  buddyName: {
    lineHeight: 24,
  },
  buddyStage: {
    marginTop: -1,
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
