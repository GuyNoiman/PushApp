/**
 * Inactivity return — the calm "welcome back" screen after the local InactivityEngine paused the
 * account's Journeys for a long absence (Account Inactivity Freeze, J5, LOCAL-FIRST POC). It opens
 * once, automatically, on the first foreground after the freeze; afterwards a persistent Home CTA is
 * the entry point (mirrors the Weekly Review latch).
 *
 * Three ways forward (never a wall of missed days):
 *   TALK TO THE COACH        — hand off to the coach conversation.
 *   CHOOSE JOURNEYS TO RESUME — reveal the grouped list and resume any away-frozen Journey one tap
 *                               at a time (or keep it paused).
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

export default function ReturnScreen() {
  const { core, snapshot, ready } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('inactivity');

  const [showList, setShowList] = useState(false);

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
