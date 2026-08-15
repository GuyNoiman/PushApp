/**
 * proposal — PRD §5 of Smart Notification Timing: given a model's evidence, is there a better time
 * to propose, and exactly which one? The answer is only ever a PROPOSAL. Nothing here applies
 * anything; Weekly Review asks the user, and only the approved plan is enacted (PRD §6, AC5).
 *
 * The rules run in a STRICT ORDER, and each one is allowed to end the whole thing:
 *
 *  1. **Eligible set** — positive/negative trials only, newest six, nothing older than four weeks.
 *  2. **Sparse guard** — fewer than two eligible samples ⇒ NO proposal, ever. One sample can never
 *     move a user's time (AC3). This is the gate that protects a once-weekly Step.
 *  3. **Percentage rule** — propose only when MORE than half the eligible set is negative. An exact
 *     50/50 split yields nothing, which PRD §9 names explicitly.
 *  4. **Better historical candidate** — if the previously-evaluated time did measurably better,
 *     go back to it instead of exploring somewhere new.
 *  5. **Alternating exploration** — otherwise step 15 minutes in this model's exploration
 *     direction; the direction flips for the next proposal.
 *  6. **Three-hour cap** — measured from the user's OWN anchor, never from the drifted candidate.
 *     Capped in one direction ⇒ try the other; capped in both ⇒ no proposal.
 *  7. **Boundary clamp** — the candidate is validated through {@link clampScheduleMinute}, the very
 *     helper the CommunicationScheduler clamps with. If the clamp would ALTER it, that direction is
 *     exhausted: flip and retry. This is what stops the app proposing 08:15 and then sending 09:00.
 *     A day the user disabled yields no candidate at all.
 *  8. **Rejected candidates** — a time the user already declined is not offered again until the
 *     evidence set has changed (PRD §5).
 *
 * PURE (Engineering Bible §19): `now` is injected, nothing is read from the clock, nothing is
 * mutated, nothing is persisted.
 */
import {
  MAX_DRIFT_MINUTES,
  MAX_TRIALS_PER_MODEL,
  MIN_ELIGIBLE_SAMPLES,
  MOVE_MINUTES,
  NEGATIVE_SHARE_THRESHOLD,
  TRIAL_RETENTION_MS,
} from '../config/timingPolicy';
import type {
  SchedulingPrefs,
  TimeOfDay,
  TimingDayKey,
  TimingModel,
  TimingTrial,
} from '../types/domain';
import { clampScheduleMinute } from '../util/availability';
import { circularMinuteDistance, minuteOfDay } from '../util/date';
import { isEvidence } from './outcome';
import { modelKey } from './timingModel';

/** Minutes in a day — the modulus every candidate step wraps through. */
const MINUTES_PER_DAY = 1440;

/** What the evidence behind a proposal looked like; Weekly Review shows exactly this (PRD §6). */
export interface TimingEvidence {
  eligible: number;
  positive: number;
  negative: number;
}

/** A proposed move of ONE Journey/day window's send time. Never applied here. */
export interface TimingProposal {
  journeyId: string;
  dayKey: TimingDayKey;
  /** The time in use today. */
  from: TimeOfDay;
  /** The exact time being proposed — already validated against Active Hours and the day-part band. */
  to: TimeOfDay;
  /**
   * How it was chosen: a 15-minute exploration step, or a return to a previously better time.
   * `'revert'` is not an exploration, so it does not consume the alternation.
   */
  direction: 'later' | 'earlier' | 'revert';
  /**
   * The exploration direction to store for NEXT time (PRD §5 "explore alternately"). The engine
   * decides it; the caller persists it — so the alternation survives a restart without this file
   * ever touching state.
   */
  nextExploreDirection: 'later' | 'earlier';
  evidence: TimingEvidence;
}

/** All inputs the decision needs. Assembled by the caller; nothing is looked up here. */
export interface TimingProposalInput {
  model: TimingModel;
  /** The whole trial store — filtered to this model here, so callers cannot filter it wrongly. */
  trials: readonly TimingTrial[];
  /** The user's scheduling prefs, so the candidate is validated against the SAME boundaries. */
  prefs: SchedulingPrefs;
  now: number;
}

/**
 * The evidence set PRD §5 evaluates on: this model's positive/negative trials, nothing older than
 * four weeks, newest {@link MAX_TRIALS_PER_MODEL} first. Exported because Weekly Review shows the
 * same set it decided on — the user should never be told about evidence that did not count.
 */
export function eligibleTrialsFor(
  model: TimingModel,
  trials: readonly TimingTrial[],
  now: number,
): TimingTrial[] {
  const key = modelKey(model.journeyId, model.dayKey);
  const horizon = now - TRIAL_RETENTION_MS;
  return trials
    .filter((t) => t.modelKey === key && isEvidence(t.outcome) && t.scheduledAt >= horizon)
    .sort((a, b) => b.scheduledAt - a.scheduledAt)
    .slice(0, MAX_TRIALS_PER_MODEL);
}

/** Tally an eligible set into the shape Weekly Review displays. */
function tally(eligible: readonly TimingTrial[]): TimingEvidence {
  let positive = 0;
  let negative = 0;
  for (const trial of eligible) {
    if (trial.outcome === 'positive') positive += 1;
    else if (trial.outcome === 'negative') negative += 1;
  }
  return { eligible: eligible.length, positive, negative };
}

/** `{hour, minute}` for a minute-of-day, wrapping defensively. */
function toTimeOfDay(minute: number): TimeOfDay {
  const m = ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return { hour: Math.floor(m / 60), minute: m % 60 };
}

/** The opposite exploration direction. */
function flip(direction: 'later' | 'earlier'): 'later' | 'earlier' {
  return direction === 'later' ? 'earlier' : 'later';
}

