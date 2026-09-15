/**
 * THE CHECK — the coach says what it understood, and the person gets to say no.
 *
 * ── WHAT WAS WRONG (founder, 2026-09-14) ───────────────────────────────────────────────────────
 *
 * The coach did say back what it had understood, and it said it well: `composeTurn`'s `closing`
 * instruction is the most carefully written paragraph in the file. It arrived on the turn that also
 * carried the finished `GoalSpec`, which the screen was already building a Journey from.
 *
 *   > There is no moment where it says what it understood before building.
 *
 * A reflection you cannot answer is a speech. These tests hold the two things that make it a check
 * instead:
 *
 *   1. the interview does not end at the last question — the check stands between it and the plan;
 *   2. "Not quite." REBUILDS. The answers the interview collected are dropped and the whole
 *      conversation, correction included, is read again. A correction that is thanked for and then
 *      ignored leaves the plan built on the answer the person just told us was wrong.
 *
 * And one that matters more than it looks: when the reading cannot run (no network, a provider
 * error), the previous answers come BACK. Re-asking somebody every question they already answered,
 * because their correction could not be read, is a worse failure than the stale answer it avoids.
 */
import { MockLlmClient } from '../../llm/LlmClient';
import { CoachOrchestrator, CONFIRM_QUESTION_ID } from '../CoachOrchestrator';

/** Understanding answers one goal; every other call (compose, reading) returns nothing usable. */
function goalMock(handler?: (prompt: string) => string | undefined): MockLlmClient {
  return new MockLlmClient((req) => {
    if (!req.json) return '';
    const custom = handler?.(req.messages.map((m) => m.content).join('\n'));
    if (custom !== undefined) return custom;
    return JSON.stringify({
      goals: [{ title: 'get fit', kind: 'process', domain: 'body_image' }],
    });
  });
}

/** Advance by tapping the first option until the understanding check is on the table. */
async function driveToCheck(orchestrator: CoachOrchestrator) {
  orchestrator.start();
  let turn = await orchestrator.triage('I want to get fit');
  while (turn.question && turn.question.id !== CONFIRM_QUESTION_ID) {
    turn = await orchestrator.selectOption(0);
  }
  return turn;
}

describe('nothing is built before the person says the picture is right', () => {
  it('asks the check after the last question instead of finishing', async () => {
    const orchestrator = new CoachOrchestrator({ llm: goalMock() });

    const check = await driveToCheck(orchestrator);

    expect(check.done).toBe(false);
    expect(check.goalSpec).toBeUndefined();
    expect(check.state.phase).toBe('confirm');
    // Free text is allowed so the correction can be written straight into this turn.
    expect(check.question?.allowOther).toBe(true);
  });

  it('finishes on "That’s right." and only then produces the GoalSpec', async () => {
    const orchestrator = new CoachOrchestrator({ llm: goalMock() });
    await driveToCheck(orchestrator);

    const done = await orchestrator.selectOption(0);

    expect(done.done).toBe(true);
    expect(done.goalSpec).toBeDefined();
  });

  it('asks what is wrong on "Not quite." — in free text, with no options to pick from', async () => {
    const orchestrator = new CoachOrchestrator({ llm: goalMock() });
    await driveToCheck(orchestrator);

    const asking = await orchestrator.selectOption(1);

    expect(asking.done).toBe(false);
    expect(asking.state.phase).toBe('correcting');
    expect(asking.question?.options).toEqual([]);
    expect(asking.question?.allowOther).toBe(true);
  });
});

describe('a correction rebuilds rather than being acknowledged', () => {
  it('drops what the interview recorded and keeps only what the new reading finds', async () => {
    // The reading strikes ONE question off. Everything the interview had collected is gone, so what
    // survives is what the re-read of the whole conversation found — not what was there before.
    let asked: string[] = [];
    const orchestrator = new CoachOrchestrator({
      llm: goalMock((prompt) => {
        if (!prompt.includes('id:')) return undefined;
        asked = [...prompt.matchAll(/- id: (\S+)/g)].map((m) => m[1]);
        return JSON.stringify({ answered: { [asked[0]]: 'something they said' } });
      }),
    });
    const check = await driveToCheck(orchestrator);
    const answeredBefore = Object.keys(check.state.spec.answers ?? {});

    const after = await orchestrator.answerOther('you have the reason wrong — it is not about weight');

    // Back in the interview rather than acknowledged, and asking again for what the reading could
    // no longer find in the conversation.
    expect(answeredBefore.length).toBeGreaterThan(1);
    expect(after.done).toBe(false);
    expect(after.state.phase).toBe('questions');
    expect(after.question).toBeDefined();
    expect(answeredBefore).toContain(after.question!.id);
  });

  it('keeps the correction in the conversation the next reading sees', async () => {
    const transcripts: string[] = [];
    const orchestrator = new CoachOrchestrator({
      llm: goalMock((prompt) => {
        if (!prompt.includes('id:')) return undefined;
        transcripts.push(prompt);
        return JSON.stringify({ answered: {} });
      }),
    });
    await driveToCheck(orchestrator);

    await orchestrator.answerOther('it is not about weight, it is about my back');

    expect(transcripts[transcripts.length - 1]).toContain('it is about my back');
  });

  it('puts the answers back when the reading could not run, and asks the check again', async () => {
    // An unparseable reading is how `readConversation` reports failure: it is silent by design.
    const orchestrator = new CoachOrchestrator({
      llm: goalMock((prompt) => (prompt.includes('id:') ? 'not json at all' : undefined)),
    });
    const check = await driveToCheck(orchestrator);
    const before = Object.keys(check.state.spec.answers ?? {}).length;

    const after = await orchestrator.answerOther('you have it wrong');

    // Straight back to the check — not a second run through an interview already answered.
    expect(after.question?.id).toBe(CONFIRM_QUESTION_ID);
    expect(after.state.phase).toBe('confirm');
    expect(before).toBeGreaterThan(0);
  });
});
