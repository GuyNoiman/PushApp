/**
 * Achievements — a warm medals wall (screen-13/14, 04_Product/UX/Achievements_Screen.md).
 * Rendered on the app's warm base, medals laid out **3 per row** with even margins.
 * Each medal shows its unlock **condition**; locked medals show a muted progress
 * **count** ("18/50 · 32 more") in a lower visual hierarchy. Tapping a medal opens a
 * centered detail **sheet** with a close (X) button. Tabs: All · Journeys · Social.
 *
 * NOTE: there is no achievements engine yet, so this renders DESIGN-PLACEHOLDER
 * sample data (components/achievements/sampleAchievements.ts). Presentational only.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  SAMPLE_ACHIEVEMENTS,
  isUnlocked,
  remaining,
  type SampleAchievement,
} from '@/components/achievements/sampleAchievements';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const GOLD = Colors.light.gold;
const GOLD_STRONG = Colors.light.goldStrong;
const GOLD_TINT = Colors.light.goldTint;

type Tab = 'all' | 'journeys' | 'social';
const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'journeys', label: 'Journeys' },
  { value: 'social', label: 'Social' },
];

export default function AchievementsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [tab, setTab] = useState<Tab>('all');
  const [selected, setSelected] = useState<SampleAchievement | null>(null);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/journeys'));

  // "All" sorts earned-first (Achievements_Screen.md decision); category tabs filter.
  const shown = useMemo(() => {
    const list =
      tab === 'all'
        ? [...SAMPLE_ACHIEVEMENTS].sort((a, b) => Number(isUnlocked(b)) - Number(isUnlocked(a)))
        : SAMPLE_ACHIEVEMENTS.filter((a) => a.category === tab);
    return list;
  }, [tab]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={dismiss}
            style={({ pressed }) => [
              styles.backChip,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.backGlyph}>
              ›
            </ThemedText>
          </Pressable>
          <ThemedText type="title">Achievements</ThemedText>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <Pressable
                key={t.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(t.value)}
                style={[
                  styles.tab,
                  { backgroundColor: active ? theme.purpleTint : theme.backgroundSelected },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: active ? theme.purpleStrong : theme.textSecondary }}>
                  {t.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {shown.map((a) => (
              <MedalCell key={a.id} achievement={a} onPress={() => setSelected(a)} />
            ))}
          </View>
          <ThemedText type="small" themeColor="textMuted" style={styles.footnote}>
            Sample achievements — the real trophies arrive with the achievements engine.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      <AchievementSheet achievement={selected} onClose={() => setSelected(null)} />
    </ThemedView>
  );
}

/** One medal in the 3-per-row wall: medal disc + name + condition (or count). */
function MedalCell({
  achievement,
  onPress,
}: {
  achievement: SampleAchievement;
  onPress: () => void;
}) {
  const theme = useTheme();
  const unlocked = isUnlocked(achievement);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${achievement.name} — ${achievement.condition}`}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={[styles.cellCard, { borderColor: theme.hairline }]}>
        <Medal achievement={achievement} />
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          themeColor={unlocked ? 'text' : 'textSecondary'}
          style={styles.medalName}>
          {achievement.name}
        </ThemedText>
        {unlocked ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.medalSub} numberOfLines={2}>
            {achievement.condition}
          </ThemedText>
        ) : achievement.progress > 0 ? (
          <View style={styles.countBlock}>
            <ThemedText type="smallBold">
              {achievement.progress}/{achievement.target}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {remaining(achievement)} more
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textMuted" style={styles.medalSub} numberOfLines={2}>
            {achievement.condition}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

/** The medal disc: warm gold glyph when unlocked, muted lock when not. */
function Medal({ achievement }: { achievement: SampleAchievement }) {
  const theme = useTheme();
  const unlocked = isUnlocked(achievement);
  return (
    <View
      style={[
        styles.disc,
        unlocked
          ? { backgroundColor: GOLD, shadowColor: GOLD_STRONG }
          : { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText style={[styles.discGlyph, !unlocked && { opacity: 0.55 }]}>
        {unlocked ? achievement.glyph : '🔒'}
      </ThemedText>
    </View>
  );
}

/** Centered detail sheet with a close (X): medal, name, condition, progress, reward. */
function AchievementSheet({
  achievement,
  onClose,
}: {
  achievement: SampleAchievement | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  if (!achievement) return null;
  const unlocked = isUnlocked(achievement);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} accessibilityLabel="Close" onPress={onClose}>
        {/* Inner press swallows taps so the sheet body doesn't dismiss. */}
        <Pressable style={styles.sheetWrap} onPress={() => {}}>
          <ThemedView type="backgroundElement" style={[styles.sheet, { backgroundColor: theme.cream }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ✕
              </ThemedText>
            </Pressable>

            <View style={styles.sheetMedal}>
              <Medal achievement={achievement} />
            </View>
            <ThemedText type="title" style={styles.sheetName}>
              {achievement.name}
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.sheetCondition}>
              {achievement.condition}
            </ThemedText>

            {!unlocked && (
              <View style={styles.sheetProgress}>
                <ThemedText type="subtitle">
                  {achievement.progress} / {achievement.target}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {remaining(achievement)} more to unlock
                </ThemedText>
              </View>
            )}

            <View style={[styles.rewardPill, { backgroundColor: GOLD }]}>
              <ThemedText type="smallBold" style={{ color: GOLD_STRONG }}>
                {unlocked ? 'Earned' : 'Reward'} · {achievement.reward}
              </ThemedText>
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    transform: [{ scaleX: -1 }],
    lineHeight: 26,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  tab: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  cell: {
    // Three per row with even gaps: (100% - 2 gaps) / 3.
    width: `${(100 - 2 * 4) / 3}%`,
    minWidth: 96,
    flexGrow: 1,
  },
  cellCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
    alignItems: 'center',
  },
  disc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  discGlyph: {
    fontSize: 26,
    lineHeight: 32,
  },
  medalName: {
    textAlign: 'center',
  },
  medalSub: {
    textAlign: 'center',
  },
  countBlock: {
    alignItems: 'center',
  },
  footnote: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(46,46,44,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 360,
  },
  sheet: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetMedal: {
    marginTop: Spacing.two,
    transform: [{ scale: 1.25 }],
  },
  sheetName: {
    textAlign: 'center',
  },
  sheetCondition: {
    textAlign: 'center',
  },
  sheetProgress: {
    alignItems: 'center',
  },
  rewardPill: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
