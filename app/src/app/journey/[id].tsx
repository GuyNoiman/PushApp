/**
 * Journey detail — everything about one Journey in one place (screen-03, and
 * 04_Product/UX/Journey_Detail spec). Opened by tapping a Journey card.
 *
 * Per the finalized mockup the Journey name reads as a SECONDARY title under a
 * small "JOURNEY" eyebrow — deliberately de-emphasized vs top-level tab titles so
 * the hierarchy stays clear. Shows the current Milestone (when the Journey has a real
 * Milestone arc) + progress + start/end window, the Steps list with per-Step status, and
 * the user's "why" list.
 *
 * FUTURE MODE (Future Journey Management, §7–§9): a Journey saved for later opens the same screen
 * with its planned window in place of progress, a calm banner, its Steps read-only, and one
 * "Start Journey" action behind a single confirmation. Pause is hidden (nothing is running yet);
 * Edit and Delete stay, and editing never activates it.
 *
 * Presentational only — reads the Journey from the snapshot by id and reports the
 * check-in intent upward; all rewards/Buddy logic runs in the engines (§19).
 *
 * Note: `journey/new` is a static sibling route; this dynamic `[id]` route resolves
 * every other id. If the id is unknown (stale deep-link), a gentle not-found shows.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FinalStepConfirmSheet } from '@/components/celebration/FinalStepConfirmSheet';
import { StepStatusChip } from '@/components/home/StepStatusChip';
import { CancelJourneySheet } from '@/components/journey/CancelJourneySheet';
import { JourneyDreamLink } from '@/components/journey/JourneyDreamLink';
import { JourneyReminderCard } from '@/components/journey/JourneyReminderCard';
import { JourneySupportCircle } from '@/components/journey/JourneySupportCircle';
import {
  computeWeekLayout,
  historyStepStatus,
  shortDate,
  stepsByWeek,
  toJourneyView,
} from '@/components/journey/journeyView';
import { featureFlags } from '@/core/config/featureFlags';
import { dreamsForJourney } from '@/core/dreams/dreams';
import { futureStartState, previewStartNow } from '@/core/journeys/futureJourneys';
import { unlivedStepCount } from '@/core/status/stepHistory';
import type { StepStatus } from '@/core/status/stepStatus';
import { remainingDaysInWeek } from '@/core/util/week';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Step } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { useFinalStepConfirm } from '@/hooks/useFinalStepConfirm';
import { useSupportCircleImpact } from '@/hooks/useSupportCircleImpact';
import { isolate, isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';
import { useSocial } from '@/state/SocialProvider';

// Per-layer offset of a waiting card behind the actionable top card — ~10px down + ~10px toward the
// reading-direction's TRAILING edge, per the approved deck mockup (Step_Dependency_Cards.html Rev 2).
const STACK_OFFSET = 10;
// Slice 9 — surface the runway nudge only when this many days (or fewer) remain in the current week.
const NUDGE_RUNWAY_DAYS = 3;

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { core, snapshot } = useApp();
  const social = useSocial();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('journey');
  // Completion Celebration I1 (Slice 5): the SAME shared gate the Home paths use — the check-in CTA
  // asks a gentle confirmation only when this Step would complete the Journey (final, D41).
  // `requestDone` is deliberately not destructured: this screen no longer reports a Step (the
  // pinned check-in CTA was removed — see the note further down), but the confirmation sheet stays
  // mounted for the final-Step gate reached from the Step rows.
  const { confirmVisible, confirm, cancel } = useFinalStepConfirm(core);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Journey Abandonment: the cancel confirmation. Canceling is FINAL and there is NO undo window
  // (founder decision 2026-08-14), so this sheet is the last point the decision can be taken back.
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Future Journey Management §9: starting a Future Journey takes ONE confirmation, which states the
  // effective start and — when the user is starting a scheduled Journey ahead of its day — the plan
  // shift they are agreeing to. Nothing activates until they confirm here.
  const [confirmingStart, setConfirmingStart] = useState(false);
  // The REAL Support-Circle consequence of that cancel, read only while the sheet is open. Null
  // until it is known — the sheet then states nothing about the Circle rather than a guessed count,
  // and a failed read never stands between the user and a local action (PRD §8.4.4).
  const supportCircle = useSupportCircleImpact(id, confirmingCancel);
  // null = follow the current week; a number = the week the user paged to.
  const [weekIndex, setWeekIndex] = useState<number | null>(null);

  // Smart Notification Timing (PRD §4): opening a Journey is positive timing evidence for any
  // pending trial that covered it. A no-op when Smart timing is off, which is every build until the
  // flag is on and every Journey until Smart mode is chosen for it — so this costs nothing here.
  useEffect(() => {
    if (id) core.noteJourneyViewed(id);
  }, [core, id]);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/journeys'));

  const journey = snapshot?.journeys.find((j) => j.id === id);

  if (!journey) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Header
            onBack={dismiss}
            eyebrow={t('detail.eyebrow')}
            title={t('detail.notFoundTitle')}
            backLabel={t('detail.backA11y')}
          />
          <View style={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.notFoundBody')}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const view = toJourneyView(journey);
  // A CANCELED Journey opens in a read-only history mode: what happened, and nothing that asks for
  // more (Journey Abandonment PRD §8.2). Everything below gates on this, not on `completedAt` —
  // canceling deliberately never stamps a completion date.
  const isCanceled = view.status === 'abandoned';
  // FUTURE MODE (Future Journey Management §7/§8): a complete, approved plan that has not started.
  // It shows its planned window instead of progress, its Steps read-only, and one Start Journey CTA.
  // It asks for nothing: no check-in, no "next" Step, no Milestone, no percentage, no report.
  const isFutureMode = view.status === 'future';
  const futureStart = isFutureMode ? futureStartState(journey, Date.now()) : undefined;
  const nextStep = isCanceled || isFutureMode ? undefined : journey.steps.find((s) => !s.done);

  // Dream Management (D40 / F1): the private, coach-owned Dream(s) this Journey serves — resolved on
  // the owner's OWN Journey view only. Dream titles are private on-device data and never enter any
  // social/Ally payload (PRD §8), so this surface adds no egress path.
  const linkedDreams = dreamsForJourney(journey, snapshot?.dreams ?? []);

  // Weekly model: page through the Journey's Steps one week at a time (founder design).
  const weekly = stepsByWeek(journey);
  const shownWeek = Math.min(weekly.totalWeeks - 1, Math.max(0, weekIndex ?? weekly.currentWeek));
  const goWeek = (delta: number) =>
    setWeekIndex(Math.min(weekly.totalWeeks - 1, Math.max(0, shownWeek + delta)));

  // Step Dependencies (Slices 8–9): arrange the shown week into render units — plain Steps and STACKS
  // (an actionable top Step with its still-waiting dependents piled behind it). computeWeekLayout is
  // the SINGLE display-arrangement source (journeyView), read with the SAME on-device reasonLog the
  // engine's `locked` flag uses, so the pager and Home never disagree on what is waiting.
  const layout = computeWeekLayout(journey, shownWeek, Date.now(), core.getReasonLog());
  // Slice 9 — the calm "handle the gating Step early" nudge: only on the CURRENT week (never a
  // future/past page), only when a stack actually gates Steps this week, and only when the week's
  // runway is short. Title-free, Buddy-voiced, local UI copy (Step titles stay on-device, G1).
  // Never on a FUTURE Journey: it has no current week to run out of, and nudging someone to "handle
  // the gating Step early" on a plan that hasn't started is exactly the pressure this feature avoids.
  const showRunwayNudge =
    !isFutureMode &&
    shownWeek === weekly.currentWeek &&
    layout.some((u) => u.kind === 'stack') &&
    remainingDaysInWeek(Date.now()) <= NUDGE_RUNWAY_DAYS;

  // Editing runs through the coach's understanding call, so it is gated on liveCoach; a completed
  // or canceled Journey is never editable (its plan is finished, or was let go).
  const canEdit = !journey.completedAt && !isCanceled && featureFlags.liveCoach;
  const onEdit = canEdit
    ? () => router.push({ pathname: '/coach', params: { mode: 'edit', journeyId: journey.id } })
    : undefined;

  // Freeze/Resume (J3): a paused Journey keeps all its progress but fires no reminders and hides its
  // check-in CTA until resumed. Completed Journeys can't be paused — and neither can a FUTURE one:
  // it hasn't started, so it is already producing nothing to pause, and freezing it would overwrite
  // the very `future` state its planned start lives in (the engine refuses it too).
  const isFrozen = view.status === 'frozen';
  const canFreeze = !journey.completedAt && !isCanceled && !isFutureMode;
  const onToggleFreeze = () => {
    if (isFrozen) core.resumeJourney(journey.id);
    else core.freezeJourney(journey.id);
  };

  // START JOURNEY (§9) — the manual/early path: the one transition from Future to Active, behind one
  // confirmation. The preview is pure display math; nothing changes until `onConfirmStart` runs.
  const startPreview = isFutureMode ? previewStartNow(journey, Date.now()) : undefined;
  const onConfirmStart = () => {
    setConfirmingStart(false);
    // Idempotent in the engine: a second tap (or a scheduled activation that landed first) is a
    // no-op, so there is nothing to guard here.
    core.startJourneyNow(journey.id);
  };

  // CANCEL (Journey Abandonment) — offered for a Journey that is actually running or paused, and
  // for nothing else:
  //  · `completed` → never. Completion is FINAL (D41); a finished Journey can only be deleted.
  //  · `future`    → never. A Journey that never started is DELETED, not canceled (founder decision
  //                  2026-08-14): there is no history to preserve, so it simply disappears via the
  //                  Delete row below.
  //  · `abandoned` → never. It is already canceled; only Delete remains.
  const canCancel = view.status === 'active' || view.status === 'frozen';
  // The FACTUAL number of Steps the cancel will remove, from the same rule the engine applies a
  // moment later — informed consent about data removal, never leverage (PRD §8.4.2 / §9.1).
  const stepsToRemove = unlivedStepCount(journey, core.getReasonLog());
  const onConfirmCancel = () => {
    setConfirmingCancel(false);
    // Terminal and local-first: the facade cancels the pending one-shots, snapshots the honest Step
    // count, keeps every reported Step and closes any live invites best-effort. Nothing else to do
    // here, and there is no undo to offer.
    core.abandonJourney(journey.id);
  };

  const onConfirmDelete = () => {
    setConfirmingDelete(false);
    // Support Circle (D2): a deleted Journey closes/revokes every live invite. Best-effort and
    // server-gated (reads already stop the instant the Journey is gone); never blocks the delete.
    void social.closeJourneyInvites(journey.id);
    core.deleteJourney(journey.id);
    dismiss();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          onBack={dismiss}
          eyebrow={t('detail.eyebrow')}
          title={journey.title}
          onEdit={onEdit}
          editLabel={t('detail.editLabel')}
          backLabel={t('detail.backA11y')}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Milestone / progress card */}
          <ThemedView
            type="backgroundElement"
            style={[styles.progressCard, { borderColor: theme.hairline }, CARD_SHADOW]}>
            {/* A canceled Journey shows NO Milestone, NO progress bar and NO percentage — only the
                honest "N of M Steps done", counted against the Steps it held when it was stopped
                (`stepsAtAbandon`). It must never read as a success (PRD §4.5 / §8.2). */}
            {/* A FUTURE Journey shows NO Milestone, NO bar and NO percentage either — there is no
                progress to report before it starts (PRD §8). In their place: the PLANNED window it
                would run over, and how many Steps are waiting in the plan. */}
            {/* The Milestone line is read from the Journey's REAL Milestones (shared with Home and
                the Journeys card). A Journey with none says nothing here — it never had a Milestone
                the user saw or approved (Device QA 2026-08-17, A1). */}
            {!isCanceled && !isFutureMode && view.milestone && (
              <ThemedText type="subtitle">
                {t('detail.milestone', {
                  current: view.milestone.current,
                  total: view.milestone.total,
                })}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {isFutureMode
                ? futureStart?.kind === 'manual'
                  ? t('detail.futureLength', { count: journey.durationDays })
                  : t('detail.futureWindow', {
                      start: shortDate(view.startedAt),
                      end: shortDate(view.endsAt),
                    })
                : t('detail.window', {
                    start: shortDate(view.startedAt),
                    end: shortDate(view.endsAt),
                  })}
            </ThemedText>
            {!isCanceled && !isFutureMode && (
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: theme.teal, width: `${Math.round(view.progress * 100)}%` },
                  ]}
                />
              </View>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {isFutureMode
                ? t('detail.stepsPlanned', { count: view.totalSteps })
                : t('detail.stepsDone', { done: view.doneSteps, total: view.totalSteps })}
            </ThemedText>
          </ThemedView>

          {/* Canceled banner — matter-of-fact, neutral ink. Not a warning (nothing is wrong) and not
              a celebration. No sad tone, no "we'll miss you" (PRD §9.1). */}
          {isCanceled && (
            <View
              style={[
                styles.canceledBanner,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline },
              ]}>
              <Ionicons name="stop-circle-outline" size={18} color={theme.textMuted} />
              <View style={styles.pausedText}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('detail.canceled')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('detail.canceledBody')}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Future banner — says plainly that this plan hasn't started, in the calm teal tint. NOT
              amber: amber is the app's urgency colour, and a Journey saved for later is the exact
              opposite of urgent. A scheduled Journey whose day has already come around gets the
              neutral "ready when you are" wording — never late, never overdue, never behind. */}
          {isFutureMode && (
            <View
              style={[styles.futureBanner, { backgroundColor: theme.tealTint, borderColor: theme.teal }]}>
              <Ionicons name="calendar-outline" size={18} color={theme.tealStrong} />
              <View style={styles.pausedText}>
                <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                  {t('detail.future')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {futureStart?.kind === 'ready'
                    ? t('detail.futureReadyBody')
                    : futureStart?.kind === 'manual'
                      ? t('detail.futureManualBody')
                      : t('detail.futureBody', { date: shortDate(futureStart?.at ?? view.startedAt) })}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Paused banner (J3) — makes the frozen state unmistakable and explains the muted reminders. */}
          {isFrozen && (
            <View style={[styles.pausedBanner, { backgroundColor: theme.goldTint, borderColor: theme.gold }]}>
              <Ionicons name="pause-circle-outline" size={18} color={theme.goldStrong} />
              <View style={styles.pausedText}>
                <ThemedText type="smallBold" style={{ color: theme.goldStrong }}>
                  {t('detail.paused')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('detail.pausedBody')}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Part of your Dream (D40 / F1) — a READ-ONLY link to the coach-owned Dream(s) this
              Journey serves; each row opens the Dream detail. No progress/%. When the Journey has no
              RESOLVABLE linked Dream (never linked, OR its dreamId points at a since-removed Dream),
              the gentle connect surface shows instead (offering existing Dreams only) — so a dangling
              link still offers a re-link rather than a dead-end. */}
          {linkedDreams.length > 0 ? (
            <View style={styles.block}>
              <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
                {t('dream.partOf')}
              </ThemedText>
              <View style={styles.dreamList}>
                {linkedDreams.map((dream) => (
                  <Pressable
                    key={dream.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('dream.openA11y', { title: dream.title })}
                    onPress={() => router.push(`/dream/${dream.id}`)}
                    style={({ pressed }) => [pressed && styles.pressed]}>
                    <ThemedView
                      type="backgroundElement"
                      style={[styles.dreamCard, { borderColor: theme.hairline }, CARD_SHADOW]}>
                      <View style={[styles.dreamIcon, { backgroundColor: theme.tealTint }]}>
                        <Ionicons name="sparkles-outline" size={18} color={theme.teal} />
                      </View>
                      <ThemedText type="default" numberOfLines={2} style={styles.dreamTitle}>
                        {dream.title}
                      </ThemedText>
                      <Ionicons
                        name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                        size={18}
                        color={theme.textMuted}
                      />
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <JourneyDreamLink
              dreams={snapshot?.dreams ?? []}
              onLink={(dreamId) => core.linkJourneyToDream(journey.id, dreamId, { primary: true })}
            />
          )}

          {/* What happened — the CANCELED Journey's read-only history, in place of the weekly pager.
              Deliberate: the pager reads `stepsByWeek`, which filters DROPPED Steps out, and a cancel
              marks every kept non-done Step `dropped` to shed it from scope. Left as-is, the pager
              would show only the completed Steps and silently hide the partials and let-gos — the
              exact record this feature exists to preserve. And a canceled Journey has no waiting or
              stacked Steps by construction (PRD §4.3), so paging weeks buys nothing. So history gets
              a flat list of every Step that survived, in plan order, each with its real outcome. */}
          {isCanceled && (
            <View style={styles.block}>
              <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
                {t('detail.whatHappened')}
              </ThemedText>
              {journey.steps.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('detail.whatHappenedEmpty')}
                </ThemedText>
              ) : (
                <View style={styles.stepList}>
                  {journey.steps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      isNext={false}
                      reportStatus={historyStepStatus(step, core.getReasonLog())}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Steps by week — page through the plan one week at a time (founder design). */}
          {!isCanceled && (
            <View style={styles.block}>
              <View style={styles.weekHeader}>
                <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
                  {t('detail.stepsByWeek')}
                </ThemedText>
                <View style={styles.pager}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('detail.prevWeekA11y')}
                    disabled={shownWeek <= 0}
                    onPress={() => goWeek(-1)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.pagerBtn,
                      { backgroundColor: theme.backgroundSelected },
                      (pressed || shownWeek <= 0) && styles.pagerBtnMuted,
                    ]}>
                    <Ionicons
                      name={isRTL() ? 'chevron-forward' : 'chevron-back'}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.weekLabel}>
                    {t('detail.weekOf', { week: shownWeek + 1, total: weekly.totalWeeks })}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('detail.nextWeekA11y')}
                    disabled={shownWeek >= weekly.totalWeeks - 1}
                    onPress={() => goWeek(1)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.pagerBtn,
                      { backgroundColor: theme.backgroundSelected },
                      (pressed || shownWeek >= weekly.totalWeeks - 1) && styles.pagerBtnMuted,
                    ]}>
                    <Ionicons
                      name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
              {layout.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('detail.emptyWeek')}
                </ThemedText>
              ) : (
                <View style={styles.stepList}>
                  {layout.map((unit) =>
                    unit.kind === 'step' ? (
                      <StepRow
                        key={unit.step.id}
                        step={unit.step}
                        isNext={!journey.completedAt && unit.step.id === nextStep?.id}
                        reportStatus={core.getStepStatus(unit.step)}
                      />
                    ) : (
                      <StepStack
                        key={unit.top.id}
                        top={unit.top}
                        depth={unit.depth}
                        isNext={!journey.completedAt && unit.top.id === nextStep?.id}
                        reportStatus={core.getStepStatus(unit.top)}
                      />
                    ),
                  )}
                </View>
              )}
  
              {/* Slice 9 — a gentle, Buddy-voiced runway nudge under the week's Steps (title-free). */}
              {showRunwayNudge && (
                <View style={[styles.nudge, { backgroundColor: theme.tealTint, borderColor: theme.tint }]}>
                  <Ionicons
                    name="sparkles-outline"
                    size={16}
                    color={theme.tealStrong}
                    style={styles.nudgeIcon}
                  />
                  <ThemedText type="small" style={[styles.nudgeText, { color: theme.tealStrong }]}>
                    {t('dependents.nudge.line')}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Managed Off/Fixed reminder (D40) — view, edit, or disable; Smart is deferred. Hidden on
              a canceled Journey: it fires nothing ever again, so offering a reminder editor would be
              a control over a Journey that no longer runs. */}
          {!isCanceled && <JourneyReminderCard journey={journey} />}

          {/* Support Circle (D2) — invite friends to support this Journey; renders only when the
              social pillar is configured. Companion bundle is coach-Journeys-only. Hidden once
              canceled: the cancel already closed the live invites and withdrew what was published. */}
          {!isCanceled && <JourneySupportCircle journey={journey} journeyStatus={view.status} />}

          {/* The user's "why" */}
          {journey.why.length > 0 && (
            <View style={styles.block}>
              <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
                {t('detail.yourWhy')}
              </ThemedText>
              <View style={styles.whyList}>
                {journey.why.map((line, index) => (
                  <ThemedView
                    key={`${line}_${index}`}
                    type="backgroundElement"
                    style={[styles.whyCard, { borderColor: theme.hairline }, CARD_SHADOW]}>
                    <ThemedText type="small" style={{ color: theme.coralStrong }}>
                      ♥
                    </ThemedText>
                    <ThemedText type="default" style={styles.whyText}>
                      {line}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            </View>
          )}

          {/* The Journey's own actions, in one family at the END of the list (founder decision,
              Device QA 2026-08-17 B3). This is the screen where a Journey is MANAGED, so nothing is
              hidden behind a ⋯ here: the de-emphasis comes from POSITION (last, after everything the
              Journey is) and from INK, which is the honest arrangement on a settings surface.
              Ascending weight: Pause is reversible, Cancel stops the plan but keeps the record,
              Delete erases it. */}
          {canFreeze && (
            <ActionRow
              icon={isFrozen ? 'play-outline' : 'pause-outline'}
              label={isFrozen ? t('detail.resume') : t('detail.freeze')}
              a11yLabel={isFrozen ? t('detail.resumeA11y') : t('detail.freezeA11y')}
              onPress={onToggleFreeze}
            />
          )}

          {/* Share completion (I1, Slice 6) — a completed Journey keeps a reusable "Share completion"
              action that reopens the card + share (no celebratory animation). PRD §6. */}
          {journey.status === 'completed' && (
            <ActionRow
              icon="share-outline"
              label={t('detail.shareCompletion')}
              a11yLabel={t('detail.shareCompletion')}
              onPress={() =>
                router.push({
                  pathname: '/completion',
                  params: { journeyId: journey.id, mode: 'reopen' },
                })
              }
            />
          )}

          {/* Cancel — NEUTRAL ink, and no prohibition glyph. Stopping a Journey is a legitimate
              choice about a life, not a data wipe; colouring it as a warning would put judgement on
              it, which is the same thing the confirmation copy refuses to do. */}
          {canCancel && (
            <ActionRow
              icon="stop-circle-outline"
              label={t('detail.cancel')}
              hint={t('detail.cancelHint')}
              a11yLabel={t('detail.cancelA11y')}
              tone="neutral"
              onPress={() => setConfirmingCancel(true)}
            />
          )}

          {/* Delete — the one action that ERASES data, so it is the one that carries the danger ink. */}
          <ActionRow
            icon="trash-outline"
            label={t('detail.delete')}
            hint={t('detail.deleteHint')}
            a11yLabel={t('detail.deleteA11y')}
            tone="danger"
            onPress={() => setConfirmingDelete(true)}
          />
        </ScrollView>

        {/* Start Journey (§9) — the Future Journey's one action, in place of the check-in CTA. It is
            the ONLY way a manual-start Journey ever begins, and the early-start path for a scheduled
            one. Turquoise, not coral: this is an invitation, not a deadline. */}
        {isFutureMode && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detail.startJourneyA11y')}
              onPress={() => setConfirmingStart(true)}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.teal },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                {t('detail.startJourney')}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* NO check-in CTA here, deliberately (founder, 2026-08-18). This screen MANAGES a
            Journey; Home is where the day's work gets reported, and PushApp's Home has been
            action-based rather than Journey-based since the Product Bible §11.2. A pinned reporting
            button at the bottom of a management screen was a second front door to the same action,
            and the founder read the screen's action list as overcrowded because of it. Reporting a
            Step from here is still possible — the Step rows above take a swipe. */}

        {/* Start confirmation (§9) — states the EFFECTIVE start, and, when the user is starting a
            scheduled Journey ahead of its day, exactly what happens to the plan: every Step moves by
            the same number of days, in the same order, with the same content. No warning tone: this
            is a good thing happening early, and nothing here is irreversible in the way a delete is. */}
        <Modal
          visible={confirmingStart}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmingStart(false)}>
          <Pressable style={styles.modalScrim} onPress={() => setConfirmingStart(false)}>
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                CARD_SHADOW,
              ]}>
              <ThemedText type="subtitle">{t('detail.startConfirm.title')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('detail.startConfirm.window', {
                  start: shortDate(startPreview?.startsAt ?? Date.now()),
                  end: shortDate(startPreview?.endsAt ?? Date.now()),
                })}
              </ThemedText>
              {startPreview != null && startPreview.earlyByDays > 0 && futureStart?.kind === 'scheduled' && (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('detail.startConfirm.shift', {
                    count: startPreview.earlyByDays,
                    planned: shortDate(futureStart.at),
                  })}
                </ThemedText>
              )}
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.startConfirm.dismiss')}
                  onPress={() => setConfirmingStart(false)}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    { backgroundColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t('detail.startConfirm.dismiss')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.startConfirm.confirmA11y')}
                  onPress={onConfirmStart}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    { backgroundColor: theme.teal },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                    {t('detail.startConfirm.confirm')}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Destructive confirmation — nothing is removed until the user confirms here. */}
        <Modal
          visible={confirmingDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmingDelete(false)}>
          <Pressable style={styles.modalScrim} onPress={() => setConfirmingDelete(false)}>
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                CARD_SHADOW,
              ]}>
              <ThemedText type="subtitle">{t('detail.deleteConfirmTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('detail.deleteConfirmBody')}
              </ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('cancel', { ns: 'common' })}
                  onPress={() => setConfirmingDelete(false)}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    { backgroundColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t('cancel', { ns: 'common' })}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.deleteA11y')}
                  onPress={onConfirmDelete}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    { backgroundColor: theme.coral },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {t('delete', { ns: 'common' })}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Cancel confirmation — the only gate, and the last chance: canceling is final, with no
            undo window. It states the real Step count, what stays, and that it can't be undone; it
            never shows what the user is about to lose, and no coach stands in front of it. */}
        <CancelJourneySheet
          visible={confirmingCancel}
          stepsToRemove={stepsToRemove}
          canPause={view.status === 'active'}
          supportCircle={supportCircle}
          onDismiss={() => setConfirmingCancel(false)}
          onPauseInstead={() => {
            setConfirmingCancel(false);
            core.freezeJourney(journey.id);
          }}
          onConfirm={onConfirmCancel}
        />

        {/* Gentle final-step confirmation — only when the check-in would complete the Journey (D41). */}
        <FinalStepConfirmSheet visible={confirmVisible} onConfirm={confirm} onCancel={cancel} />
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Back chip + a small "JOURNEY" eyebrow over a SECONDARY (de-emphasized) title. When `onEdit` is
 * provided a pencil trailing action opens the coach-led edit flow; it is omitted (hidden) for a
 * completed Journey or when the live coach is unavailable. Back and Edit are the only controls up
 * here — the Journey's own actions live at the end of its list, where they can be read in context.
 */
