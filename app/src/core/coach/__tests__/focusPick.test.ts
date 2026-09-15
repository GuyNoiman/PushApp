/**
 * THE FOCUS PICK, opened to free text (founder, 2026-09-15).
 *
 * Somebody writes two goals in their own words, and the second thing the coach did was hand them a
 * numbered menu with no way out — `allowOther: false`. It was the most jarring card in the flow
 * because it arrives so early, before anything has been established.
 *
 * It is open now, and these tests hold what makes that safe rather than merely nicer:
 *
 *   · the goals are still the only real answers, so the CARDS stay and the question stays closed in
 *     substance — a typed sentence is mapped back onto one of the goals the engine actually offered;
 *   · the model returns a POSITION and the engine validates it against what it surfaced, so nothing
 *     it invents can enter state;
 *   · a reading that cannot be placed — "both", a question, a failed call — changes NOTHING. The
 *     same question stands. Choosing for somebody here would build one goal and park the one they
 *     came for, silently.
 */
import { MockLlmClient } from '../../llm/LlmClient';
import { CoachOrchestrator, FOCUS_QUESTION_ID } from '../CoachOrchestrator';

const FOCUS_CALL = 'which one they chose';
const READING_CALL = 'You are the reading step';

const TWO_GOALS = {
  goals: [
    { title: 'Drink protein every day', kind: 'recurring', domain: 'body_image' },
    { title: 'Pushups 100 to 500 per week', kind: 'process', domain: 'body_image' },
  ],
};

/** Two goals from the opening; the focus reader's answer is supplied per-test. */
function focusMock(focusAnswer: string | (() => never)): MockLlmClient {
  return new MockLlmClient((req) => {
    const system = req.system ?? '';
    if (system.includes(FOCUS_CALL)) {
      return typeof focusAnswer === 'string' ? focusAnswer : focusAnswer();
    }
    if (system.includes(READING_CALL)) return '{}';
    if (req.json) return JSON.stringify(TWO_GOALS);
    return '';
  });
}

/** Ask for two goals, and stop on the focus turn. */
async function driveToFocus(orchestrator: CoachOrchestrator) {
  orchestrator.start();
  return orchestrator.triage('I want to drink protein every day and get to 500 pushups a week');
}

describe('the focus pick takes a sentence as well as a tap', () => {
  it('offers the goals as cards AND leaves free text open', async () => {
    const orchestrator = new CoachOrchestrator({ llm: focusMock('{}') });

    const focus = await driveToFocus(orchestrator);

    expect(focus.question?.id).toBe(FOCUS_QUESTION_ID);
    expect(focus.question?.options).toHaveLength(2);
    expect(focus.question?.allowOther).toBe(true);
  });

  it('reads a typed answer onto the goal it names, and defers the other', async () => {
    const orchestrator = new CoachOrchestrator({ llm: focusMock(JSON.stringify({ choice: 2 })) });

    await driveToFocus(orchestrator);
    const turn = await orchestrator.answerOther('the pushups one — the protein can wait');

    expect(turn.state.phase).not.toBe('focus');
    expect(turn.state.spec.title).toBe('Pushups 100 to 500 per week');
    expect(turn.state.spec.deferredGoals?.map((g) => g.title)).toEqual(['Drink protein every day']);
  });

  it('changes nothing when the answer is ambiguous — the same question stands', async () => {
    const orchestrator = new CoachOrchestrator({ llm: focusMock('{}') });

    await driveToFocus(orchestrator);
    const turn = await orchestrator.answerOther('both, really');

    expect(turn.state.phase).toBe('focus');
    expect(turn.question?.id).toBe(FOCUS_QUESTION_ID);
    expect(turn.question?.options).toHaveLength(2);
    // Nothing was activated: no goal, no expert, no deferral.
    expect(turn.state.spec.title).toBe('');
    expect(turn.state.spec.deferredGoals).toBeUndefined();
    expect(turn.activeExpert).toBeUndefined();
  });

  it('ignores a choice that was never offered', async () => {
    const orchestrator = new CoachOrchestrator({ llm: focusMock(JSON.stringify({ choice: 7 })) });

    await driveToFocus(orchestrator);
    const turn = await orchestrator.answerOther('the third one');

    expect(turn.state.phase).toBe('focus');
    expect(turn.state.spec.title).toBe('');
  });

  it('changes nothing when the reading call fails outright', async () => {
    const orchestrator = new CoachOrchestrator({
      llm: focusMock(() => {
        throw new Error('no network');
      }),
    });

    await driveToFocus(orchestrator);
    const turn = await orchestrator.answerOther('the pushups one');

    expect(turn.state.phase).toBe('focus');
    expect(turn.state.spec.title).toBe('');
  });

  it('still records a tapped option exactly as it did before', async () => {
    const orchestrator = new CoachOrchestrator({ llm: focusMock('{}') });

    await driveToFocus(orchestrator);
    const turn = await orchestrator.selectOption(0);

    expect(turn.state.spec.title).toBe('Drink protein every day');
    expect(turn.state.spec.deferredGoals?.map((g) => g.title)).toEqual([
      'Pushups 100 to 500 per week',
    ]);
  });
});
