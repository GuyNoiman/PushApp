/**
 * The coach says its turn instead of selecting it (partner, 2026-09-06).
 *
 * What these tests protect is not the prose — a model writes that and it will differ every run.
 * They protect the two things that make composing SAFE: the model is told everything the person
 * already said and told not to ask for it again, and every failure falls back to the line that
 * shipped before this existed. A composer that can make the coach worse than a canned string is not
 * worth having.
 */
import { composeCoachTurn, looksLikeReflection } from '../composeTurn';
import type { LlmClient, LlmRequest } from '../../llm/LlmClient';

/** A double that records what it was asked and replies with whatever the test wants. */
function llmThat(reply: (req: LlmRequest) => string | Promise<string>): {
  llm: LlmClient;
  calls: LlmRequest[];
} {
  const calls: LlmRequest[] = [];
  const llm: LlmClient = {
    async complete(req: LlmRequest) {
      calls.push(req);
      return { text: await reply(req) };
    },
  } as unknown as LlmClient;
  return { llm, calls };
}

const base = {
  goal: 'change career',
  known: [
    { asked: 'Where are you starting from with this?', answered: 'I have no direction yet' },
    { asked: 'How much time can you give this each week?', answered: '3–5 hours' },
  ],
  prompt: 'What usually gets in the way?',
  reflectionsSoFar: 0,
  locale: 'en',
};

describe('what the composer is told', () => {
  it('hands over everything already answered, so it cannot ask for it twice', async () => {
    const { llm, calls } = llmThat(() => 'And what usually gets in the way?');
    await composeCoachTurn(llm, base);

    const asked = calls[0].messages[0].content;
    expect(asked).toContain('I have no direction yet');
    expect(asked).toContain('3–5 hours');
    expect(asked).toContain('Never ask any of this again');
  });

  it('carries the character, which is where every rule about how to speak already lives', async () => {
    const { llm, calls } = llmThat(() => 'ok');
    await composeCoachTurn(llm, base);
    // One line from the character is enough to prove the whole fragment is attached.
    expect(calls[0].system).toContain('NEVER ASSUME A FACT THEY DID NOT GIVE YOU');
  });

  it('names the language, because a Hebrew conversation must not come back in English', async () => {
    const { llm, calls } = llmThat(() => 'ok');
    await composeCoachTurn(llm, { ...base, locale: 'he' });
    expect(calls[0].system).toContain('he');
  });

  it('forbids reading the answer options aloud — the cards already show them', async () => {
    const { llm, calls } = llmThat(() => 'ok');
    await composeCoachTurn(llm, base);
    expect(calls[0].system).toContain('NEVER list them');
  });

  it('tells it how many reflections have happened, so the budget is respected', async () => {
    const { llm, calls } = llmThat(() => 'ok');
    await composeCoachTurn(llm, { ...base, reflectionsSoFar: 2 });
    expect(calls[0].system).toContain('reflected 2 time(s)');
  });

  it('asks for a summary rather than a question on the closing turn', async () => {
    const { llm, calls } = llmThat(() => 'ok');
    await composeCoachTurn(llm, { ...base, closing: true });
    expect(calls[0].system).toContain('LAST turn before a plan is built');
    expect(calls[0].system).not.toContain('THE QUESTION TO ASK');
  });
});

describe('it can never make the coach worse than the string it replaced', () => {
  it('falls back when the model is unreachable', async () => {
    const { llm } = llmThat(() => {
      throw new Error('no session');
    });
    await expect(composeCoachTurn(llm, base)).resolves.toBe(base.prompt);
  });

  it('falls back on an empty completion', async () => {
    const { llm } = llmThat(() => '   ');
    await expect(composeCoachTurn(llm, base)).resolves.toBe(base.prompt);
  });

  it('falls back on an essay, which is not a coach turn however good it is', async () => {
    const { llm } = llmThat(() => 'x'.repeat(5000));
    await expect(composeCoachTurn(llm, base)).resolves.toBe(base.prompt);
  });

  it('returns the composed turn when there is one', async () => {
    const { llm } = llmThat(() => 'So no direction yet. What usually stops you?');
    await expect(composeCoachTurn(llm, base)).resolves.toBe(
      'So no direction yet. What usually stops you?',
    );
  });
});

describe('counting reflections', () => {
  it('does not count a turn that is only the question', () => {
    expect(looksLikeReflection('What usually gets in the way?', 'x')).toBe(false);
  });

  it('counts a turn that hands something back before asking', () => {
    expect(
      looksLikeReflection(
        'So the first step is not applying anywhere. What usually gets in the way?',
        'x',
      ),
    ).toBe(true);
  });

  it('never counts the fallback, which reflected nothing', () => {
    expect(looksLikeReflection(base.prompt, base.prompt)).toBe(false);
  });
});