/**
 * Whether a candidate minute is one the scheduler would actually send at, on every day this model
 * covers. Run through {@link clampScheduleMinute} — the scheduler's own clamp — so an approved time
 * and a delivered time can never disagree:
 *  - a per-day model whose day is DISABLED yields no candidate at all (PRD §9's "Active Hours
 *    conflict", which is the disabled-day case; an out-of-window time on an enabled day is a clamp,
 *    per D40);
 *  - a shared (`'*'`) model must survive UNALTERED on every day it can fire, and needs at least one
 *    such day.
 */
function survivesWindows(minute: number, dayKey: TimingDayKey, prefs: SchedulingPrefs): boolean {
  const weekdays = dayKey === '*' ? [0, 1, 2, 3, 4, 5, 6] : [dayKey];
  let anyEnabled = false;
  for (const weekday of weekdays) {
    const clamped = clampScheduleMinute(minute, weekday, prefs);
    if (clamped === null) {
      // A quiet day. Fatal for a per-day model (that IS the model's only day); for a shared window
      // it simply means this model never fires that day, which is already true today.
      if (dayKey !== '*') return false;
      continue;
    }
    anyEnabled = true;
    // The clamp would move it: proposing this time would be proposing a time the user will not get.
    if (clamped !== minute) return false;
  }
  return anyEnabled;
}

/**
 * Whether the user already declined this exact time and nothing has changed since. PRD §5: "the
 * same proposal is not repeated without new evidence". `atEligibleCount` is the size of the
 * evidence set when they declined — the same number Weekly Review showed them — so a rejection
 * lapses as soon as the evidence set is a different size.
 */
function stillRejected(model: TimingModel, minute: number, eligibleCount: number): boolean {
  return model.rejectedCandidates.some(
    (r) => minuteOfDay(r) === minute && r.atEligibleCount === eligibleCount,
  );
}

/** The three gates a candidate must clear, in order: cap → clamp → not-still-rejected. */
function candidateIsUsable(
  model: TimingModel,
  minute: number,
  prefs: SchedulingPrefs,
  eligibleCount: number,
): boolean {
  // Three-hour cap, measured from the user's OWN anchor (PRD §5) — never from the drifted candidate,
  // or the learned time could walk arbitrarily far one 15-minute step at a time.
  if (circularMinuteDistance(minute, minuteOfDay(model.anchor)) > MAX_DRIFT_MINUTES) return false;
  if (!survivesWindows(minute, model.dayKey, prefs)) return false;
  if (stillRejected(model, minute, eligibleCount)) return false;
  return true;
}

/**
 * Whether the previously-evaluated candidate did measurably better than the current one (PRD §5
 * "prefer a better historical candidate"). Requires history that actually means something: the old
 * candidate must itself have carried at least the minimum evidence, and its negative share must be
 * strictly lower. Without that we explore rather than pretend to know.
 */
function betterHistoricalCandidate(model: TimingModel, currentNegativeShare: number): TimeOfDay | null {
  const { previousCandidate, previousPositive, previousNegative } = model;
  if (!previousCandidate || previousPositive == null || previousNegative == null) return null;
  const previousEligible = previousPositive + previousNegative;
  if (previousEligible < MIN_ELIGIBLE_SAMPLES) return null;
  return previousNegative / previousEligible < currentNegativeShare ? previousCandidate : null;
}

/**
 * The §5 decision for ONE model, or `null` for "leave the user's time alone" — which is the answer
 * far more often than not, and deliberately so.
 */
export function computeTimingProposal(input: TimingProposalInput): TimingProposal | null {
  const { model, prefs, now } = input;

  // 1. The eligible set.
  const eligible = eligibleTrialsFor(model, input.trials, now);
  const evidence = tally(eligible);

  // 2. Sparse guard — one sample can never move the time (AC3).
  if (evidence.eligible < MIN_ELIGIBLE_SAMPLES) return null;

  // 3. Percentage rule — strictly MORE than half negative. Exactly 50/50 proposes nothing (§9).
  const negativeShare = evidence.negative / evidence.eligible;
  if (negativeShare <= NEGATIVE_SHARE_THRESHOLD) return null;

  const from = { ...model.currentCandidate };
  const currentMinute = minuteOfDay(model.currentCandidate);

  // 4. A better historical candidate beats exploring somewhere new. It is a return, not an
  //    exploration, so the alternation is left exactly where it was.
  const historical = betterHistoricalCandidate(model, negativeShare);
  if (historical) {
    const minute = minuteOfDay(historical);
    if (minute !== currentMinute && candidateIsUsable(model, minute, prefs, evidence.eligible)) {
      return {
        journeyId: model.journeyId,
        dayKey: model.dayKey,
        from,
        to: { ...historical },
        direction: 'revert',
        nextExploreDirection: model.exploreDirection,
        evidence,
      };
    }
  }

  // 5-8. Alternating exploration: this model's direction first, then the other one. A direction
  //      that is capped, clamped or still-rejected is EXHAUSTED — we flip and retry rather than
  //      quietly proposing something the user would not actually receive.
  const first = model.exploreDirection;
  for (const direction of [first, flip(first)] as const) {
    const step = direction === 'later' ? MOVE_MINUTES : -MOVE_MINUTES;
    const minute = (currentMinute + step + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    if (!candidateIsUsable(model, minute, prefs, evidence.eligible)) continue;
    return {
      journeyId: model.journeyId,
      dayKey: model.dayKey,
      from,
      to: toTimeOfDay(minute),
      direction,
      // Alternate from the direction we actually USED, so a flipped retry does not double-flip.
      nextExploreDirection: flip(direction),
      evidence,
    };
  }

  // Both directions exhausted: keep the user's current time. Silence is uncertainty, not failure.
  return null;
}
