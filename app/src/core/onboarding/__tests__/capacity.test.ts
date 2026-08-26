/**
 * Onboarding Q6 → the Journey builder (D82).
 *
 * Two claims, and the second is the one that could quietly do harm: the capacity answer must BOUND
 * a plan when nothing more specific is known, and it must never OVERRULE what this Journey's own
 * interview said — those answers were given about this Journey, now.
 */
import { buildJourneyInput, deriveConstraints } from '../../coach/goalSpecToJourney';
import type { GoalSpec } from '../../coach/interviewPlaybook';
import { CAPACITY_WEEKLY_MINUTES, weeklyMinutesForCapacity } from '../capacity';

const spec = (over: Partial<GoalSpec> = {}): GoalSpec => ({
  title: 'Run 5km',
  domain: 'general',
  processType: 'fixed',
  isHabit: true,
  milestones: [],
  failureRisks: [],
  timing: {},
  ...over,
});

describe('weeklyMinutesForCapacity', () => {
  it('gives a ceiling to the three answers that name one', () => {
    expect(weeklyMinutesForCapacity('fewMinutes')).toBe(60);
    expect(weeklyMinutesForCapacity('shortFewTimes')).toBe(60);
    expect(weeklyMinutesForCapacity('halfHour')).toBe(180);
  });

  it('invents nothing for the three that do not', () => {
    // "I can invest more when needed" says there is no ceiling, not that there is a large one;
    // "it changes a lot" says a single number is the wrong shape; "I do not know" is not a quantity.
    expect(weeklyMinutesForCapacity('moreWhenNeeded')).toBeUndefined();
    expect(weeklyMinutesForCapacity('changesWeekly')).toBeUndefined();
    expect(weeklyMinutesForCapacity('dontKnow')).toBeUndefined();
  });

  it('shrugs at a skipped question or an answer from an older Q6', () => {
    expect(weeklyMinutesForCapacity(undefined)).toBeUndefined();
    expect(weeklyMinutesForCapacity('')).toBeUndefined();
    expect(weeklyMinutesForCapacity('someRetiredOption')).toBeUndefined();
  });

  it('covers every option the questionnaire offers', () => {
    // A new Q6 option that nobody maps here would silently mean "no ceiling" for those users.
    const { ONBOARDING_QUESTIONS } = require('../questions');
    const q6 = ONBOARDING_QUESTIONS.find((q: { id: string }) => q.id === 'q6');
    const offered = q6.options.map((o: { id: string }) => o.id).sort();
    expect(Object.keys(CAPACITY_WEEKLY_MINUTES).sort()).toEqual(offered);
  });
});

describe('what the capacity answer actually changes in a plan', () => {
  // Not a step count: the Planner never drops a Step for lack of time. What moves is the PACE —
  // how many sessions a week a frequency-based plan asks for, and how densely a date-pinned one
  // packs. Asserted on the built plan, because a constraint that reached the derivation and stopped
  // there would pass every test in the block above and change nothing anybody could feel.
  const flexible: GoalSpec = spec({ processType: 'progressive', isHabit: false, cadence: 'weekly' });
  const build = (accountCapacity?: string) =>
    buildJourneyInput(flexible, undefined, { now: Date.UTC(2026, 6, 14), accountCapacity });

  it('asks for FEWER sessions a week from somebody with a few minutes a day', () => {
    expect(build().sessionsPerWeek).toBe(3); // the standing default
    expect(build('fewMinutes').sessionsPerWeek).toBe(2);
  });

  it('asks for more from somebody with half an hour a day', () => {
    expect(build('halfHour').sessionsPerWeek).toBe(6);
  });

  it('leaves the pace exactly as it was for an answer that names no ceiling', () => {
    expect(build('moreWhenNeeded').sessionsPerWeek).toBe(build().sessionsPerWeek);
    expect(build('changesWeekly').sessionsPerWeek).toBe(build().sessionsPerWeek);
    expect(build('dontKnow').sessionsPerWeek).toBe(build().sessionsPerWeek);
  });
});

describe('deriveConstraints — where the capacity answer sits', () => {
  it('bounds the week when the interview said nothing about time', () => {
    const plain = deriveConstraints(spec(), undefined, undefined, undefined);
    expect(plain.weeklyAvailabilityMinutes).toBe(0); // the old behaviour: no signal at all

    const bounded = deriveConstraints(spec(), undefined, undefined, 'fewMinutes');
    expect(bounded.weeklyAvailabilityMinutes).toBe(60);
  });

  it('NEVER overrules this Journey’s own timing answer', () => {
    // Somebody whose profile says "a few minutes" may still sit down and plan two hours a week for
    // THIS Journey. The answer they just gave about it wins.
    const withTiming = spec({ timing: { sessionMinutes: 30, sessionsPerWeek: 4 } });
    expect(deriveConstraints(withTiming, undefined, undefined, 'fewMinutes').weeklyAvailabilityMinutes).toBe(120);
  });

  it('leaves the week unbounded for an answer that names no ceiling', () => {
    expect(
      deriveConstraints(spec(), undefined, undefined, 'moreWhenNeeded').weeklyAvailabilityMinutes,
    ).toBe(0);
  });
});
