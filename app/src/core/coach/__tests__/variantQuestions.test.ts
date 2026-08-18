/**
 * The question a chosen Journey asks about ITSELF, in the interview (D62 §2).
 *
 * The order is the decision: the expert decides which Journey fits professionally, and only then is
 * the user asked whatever THAT Journey says it needs in order to pick between its own versions. So
 * these tests check three things — the question is rendered from the Journey's declared content, the
 * answer comes back as a coarse value id, and an answer we cannot place is dropped rather than
 * guessed at.
 */
import i18n from '../../../i18n';
import { RECURRING_GENERIC } from '../../learning/library/definitions';
import { axisAnswersFrom, variantInterviewQuestions, variantQuestionId } from '../variantQuestions';

describe('a Journey’s own question, in the interview', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the question and its options from the Journey’s declared content', () => {
    const [question] = variantInterviewQuestions(RECURRING_GENERIC);

    expect(question.id).toBe(variantQuestionId('recurring.generic', 'friction'));
    expect(question.intent).toBe('variant');
    expect(question.prompt.length).toBeGreaterThan(0);
    expect(question.options).toHaveLength(3);
    // Closed on purpose: an axis has declared positions, and free text cannot place anyone on one.
    expect(question.allowOther).toBe(false);
  });

  it('asks nothing when onboarding already answered it', () => {
    expect(variantInterviewQuestions(RECURRING_GENERIC, { signals: ['tooMuchAtOnce'] })).toEqual([]);
  });

  it('reads the answer back as a coarse value id', () => {
    const [question] = variantInterviewQuestions(RECURRING_GENERIC);
    const answers = { [question.id]: question.options[1] };

    expect(axisAnswersFrom(RECURRING_GENERIC, answers)).toEqual({ friction: 'tooBig' });
  });

  it('survives the user reading the question in Hebrew', async () => {
    // The label the user saw and the label matched against both come from the same declared values,
    // so translating the copy can never desync the two.
    await i18n.changeLanguage('he');
    const [question] = variantInterviewQuestions(RECURRING_GENERIC);
    const answers = { [question.id]: question.options[2] };

    expect(axisAnswersFrom(RECURRING_GENERIC, answers)).toEqual({ friction: 'deciding' });
    await i18n.changeLanguage('en');
  });

  it('drops an answer it cannot place, rather than guessing', () => {
    const id = variantQuestionId('recurring.generic', 'friction');

    expect(axisAnswersFrom(RECURRING_GENERIC, { [id]: 'something nobody offered' })).toEqual({});
    expect(axisAnswersFrom(RECURRING_GENERIC, undefined)).toEqual({});
  });
});
