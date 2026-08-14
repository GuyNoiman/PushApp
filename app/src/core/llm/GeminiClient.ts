/**
 * GeminiClient — the Gemini implementation of the {@link LlmClient} seam (adaptive coach, S2). It
 * is the ONLY module that knows the Gemini REST shape (vendor isolation, Engineering Bible §3), so
 * swapping providers touches this file alone.
 *
 * Talks to the v1beta `generateContent` REST endpoint directly (no SDK — one less dependency and
 * no bundle weight). Provider = Gemini on the founder's **billing-enabled (PAID) project** — the
 * founder pays for Gemini and this is the key in use — capped ~$10/mo (default model
 * `gemini-2.5-flash`). The tier is a privacy property, not just a billing detail: what the provider
 * may do with prompt content differs between the free and the paid tier, so our "the user's
 * disclosures are used only to serve them" posture rests on staying PAID — do not move this key back
 * to the free tier. Google's API terms are the authority on what each tier actually permits; check
 * them there, not in this comment. Both
 * `x-goog-api-key` header and `?key=` query auth work; we use the HEADER so the key never lands in
 * a URL, a redirect, or a request log.
 *
 * SECURITY-PRIVACY: the key is read (in order) from an explicit constructor option, then
 * `EXPO_PUBLIC_GEMINI_API_KEY` (the on-device / Metro-inlined var), then `GEMINI_API_KEY` (Node /
 * tests / the dev harness) — NEVER hardcoded, NEVER logged, NEVER placed in an error message or URL.
 * A request body carries the user's ON-DEVICE-ONLY goal specifics (G1); it is sent only to serve the
 * user and is never persisted or synced by this client.
 *
 * NOTE (Expo runtime): only `EXPO_PUBLIC_`-prefixed vars are inlined into the RN bundle, so the
 * on-device build reads `process.env.EXPO_PUBLIC_GEMINI_API_KEY` (Metro inlines the literal below at
 * build time) while Node/tests and the harness read `GEMINI_API_KEY` — both from the founder's
 * git-ignored `.env.local`. Opt-in and founder-device-only (see `featureFlags.liveCoach`).
 *
 * Pure TypeScript — no React, no UI, no vendor SDK.
 */
import {
  LlmError,
  type LlmClient,
  type LlmMessage,
  type LlmRequest,
  type LlmResult,
} from './LlmClient';

/** A flash model confirmed reachable on this (paid) key (2026-08-04). */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 20000;

/** Construction options — everything is overridable so the client is testable and re-targetable. */
export interface GeminiClientOptions {
  /**
   * The API key; when omitted, defaults to `EXPO_PUBLIC_GEMINI_API_KEY` (on-device / Metro-inlined)
   * then `GEMINI_API_KEY` (Node / tests / harness). Never logged. Keep passing it in tests.
   */
  apiKey?: string;
  /** Model id, e.g. `gemini-2.5-flash`; defaults to a flash model confirmed on the paid project. */
  model?: string;
  /** REST base URL; defaults to the public v1beta host. */
  baseUrl?: string;
  /** Per-request timeout in ms; defaults to 20s. */
  timeoutMs?: number;
  /** Injectable fetch, so tests never touch the network. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

/** The minimal slice of the Gemini `generateContent` response we read. */
interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  modelVersion?: string;
  error?: { message?: string; status?: string };
}

export class GeminiClient implements LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiClientOptions = {}) {
    // The `process.env.EXPO_PUBLIC_GEMINI_API_KEY` literal MUST stay verbatim so Metro inlines it
    // into the on-device bundle; `GEMINI_API_KEY` covers Node/tests/the harness.
    this.apiKey = (
      options.apiKey ??
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ??
      process.env.GEMINI_API_KEY ??
      ''
    ).trim();
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async complete(request: LlmRequest): Promise<LlmResult> {
    if (!this.apiKey) {
      // Fail with a clear, secret-free reason rather than sending an unauthenticated call.
      throw new LlmError('GEMINI_API_KEY is not set', undefined, 'config');
    }

    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header auth keeps the key out of the URL / any redirect or access log.
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(buildRequestBody(request)),
        signal: controller.signal,
      });
    } catch (err) {
      // AbortError ⇒ our timeout fired; anything else is a transport failure. Never leak the key.
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new LlmError(
        aborted ? `Gemini request timed out after ${this.timeoutMs}ms` : 'Gemini request failed',
        undefined,
        aborted ? 'timeout' : 'network',
      );
    } finally {
      clearTimeout(timer);
    }

    const json = (await response.json().catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
      // Surface the provider's message (quota, bad model, …) but never the request or key.
      throw new LlmError(
        json.error?.message ?? `Gemini returned HTTP ${response.status}`,
        response.status,
        'http',
      );
    }

    const candidate = json.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new LlmError('Gemini returned no text', response.status, 'empty');
    }

    return {
      text,
      finishReason: candidate?.finishReason,
      model: json.modelVersion ?? this.model,
    };
  }
}

/** Map the vendor-neutral {@link LlmRequest} onto the Gemini `generateContent` body shape. */
function buildRequestBody(request: LlmRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents: request.messages.map((message: LlmMessage) => ({
      role: message.role,
      parts: [{ text: message.content }],
    })),
  };

  if (request.system) {
    body.systemInstruction = { parts: [{ text: request.system }] };
  }

  const generationConfig: Record<string, unknown> = {};
  if (request.json) generationConfig.responseMimeType = 'application/json';
  if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
  if (request.maxOutputTokens !== undefined) {
    generationConfig.maxOutputTokens = request.maxOutputTokens;
  }
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

  return body;
}
