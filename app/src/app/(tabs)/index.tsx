/**
 * Home — action-based. It answers "what should I do now?" (not a list of Journeys):
 * a greeting, the Buddy, and this week's Steps as check-off cards. Checking a Step
 * calls the AppCore facade; the engines run and the Buddy reacts on screen.
 * Presentational only — no business logic lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyCard } from '@/components/buddy/BuddyCard';
import { StepCard } from '@/components/journey/StepCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
  const [celebration, setCelebration] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for one-off Buddy moments to show a small, non-childish celebration.
  useEffect(() => {
    const flash = (message: string) => {
      setCelebration(message);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCelebration(null), 2600);
    };
    const onReacted = (e: { gainedXp: number; gainedCoins: number }) => {
      flash(`Nice — +${e.gainedXp} XP · +${e.gainedCoins} 🪙`);
    };
    const onEvolved = (e: { buddy: { name: string }; toStage: string }) => {
      flash(`${e.buddy.name} evolved into a ${e.toStage}! ✨`);
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.greetingBlock}>
            <View style={styles.greetingText}>
              <ThemedText type="small" themeColor="textSecondary">
                {greeting()}
              </ThemedText>
              <ThemedText type="subtitle">What will you do now?</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a new Journey"
              onPress={() => router.push('/journey/new')}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: theme.text },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="subtitle" style={[styles.plus, { color: theme.background }]}>
                +
              </ThemedText>
            </Pressable>
          </View>

          {!ready || !snapshot ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : (
            <>
              <BuddyCard buddy={snapshot.buddy} />

              {celebration && (
                <ThemedView type="backgroundSelected" style={styles.celebration}>
                  <ThemedText type="smallBold">{celebration}</ThemedText>
                </ThemedView>
              )}

              <View style={styles.sectionHeader}>
                <ThemedText type="default" style={styles.sectionTitle}>
                  This week&apos;s Steps
                </ThemedText>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  greetingText: {
    flex: 1,
    gap: Spacing.half,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    lineHeight: 34,
  },
  pressed: {
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: 700,
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
