/** Adapter between a goal family's authored axes and the Coach's existing question UI. */
import i18n from '../../i18n';
import { addressContext } from '../../i18n/addressForm';
import type { DomainQuestion } from '../learning/DomainExpert';
import type { GoalFamily } from '../learning/library/goalFamily';
import { journeyQuestionsFor } from '../learning/library/goalFamily';
import type { AxisId } from '../learning/library/journeyDefinition';
import type { SelectionContext } from '../learning/library/selectable';

export function familyQuestionId(familyId: string, axisId: AxisId): string {
  return `library.family.${familyId}.${axisId}`;
}

function libraryCopy(key: string): string {
  return i18n.t(key, { ns: 'library', context: addressContext() });
}

export function familyInterviewQuestions(
  family: GoalFamily,
  ctx: SelectionContext = {},
): DomainQuestion[] {
  return journeyQuestionsFor(family, ctx).map((question) => ({
    id: familyQuestionId(family.id, question.axisId),
    intent: 'variant',
    prompt: libraryCopy(question.questionKey),
    options: question.values.map((value) => libraryCopy(value.labelKey)),
    allowOther: false,
  }));
}
