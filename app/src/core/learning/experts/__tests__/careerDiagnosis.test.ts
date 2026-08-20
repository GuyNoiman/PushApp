/**
 * careerDiagnosis — the rung between what a person says and the Journey they get.
 *
 * These tests pin the three things that make it a diagnosis rather than a questionnaire:
 *  · the ORDER is load-bearing (a broad target ends it immediately, because every later reading
 *    would be meaningless);
 *  · the STOP RULE really stops — once an answer settles it, nothing further is asked;
 *  · an UNRESOLVED diagnosis is a real result, not a failure to be papered over with the nearest
 *    family. "I cannot do that work yet" is a skill goal, and routing it to "make your experience
 *    visible" would ask someone to evidence something that is not there.
 *
 * Every route is also checked against the REAL library, so a renamed bottleneck breaks a test here
 * instead of silently routing a real conversation nowhere.
 */
import {
  APPLY_NO_RESPONSE,
  nextQuestion,
  outcomeOf,
  routesToFamily,
  type CareerDiagnosisAnswers,
} from '../careerDiagnosis';
import { goalFamilyForDiagnosis } from '../../library/definitions';

const Q = APPLY_NO_RESPONSE.questions;
const [TARGET, PROOF, ACCESS, PROCESS] = Q;

/** Walk the tree, answering with the given values in order. */
function walk(...values: string[]): CareerDiagnosisAnswers {
  const answers: Record<string, string> = {};
  for (const value of values) {
    const question = nextQuestion(APPLY_NO_RESPONSE, answers);
    if (!question) break;
    answers[question.id] = value;
  }
  return answers;
}

describe('careerDiagnosis — the order', () => {
  it('opens on the target, because a broad target makes every later answer unreadable', () => {
    expect(nextQuestion(APPLY_NO_RESPONSE, {})).toBe(TARGET);
    expect(TARGET.signal).toBe('target');
  });

  it('asks target → proof → access → process, and nothing else', () => {
    expect(Q.map((q) => q.signal)).toEqual(['target', 'proof', 'access', 'searchProcess']);
  });

  it('asks the proof question before the access question', () => {
    // Someone who cannot show what they can do and someone who cannot reach anybody both say
    // "nobody answers", and the two plans are opposites.
    expect(Q.indexOf(PROOF)).toBeLessThan(Q.indexOf(ACCESS));
  });
});

describe('careerDiagnosis — the stop rule', () => {
  it('stops the moment a broad target settles it, asking nothing further', () => {
    const answers = walk('broad');

    expect(nextQuestion(APPLY_NO_RESPONSE, answers)).toBeNull();
    expect(Object.keys(answers)).toHaveLength(1);
  });

  it('keeps going while an answer settles nothing', () => {
    const answers = { [TARGET.id]: 'clear' };
    expect(nextQuestion(APPLY_NO_RESPONSE, answers)).toBe(PROOF);
    expect(outcomeOf(APPLY_NO_RESPONSE, answers)).toBeNull();
  });

  it('an unrecognised recorded value never settles the diagnosis', () => {
    // A stored answer can outlive the tree it was recorded against. Trusting it would route on a
    // value nobody authored.
    const answers = { [TARGET.id]: 'whatever-this-is' };
    expect(nextQuestion(APPLY_NO_RESPONSE, answers)).toBe(PROOF);
  });
});

