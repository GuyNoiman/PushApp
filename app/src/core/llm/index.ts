/**
 * LLM layer entry point — the vendor-neutral {@link LlmClient} seam (adaptive coach, S2) and its
 * Gemini implementation. Callers depend on the seam; only {@link GeminiClient} knows the vendor.
 */
export * from './LlmClient';
export * from './GeminiClient';
