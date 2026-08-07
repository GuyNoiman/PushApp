/**
 * dev-adaptive — a HIDDEN, dev-only screen for exercising the adaptive report→replan loop on the
 * founder's device (mirrors DevRecoveryPanel's role for Miss-Recovery). Reachable only when
 * `featureFlags.adaptiveCoachDev` is on (the founder's git-ignored `.env.local`); it renders a
 * "not available" note otherwise, and never ships to real users.
 *
 * For each active Journey it offers one action: FORCE A SLIP + REVIEW — it back-dates a pending
 * Step into the past, runs the slip detector, then force-runs a week-review (bypassing the once/day
 * cadence gate) and shows the coach's on-device narration inline. Purely presentational: it calls
 * the DEV facade methods; no business logic here (Engineering Bible §19).
 */
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { featureFlags } from '@/core/config/featureFlags';
import type { WeekReviewOutcome } from '@/core/AppCore';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

export default function DevAdaptiveScreen() {
  const { core, snapshot } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const [outcomes, setOutcomes] = useState<Record<string, WeekReviewOutcome>>({});

  const active = (snapshot?.journeys ?? []).filter((j) => !j.completedAt);

  const forceSlipAndReview = (journeyId: string) => {
    const journey = active.find((j) => j.id === journeyId);
    const step = journey?.steps.find((s) => !s.done && !s.dropped);
    if (!step) return;
    core.devForceSlip(journeyId, step.id);
    const outcome = core.devReviewWeek(journeyId);
    setOutcomes((prev) => ({ ...prev, [journeyId]: outcome }));
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Dev · Adaptive', headerShown: true }} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!featureFlags.adaptiveCoachDev ? (
            <ThemedText type="small" themeColor="textSecondary">
              The adaptive dev loop is off. Set EXPO_PUBLIC_ADAPTIVE_COACH in .env.local to enable it.
            </ThemedText>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Force a Step to slip, then re-plan its week. The coach&apos;s reply appears below each
                Journey.
              </ThemedText>

              {active.length === 0 ? (
                <ThemedText type="small" themeColor="textMuted">
                  No active Journeys to review.
                </ThemedText>
              ) : (
                active.map((j) => {
                  const outcome = outcomes[j.id];
                  return (
                    <View
                      key={j.id}
                      style={[
                        styles.card,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                      ]}>
                      <ThemedText type="default" style={{ color: theme.text }}>
                        {j.title}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Force slip and review ${j.title}`}
                        onPress={() => forceSlipAndReview(j.id)}
                        style={({ pressed }) => [
                          styles.button,
                          { backgroundColor: theme.tealTint, borderColor: theme.tint },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                          Force a slip + review
                        </ThemedText>
                      </Pressable>
                      {outcome ? (
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {outcome.changed
                            ? outcome.narration
                            : 'Nothing to change right now — the plan still fits.'}
                        </ThemedText>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          )}

          <Pressable onPress={() => router.back()} style={styles.back}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Done
            </ThemedText>
          </Pressable>
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
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignSelf: 'flex-start',
  },
  back: {
    paddingVertical: Spacing.three,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
