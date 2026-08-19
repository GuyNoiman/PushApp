/**
 * Home — the mature redesign (revised 2026-08-07, second founder round). The three
 * areas now have THREE DISTINCT visual forms so the page never reads as one flat list:
 *
 *   TOP STATUS STRIP (level + XP-to-next-level bar · streak — icons + numbers; Coins hidden, D29)
 *   → greeting-with-name → "Talk to your coach" (the primary HERO card, near the top)
 *   → MY WEEK        — seven day pills, then the selected day's Steps as one flat list, then
 *                      "you could also do today" (Steps of later days that can be pulled forward)
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
 *
 * MY WEEK REPLACED TWO SECTIONS (founder, approved in full 2026-08-19 —
 * `04_Product/PRD/Week_By_Day_Home_PRD.md`). "Today's focus" and "This week" told the same week
 * twice in two shapes, and neither could show an EMPTY day, which is real information about a week.
 * All the reasoning about days, marks, pull-forward and what happens to a missed Step lives in the
 * one pure derivation behind it (`core/util/weekByDay`); this screen only decides what a day's
 * cards look like. The Dream a Step serves moved ONTO the card, because the day's list is flat.
 */
import { useIsFocused } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SupportCarousel, type SupportPerson } from '@/components/home/SupportCarousel';
import { FinalStepConfirmSheet } from '@/components/celebration/FinalStepConfirmSheet';
import { CoachButton } from '@/components/home/CoachButton';
import { JourneyFeedbackSheet } from '@/components/celebration/JourneyFeedbackSheet';
import { Confetti } from '@/components/home/Confetti';
import { SectionHeader } from '@/components/home/SectionHeader';
import { StepReportFlow } from '@/components/home/StepReportFlow';
import { WeekAdjustedCard } from '@/components/home/WeekAdjustedCard';
import { WeeklyReviewCard } from '@/components/home/WeeklyReviewCard';
import { TopStatusBar } from '@/components/home/TopStatusBar';
import { JourneyCarousel, type JourneyCard } from '@/components/home/JourneyCarousel';
import { WeekDayStrip } from '@/components/home/WeekDayStrip';
import { WeekSummaryCard } from '@/components/home/WeekSummaryCard';
import { StepRow, type StepUrgency } from '@/components/home/StepRow';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import type { WeekReviewOutcome } from '@/core/AppCore';
import { currentMilestone } from '@/core/util/milestones';
import { isRunning } from '@/core/util/journeyStatus';
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

