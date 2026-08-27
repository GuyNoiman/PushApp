/**
 * JourneyEditOrchestrator — the dialogue manager for the coach-led EDIT of one existing Journey
 * (task J1). It is the edit-mode sibling of {@link ./CoachOrchestrator}: stateful, ONE conversation
 * per edit, built over the SAME {@link ../llm/LlmClient} seam and the SAME outbound
 * {@link ./SafetyLayer} guard.
 *
 *   • {@link start} returns a scoped greeting naming the Journey. No model call.
 *   • {@link propose} makes EXACTLY ONE LLM "understanding" call per change request, turns the
 *     answer into a VALIDATED {@link ./journeyEdit JourneyEdit} (every field checked against the real
 *     Journey via {@link ./journeyEdit extractJourneyEdit}) plus the language-free
 *     {@link ./journeyEdit EditChange}[] the approval card renders from. A transport/LLM failure
 *     DEGRADES to an empty proposal — the surface never crashes and nothing is mutated.
 *
 * Nothing here mutates the Journey: the orchestrator only UNDERSTANDS a change and proposes it; the
 * user must approve before {@link ../engines/JourneyEngine JourneyEngine.updateJourney} enacts it.
 *
 * SECURITY-PRIVACY G1: the change text and the resulting edit are ON-DEVICE-ONLY raw signal; this
 * class never logs them. The redaction seam lives inside the composed LlmClient ({@link ../llm/makeCoachLlm}).
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { LlmClient, LlmMessage } from '../llm/LlmClient';
import type { CoachMessageGuard } from './CoachOrchestrator';
import { EDIT_SYSTEM_PROMPT, buildEditDirective, editGreeting } from './coachPrompts';
import {
  extractJourneyEdit,
  summarizeEdit,
  type EditChange,
  type JourneyEdit,
  type JourneyEditContext,
} from './journeyEdit';

/** The result of one {@link JourneyEditOrchestrator.propose} turn — the validated diff + its summary. */
export interface JourneyEditProposal {
  /** The validated, structured diff to enact on approval (empty when nothing was understood). */
  edit: JourneyEdit;
  /** The language-free changes the approval card renders (empty when nothing was understood). */
  changes: EditChange[];
}

/** Construction options — inject the LlmClient (tests use MockLlmClient) and the Journey context. */
export interface JourneyEditOrchestratorOptions {
  /** The completion seam. Required. Used ONLY for the one understanding call per proposal. */
  llm: LlmClient;
  /** The on-device projection of the Journey being edited (ids/titles the parser validates against). */
  context: JourneyEditContext;
  /** Optional outbound safety guard applied to the greeting; defaults to identity. */
  guard?: CoachMessageGuard;
  /**
   * WHAT THE COACH ALREADY KNOWS about this Journey — the rendered Coach Context Summary
   * (`coach/context/brief`), or absent when there is nothing or consent is not active.
   *
   * This is the ONE place remembered context reaches a model today, and it is the right first one:
   * an edit conversation is where somebody says "make it lighter on Tuesdays" and does not expect to
   * re-explain why the Journey exists. Absent is a perfectly good state — the coach asks, which is
   * what it did before this feature and is never wrong, only slower.
   */
  memoryBrief?: string;
  /**
   * The user's language, threaded into the understanding call exactly as the create coach threads
   * it. Without it a Hebrew change request met a prompt written entirely in English, which is half
   * of why "לשתות שייק מידי יום" came back as a new Step rather than a cadence change.
   */
  locale?: string;
}

export class JourneyEditOrchestrator {
  private readonly llm: LlmClient;
  private readonly context: JourneyEditContext;
  private readonly guard?: CoachMessageGuard;
  private readonly memoryBrief: string;
  private readonly locale?: string;

  /** The visible dialogue so far (greeting + change requests) — ON-DEVICE-ONLY context for the model. */
  private readonly history: LlmMessage[] = [];

  constructor(options: JourneyEditOrchestratorOptions) {
    this.llm = options.llm;
    this.context = options.context;
    this.guard = options.guard;
    this.memoryBrief = options.memoryBrief?.trim() ?? '';
    this.locale = options.locale;
  }

  /** The scoped greeting naming the Journey. No model call. */
  start(): string {
    const message = this.applyGuard(editGreeting(this.context.title));
    this.history.push({ role: 'model', content: message });
    return message;
  }

  /**
   * Understand ONE free-text change request (exactly one LLM call), validate it into a
   * {@link JourneyEdit}, and return it with its {@link EditChange}[] summary. Degrades to an empty
   * proposal on any transport/LLM failure — the caller shows a calm "nothing changed" and never crashes.
   */
  async propose(changeText: string): Promise<JourneyEditProposal> {
    const text = changeText.trim();
    this.history.push({ role: 'user', content: text });
    const edit = await this.understand(text);
    return { edit, changes: summarizeEdit(edit, this.context) };
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /**
   * The single understanding call: hand the model the current Journey + the change request and parse
   * its strict JSON into a validated {@link JourneyEdit}. A transport/LLM failure degrades to an EMPTY
   * edit so the caller takes the safe no-op path.
   */
  private async understand(changeText: string): Promise<JourneyEdit> {
    try {
      const result = await this.llm.complete({
        // The remembered context goes FIRST and the rules second, so nothing a summary happens to
        // contain can read as an instruction that outranks them.
        system: this.memoryBrief
          ? `${this.memoryBrief}\n\n${EDIT_SYSTEM_PROMPT}`
          : EDIT_SYSTEM_PROMPT,
        json: true,
        temperature: 0,
        messages: [
          ...this.history,
          { role: 'user', content: buildEditDirective(this.context, changeText, this.locale) },
        ],
      });
      return extractJourneyEdit(result.text, this.context);
    } catch {
      return {};
    }
  }

  /** Run an outbound coach line through the optional safety guard (identity when none / empty result). */
  private applyGuard(text: string): string {
    if (!this.guard) return text;
    const safe = this.guard(text);
    return safe.trim().length > 0 ? safe : text;
  }
}
