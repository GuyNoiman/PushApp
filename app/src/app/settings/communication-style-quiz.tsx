/**
 * Communication Style questionnaire (PRD §5–§8) — the six-message comparison that sets how PushApp
 * speaks to the user. Reachable from Settings (Retake) and from the onboarding completion seam. The
 * flow + persistence live in {@link '@/state/useCommunicationQuiz'}; this screen is presentational
 * (Engineering Bible §19): it renders the current `phase`, randomizes answer order per page (PRD §5),
 * and calls the controller's actions.
 *
 * PRD guardrails honoured here: no style names/scores shown during selection, answer order randomized
 * independently per page, "Question X of 6" + progress, Back edits, Maybe later exits without changing
 * the saved style. The catalog copy is authored natively per language in the `communication` namespace.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { StyleMessageCard } from '@/components/communication/StyleMessageCard';
import {
  OnboardingPrimaryButton,
  OnboardingScaffold,
  OnboardingSecondaryButton,
} from '@/components/onboarding/OnboardingScaffold';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { COMMUNICATION_PROFILE_IDS, type CommunicationProfileId } from '@/core/communication/communicationProfile';
import { shuffle, type CommunicationEventId } from '@/core/communication/questionnaire';
import { useCommunicationQuiz } from '@/state/useCommunicationQuiz';

export default function CommunicationStyleQuizScreen() {
  const router = useRouter();
  const { t } = useTranslation('communication');
  const params = useLocalSearchParams<{ restart?: string }>();
  const quiz = useCommunicationQuiz();
  const { phase } = quiz;

  // A Retake from Settings passes ?restart=1 → begin fresh at the intro once progress has loaded
  // (otherwise a completed prior run would resume straight to its result).
  const didRestart = useRef(false);
  useEffect(() => {
    if (params.restart === '1' && phase.kind !== 'loading' && !didRestart.current) {
      didRestart.current = true;
      quiz.restart();
    }
  }, [params.restart, phase.kind, quiz]);

  const exit = () => router.back();

  if (phase.kind === 'loading') {
    return <OnboardingScaffold footer={null}>{null}</OnboardingScaffold>;
  }

  if (phase.kind === 'intro') {
    return (
      <OnboardingScaffold
        onBack={exit}
        footer={
          <>
            <OnboardingPrimaryButton label={t('quiz.intro.start')} onPress={quiz.start} />
            <OnboardingSecondaryButton label={t('quiz.intro.later')} onPress={exit} />
          </>
        }>
        <ThemedText type="title">{t('quiz.intro.title')}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          {t('quiz.intro.p1')}
        </ThemedText>
      </OnboardingScaffold>
    );
  }

  if (phase.kind === 'question') {
    return <QuestionPage phase={phase} quiz={quiz} onExit={exit} />;
  }

  if (phase.kind === 'tieBreak') {
    return <TieBreakPage styles={phase.styles} quiz={quiz} onBack={quiz.back} />;
  }

  // result
  return <ResultPage styleId={phase.styleId} onSave={() => { quiz.save(); exit(); }} onRetry={quiz.retry} onBack={quiz.back} />;
}

/** A random-but-stable answer order for a page, reshuffled only when its key (the event) changes. */
function useShuffledOrder(key: string, styles: readonly CommunicationProfileId[]): CommunicationProfileId[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle only on a new page key (PRD §5).
  return useMemo(() => shuffle(styles), [key]);
}

/** One of the six scored comparison pages. */
function QuestionPage({
  phase,
  quiz,
  onExit,
}: {
  phase: { index: number; total: number; event: CommunicationEventId };
  quiz: ReturnType<typeof useCommunicationQuiz>;
  onExit: () => void;
}) {
  const { t } = useTranslation('communication');
  const order = useShuffledOrder(phase.event, COMMUNICATION_PROFILE_IDS);
  const selected = quiz.answerFor(phase.event);

  return (
    <OnboardingScaffold
      onBack={quiz.back}
      progress={{ current: phase.index + 1, total: phase.total, section: t('quiz.title') }}
      footer={
        <>
          <OnboardingPrimaryButton
            label={t('continue', { ns: 'common' })}
            disabled={!selected}
            onPress={quiz.next}
          />
          <OnboardingSecondaryButton label={t('quiz.intro.later')} onPress={onExit} />
        </>
      }>
      <ThemedText type="subtitle">{t('quiz.questionTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textMuted">
        {t('quiz.exampleNote')}
      </ThemedText>
      <View style={styles.cards}>
        {order.map((styleId) => (
          <StyleMessageCard
            key={styleId}
            title={t(`quiz.events.${phase.event}.${styleId}.title`)}
            body={t(`quiz.events.${phase.event}.${styleId}.body`)}
            selected={selected === styleId}
            onSelect={() => quiz.select(phase.event, styleId)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

/** The conditional tie-break page (PRD §7 Ties): one neutral event, only the tied styles. */
function TieBreakPage({
  styles: tied,
  quiz,
  onBack,
}: {
  styles: CommunicationProfileId[];
  quiz: ReturnType<typeof useCommunicationQuiz>;
  onBack: () => void;
}) {
  const { t } = useTranslation('communication');
  const order = useShuffledOrder('tieBreak', tied);
  const [choice, setChoice] = useState<CommunicationProfileId | undefined>(undefined);

  return (
    <OnboardingScaffold
      onBack={onBack}
      footer={
        <OnboardingPrimaryButton
          label={t('continue', { ns: 'common' })}
          disabled={!choice}
          onPress={() => choice && quiz.chooseTieBreak(choice)}
        />
      }>
      <ThemedText type="subtitle">{t('quiz.tieBreak.title')}</ThemedText>
      <ThemedText type="small" themeColor="textMuted">
        {t('quiz.tieBreak.body')}
      </ThemedText>
      <View style={styles.cards}>
        {order.map((styleId) => (
          <StyleMessageCard
            key={styleId}
            title={t(`quiz.events.tieBreak.${styleId}.title`)}
            body={t(`quiz.events.tieBreak.${styleId}.body`)}
            selected={choice === styleId}
            onSelect={() => setChoice(styleId)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
}

/** The plain-language result preview (PRD §8) — a style name + what it means, never a personality label. */
function ResultPage({
  styleId,
  onSave,
  onRetry,
  onBack,
}: {
  styleId: CommunicationProfileId;
  onSave: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('communication');
  return (
    <OnboardingScaffold
      onBack={onBack}
      footer={
        <>
          <OnboardingPrimaryButton label={t('quiz.result.save')} onPress={onSave} />
          <OnboardingSecondaryButton label={t('quiz.result.retry')} onPress={onRetry} />
        </>
      }>
      <ThemedText type="title">{t('quiz.result.title', { style: t(`styleNames.${styleId}`) })}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">
        {t(`styleDescriptions.${styleId}`)}
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted">
        {t('quiz.result.hint')}
      </ThemedText>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  cards: { gap: Spacing.three, marginTop: Spacing.two },
});
