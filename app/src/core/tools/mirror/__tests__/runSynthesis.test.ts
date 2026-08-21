/**
 * Running a synthesis: one call out, one free check back, and a refusal that is always available.
 *
 * The behaviour worth protecting is that NOTHING here can throw while holding other people's
 * answers, and that no route exists by which an unchecked summary reaches a person. Every failure —
 * no session, no network, unreadable JSON, a leak caught locally — ends the same way: that question
 * has no summary, which the product already has words for.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { LlmError, MockLlmClient, type LlmClient } from '../../../llm/LlmClient';
import { runSynthesis, type SynthesisQuestion } from '../runSynthesis';
import { SYNTHESIS_SYSTEM_PROMPT, parseSyntheses } from '../synthesisPrompt';

const questions: SynthesisQuestion[] = [
  {
    questionId: 'q1',
    question: 'When have you seen me at my best?',
    answers: [
      'I saw Daniel calm the room when the launch slipped.',
      'You made space for people to speak.',
      'You bring calm when things get tense.',
    ],
  },
];

/** A client that answers with the given JSON, and records what it was asked. */
function answering(json: string) {
  return new MockLlmClient(() => json);
}

describe('the prompt', () => {
  it('states the prohibitions as prohibitions', () => {
    // A model asked politely does the polite thing most of the time. These are rules somebody's
    // anonymity rests on, so they are stated as rules.
    for (const rule of ['Never name', 'Never quote', 'Never invent a pattern']) {
      expect(SYNTHESIS_SYSTEM_PROMPT).toContain(rule);
    }
  });

  it('fixes the output shape, so there is nowhere to put a stray sentence', () => {
    expect(SYNTHESIS_SYSTEM_PROMPT).toContain('Return ONLY JSON');
  });
});

describe('reading the answer', () => {
  it('parses a well-formed round', () => {
    expect(
      parseSyntheses('{"syntheses":[{"questionId":"q1","text":"You steady a room.","support":3}]}'),
    ).toEqual([{ questionId: 'q1', text: 'You steady a room.', support: 3 }]);
  });

  it('treats unreadable output as nothing rather than throwing', () => {
    // A crash here is a crash while holding other people's answers.
    for (const bad of ['', 'not json at all', '{"syntheses": "nope"}', '{}']) {
      expect(parseSyntheses(bad)).toEqual([]);
    }
  });

  it('drops a row with no question id, and defaults a missing support to zero', () => {
    const rows = parseSyntheses('{"syntheses":[{"text":"x"},{"questionId":"q1","text":"y"}]}');
    expect(rows).toEqual([{ questionId: 'q1', text: 'y', support: 0 }]);
  });
});

describe('running it', () => {
  it('publishes a clean, supported summary', async () => {
    const llm = answering(
      '{"syntheses":[{"questionId":"q1","text":"You steady a room when plans change.","support":3}]}',
    );

    const results = await runSynthesis(llm, questions);

    expect(results).toEqual([
      { questionId: 'q1', published: 'You steady a room when plans change.' },
    ]);
    expect(llm.calls).toHaveLength(1); // one call for the whole round
  });

  it('sends ONE request for the whole round, not one per question', async () => {
    const llm = answering('{"syntheses":[]}');
    await runSynthesis(llm, [
      ...questions,
      { questionId: 'q2', question: 'Second?', answers: ['a', 'b'] },
      { questionId: 'q3', question: 'Third?', answers: ['c', 'd'] },
    ]);

    expect(llm.calls).toHaveLength(1);
    // And every question is in it, so the outputs are written against each other.
    const sent = llm.calls[0].messages[0].content;
    expect(sent).toContain('q1');
    expect(sent).toContain('q3');
  });

  it('CATCHES a leak the model let through, and publishes nothing for that question', async () => {
    // The model was told not to. The check does not depend on it having listened.
    const llm = answering(
      '{"syntheses":[{"questionId":"q1","text":"People like Daniel rely on you.","support":3}]}',
    );

    const [result] = await runSynthesis(llm, questions);

    expect(result.published).toBeNull();
    expect(result.rejection).toBe('leaked');
  });

  it('drops a claim only one person made', async () => {
    const llm = answering('{"syntheses":[{"questionId":"q1","text":"You are patient.","support":1}]}');
    expect((await runSynthesis(llm, questions))[0].rejection).toBe('noPattern');
  });

  it('ends with no summary when there is no session or no network, and never throws', async () => {
    const down: LlmClient = {
      complete: async () => {
        throw new LlmError('No signed-in session for the coach', undefined, 'config');
      },
    };

    const results = await runSynthesis(down, questions);

    expect(results).toEqual([{ questionId: 'q1', published: null, rejection: 'empty' }]);
  });

  it('ends with no summary when the model returns nonsense, and never throws', async () => {
    expect((await runSynthesis(answering('sorry, I cannot help'), questions))[0].published).toBeNull();
  });

  it('does nothing at all for an empty round', async () => {
    const llm = answering('{"syntheses":[]}');
    expect(await runSynthesis(llm, [])).toEqual([]);
    expect(llm.calls).toHaveLength(0);
  });

  it('asks for a deterministic summary — the same answers give the same result', async () => {
    const llm = answering('{"syntheses":[{"questionId":"q1","text":"You steady a room.","support":3}]}');
    await runSynthesis(llm, questions);

    // This is a summary of what people said, not a piece of writing.
    expect(llm.calls[0].temperature).toBe(0);
    expect(llm.calls[0].json).toBe(true);
  });
});
