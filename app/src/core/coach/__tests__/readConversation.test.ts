/**
 * Striking off what somebody has already told us (founder, 2026-09-14).
 *
 * The engine used to hold an array and a pointer, so a person could write "17 years as a restaurant
 * owner and I want to change career" and be asked, one turn later, where they were starting from.
 * Now the whole outstanding set is read against the whole conversation after every message.
 *
 * These tests are about the VALIDATION, not the reading. A model's reading is a suggestion; what
 * makes it safe to act on is that everything it returns is checked against the questions the engine
 * actually handed it. A wrongly struck fact becomes part of a plan built for somebody who never said
 * it and will never know it was guessed — which is the one outcome worse than an extra question.
 */
import { validate } from '../readConversation';
import type { DomainQuestion } from '../../learning/DomainExpert';

const q = (id: string, intent: DomainQuestion['intent'], options: string[]): DomainQuestion => ({
  id,
  intent,
  prompt: `about ${id}`,
  options,
  allowOther: true,
});

const outstanding = [
  q('career.obstacles', 'obstacles', ['Not knowing where to start', 'No time outside work']),
  q('career.time', 'time', ['Under 1 hour', '1–3 hours', '3–5 hours']),
  q('shared.horizon', 'horizon', ['About a month', 'About two months']),
];

describe('what it accepts', () => {
  it('strikes off an approximate question from ordinary language', () => {
    // Obstacles feed the wording, not the arithmetic. Understood at eighty per cent they beat
    // asking again.
    const read = validate(
      JSON.stringify({ answered: { 'career.obstacles': 'I never know where to begin' } }),
      outstanding,
    );
    expect(read.resolved['career.obstacles']).toBe('I never know where to begin');
  });

  it('takes the suggested next question when it is one that is still outstanding', () => {
    const read = validate(JSON.stringify({ answered: {}, next: 'shared.horizon' }), outstanding);
    expect(read.nextId).toBe('shared.horizon');
  });
});

describe('what it refuses, because these answers reach the Planner', () => {
  it('will not strike off weekly time from a vague sentence', () => {
    // "A couple of hours maybe" is not one of the options, and guessing which one it meant changes
    // the plan itself.
    const read = validate(
      JSON.stringify({ answered: { 'career.time': 'a couple of hours maybe' } }),
      outstanding,
    );
    expect(read.resolved['career.time']).toBeUndefined();
  });

  it('accepts an exact answer even when the model changed its capitalisation', () => {
    // The model echoes the option rather than copying it byte for byte, and refusing that would
    // reject correct readings for no reason.
    const read = validate(
      JSON.stringify({ answered: { 'career.time': '3–5 HOURS' } }),
      outstanding,
    );
    expect(read.resolved['career.time']).toBe('3–5 hours');
  });

  it('refuses the same vagueness for how long the Journey runs', () => {
    const read = validate(
      JSON.stringify({ answered: { 'shared.horizon': 'a while' } }),
      outstanding,
    );
    expect(read.resolved['shared.horizon']).toBeUndefined();
  });
});

describe('what it refuses because nobody offered it', () => {
  it('drops a question the engine did not hand it', () => {
    const read = validate(
      JSON.stringify({ answered: { 'career.salary': 'a lot' } }),
      outstanding,
    );
    expect(read.resolved).toEqual({});
  });

  it('ignores a next that was not on the table', () => {
    const read = validate(JSON.stringify({ answered: {}, next: 'career.salary' }), outstanding);
    expect(read.nextId).toBeUndefined();
  });

  it('never suggests asking something it just reported as answered', () => {
    const read = validate(
      JSON.stringify({
        answered: { 'career.obstacles': 'I never know where to begin' },
        next: 'career.obstacles',
      }),
      outstanding,
    );
    expect(read.nextId).toBeUndefined();
  });
});

describe('when the reading is unusable', () => {
  it.each([
    ['not JSON at all', 'sorry, I cannot do that'],
    ['an empty body', ''],
    ['the wrong shape', '{"answered": "everything"}'],
  ])('claims nothing from %s', (_name, raw) => {
    // Silence, never a guess. The caller then asks the question, which is exactly what it did
    // before any of this existed.
    expect(validate(raw, outstanding)).toEqual({ resolved: {} });
  });

  it('drops a value that is not a string', () => {
    const read = validate(JSON.stringify({ answered: { 'career.obstacles': 42 } }), outstanding);
    expect(read.resolved).toEqual({});
  });

  it('drops an empty value, which answers nothing', () => {
    const read = validate(JSON.stringify({ answered: { 'career.obstacles': '   ' } }), outstanding);
    expect(read.resolved).toEqual({});
  });
});