export default function HomeScreen() {
  const { core, snapshot, ready } = useApp();
  const social = useSocial();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('home');
  // Whether Home is the screen the user is actually looking at — see the feedback gate below.
  const isFocused = useIsFocused();

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
  // The Journey (finished, canceled, or quietly dead) whose verdict we still owe ourselves. A pure
  // read, and at most one at a time — see `core/celebration/journeyFeedback` for the three hosts.
  const pendingFeedbackAsk = ready && snapshot ? core.pendingJourneyFeedback() : null;
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
  // Asked at most once per foreground, on top of the never-twice-per-Journey rule in the core.
  const askedFeedbackThisForegroundRef = useRef(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
        askedFeedbackThisForegroundRef.current = false;
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

  // The end-of-Journey question sits at the BOTTOM of the priority chain, behind every other major
  // event — it is a favour we are asking, and a favour never interrupts something the user came for.
  // It is also the only host the quietly-dead Journey ever gets: asking that by push notification
  // would spend the user's attention on OUR data, in a product whose objective is fewer
  // interruptions that matter more.
  useEffect(() => {
    if (
      // FOCUS IS THE FIRST CONDITION, and it is why this modal froze the app once. The completion
      // ceremony is a pushed ROUTE, not a modal on Home. Once its `ceremonyShownAt` was stamped,
      // `pendingCeremony` flipped to null while the user was still standing on the ceremony/share
      // screen — so this sheet opened on the Home screen UNDERNEATH them. Nothing was visible, and
      // when they navigated back, an invisible modal was swallowing every touch: no scrolling, no
      // horizontal paging, no ⋯ button. Killing the app and reopening surfaced the sheet, and
      // answering it released the freeze. A modal must never open on a screen the user is not on.
      isFocused &&
      pendingFeedbackAsk &&
      pendingCeremony == null &&
      pendingReview == null &&
      pendingInactivity == null &&
      !majorOpenedThisForegroundRef.current &&
      !ceremonyOpenedThisForegroundRef.current &&
      !askedFeedbackThisForegroundRef.current
    ) {
      askedFeedbackThisForegroundRef.current = true;
      majorOpenedThisForegroundRef.current = true;
      setFeedbackOpen(true);
    }
  }, [isFocused, pendingFeedbackAsk, pendingCeremony, pendingReview, pendingInactivity]);

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

  // THE WEEK, AS SEVEN DAYS. One derivation (core/util/weekByDay) replaces both of Home's old Step
  // sections — "Today's focus" (the next Step of each active Journey) and "This week" (everything
  // else, grouped by Dream). They told the same week twice, and neither of them could show an empty
  // day, which is real information about a week. Everything below is presentation: which day is
  // selected, and how a day's Steps are dressed.
  const week = useMemo(
    () => (ready && snapshot ? core.weekByDay() : { days: [], todayIndex: 0 }),
    [core, ready, snapshot],
  );
  // The strip opens on TODAY. The selection is remembered while Home stays mounted, and re-anchors
  // to today whenever the week itself changes — a day boundary crossed with the app open must not
  // leave the user reading yesterday.
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const firstDayOfWeek = week.days[0]?.dayStart;
  useEffect(() => {
    setSelectedDay(null);
  }, [firstDayOfWeek]);
  const selectedIndex = selectedDay ?? week.todayIndex;
  const day = week.days[selectedIndex];

  // The Dream a Step ultimately serves — the grouping that used to be a heading now rides on the
  // card, because the day's list is flat.
  const dreamFor = useMemo(
    () => (item: TodayStep): string | undefined => {
      const journey = journeyById.get(item.journeyId);
      const dream = journey?.dreamId ? dreamById.get(journey.dreamId) : undefined;
      return dream?.title;
    },
    [journeyById, dreamById],
  );

  const dayName = useCallback(
    (epochMs: number): string => {
      const names = t('week.days', { returnObjects: true }) as unknown as string[];
      return names[new Date(epochMs).getDay()];
    },
    [t],
  );

  // YOUR JOURNEYS — one card per RUNNING Journey, swiped through. Frozen, future and finished
  // Journeys are absent by construction: the card is about what is moving right now, and a paused
  // Journey asking for attention on Home is the opposite of what pausing meant.
  const journeyCards: JourneyCard[] = useMemo(() => {
    return (snapshot?.journeys ?? [])
      .filter((journey) => isRunning(journey))
      .map((journey) => {
        const position = currentMilestone(journey);
        const dream = journey.dreamId ? dreamById.get(journey.dreamId) : undefined;
        return {
          id: journey.id,
          title: journey.title,
          ...(dream ? { dream: dream.title } : {}),
          progress: core.journeyProgress(journey.id),
          ...(position ? { milestone: position } : {}),
          ...(position
            ? { milestoneLabel: t('milestone', { current: position.current, total: position.total }) }
            : {}),
          onPress: () => router.push(`/journey/${journey.id}` as Href),
        };
      });
  }, [snapshot?.journeys, dreamById, core, router, t]);

  // The week in three numbers — the summary card's whole input (founder's definitions).
  const summary = useMemo(
    () => (ready && snapshot ? core.weekSummary() : { done: 0, total: 0, progress: 0 }),
    [core, ready, snapshot],
  );

  // Steps of LATER days that could be done now. Shown at the END of every day and not only a
  // finished one: someone with time this evening should not have to complete the day first.
  const alsoToday = useMemo(
    () => (ready && snapshot && day ? core.pullForward(day.dayStart) : []),
    [core, ready, snapshot, day],
  );

  // The count beside the heading is the SELECTED day's open Steps — the list directly under it. A
  // count of today's Steps while the user is reading Thursday would be a number about a different
  // day than the one on screen.
  const openOnDay = useMemo(
    () => (day?.steps ?? []).filter((s) => !s.item.step.done).length,
    [day],
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
          // Free-text messaging is not built yet, so Message opens the Inbox: an honest destination
          // beats a button that answers a tap with nothing.
          onMessage: () => router.push('/(tabs)/inbox' as Href),
        };
      });
  }, [social, t, router]);

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
          onMessage: () => router.push('/(tabs)/inbox' as Href),
        };
      });
  }, [social, t, router]);

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
            <ThemedText
              style={[
                styles.hi,
                { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(27 * displayScale()) },
              ]}>
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

          {/* ── The week, as seven days: one surface holding the strip and the day's Steps ── */}
          {/* The heading stays in ink even when the day is running out. Tinting a whole section
              amber because of the hour was the page shouting on behalf of the Steps — the urgency
              belongs to the Step that has it, and each one already carries its own colour. */}
          <SectionHeader title={t('week.title')} count={openOnDay} />
          <View style={styles.weekCard}>
            <WeekDayStrip days={week.days} selectedIndex={selectedIndex} onSelect={setSelectedDay} />
            {day && day.steps.length === 0 ? (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t(day.isToday ? 'week.emptyDayToday' : 'week.emptyDay')}
              </ThemedText>
            ) : null}
            {day?.steps.map(({ item, carriedFrom, doneOn, missed }) => (
              <StepRow
                key={item.step.id}
                icon={iconForJourney(item.journeyId)}
                title={item.step.title}
                dream={dreamFor(item)}
                note={
                  carriedFrom !== undefined
                    ? t('week.carriedFrom', { day: dayName(carriedFrom) })
                    : doneOn !== undefined
                      ? t('week.doneOn', { day: dayName(doneOn) })
                      : missed
                        ? t('week.missed')
                        : undefined
                }
                // Time pressure is a statement about TODAY. Another day of the week is calm by
                // definition — its hours have not started running out, or they already have.
                urgency={day.isToday ? focusUrgency : 'calm'}
                status={item.status}
                // "Recommended today" / "needed today" is a statement about TODAY's arithmetic. On
                // another day it would be saying something untrue about that day.
                streakRole={day.isToday ? core.streakRole(item.journeyId) : undefined}
                locked={isInClosedWeek(item.step.plannedFor)}
                onPress={() => setReportStep(item)}
                onDone={() => reportDone(item)}
                onPostpone={() => reportPostpone(item)}
                onLetGo={() => reportLetGo(item)}
              />
            ))}
          </View>

          {/* ── This week — the chapter the day sits inside, in three numbers ── */}
          <View style={styles.summary}>
            <WeekSummaryCard done={summary.done} total={summary.total} streak={snapshot.streak} />
          </View>

          {/* ── "You could also do today" — later Steps that can be pulled forward ── */}
          {alsoToday.length > 0 ? (
            <>
              <SectionHeader title={t('week.alsoToday')} count={alsoToday.length} />
              <View style={styles.aheadList}>
                {alsoToday.map((item) => (
                  <StepRow
                    key={`ahead-${item.step.id}`}
                    icon={iconForJourney(item.journeyId)}
                    title={item.step.title}
                    dream={dreamFor(item)}
                    note={
                      item.step.plannedFor !== undefined
                        ? t('week.belongsTo', { day: dayName(item.step.plannedFor) })
                        : undefined
                    }
                    pullForward
                    urgency="calm"
                    status={item.status}
                    onPress={() => setReportStep(item)}
                    onDone={() => reportDone(item)}
                    onPostpone={() => reportPostpone(item)}
                    onLetGo={() => reportLetGo(item)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* ── Your Journeys — one card at a time, swiped through ── */}
          {journeyCards.length > 0 ? (
            <>
              <SectionHeader
                title={t('sections.journeys')}
                right={
                  <ThemedText
                    type="smallBold"
                    onPress={() => router.push('/(tabs)/journeys' as Href)}
                    style={{ color: theme.tint }}>
                    {t('sections.seeAll')}
                  </ThemedText>
                }
              />
              <JourneyCarousel cards={journeyCards} />
            </>
          ) : null}

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
              <SupportCarousel needSupport={realNudge} deservePraise={realCheer} />
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

        {/* The end-of-Journey question. Dismissing it is a real answer — it records the ask, so
            this Journey is never raised again (see core/celebration/journeyFeedback). */}
        {feedbackOpen && pendingFeedbackAsk ? (
          <JourneyFeedbackSheet
            visible={feedbackOpen}
            journeyTitle={pendingFeedbackAsk.journeyTitle}
            host={pendingFeedbackAsk.host}
            onSubmit={(input) => {
              core.submitJourneyFeedback(pendingFeedbackAsk.journeyId, input);
              setFeedbackOpen(false);
            }}
            onDismiss={() => {
              core.submitJourneyFeedback(pendingFeedbackAsk.journeyId);
              setFeedbackOpen(false);
            }}
          />
        ) : null}

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
  // The greeting is the app's own voice, so it takes the display serif (2026-08-19 redesign).
  hi: {
    lineHeight: 38,
    letterSpacing: -0.2,
  },
  coach: {
    paddingBottom: Spacing.one,
  },
  // The week is ONE region, and after the lightness pass it is not a box: no fill, no border. The
  // strip and the day's Steps simply share the page, and air does the grouping a card used to do.
  weekCard: {
    marginHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  // The pull-forward Steps sit OUTSIDE that surface: they are an offer, not part of the day.
  aheadList: {
    marginHorizontal: Spacing.four,
  },
  summary: {
    paddingTop: Spacing.four,
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
