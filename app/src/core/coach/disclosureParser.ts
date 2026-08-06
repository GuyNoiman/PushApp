/**
 * disclosureParser — the tolerant, VALIDATED JSON extractor that turns a free-text answer into
 * structured {@link ./interviewPlaybook GoalSpec} fields (the "front-load" / disclosure path, S2.4).
 * It is a self-contained toolkit over the {@link ../llm/LlmClient} seam: the {@link LlmAnswerParser}
 * runs a strict-JSON completion, and the pure helpers ({@link parseExtractionPayload},
 * {@link validateExtractionPayload}, {@link satisfiedTargets}) parse + anti-hallucination-gate the
 * result with NO network.
 *
 * It was factored OUT of {@link ./CoachOrchestrator} when the coach moved to the two-layer
 * triage → expert-interview model (which records closed answers with no LLM call). The orchestrator
 * re-exports these symbols for backward compatibility, and the disclosure parser remains available
 * as an OPTIONAL light-parse for a user's free "Other" text.
 *
 * SECURITY-PRIVACY G1: the fields it extracts are ON-DEVICE-ONLY raw signal — the same invariant as
 * learning/GoalInput. They are never logged or synced; a request carries only the on-device answer.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { isDomainId, type DomainId } from '../learning/experts/registry';
import type { LlmClient, LlmMessage } from '../llm/LlmClient';
import type { DayPart } from '../types/domain';
import { EXTRACTION_SYSTEM_PROMPT, buildExtractDirective } from './coachPrompts';
import type { ExtractionField, GoalSpec, TimingSpec } from './interviewPlaybook';
import type { Cadence } from '../types/domain';

/**
 * The structured fields an extraction pass may return — a loose, all-optional projection of
 * {@link GoalSpec} the LLM emits as JSON. Callers merge whatever they receive.
 */
export interface ExtractionPayload {
  title?: string;
  description?: string;
  /** The classified goal domain; routes the Planner to the matching DomainExpert. */
  domain?: DomainId;
  processType?: 'fixed' | 'progressive';
  motivation?: string;
  failureRisks?: string[];
  /** Ordered Milestone titles (progressive goals only); the caller assigns `order`. */
  milestones?: string[];
  timing?: Partial<TimingSpec>;
  locationRelevant?: boolean;
  calendarRelevant?: boolean;
  cadence?: Cadence;
  wantsSupportCircle?: boolean;
}

/** What the {@link AnswerParser} receives to turn one free-text answer into {@link ExtractionPayload}. */
export interface AnswerParseInput {
  /** The user's raw latest message. ON-DEVICE-ONLY. */
  userText: string;
  /** The target the coach just asked about — the parser may focus here but can fill others too. */
  focusField: ExtractionField;
  /** The GoalSpec filled so far, for context (read-only). */
  spec: Readonly<GoalSpec>;
  /** The conversation so far, ending with the user's latest answer. */
  history: readonly LlmMessage[];
}

/**
 * The seam that parses a free-text answer into structured goal fields. The default
 * {@link LlmAnswerParser} is the hardened LLM call.
 */
export interface AnswerParser {
  parse(input: AnswerParseInput): Promise<ExtractionPayload>;
}

/**
 * A NON-PII record of how one extraction pass went, so a malformed/lossy parse is OBSERVABLE
 * instead of silently swallowed. It carries only field NAMES and counters — never the user's text or
 * any extracted value (G1). Wire an {@link ExtractionObserver} to surface these in dev.
 */
export interface ExtractionDiagnostics {
  /** How many completion attempts were made this pass (1 = the first try parsed cleanly). */
  attempts: number;
  /** True if a retry was issued after a first empty/malformed/failed answer. */
  retried: boolean;
  /** True if NO usable JSON object could be parsed even after the bounded retry (degraded to `{}`). */
  malformed: boolean;
  /** The interview targets the resulting payload now confidently satisfies (field names only, no PII). */
  satisfied: ExtractionField[];
}

