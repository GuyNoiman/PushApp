/**
 * outcome — PRD §4 of Smart Notification Timing, verbatim and pure: given what we observed around
 * ONE send, what did that send tell us about the time it was sent at?
 *
 * The PRD keeps TWO measurements apart, and so does this file:
 *  - the GENERAL communication response — did the app come to the foreground within the response
 *    window, and by a tap or organically? Recorded ({@link responseKindOf}), never folded into the
 *    verdict, because "neither proves causality";
 *  - the JOURNEY-specific evidence — the verdict ({@link classifyTrial}) that actually moves the
 *    learned time.
 *
 * Two deliberate non-conclusions, both straight from the PRD:
 *  - a Step Completed/Partial later that local day makes the day NEUTRAL and PREVENTS a negative
 *    conclusion, even with no timely response. Silence is uncertainty, not failure (PRD §2);
 *  - a contaminated trial is EXCLUDED rather than guessed at.
 *
 * `StepMissed` is deliberately NOT an input: §4's negative case is the ABSENCE of interaction and
 * the ABSENCE of a Completed/Partial outcome, which the foreground / Journey-view / check-in
 * signals already answer between them.
 *
 * PURE (Engineering Bible §19): every timestamp is passed in, nothing is read from the clock, and
 * the local-day boundary comes from the shared `startOfLocalDay` — never re-derived here, so this
 * and the rest of the app can never disagree about what "that day" means.
 */
import { CONTAMINATION_WINDOW_MS, RESPONSE_WINDOW_MS } from '../config/timingPolicy';
import type { TimingOutcome, TimingResponseKind, TimingTrial } from '../types/domain';
import { startOfLocalDay } from '../util/date';

/** Everything we observed around one send. Every field is optional: absence IS the signal. */
export interface TimingSignals {
  /** Epoch ms the send was scheduled for. */
  scheduledAt: number;
  /**
   * Epoch ms the OS actually delivered it, when known. Local repeating triggers give no receipt, so
   * this is always absent in MVP and the scheduled time is used — exactly as PRD §4 anticipates.
   */
  deliveredAt?: number;
  /** Epoch ms the app entered the foreground after the send, if it did at all. */
  foregroundAt?: number;
  /** Whether that foreground came from tapping OUR notification. */
  viaTap?: boolean;
  /** Epoch ms the Journey was opened / viewed / acted on, if it was. */
  journeyInteractionAt?: number;
  /** Epoch ms a Completed or Partial report of the relevant Step landed, if one did. */
  reportAt?: number;
  /** Another of OUR sends fell inside the contamination window (PRD §4). */
  contaminated?: boolean;
  /**
   * The app was ALREADY in the foreground when the send fired. PRD §3 says suppress and exclude
   * from learning; we cannot cancel a delivery the OS has begun, but we can and do refuse to learn
   * from it.
   */
  foregroundedAtSend?: boolean;
  /**
   * The trial's local day is over, so no further evidence can arrive. Until this is true a trial
   * with nothing conclusive stays `pending` rather than being written off as a negative.
   */
  dayClosed?: boolean;
}

/**
 * The instant the response window is measured from: the actual delivery time where known,
 * otherwise the scheduled time (PRD §4).
 */
export function effectiveSendAt(signals: Pick<TimingSignals, 'scheduledAt' | 'deliveredAt'>): number {
  return signals.deliveredAt ?? signals.scheduledAt;
}

/** Whether `at` falls inside the response window that opens at the send (inclusive of both ends). */
export function withinResponseWindow(sendAt: number, at: number): boolean {
  return at >= sendAt && at - sendAt <= RESPONSE_WINDOW_MS;
}

/** Whether another send at `otherAt` is close enough to `sendAt` to contaminate it (either side). */
export function contaminates(sendAt: number, otherAt: number): boolean {
  return Math.abs(otherAt - sendAt) <= CONTAMINATION_WINDOW_MS;
}

/** Whether two instants fall on the same LOCAL calendar day (shared boundary — never re-derived). */
export function isSameLocalDay(a: number, b: number): boolean {
  return startOfLocalDay(a) === startOfLocalDay(b);
}

/**
 * The GENERAL communication response (PRD §4), recorded separately from the verdict: did the app
 * come to the foreground within the window, and how. `'none'` when it did not.
 */
export function responseKindOf(signals: TimingSignals): TimingResponseKind {
  const sendAt = effectiveSendAt(signals);
  if (signals.foregroundAt == null || !withinResponseWindow(sendAt, signals.foregroundAt)) {
    return 'none';
  }
  return signals.viaTap ? 'tap' : 'organic';
}

/**
 * The §4 verdict for one send, in the PRD's own order of precedence:
 *
 *  1. **contaminated / excluded** — another of our sends in the window, or the app already
 *     foregrounded. We cannot attribute the response, so we refuse to learn from it. This wins
 *     over everything, including a positive: an unattributable success is not evidence either.
 *  2. **positive** — the Journey was opened/viewed/acted on within the response window.
 *  3. **neutral** — no timely interaction, but the relevant Step was Completed or Partially
 *     completed that same local day. The day was not a failure, so it must not read as one.
 *  4. **negative** — the day is closed with neither. This is the ONLY evidence that moves the time
 *     against the current candidate.
 *  5. **pending** — the day is not over yet; nothing has been concluded.
 *
 * A same-day report counts wherever it falls in the day, not only after the send: a Step already
 * done by the time the reminder fired equally proves the day was not a failure of timing.
 */
export function classifyTrial(signals: TimingSignals): TimingOutcome {
  if (signals.contaminated || signals.foregroundedAtSend) return 'contaminated';

  const sendAt = effectiveSendAt(signals);
  if (
    signals.journeyInteractionAt != null &&
    withinResponseWindow(sendAt, signals.journeyInteractionAt)
  ) {
    return 'positive';
  }
  if (signals.reportAt != null && isSameLocalDay(sendAt, signals.reportAt)) return 'neutral';
  return signals.dayClosed ? 'negative' : 'pending';
}

/**
 * Whether an outcome is EVIDENCE, i.e. may move the learned time. Only `positive` and `negative`
 * are; `neutral`, `contaminated` and `pending` deliberately are not (PRD §4/§5).
 */
export function isEvidence(outcome: TimingOutcome): boolean {
  return outcome === 'positive' || outcome === 'negative';
}

/** Convenience: classify and stamp one trial, returning a NEW trial (never mutates the input). */
export function classifiedTrial(trial: TimingTrial, signals: TimingSignals): TimingTrial {
  return {
    ...trial,
    outcome: classifyTrial(signals),
    responseKind: responseKindOf(signals),
  };
}