describe('careerDiagnosis — where each route lands in the real library', () => {
  it('a broad target routes to the job-target family', () => {
    const outcome = outcomeOf(APPLY_NO_RESPONSE, walk('broad'));

    expect(routesToFamily(outcome)).toBe(true);
    if (!routesToFamily(outcome)) throw new Error('unreachable');
    expect(outcome.bottleneck).toBe('DIRECTION_GAP');
    const family = goalFamilyForDiagnosis('career', outcome.subtype, outcome.bottleneck);
    expect(family?.id).toBe('career.jobTarget');
  });

  it('a clear target that cannot be shown routes to the proof family', () => {
    const outcome = outcomeOf(APPLY_NO_RESPONSE, walk('clear', 'cannotShow'));

    if (!routesToFamily(outcome)) throw new Error('expected a family');
    const family = goalFamilyForDiagnosis('career', outcome.subtype, outcome.bottleneck);
    expect(family?.id).toBe('career.proof');
  });

  it('proof but no way in routes to the access family', () => {
    const outcome = outcomeOf(APPLY_NO_RESPONSE, walk('clear', 'haveExamples', 'applicationsOnly'));

    if (!routesToFamily(outcome)) throw new Error('expected a family');
    const family = goalFamilyForDiagnosis('career', outcome.subtype, outcome.bottleneck);
    expect(family?.id).toBe('career.access');
  });

  it('every family route in the tree resolves to a family that actually exists', () => {
    const routes = APPLY_NO_RESPONSE.questions
      .flatMap((q) => q.options)
      .map((o) => o.outcome)
      .filter((o) => o?.kind === 'family');

    expect(routes).toHaveLength(3);
    for (const route of routes) {
      if (route?.kind !== 'family') throw new Error('unreachable');
      expect(goalFamilyForDiagnosis('career', route.subtype, route.bottleneck)).toBeDefined();
    }
  });

  it('matches on the PAIR, never on the bottleneck alone', () => {
    // Three Career families share DIRECTION_GAP; only the subtype separates a job search from a
    // search for a direction. Matching on half the pair would route one into the other.
    const jobSearch = goalFamilyForDiagnosis('career', 'LAND_ROLE', 'DIRECTION_GAP');
    const direction = goalFamilyForDiagnosis('career', 'FIND_DIRECTION', 'DIRECTION_GAP');

    expect(jobSearch?.id).toBe('career.jobTarget');
    expect(direction).toBeDefined();
    expect(direction?.id).not.toBe(jobSearch?.id);
  });

  it('returns undefined for a pair no family claims, rather than the nearest one', () => {
    expect(goalFamilyForDiagnosis('career', 'LAND_ROLE', 'NOT_AUTHORED_YET')).toBeUndefined();
  });
});

describe('careerDiagnosis — an unresolved diagnosis is a result, not a failure', () => {
  it('"I cannot do that work yet" is a capability gap and names NO job-search family', () => {
    const outcome = outcomeOf(APPLY_NO_RESPONSE, walk('clear', 'cannotYet'));

    expect(outcome).toEqual({ kind: 'unresolved', reason: 'capabilityGap' });
    expect(routesToFamily(outcome)).toBe(false);
  });

  it('too little searching behind them is not diagnosed from', () => {
    const outcome = outcomeOf(
      APPLY_NO_RESPONSE,
      walk('clear', 'haveExamples', 'peopleToo', 'barelyStarted'),
    );
    expect(outcome).toEqual({ kind: 'unresolved', reason: 'notEnoughEvidence' });
  });

  it('names the later-stage bottlenecks we have not ingested, instead of forcing a family', () => {
    const stalls = outcomeOf(
      APPLY_NO_RESPONSE,
      walk('clear', 'haveExamples', 'peopleToo', 'interviewsNoOffer'),
    );
    const collapses = outcomeOf(
      APPLY_NO_RESPONSE,
      walk('clear', 'haveExamples', 'peopleToo', 'collapses'),
    );
    const nothing = outcomeOf(
      APPLY_NO_RESPONSE,
      walk('clear', 'haveExamples', 'peopleToo', 'noPattern'),
    );

    expect(stalls).toEqual({ kind: 'unresolved', reason: 'interviewStage' });
    expect(collapses).toEqual({ kind: 'unresolved', reason: 'unsustainableProcess' });
    expect(nothing).toEqual({ kind: 'unresolved', reason: 'noClearPattern' });
  });

  it('the last question settles on EVERY option, so the tree can never run out unanswered', () => {
    expect(PROCESS.options.every((o) => o.outcome)).toBe(true);
  });
});

describe('careerDiagnosis — the copy contract', () => {
  it('every prompt and option carries a translation key', () => {
    for (const question of APPLY_NO_RESPONSE.questions) {
      expect(question.promptKey).toMatch(/^career\.diagnosis\.applyNoResponse\./);
      expect(question.prompt.length).toBeGreaterThan(0);
      for (const option of question.options) {
        expect(option.labelKey).toMatch(/^career\.diagnosis\.applyNoResponse\./);
        expect(option.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('option values are unique inside a question, so an answer is never ambiguous', () => {
    for (const question of APPLY_NO_RESPONSE.questions) {
      const values = question.options.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
