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

/**
 * How long a round stays open (founder, 2026-08-21): **one week.** After that the questions lock for
 * the contributors, and the requester is told what happened either way.
 *
 * A DEADLINE IS ALSO A PRIVACY DEVICE, and that is the better half of this decision. If a result
 * opened the moment the fifth answer landed, a requester watching the counter would learn WHEN each
 * person answered — and against a list of seven people they invited themselves, timing is an
 * identity. The PRD forbids exactly that (§3.2: not the timing or order). So a result is delivered
 * when the round CLOSES, never at the moment a response arrives.
 */
export const ROUND_OPEN_DAYS = 7;

/**
 * The NUDGE (founder, 2026-08-21): three days in, if the round is still short, tell the requester —
 * not enough people have answered, and adding more recipients is the thing that helps.
 *
 * It says a number and never a name. "Four of the five are in" is something the counter already
 * shows; who is missing is not, and this must not become the one place it leaks.
 */
export const NUDGE_AFTER_DAYS = 3;

/**
 * When somebody is invited MID-ROUND, everyone's window grows so the newcomers get at least this
 * long (founder, 2026-08-21).
 *
 * ONE DEADLINE FOR THE WHOLE ROUND, extended rather than per-person, and it can only ever move
 * FORWARD. Two reasons, and the second is the important one: a per-person deadline would mean the
 * synthesis could open while somebody still had days left to answer, and a round whose end depends
 * on who was invited when is a round whose timing describes its contributors.
 */
export const LATE_INVITE_MIN_DAYS = 5;

/**
 * How long a contributor's raw answer survives after the round closes (founder, 2026-08-21: hold the
 * data for a week).
 *
 * MEASURED FROM CLOSURE, not from sending — those are the same instant for an untouched round, and
 * a retention that expired the moment collection ended would leave no window in which the synthesis
 * could actually be produced. After it, only the de-identified synthesis remains, and the raw words
 * are gone from primary storage.
 */
export const RAW_RETENTION_DAYS = 7;
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
  /**
   * A deadline pushed out because somebody was invited late. Absent for an untouched round; only
   * ever later than the normal one.
   */
  extendedTo?: number;
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

/**
 * When the round stops accepting answers.
 *
 * Normally a week from the first invitation; later if somebody was invited late (see
 * {@link extendForLateInvite}). Undefined until the first invitation, because that is when it starts.
 */
export function expiresAt(round: MirrorRound): number | undefined {
  if (round.lockedAt === undefined) return undefined;
  const base = round.lockedAt + ROUND_OPEN_DAYS * DAY_MS;
  return Math.max(base, round.extendedTo ?? 0);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Invite more people part-way through, and give everyone the longer window.
 *
 * The deadline moves to whichever is later: where it already was, or five days from now. **It never
 * moves backwards** — somebody who was promised until Friday is not brought forward because the
 * requester added a name on Thursday.
 */
export function extendForLateInvite(round: MirrorRound, at: number, added: number): MirrorRound {
  if (!isLocked(round) || round.status !== 'open') return round;
  const wanted = at + LATE_INVITE_MIN_DAYS * DAY_MS;
  const current = expiresAt(round) ?? 0;
  return {
    ...round,
    invited: round.invited + added,
    extendedTo: Math.max(current, wanted),
  };
}

/**
 * Whether the requester should be told the round is running short.
 *
 * Three days in, still open, and not yet ready. It carries a COUNT and never a name.
 */
export function shouldNudge(
  round: MirrorRound,
  tallies: readonly QuestionTally[],
  now: number,
): boolean {
  if (round.lockedAt === undefined || round.status !== 'open') return false;
  if (now < round.lockedAt + NUDGE_AFTER_DAYS * DAY_MS) return false;
  if (!acceptsResponses(round, now)) return false;
  return !readiness(round, tallies).open;
}

/** When the raw answers must be gone. Undefined while the round is still collecting. */
export function rawExpiresAt(round: MirrorRound, now: number): number | undefined {
  const ends = expiresAt(round);
  if (ends === undefined) return undefined;
  const closed = round.status === 'closed' ? ends : now >= ends ? ends : undefined;
  return closed === undefined ? undefined : closed + RAW_RETENTION_DAYS * DAY_MS;
}

/** True once the raw answers must be destroyed, whatever the round produced. */
export function rawRetentionExpired(round: MirrorRound, now: number): boolean {
  const at = rawExpiresAt(round, now);
  return at !== undefined && now >= at;
}

/**
 * Whether a contributor may still answer. The week locks the questions FOR THEM — somebody opening
 * an invitation on day nine is told the round has closed, not shown a form whose answer goes nowhere.
 */
export function acceptsResponses(round: MirrorRound, now: number): boolean {
  if (round.status !== 'open') return false;
  const ends = expiresAt(round);
  return ends === undefined || now < ends;
}

/**
 * What the requester is shown. Exactly four states, and the last one is the honest failure the
 * founder asked for by name.
 */
export type RoundOutcome =
  /** Not sent yet. */
  | 'draft'
  /** The week is running. Aggregate progress only; NO result, even if the threshold is already met. */
  | 'collecting'
  /** Closed, and there is something to read. */
  | 'delivered'
  /** Closed, and not enough people answered — so no result exists and none is invented. */
  | 'notEnough';

export function outcome(
  round: MirrorRound,
  tallies: readonly QuestionTally[],
  now: number,
): RoundOutcome {
  if (round.status === 'draft' || round.lockedAt === undefined) return 'draft';
  if (acceptsResponses(round, now)) return 'collecting';
  return readiness(round, tallies).open ? 'delivered' : 'notEnough';
}

/**
 * Whether the answers that WERE collected must now be destroyed.
 *
 * A round that closes short produces nothing, and people answered under a promise that produced
 * nothing. Keeping their words then serves nobody: not the requester, who will never be allowed to
 * read them, and certainly not the contributors. They go.
 *
 * It also removes the temptation of the obvious "helpful" feature — carrying four answers into a
 * second round. Those four people consented to ONE round with one set of questions, and reusing
 * their words under a new consent is not a convenience; it is a different thing from what they
 * agreed to.
 */
export function mustDiscardResponses(
  round: MirrorRound,
  tallies: readonly QuestionTally[],
  now: number,
): boolean {
  return outcome(round, tallies, now) === 'notEnough';
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
