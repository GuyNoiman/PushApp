/**
 * Home — the mature redesign (revised 2026-08-07, second founder round). The three
 * areas now have THREE DISTINCT visual forms so the page never reads as one flat list:
 *
 *   TOP STATUS STRIP (level + XP-to-next-level bar · streak — icons + numbers; Coins hidden, D29)
 *   → greeting-with-name → "Talk to your coach" (the primary HERO card, near the top)
 *   → TODAY'S FOCUS  — the next pending Step of EACH active Journey, a small STACK of
 *                      urgency-coloured cards (calm → amber → red as the day runs out)
 *   → THIS WEEK      — the remaining pending Steps GROUPED BY DREAM, each Step its own
 *                      SEPARATE card strung along a turquoise rail per Dream
 *   → GIVE SUPPORT   — friends in a TWO-TAB segmented board ("Needs support", amber /
 *                      "Deserve praise", turquoise); each row shows the person, the WHY
 *                      they surfaced, and one action button (Nudge / Cheer)
 *
 * Presentational only (Engineering Bible §19): every value is read from the AppCore
 * snapshot / social hook, and check-ins call the facade — no business logic here. A
 * row's ⋯ menu opens the report sheet (Done · Partial · Couldn't · Postpone ·
 * Reschedule); a Done fires a brief confetti burst. Empty data degrades gently, and
 * the support board falls back to DEV sample people until the social backend fills.
 */
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SupportBoard, type SupportPerson } from '@/components/home/SupportBoard';
import { CoachButton } from '@/components/home/CoachButton';
import { Confetti } from '@/components/home/Confetti';
import { SectionHeader } from '@/components/home/SectionHeader';
import { StepReportFlow } from '@/components/home/StepReportFlow';
import { WeekAdjustedCard } from '@/components/home/WeekAdjustedCard';
import { TopStatusBar } from '@/components/home/TopStatusBar';
import { WeekDreamGroup, type WeekStepView } from '@/components/home/WeekDreamGroup';
import { TodayFocusCard, type StepUrgency } from '@/components/home/TodayFocusCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import { sampleDeservePraise, sampleNeedHelp, useSampleWhenEmpty } from '@/dev/sampleSocial';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import type { WeekReviewOutcome } from '@/core/AppCore';
import { isInClosedWeek } from '@/core/util/week';
import { firstName, getSimulatedUser } from '@/core/profile/simulatedUser';
import type { Dream, Journey, Step } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { useSocial } from '@/state/SocialProvider';
import { Ionicons } from '@expo/vector-icons';

// A friend is "quiet" (→ Nudge) once their last shared progress is at least this many
// days old; otherwise they've recently moved (→ Cheer).
const QUIET_AFTER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Calm, monochrome glyphs picked deterministically per Journey so a Step's tile stays
// stable across renders (no per-Step icon in the model yet). Never colourful/emoji.
const STEP_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'pulse',
  'walk',
  'bicycle',
  'barbell',
  'book',
  'water',
  'leaf',
  'sparkles',
];

/** Stable per-Journey tile icon (hash of the id into STEP_ICONS). */
function iconForJourney(journeyId: string): keyof typeof Ionicons.glyphMap {
  let sum = 0;
  for (let i = 0; i < journeyId.length; i += 1) sum += journeyId.charCodeAt(i);
  return STEP_ICONS[sum % STEP_ICONS.length];
}

