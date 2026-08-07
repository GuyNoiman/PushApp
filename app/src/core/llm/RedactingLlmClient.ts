/**
 * RedactingLlmClient — the required OUTBOUND-REDACTION seam for the cloud LLM boundary. It is an
 * {@link LlmClient} decorator that runs {@link redactForCloud} over the request's `system` prompt and
 * EVERY `messages[].content` BEFORE delegating to the inner client, so obvious PII (emails, phone
 * numbers) is minimised out of anything that leaves the device (G1 data minimisation).
 *
 * Compose it around the real provider client and inside the retry client (see
 * {@link ./makeCoachLlm}) so the redaction happens on the true outbound request, once, in one place.
 *
 * SECURITY-PRIVACY G1: this is a MINIMISATION step, not a guarantee — it strips the obvious patterns
 * so the cloud model sees the goal, not the user's contact details. The user's on-device raw signal
 * is never logged here; only the redacted request is forwarded to the inner client.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { redactForCloud } from '../coach/SafetyLayer';
import type { LlmClient, LlmRequest, LlmResult } from './LlmClient';

export class RedactingLlmClient implements LlmClient {
  constructor(private readonly inner: LlmClient) {}

  async complete(request: LlmRequest): Promise<LlmResult> {
    const redacted: LlmRequest = {
      ...request,
      ...(request.system !== undefined ? { system: redactForCloud(request.system) } : {}),
      messages: request.messages.map((message) => ({
        ...message,
        content: redactForCloud(message.content),
      })),
    };
    return this.inner.complete(redacted);
  }
}
