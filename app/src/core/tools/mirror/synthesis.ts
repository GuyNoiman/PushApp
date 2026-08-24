/**
 * Mirror Feedback — how a confidential synthesis is produced, and how it is checked.
 *
 * The founder asked for a mechanism that is efficient and good. The efficient part and the safe part
 * turn out to be the same design, which is the nicest kind of answer.
 *
 * ── ONE CALL, NOT FIVE ─────────────────────────────────────────────────────────────────────────
 *
 * The obvious build is a call per question: five questions, five round trips, five prompts each
 * carrying the same instructions about what may not be said. That is five times the instruction
 * tokens for the same work, and it is also five chances for one question's output to drift from
 * another's.
 *
 * So a round is ONE request. All five questions and their eligible answers go in a single structured
 * message and five syntheses come back together — the safety instructions are paid for once, the
 * five outputs are written against each other, and a round costs roughly what one long conversation
 * turn costs rather than five.
 *
 * ── AND ONE FREE CHECK, NOT A SECOND CALL ──────────────────────────────────────────────────────
 *
 * The PRD wants a leakage check before release, and the obvious build there is a second model call
 * to review the first. That doubles the cost and asks a model to catch a model.
 *
 * **We can do better because we hold the source.** Every identifying token in the raw answers is
 * knowable locally — names, dates, places, numbers, and any rare word — so after the model answers,
 * checking that none of them survived into the synthesis is a set intersection. It costs nothing,
 * it is deterministic, it cannot hallucinate, and it never has a bad day. A hit means the synthesis
 * is rejected and the question is reported as unsafe rather than published.
 *
 * That is the whole mechanism: **one paid call, one free check, and a refusal is a legitimate
 * result.**
 *
 * ── WHAT THE MODEL IS NEVER ASKED TO DO ────────────────────────────────────────────────────────
 *
 * It summarises the answers to one question and nothing else. It does not infer a diagnosis, a
 * personality type, a motive, a history, or anything about a person who is not the subject. Those
 * are in the prompt as prohibitions, and the ones that can be checked are checked.
 *
 * ── WHERE THIS ACTUALLY RUNS (2026-08-24) ──────────────────────────────────────────────────────
 *
 * On the SERVER, in `supabase/functions/mirror-synthesis`, and nowhere else. There used to be a
 * `runSynthesis.ts` next to this file that composed a model client and ran the round from the
 * device; it was written before the transport existed, it never had a caller, and it was deleted
 * rather than wired up — because the device that would have run it belongs to the one person the
 * round promised would never see the contributors' words. Its reasoning is not lost: the cost note,
 * the one-call-per-round argument and the deliberate absence of a redacting layer all live in the
 * Edge Function's header now, where the code they describe actually is.
 *
 * This file stays because the RULES are worth having in one testable place, and because the Edge
 * Function's copy of them is checked against it (`__tests__/edgeFunctionParity.test.ts`).
 *
 * Pure TypeScript — no React, no network, no vendor. The transport is the caller's; this file is the
 * contract, the local check, and the reasons.
 */
import { CLAIM_MIN_SUPPORT } from './round';

/** What goes into the one request, per question. */
export interface SynthesisInput {
  questionId: string;
  /** The eligible answers, raw. They never leave the protected path except in this one call. */
  answers: readonly string[];
}

/** What comes back, per question. */
export interface SynthesisOutput {
  questionId: string;
  /** The de-identified summary, or null when no safe repeated pattern existed. */
  text: string | null;
  /** How many answers each claim rested on, so the check below can drop an unsupported one. */
  support: number;
}

/** Why a synthesis was not published. Each is an honest thing to show, not an error to hide. */
export type SynthesisRejection =
  /** A token from the raw answers survived into the output. */
  | 'leaked'
  /** Nothing repeated across enough answers to say safely. */
  | 'noPattern'
  /** The model returned nothing usable. */
  | 'empty';

export interface CheckedSynthesis {
  questionId: string;
  published: string | null;
  rejection?: SynthesisRejection;
}

/**
 * Tokens that identify somebody, taken from the RAW answers.
 *
 * Deliberately generous about what counts: capitalised words that are not sentence-initial, anything
 * with a digit, and any word long enough to be distinctive. A false positive costs one suppressed
 * synthesis; a false negative costs somebody their anonymity, and those are not comparable.
 */