/** Time-of-day greeting bucket — presentational, from the device clock. */
function greetingKeyForHour(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Approximate a today-Step's time pressure from the current hour: calm before ~16:00,
 * amber ~16–20:00, red after ~20:00. TODO(data): real per-Step due-times should drive
 * this once the model carries them — the hour is a stand-in for "the day running out".
 */
function urgencyForHour(hour: number): StepUrgency {
  if (hour >= 20) return 'urgent';
  if (hour >= 16) return 'warn';
  return 'calm';
}

/** The "current of total" Milestone position when the Step belongs to one, else null. */
function milestonePosition(
  journey: Journey | undefined,
  step: Step,
): { current: number; total: number } | null {
  const milestones = journey?.milestones;
  if (!milestones?.length || !step.milestoneId) return null;
  const m = milestones.find((x) => x.id === step.milestoneId);
  if (!m) return null;
  return { current: m.order + 1, total: milestones.length };
}

/** Up to two initials from a handle/name, for a monogram avatar. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** One "This week" group: the week's Steps under the Dream (or Journey) they serve. */
interface WeekGroupView {
  key: string;
  title: string;
  isDream: boolean;
  steps: WeekStepView[];
}

export default function HomeScreen() {
  const { core, snapshot, ready } = useApp();
  const social = useSocial();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('home');

  // Confetti fires on the pending→done moment (bumped by the report flow's Done).
  const [confettiKey, setConfettiKey] = useState(0);
  // The Step whose ⋯ report sheet is open, or null when closed.
  const [reportStep, setReportStep] = useState<TodayStep | null>(null);
  // The last adaptive week-review that CHANGED the plan, shown as the calm "I adjusted your
  // week" card until dismissed. Null when nothing changed (or the adaptive loop is off).
  const [weekOutcome, setWeekOutcome] = useState<WeekReviewOutcome | null>(null);
  // Surface a review outcome only when it actually changed the plan (never a "nothing changed" card).
  const surfaceReview = useCallback((outcome: WeekReviewOutcome) => {
    if (outcome.changed) setWeekOutcome(outcome);
  }, []);

  const hour = new Date().getHours();
  const greeting = t(`greeting.${greetingKeyForHour(hour)}`);
  // The greeting prefers the (simulated) signed-in user's first name, then a public
  // handle, then a warm fallback. TODO(auth): the sim is a dev stand-in for a real
  // Google/Apple sign-in (see core/profile/simulatedUser).
  const simUser = getSimulatedUser();
  const name =
    (simUser.signedIn ? firstName(simUser.name) : '') ||
    social.profile?.handle?.trim() ||
    t('greeting.fallbackName');

  const journeyById = useMemo(() => {
    const map = new Map<string, Journey>();
    for (const j of snapshot?.journeys ?? []) map.set(j.id, j);
    return map;
  }, [snapshot?.journeys]);

  const dreamById = useMemo(() => {
    const map = new Map<string, Dream>();
    for (const d of snapshot?.dreams ?? []) map.set(d.id, d);
    return map;
  }, [snapshot?.dreams]);

  // Build a short meta line ("Journey · Milestone N of M") for a Step.
  const metaFor = useMemo(
    () => (item: TodayStep): string => {
      const journey = journeyById.get(item.journeyId);
      const pos = milestonePosition(journey, item.step);
      const ms = pos ? t('milestone', { current: pos.current, total: pos.total }) : null;
      return [item.journeyTitle, ms].filter(Boolean).join(' · ');
    },
    [journeyById, t],
  );

  // ── Quick-swipe report paths — the SAME facade calls the ⋯ menu uses, so swipe and
  // menu stay in lock-step (Engineering Bible §19: the engines own the logic). Done
  // routes through the shared confetti trigger so the burst pops on the screen.
  const reportDone = useCallback(
    (item: TodayStep) => {
      // A closed (past) week is read-only (D35.3): swipe is inert, matching the ⋯ sheet's lock.
      if (isInClosedWeek(item.step.plannedFor)) return;
      core.checkInStep(item.journeyId, item.step.id);
      setConfettiKey((k) => k + 1);
    },
    [core],
  );
  // Swipe Postpone reports a PURE postpone (kept, not moved yet) — it must leave the Step
  // `unreported` (D37: postpone is an action, not a status) and never fire StepPartial. It then runs
  // the adaptive week-review like the ⋯ menu does; reviewWeek is inert when the adaptive loop is off.
  const reportPostpone = useCallback(
    (item: TodayStep) => {
      if (isInClosedWeek(item.step.plannedFor)) return;
      void core
        .submitReason({
          journeyId: item.journeyId,
          stepId: item.step.id,
          action: 'postpone',
          reasonId: 'forgot',
        })
        .then(() => surfaceReview(core.reviewWeek(item.journeyId)));
    },
    [core, surfaceReview],
  );
  const reportLetGo = useCallback(
    (item: TodayStep) => {
      // A free, no-shame let-go of this occurrence (couldnt → grace lever).
      if (isInClosedWeek(item.step.plannedFor)) return;
      void core
        .submitReason({
          journeyId: item.journeyId,
          stepId: item.step.id,
          action: 'cancel',
          reasonId: 'couldnt',
        })
        .then(() => surfaceReview(core.reviewWeek(item.journeyId)));
    },
    [core, surfaceReview],
  );

  // TODAY'S FOCUS — the next pending Step of EACH active Journey (so with the current
  // 3 seeded Journeys the stack shows ~3), never a checked-in Step. TODO(data): this is
  // a heuristic "today" — one Step per active Journey — until real per-Step due-dates
  // exist; then this should surface the Steps actually due today instead.
  const todaySteps = useMemo(() => snapshot?.todaySteps ?? [], [snapshot?.todaySteps]);
  const focusSteps = useMemo(() => {
    const seen = new Set<string>();
    const out: TodayStep[] = [];
    for (const s of todaySteps) {
      if (s.step.done || seen.has(s.journeyId)) continue;
      seen.add(s.journeyId);
      out.push(s);
    }
    return out;
  }, [todaySteps]);
  const focusStepIds = useMemo(
    () => new Set(focusSteps.map((s) => s.step.id)),
    [focusSteps],
  );

  // THIS WEEK — every OTHER pending Step of the week (all of weekSteps, minus the ones
  // already shown in Today's focus), grouped by the Dream their Journey serves. A
  // Journey with no Dream forms its own group.
  const weekGroups: WeekGroupView[] = useMemo(() => {
    const pending = (snapshot?.weekSteps ?? []).filter(
      (s) => !s.step.done && !focusStepIds.has(s.step.id),
    );
    const groups = new Map<string, WeekGroupView>();
    for (const item of pending) {
      const journey = journeyById.get(item.journeyId);
      const dream = journey?.dreamId ? dreamById.get(journey.dreamId) : undefined;
      const key = dream ? `dream:${dream.id}` : `journey:${item.journeyId}`;
      const title = dream?.title ?? journey?.title ?? item.journeyTitle;
      const row: WeekStepView = {
        key: item.step.id,
        icon: iconForJourney(item.journeyId),
        title: item.step.title,
        meta: metaFor(item),
        done: item.step.done,
        status: item.status,
        locked: isInClosedWeek(item.step.plannedFor),
        onPress: () => setReportStep(item),
        onDone: () => reportDone(item),
        onPostpone: () => reportPostpone(item),
        onLetGo: () => reportLetGo(item),
      };
      const group = groups.get(key);
      if (group) group.steps.push(row);
      else groups.set(key, { key, title, isDream: Boolean(dream), steps: [row] });
    }
    return [...groups.values()];
  }, [
    snapshot?.weekSteps,
    focusStepIds,
    journeyById,
    dreamById,
    metaFor,
    reportDone,
    reportPostpone,
    reportLetGo,
  ]);

  const weekCount = useMemo(
    () => weekGroups.reduce((n, g) => n + g.steps.length, 0),
    [weekGroups],
  );

  // GIVE SUPPORT — real Ally progress split into the two tabs: a friend gone quiet
  // needs support/a Nudge (amber); a friend who recently moved deserves praise/a Cheer
  // (turquoise). Each row also carries a WHY line synthesised from their progress.
  const realNudge: SupportPerson[] = useMemo(() => {
    const now = Date.now();
    return social.allyProgress
      .filter((ap) => Math.floor((now - ap.updatedAt) / DAY_MS) >= QUIET_AFTER_DAYS)
      .slice(0, 8)
      .map((ap) => {
        const days = Math.floor((now - ap.updatedAt) / DAY_MS);
        const on = ap.title ? t('support.on', { title: ap.title }) : '';
        return {
          key: `${ap.owner.id}:${ap.journeyId}`,
          initials: initialsOf(ap.owner.handle),
          name: ap.owner.handle,
          status: t('support.quiet', { count: days, on }),
          // TODO(data): only `sendCheer` exists today — a dedicated "nudge" outreach for
          // a quiet friend is a later slice. Both reach out for now.
          onPress: () => void social.sendCheer(ap.owner.id, ap.journeyId),
        };
      });
  }, [social, t]);

  const realCheer: SupportPerson[] = useMemo(() => {
    const now = Date.now();
    return social.allyProgress
      .filter((ap) => Math.floor((now - ap.updatedAt) / DAY_MS) < QUIET_AFTER_DAYS)
      .slice(0, 8)
      .map((ap) => {
        const on = ap.title ? t('support.on', { title: ap.title }) : '';
        const status =
          ap.streak > 0
            ? t('support.streak', { count: ap.streak, on })
            : t('support.madeProgress', { on });
        return {
          key: `${ap.owner.id}:${ap.journeyId}`,
          initials: initialsOf(ap.owner.handle),
          name: ap.owner.handle,
          status,
          onPress: () => void social.sendCheer(ap.owner.id, ap.journeyId),
        };
      });
  }, [social, t]);

  // Until the social backend fills, each tab falls back to the shared DEV sample so
  // BOTH tabs show real-looking people — with their WHY/status line intact.
  const sampleNudge: SupportPerson[] = useMemo(
    () =>
      sampleNeedHelp.map((f) => ({
        key: f.id,
        initials: f.initials,
        name: f.name,
        status: f.status,
        onPress: () => router.push('/friends'),
      })),
    [router],
  );
  const sampleCheer: SupportPerson[] = useMemo(
    () =>
      sampleDeservePraise.map((f) => ({
        key: f.id,
        initials: f.initials,
        name: f.name,
        status: f.status,
        onPress: () => router.push('/friends'),
      })),
    [router],
  );

  const nudgePeople = useSampleWhenEmpty(realNudge, sampleNudge);
  const cheerPeople = useSampleWhenEmpty(realCheer, sampleCheer);

  if (!ready || !snapshot) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loading} edges={['top', 'left', 'right']}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('loading', { ns: 'common' })}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const focusUrgency = urgencyForHour(hour);
  const headerTone = focusSteps.length > 0 && focusUrgency !== 'calm' ? 'urgent' : 'default';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ── Status strip — icons + numbers, with the XP-to-next-level bar in Level ── */}
        {/* Coins are hidden in the initial version (D29) — TopStatusBar no longer takes/render them. */}
        <TopStatusBar
          level={snapshot.buddy.level}
          xpIntoLevel={snapshot.buddy.xpIntoLevel}
          xpForNextLevel={snapshot.buddy.xpForNextLevel}
          streak={snapshot.streak}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Greeting ── */}
          <View style={styles.header}>
            <ThemedText style={[styles.hi, { color: theme.text }]}>
              {t('greeting.line', { greeting, name })}
            </ThemedText>
          </View>

          {/* ── Talk to your coach — the primary way in, pinned near the top ── */}
          <View style={styles.coach}>
            {/* '/coach' isn't in the generated typed-routes map yet (built in parallel);
                cast until that screen lands. */}
            <CoachButton onPress={() => router.push('/coach' as Href)} />
          </View>

          {/* ── "I adjusted your week" — the calm adaptive report→replan banner (dismissible) ── */}
          {weekOutcome?.changed && weekOutcome.narration ? (
            <WeekAdjustedCard
              narration={weekOutcome.narration}
              atRisk={weekOutcome.atRisk}
              onDismiss={() => setWeekOutcome(null)}
            />
          ) : null}

          {/* ── Today's focus — a small stack, one card per active Journey ── */}
          <SectionHeader title={t('sections.todayFocus')} count={focusSteps.length} tone={headerTone} />
          {focusSteps.length > 0 ? (
            <View style={styles.focusStack}>
              {focusSteps.map((item) => (
                <TodayFocusCard
                  key={item.step.id}
                  icon={iconForJourney(item.journeyId)}
                  title={item.step.title}
                  meta={metaFor(item)}
                  progress={core.journeyProgress(item.journeyId)}
                  urgency={focusUrgency}
                  status={item.status}
                  locked={isInClosedWeek(item.step.plannedFor)}
                  onPress={() => setReportStep(item)}
                  onDone={() => reportDone(item)}
                  onPostpone={() => reportPostpone(item)}
                  onLetGo={() => reportLetGo(item)}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.calmCard, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {t('caughtUp.title')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t('caughtUp.body')}
              </ThemedText>
            </View>
          )}

          {/* ── This week — grouped by Dream, strung along a turquoise rail ── */}
          <SectionHeader title={t('sections.thisWeek')} count={weekCount} />
          {weekGroups.length === 0 ? (
            <View style={[styles.calmCard, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t('week.empty')}
              </ThemedText>
            </View>
          ) : (
            weekGroups.map((group) => (
              <WeekDreamGroup
                key={group.key}
                title={group.title}
                isDream={group.isDream}
                steps={group.steps}
              />
            ))
          )}

          {/* ── Give support — two switchable tabs, each row shows the person + WHY ── */}
          <SectionHeader
            title={t('sections.giveSupport')}
            right={
              <ThemedText
                type="smallBold"
                onPress={() => router.push('/friends')}
                style={{ color: theme.tint }}>
                {t('sections.seeAll')}
              </ThemedText>
            }
          />
          <SupportBoard needSupport={nudgePeople} deservePraise={cheerPeople} />
        </ScrollView>

        {/* Report menu (⋯) + reused Miss-Recovery sheets. */}
        <StepReportFlow
          step={reportStep}
          core={core}
          onDone={() => setConfettiKey((k) => k + 1)}
          onReviewed={surfaceReview}
          onClose={() => setReportStep(null)}
        />

        {/* Celebration overlay — never intercepts touches. */}
        <Confetti fireKey={confettiKey} />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: Spacing.six,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  hi: {
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  coach: {
    paddingBottom: Spacing.one,
  },
  // The Today's-focus cards stack with a small gap so each reads as its own card.
  focusStack: {
    gap: Spacing.two,
  },
  calmCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.one,
  },
});
