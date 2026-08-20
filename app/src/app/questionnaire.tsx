/**
 * The questionnaire, taken again — the nine onboarding questions as a tool the user can return to
 * (founder, 2026-08-20: *"the questionnaire will appear there and the user can redo it if they
 * want"*).
 *
 * WHY IT MATTERS THAT THIS IS THE SAME NINE QUESTIONS. They are the profile the library matches on:
 * how someone starts, how much structure helps them, what usually gets in their way. A person is not
 * a fixed set of answers — what breaks them in a hard month is not what breaks them in a calm one —
 * so the ability to say "that is not me any more" is not a settings nicety, it is how the matching
 * stays honest over time.
 *
 * IT REUSES THE ONBOARDING PAGES ON PURPOSE (`components/onboarding/*`): the same question copy, the
 * same option limits, the same skip semantics. A second implementation would drift, and the drift
 * would land silently in what the coach believes about the user.
 *
 * WHAT IS DIFFERENT FROM THE FIRST RUN: nothing is written until the user finishes. Onboarding
 * persists every page so an interrupted first run can resume; a retake that saved halfway would
 * leave the profile as a mix of old and new answers, which is the one state nobody chose. Leaving
 * early therefore changes nothing at all.
 */
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  OnboardingPrimaryButton,
  OnboardingScaffold,
  OnboardingSecondaryButton,
} from '@/components/onboarding/OnboardingScaffold';
import { OnboardingQuestionPage } from '@/components/onboarding/OnboardingQuestionPage';
import { markSkipped, selectedIds, setFreeText, toggleSelection } from '@/core/onboarding/answers';
import type { OnboardingAnswers, OnboardingQuestionId } from '@/core/onboarding/model';
import {
  ONBOARDING_QUESTIONS,
  ONBOARDING_QUESTION_COUNT,
  ONBOARDING_QUESTION_IDS,
} from '@/core/onboarding/questions';
import { useApp } from '@/state/AppProvider';

export default function QuestionnaireScreen() {
  const { core } = useApp();
  const router = useRouter();
  const { t } = useTranslation('onboarding');
  const { t: tt } = useTranslation('tools');

  // Seeded from what the user answered last time, so a retake is an EDIT of their profile rather
  // than a blank form — most people will change one or two things, not nine.
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => core.getOnboardingAnswers());
  const [index, setIndex] = useState(0);

  const questionId = ONBOARDING_QUESTION_IDS[index];
  const question = ONBOARDING_QUESTIONS[index];

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tools');
  }, [router]);

  const save = useCallback(
    (final: OnboardingAnswers) => {
      // The same facade the first run calls. It replaces the answers and keeps the original
      // completion stamp, so a retake never re-opens the first-run gate.
      core.completeOnboarding(final);
      close();
    },
    [close, core],
  );

  const advance = useCallback(
    (next: OnboardingAnswers) => {
      setAnswers(next);
      if (index + 1 < ONBOARDING_QUESTION_COUNT) setIndex(index + 1);
      else save(next);
    },
    [index, save],
  );

  const isText = question.select === 'text';
  const isSingle = question.select === 'single';
  const selected = selectedIds(answers, questionId);
  const freeText = answers.freeText[questionId] ?? '';
  const hasOptionalText = question.freeText === 'optional' && freeText.trim().length > 0;
  const answered = isText ? freeText.trim().length > 0 : selected.length > 0 || hasOptionalText;

  return (
    <OnboardingScaffold
      onBack={index === 0 ? close : () => setIndex(index - 1)}
      progress={{
        current: index + 1,
        total: ONBOARDING_QUESTION_COUNT,
        section: t(`sections.${question.section}`),
      }}
      footer={
        <>
          <OnboardingPrimaryButton
            label={
              index + 1 === ONBOARDING_QUESTION_COUNT
                ? tt('questionnaire.save')
                : t('continue', { ns: 'common' })
            }
            disabled={!answered}
            onPress={() => advance(answers)}
          />
          <OnboardingSecondaryButton
            label={isText ? t('questions.q2.secondary') : t('skip')}
            onPress={() =>
              advance(
                markSkipped(answers, questionId, {
                  keepFreeText: question.freeText === 'optional',
                }),
              )
            }
          />
        </>
      }>
      <OnboardingQuestionPage
        question={question}
        selected={selected}
        atLimit={!isSingle && !isText && selected.length >= question.maxSelect}
        freeText={freeText}
        onToggle={(optionId) =>
          setAnswers((a: OnboardingAnswers) => {
            let next = toggleSelection(a, question, optionId);
            const opt = question.options.find((o) => o.id === optionId);
            if (opt?.isOther && !selectedIds(next, question.id).includes(optionId)) {
              next = setFreeText(next, question.id, '');
            }
            return next;
          })
        }
        onChangeText={(text: string) =>
          setAnswers((a: OnboardingAnswers) => setFreeText(a, questionId as OnboardingQuestionId, text))
        }
      />
    </OnboardingScaffold>
  );
}
