/**
 * Running a confidential synthesis: one call out, one free check back.
 *
 * ── ITS OWN CLIENT, NOT THE COACH'S ────────────────────────────────────────────────────────────
 *
 * The coach's stack redacts on the way out, because it is minimising a person's own words. **This
 * must not**, and the reason is the whole job: the model is here to de-identify, and handing it
 * pre-mangled text would destroy exactly the detail it has to generalise and leave it summarising
 * something nobody wrote. So Mirror composes its own client, and the safety sits where it belongs —
 * the paid provider's terms, the prompt's prohibitions, and the free local check on the way back.
 *
 * The founder, 2026-08-21: we use the Gemini he pays for, and **when that is replaced this tool's
 * model is replaced with it.** That is why the provider lives behind one factory and one line: a
 * swap is an edit to {@link makeSynthesisLlm}, and nothing above it changes.
 *
 * ── WHAT IT COSTS, since this is the first thing in the app that spends per use ────────────────
 *
 * One round is five questions × roughly five answers, plus the instructions once: on the order of
 * **3–4k tokens in and 500 out**. On Flash-class pricing that is a fraction of a cent per round, and
 * it is per ROUND rather than per conversation — a person does this a few times a year, not daily.
 * It is metered like everything else, so the number is never a guess.
 *
 * ── AND IT CAN ALWAYS SAY NO ───────────────────────────────────────────────────────────────────
 *
 * Every failure — no session, no network, unreadable JSON, a leak caught locally — ends as a
 * question with no published summary. That is a state the product already has words for, and it is
 * always better than a synthesis nobody checked.
 */
import { GeminiClient } from '../../llm/GeminiClient';
import type { LlmClient } from '../../llm/LlmClient';
import { MeteringLlmClient, type SpendSink } from '../../llm/MeteringLlmClient';
import { RateLimitRetryingLlmClient } from '../../llm/RateLimitRetryingLlmClient';
import { supabase } from '../../social/supabaseClient';
import { checkRound, type CheckedSynthesis, type SynthesisInput } from './synthesis';
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisRequest,
  parseSyntheses,
} from './synthesisPrompt';

/**
 * The client this tool talks to.
 *
 * Retry ∘ Gemini, through the same proxy the coach uses — the key is on the server and the request
 * carries the user's own session. **No redacting layer**, for the reason in the header.
 */
export function makeSynthesisLlm(onSpend?: SpendSink): LlmClient {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const client = supabase;
  const gemini =
    base && client
      ? new GeminiClient({
          proxyUrl: `${base.replace(/\/+$/, '')}/functions/v1/gemini-proxy`,
          getAccessToken: async () => {
            const { data } = await client.auth.getSession();
            return data.session?.access_token ?? null;
          },
        })
      : new GeminiClient();
  const stack = new RateLimitRetryingLlmClient(gemini);
  return onSpend ? new MeteringLlmClient(stack, onSpend) : stack;
}

export interface SynthesisQuestion extends SynthesisInput {
  /** The question as the contributors saw it, so the model summarises the right thing. */
  question: string;
}

/**
 * Produce the round's syntheses.
 *
 * Returns one entry per question, published or not. It never throws: a thrown error here would be an
 * error thrown while holding other people's answers, and there is nothing a caller could do with it
 * that "this question has no summary" does not already say.
 */
export async function runSynthesis(
  llm: LlmClient,
  questions: readonly SynthesisQuestion[],
): Promise<CheckedSynthesis[]> {
  if (questions.length === 0) return [];

  let raw: ReturnType<typeof parseSyntheses> = [];
  try {
    const result = await llm.complete({
      system: SYNTHESIS_SYSTEM_PROMPT,
      json: true,
      // Zero, because this is a summary of what people said and not a piece of writing. The same
      // answers should produce the same synthesis twice.
      temperature: 0,
      messages: [{ role: 'user', content: buildSynthesisRequest(questions) }],
    });
    raw = parseSyntheses(result.text);
  } catch {
    // No session, no network, a provider error. Every question ends with no summary, which the
    // screen already knows how to say.
    raw = [];
  }

  // The free check runs over what came back, whatever came back — including nothing.
  return checkRound(
    questions.map(({ questionId, answers }) => ({ questionId, answers })),
    raw,
  );
}
