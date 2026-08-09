/**
 * Journey detail — everything about one Journey in one place (screen-03, and
 * 04_Product/UX/Journey_Detail spec). Opened by tapping a Journey card.
 *
 * Per the finalized mockup the Journey name reads as a SECONDARY title under a
 * small "JOURNEY" eyebrow — deliberately de-emphasized vs top-level tab titles so
 * the hierarchy stays clear. Shows the current Phase + progress + start/end window,
 * the Steps list with per-Step status, and the user's "why" list.
 *
 * Presentational only — reads the Journey from the snapshot by id and reports the
 * check-in intent upward; all rewards/Buddy logic runs in the engines (§19).
 *
 * Note: `journey/new` is a static sibling route; this dynamic `[id]` route resolves
 * every other id. If the id is unknown (stale deep-link), a gentle not-found shows.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { shortDate, stepsByWeek, toJourneyView } from '@/components/journey/journeyView';
import { featureFlags } from '@/core/config/featureFlags';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Step } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { core, snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('journey');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // null = follow the current week; a number = the week the user paged to.
  const [weekIndex, setWeekIndex] = useState<number | null>(null);

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
  const nextStep = journey.steps.find((s) => !s.done);

  // Weekly model: page through the Journey's Steps one week at a time (founder design).
  const weekly = stepsByWeek(journey);
  const shownWeek = Math.min(weekly.totalWeeks - 1, Math.max(0, weekIndex ?? weekly.currentWeek));
  const weekSteps = weekly.weeks[shownWeek] ?? [];
  const goWeek = (delta: number) =>
    setWeekIndex(Math.min(weekly.totalWeeks - 1, Math.max(0, shownWeek + delta)));

  // Editing runs through the coach's understanding call, so it is gated on liveCoach; a completed
  // Journey is never editable (its plan is finished).
  const canEdit = !journey.completedAt && featureFlags.liveCoach;
  const onEdit = canEdit
    ? () => router.push({ pathname: '/coach', params: { mode: 'edit', journeyId: journey.id } })
    : undefined;

  // Freeze/Resume (J3): a paused Journey keeps all its progress but fires no reminders and hides its
  // check-in CTA until resumed. Completed Journeys can't be paused.
  const isFrozen = view.status === 'frozen';
  const canFreeze = !journey.completedAt;
  const onToggleFreeze = () => {
    if (isFrozen) core.resumeJourney(journey.id);
    else core.freezeJourney(journey.id);
  };

  const onConfirmDelete = () => {
    setConfirmingDelete(false);
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
          {/* Phase / progress card */}
          <ThemedView
            type="backgroundElement"
            style={[styles.phaseCard, { borderColor: theme.hairline }, CARD_SHADOW]}>
            <ThemedText type="subtitle">
              {t('detail.phase', { phase: view.phase, phases: view.phases })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.window', { start: shortDate(view.startedAt), end: shortDate(view.endsAt) })}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: theme.teal, width: `${Math.round(view.progress * 100)}%` },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.stepsDone', { done: view.doneSteps, total: view.totalSteps })}
            </ThemedText>
          </ThemedView>

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

          {/* Steps by week — page through the plan one week at a time (founder design). */}
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
            {weekSteps.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('detail.emptyWeek')}
              </ThemedText>
            ) : (
              <View style={styles.stepList}>
                {weekSteps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    isNext={!journey.completedAt && step.id === nextStep?.id}
                  />
                ))}
              </View>
            )}
          </View>

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

          {/* Pause / Resume (J3) — non-destructive, keeps all progress. Hidden once completed. */}
          {canFreeze && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFrozen ? t('detail.resumeA11y') : t('detail.freezeA11y')}
              onPress={onToggleFreeze}
              style={({ pressed }) => [
                styles.freezeRow,
                { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <Ionicons
                name={isFrozen ? 'play-outline' : 'pause-outline'}
                size={18}
                color={theme.tealStrong}
              />
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                {isFrozen ? t('detail.resume') : t('detail.freeze')}
              </ThemedText>
            </Pressable>
          )}

          {/* Permanent, deliberate delete — visually separated, destructive ink. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('detail.deleteA11y')}
            onPress={() => setConfirmingDelete(true)}
            style={({ pressed }) => [
              styles.deleteRow,
              { borderColor: theme.hairline },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="trash-outline" size={18} color={theme.coralStrong} />
            <ThemedText type="smallBold" style={{ color: theme.coralStrong }}>
              {t('detail.delete')}
            </ThemedText>
          </Pressable>
        </ScrollView>

        {/* Check in on the next Step (matches the mockup's bottom CTA). Hidden while paused. */}
        {nextStep && !journey.completedAt && !isFrozen && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detail.checkInA11y', { title: nextStep.title })}
              onPress={() => core.checkInStep(journey.id, nextStep.id)}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.coral },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {t('detail.checkIn')}
              </ThemedText>
            </Pressable>
          </View>
        )}

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
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Back chip + a small "JOURNEY" eyebrow over a SECONDARY (de-emphasized) title. When `onEdit` is
 * provided a pencil trailing action opens the coach-led edit flow; it is omitted (hidden) for a
 * completed Journey or when the live coach is unavailable.
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
        {/* '›' flipped to a back-pointing chevron: mirror in LTR (points left), leave
            upright in RTL (points right) so "back" always points to where we came from. */}
        <ThemedText
          type="subtitle"
          themeColor="textSecondary"
          style={[styles.backGlyph, { transform: [{ scaleX: isRTL() ? 1 : -1 }] }]}>
          ›
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

function StepRow({ step, isNext }: { step: Step; isNext: boolean }) {
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
  phaseCard: {
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
  freezeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
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
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
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
