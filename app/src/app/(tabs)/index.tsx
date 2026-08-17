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
 * Reschedule); a Done fires a brief confetti burst. Empty data degrades gently — the
 * support board shows a calm empty state per tab once you have friends, and the whole
 * GIVE SUPPORT area (heading included) stays hidden until you have at least one.
 */
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SupportBoard, type SupportPerson } from '@/components/home/SupportBoard';
import { FinalStepConfirmSheet } from '@/components/celebration/FinalStepConfirmSheet';
import { CoachButton } from '@/components/home/CoachButton';
import { Confetti } from '@/components/home/Confetti';
import { SectionHeader } from '@/components/home/SectionHeader';
import { StepReportFlow } from '@/components/home/StepReportFlow';
import { WeekAdjustedCard } from '@/components/home/WeekAdjustedCard';
import { WeeklyReviewCard } from '@/components/home/WeeklyReviewCard';
import { TopStatusBar } from '@/components/home/TopStatusBar';
import { WeekDreamGroup, type WeekStepView } from '@/components/home/WeekDreamGroup';
import { TodayFocusCard, type StepUrgency } from '@/components/home/TodayFocusCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import type { WeekReviewOutcome } from '@/core/AppCore';
import { startOfLocalDay } from '@/core/util/date';
import { milestoneOfStep } from '@/core/util/milestones';
import { isInClosedWeek } from '@/core/util/week';
import { firstName, getSimulatedUser } from '@/core/profile/simulatedUser';
import type { Dream, Journey } from '@/core/types/domain';
import { useFinalStepConfirm } from '@/hooks/useFinalStepConfirm';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';
import { useCelebrationPreference } from '@/state/CelebrationPreference';
import { useSocial } from '@/state/SocialProvider';
import { Ionicons } from '@expo/vector-icons';

