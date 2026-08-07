/**
 * makeCoachLlm — the one place that composes the {@link LlmClient} stack the on-device live coach
 * talks to. Reading outward-in, a request passes through:
 *
 *   RateLimitRetryingLlmClient  → rides out a free-tier 429 at the single-call level
 *     └ RedactingLlmClient      → minimises PII out of the outbound request (G1)
 *         └ GeminiClient        → the real provider call (reads EXPO_PUBLIC_GEMINI_API_KEY)
 *
 * Keeping the composition here means callers (the {@link ../../components/coach/useLiveCoach} hook)
 * never wire vendor + privacy + retry concerns by hand, and the redaction seam can never be skipped.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { GeminiClient } from './GeminiClient';
import type { LlmClient } from './LlmClient';
import { RateLimitRetryingLlmClient } from './RateLimitRetryingLlmClient';
import { RedactingLlmClient } from './RedactingLlmClient';

/** Build the composed LlmClient the live coach uses (retry ∘ redact ∘ Gemini). */
export function makeCoachLlm(): LlmClient {
  return new RateLimitRetryingLlmClient(new RedactingLlmClient(new GeminiClient()));
}
