/**
 * Home — action-based. It answers "what should I do now?" (not a list of Journeys):
 * a greeting, the Buddy, and this week's Steps as check-off cards. Checking a Step
 * calls the AppCore facade; the engines run and the Buddy reacts on screen.
 * Presentational only — no business logic lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyCard } from '@/components/buddy/BuddyCard';
import { EvolveReveal } from '@/components/buddy/EvolveReveal';
import { StepCard } from '@/components/journey/StepCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { featureFlags } from '@/core/config/featureFlags';
import { formatReactionReward, useBuddyMoments } from '@/hooks/use-buddy-moments';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { core, snapshot, ready } = useApp();
  const router = useRouter();
  const theme = useTheme();

  // One-off Buddy moments. The evolution reveal is owned by the EvolveReveal
  // modal below; the reaction shows a small, non-childish celebration banner.
  const { reaction, reveal, dismissReveal } = useBuddyMoments(core);
  const reward = reaction ? formatReactionReward(reaction) : null;
  const celebration = reward ? `Nice — ${reward}` : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.greetingBlock}>
            {/* Greeting reads on its own full-width line(s); the action buttons sit
                on the row below so the text column is never squeezed to ~0 width. */}
            <View style={styles.greetingText}>
              <ThemedText type="small" themeColor="textSecondary">
                {greeting()}
              </ThemedText>
              <ThemedText type="title">What will you do now?</ThemedText>
            </View>
            <View style={styles.headerActions}>
              {featureFlags.social && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Friends"
                  onPress={() => router.navigate('/friends')}
                  style={({ pressed }) => [
                    styles.missionsButton,
                    { backgroundColor: theme.purpleTint },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.purpleStrong }}>
                    🤝 Friends
                  </ThemedText>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  snapshot && snapshot.claimableRewards > 0
                    ? `Missions — ${snapshot.claimableRewards} to claim`
                    : 'Missions'
                }
                onPress={() => router.push('/missions')}
                style={({ pressed }) => [
                  styles.missionsButton,
                  { backgroundColor: theme.tealTint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                  🎯 Missions
                </ThemedText>
                {snapshot && snapshot.claimableRewards > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.coral }]}>
                    <ThemedText type="smallBold" style={styles.badgeText}>
                      {snapshot.claimableRewards}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a new Journey"
                onPress={() => router.push('/journey/new')}
                style={({ pressed }) => [
                  styles.createButton,
                  { backgroundColor: theme.coral },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="title" style={[styles.plus, { color: theme.text }]}>
                  +
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {!ready || !snapshot ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : (
            <>
              <BuddyCard buddy={snapshot.buddy} />

              {celebration && (
                <View style={[styles.celebration, { backgroundColor: theme.successTint }]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    {celebration}
                  </ThemedText>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">This week&apos;s Steps</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {snapshot.todaySteps.length} to go
                </ThemedText>
              </View>

              {snapshot.todaySteps.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.empty}>
                  <ThemedText type="default">All caught up 🎉</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    You&apos;ve checked in on every Step. Your Buddy is proud.
                  </ThemedText>
                </ThemedView>
              ) : (
                <View style={styles.stepList}>
                  {snapshot.todaySteps.map((item) => (
                    <StepCard
                      key={item.step.id}
                      item={item}
                      onCheckIn={(journeyId, stepId) => core.checkInStep(journeyId, stepId)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  greetingBlock: {
    // Column, not row: the greeting owns its own full-width line(s) above the
    // action buttons. (The old row layout squeezed the text column to ~0 width,
    // which forced the greeting to wrap one character per line.)
    gap: Spacing.three,
  },
  greetingText: {
    gap: Spacing.half,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  missionsButton: {
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepList: {
    gap: Spacing.three,
  },
  celebration: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
});
