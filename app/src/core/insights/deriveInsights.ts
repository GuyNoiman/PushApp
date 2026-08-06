/**
 * The adaptive-coach projection boundary (S0.6). Two pure functions, deliberately
 * DECOUPLED from AppState so they are unit-testable and unaffected by later state-shape
 * changes:
 *
 *  1. deriveInsights   — RawBehaviorRecord[] → on-device InsightModel (may be rich).
 *  2. deriveOutreachInsight — InsightModel → minimal OutreachInsight. THE single
 *     chokepoint where data becomes server-eligible: it emits ONLY enums, buckets,
 *     booleans, opt-in prefs, a pseudonymous uid, and scalar timestamps. No free text,
 *     no coach conversation text, no exact goal/title, no raw timestamp series ever
 *     crosses this line (SECURITY-PRIVACY G1/G2, data minimization Bible §8).
 *
 * Pure TS — no React, no vendor imports, no AppState import.
 */
import type {
  ChannelPrefs,
  ContactWindow,
  EngagementState,
  InsightModel,
  OutreachInsight,
  RawBehaviorRecord,
  StreakBucket,
  TargetProximity,
} from '../types/domain';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Thresholds kept here (config-before-code); a later slice may lift them to config. */
const ATRISK_SLIP_RATE = 0.3;
const ATRISK_PACE_RATIO = 0.5;
const ATRISK_STALE_DAYS = 5;
const SLIPPAGE_FLAG_RATE = 0.25;
const STREAK_STRONG_PACE = 0.75;
const STREAK_BUILDING_PACE = 0.4;
const ENGAGED_ACTIVE_DAYS = 2;
const ENGAGED_COOLING_DAYS = 7;
const TARGET_DAYS_SOON = 7;
const TARGET_WEEKS_SOON = 42;

/**
 * The opt-in preferences the projection is allowed to copy through verbatim. Everything
 * here is already minimal (enums/booleans + optional scalar timestamps). A later wiring
 * task maps CommunicationPrefs/SchedulingPrefs into this; S0.6 keeps it decoupled.
 */
export interface OutreachPrefs {
  contactWindow: ContactWindow;
  channelPrefs: ChannelPrefs;
  /** Epoch ms of a tracked goal deadline (cert exam, event). Bucketed, never emitted raw. */
  targetDate?: number;
  /** Epoch ms the user was last nudged, if ever. */
  lastNudgeAt?: number;
}

/**
 * Derive the on-device InsightModel from raw signals. Pure and total: an empty input
 * yields a neutral, non-at-risk model. `now` is injected so the result is deterministic.
 */
export function deriveInsights(raw: RawBehaviorRecord[], now: number): InsightModel {
  const total = raw.length;

  // Per-Milestone reliability = done / total occurrences for that Milestone.
  const perMilestone: Record<string, { done: number; total: number }> = {};
  for (const r of raw) {
    if (!r.milestoneId) continue;
    const bucket = (perMilestone[r.milestoneId] ??= { done: 0, total: 0 });
    bucket.total += 1;
    if (r.kind === 'done') bucket.done += 1;
  }
  const reliabilityByMilestone: Record<string, number> = {};
  for (const [milestoneId, b] of Object.entries(perMilestone)) {
    reliabilityByMilestone[milestoneId] = b.total > 0 ? b.done / b.total : 0;
  }

  const slipped = raw.filter((r) => r.kind === 'slipped').length;
  const slipRate = total > 0 ? slipped / total : 0;

  // Pace = planned occurrences completed on-plan / planned occurrences.
  const planned = raw.filter((r) => r.plannedFor != null);
  const donePlanned = planned.filter((r) => r.kind === 'done').length;
  const paceRatio = planned.length > 0 ? donePlanned / planned.length : 0;

  // Preferred day-part from the hours of completed Steps (morning = before noon).
  const doneRecords = raw.filter((r) => r.kind === 'done');
  let morning = 0;
  let evening = 0;
  for (const r of doneRecords) {
    if (new Date(r.at).getHours() < 12) morning += 1;
    else evening += 1;
  }
  const preferredDaypart = morning === evening ? 'either' : morning > evening ? 'morning' : 'evening';

  // Typical session length = mean of known actualMinutes among completed Steps.
  const timed = doneRecords.filter((r) => typeof r.actualMinutes === 'number');
  const typicalSessionMinutes =
    timed.length > 0
      ? Math.round(timed.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0) / timed.length)
      : 0;

  const ats = raw.map((r) => r.at);
  const lastActivityAt = ats.length > 0 ? Math.max(...ats) : null;
  const daysSinceLastActivity =
    lastActivityAt != null ? Math.floor((now - lastActivityAt) / MS_PER_DAY) : 0;

  const atRisk =
    slipRate > ATRISK_SLIP_RATE ||
    (planned.length > 0 && paceRatio < ATRISK_PACE_RATIO) ||
    (lastActivityAt != null && daysSinceLastActivity > ATRISK_STALE_DAYS);

  return {
    reliabilityByMilestone,
    slipRate,
    preferredDaypart,
    typicalSessionMinutes,
    paceRatio,
    atRisk,
    lastActivityAt,
    daysSinceLastActivity,
  };
}

function engagementState(insight: InsightModel): EngagementState {
  if (insight.lastActivityAt == null) return 'dormant';
  if (insight.daysSinceLastActivity <= ENGAGED_ACTIVE_DAYS) return 'active';
  if (insight.daysSinceLastActivity <= ENGAGED_COOLING_DAYS) return 'cooling';
  return 'dormant';
}

function streakBucket(insight: InsightModel): StreakBucket {
  if (insight.paceRatio >= STREAK_STRONG_PACE) return 'strong';
  if (insight.paceRatio >= STREAK_BUILDING_PACE) return 'building';
  return 'none';
}

function targetProximity(targetDate: number | undefined, now: number): TargetProximity {
  if (targetDate == null) return 'none';
  if (targetDate < now) return 'past';
  const days = (targetDate - now) / MS_PER_DAY;
  if (days <= TARGET_DAYS_SOON) return 'days';
  if (days <= TARGET_WEEKS_SOON) return 'weeks';
  return 'far';
}

/**
 * THE single chokepoint where data becomes server-eligible. Reduces the rich on-device
 * InsightModel to the minimal, whitelist-only OutreachInsight — enums, buckets, booleans,
 * opt-in prefs, a pseudonymous uid, and scalar timestamps ONLY. Never reads free text,
 * conversation text, exact goal/title, or a raw timestamp series (there are none to read
 * — the InsightModel already dropped them). Pure; `now` injected for determinism.
 */
export function deriveOutreachInsight(
  insight: InsightModel,
  prefs: OutreachPrefs,
  uid: string,
  now: number,
): OutreachInsight {
  return {
    uid,
    engagementState: engagementState(insight),
    slippageFlag: insight.atRisk || insight.slipRate > SLIPPAGE_FLAG_RATE,
    streakBucket: streakBucket(insight),
    contactWindow: prefs.contactWindow,
    channelPrefs: { push: prefs.channelPrefs.push, social: prefs.channelPrefs.social },
    targetProximity: targetProximity(prefs.targetDate, now),
    lastNudgeAt: prefs.lastNudgeAt,
    updatedAt: now,
  };
}
