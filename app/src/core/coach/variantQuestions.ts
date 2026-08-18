/**
 * variantQuestions — the questions a chosen Journey asks about ITSELF, surfaced in the interview.
 *
 * D62 §2, in one sentence: the expert first decides which Journey fits professionally, and only then
 * does the app ask the questions that *this* Journey declared it needs in order to pick between its
 * own versions. So these questions are not onboarding's, not the domain expert's, and not asked of
 * everyone — they arrive after the goal is understood and the Journey is chosen, and a user who
 * never meets a Journey is never asked its question.
 *
 * WHY THIS FILE IS AN ADAPTER AND NOT A QUESTION BANK. There is no list of questions here. There is
 * a translation from whatever a {@link JourneyDefinition} declares into the {@link DomainQuestion}
 * shape the interview and the UI already render, and back again. A Journey that declares an axis
 * about certainty, free time or urgency gets its question asked by this code without this code
 * changing — which is the whole content-not-code claim, made real at the one seam where it could
 * have quietly become code.
 *
 * THE QUESTION IS CLOSED, deliberately (`allowOther: false`, unlike the horizon question). An axis
 * has declared positions and a version sits on them; free text cannot place anyone, so offering it
 * would collect a sentence we could not act on and would have to discard.
 *
 * SECURITY-PRIVACY G1: the answer stored is the rendered option TEXT (as with every interview
 * answer), and it is turned straight back into a coarse value id here. Only the id reaches the
 * variant choice.
 *
 * Framework-free: copy resolves through the shared i18next core instance, like the rest of the
 * coach's deterministic content.
 */
import i18n from '../../i18n';
import { addressContext } from '../../i18n/addressForm';
import type { DomainQuestion, InterviewAnswers } from '../learning/DomainExpert';
import { answerText } from '../learning/DomainExpert';
import type { AxisId, AxisValueId, JourneyDefinition } from '../learning/library/journeyDefinition';
import { variantQuestionsFor, type VariantContext } from '../learning/library/selectVariant';

/** The stable question id for one Journey's axis — `library.<definitionId>.<axisId>`. */
export function variantQuestionId(definitionId: string, axisId: AxisId): string {
  return `library.${definitionId}.${axisId}`;
}

/** One axis's copy in the ACTIVE language and form of address, from the `library` cache (D55). */
function libraryCopy(key: string): string {
  return i18n.t(key, { ns: 'library', context: addressContext() });
}

/**
 * The questions THIS Journey still needs asked, as interview questions. Empty when the profile
 * already places the user on every axis, and empty when the surviving versions no longer differ on
 * any of them — the selector decides that, so a question is never asked out of habit.
 */
export function variantInterviewQuestions(
  def: JourneyDefinition,
  ctx: VariantContext = {},
): DomainQuestion[] {
  return variantQuestionsFor(def, ctx).map((question) => ({
    id: variantQuestionId(def.id, question.axisId),
    // Its own intent: this question shapes WHICH version is built, and nothing else. Folding it
    // into `obstacles` or `foundation` would put it in the aggregate bucket of a question that is
    // asked of everyone, when this one is asked only by the Journey that needs it.
    intent: 'variant',
    prompt: libraryCopy(question.questionKey),
    options: question.values.map((value) => libraryCopy(value.labelKey)),
    allowOther: false,
  }));
}

/**
 * Read the interview's answers back as axis placements — `{ [axisId]: valueId }`.
 *
 * The answer is matched by its POSITION in the rendered option list, exactly as the horizon question
 * resolves a length: the list shown and the list matched against both come from the declared values,
 * so translating the labels can never desync the two. An answer that matches nothing (a legacy
 * answer, or copy that moved) is dropped rather than guessed at — the version then falls back to the
 * profile, which is the correct behaviour, not a failure.
 */
export function axisAnswersFrom(
  def: JourneyDefinition,
  answers: InterviewAnswers | undefined,
): Record<AxisId, AxisValueId> {
  const placements: Record<AxisId, AxisValueId> = {};
  if (!answers) return placements;

  for (const axis of def.axes) {
    const answer = answerText(answers[variantQuestionId(def.id, axis.id)]);
    if (!answer) continue;
    const index = axis.values.findIndex((value) => libraryCopy(value.labelKey) === answer);
    if (index >= 0) placements[axis.id] = axis.values[index].id;
  }
  return placements;
}
