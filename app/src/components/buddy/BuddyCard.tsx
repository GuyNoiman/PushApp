/**
 * BuddyCard — presentational only. Renders the Buddy the core computes:
 * a placeholder face per stage, stage name, level, an XP progress bar, and coins.
 * No business logic here (Engineering Bible §19).
 */
import { StyleSheet, View } from 'react-native';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { BuddyView } from '@/core/AppCore';
import { useTheme } from '@/hooks/use-theme';

export function BuddyCard({ buddy }: { buddy: BuddyView }) {
  const theme = useTheme();
  const progress = Math.max(0, Math.min(1, buddy.xpIntoLevel / buddy.xpForNextLevel));

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.hairline }]}>
      <View style={styles.header}>
        <View style={styles.faceWrap}>
          <BuddyAvatar stage={buddy.stage} size={64} />
        </View>
        <View style={styles.identity}>
          <ThemedText type="subtitle" style={styles.name}>
            {buddy.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {buddy.stageDisplayName} · Level {buddy.level}
          </ThemedText>
        </View>
        {/* Coins = gold reward chip (Design System §2: gold = coins/rewards). */}
        <View style={[styles.coinChip, { backgroundColor: theme.goldTint }]}>
          <ThemedText type="smallBold" style={{ color: theme.goldStrong }}>
            🪙 {buddy.coins}
          </ThemedText>
        </View>
      </View>

      {/* XP bar = blue (game XP), distinct from teal "real growth". */}
      <View style={[styles.progressTrack, { backgroundColor: theme.blueTint }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.blue, width: `${progress * 100}%` },
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
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  faceWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    gap: Spacing.half,
  },
  name: {
    lineHeight: 26,
  },
  coinChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
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
