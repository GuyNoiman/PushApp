/**
 * The matching layer's cold start — and the first time in the app's life that the onboarding
 * answers change anything.
 *
 * Onboarding asks what tends to help the user and what tends to get in their way. The answers were
 * stored, a coach summary was built from them, and the method that returns it was called by
 * nothing. These tests pin that the answers now reach the plan, that the user's own choice always
 * outranks the match, and that a profile we know nothing from says so instead of pretending.
 */
import { chooseRecurringApproach } from '../matchApproach';
import type { CoachOnboardingSummary } from '../../../onboarding/model';

function profile(over: Partial<CoachOnboardingSummary> = {}): CoachOnboardingSummary {
  return { version: 1, areas: [], help: [], friction: [], skipped: [], ...over };
}

describe('choosing an approach from what the user told us about themselves', () => {
  it('answers "too much at once" with the approach that changes the SCALE', () => {
    const match = chooseRecurringApproach(profile({ friction: ['tooMuchAtOnce'] }));

    expect(match).toEqual({ approach: 'tiny_start', signal: 'tooMuchAtOnce' });
  });

  it('answers "life gets busy" with the approach that supplies the OCCASION', () => {
    // Being busy is not a failure of will — the action never found a moment in the day.
    expect(chooseRecurringApproach(profile({ friction: ['lifeBusy'] })).approach).toBe('anchor');
    // Excitement fading is the same failure with a different face: the moment stopped motivating.
    expect(chooseRecurringApproach(profile({ friction: ['excitementFades'] })).approach).toBe('anchor');
  });

  it('answers "no clear plan" with the approach that moves the DECIDING to the start', () => {
    expect(chooseRecurringApproach(profile({ friction: ['noClearPlan'] })).approach).toBe('prepare');
    expect(chooseRecurringApproach(profile({ help: ['clearPlan'] })).approach).toBe('prepare');
  });

  it('lets what BREAKS someone outrank what they believe helps', () => {
    // Friction is answered from experience; help is answered from preference. When they disagree,
    // the lived answer wins.
    const conflicted = profile({ friction: ['tooMuchAtOnce'], help: ['clearPlan'] });

    expect(chooseRecurringApproach(conflicted).approach).toBe('tiny_start');
  });

  it('respects the order the user picked their answers in', () => {
    const match = chooseRecurringApproach(profile({ friction: ['lifeBusy', 'tooMuchAtOnce'] }));

    expect(match.signal).toBe('lifeBusy');
  });

  it('ignores answers that genuinely do not discriminate, rather than inventing a match', () => {
    // "I want to see progress" argues for none of these three approaches. Assigning it somewhere
    // plausible would make the matcher look informed while it was guessing.
    const match = chooseRecurringApproach(profile({ friction: ['hardToSeeProgress'], help: ['seeProgress'] }));

    expect(match.signal).toBe('default');
  });

  it('says "default" out loud for a user who skipped onboarding', () => {
    expect(chooseRecurringApproach(null).signal).toBe('default');
    expect(chooseRecurringApproach(profile()).signal).toBe('default');
  });

  it('never reads the user’s free text (G1)', () => {
    // The chosen approach travels outward eventually; nothing that reaches it may derive from the
    // user's own words. A profile whose ONLY content is free text must not produce a match.
    const freeTextOnly = profile({
      frictionOther: 'I always start big and burn out by Thursday',
      helpOther: 'someone checking in on me',
      outcome: 'to feel like myself again',
    });

    expect(chooseRecurringApproach(freeTextOnly).signal).toBe('default');
  });
});
