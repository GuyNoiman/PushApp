/**
 * planningConversation — one scripted `planning` conversation, and a record of every model request
 * it made. Shared by the request-log lock (`planningRequestLog.test.ts`) and the Portrait handoff
 * tests, so both drive the SAME conversation and a difference between them is a difference in the
 * engine rather than in the script.
 *
 * Not a test file (it does not match `*.test.ts`), exactly like `../../__tests__/fixedClock.ts`.
 *
 * CHANGING THIS FILE CHANGES THE LOCKED SNAPSHOT. That is the point of it: the snapshot is a
 * statement about what today's planning conversation sends, and a helper that quietly drove a
 * different conversation would make that statement about nothing.
 */
import { MockLlmClient, type LlmRequest } from '../../llm/LlmClient';
import { CONFIRM_QUESTION_ID, type CoachOrchestrator, type CoachTurn } from '../CoachOrchestrator';

/** Which of the coach's steps a request belongs to, read from its system prompt. */
export type PlanningStep = 'understanding' | 'signals' | 'focus' | 'reader' | 'compose' | 'other';

export function stepOf(req: LlmRequest): PlanningStep {
  const system = req.system ?? '';
  if (!req.json) return 'compose';
  if (system.includes("coach's understanding step")) return 'understanding';
  if (system.includes("coach's signal-reading step")) return 'signals';
  if (system.includes('You are the reading step of a coaching conversation')) return 'reader';
  if (system.includes('offered a short numbered list of their OWN goals')) return 'focus';
  return 'other';
}

/** What each step answers. A step that throws is a step that could not reach a model. */
export type PlanningScript = Partial<Record<PlanningStep, (req: LlmRequest, index: number) => string>>;

/** The career goal the understanding step reads out of the opening message, by default. */
export const CAREER_GOAL = JSON.stringify({
  goals: [{ title: 'find a job that fits', kind: 'process', domain: 'career' }],
});

/**
 * A model that answers each step with whatever the script says. The defaults are the shape of a
 * conversation where every call is reached and nothing is over-read: the composer writes a short
 * numbered line (so the history really is replaced, as it is on a device), and the reader strikes
 * nothing off (so every question in the slate is actually asked).
 */
export function planningMock(script: PlanningScript = {}): MockLlmClient {
  const defaults: Record<PlanningStep, (req: LlmRequest, index: number) => string> = {
    understanding: () => CAREER_GOAL,
    signals: () => JSON.stringify({ signals: { targetClarity: 'broad' } }),
    focus: () => JSON.stringify({ choice: 1 }),
    reader: () => JSON.stringify({ answered: {} }),
    compose: (_req, index) => `Composed turn ${index}.`,
    other: () => '{}',
  };
  return new MockLlmClient((req, index) => (script[stepOf(req)] ?? defaults[stepOf(req)])(req, index));
}

/** How one question is answered: a tapped option, or words. Absent ⇒ the first option. */
export type Answer = { pick: number } | { say: string };

export interface DrivenConversation {
  /** Every question id the person was shown, in order, including the check. */
  asked: string[];
  /** The turn the conversation ended on (done, or a turn that could not go further). */
  last: CoachTurn;
}

/**
 * Drive a started orchestrator from its opening message to the end: every question is answered by
 * `answers[id]` when present and by its first option otherwise, and the check is confirmed.
 *
 * A turn that reopens the composer (no Journey found) or carries no question stops the walk rather
 * than looping — the caller asserts on `last`.
 */
export async function drivePlanning(
  orchestrator: CoachOrchestrator,
  opening: string,
  answers: Record<string, Answer> = {},
): Promise<DrivenConversation> {
  const asked: string[] = [];
  let turn = await orchestrator.triage(opening);
  for (let guard = 0; guard < 40; guard += 1) {
    if (turn.done || turn.awaitingGoalText || !turn.question) break;
    const id = turn.question.id;
    asked.push(id);
    const answer: Answer = id === CONFIRM_QUESTION_ID ? { pick: 0 } : answers[id] ?? { pick: 0 };
    turn = 'say' in answer
      ? await orchestrator.answerOther(answer.say)
      : await orchestrator.selectOption(answer.pick);
  }
  return { asked, last: turn };
}

/**
 * The requests, in a shape a snapshot can hold. System prompts are long and mostly repeated, so each
 * distinct one is listed once and every request points at it by number — a change to any prompt
 * still shows up as a readable diff, in one place.
 */
export function requestLog(calls: readonly LlmRequest[]) {
  const systems: string[] = [];
  const requests = calls.map((req) => {
    const system = req.system ?? '';
    let at = systems.indexOf(system);
    if (at < 0) {
      systems.push(system);
      at = systems.length - 1;
    }
    return {
      step: stepOf(req),
      system: at,
      json: req.json ?? false,
      temperature: req.temperature,
      maxOutputTokens: req.maxOutputTokens,
      messages: req.messages.map((m) => `${m.role}: ${m.content}`),
    };
  });
  return { requests, systems };
}
