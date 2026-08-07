/**
 * RateLimitRetryingLlmClient — an {@link LlmClient} decorator that absorbs a free-tier RATE LIMIT
 * (HTTP 429) at the SINGLE-CALL level: the wait-out-the-cool-down-and-retry loop lives INSIDE
 * `complete()`, where each call is an idempotent HTTP request that is safe to repeat. This is
 * deliberately NOT done around an orchestrator turn (`chooseBranch`/`respond`), because those are
 * non-idempotent — re-running `chooseBranch` after a 429 threw "A branch was already chosen" and
 * aborted the run on a transient rate limit. A full interview makes more calls than the per-minute
 * cap allows, so this lets a run ride out each window and complete on the free tier without cost.
 * Bounded (`maxWaits`); any non-429 failure is re-thrown unchanged for the caller to handle/abort.
 *
 * Extracted from the dev harness so BOTH the founder's terminal harness AND the on-device live coach
 * ({@link ./makeCoachLlm}) reuse the exact same retry behaviour behind the one {@link LlmClient} seam.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { LlmError, type LlmClient, type LlmRequest, type LlmResult } from './LlmClient';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Pull the server-suggested "retry in Xs" hint out of a Gemini rate-limit message (free tier caps
 * requests-per-minute), so a run waits exactly as long as asked. Falls back to a sane default and is
 * clamped so a bad hint can never park the client for minutes.
 */
function retryAfterMs(message: string): number {
  const match = /retry in ([\d.]+)s/i.exec(message);
  const seconds = match ? Number(match[1]) : 20;
  const clamped = Math.min(Math.max(Number.isFinite(seconds) ? seconds : 20, 1), 65);
  return Math.ceil(clamped + 1) * 1000; // +1s cushion so we clear the window
}

export class RateLimitRetryingLlmClient implements LlmClient {
  constructor(
    private readonly inner: LlmClient,
    private readonly maxWaits = 8,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResult> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.inner.complete(request);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = err instanceof LlmError ? err.status : undefined;
        const rateLimited = status === 429 || /quota|rate.?limit|retry in/i.test(message);
        if (rateLimited && attempt < this.maxWaits) {
          const waitMs = retryAfterMs(message);
          console.log(
            `\n[i] Free-tier rate limit hit — waiting ${Math.round(waitMs / 1000)}s then retrying (${attempt + 1}/${this.maxWaits})…`,
          );
          await sleep(waitMs);
          continue;
        }
        throw err;
      }
    }
  }
}