/** A sink for {@link ExtractionDiagnostics}. MUST NOT receive user text or extracted values (G1). */
export type ExtractionObserver = (diagnostics: ExtractionDiagnostics) => void;

/** Tuning for the default {@link LlmAnswerParser}. */
export interface LlmAnswerParserOptions {
  /** Total completion attempts before degrading to "no fields extracted" (>=1, default 2 = one retry). */
  maxAttempts?: number;
  /** Optional non-PII diagnostics sink (see {@link ExtractionDiagnostics}); off by default. */
  observer?: ExtractionObserver;
}

/**
 * The default parser: a strict-JSON completion against the {@link LlmClient} seam using the editable
 * {@link EXTRACTION_SYSTEM_PROMPT}, hardened for the front-load path. It:
 *   • tolerates code fences and surrounding prose (extracts the first balanced JSON object);
 *   • VALIDATES every field against its expected type, so a hallucinated / mistyped value is
 *     dropped rather than trusted — gaps are simply left unfilled, never invented;
 *   • on a malformed / empty / failed answer does a BOUNDED retry, then degrades to `{}` WITHOUT
 *     throwing, so one bad completion never crashes the caller;
 *   • reports each pass to an optional {@link ExtractionObserver} so loss is observable, not silent.
 */
export class LlmAnswerParser implements AnswerParser {
  private readonly maxAttempts: number;
  private readonly observer?: ExtractionObserver;

  constructor(
    private readonly llm: LlmClient,
    options: LlmAnswerParserOptions = {},
  ) {
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 2);
    this.observer = options.observer;
  }

  async parse(input: AnswerParseInput): Promise<ExtractionPayload> {
    let payload: ExtractionPayload = {};
    let malformed = true;
    let attempts = 0;

    while (attempts < this.maxAttempts) {
      attempts++;
      const text = await this.tryComplete(input);
      if (text === null) continue; // an LLM/transport failure — retry, then degrade
      const parsed = parseExtractionPayload(text);
      if (parsed === null) continue; // no usable JSON object — retry, then degrade
      payload = parsed;
      malformed = false;
      break;
    }

    this.observer?.({
      attempts,
      retried: attempts > 1,
      malformed,
      satisfied: satisfiedTargets(payload),
    });
    return payload;
  }

  /** One completion attempt; returns the raw text, or `null` if the seam itself failed (never throws). */
  private async tryComplete(input: AnswerParseInput): Promise<string | null> {
    try {
      const result = await this.llm.complete({
        system: EXTRACTION_SYSTEM_PROMPT,
        json: true,
        temperature: 0,
        messages: [
          ...input.history,
          { role: 'user', content: buildExtractDirective(input.focusField) },
        ],
      });
      return result.text;
    } catch {
      // An LlmError (or any transport failure) is not fatal: the caller retries or degrades to "no
      // fields extracted". Nothing is logged — the request carries ON-DEVICE-ONLY signal.
      return null;
    }
  }
}

// ── parsing helpers ─────────────────────────────────────────────────────────────

/**
 * Turn raw model output into a VALIDATED {@link ExtractionPayload}, or `null` when it holds no
 * usable JSON object. Tolerant of code fences and surrounding prose (see {@link extractJsonObject});
 * every field is type-checked so a hallucinated or mistyped value is dropped, never trusted. A
 * legitimately empty extraction (`{}`) parses to an empty payload — that is a valid "no fields", not
 * a failure — so the caller can tell "the model found nothing" apart from "the model was malformed".
 */
