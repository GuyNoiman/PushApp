/**
 * SafetyLayer — the guardrails around the conversational coach's use of an LLM (adaptive coach,
 * S2.5). The model is trusted for LANGUAGE, never for LICENCE: this layer sits between the model and
 * the user (and between the app and the cloud) to keep coach output safe and on-mission.
 *
 * Three jobs, all pure functions over strings/objects — no throwing, typed results only:
 *   • {@link guardText}   → screen an outbound coach question or plan text. It SOFTENS over-promising
 *     ("guaranteed", "cure") into an honest phrasing, and BLOCKS medical/clinical directives and
 *     plainly dangerous advice. Returns `allowed | needs-rewrite | blocked` + the safe text + reasons.
 *   • {@link guardSchema} → enforce that a structured output (e.g. an ExtractionPayload) actually
 *     matches its schema before the app acts on it; a mismatch is BLOCKED, not silently trusted.
 *   • {@link redactForCloud} → minimise what leaves the device: strip obvious PII (emails, phone
 *     numbers) from any text before it is sent to the cloud LLM, aligned with G1 data minimisation.
 *
 * The policy is an EDITABLE constant ({@link SAFETY_POLICY}, configuration-before-code, Engineering
 * Bible §E1) so the founder can tune what is softened vs blocked without touching this logic. The
 * {@link SafetyLayer} class is a thin composable wrapper the orchestrator/harness can hold and call;
 * {@link SafetyLayer.messageGuard} adapts it to the {@link ./CoachOrchestrator CoachMessageGuard} seam.
 *
 * Terminology is canonical: the coach shapes a Journey through Milestones; it never plays clinician.
 *
 * SECURITY-PRIVACY G1: findings and diagnostics carry only rule ids / categories — never the user's
 * text or any extracted value. {@link redactForCloud} is the minimisation helper for the sync/cloud
 * boundary. Nothing here logs.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */

// ── Result shapes ────────────────────────────────────────────────────────────────

/** The three outcomes of a safety screen. */
export type SafetyVerdict = 'allowed' | 'needs-rewrite' | 'blocked';

/** The kind of concern a rule guards against. */
export type SafetyCategory = 'medical' | 'dangerous' | 'over-promising' | 'schema';

/** One policy hit — carries only a rule id / category / reason (NON-PII, G1), never the matched text. */
export interface SafetyFinding {
  /** The {@link SafetyRule.id} that fired. */
  rule: string;
  /** The category of concern. */
  category: SafetyCategory;
  /** A short, non-PII explanation the app may surface in dev tooling. */
  reason: string;
}

/** The typed outcome of a screen. Callers branch on {@link verdict}; never a throw. */
export interface SafetyResult {
  verdict: SafetyVerdict;
  /** Every rule that fired; empty when `allowed`. */
  findings: SafetyFinding[];
  /**
   * The text to use downstream: the original when `allowed`, the softened rewrite when
   * `needs-rewrite`, and `''` when `blocked` (the caller supplies its own fallback).
   */
  text: string;
}

// ── Editable policy ──────────────────────────────────────────────────────────────

/** One editable rule. `soften` rewrites the match; `block` rejects the whole text. */
export interface SafetyRule {
  id: string;
  category: SafetyCategory;
  /** Case-insensitive, global matcher run against the candidate text. */
  pattern: RegExp;
  /** `soften` → replace the match and flag needs-rewrite; `block` → reject outright. */
  action: 'soften' | 'block';
  /** Non-PII reason recorded in the finding. */
  reason: string;
  /** For `soften`: what to replace each match with (default: removed). */
  replacement?: string;
}

/**
 * The default, EDITABLE safety policy. Order does not matter — every matching rule is recorded, a
 * single `block` decides the verdict, and all `soften` rewrites are applied. Tune freely.
 */
export const SAFETY_POLICY: SafetyRule[] = [
  // Over-promising — the coach is honest, never a salesman. Soften into a realistic phrasing.
  {
    id: 'over-promise-guarantee',
    category: 'over-promising',
    pattern: /\bguarantee(?:d|s)?\b/gi,
    action: 'soften',
    replacement: 'aim to help',
    reason: 'Over-promising a guaranteed outcome; softened to an honest, effort-based phrasing.',
  },
  {
    id: 'over-promise-cure',
    category: 'over-promising',
    pattern: /\bcures?\b/gi,
    action: 'soften',
    replacement: 'support',
    reason: 'Framing the Journey as a cure; softened to a supportive phrasing.',
  },
  {
    id: 'over-promise-absolute',
    category: 'over-promising',
    pattern: /\b(?:100%|risk-free|miracle|instantly|overnight)\b/gi,
    action: 'soften',
    replacement: '',
    reason: 'Absolute / risk-free claim; softened by removing the over-promise.',
  },
  // Medical / clinical directives — the coach is not a clinician. Block; encourage professional help.
  {
    id: 'medical-directive',
    category: 'medical',
    pattern:
      /\b(?:diagnos(?:e|is|ed)|prescrib(?:e|ed|ing)|dosage|\d+\s?mg\b|antibiotics?|insulin|chemotherapy)\b/gi,
    action: 'block',
    reason: 'Medical / clinical directive outside the coach’s remit.',
  },
  {
    id: 'medical-stop-medication',
    category: 'medical',
    pattern: /\bstop\s+taking\s+(?:your\s+)?(?:medication|meds|pills|medicine)\b/gi,
    action: 'block',
    reason: 'Advising a change to prescribed medication; must defer to a clinician.',
  },
  // Plainly dangerous advice — never coached. Block.
  {
    id: 'dangerous-self-harm',
    category: 'dangerous',
    pattern: /\b(?:self-harm|harm\s+yourself|hurt\s+yourself|kill\s+yourself)\b/gi,
    action: 'block',
    reason: 'Dangerous self-harm content.',
  },
  {
    id: 'dangerous-starvation',
    category: 'dangerous',
    pattern: /\b(?:starve(?:\s+yourself)?|stop\s+eating|purge)\b/gi,
    action: 'block',
    reason: 'Dangerous disordered-eating advice.',
  },
];

