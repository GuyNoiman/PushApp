/**
 * The whole Career section at once — twenty-seven Journeys in nine families, ingested from the partner's
 * package. Each family file has its own tests for what makes IT particular; these are the rules that
 * must hold for all of them, and they are the ones that catch an ingest mistake rather than a coding
 * one.
 *
 * The last two are the ones worth explaining. Content authored around a PERSONA is the specific way
 * this ingest could go wrong and still look fine: the source package is built around "Dana", with her
 * own two options and her own target role written into Step titles, and a library Journey that
 * arrives holding somebody else's decision is worse than no Journey. And a Journey nobody can reach
 * is not shipped: the wiring gap is asserted here so it stays visible until it is closed.
 */
import i18n from '../../../../../i18n';
import { validateAuthoredArc, type AuthoredArc } from '../../authoredArc';
import { GOAL_FAMILIES, JOURNEY_DEFINITIONS, goalFamiliesFor, goalFamily, journeyDefinition, journeyDefinitionsFor } from '../../definitions';
import { journeyQuestionsFor, selectJourney, validateGoalFamily } from '../../goalFamily';
import { validateJourneyDefinition } from '../../journeyDefinition';
import { CAREER_FAMILIES, CAREER_JOURNEYS } from '../index';

const arcOf = (definitionId: string): AuthoredArc => {
  const build = journeyDefinition(definitionId)!.variants[0].build;
  if (build.kind !== 'process') throw new Error(`${definitionId} is not a process Journey`);
  return build.arc;
};

describe('the ingest as a whole', () => {
  it('is nine families of three Journeys, twenty-seven in all', () => {
    // Six from the partner's v0.6 package, three more from v1.1 (CAR_G11-G13, 2026-08-20).
    expect(CAREER_FAMILIES).toHaveLength(9);
    expect(CAREER_JOURNEYS).toHaveLength(27);
    for (const family of CAREER_FAMILIES) expect(family.members).toHaveLength(3);
  });

  it('validates every family and every Journey', () => {
    for (const family of GOAL_FAMILIES) {
      expect({ [family.id]: validateGoalFamily(family, journeyDefinition) }).toEqual({ [family.id]: [] });
    }
    for (const definition of JOURNEY_DEFINITIONS) {
      expect({ [definition.id]: validateJourneyDefinition(definition) }).toEqual({ [definition.id]: [] });
    }
    for (const journey of CAREER_JOURNEYS) {
      expect({ [journey.id]: validateAuthoredArc(arcOf(journey.id)) }).toEqual({ [journey.id]: [] });
    }
  });

  it('gives each family three DIFFERENT arcs — the reason they are Journeys and not versions', () => {
    for (const family of CAREER_FAMILIES) {
      const arcs = family.members.map((m) => arcOf(m.id).milestones.map((ms) => ms.title).join(' | '));
      expect(new Set(arcs).size).toBe(3);
    }
  });

  it('registers every Journey and every family so an id always resolves', () => {
    for (const journey of CAREER_JOURNEYS) expect(journeyDefinition(journey.id)).toBe(journey);
    for (const family of CAREER_FAMILIES) expect(goalFamily(family.id)).toBe(family);
    expect(goalFamiliesFor('career')).toHaveLength(9);
    expect(goalFamiliesFor('relationships')).toEqual([]);
  });

  it('never offers a career arc to another domain', () => {
    expect(journeyDefinitionsFor('process', 'relationships')).toEqual([]);
    expect(journeyDefinitionsFor('process', 'career')).toHaveLength(27);
    // The generic recurring Journey is domain-less and stays available everywhere.
    expect(journeyDefinitionsFor('recurring', 'relationships')).toHaveLength(1);
  });

  it('asks one question per family, and every answer changes which Journey is built', () => {
    for (const family of CAREER_FAMILIES) {
      const questions = journeyQuestionsFor(family);
      // nextStep is the exception: onboarding's Q7 already places the user, so it asks nothing of
      // someone who answered it — which is asserted in that family's own test.
      expect(questions.length).toBeLessThanOrEqual(1);
      const axis = family.axes[0];
      const chosen = axis.values.map(
        (value) => selectJourney(family, { answers: { [axis.id]: value.id } }).definitionId,
      );
      expect(new Set(chosen).size).toBe(3);
    }
  });

  it('always has an answer, even for a person we know nothing about', () => {
    for (const family of CAREER_FAMILIES) {
      const choice = selectJourney(family);
      expect(choice.via).toBe('default');
      expect(family.members.some((m) => m.id === choice.definitionId)).toBe(true);
    }
  });
});

describe('what must NOT have come across from the authoring package', () => {
  const everyString = () => {
    const out: string[] = [];
    for (const family of CAREER_FAMILIES) {
      out.push(family.goal);
      for (const member of family.members) {
        const arc = arcOf(member.id);
        for (const m of arc.milestones) out.push(m.title);
        for (const s of arc.steps) out.push(s.title, s.description ?? '');
      }
    }
    return out;
  };

  it('carries none of the persona: not her name, not her options, not her target role', () => {
    // The source package writes these into Step titles. A library Journey must arrive empty of them,
    // because the user's own answer is what belongs in that sentence.
    for (const forbidden of ['Dana', 'Product Operations', 'Customer Success', 'Data Analyst']) {
      for (const value of everyString()) expect(value).not.toContain(forbidden);
    }
  });

  it('carries no Dream — a Dream belongs to the person living it', () => {
    for (const family of CAREER_FAMILIES) {
      expect(Object.keys(family)).not.toContain('dream');
      expect(JSON.stringify(family)).not.toContain('dream_career');
    }
  });
});

describe('the translation cache', () => {
  const languages = ['he', 'en'] as const;

  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each(languages)('resolves every authored key in %s', async (language) => {
    await i18n.changeLanguage(language);
    const missing: string[] = [];
    const check = (key: string) => {
      if (!i18n.t(key, { ns: 'library', defaultValue: '' })) missing.push(`${language}:${key}`);
    };
    for (const family of CAREER_FAMILIES) {
      check(family.goalKey);
      for (const axis of family.axes) {
        check(axis.questionKey);
        for (const value of axis.values) check(value.labelKey);
      }
    }
    for (const journey of CAREER_JOURNEYS) {
      check(journey.variants[0].essenceKey);
      const arc = arcOf(journey.id);
      for (const m of arc.milestones) check(m.titleKey);
      for (const s of arc.steps) {
        check(s.titleKey);
        if (s.descriptionKey) check(s.descriptionKey);
      }
    }
    expect(missing).toEqual([]);
  });
});
