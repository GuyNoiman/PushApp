/**
 * BuddyScene — presentational only. The Buddy's dedicated "stage": a calm scene
 * with the Buddy centered in it, a floating level meter (level + XP bar) top-left,
 * a Coins pill top-right, and the Buddy's name + stage on a pill beneath it.
 * No business logic here (Engineering Bible §19); the core computes every value.
 */
import { StyleSheet, View } from 'react-native';

import { STAGE_FACE } from '@/components/buddy/stageFaces';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { BuddyView } from '@/core/AppCore';
import { useTheme } from '@/hooks/use-theme';

export function BuddyScene({ buddy }: { buddy: BuddyView }) {
  const theme = useTheme();
  const progress = Math.max(0, Math.min(1, buddy.xpIntoLevel / buddy.xpForNextLevel));

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

        <ThemedView type="backgroundSelected" style={styles.coinPill}>
          <ThemedText type="smallBold">🪙 {buddy.coins}</ThemedText>
        </ThemedView>
      </View>

      <View style={styles.center}>
        <ThemedText style={styles.face}>{STAGE_FACE[buddy.stage]}</ThemedText>
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
  coinPill: {
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
