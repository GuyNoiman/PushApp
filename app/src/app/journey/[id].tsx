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
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { shortDate, toJourneyView } from '@/components/journey/journeyView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Step } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { core, snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/journeys'));

  const journey = snapshot?.journeys.find((j) => j.id === id);

  if (!journey) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Header onBack={dismiss} eyebrow="JOURNEY" title="Not found" />
          <View style={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              This Journey isn&apos;t available. It may have been removed.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const view = toJourneyView(journey);
  const nextStep = journey.steps.find((s) => !s.done);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header onBack={dismiss} eyebrow="JOURNEY" title={journey.title} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Phase / progress card */}
          <ThemedView type="backgroundElement" style={[styles.phaseCard, { borderColor: theme.hairline }]}>
            <ThemedText type="subtitle">
              Phase {view.phase} of {view.phases}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Started {shortDate(view.startedAt)} · ends {shortDate(view.endsAt)}
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
              {view.doneSteps} of {view.totalSteps} Steps done
            </ThemedText>
          </ThemedView>

          {/* Steps */}
          <View style={styles.block}>
            <ThemedText type="smallBold" style={[styles.blockLabel, { color: theme.goldStrong }]}>
              Steps
            </ThemedText>
            {journey.steps.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No Steps yet — your rhythm guides this Journey.
              </ThemedText>
            ) : (
              <View style={styles.stepList}>
                {journey.steps.map((step) => (
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
                Your why
              </ThemedText>
              <View style={styles.whyList}>
                {journey.why.map((line, index) => (
                  <ThemedView
                    key={`${line}_${index}`}
                    type="backgroundElement"
                    style={[styles.whyCard, { borderColor: theme.hairline }]}>
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
        </ScrollView>

        {/* Check in on the next Step (matches the mockup's bottom CTA). */}
        {nextStep && !journey.completedAt && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Check in on ${nextStep.title}`}
              onPress={() => core.checkInStep(journey.id, nextStep.id)}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.coral },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                Check in
              </ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Back chip + a small "JOURNEY" eyebrow over a SECONDARY (de-emphasized) title. */
function Header({ onBack, eyebrow, title }: { onBack: () => void; eyebrow: string; title: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={({ pressed }) => [
          styles.backChip,
          { backgroundColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="subtitle" themeColor="textSecondary" style={styles.backGlyph}>
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
    </View>
  );
}

function StepRow({ step, isNext }: { step: Step; isNext: boolean }) {
  const theme = useTheme();
  const status = step.done ? 'done' : isNext ? 'current' : 'upcoming';

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.stepRow,
        { borderColor: theme.hairline },
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
          <ThemedText style={styles.check}>✓</ThemedText>
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
                Starter
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
          Next
        </ThemedText>
      )}
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
    height: 8,
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
    color: '#FFFFFF',
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
});
