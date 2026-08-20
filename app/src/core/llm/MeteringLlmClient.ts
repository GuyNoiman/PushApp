/**
 * MeteringLlmClient — the decorator that makes a conversation's budget impossible to forget.
 *
 * Every call that passes through it is reported to a sink, whether it succeeded or failed. That
 * placement is the whole idea: if the orchestrator had to remember to record its own spending, the
 * one path that forgot would be the one that loops. Wrapping the seam means the accounting is a
 * property of MAKING a call, not of remembering to.
 *
 * TWO RULES IT ENFORCES, both of which exist because the naive version gets them wrong:
 *
 *  · **A FAILED call still counts.** A timeout after the request was sent cost real tokens, and a
 *    request that fails ten times in a row is exactly the runaway a budget is for. It is recorded
 *    and then re-thrown untouched — this decorator never changes what a caller sees.
 *  · **A MISSING token count is not zero.** When the provider reports nothing, the request's own
 *    estimated size is charged instead. Reading absence as free is how a budget silently stops
 *    counting the day a provider changes its response shape.
 *
 * SECURITY-PRIVACY G1: the sink receives NUMBERS. Not the prompt, not the answer, not a fragment of
 * either. What a conversation cost is not what it was about.
 *
 * Pure TypeScript — no React, no storage, no vendor imports.
 */
import { estimateTokens } from './conversationBudget';
import type { LlmClient, LlmRequest, LlmResult } from './LlmClient';

/** Where the numbers go. Called exactly once per call, success or failure. */
export type SpendSink = (tokens: number) => void;

/** Roughly how big a request is, for the fallback when the provider reports nothing. */
function estimateRequest(request: LlmRequest): number {
  const body = [request.system, ...request.messages.map((m) => m.content)]
    .filter((part): part is string => Boolean(part))
    .join('\n');
  return estimateTokens(body);
}

export class MeteringLlmClient implements LlmClient {
  constructor(
    private readonly inner: LlmClient,
    private readonly sink: SpendSink,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResult> {
    const estimated = estimateRequest(request);
    try {
      const result = await this.inner.complete(request);
      // The provider's own count when there is one; our estimate of what we SENT when there is not.
      this.sink(result.usage?.totalTokens ?? estimated);
      return result;
    } catch (e) {
      // It still cost whatever we sent. Charge it, then get out of the way.
      this.sink(estimated);
      throw e;
    }
  }
}
