/**
 * timingModel — the shape-and-bookkeeping half of Smart Notification Timing
 * (Smart_Notification_Timing_PRD): how a {@link TimingModel} is keyed, minted and kept small.
 * The judgement halves live next door — §4 classification in `outcome.ts`, §5 proposals in
 * `proposal.ts`.
 *
 * PURE (Engineering Bible §19): no clock read, no persistence, no vendor imports. Every function
 * that needs the time is given it, so the whole learning loop is deterministic under test.
 */
import {
  CONFIDENCE_DENOMINATOR,
  MAX_TRIALS_PER_MODEL,
  TIMING_MODEL_VERSION,
  TRIAL_RETENTION_MS,
} from '../config/timingPolicy';
import type { TimeOfDay, TimingDayKey, TimingModel, TimingTrial } from '../types/domain';

/**
 * The stable identity of one Journey/day model — `journeyId|dayKey`. PRD §5: per-day windows learn
 * independently, and a deliberately shared all-days window (`'*'`) shares ONE model. This is the
 * only place that convention is written down; {@link TimingTrial.modelKey} holds the result.
 */
export function modelKey(journeyId: string, dayKey: TimingDayKey): string {
  return `${journeyId}|${dayKey}`;
}

/** The model with this identity, or `undefined`. */
export function findTimingModel(
  models: readonly TimingModel[],
  journeyId: string,
  dayKey: TimingDayKey,
): TimingModel | undefined {
  const key = modelKey(journeyId, dayKey);
  return models.find((m) => modelKey(m.journeyId, m.dayKey) === key);
}

/**
 * The DISPLAY-ONLY confidence reading (PRD §7 names the field; the maths is the approved default
 * `eligibleCount / 6`, clamped to 1). It is shown to explain how much the app has seen — it NEVER
 * gates a proposal. The sparse guard and the percentage rule do that, and only that.
 */
export function confidenceFor(eligibleCount: number): number {
  if (!Number.isFinite(eligibleCount) || eligibleCount <= 0) return 0;
  return Math.min(1, eligibleCount / CONFIDENCE_DENOMINATOR);
}

/**
 * Mint the model for a Journey/day window that has no history yet. The user's own time is BOTH the
 * anchor (the fixed point the three-hour cap is measured from) and the first candidate — so day
 * one, with zero data, Smart sends at exactly the time Fixed would have. Nothing is learned until
 * there is evidence, and the copy says so.
 */
export function emptyModel(input: {
  journeyId: string;
  dayKey: TimingDayKey;
  anchor: TimeOfDay;
  /** Epoch ms this model was created — the caller's clock, never read here. */
  now: number;
  /** IANA zone the model is being learned in, when the device could report one. */
  tzName?: string;
}): TimingModel {
  return {
    journeyId: input.journeyId,
    dayKey: input.dayKey,
    anchor: { ...input.anchor },
    currentCandidate: { ...input.anchor },
    eligibleCount: 0,
    positive: 0,
    negative: 0,
    confidence: 0,
    // First exploration goes LATER. Arbitrary but fixed, so the alternation is deterministic and a
    // user with two identical Journeys sees the same behaviour from both.
    exploreDirection: 'later',
    rejectedCandidates: [],
    ...(input.tzName ? { tzName: input.tzName } : {}),
    lastUpdatedAt: input.now,
    modelVersion: TIMING_MODEL_VERSION,
  };
}

/** Every trial belonging to one model, input order preserved. */
export function trialsForModel(trials: readonly TimingTrial[], key: string): TimingTrial[] {
  return trials.filter((t) => t.modelKey === key);
}

/**
 * Enforce PRD §7's bounded retention on the raw trial store, in this order:
 *  1. HARD-DROP anything scheduled more than four weeks before `now` — regardless of model, so an
 *     abandoned model's trials cannot linger forever;
 *  2. keep only the newest {@link MAX_TRIALS_PER_MODEL} per model, since §5 never looks further
 *     back than that anyway.
 *
 * Input order is preserved among the survivors, so persisting the result is a stable no-op once
 * the store is already pruned.
 */
export function pruneTrials(trials: readonly TimingTrial[], now: number): TimingTrial[] {
  const horizon = now - TRIAL_RETENTION_MS;
  const fresh = trials.filter((t) => t.scheduledAt >= horizon);

  // Newest-N per model: rank each model's trials by scheduledAt (newest first, id-stable), then
  // keep the survivors in their ORIGINAL order.
  const keep = new Set<TimingTrial>();
  const byModel = new Map<string, TimingTrial[]>();
  for (const trial of fresh) {
    const bucket = byModel.get(trial.modelKey);
    if (bucket) bucket.push(trial);
    else byModel.set(trial.modelKey, [trial]);
  }
  for (const bucket of byModel.values()) {
    const newestFirst = [...bucket].sort((a, b) => b.scheduledAt - a.scheduledAt);
    for (const trial of newestFirst.slice(0, MAX_TRIALS_PER_MODEL)) keep.add(trial);
  }
  return fresh.filter((t) => keep.has(t));
}
