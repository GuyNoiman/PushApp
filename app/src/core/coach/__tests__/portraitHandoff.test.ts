/**
 * The handoff TABLES, on their own (Stage 1 of `04_Product/Planning_From_Portrait_Plan_2026-09-16.md`).
 *
 * Coverage is decided by lookup rather than by a model, which is what lets "never re-ask" hold
 * offline. So the lookup is worth pinning row by row: the trust bars, which intents can be covered
 * and which never can, the stage → level map, and the goal-reading directive that must stay byte
 * for byte what it was when there is nothing to seed it with.
 */
import i18n from '../../../i18n';
import { buildTriageDirective } from '../coachPrompts';
import type { Held, Portrait } from '../portrait';
import {
  SEEDED_DOMAINS,
  STAGE_TO_BASELINE_INDEX,
  baselineDefault,
  coveredIntents,
  enumTrusted,
  resumeOf,
  seedLines,
  textTrusted,
} from '../portraitHandoff';

function held<T>(value: T, confidence: Held<T>['confidence'], source: Held<T>['source']): Held<T> {
  return { value, confidence, source, updatedAt: 1 };
}

const OPTIONS = ['figuring it out', 'direction, little momentum', 'actively progressing'];

function career(overrides: Partial<Portrait> = {}): Portrait {
  return {
    primaryWant: held('change career', 'high', 'stated'),
    domain: held('career', 'medium', 'inferred'),
    ...overrides,
  };
}

describe('trust', () => {
  it('text-trusts medium and high from either source, and never low', () => {
    expect(textTrusted(held('x', 'medium', 'inferred'))).toBe(true);
    expect(textTrusted(held('x', 'high', 'stated'))).toBe(true);
    expect(textTrusted(held('x', 'low', 'stated'))).toBe(false);
    expect(textTrusted(undefined)).toBe(false);
  });

  it('enum-trusts what was said at medium, but only what was inferred at high', () => {
    expect(enumTrusted(held('explore', 'medium', 'stated'))).toBe(true);
    expect(enumTrusted(held('explore', 'medium', 'inferred'))).toBe(false);
    expect(enumTrusted(held('explore', 'high', 'inferred'))).toBe(true);
    expect(enumTrusted(held('explore', 'low', 'stated'))).toBe(false);
  });
});

describe('when the handoff applies', () => {
  it('seeds career only, for now', () => {
    expect(SEEDED_DOMAINS).toEqual(['career']);
  });

  it('opens from a career Portrait with a trusted want, and says whether the want was said', () => {
    expect(resumeOf(career())).toEqual({ want: 'change career', stated: true, domain: 'career' });
    expect(resumeOf(career({ primaryWant: held('change career', 'medium', 'inferred') }))?.stated).toBe(false);
  });

  it.each([
    ['no Portrait', undefined],
    ['a low want', career({ primaryWant: held('change career', 'low', 'stated') })],
    ['a blank want', career({ primaryWant: held('   ', 'high', 'stated') })],
    ['a low domain', career({ domain: held('career', 'low', 'stated') })],
    ['an unseeded domain', career({ domain: held('money', 'high', 'stated') })],
  ])('does not apply with %s, and then covers nothing', (_label, portrait) => {
    expect(resumeOf(portrait)).toBeUndefined();
    expect(coveredIntents(portrait).size).toBe(0);
  });
});

