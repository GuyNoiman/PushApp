/**
 * A question is never asked in another question's words.
 *
 * ── THE BUG THIS PINS (partner finding 11, reproduced from the founder's recording 2026-09-07) ──
 *
 * Every expert question is voiced by the meta-agent, and the lookup was one line:
 *
 *     const key = `interview.${question.intent}`;
 *
 * Which is correct exactly as long as no two questions share an intent. Two did. The horizon
 * question — "how long do you want to give this?", answered in MONTHS — carried `intent: 'time'`,
 * so it was rendered with the capacity question's prompt: **"How much time can you realistically
 * give this each week?"** with *About a month · About two months · No fixed end* underneath.
 *
 * The same overload is finding 10. Both questions were `time`, so the same sentence appeared twice
 * in one interview, and answering it the first time did nothing to stop the second.
 *
 * Three axes now have three names — `time` (per week), `horizon` (how long), `scheduling` (which
 * days) — and these tests fail if they are ever collapsed again.
 */
import { horizonQuestion, HORIZON_QUESTION_ID } from '../horizonQuestion';
import { SCHEDULING_QUESTION } from '../CoachOrchestrator';
import { GeneralExpert } from '../../learning/DomainExpert';
import { CareerExpert } from '../../learning/domains/career';
import type { DomainQuestion } from '../../learning/DomainExpert';

/** Every question a real interview can put in front of somebody, for one domain. */
function assembled(expert: { interviewQuestions?: (goal: never) => DomainQuestion[] }): DomainQuestion[] {
  return [
    ...(expert.interviewQuestions?.(undefined as never) ?? []),
    horizonQuestion(),
    SCHEDULING_QUESTION,
  ];
}

describe('the axes stay separate', () => {
  it('how long the Journey runs is not the same axis as how much time each week', () => {
    expect(horizonQuestion().intent).toBe('horizon');
    expect(SCHEDULING_QUESTION.intent).toBe('scheduling');
  });

  it.each([
    ['the general expert', GeneralExpert],
    ['the career expert', CareerExpert],
  ])('%s never assembles two questions on the same axis', (_name, expert) => {
    const intents = assembled(expert as never).map((q) => q.intent);
    const duplicated = intents.filter((intent, i) => intents.indexOf(intent) !== i);
    // A duplicate is not merely untidy: the voicing map is keyed by intent, so the second question
    // would be asked in the first one's words. That is exactly what happened.
    expect(duplicated).toEqual([]);
  });
});

describe('a question renders its own answers', () => {
  it('the horizon question offers lengths, and asks about length', () => {
    const q = horizonQuestion();
    expect(q.id).toBe(HORIZON_QUESTION_ID);
    // Lengths, not hours. If this ever holds "Under 1 hour" the axes have crossed again.
    expect(q.options.join(' ')).toMatch(/month|fixed end/i);
    expect(q.options.join(' ')).not.toMatch(/hour/i);
  });

  it('the weekly-capacity question offers hours, and never lengths', () => {
    const time = (GeneralExpert.interviewQuestions?.(undefined as never) ?? []).find(
      (q) => q.intent === 'time',
    );
    expect(time).toBeDefined();
    expect(time!.options.join(' ')).toMatch(/hour/i);
    expect(time!.options.join(' ')).not.toMatch(/month/i);
  });

  it('the same holds for the career expert, in both of its questions', () => {
    const time = CareerExpert.interviewQuestions?.(undefined as never)?.find(
      (q) => q.intent === 'time',
    );
    expect(time).toBeDefined();
    expect(time!.options.join(' ')).toMatch(/hour/i);
    expect(time!.options.join(' ')).not.toMatch(/month/i);
  });
});
