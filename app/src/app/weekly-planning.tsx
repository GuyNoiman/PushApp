/**
 * Weekly Planning — "Your week" (screen-18, 04_Product/UX/Weekly_Planning_Screen.md).
 * Surfaced start-of-week from Home: the user reviews their planned Steps for the
 * upcoming week, grouped by day, grounded by their Journey's "why", then either
 * approves the plan as-is or edits it. A soft commitment, never a gate (spec §
 * Edge Cases) — Approve is not a lock.
 *
 * Presentational only — reads Steps from the snapshot; no rewards/Buddy/Journey
 * math lives here (Engineering Bible §19).
 *
 * DATA GAP: the domain `Step` (core/types/domain.ts) has no per-weekday
 * scheduling field yet — only `cadence` ('once' | 'daily' | 'weekly'). Until the
 * engine exposes real weekday scheduling, we deterministically derive a display
 * weekday per Step (see `weekdayForStep` below) so the grouped-by-day layout has
 * real Step data to show. Replace with the engine's real schedule when it lands.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Journey, Step } from '@/core/types/domain';
import { isRunning } from '@/core/util/journeyStatus';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Same small stable glyph-per-Step convention as journeys.tsx's journeyGlyph — the
// domain has no icon field yet, so we derive a tile colour + icon from the title.
function stepIcon(title: string): { icon: string; tone: 'teal' | 'purple' } {
  const t = title.toLowerCase();
  if (/span|french|german|lang|lesson|study|read/.test(t)) return { icon: '💬', tone: 'purple' };
  return { icon: '🔥', tone: 'teal' };
}

/**
 * TODO(data model): derive a display weekday for a Step until real per-weekday
 * scheduling exists. Deterministic (same Step always lands on the same day this
 * session) via a simple hash of the Step id, so the UI doesn't jitter on re-render.
 */
function weekdayForStep(stepId: string): number {
  let hash = 0;
  for (let i = 0; i < stepId.length; i++) hash = (hash * 31 + stepId.charCodeAt(i)) % 7;
  // Bias toward Mon/Wed/Fri (typical few-times-week rhythm) rather than a flat
  // uniform spread across all 7 days, to better resemble the mockup's shape.
  const biased = [1, 3, 5, 1, 3, 5, 0];
  return biased[hash];
}

interface DayGroup {
  weekday: number;
  label: string;
  entries: { step: Step; journeyTitle: string }[];
}

export default function WeeklyPlanningScreen() {
  const { core, snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const journeys = snapshot?.journeys ?? [];

  // Ground the week in the user's why — the first running Journey's why line, per
  // spec §A "pinned at top". Falls back to a sensible placeholder if none yet.
  const why = useMemo(() => {
    const active = journeys.find((j) => isRunning(j) && j.why.length > 0);
    return active?.why[0] ?? 'Because your future self is counting on you.';
  }, [journeys]);

  // The upcoming week's not-yet-done Steps across RUNNING Journeys, grouped by day
  // (spec §B). Only days with Steps render (task requirement). Gated positively on
  // `isRunning`, the same predicate the engines use: a frozen (paused) or Future
  // Journey plans nothing, so its Steps must not surface in the week.
  const dayGroups = useMemo<DayGroup[]>(() => {
    const entries: { step: Step; journeyTitle: string }[] = [];
    for (const journey of journeys as Journey[]) {
      if (!isRunning(journey)) continue;
      for (const step of journey.steps) {
        if (step.done) continue;
        entries.push({ step, journeyTitle: journey.title });
      }
    }

    const byDay = new Map<number, { step: Step; journeyTitle: string }[]>();
    for (const entry of entries) {
      const weekday = weekdayForStep(entry.step.id);
      const list = byDay.get(weekday) ?? [];
      list.push(entry);
      byDay.set(weekday, list);
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekday, groupEntries]) => ({
        weekday,
        label: DAY_LABELS[weekday],
        entries: groupEntries,
      }));
  }, [journeys]);

  const isEmpty = dayGroups.length === 0;

  // Stubbed for this design-build pass — no weekly-plan engine yet (spec is
  // "first pass — interaction to be refined"). Approve/Edit both just dismiss;
  // wire to a real WeeklyPlan/engine call once one exists.
  const handleEditPlan = () => dismiss();
  const handleApproveWeek = () => {
    core.syncTime();
    dismiss();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
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
          <ThemedText type="title">Your week</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.whyChip, { backgroundColor: theme.purpleTint }]}>
            <ThemedText style={[styles.whyHeart, { color: theme.purpleStrong }]}>♥</ThemedText>
            <ThemedText type="default" style={[styles.whyText, { color: theme.purpleStrong }]}>
              &ldquo;{why}&rdquo; — your why
            </ThemedText>
          </View>

          <ThemedText type="default" themeColor="textSecondary">
            This is your plan for next week. Doable?
          </ThemedText>

          {isEmpty ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="default">Nothing planned yet 🌱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Add Steps to a Journey and next week&apos;s plan will show up here.
              </ThemedText>
            </ThemedView>
          ) : (
            dayGroups.map((group) => <DayGroupCard key={group.weekday} group={group} />)
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit plan"
            onPress={handleEditPlan}
            style={({ pressed }) => [
              styles.editButton,
              { borderColor: theme.teal },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
              Edit plan
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Approve week"
            onPress={handleApproveWeek}
            style={({ pressed }) => [
              styles.approveButton,
              { backgroundColor: theme.coral },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              Approve week
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function DayGroupCard({ group }: { group: DayGroup }) {
  const theme = useTheme();
  const stepLabel = group.entries.length === 1 ? '1 step' : `${group.entries.length} steps`;

  return (
    <View style={[styles.dayCard, { backgroundColor: theme.cream }]}>
      <View style={styles.dayCardHeader}>
        <ThemedText type="subtitle" style={{ color: theme.goldStrong }}>
          {group.label}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {stepLabel}
        </ThemedText>
      </View>

      <View style={styles.stepList}>
        {group.entries.map(({ step }) => (
          <StepRow key={step.id} step={step} />
        ))}
      </View>
    </View>
  );
}

function StepRow({ step }: { step: Step }) {
  const theme = useTheme();
  const { icon, tone } = stepIcon(step.title);
  const tileColor = tone === 'purple' ? theme.purpleTint : theme.tealTint;

  return (
    <ThemedView type="backgroundElement" style={styles.stepRow}>
      <ThemedText type="subtitle" themeColor="textMuted" style={styles.dots}>
        ⋮
      </ThemedText>
      <View style={[styles.iconTile, { backgroundColor: tileColor }]}>
        <ThemedText style={styles.icon}>{icon}</ThemedText>
      </View>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.stepTitle}>
        {step.title}
      </ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  whyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  whyHeart: {
    fontSize: 18,
  },
  whyText: {
    flex: 1,
    fontStyle: 'italic',
  },
  dayCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  stepList: {
    gap: Spacing.two,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  dots: {
    lineHeight: 20,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  editButton: {
    flex: 1,
    height: 56,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    flex: 2,
    height: 56,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