function Header({
  onBack,
  eyebrow,
  title,
  onEdit,
  editLabel,
  backLabel,
}: {
  onBack: () => void;
  eyebrow: string;
  title: string;
  onEdit?: () => void;
  editLabel?: string;
  backLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backChip,
          { backgroundColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}>
        {/* '›' is a Bidi-MIRRORED character, so inside an RTL paragraph the renderer would
            flip it a second time; isolating pins it to its own run and the scaleX below is
            the only mirror. "Back" then always points to where we came from. */}
        <ThemedText
          type="subtitle"
          themeColor="textSecondary"
          style={[styles.backGlyph, { transform: [{ scaleX: isRTL() ? 1 : -1 }] }]}>
          {isolate('›')}
        </ThemedText>
      </Pressable>
      <View style={styles.headerText}>
        <ThemedText type="small" themeColor="textMuted" style={styles.eyebrow}>
          {eyebrow}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>
      {onEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editLabel}
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => [
            styles.editChip,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="pencil" size={18} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * One full-width action at the END of the Journey's action list — the shared shell behind
 * Pause/Resume, Share completion, Cancel and Delete, so the four read as ONE family (founder
 * decision, Device QA 2026-08-17 B3). They were briefly hidden behind a ⋯; on a screen whose whole
 * job is managing a Journey, concealing two of its actions was the wrong kind of quiet.
 *
 * `tone` sets the ink and nothing else:
 *  · `accent`  — the reversible, everyday controls (Pause / Resume, Share completion);
 *  · `neutral` — Cancel. A legitimate choice about a life, never coloured as a warning;
 *  · `danger`  — Delete, the ONE action that erases data (the documented meaning of danger ink).
 *
 * `hint` adds the plain second line for the two actions that end a Journey, so what happens is
 * readable BEFORE the confirmation rather than only inside it.
 */
function ActionRow({
  icon,
  label,
  hint,
  a11yLabel,
  tone = 'accent',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  a11yLabel: string;
  tone?: 'accent' | 'neutral' | 'danger';
  onPress: () => void;
}) {
  const theme = useTheme();
  const ink = tone === 'danger' ? theme.danger : tone === 'neutral' ? theme.textSecondary : theme.tealStrong;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={styles.actionRowMain}>
        <Ionicons name={icon} size={18} color={ink} />
        <ThemedText type="smallBold" style={{ color: ink }}>
          {label}
        </ThemedText>
      </View>
      {hint ? (
        <ThemedText type="small" themeColor="textMuted" style={styles.actionRowHint}>
          {hint}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function StepRow({
  step,
  isNext,
  reportStatus,
}: {
  step: Step;
  isNext: boolean;
  /** The derived Daily-Reporting status (D36) — shows a calm Partial / Not-completed chip. */
  reportStatus: StepStatus;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const status = step.done ? 'done' : isNext ? 'current' : 'upcoming';

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.stepRow,
        { borderColor: theme.hairline },
        CARD_SHADOW,
        isNext && { borderColor: theme.teal, borderWidth: 1.5 },
      ]}>
      <View
        style={[
          styles.stepDot,
          status === 'done' && { backgroundColor: theme.teal, borderColor: theme.teal },
          status === 'current' && { borderColor: theme.teal },
          status === 'upcoming' && { borderColor: theme.hairline },
        ]}>
        {status === 'done' && (
          <ThemedText style={[styles.check, { color: theme.backgroundElement }]}>✓</ThemedText>
        )}
      </View>
      <View style={styles.stepText}>
        <View style={styles.stepTitleRow}>
          <ThemedText
            type="default"
            numberOfLines={1}
            themeColor={status === 'upcoming' ? 'textSecondary' : 'text'}
            style={styles.stepTitle}>
            {step.title}
          </ThemedText>
          {step.isStarterStep && (
            <ThemedView type="backgroundSelected" style={styles.badge}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('detail.starter')}
              </ThemedText>
            </ThemedView>
          )}
          {/* Calm, non-failure Partial / Not-completed chip (D36) — nothing for done/unreported. */}
          {!step.done && <StepStatusChip status={reportStatus} />}
        </View>
        {step.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {step.description}
          </ThemedText>
        ) : null}
      </View>
      {status === 'current' && (
        <ThemedText type="small" style={{ color: theme.tealStrong }}>
          {t('detail.next')}
        </ThemedText>
      )}
    </ThemedView>
  );
}

/**
 * A dependency STACK (Step Dependencies, Slice 8): the actionable `top` Step as a normal, interactive
 * {@link StepRow}, with `depth` EQUAL-SIZE blank card layers stacked directly BEHIND it — a deck. Each
 * hidden layer is nudged ~{@link STACK_OFFSET}px down and toward the reading-direction's trailing edge
 * (mirrors under RTL via `dir`), with a blank face so only the top card shows content. The hidden
 * layers are decorative and non-interactive; only the top card reports. A gentle "waiting" hint sits
 * below the deck, framed as coming-up-next (never "locked / blocked"). Matches the approved Rev 2
 * mockup (04_Product/UX/Step_Dependency_Cards.html).
 */
function StepStack({
  top,
  depth,
  isNext,
  reportStatus,
}: {
  top: Step;
  depth: number;
  isNext: boolean;
  reportStatus: StepStatus;
}) {
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const dir = isRTL() ? -1 : 1;
  // Layers 1..depth, nearest-behind → farthest; the farthest sits deepest (largest offset).
  const layers = Array.from({ length: depth }, (_, i) => i + 1);

  return (
    <View>
      <View style={[styles.stackShell, { marginBottom: depth * STACK_OFFSET }]}>
        {layers.map((n) => (
          <View
            key={n}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.stackBehind,
              CARD_SHADOW,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.hairline,
                transform: [
                  { translateX: dir * n * STACK_OFFSET },
                  { translateY: n * STACK_OFFSET },
                ],
              },
            ]}
          />
        ))}
        <View style={styles.stackFront}>
          <StepRow step={top} isNext={isNext} reportStatus={reportStatus} />
        </View>
      </View>
      <View
        style={styles.stackHint}
        accessible
        accessibilityLabel={t('dependents.waiting.a11y', { predecessor: top.title })}>
        <Ionicons
          name={isRTL() ? 'chevron-back' : 'chevron-forward'}
          size={13}
          color={theme.textSecondary}
          style={styles.stackHintIcon}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.stackHintText}>
          {t('dependents.waiting.hint', { count: depth, predecessor: top.title })}
        </ThemedText>
      </View>
    </View>
  );
}

