/**
 * Buddy — the companion's dedicated home (POC pillar 2). It shows the Buddy in
 * its current stage, its Level + XP + Coins, reacts warmly to each check-in, and
 * celebrates a stage-up with an evolution reveal. Presentational only: it reads
 * the snapshot the core computes and listens to domain events on the bus; no
 * business logic lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyScene } from '@/components/buddy/BuddyScene';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBuddyMoments } from '@/hooks/use-buddy-moments';
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
  const reactionText = useMemo(
    () =>
      reaction
        ? `${pickReactionLine()}  +${reaction.gainedXp} XP · +${reaction.gainedCoins} 🪙`
        : null,
    [reaction],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {!ready || !snapshot ? (
          <View style={styles.loading}>
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          </View>
        ) : (
          <View style={styles.stage}>
            <BuddyScene buddy={snapshot.buddy} onOpenShop={() => router.push('/shop')} />
            {reactionText && (
              <ThemedView type="backgroundSelected" style={styles.reaction}>
                <ThemedText type="smallBold" style={styles.reactionText}>
                  {reactionText}
                </ThemedText>
              </ThemedView>
            )}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  reaction: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  reactionText: {
    textAlign: 'center',
  },
});
