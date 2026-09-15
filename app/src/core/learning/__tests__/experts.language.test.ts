/**
 * The three domain experts that were never localised — body image, addiction, relationships.
 *
 * A Hebrew conversation used to reach a Hebrew question and then English answer cards: the prompts
 * were already spoken in Hebrew (the meta-agent voices those from `interview.*`), but the OPTIONS
 * came from hard-coded literals inside each expert. These tests hold the fix in place:
 *   • with the app language on Hebrew, every prompt AND every option of all six questions is the
 *     Hebrew `coachContent` copy — no English leaks through;
 *   • the feasibility note the person is shown is Hebrew too;
 *   • and the exact-string reads that the ordering carries still hold in Hebrew — `usesMilestones`
 *     recognises the Hebrew "keep it simple" answer, and the ORDERED baseline still grades from
 *     its Hebrew option. This is the part a frozen module-load constant would break: it would
 *     freeze one language and then silently fail every comparison in the other.
 * Deterministic — no OS, no async beyond the language switch, no network.
 */
import i18n, { changeLanguage } from '../../../i18n';
import type { DomainExpert, InterviewAnswers } from '../DomainExpert';
import type { GoalInput, PlanConstraints } from '../types';
import { AddictionExpert, BodyImageExpert, RelationshipsExpert } from '..';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

/** Every expert paired with the `coachContent` key its copy lives under. */
const EXPERTS: ReadonlyArray<readonly [string, DomainExpert, string]> = [
  ['body_image', BodyImageExpert, 'bodyImage'],
  ['addiction', AddictionExpert, 'addiction'],
  ['relationships', RelationshipsExpert, 'relationships'],
];

/** Any Hebrew letter — the cheapest honest test that a string was not left in English. */
const HEBREW = /[֐-׿]/;

function goal(over: Partial<GoalInput> = {}): GoalInput {
  return { title: 'Become who I choose to be', isHabit: true, ...over };
}

function constraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return { weeklyAvailabilityMinutes: 120, preferredDays: [], daypart: 'morning', ...over };
}

const he = (key: string): string => i18n.t(key, { ns: 'coachContent', lng: 'he' });
const heOptions = (key: string): string[] =>
  i18n.t(key, { ns: 'coachContent', lng: 'he', returnObjects: true }) as unknown as string[];

afterEach(async () => {
  // Leave the shared instance back on English for the next test/suite.
  await changeLanguage('en');
});

describe.each(EXPERTS)('%s — the interview speaks Hebrew', (domain, expert, key) => {
  it('asks all six questions, prompt AND options, in Hebrew', async () => {
    await changeLanguage('he');
    const questions = expert.interviewQuestions!(goal());

    expect(questions).toHaveLength(6);
    for (const question of questions) {
      expect({ id: question.id, prompt: question.prompt }).toEqual({
        id: question.id,
        prompt: he(`${key}.${question.intent}.prompt`),
      });
      expect(question.options).toEqual(heOptions(`${key}.${question.intent}.options`));
      // The leak the founder actually saw: a Hebrew question over English cards.
      for (const option of question.options) expect(option).toMatch(HEBREW);
    }
  });

  it('shows a Hebrew feasibility note', async () => {
    await changeLanguage('he');
    const baseline = heOptions(`${key}.baseline.options`);
    const assessment = expert.assessFeasibility!(
      { [`${domain}.baseline`]: baseline[0] },
      constraints({ weeklyAvailabilityMinutes: 0 }),
    );

    expect(assessment.note).toBe(he(`${key}.feasibility.${assessment.verdict}`));
    expect(assessment.note).toMatch(HEBREW);
  });

  it('recognises the Hebrew "keep it simple" answer, and the Hebrew staged one', async () => {
    await changeLanguage('he');
    const options = heOptions(`${key}.milestones.options`);
    const keepSimple: InterviewAnswers = { [`${domain}.milestones`]: options[1] };
    const staged: InterviewAnswers = { [`${domain}.milestones`]: options[0] };

    expect(expert.usesMilestones!(keepSimple)).toBe(false);
    expect(expert.usesMilestones!(staged)).toBe(true);
    // And it reaches the structure: no stages means one ongoing practice, not the full arc.
    expect(expert.buildStructure!(goal(), keepSimple, constraints({})).milestones).toHaveLength(1);
    expect(expert.buildStructure!(goal(), staged, constraints({})).milestones.length).toBeGreaterThan(1);
  });

  it('keeps the baseline ORDER meaningful in Hebrew — worst option grades hardest', async () => {
    await changeLanguage('he');
    const baseline = heOptions(`${key}.baseline.options`);
    const tight = constraints({ weeklyAvailabilityMinutes: 0 });

    const novice = expert.assessFeasibility!({ [`${domain}.baseline`]: baseline[0] }, tight);
    const experienced = expert.assessFeasibility!(
      { [`${domain}.baseline`]: baseline[baseline.length - 1] },
      tight,
    );
    expect(novice.verdict).toBe('tooAmbitious');
    expect(experienced.verdict).toBe('ambitious');
  });

  it('switches back with the language — the copy is read when the question is asked', async () => {
    await changeLanguage('he');
    const hebrew = expert.interviewQuestions!(goal())[5].options[1];
    await changeLanguage('en');
    const english = expert.interviewQuestions!(goal())[5].options[1];

    expect(hebrew).not.toBe(english);
    expect(english).not.toMatch(HEBREW);
    // The English answer is still recognised on English — a constant frozen at module load would
    // have matched only whichever language happened to be active first.
    expect(expert.usesMilestones!({ [`${domain}.milestones`]: english })).toBe(false);
  });
});