export function parseExtractionPayload(text: string): ExtractionPayload | null {
  const json = extractJsonObject(text);
  if (json === null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return validateExtractionPayload(raw as Record<string, unknown>);
}

/**
 * Extract the first balanced `{…}` JSON object from arbitrary text, ignoring code fences and any
 * surrounding prose. Brace-counting respects string literals and escapes, so `{` / `}` inside a
 * value never miscounts. Returns the object substring, or `null` if there is no complete object.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null; // an unterminated / unbalanced object is treated as malformed
}

/**
 * Validate a parsed JSON object into a clean {@link ExtractionPayload}: keep only keys whose value
 * has the expected type, drop everything else. This is the anti-hallucination gate — a value the
 * model was not confident about (wrong type, empty string, junk array element) simply never lands,
 * leaving that target as a gap for the coach to ask about.
 */
export function validateExtractionPayload(raw: Record<string, unknown>): ExtractionPayload {
  const out: ExtractionPayload = {};
  if (isNonEmptyString(raw.title)) out.title = raw.title.trim();
  if (isNonEmptyString(raw.description)) out.description = raw.description.trim();
  // Anti-hallucination gate: only a recognized DomainId lands; anything else is dropped so the
  // caller keeps its 'general' default rather than trusting an invented domain.
  if (isDomainId(raw.domain)) out.domain = raw.domain;
  if (raw.processType === 'fixed' || raw.processType === 'progressive') out.processType = raw.processType;
  if (isNonEmptyString(raw.motivation)) out.motivation = raw.motivation.trim();

  const risks = cleanStringArray(raw.failureRisks);
  if (risks.length > 0) out.failureRisks = risks;

  const milestones = cleanStringArray(raw.milestones);
  if (milestones.length > 0) out.milestones = milestones;

  const timing = cleanTiming(raw.timing);
  if (Object.keys(timing).length > 0) out.timing = timing;

  if (typeof raw.locationRelevant === 'boolean') out.locationRelevant = raw.locationRelevant;
  if (typeof raw.calendarRelevant === 'boolean') out.calendarRelevant = raw.calendarRelevant;
  if (raw.cadence === 'once' || raw.cadence === 'daily' || raw.cadence === 'weekly') {
    out.cadence = raw.cadence;
  }
  if (typeof raw.wantsSupportCircle === 'boolean') out.wantsSupportCircle = raw.wantsSupportCircle;
  return out;
}

/**
 * The interview targets a validated payload now confidently satisfies (field NAMES only, no PII) —
 * surfaced through {@link ExtractionDiagnostics} for observability.
 */
export function satisfiedTargets(payload: ExtractionPayload): ExtractionField[] {
  const targets: ExtractionField[] = [];
  if (payload.processType === 'fixed' || payload.processType === 'progressive') targets.push('processType');
  if (payload.milestones && payload.milestones.length > 0) targets.push('milestones');
  if (payload.motivation) targets.push('motivation');
  if (payload.failureRisks && payload.failureRisks.length > 0) targets.push('failureRisks');
  if (payload.timing?.sessionMinutes != null && payload.timing?.sessionsPerWeek != null) targets.push('timing');
  if (payload.locationRelevant != null || payload.calendarRelevant != null) targets.push('locationCalendar');
  if (payload.wantsSupportCircle != null) targets.push('supportCircle');
  return targets;
}

/** True for a string with non-whitespace content. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Keep only the non-empty string entries of an array-shaped value, trimmed; `[]` for anything else. */
function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isNonEmptyString).map((s) => s.trim());
}

/** Keep only well-typed timing scalars, so a stray or mistyped field never corrupts the spec. */
export function cleanTiming(value: unknown): Partial<TimingSpec> {
  const out: Partial<TimingSpec> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  const timing = value as Record<string, unknown>;
  if (timing.daypart === 'morning' || timing.daypart === 'evening' || timing.daypart === 'either') {
    out.daypart = timing.daypart as DayPart;
  }
  if (typeof timing.sessionMinutes === 'number') out.sessionMinutes = timing.sessionMinutes;
  if (typeof timing.sessionsPerWeek === 'number') out.sessionsPerWeek = timing.sessionsPerWeek;
  if (Array.isArray(timing.preferredDays)) {
    out.preferredDays = timing.preferredDays.filter((d): d is number => typeof d === 'number');
  }
  if (typeof timing.targetDate === 'number') out.targetDate = timing.targetDate;
  return out;
}
