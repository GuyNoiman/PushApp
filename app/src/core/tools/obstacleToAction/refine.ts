/**
 * The coach's refinement of an if–then response — the one place a tool sends a person's own words to
 * a model, and therefore the one place that has to be careful.
 *
 * WHAT IT IS ALLOWED TO DO: take the trigger and the response the person wrote, plus what the local
 * check noticed about their SHAPE, and propose ONE improved version of the same sentence. That is
 * all. It does not advise, does not judge the goal, does not add a second action, and does not
 * invent context it was not given.
 *
 * WHAT IS SENT, exactly and nothing else: the two halves of the sentence, the obstacle they are
 * about, and the flag names. Not the Dream, not the Journey title, not the wish, not the outcome,
 * not the person's name, not their history. The whole request also passes through the redaction
 * seam like every other outbound call (`RedactingLlmClient`), so this is minimisation on top of
 * minimisation.
 *
 * WHAT COMES BACK IS A PROPOSAL, NEVER A REPLACEMENT. The parser returns a candidate; the screen
 * shows it beside the original and the person chooses. A failed call, an unparseable answer or a
 * refusal all mean the same thing here: the original stands, untouched (PRD §6, §11).
 *
 * Pure TypeScript — no React, no vendor imports. The client is passed in.
 */
import type { LlmClient, LlmRequest } from '../../llm/LlmClient';
import type { ObstacleActionResult, QualityFlag } from './model';

/** The two halves, and nothing else, in both directions. */
export interface IfThenSentence {
  trigger: string;
  response: string;
}

/** Everything the model is allowed to see. Assembled here so no caller can widen it by accident. */
export interface RefinementInput extends IfThenSentence {
  /** What usually gets in the way — the sentence is meaningless without it. */
  obstacle: string;
  /** What the local check noticed, by name. The flags are structural, not content. */
  flags: readonly QualityFlag[];
  /** The language to answer in, as a plain name ("Hebrew", "English"). */
  language: string;
}

/** Take exactly the fields that may travel, from a result that holds much more. */
export function refinementInput(
  result: ObstacleActionResult,
  flags: readonly QualityFlag[],
  language: string,
): RefinementInput {
  return {
    trigger: result.trigger,
    response: result.response,
    obstacle: result.obstacle,
    flags,
    language,
  };
}

const SYSTEM = [
  'You help someone sharpen ONE if-then response they wrote for themselves.',
  'You are not a therapist, not a planner, and not a motivator. You rewrite one sentence.',
  '',
  'Rules, all of them hard:',
  '- Keep the person\'s own words wherever they already work. This is their sentence, not yours.',
  '- The trigger must be a moment they would NOTICE as it happens: concrete, in their own life.',
  '- The response must be ONE action, entirely under their own control, small enough to start',
  '  inside that moment even on a bad day.',
  '- Never promise a result, never use absolutes ("always", "never"), never add a second action,',
  '  never invent a detail you were not given, never mention anyone who was not mentioned.',
  '- Do not comment on whether the goal is good. Do not encourage, praise, or diagnose.',
  '- Answer in the SAME language as the person wrote in.',
  '',
  'Return strict JSON only: {"trigger": "...", "response": "..."}',
].join('\n');

/** Build the request. `json: true` because the caller wants two fields, not a paragraph. */
export function buildRefineRequest(input: RefinementInput): LlmRequest {
  const noticed =
    input.flags.length > 0
      ? `What a local check noticed about the shape (structural only): ${input.flags.join(', ')}.`
      : 'The local check noticed nothing; improve only if it is genuinely clearer.';

  return {
    system: SYSTEM,
    json: true,
    temperature: 0.4,
    messages: [
      {
        role: 'user',
        content: [
          `Language to answer in: ${input.language}.`,
          `What usually gets in the way: ${input.obstacle}`,
          `Their trigger: ${input.trigger}`,
          `Their response: ${input.response}`,
          noticed,
        ].join('\n'),
      },
    ],
  };
}

/**
 * Read the model's answer.
 *
 * Returns null for anything that is not two non-empty strings — an apology, a paragraph, a refusal,
 * half an object. Null is the SAFE outcome and the screen treats it as "no proposal", never as an
 * error worth interrupting somebody with.
 */
export function parseRefinement(text: string): IfThenSentence | null {
  const trimmed = text.trim();
  // Providers sometimes wrap JSON in a fenced block even when asked not to.
  const unfenced = trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed: unknown = JSON.parse(unfenced);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { trigger, response } = parsed as Partial<IfThenSentence>;
    if (typeof trigger !== 'string' || typeof response !== 'string') return null;
    if (trigger.trim().length === 0 || response.trim().length === 0) return null;
    return { trigger: trigger.trim(), response: response.trim() };
  } catch {
    return null;
  }
}

/** Whether the proposal is actually different from what the person already wrote. */
export function isDifferent(original: IfThenSentence, proposal: IfThenSentence): boolean {
  return (
    original.trigger.trim() !== proposal.trigger ||
    original.response.trim() !== proposal.response
  );
}

/**
 * Ask for a proposal. Never throws: every failure — no network, a refusal, an unreadable answer, a
 * proposal identical to the original — comes back as null, because none of them is a reason to
 * disturb somebody who already has a sentence that works.
 */
export async function requestRefinement(
  client: LlmClient,
  input: RefinementInput,
): Promise<IfThenSentence | null> {
  try {
    const result = await client.complete(buildRefineRequest(input));
    const parsed = parseRefinement(result.text);
    if (!parsed) return null;
    return isDifferent(input, parsed) ? parsed : null;
  } catch {
    return null;
  }
}