/** A neutral, always-safe coach line to fall back to when an outbound message is blocked. */
export const SAFE_FALLBACK_MESSAGE = 'Let’s keep going — tell me a little more about that.';

// ── Text guard ───────────────────────────────────────────────────────────────────

/**
 * Screen a coach question or plan text against the policy. Softens every `soften` match, blocks on
 * any `block` match (a block wins over a softening), and returns the safe text plus the reasons. It
 * never throws — a bad model line yields a typed verdict the caller can act on.
 */
export function guardText(text: string, policy: SafetyRule[] = SAFETY_POLICY): SafetyResult {
  const findings: SafetyFinding[] = [];
  let working = text;
  let blocked = false;

  for (const rule of policy) {
    // The policy regexes are global (to replace every match), which makes `.test` stateful — reset
    // lastIndex around each use so a reused module-level pattern never skips a match on the next call.
    rule.pattern.lastIndex = 0;
    const matched = rule.pattern.test(working);
    rule.pattern.lastIndex = 0;
    if (!matched) continue;
    findings.push({ rule: rule.id, category: rule.category, reason: rule.reason });
    if (rule.action === 'block') {
      blocked = true;
    } else {
      working = working.replace(rule.pattern, rule.replacement ?? '');
      rule.pattern.lastIndex = 0;
    }
  }

  if (blocked) return { verdict: 'blocked', findings, text: '' };
  if (findings.length > 0) return { verdict: 'needs-rewrite', findings, text: tidy(working) };
  return { verdict: 'allowed', findings, text };
}

// ── Schema guard ─────────────────────────────────────────────────────────────────

/**
 * Enforce that a structured output matches its schema before the app acts on it. `validate` returns
 * true for a well-formed value; anything else (including a thrown validator) is BLOCKED, so a
 * malformed structured output is never silently trusted. Never throws.
 */
export function guardSchema(
  value: unknown,
  validate: (candidate: unknown) => boolean,
  schemaName = 'structured output',
): SafetyResult {
  let ok = false;
  try {
    ok = validate(value) === true;
  } catch {
    ok = false; // a throwing validator is a mismatch, not a crash
  }
  if (ok) return { verdict: 'allowed', findings: [], text: '' };
  return {
    verdict: 'blocked',
    findings: [
      {
        rule: 'schema-mismatch',
        category: 'schema',
        reason: `Output did not match the expected ${schemaName} schema.`,
      },
    ],
    text: '',
  };
}

// ── Cloud redaction / minimisation ───────────────────────────────────────────────

/** Placeholder tokens for redacted PII (stable, so callers can detect/strip them). */
export const EMAIL_PLACEHOLDER = '[redacted-email]';
export const PHONE_PLACEHOLDER = '[redacted-phone]';

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /\+?\d[\d\s().-]{5,}\d/g;

/**
 * Minimise text before it crosses the cloud boundary: replace obvious emails and phone numbers with
 * stable placeholders. Best-effort (it strips the "obvious" patterns), aligned with G1 data
 * minimisation — the cloud LLM should see the goal, not the user's contact details.
 */
export function redactForCloud(text: string): string {
  let out = text.replace(EMAIL_RE, EMAIL_PLACEHOLDER);
  out = out.replace(PHONE_RE, (match) => {
    // Require enough digits to be a real phone number, so we don't eat short numbers (times, reps).
    const digits = match.replace(/\D/g, '');
    return digits.length >= 7 ? PHONE_PLACEHOLDER : match;
  });
  return out;
}

// ── Composable wrapper ───────────────────────────────────────────────────────────

/**
 * A thin, stateless holder of a policy that the orchestrator/harness can compose in. Groups the
 * three guards behind one object and adapts to the coach's message-guard seam without the
 * orchestrator importing any of the safety internals.
 */
export class SafetyLayer {
  constructor(private readonly policy: SafetyRule[] = SAFETY_POLICY) {}

  /** Screen an outbound coach question. */
  guardQuestion(text: string): SafetyResult {
    return guardText(text, this.policy);
  }

  /** Screen generated plan text. */
  guardPlanText(text: string): SafetyResult {
    return guardText(text, this.policy);
  }

  /** Enforce a structured output against its schema. */
  guardSchema(value: unknown, validate: (candidate: unknown) => boolean, schemaName?: string): SafetyResult {
    return guardSchema(value, validate, schemaName);
  }

  /** Minimise text before it leaves the device. */
  redactForCloud(text: string): string {
    return redactForCloud(text);
  }

  /**
   * Adapt this layer to the coach's outbound-message seam: returns the safe text for a message —
   * the softened rewrite when it needs one, the original when clean, and a neutral fallback when the
   * message is blocked (so the coach never surfaces an empty turn).
   */
  messageGuard(): (text: string) => string {
    return (text: string) => {
      const result = this.guardQuestion(text);
      if (result.verdict === 'blocked') return SAFE_FALLBACK_MESSAGE;
      return result.text;
    };
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────────

/** Collapse the whitespace a softening rewrite may leave behind, and tidy spacing before punctuation. */
function tidy(text: string): string {
  return text
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
