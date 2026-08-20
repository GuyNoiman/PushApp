/**
 * Mirror Feedback — a round: the mode, the five questions, and the confidentiality threshold.
 *
 * Built to `04_Product/PRD/Tools_Documentation/Mirror_Feedback_PRD.md`.
 *
 * ── WHAT IS BUILT HERE, AND WHAT IS DELIBERATELY NOT ───────────────────────────────────────────
 *
 * This is the ENGINE — the rules that decide what a round is, when a synthesis may open, and what
 * the requester is allowed to see while it fills. **Nothing here sends an invitation, stores a
 * contributor's answer, or produces a synthesis.** That half is gated by the PRD's own §16 and must
 * not be written before those gates clear: it carries other people's private words, it makes a
 * promise of confidentiality to people who are not our users, and it needs an AI provider contract
 * (no-training, zero-retention) that we do not have.
 *
 * The rules ARE the risky part, though, and they are the part that has to be right BEFORE anyone
 * writes a network call. So they are here, and they are tested.
 *
 * ── THE THREE RULES THAT PROTECT A CONTRIBUTOR ─────────────────────────────────────────────────
 *
 * **1. The threshold is PER QUESTION, and the whole result stays sealed until every one of them
 * clears it.** Opening question three because it has five answers, while question four has two,
 * tells the requester exactly which question people would not answer — which is information about
 * the contributors, not about the requester.
 *
 * **2. The requester sees a COUNT, never a person.** Not who opened, answered, skipped, declined,
 * withdrew or reported, and not when. This module returns aggregate readiness and nothing that could
 * be joined against an invitation list.
 *
 * **3. Mode and questions LOCK at the first invitation.** Changing either makes a new round with
 * fresh consent, because a contributor agreed to a specific contract with specific questions. And a
 * confidential round can never fall back to visible if the threshold is not reached — that would
 * turn a promise into a technicality.
 *
 * Pure TypeScript — no React, no i18n, no network, no storage.
 */
import { QUESTIONS_PER_ROUND } from './questionBank';

/** The two feedback contracts. They are different promises, not two settings. */
export type MirrorMode = 'visible' | 'confidential';

/** Confidential mode needs this many VALID answers to every question before anything opens (§3.2). */
export const CONFIDENTIAL_THRESHOLD = 5;
/** A claim in a synthesis needs this much support, or it is suppressed rather than softened (§10). */
export const CLAIM_MIN_SUPPORT = 2;

/** Where a round is in its life. */
export type RoundStatus = 'draft' | 'open' | 'closed';

export interface MirrorRound {
  id: string;
  mode: MirrorMode;
  /** Exactly five, in the order every contributor will see them. */
  questionIds: readonly string[];
  status: RoundStatus;
  /** Set when the first invitation goes out. Once set, mode and questions are frozen. */
  lockedAt?: number;
  /** How many people were invited. A count, never a list, once the round is confidential. */
  invited: number;
}

export function startRound(id: string, mode: MirrorMode): MirrorRound {
  return { id, mode, questionIds: [], status: 'draft', invited: 0 };
}

/** True once anything is frozen. Everything below checks it rather than trusting the caller. */
export function isLocked(round: MirrorRound): boolean {
  return round.lockedAt !== undefined;
}

/**
 * Choose the five. Refuses after the lock — a contributor consented to specific questions, and
 * changing them under a person who has already answered is the one thing this tool cannot do.
 */
export function setQuestions(round: MirrorRound, ids: readonly string[]): MirrorRound {
  if (isLocked(round)) return round;
  const unique = [...new Set(ids)].slice(0, QUESTIONS_PER_ROUND);
  return { ...round, questionIds: unique };
}

/** Mode is a promise, not a preference. It cannot change once anybody has been asked. */
export function setMode(round: MirrorRound, mode: MirrorMode): MirrorRound {
  return isLocked(round) ? round : { ...round, mode };
}

/** Ready to send: exactly five questions, and enough people for the mode's contract. */
export function canSend(round: MirrorRound, contributorCount: number): boolean {
  if (round.questionIds.length !== QUESTIONS_PER_ROUND) return false;
  return round.mode === 'confidential'
    ? contributorCount >= CONFIDENTIAL_THRESHOLD
    : contributorCount >= 1;
}

/** Send the first invitations. This is the moment everything freezes. */
export function lock(round: MirrorRound, at: number, invited: number): MirrorRound {
  if (isLocked(round)) return round;
  return { ...round, lockedAt: at, invited, status: 'open' };
}

export function closeRound(round: MirrorRound): MirrorRound {
  return { ...round, status: 'closed' };
}

// ── Readiness, without ever naming anybody ────────────────────────────────────────────────────

/**
 * What the ENGINE is told about the answers.
 *
 * Note what is NOT in it: no contributor id, no timestamp, no status per person. That is not an
 * omission for later — a shape that cannot carry an identity cannot leak one, and the requester's
 * side of this tool must never be able to.
 */
export interface QuestionTally {
  questionId: string;
  /** Submitted, not withdrawn, not excluded by moderation, and actually answering this question. */
  valid: number;
}

export interface Readiness {
  /** True only when EVERY question has cleared. Partial results stay sealed. */
  open: boolean;
  /** The questions still short, so the screen can say what is needed without saying who is missing. */
  short: { questionId: string; valid: number; needed: number }[];
  /** The lowest count across the questions — the "3 of 5" a person sees. */
  lowest: number;
}

export function readiness(round: MirrorRound, tallies: readonly QuestionTally[]): Readiness {
  if (round.mode === 'visible') {
    // Visible mode has no threshold at all: one named answer is a result.
    const total = tallies.reduce((sum, t) => sum + t.valid, 0);
    return { open: total > 0, short: [], lowest: total };
  }

  const byQuestion = round.questionIds.map((questionId) => ({
    questionId,
    valid: tallies.find((t) => t.questionId === questionId)?.valid ?? 0,
  }));

  const short = byQuestion
    .filter((q) => q.valid < CONFIDENTIAL_THRESHOLD)
    .map((q) => ({ ...q, needed: CONFIDENTIAL_THRESHOLD - q.valid }));

  return {
    open: byQuestion.length === QUESTIONS_PER_ROUND && short.length === 0,
    short,
    lowest: byQuestion.length === 0 ? 0 : Math.min(...byQuestion.map((q) => q.valid)),
  };
}

/**
 * Whether a claim may appear in a synthesis.
 *
 * Two eligible responses at minimum (§10), and a claim supported by exactly one person is dropped
 * rather than hedged: "one person felt…" in a confidential summary is a sentence that identifies
 * somebody in a group of five.
 */
export function claimIsSupported(supportingResponses: number): boolean {
  return supportingResponses >= CLAIM_MIN_SUPPORT;
}

/**
 * Recompute after a withdrawal. Returns whether the result must be RESEALED.
 *
 * A person may take their answer back, and the honest consequence is that a synthesis which was
 * standing on it stops being publishable. Anything else means a withdrawal is only theatre.
 */
export function withdrawalResealsResult(
  round: MirrorRound,
  tallies: readonly QuestionTally[],
): boolean {
  return round.mode === 'confidential' && !readiness(round, tallies).open;
}
