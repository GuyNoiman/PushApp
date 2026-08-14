/**
 * Inactivity return — the calm "welcome back" screen after the local InactivityEngine paused the
 * account's Journeys for a long absence (Account Inactivity Freeze, J5, LOCAL-FIRST POC). It opens
 * once, automatically, on the first foreground after the freeze; afterwards a persistent Home CTA is
 * the entry point (mirrors the Weekly Review latch).
 *
 * Three ways forward (never a wall of missed days):
 *   TALK TO THE COACH        — hand off to the coach conversation.
 *   CHOOSE JOURNEYS TO RESUME — reveal the grouped list and resume any away-frozen Journey one tap
 *                               at a time (keep it paused, or cancel it — "I'm not picking this one
 *                               back up" is a legitimate return decision, Journey Abandonment §7.1).
 *   NOT NOW                   — just close. It does NOT resolve the return (per-foreground dedupe
 *                               stops it re-popping this session); the Home CTA brings it back later.
 *
 * Presentational only (Engineering Bible §19): all state + provenance logic lives in AppCore; this
 * screen renders the read model and calls the facade.
 */
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReturnJourneyList, type ReturnJourneyRow } from '@/components/inactivity/ReturnJourneyList';
import { CancelJourneySheet } from '@/components/journey/CancelJourneySheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { unlivedStepCount } from '@/core/status/stepHistory';
import { useTheme } from '@/hooks/use-theme';
import { useSupportCircleImpact } from '@/hooks/useSupportCircleImpact';
import { useApp } from '@/state/AppProvider';

export default function ReturnScreen() {
  const { core, snapshot, ready } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('inactivity');

  const [showList, setShowList] = useState(false);
  // The Journey whose cancel confirmation is open (id), or null. Canceling from here goes through the
  // SAME sheet as the Journey detail screen — one confirmation, one wording, one set of consequences.
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Read the pending return (PURE getter). Recomputed from the snapshot so resuming a Journey (which
  // notifies subscribers) re-renders the list and auto-resolves + closes when the last one is handled.
  const returnState = ready && snapshot ? core.getInactivityReturn() : null;

  // Stamp "opened" once so the auto-open only fires on the FIRST foreground after the freeze.
  useEffect(() => {
    if (returnState) core.markInactivityReturnOpened();
  }, [core, returnState]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Resolve titles from the snapshot (ids-only from the facade keeps titles out of the core payload).
  const titleOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of snapshot?.journeys ?? []) map.set(j.id, j.title);
    return (id: string): ReturnJourneyRow => ({ id, title: map.get(id) ?? '' });
  }, [snapshot?.journeys]);

  // The REAL Support-Circle consequence for the Journey being canceled, read only while its
  // confirmation is open — same hook, same honesty rule as the Journey-detail sheet: nothing is
  // stated until the counts are known, and a failed read never blocks the cancel.
  const supportCircle = useSupportCircleImpact(cancelingId ?? undefined, cancelingId != null);

  // A resolved / absent return (e.g. every away-frozen Journey already resumed) has nothing to show.
  if (!returnState) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Pressable onPress={close} style={styles.doneRow}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              {t('return.done')}
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const away = returnState.frozenJourneyIds.map(titleOf);
  const future = returnState.futureJourneyIds.map(titleOf);
  const manual = returnState.manualFrozenJourneyIds.map(titleOf);

  // The Journey behind the open cancel confirmation, resolved from the snapshot so the sheet can
  // state the REAL number of never-reported Steps it will remove.
  const cancelTarget = cancelingId
    ? (snapshot?.journeys.find((j) => j.id === cancelingId) ?? null)
    : null;

  const openCoach = () => router.push('/coach' as Href);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="title">{t('return.title')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('return.close')}
            onPress={close}
            hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: theme.textMuted }}>
              {t('return.close')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="default" themeColor="textSecondary">
            {t('return.intro')}
          </ThemedText>

          {showList ? (
            <ReturnJourneyList
              away={away}
              future={future}
              manual={manual}
              onResume={(id) => core.resumeInactivityJourney(id)}
              onKeepPaused={(id) => core.keepInactivityJourneyFrozen(id)}
              onCancel={(id) => setCancelingId(id)}
            />
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('return.talkToCoach')}
            onPress={openCoach}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.tint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
              {t('return.talkToCoach')}
            </ThemedText>
          </Pressable>
          {!showList ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('return.chooseToResume')}
              onPress={() => setShowList(true)}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                {t('return.chooseToResume')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* Cancel confirmation — final, no undo. `canPause` is false here: these Journeys are already
            paused, so "Pause it instead" would be an offer of the state they are already in. Canceling
            does NOT resolve the inactivity marker — returning is the return flow's decision, not this
            one — and a canceled Journey simply drops out of the resume set on the next render. */}
        {cancelTarget && (
          <CancelJourneySheet
            visible
            stepsToRemove={unlivedStepCount(cancelTarget, core.getReasonLog())}
            canPause={false}
            supportCircle={supportCircle}
            onDismiss={() => setCancelingId(null)}
            onPauseInstead={() => setCancelingId(null)}
            onConfirm={() => {
              core.abandonJourney(cancelTarget.id);
              setCancelingId(null);
            }}
          />
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    height: 52,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneRow: {
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
