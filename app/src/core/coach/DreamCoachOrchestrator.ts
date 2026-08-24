/**
 * DreamCoachOrchestrator — the conversation that shapes the Dream layer (Dream Management §7, D40).
 *
 * The sibling of {@link ./JourneyEditOrchestrator}, and deliberately the same shape: one
 * conversation, one LLM call per message, a validated structured result, and a transport failure
 * that degrades to "nothing changed" rather than to a crash or a guess.
 *
 * ── THE ONE REAL DIFFERENCE, AND IT IS THE INTERESTING ONE ─────────────────────────────────────
 *
 * A Journey edit is PROPOSED and waits for approval. A Dream change is not: D40 gave the coach the
 * Dream layer outright, so what comes back here is applied as part of the conversation. That moves
 * the entire safety burden onto validation — every id checked against what exists
 * ({@link ../dreams/dreamEdit extractDreamEdit}), every unknown change dropped rather than repaired
 * — and onto the fact that no change in the vocabulary can touch a Journey's title, Steps, schedule
 * or history. The worst a bad parse can do is move a link, which a sentence can move back.
 *
 * The coach's spoken reply comes back in the SAME call as the changes, so the person is told what
 * happened in one turn instead of two. It is guarded on the way out like every other coach line.
 *
 * SECURITY-PRIVACY G1: Dream wording is private on-device data. Nothing here logs it, and the only
 * thing that leaves the device is the one understanding call through the composed client.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import {
  extractDreamEdit,
  summarizeDreamEdit,
  type DreamEdit,
  type DreamEditContext,
} from '../dreams/dreamEdit';
import type { LlmClient, LlmMessage } from '../llm/LlmClient';
import type { CoachMessageGuard } from './CoachOrchestrator';
import { DREAM_SYSTEM_PROMPT, buildDreamDirective, dreamGreeting } from './coachPrompts';

/** What one turn produced: the validated changes, a line to say, and the summary of the changes. */
export interface DreamTurn {
  edit: DreamEdit;
  /** The coach's own sentence, already guarded. Empty when the model gave none. */
  reply: string;
  /** One line per change, built from the VALIDATED changes — never from the model's prose. */
  summary: string[];
  /** True when the call itself failed, so the surface can offer a retry rather than claim silence. */
  unavailable: boolean;
}

export interface DreamCoachOrchestratorOptions {
  llm: LlmClient;
  /** The Dreams and Journeys that exist, by id — rebuilt by the caller before every turn. */
  context: DreamEditContext;
  guard?: CoachMessageGuard;
}

export class DreamCoachOrchestrator {
  private readonly llm: LlmClient;
  private context: DreamEditContext;
  private readonly guard?: CoachMessageGuard;
  private readonly history: LlmMessage[] = [];

  constructor(options: DreamCoachOrchestratorOptions) {
    this.llm = options.llm;
    this.context = options.context;
    this.guard = options.guard;
  }

  /**
   * Refresh what exists.
   *
   * Called after every applied turn, because the changes JUST applied are what the next message is
   * likely to be about — "no, call it something else" refers to a Dream that did not exist a moment
   * ago, and a stale context would drop that change as an unknown id.
   */
  setContext(context: DreamEditContext): void {
    this.context = context;
  }

  /** The opening line. No model call. */
  start(): string {
    const message = this.applyGuard(dreamGreeting());
    this.history.push({ role: 'model', content: message });
    return message;
  }

  /** One message in, one call out, validated changes back. Never throws. */
  async say(message: string): Promise<DreamTurn> {
    const text = message.trim();
    this.history.push({ role: 'user', content: text });

    let raw: string;
    try {
      const result = await this.llm.complete({
        system: DREAM_SYSTEM_PROMPT,
        json: true,
        temperature: 0,
        messages: [...this.history, { role: 'user', content: buildDreamDirective(this.context, text) }],
      });
      raw = result.text;
    } catch {
      // No session, no network, a provider error. Nothing was changed, and the surface says exactly
      // that rather than showing an empty result that reads like "the coach had nothing to say".
      return { edit: { changes: [] }, reply: '', summary: [], unavailable: true };
    }

    const edit = extractDreamEdit(raw, this.context);
    const reply = this.applyGuard(readReply(raw));
    if (reply) this.history.push({ role: 'model', content: reply });
    return { edit, reply, summary: summarizeDreamEdit(edit, this.context), unavailable: false };
  }

  private applyGuard(text: string): string {
    if (!this.guard || !text) return text;
    const safe = this.guard(text);
    return safe.trim().length > 0 ? safe : text;
  }
}

/** The model's spoken sentence, or ''. Unreadable output is silence, never an error. */
function readReply(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return '';
  try {
    const parsed = JSON.parse(match[0]) as { reply?: unknown };
    return typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  } catch {
    return '';
  }
}
