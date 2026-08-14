/**
 * Weekly Review — the one user-level screen shown after a week closes (Weekly_Review_PRD, D40).
 * It ALWAYS opens with the past-week summary ("X Steps done", any paused/finished Journeys), then a
 * next-week line that is never empty, and — only when useful — a suggested plan change to approve.
 *
 * The screen auto-opens once on the first app entry after week close; the user may minimize it ("Not
 * now") but cannot resolve it without choosing an outcome: Approve (apply forward-only), Keep my plan
 * as is (dismiss), or Talk to your coach. Presentational only (Engineering Bible §19): all analysis
 * lives in AppCore / the pure review engine; this screen only renders it and calls the facade.
 */
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

export default function WeeklyReviewScreen() {
  const { core, ready } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('weeklyReview');

  const review = ready ? core.getPendingWeeklyReview() : null;

  // Stamp "opened" once so the auto-open only fires on the FIRST app entry after week close (§9).
  useEffect(() => {
    if (review) core.markWeeklyReviewOpened();
  }, [core, review]);

  const dismissNav = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const changeKinds = useMemo(() => {
    const kinds = new Set<string>();
    for (const proposal of review?.proposals ?? []) {
      for (const kind of proposal.adjustments) kinds.add(kind);
    }
    return kinds;
  }, [review]);

  // The never-empty next-week line, resolved from the fallback branch the engine picked (§8).
  const nextWeekLine = useMemo(() => {
    const next = review?.nextWeek;
    if (!next) return '';
    if (next.kind === 'steps') return t('screen.nextSteps', { count: next.stepCount ?? 0 });
    if (next.kind === 'dreamSuggestion') {
      return next.dreamAddressed
        ? t('screen.nextDreamAddressed', { dream: next.dreamTitle ?? '' })
        : t('screen.nextDreamNew', { dream: next.dreamTitle ?? '' });
    }
    return t('screen.nextCoach');
  }, [review, t]);

  // A resolved/absent review (e.g. approved in another tab, or expired) has nothing to show.
  if (!review) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Pressable onPress={dismissNav} style={styles.doneRow}>
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              {t('screen.minimize')}
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const hasChanges = review.proposals.length > 0;
  const atRisk = review.proposals.some((p) => p.atRisk);

  const approve = () => {
    core.approveWeeklyReview();
    dismissNav();
  };
  const dismiss = () => {
    core.dismissWeeklyReview();
    dismissNav();
  };
  const openCoach = () => {
    // Talk to the coach IS an outcome (§8): resolve the review, then open the coach conversation.
    core.dismissWeeklyReview();
    router.push('/coach' as Href);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="title">{t('screen.title')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screen.minimize')}
            onPress={dismissNav}
            hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: theme.textMuted }}>
              {t('screen.minimize')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Past-week summary — always first (§8) ── */}
          <Section heading={t('screen.summaryHeading')}>
            <ThemedText type="subtitle" style={{ color: theme.tealStrong }}>
              {t('screen.stepsDone', { count: review.summary.completed })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('screen.breakdown', {
                partial: review.summary.partial,
                notCompleted: review.summary.notCompleted,
                unreported: review.summary.unreported,
              })}
            </ThemedText>
            {review.summary.completedJourneyTitles.length > 0 ? (
              <ThemedText type="small" style={{ color: theme.goldStrong }}>
                {t('screen.completedNote', {
                  titles: review.summary.completedJourneyTitles.join(', '),
                })}
              </ThemedText>
            ) : null}
            {review.summary.frozenJourneyTitles.length > 0 ? (
              <ThemedText type="small" themeColor="textMuted">
                {t('screen.frozenNote', {
                  count: review.summary.frozenJourneyTitles.length,
                  titles: review.summary.frozenJourneyTitles.join(', '),
                })}
              </ThemedText>
            ) : null}
          </Section>

          {/* ── Next week — never empty (§8) ── */}
          <Section heading={t('screen.nextWeekHeading')}>
            <ThemedText type="default" themeColor="textSecondary">
              {nextWeekLine}
            </ThemedText>
          </Section>

          {/* ── Suggested change (optional) — with no proposals the section reads as reassurance,
              which is the normal state while the adaptive Step-plan half is off ── */}
          <Section heading={hasChanges ? t('screen.changesHeading') : t('screen.noChangesHeading')}>
            {hasChanges ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('screen.changesLead')}
                </ThemedText>
                {changeKinds.has('rescheduled') ? (
                  <ChangeLine text={t('screen.changeRescheduled')} color={theme.text} />
                ) : null}
                {changeKinds.has('resized') ? (
                  <ChangeLine text={t('screen.changeResized')} color={theme.text} />
                ) : null}
                {changeKinds.has('removed') ? (
                  <ChangeLine text={t('screen.changeRemoved')} color={theme.text} />
                ) : null}
                {atRisk ? (
                  <ThemedText type="small" style={{ color: theme.goldStrong }}>
                    {t('screen.atRisk')}
                  </ThemedText>
                ) : null}
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t('screen.noChanges')}
              </ThemedText>
            )}
          </Section>
        </ScrollView>

        {/* ── Outcomes — the user must choose one (minimize is separate) ── */}
        <View style={styles.footer}>
          {hasChanges ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screen.approve')}
                onPress={approve}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('screen.approve')}
                </ThemedText>
              </Pressable>
              <View style={styles.secondaryRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('screen.keepOut')}
                  onPress={dismiss}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.hairline },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t('screen.keepOut')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('screen.openCoach')}
                  onPress={openCoach}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.tint },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                    {t('screen.openCoach')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.secondaryRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screen.acknowledge')}
                onPress={dismiss}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.grow,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('screen.acknowledge')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screen.openCoach')}
                onPress={openCoach}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                  {t('screen.openCoach')}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionHeading}>
        {heading}
      </ThemedText>
      {children}
    </View>
  );
}

function ChangeLine({ text, color }: { text: string; color: string }) {
  return (
    <ThemedText type="small" style={{ color }}>
      {`• ${text}`}
    </ThemedText>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  section: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeading: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
  doneRow: {
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