// A friend is "quiet" (→ Nudge) once their last shared progress is at least this many
// days old; otherwise they've recently moved (→ Cheer).
const QUIET_AFTER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Auto-open priority (Completion Celebration I1, founder default) ──────────────────────────────
// When BOTH a completion ceremony and a Weekly Review are pending in the SAME foreground, the
// COMPLETION CEREMONY WINS; the Weekly Review opens on the next foreground. Only ONE major event
// auto-opens per foreground (PRD §2.2). Flip this single constant to reverse the priority.
const COMPLETION_CEREMONY_WINS = true;

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

  // Confetti fires on the pending→done moment (bumped by the report flow's Done),
  // unless the user turned SMALL celebrations off in Settings (the big Journey
  // ceremony is a later slice and is never governed by this flag).
  const { celebrationsEnabled } = useCelebrationPreference();
  const [confettiKey, setConfettiKey] = useState(0);
  const fireSmallCelebration = useCallback(() => {
    if (celebrationsEnabled) setConfettiKey((k) => k + 1);
  }, [celebrationsEnabled]);
  // Completion Celebration I1 (Slice 5): the ONE shared gate that gently confirms a check-in which
  // would COMPLETE the Journey (final under D41) before it happens. A non-final Step never prompts.
  const { confirmVisible, requestDone, confirm, cancel } = useFinalStepConfirm(core);
  // The Step whose ⋯ report sheet is open, or null when closed.
  const [reportStep, setReportStep] = useState<TodayStep | null>(null);
  // The last adaptive week-review that CHANGED the plan, shown as the calm "I adjusted your
  // week" card until dismissed. Null when nothing changed (or the adaptive loop is off).
  const [weekOutcome, setWeekOutcome] = useState<WeekReviewOutcome | null>(null);
  // Surface a review outcome only when it actually changed the plan (never a "nothing changed" card).
  const surfaceReview = useCallback((outcome: WeekReviewOutcome) => {
    if (outcome.changed) setWeekOutcome(outcome);
  }, []);

  // Weekly Review (D40): the pending proposal drives the Home card; a fresh one auto-opens the
  // full screen ONCE on the first app entry after week close (§9). Null when none is pending or the
  // adaptive loop is off, so production Home is unchanged. Reading is a PURE getter (no state write).
  const pendingReview = ready && snapshot ? core.getPendingWeeklyReview() : null;
  // Auto-open is keyed to the REVIEW id, not the Home mount: a review generated while Home is
  // already open (app left running across the week boundary) still opens once. The persisted
  // `openedAt` (weeklyReviewNeedsAutoOpen) is the source of truth; the ref just dedupes within the
  // navigation round-trip so we don't push twice before the screen stamps it opened.
  const autoOpenedIdRef = useRef<string | null>(null);

  // Completion ceremony (I1): the pending completed-Journey ceremony auto-opens ONCE on the first
  // foreground after completion (mirrors the review latch above). Reading is a PURE getter; the
  // persisted `ceremonyShownAt` (completionCeremonyNeedsAutoOpen) is the source of truth, the ref
  // just dedupes within the navigation round-trip. Recomputed from the snapshot so a completion that
  // happens while Home is already open (a final-step Done) still opens the ceremony.
  const pendingCeremony = ready && snapshot ? core.getPendingCompletionCeremony() : null;
  const autoOpenedCeremonyIdRef = useRef<string | null>(null);

  // Inactivity return (J5): the pending "welcome back" after the app paused Journeys for a long
  // absence. It is the LOWEST-priority major event — it auto-opens only when neither a completion
  // ceremony nor a Weekly Review is competing, and at most once per foreground. A PURE getter; the
  // persisted `returnOpenedAt` (inactivityReturnNeedsAutoOpen) is the source of truth, the ref just
  // dedupes within this foreground / navigation round-trip.
  const pendingInactivity = ready && snapshot ? core.getInactivityReturn() : null;
  const autoOpenedInactivityRef = useRef(false);
  // "One major event per FOREGROUND" (PRD §2.2 / §8): once a ceremony auto-opens, both flags below
  // stay set for the rest of THIS foreground and reset on the next background→active transition (the
  // AppState effect below). `ceremonyOpenedThisForegroundRef` stops a SECOND queued ceremony from
  // popping the instant the first is closed+marked-shown (several Journeys completed before opening —
  // the next surfaces on the next app entry). `ceremonyDeferredReviewRef` keeps the Weekly Review from
  // popping the moment the ceremony closes — but only for this foreground, so a later week-close review
  // still auto-opens on a fresh entry.
  const ceremonyOpenedThisForegroundRef = useRef(false);
  const ceremonyDeferredReviewRef = useRef(false);
  // Shared "one MAJOR modal per foreground" latch across all three (ceremony / review / inactivity):
  // set the instant ANY of them auto-opens, so a major modal that closes-and-RESOLVES in the same
  // foreground (e.g. a Weekly Review completes → pendingReview flips null) can't let a lower-priority
  // one (the inactivity return) stack behind it. It gates ONLY the inactivity auto-open below; the
  // ceremony-wins-over-review priority stays governed by its own latches. Reset on the next foreground.
  const majorOpenedThisForegroundRef = useRef(false);

  // Reset the per-foreground latches when the app returns to the foreground, so the "one major event
  // per foreground" budget refreshes each entry (a resident app across a week boundary still opens the
  // review; a second queued ceremony opens on the next entry). Modal close is in-app navigation, NOT a
  // background→active transition, so it never trips this — exactly why a closed ceremony can't pop the
  // next major event within the same foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        ceremonyOpenedThisForegroundRef.current = false;
        ceremonyDeferredReviewRef.current = false;
        autoOpenedCeremonyIdRef.current = null;
        autoOpenedIdRef.current = null;
        autoOpenedInactivityRef.current = false;
        majorOpenedThisForegroundRef.current = false;
      }
    });
    return () => sub.remove();
  }, []);

  // The Weekly Review auto-opens UNLESS the completion ceremony has priority and one is pending, or
  // the ceremony already took priority this foreground (the single decision point above).
  useEffect(() => {
    const cedeToCeremony =
      (COMPLETION_CEREMONY_WINS && pendingCeremony != null) || ceremonyDeferredReviewRef.current;
    if (
      pendingReview &&
      !cedeToCeremony &&
      pendingReview.id !== autoOpenedIdRef.current &&
      core.weeklyReviewNeedsAutoOpen()
    ) {
      autoOpenedIdRef.current = pendingReview.id;
      majorOpenedThisForegroundRef.current = true;
      router.push('/weekly-review' as Href);
    }
  }, [pendingReview, pendingCeremony, core, router]);

  // The completion ceremony auto-opens when it has priority, or when no Weekly Review is competing —
  // and at most ONCE per foreground, so several already-completed Journeys don't chain back-to-back.
  useEffect(() => {
    const ceremonyMayOpen = COMPLETION_CEREMONY_WINS || pendingReview == null;
    if (
      pendingCeremony &&
      ceremonyMayOpen &&
      !ceremonyOpenedThisForegroundRef.current &&
      pendingCeremony.id !== autoOpenedCeremonyIdRef.current &&
      core.completionCeremonyNeedsAutoOpen()
    ) {
      autoOpenedCeremonyIdRef.current = pendingCeremony.id;
      ceremonyOpenedThisForegroundRef.current = true;
      ceremonyDeferredReviewRef.current = true;
      majorOpenedThisForegroundRef.current = true;
      router.push('/completion' as Href);
    }
  }, [pendingCeremony, pendingReview, core, router]);

  // The inactivity return auto-opens only when no higher-priority major event (ceremony / review) is
  // pending, none has already opened this foreground (shared latch — so it can't stack after a review
  // that opened then RESOLVED this same foreground), and it hasn't itself opened — one major event per
  // foreground (PRD §2.2 discipline).
  useEffect(() => {
    const higherMajorPending = pendingCeremony != null || pendingReview != null;
    if (
      pendingInactivity &&
      !higherMajorPending &&
      !ceremonyOpenedThisForegroundRef.current &&
      !majorOpenedThisForegroundRef.current &&
      !autoOpenedInactivityRef.current &&
      core.inactivityReturnNeedsAutoOpen()
    ) {
      autoOpenedInactivityRef.current = true;
      majorOpenedThisForegroundRef.current = true;
      router.push('/return' as Href);
    }
  }, [pendingInactivity, pendingCeremony, pendingReview, core, router]);

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

  // Build a short meta line ("Journey · Milestone N of M") for a Step. The position comes from the
  // SHARED derivation (`core/util/milestones`) the Journeys card and the Journey detail also read,
  // so no two surfaces can report a different Milestone for the same Journey (Device QA A1).
  const metaFor = useMemo(
    () => (item: TodayStep): string => {
      const journey = journeyById.get(item.journeyId);
      const pos = milestoneOfStep(journey, item.step);
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
      // Completion Celebration I1: route Done through the shared gate. A Done that would complete the
      // whole Journey first asks a gentle confirmation (Slice 5); a non-final Step proceeds at once.
      // On confirm we SUPPRESS the small confetti for a completion — the big ceremony (auto-opened by
      // the effect above once the snapshot updates) is the only celebration for it (PRD §2.2).
      requestDone(item.journeyId, item.step.id, () => {
        const completesJourney = core.willCompleteJourney(item.journeyId, item.step.id);
        core.checkInStep(item.journeyId, item.step.id);
        if (!completesJourney) fireSmallCelebration();
      });
    },
    [core, fireSmallCelebration, requestDone],
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
  // …plus the Steps ALREADY REPORTED DONE TODAY, kept on the board beneath them (device QA
  // 2026-08-17). A Step that was just completed must not vanish: the day's honest picture is what
  // you finished sitting beside what is still open, and the evidence is quietly the reward. They
  // come from `weekSteps` (the display superset that keeps done Steps) and are bounded to TODAY's
  // check-ins, so yesterday's work doesn't pile up on today's focus.
  const completedToday = useMemo(() => {
    const dayStart = startOfLocalDay(Date.now());
    return (snapshot?.weekSteps ?? []).filter(
      (s) => s.step.done && (s.step.lastCheckInAt ?? 0) >= dayStart,
    );
  }, [snapshot?.weekSteps]);
  // What the stack renders: still-open first, settled below.
  const focusRows = useMemo(
    () => [...focusSteps, ...completedToday],
    [focusSteps, completedToday],
  );
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
      // Step Dependencies (Slice 8): a Step waiting on an unmet dependency (engine `locked` flag) is
      // rendered non-interactively — folded behind its predecessor as a blank deck layer, or shown as
      // a calm "waiting" card when the predecessor isn't in this group. The predecessor's title is
      // on-device (G1) UI copy for the hint only.
      const dependsOnStepId = item.step.dependsOnStepId;
      const predecessorTitle = dependsOnStepId
        ? journey?.steps.find((s) => s.id === dependsOnStepId)?.title
        : undefined;
      const row: WeekStepView = {
        key: item.step.id,
        icon: iconForJourney(item.journeyId),
        title: item.step.title,
        meta: metaFor(item),
        done: item.step.done,
        status: item.status,
        locked: isInClosedWeek(item.step.plannedFor),
        waiting: item.locked,
        dependsOnStepId,
        predecessorTitle,
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
          // A quiet friend gets a genuine NUDGE — a distinct outreach kind from a Cheer (the
          // gateway persists which one it is), so the amber action is honest, not a relabeled cheer.
          onPress: () => void social.sendCheer(ap.owner.id, ap.journeyId, 'nudge'),
        };
      });
  }, [social, t]);

  // A brand-new account has nobody to support, and a section about nobody is worse than no
  // section: the whole "Give support" area — heading included — stays away until there is at
  // least one ACCEPTED friend (founder, device pass 2026-08-17). A pending invite doesn't count;
  // you can't cheer someone who hasn't accepted yet. Once there IS a friend the board keeps its
  // per-tab empty states, which then say something true ("nobody needs a nudge right now").
  const hasFriends = useMemo(
    () => social.friends.some((f) => f.status === 'accepted'),
    [social.friends],
  );

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
          onPress: () => void social.sendCheer(ap.owner.id, ap.journeyId, 'cheer'),
        };
      });
  }, [social, t]);

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

        {/* Tapping the Home tab while already on Home returns this (the app's longest) scroll to
            the top — the standard iOS gesture, owned by TabScrollView so it cannot be half-wired. */}
        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

          {/* ── Weekly Review — the pending-proposal card after a week closes (D40) ── */}
          {pendingReview ? (
            <WeeklyReviewCard
              review={pendingReview}
              onContinue={() => router.push('/weekly-review' as Href)}
            />
          ) : null}

          {/* ── Inactivity return — the calm persistent "welcome back" CTA (J5) ── */}
          {pendingInactivity ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.cta', { ns: 'inactivity' })}
              onPress={() => router.push('/return' as Href)}
              style={({ pressed }) => [
                styles.returnCta,
                { backgroundColor: theme.tealTint, borderColor: theme.tint },
                pressed && styles.returnCtaPressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                {t('home.cta', { ns: 'inactivity' })}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t('home.ctaHint', { ns: 'inactivity' })}
              </ThemedText>
            </Pressable>
          ) : null}

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
          {/* Nothing OPEN left → the caught-up note; anything reported today still shows below it,
              so the day reads as finished rather than as empty. */}
          {focusSteps.length === 0 && (
            <View style={[styles.calmCard, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {t('caughtUp.title')}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t('caughtUp.body')}
              </ThemedText>
            </View>
          )}
          {focusRows.length > 0 && (
            <View style={styles.focusStack}>
              {focusRows.map((item) => (
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

          {/* ── Give support — two switchable tabs, each row shows the person + WHY.
                 Hidden entirely (heading included) until there is someone to support. ── */}
          {hasFriends && (
            <>
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
              <SupportBoard needSupport={realNudge} deservePraise={realCheer} />
            </>
          )}
        </TabScrollView>

        {/* Report menu (⋯) + reused Miss-Recovery sheets. */}
        <StepReportFlow
          step={reportStep}
          core={core}
          onDone={fireSmallCelebration}
          onReviewed={surfaceReview}
          onClose={() => setReportStep(null)}
        />

        {/* Gentle final-step confirmation — shown only when a Done would complete the Journey (D41). */}
        <FinalStepConfirmSheet visible={confirmVisible} onConfirm={confirm} onCancel={cancel} />

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
  returnCta: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  returnCtaPressed: {
    opacity: 0.7,
  },
});
