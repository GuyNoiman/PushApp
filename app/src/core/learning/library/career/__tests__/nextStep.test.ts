/**
 * The first family ingested from the partner's central Journey Library, and therefore the file that
 * proves the SHAPE of the ingest — every later family is checked against the same rules by
 * `./careerLibrary.test.ts`.
 *
 * What matters here is the two ways this content could be wrong without anything crashing: an arc
 * whose Steps point at the wrong stage, and a translation key that resolves to nothing so a Hebrew
 * user reads a dotted path. Both are caught below.
 */
import i18n from '../../../../../i18n';
import { setAddressForm } from '../../../../../i18n/addressForm';
import { buildProcessStructure, validateAuthoredArc } from '../../authoredArc';
import { journeyQuestionsFor, selectJourney, validateGoalFamily } from '../../goalFamily';
import {
  CAREER_NEXT_STEP,
  CAREER_NEXT_STEP_JOURNEYS,
  NEXT_STEP_ACTION_FIRST,
  NEXT_STEP_CLARITY_FIRST,
  NEXT_STEP_HYBRID,
} from '../nextStep';

const known = (id: string) => CAREER_NEXT_STEP_JOURNEYS.find((j) => j.id === id);
const arcOf = (definitionId: string) => {
  const build = known(definitionId)!.variants[0].build;
  if (build.kind !== 'process') throw new Error('expected a process Journey');
  return build.arc;
};

afterEach(() => setAddressForm('neutral'));

describe('the family as content', () => {
  it('is valid, and so is every arc in it', () => {
    expect(validateGoalFamily(CAREER_NEXT_STEP, known)).toEqual([]);
    for (const journey of CAREER_NEXT_STEP_JOURNEYS) {
      expect(validateAuthoredArc(arcOf(journey.id))).toEqual([]);
    }
  });

  it('keeps three DIFFERENT Milestone arcs — which is why these are three Journeys, not three versions', () => {
    const arcs = CAREER_NEXT_STEP_JOURNEYS.map((j) =>
      arcOf(j.id).milestones.map((m) => m.title).join(' | '),
    );
    expect(new Set(arcs).size).toBe(3);
  });

  it('gives every Step a stage, so nothing floats outside the arc', () => {
    for (const journey of CAREER_NEXT_STEP_JOURNEYS) {
      const arc = arcOf(journey.id);
      const structure = buildProcessStructure(arc);
      const staged = structure.stepsByMilestone.reduce((n, steps) => n + steps.length, 0);
      expect(staged).toBe(arc.steps.length);
    }
  });
});

describe('choosing between them', () => {
  it('asks its own question only when the profile has not already answered it', () => {
    expect(journeyQuestionsFor(CAREER_NEXT_STEP)).toHaveLength(1);
    // Q7 of onboarding IS this question — someone who answered it is never asked twice.
    expect(journeyQuestionsFor(CAREER_NEXT_STEP, { signals: ['actionFirst'] })).toEqual([]);
  });

  it('routes the three onboarding answers to the three Journeys', () => {
    expect(selectJourney(CAREER_NEXT_STEP, { signals: ['clarityFirst'] }).definitionId).toBe(
      NEXT_STEP_CLARITY_FIRST.id,
    );
    expect(selectJourney(CAREER_NEXT_STEP, { signals: ['actionFirst'] }).definitionId).toBe(
      NEXT_STEP_ACTION_FIRST.id,
    );
    expect(selectJourney(CAREER_NEXT_STEP, { signals: ['dependsGoal'] }).definitionId).toBe(
      NEXT_STEP_HYBRID.id,
    );
  });

  it('hands a cold start the hybrid arc, and says it was the default', () => {
    const choice = selectJourney(CAREER_NEXT_STEP);
    expect(choice.definitionId).toBe(NEXT_STEP_HYBRID.id);
    expect(choice.via).toBe('default');
  });
});

describe('the translation cache', () => {
  beforeAll(async () => {
    if (i18n.language !== 'he') await i18n.changeLanguage('he');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders every Milestone and Step of every arc in Hebrew — never a key, never English', () => {
    for (const journey of CAREER_NEXT_STEP_JOURNEYS) {
      const structure = buildProcessStructure(arcOf(journey.id));
      const strings = [
        ...structure.milestones.map((m) => m.title),
        ...structure.stepsByMilestone.flat().flatMap((s) => [s.title, s.description ?? '']),
      ].filter(Boolean);
      for (const value of strings) {
        expect(value).toMatch(/[֐-׿]/);
      }
    }
  });

  it('addresses a woman in her own form where the wording differs', () => {
    setAddressForm('feminine');
    const feminine = buildProcessStructure(arcOf(NEXT_STEP_CLARITY_FIRST.id)).stepsByMilestone[0][0]
      .title;
    setAddressForm('masculine');
    const masculine = buildProcessStructure(arcOf(NEXT_STEP_CLARITY_FIRST.id)).stepsByMilestone[0][0]
      .title;
    expect(feminine).toContain('בחרי');
    expect(masculine).toContain('בחר ');
    expect(feminine).not.toBe(masculine);
  });

  it('falls back to the base wording (not to a key) for a form the cache does not distinguish', () => {
    setAddressForm('feminine');
    const structure = buildProcessStructure(arcOf(NEXT_STEP_CLARITY_FIRST.id));
    // s0's DESCRIPTION is identical for both forms, so only the base key exists for it.
    expect(structure.stepsByMilestone[0][0].description).toContain('דוגמאות אמיתיות');
  });
});
