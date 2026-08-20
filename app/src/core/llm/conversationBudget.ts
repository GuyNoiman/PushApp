/**
 * conversationBudget — what one conversation is allowed to cost, and what the coach does as it runs
 * out.
 *
 * THE PROBLEM IT SOLVES (founder, 2026-08-20): a conversation must not be able to cost an unbounded
 * amount. The founder's shape: give a conversation a budget, and when most of it is gone, stop
 * asking open questions and steer towards a close.
 *
 * ── FOUR DECISIONS, and each is the reason this is not just a counter ───────────────────────────
 *
 * **1. It counts TOKENS, with calls as a second cap — not calls alone.** Calls are the number people
 * reach for, and they are the wrong unit: the tenth call in a conversation carries the whole
 * transcript with it and can cost ten times the first. A budget in calls would let one long
 * conversation quietly cost what ten short ones do. Calls stay as a SECOND ceiling because they are
 * what catches a loop — a bug that calls the model repeatedly with two words each time burns few
 * tokens and should still be stopped.
 *
 * **2. Three zones, not a boolean.** `open` → `narrowing` → `closing`. A budget that is fine until it
 * is exhausted produces exactly the failure the founder is avoiding: a conversation that stops in
 * the middle with nothing built. Narrowing gives the coach room to land.
 *
 * **3. The zones map onto something the coach can actually DO, and it costs nothing.** Our interview
 * is already mostly free: a tapped option card is recorded with no model call at all. Only free text
 * is paid — the opening, and any "Other" answer. So `narrowing` means one concrete thing: stop
 * OFFERING free text, keep offering cards. The conversation carries on; it just stops being able to
 * spend. That is why this works without degrading the product into an apology.
 *
 * **4. It never blocks a call it has already led someone to expect.** `closing` stops NEW spending,
 * and the coach's job there is to build the plan from what it has. A budget whose enforcement is
 * "throw" is a budget that turns a cost control into a crash.
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────────────────────────
 *
 * **It is not the money guard.** It runs on the device, and a device is not a place you enforce
 * spending — it is a place you shape behaviour. The actual ceiling is server-side, in the
 * `gemini-proxy` Edge Function and its `llm_usage` table (`supabase/migrations/0002_llm_usage.sql`),
 * which meters per user per day and cannot be edited by anybody holding the app. The two are
 * complementary and neither replaces the other: this one decides how a conversation FEELS as it runs
 * down; that one decides what the founder's card is exposed to.
 *
 * Pure TypeScript — no React, no storage, no clock reads, no vendor imports.
 */

/** Where a conversation is in its budget. */
export type BudgetZone =
  /** Spend freely: open questions, free text, the full interview. */
  | 'open'
  /** Most of the budget is gone. Ask nothing that needs a model — closed cards only. */
  | 'narrowing'
  /** Nothing left. Build the best plan from what is already known and close honestly. */
  | 'closing';

/** What one conversation is allowed to spend. Config, not code — tune it without touching logic. */
export interface BudgetPolicy {
  /** Total tokens (prompt + completion) a single conversation may spend. */
  maxTokens: number;
  /** Total model calls, as the second ceiling that catches a loop rather than a long chat. */
  maxCalls: number;
  /**
   * The fraction of EITHER ceiling at which the coach stops asking anything that costs. 0.7 is the
   * founder's own number ("after 7 of 10"), kept as a fraction so the two ceilings share one rule.
   */
  narrowAt: number;
}

/**
 * The default. Sized from what a real interview actually costs: ONE understanding call, plus a
 * handful of classifications if free text is used, against a transcript that grows. Six calls and
 * roughly 12k tokens covers a generous conversation with room to spare, which is the point — a
 * budget that ordinary use bumps into is a budget that has become a feature.
 */
export const DEFAULT_BUDGET: BudgetPolicy = {
  maxTokens: 12_000,
  maxCalls: 6,
  narrowAt: 0.7,
};

/** What a call actually cost, as reported by the provider. */
export interface Spend {
  tokens: number;
}

/** A running total. Immutable — every function returns a new one. */
export interface BudgetState {
  callsUsed: number;
  tokensUsed: number;
}

export const EMPTY_BUDGET: BudgetState = { callsUsed: 0, tokensUsed: 0 };

/** Record what a call cost. Unknown or nonsense token counts fall back to a conservative estimate. */
export function spend(state: BudgetState, cost: Spend): BudgetState {
  const tokens = Number.isFinite(cost.tokens) && cost.tokens > 0 ? Math.round(cost.tokens) : 0;
  return { callsUsed: state.callsUsed + 1, tokensUsed: state.tokensUsed + tokens };
}

/**
 * How much of the budget is gone, as the WORSE of the two ratios.
 *
 * The worse one on purpose: a conversation that has burned 90% of its tokens in two calls is nearly
 * out, and averaging that with its call count would hide it.
 */
export function usedFraction(state: BudgetState, policy: BudgetPolicy = DEFAULT_BUDGET): number {
  const byTokens = policy.maxTokens > 0 ? state.tokensUsed / policy.maxTokens : 0;
  const byCalls = policy.maxCalls > 0 ? state.callsUsed / policy.maxCalls : 0;
  return Math.max(byTokens, byCalls);
}

/** Which zone a conversation is in. */
export function zoneOf(state: BudgetState, policy: BudgetPolicy = DEFAULT_BUDGET): BudgetZone {
  const used = usedFraction(state, policy);
  if (used >= 1) return 'closing';
  if (used >= policy.narrowAt) return 'narrowing';
  return 'open';
}

/**
 * Whether the coach may spend on a NEW model call.
 *
 * Only `open` may. `narrowing` deliberately cannot: the whole point of the zone is that the coach
 * stops offering the things that cost, and a zone that still permits "just one more" is a zone that
 * does nothing. Everything a person can still do from `narrowing` — tapping a card, approving a
 * plan, starting a Journey — was already free.
 */
export function canSpend(state: BudgetState, policy: BudgetPolicy = DEFAULT_BUDGET): boolean {
  return zoneOf(state, policy) === 'open';
}

/**
 * A rough token count for text we are about to send, for the ONE decision that has to be made before
 * a call: is this request so large it would blow the remaining budget on its own.
 *
 * Four characters per token is the usual English approximation and is wrong for Hebrew, which uses
 * more tokens per character — so this deliberately UNDER-estimates for a Hebrew user, and the actual
 * spend is recorded from the provider's own count afterwards. It is a guard rail, never an
 * accounting figure, and nothing user-facing is ever derived from it.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Whether one request is, on its own, too big for what is left. */
export function wouldExceed(
  state: BudgetState,
  estimated: number,
  policy: BudgetPolicy = DEFAULT_BUDGET,
): boolean {
  return state.tokensUsed + estimated > policy.maxTokens;
}
