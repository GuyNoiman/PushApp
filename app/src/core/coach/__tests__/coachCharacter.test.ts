/**
 * The permanent character of the meta-agent, kept apart from any one flow.
 *
 * Founder, 2026-08-31: separate what the coach permanently IS from what a flow
 * asks it to DO. Both were about to live in one prompt, and they decay
 * differently — a flow is redesigned every few months and a character should not
 * be. When they share a paragraph, editing the onboarding flow quietly edits who
 * the coach is, and nobody notices until it sounds like a different product.
 *
 * The guard below is the structural half of that decision: the character may not
 * mention a flow, a screen, a stage or a step.
 */
import { coachCharacter, COACH_TRAITS } from '../coachCharacter';
import { COACH_INTERVIEW_TASK, coachSystemPrompt } from '../coachPrompts';

describe('the permanent character', () => {
  const character = coachCharacter();

  it('carries every trait the founder named', () => {
    for (const trait of COACH_TRAITS) expect(character).toContain(trait);
  });

  it('says nothing about any particular flow', () => {
    // The words that mean "this conversation" rather than "this coach". If one
    // of them appears here, a flow has leaked into the character.
    for (const word of ['onboarding', 'first run', 'first-run', 'stage', 'screen', 'summary screen', 'Journey you are shaping']) {
      expect(character.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it('does not name the product, because the name is not settled', () => {
    // D3: PushApp is a working name; the candidates are still being cleared. A
    // character that hard-codes one has to be edited the day branding lands.
    expect(character).not.toMatch(/PushApp|MeMore/i);
  });

  it('states the loop as a sequence, not as scattered advice', () => {
    // The Meta Coach spec (partner, v0.8) names it explicitly, and an ordered
    // loop is a different instruction from the same rules listed separately:
    // it says what comes BEFORE asking, which is the whole correction.
    expect(character).toContain('listen → acknowledge → reflect → deepen only if needed');
    expect(character).toContain('hidden questionnaire');
  });

  it('bounds how deep it may go', () => {
    // Depth without a limit becomes therapy, and this is not one.
    expect(character).toContain('not repeated "why"');
    expect(character).toContain('pressure to disclose');
  });

  it('will not let a handle stand in for a name', () => {
    // We have handles. "Hi guyguy" is the exact failure the spec names.
    expect(character).toContain('never use a username or handle as');
  });

  it('forbids performed empathy as well as flattery', () => {
    expect(character).toContain('Never claim to know exactly how they feel');
  });

  it('protects the terminology it is allowed to fix', () => {
    expect(character).toContain('Journey, Milestone, Buddy, Support Circle');
    expect(character).toContain('Never "phase", "program" or "challenge"');
  });
});

describe('personal address', () => {
  it('uses the name it was given, and says to use it sparingly', () => {
    const withName = coachCharacter({ firstName: 'Yoav' });
    expect(withName).toContain('Yoav');
    expect(withName).toContain('Not in every message');
  });

  it('never asks for a name it does not have', () => {
    // "Use their name" without a name makes a model invent one or write
    // "[name]". Both have been seen in the wild and both are worse than nothing.
    const anonymous = coachCharacter();
    expect(anonymous).toContain('Never invent one');
    expect(anonymous).not.toMatch(/\{firstName\}|\[name\]/);
  });

  it('trims a name that is only whitespace back to having none', () => {
    expect(coachCharacter({ firstName: '   ' })).toContain('Never invent one');
    expect(coachCharacter({ firstName: null })).toContain('Never invent one');
  });
});

describe('the interview task', () => {
  it('holds only what is true of THIS conversation', () => {
    expect(COACH_INTERVIEW_TASK).toContain('ONE Journey');
    // Anything that would still be true in an ordinary chat belongs in the
    // character instead.
    expect(COACH_INTERVIEW_TASK).not.toContain('warm');
    expect(COACH_INTERVIEW_TASK).not.toContain('their name');
    expect(COACH_INTERVIEW_TASK.length).toBeLessThan(character().length);
  });

  it('is composed after the character, so who it is comes before what it is doing', () => {
    const prompt = coachSystemPrompt({ firstName: 'Yoav' });
    expect(prompt.indexOf('WHO YOU ARE')).toBeLessThan(prompt.indexOf('THIS CONVERSATION'));
  });
});

const character = () => coachCharacter();
