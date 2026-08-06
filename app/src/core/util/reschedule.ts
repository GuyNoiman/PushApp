/**
 * Reschedule heuristic (Miss-Recovery slice) — the PURE, mock-first "propose a few
 * good times" helper behind the Retime lever. It generates a small set of candidate
 * times from a simple heuristic (same-time-tomorrow, +2h, an evening slot), clamps
 * each into the user's scheduling window/day-part (reusing the SAME date helpers the
 * CommunicationScheduler uses — one clock convention), then GATES them against the
 * Step's constraints + a transient device read (location / calendar-busy).
 *
 * Real calendar free/busy and geofencing are deferred (native + security-privacy);
 * this slice consults a permissive `RescheduleEnv` whose real gateways return
 * 'unknown' (so gating only ever tightens when the dev mock is on).
 *
 * Pure TS — no clock read of its own (the caller injects `now`), no vendor imports.
 */
import type { SchedulingPrefs, Step } from '../types/domain';
import { clampMinuteToWindow, dayPartBand } from './date';

/** A proposed reschedule time. `at` is epoch ms; hour/minute are its local wall-clock. */
export interface Candidate {
  /** Epoch ms of the proposed start. */
  at: number;
  /** 0-23 local hour (after window/day-part clamp). */
  hour: number;
  /** 0-59 local minute (after clamp). */
  minute: number;
  /** Which heuristic produced it — labelling/debug only. */
  kind: 'tomorrow' | 'plus2h' | 'evening';
}

/**
 * The TRANSIENT, gating-only view of the device the heuristic consults.
 *
 * SECURITY-PRIVACY G4: these values are read live and used ONLY to gate a proposed
 * time — they are NEVER persisted or emitted. `'unknown'` is the permissive default
 * (real Null gateways return 'unknown'), so a missing/dev-off signal never drops a
 * candidate; the dev mock is the only thing that can tighten the gate.
 */
export interface RescheduleEnv {
  /** Where the user is now, per LocationGateway (permissive 'unknown'). */
  place: 'home' | 'away' | 'unknown';
  /** Whether a proposed window is busy, per CalendarGateway (permissive 'unknown'). */
  isBusy: (window: { start: number; end: number }) => boolean | 'unknown';
}

/** The evening slot's hour (local) used by the 'evening' heuristic. */
const EVENING_HOUR = 19;
/** Fallback Step length (minutes) when a Step has no estimatedDuration. */
const DEFAULT_DURATION_MIN = 30;

/**
 * Propose a few candidate times for a Step, clamped to prefs and gated by the env.
 * Deterministic in `now` (injected) so it is unit-testable without a real clock.
 * Returns the surviving candidates in heuristic order (may be fewer than three when
 * the gate drops some).
 */
export function proposeCandidateTimes(
  now: number,
  step: Step,
  prefs: SchedulingPrefs,
  env: RescheduleEnv,
): Candidate[] {
  return rawCandidates(now)
    .map((c) => clampCandidate(c, prefs))
    .filter((c) => passesGate(c, step, env));
}

/** The three un-clamped heuristic times. */
function rawCandidates(now: number): Candidate[] {
  const plus2h = new Date(now + 2 * 60 * 60 * 1000);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Evening today, or tomorrow evening if 19:00 today has already passed.
  const evening = new Date(now);
  evening.setHours(EVENING_HOUR, 0, 0, 0);
  if (evening.getTime() <= now) evening.setDate(evening.getDate() + 1);

  return [
    { at: tomorrow.getTime(), hour: tomorrow.getHours(), minute: tomorrow.getMinutes(), kind: 'tomorrow' },
    { at: plus2h.getTime(), hour: plus2h.getHours(), minute: plus2h.getMinutes(), kind: 'plus2h' },
    { at: evening.getTime(), hour: evening.getHours(), minute: evening.getMinutes(), kind: 'evening' },
  ];
}

/** Clamp a candidate's time into the day-part band, then the user's window (window wins). */
function clampCandidate(c: Candidate, prefs: SchedulingPrefs): Candidate {
  let m = c.hour * 60 + c.minute;
  const band = dayPartBand(prefs.dayPart);
  if (band) m = clampMinuteToWindow(m, band);
  if (prefs.window) m = clampMinuteToWindow(m, prefs.window);
  const hour = Math.floor(m / 60);
  const minute = m % 60;
  const d = new Date(c.at);
  d.setHours(hour, minute, 0, 0);
  return { ...c, at: d.getTime(), hour, minute };
}

/**
 * Whether a candidate survives the Step's constraints + the device env. Permissive
 * by construction: an 'unknown' signal never drops a slot.
 *  - a `location:home` Step is not proposed while the user is `away`;
 *  - a slot the calendar reports `busy` for the Step's duration is dropped.
 */
function passesGate(c: Candidate, step: Step, env: RescheduleEnv): boolean {
  const needsHome = (step.constraints ?? []).some(
    (k) => k.kind === 'location' && k.place === 'home',
  );
  if (needsHome && env.place === 'away') return false;

  const durationMin = step.estimatedDuration ?? DEFAULT_DURATION_MIN;
  const busy = env.isBusy({ start: c.at, end: c.at + durationMin * 60 * 1000 });
  if (busy === true) return false;

  return true;
}