export function identifyingTokens(answers: readonly string[]): Set<string> {
  const tokens = new Set<string>();
  for (const answer of answers) {
    const words = answer.split(/[\s,.;:!?()"'־–—]+/).filter(Boolean);
    words.forEach((word, index) => {
      const bare = word.replace(/[^\p{L}\p{N}]/gu, '');
      if (bare.length === 0) return;
      if (/\d/.test(bare)) tokens.add(bare.toLocaleLowerCase());
      // A capital that is not the start of the sentence is usually a name or a place.
      if (index > 0 && /^\p{Lu}/u.test(word)) tokens.add(bare.toLocaleLowerCase());
      // Hebrew has no capitals, so length is the only cheap signal a word is distinctive. Eight is
      // low enough to catch a real Hebrew noun and high enough that ordinary words mostly pass —
      // and when it errs it errs toward suppressing a synthesis, which is the cheap mistake.
      if (bare.length >= 8) tokens.add(bare.toLocaleLowerCase());
    });
  }
  return tokens;
}

/**
 * The free leakage check: did anything identifying survive from the source into the output?
 *
 * Set intersection over words. Nothing here calls anything.
 */
export function leaks(synthesis: string, tokens: ReadonlySet<string>): string[] {
  const found: string[] = [];
  for (const word of synthesis.split(/[\s,.;:!?()"'־–—]+/)) {
    const bare = word.replace(/[^\p{L}\p{N}]/gu, '').toLocaleLowerCase();
    if (bare.length > 0 && tokens.has(bare)) found.push(bare);
  }
  return found;
}

/**
 * Decide what may be published, for one question.
 *
 * Three ways to end up with nothing, and every one of them is a legitimate result the screen can
 * say out loud. A synthesis is never softened into publishability.
 */
export function checkSynthesis(
  input: SynthesisInput,
  output: SynthesisOutput,
): CheckedSynthesis {
  const base = { questionId: input.questionId };

  if (!output.text || output.text.trim().length === 0) {
    return { ...base, published: null, rejection: 'empty' };
  }
  if (output.support < CLAIM_MIN_SUPPORT) {
    return { ...base, published: null, rejection: 'noPattern' };
  }
  const found = leaks(output.text, identifyingTokens(input.answers));
  if (found.length > 0) {
    return { ...base, published: null, rejection: 'leaked' };
  }
  return { ...base, published: output.text };
}

/** Check a whole round in one pass. */
export function checkRound(
  inputs: readonly SynthesisInput[],
  outputs: readonly SynthesisOutput[],
): CheckedSynthesis[] {
  return inputs.map((input) => {
    const output = outputs.find((o) => o.questionId === input.questionId);
    return output
      ? checkSynthesis(input, output)
      : { questionId: input.questionId, published: null, rejection: 'empty' as const };
  });
}

// ── When the person who received it says something is wrong ───────────────────────────────────

/**
 * A report on a delivered synthesis (founder, 2026-08-21).
 *
 * His rule, and it is the right one: nobody here reads a contributor's answer — **unless the person
 * who received the synthesis flags it as offensive, which should not happen.** Then we need to be
 * able to look backwards and see what happened and why.
 *
 * THAT HAS A CONSEQUENCE THE RETENTION RULE HAS TO RESPECT. Raw answers die a week after the round
 * closes (D68). A report filed on day eight would have nothing left to examine, so **a report FREEZES
 * the clock** for that round: the evidence is held, segregated, until the report is resolved.
 *
 * It is a narrow door and it is meant to stay narrow: opening it is recorded — who, when, and against
 * which report — and a look with no report behind it is not a look this design permits.
 */
export interface SynthesisReport {
  roundId: string;
  questionId: string;
  filedAt: number;
  reason: 'offensive' | 'inaccurate' | 'identifying';
  resolvedAt?: number;
}

/** True while a report holds the raw answers past their normal expiry. */
export function retentionFrozen(reports: readonly SynthesisReport[], roundId: string): boolean {
  return reports.some((r) => r.roundId === roundId && r.resolvedAt === undefined);
}

/**
 * Whether a person may be shown the raw answers behind a synthesis.
 *
 * `false`, always, for the requester — that is the promise, and there is no flag that changes it.
 * The function exists so the rule is written down where somebody would come looking for a way round
 * it, rather than being an absence that reads like an oversight.
 */
export function requesterMaySeeRaw(): false {
  return false;
}

/**
 * Whether an audited internal look is permitted: only against an OPEN report, and only for the
 * question it was filed about.
 */
export function auditedLookPermitted(
  reports: readonly SynthesisReport[],
  roundId: string,
  questionId: string,
): boolean {
  return reports.some(
    (r) => r.roundId === roundId && r.questionId === questionId && r.resolvedAt === undefined,
  );
}