/** Calm work-surface card depth (matches ExploreCards.tsx) — subtle, not game-juice. */
const CARD_SHADOW = {
  shadowColor: '#2E2E2C',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

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
  editChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    lineHeight: 26,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  eyebrow: {
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  progressCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  track: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  block: {
    gap: Spacing.two,
  },
  blockLabel: {
    marginBottom: Spacing.half,
  },
  dreamList: {
    gap: Spacing.two,
  },
  dreamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  dreamIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dreamTitle: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pagerBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBtnMuted: {
    opacity: 0.4,
  },
  weekLabel: {
    minWidth: 96,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stepList: {
    gap: Spacing.two,
  },
  // ── Dependency deck (Slice 8) ──────────────────────────────────────────────
  // The shell is sized by the in-flow top card; the blank layers fill it absolutely and are then
  // translated, so they stay pixel-identical to the top card (a translate never resizes). marginBottom
  // is set inline from `depth` to clear the deepest offset layer before the hint.
  stackShell: {
    position: 'relative',
  },
  stackBehind: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  stackFront: {
    zIndex: 1,
  },
  stackHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.two,
    paddingStart: Spacing.one,
  },
  stackHintIcon: {
    marginTop: 2,
  },
  stackHintText: {
    flex: 1,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  nudgeIcon: {
    marginTop: 1,
  },
  nudgeText: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    // Colour is applied inline from the active theme (backgroundElement).
    fontSize: 13,
    lineHeight: 16,
  },
  stepText: {
    flex: 1,
    gap: Spacing.half,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  stepTitle: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.chip,
  },
  whyList: {
    gap: Spacing.two,
  },
  whyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  whyText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  cta: {
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  // The shared shell for every end-of-list action (Pause/Resume, Share completion, Cancel, Delete) —
  // the same card the rest of the screen uses, so weight is carried by ink and order, not by shape.
  actionRow: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  actionRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionRowHint: {
    textAlign: 'center',
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pausedText: {
    flex: 1,
    gap: 1,
  },
  canceledBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  futureBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modalBtn: {
    flex: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
