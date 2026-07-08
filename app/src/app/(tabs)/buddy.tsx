/**
 * Buddy — the companion's dedicated home (POC pillar 2). It shows the Buddy in
 * its current stage, its Level + XP + Coins, reacts warmly to each check-in, and
 * celebrates a stage-up with an evolution reveal. Presentational only: it reads
 * the snapshot the core computes and listens to domain events on the bus; no
 * business logic lives here (Engineering Bible §19).
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyScene } from '@/components/buddy/BuddyScene';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { BuddyStage } from '@/core/types/domain';
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

interface Reveal {
  buddyName: string;
  toStage: BuddyStage;
  toStageDisplayName: string;
}

export default function BuddyScreen() {
  const { core, snapshot, ready } = useApp();
  const [reaction, setReaction] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for one-off Buddy moments: a warm reaction on every check-in, and a
  // full evolution reveal whenever the stage changes.
  useEffect(() => {
    const onReacted = (e: { gainedXp: number; gainedCoins: number }) => {
      setReaction(`${pickReactionLine()}  +${e.gainedXp} XP · +${e.gainedCoins} 🪙`);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setReaction(null), 2600);
    };
    const onEvolved = (e: { buddy: { name: string }; toStage: BuddyStage }) => {
      // The reveal takes over — clear any pending reaction banner.
      if (timer.current) clearTimeout(timer.current);
      setReaction(null);
      setReveal({
        buddyName: e.buddy.name,
        toStage: e.toStage,
        toStageDisplayName: core.stageDisplayName(e.toStage),
      });
    };
    core.bus.on('BuddyReacted', onReacted);
    core.bus.on('BuddyEvolved', onEvolved);
    return () => {
      core.bus.off('BuddyReacted', onReacted);
      core.bus.off('BuddyEvolved', onEvolved);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [core]);

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
            <BuddyScene buddy={snapshot.buddy} />
            {reaction && (
              <ThemedView type="backgroundSelected" style={styles.reaction}>
                <ThemedText type="smallBold" style={styles.reactionText}>
                  {reaction}
                </ThemedText>
              </ThemedView>
            )}
          </View>
        )}
      </SafeAreaView>

      <EvolveReveal
        visible={reveal !== null}
        buddyName={reveal?.buddyName ?? ''}
        toStage={reveal?.toStage ?? 'egg'}
        toStageDisplayName={reveal?.toStageDisplayName ?? ''}
        onCollect={() => setReveal(null)}
      />
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
