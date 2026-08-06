/**
 * LlmClient — the SEAM for a large-language-model completion (adaptive coach, S2). The
 * conversational coach (S2.3 orchestrator) talks ONLY to this interface, never to a vendor SDK,
 * so the provider (Gemini free tier today) is swappable with no change to callers — exactly like
 * the {@link ../learning/CoachNarrator} seam it complements.
 *
 * The {@link MockLlmClient} is a DETERMINISTIC stand-in for tests and offline development: it
 * makes NO network call, records the requests it received, and returns a scripted answer. Jest
 * MUST use it (or a mocked fetch) — never the real network.
 *
 * SECURITY-PRIVACY: an {@link LlmRequest} carries the user's goal specifics, which are
 * ON-DEVICE-ONLY raw signal (G1, same invariant as GoalInput/ReasonEntry.note). A request is sent
 * only to the configured provider to serve the user; it is NEVER logged, and never copied into a
 * DomainEvent, ProgressSummary or any sync path.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */

/** Who authored a turn. Mirrors the two roles every chat LLM understands. */
export type LlmRole = 'user' | 'model';

/** One conversational turn fed to the model, in order. */
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

/** A single completion request against the seam. */
export interface LlmRequest {
  /** Optional system / instruction prompt that frames the whole exchange. */
  system?: string;
  /** The ordered conversation so far; the last turn is usually the user's latest message. */
  messages: LlmMessage[];
  /**
   * Structured-output hint: when true the caller wants strict JSON back (the Gemini client asks
   * for `application/json`). The seam does not itself parse the JSON — the caller owns the schema.
   */
  json?: boolean;
  /** Sampling temperature 0..2; provider default when omitted. */
  temperature?: number;
  /** Hard cap on generated tokens; provider default when omitted. */
  maxOutputTokens?: number;
}

/** The model's answer. `text` is the concatenated text of the first candidate. */
export interface LlmResult {
  text: string;
  /** Provider's stop reason (e.g. `STOP`, `MAX_TOKENS`), when reported. */
  finishReason?: string;
  /** The concrete model version that answered, when reported (e.g. `gemini-2.5-flash`). */
  model?: string;
}

/** The completion seam. A real-provider client (see {@link ./GeminiClient}) implements this. */
export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResult>;
}

/**
 * A single, well-typed error for every LLM failure (transport, timeout, non-2xx, empty answer),
 * so callers can degrade gracefully without sniffing vendor error shapes. The message is scrubbed
 * of any secret — an API key is NEVER placed in an error, a log, or a stack.
 */
export class LlmError extends Error {
  constructor(
    message: string,
    /** HTTP status when the failure was an HTTP response; undefined for transport/timeout. */
    readonly status?: number,
    /** Coarse cause tag for callers that branch on it. */
    readonly kind: 'timeout' | 'network' | 'http' | 'empty' | 'config' = 'http',
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/**
 * A deterministic, network-free {@link LlmClient} for tests and offline development. Give it a
 * fixed string, or a responder function of the request for scripted multi-turn behaviour; it
 * records every request in {@link calls} for assertions. Identical inputs → identical output.
 */
export class MockLlmClient implements LlmClient {
  /** Every request this mock received, in order — for test assertions. */
  readonly calls: LlmRequest[] = [];

  constructor(
    private readonly responder:
      | string
      | ((request: LlmRequest, callIndex: number) => string | LlmResult) = 'OK',
  ) {}

  async complete(request: LlmRequest): Promise<LlmResult> {
    const index = this.calls.length;
    this.calls.push(request);
    const answer =
      typeof this.responder === 'function' ? this.responder(request, index) : this.responder;
    return typeof answer === 'string'
      ? { text: answer, finishReason: 'STOP', model: 'mock' }
      : answer;
  }
}
