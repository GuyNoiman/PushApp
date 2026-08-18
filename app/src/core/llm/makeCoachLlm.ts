/**
 * makeCoachLlm — the one place that composes the {@link LlmClient} stack the on-device live coach
 * talks to. Reading outward-in, a request passes through:
 *
 *   RateLimitRetryingLlmClient  → rides out a 429 at the single-call level
 *     └ RedactingLlmClient      → minimises PII out of the outbound request (G1)
 *         └ GeminiClient        → the provider call
 *
 * Keeping the composition here means callers (the {@link ../../components/coach/useLiveCoach} hook)
 * never wire vendor + privacy + retry concerns by hand, and the redaction seam can never be skipped.
 *
 * WHICH TRANSPORT, and why it is decided here rather than by the caller:
 *
 *  · **Proxy** whenever Supabase is configured — which is every real build. The request goes to our
 *    `gemini-proxy` Edge Function carrying the user's own session, and **the API key is not in the
 *    app at all**. It used to be read from `EXPO_PUBLIC_GEMINI_API_KEY`, which Metro inlines into
 *    the bundle: extractable by anyone who installs the app, and uncapped — it bills the founder's
 *    card until he notices. That is not a risk you accept when you hand a build to someone else.
 *  · **Direct** only when there is no Supabase — Node, tests, the dev harness — where no session
 *    exists to authenticate with and the key comes from a git-ignored local env.
 *
 * The rule to hold: a build that ships to another device must never take the direct branch. It
 * cannot today, because the branch is chosen by whether Supabase is configured and a shipped build
 * always has it.
 *
 * Pure TypeScript — no React, no UI, no vendor imports beyond the shared Supabase client.
 */
import { GeminiClient } from './GeminiClient';
import type { LlmClient } from './LlmClient';
import { RateLimitRetryingLlmClient } from './RateLimitRetryingLlmClient';
import { RedactingLlmClient } from './RedactingLlmClient';
import { supabase } from '../social/supabaseClient';

/** The deployed Edge Function's URL, derived from the project URL so nothing extra is configured. */
function proxyUrl(): string | undefined {
  // LOCAL ESCAPE HATCH. `EXPO_PUBLIC_LLM_DIRECT` forces the direct path, for the window between
  // this code landing and the function being deployed — without it the coach would simply stop
  // working on the founder's own machine, and "the key is now safe" would read as "the coach is
  // broken". It belongs ONLY in the git-ignored `.env.local`: setting it in the EAS environment
  // would put the key back into a shipped bundle, which is the entire thing this file prevents.
  if (process.env.EXPO_PUBLIC_LLM_DIRECT) return undefined;
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  return base ? `${base.replace(/\/+$/, '')}/functions/v1/gemini-proxy` : undefined;
}

/** Build the composed LlmClient the live coach uses (retry ∘ redact ∘ Gemini). */
export function makeCoachLlm(): LlmClient {
  const url = proxyUrl();
  // Bound to a local const so the narrowing survives into the async closure below.
  const client = supabase;
  const gemini =
    url && client
      ? new GeminiClient({
          proxyUrl: url,
          // Read at call time, never cached: a session can refresh or end between two messages in
          // one conversation, and a stale token would fail the second one for no visible reason.
          getAccessToken: async () => {
            const { data } = await client.auth.getSession();
            return data.session?.access_token ?? null;
          },
        })
      : new GeminiClient();
  return new RateLimitRetryingLlmClient(new RedactingLlmClient(gemini));
}
