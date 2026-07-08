/**
 * BuddyCard — presentational only. Renders the Buddy the core computes:
 * a placeholder face per stage, stage name, level, an XP progress bar, and coins.
 * No business logic here (Engineering Bible §19).
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { BuddyView } from '@/core/AppCore';
import type { BuddyStage } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';

const STAGE_FACE: Record<BuddyStage, string> = {
  egg: '🥚',
  hatchling: '🐣',
  sprout: '🌱',
  companion: '🐥',
  guardian: '🦅',
};

export function BuddyCard({ buddy }: { buddy: BuddyView }) {
  const theme = useTheme();
  const progress = Math.max(0, Math.min(1, buddy.xpIntoLevel / buddy.xpForNextLevel));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.face}>{STAGE_FACE[buddy.stage]}</ThemedText>
        <View style={styles.identity}>
          <ThemedText type="subtitle" style={styles.name}>
            {buddy.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {buddy.stageDisplayName} · Level {buddy.level}
          </ThemedText>
        </View>
        <View style={styles.coins}>
          <ThemedText type="smallBold">🪙 {buddy.coins}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Coins
          </ThemedText>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.text, width: `${progress * 100}%` },
          ]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {buddy.xpIntoLevel} / {buddy.xpForNextLevel} XP to next level
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  face: {
    fontSize: 52,
    lineHeight: 60,
  },
  identity: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    lineHeight: 34,
  },
  coins: {
    alignItems: 'flex-end',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
});