describe('the coverage table', () => {
  it('covers foundation only with the want AND the outcome', () => {
    expect(coveredIntents(career()).has('foundation')).toBe(false);
    expect(coveredIntents(career({ desiredOutcome: held('less dread', 'medium', 'inferred') })).has('foundation')).toBe(true);
  });

  it('covers baseline from a trusted, mapped stage or from their own account of where they are', () => {
    expect(coveredIntents(career({ stage: held('act', 'high', 'inferred') })).has('baseline')).toBe(true);
    expect(coveredIntents(career({ currentState: held('eight years in', 'medium', 'inferred') })).has('baseline')).toBe(true);
    // Unmapped, and an untrusted stage, cover nothing on their own.
    expect(coveredIntents(career({ stage: held('unblock', 'high', 'stated') })).has('baseline')).toBe(false);
    expect(coveredIntents(career({ stage: held('act', 'medium', 'inferred') })).has('baseline')).toBe(false);
  });

  it('covers obstacles from a bottleneck, unless the bottleneck is "unknown"', () => {
    expect(coveredIntents(career({ bottleneck: held('lack_of_plan', 'medium', 'inferred') })).has('obstacles')).toBe(true);
    expect(coveredIntents(career({ bottleneck: held('unknown', 'high', 'inferred') })).has('obstacles')).toBe(false);
    expect(coveredIntents(career({ bottleneck: held('lack_of_plan', 'low', 'inferred') })).has('obstacles')).toBe(false);
  });

  it('covers motivation from the outcome', () => {
    expect(coveredIntents(career({ desiredOutcome: held('less dread', 'medium', 'stated') })).has('motivation')).toBe(true);
  });

  it('never covers time, horizon, scheduling, staging or a Journey version, from anything', () => {
    const everything = career({
      currentState: held('eight years in', 'high', 'stated'),
      desiredOutcome: held('less dread', 'high', 'stated'),
      stage: held('grow', 'high', 'stated'),
      bottleneck: held('lack_of_plan', 'high', 'stated'),
      readiness: held('act', 'high', 'stated'),
      supportNeed: held('planning', 'high', 'stated'),
      previousAttempts: held('applied twice', 'high', 'stated'),
      constraints: held(['one hour a week', 'evenings only'], 'high', 'stated'),
    });

    const covered = coveredIntents(everything);

    expect([...covered].sort()).toEqual(['baseline', 'foundation', 'motivation', 'obstacles']);
  });
});

describe('the baseline default', () => {
  it('maps every stage the plan maps, and leaves unblock unplaced', () => {
    expect(STAGE_TO_BASELINE_INDEX).toEqual({ explore: 0, choose: 0, prepare: 1, act: 1, sustain: 1, grow: 2 });
    expect(baselineDefault(career({ stage: held('explore', 'high', 'inferred') }), OPTIONS)).toBe(OPTIONS[0]);
    expect(baselineDefault(career({ stage: held('sustain', 'medium', 'stated') }), OPTIONS)).toBe(OPTIONS[1]);
    expect(baselineDefault(career({ stage: held('grow', 'high', 'inferred') }), OPTIONS)).toBe(OPTIONS[2]);
    expect(baselineDefault(career({ stage: held('unblock', 'high', 'stated') }), OPTIONS)).toBeUndefined();
  });

  it('does not default from a stage inferred at medium', () => {
    expect(baselineDefault(career({ stage: held('explore', 'medium', 'inferred') }), OPTIONS)).toBeUndefined();
  });
});

describe('the goal-reading directive', () => {
  const TODAY =
    '[triage] The user wants to work on: "yes". Break it into its distinct goals and classify each per your instructions.';

  it('is byte for byte what it always was with no seed, or an empty one', () => {
    expect(buildTriageDirective('yes')).toBe(TODAY);
    expect(buildTriageDirective('yes', [])).toBe(TODAY);
  });

  it('carries the trusted text lines, marked as said or inferred, and never a low one', () => {
    const lines = seedLines(
      career({
        currentState: held('eight years in', 'medium', 'inferred'),
        desiredOutcome: held('less dread', 'low', 'stated'),
      }),
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('change career');
    expect(lines[0]).toContain('they said this');
    expect(lines[1]).toContain('an earlier reading, not their words');
    expect(lines.join('\n')).not.toContain('less dread');
    const directive = buildTriageDirective('yes', lines);
    expect(directive.startsWith(TODAY)).toBe(true);
    expect(directive).toContain('never from this context');
  });
});

describe('the opening copy', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it.each(['en', 'he'])('exists in %s, carries the want, and has no em-dash', async (language) => {
    await i18n.changeLanguage(language);
    for (const key of ['planning.resume.openingStated', 'planning.resume.openingUnquoted']) {
      for (const context of [undefined, 'feminine', 'masculine']) {
        const line = i18n.t(key, { ns: 'coachContent', context, want: 'WANT' });
        expect(line).not.toBe(key);
        expect(line).toContain('WANT');
        expect(line).not.toContain('—');
      }
    }
  });

  it('addresses a woman in the feminine in Hebrew', async () => {
    await i18n.changeLanguage('he');
    const base = i18n.t('planning.resume.openingStated', { ns: 'coachContent', want: 'X' });
    const fem = i18n.t('planning.resume.openingStated', { ns: 'coachContent', context: 'feminine', want: 'X' });

    expect(base).toContain('בוא נתחיל');
    expect(fem).toContain('בואי נתחיל');
    expect(fem).toContain('את רוצה');
  });
});
