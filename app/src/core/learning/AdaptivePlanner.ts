/**
 * AdaptivePlanner — the PURE re-planner of the adaptive coach (S1.9/S1.10). Given an
 * EXISTING {@link Journey}, the on-device {@link InsightModel} derived from real behaviour, the
 * user's {@link PlanConstraints} and a tunable {@link AdaptivePolicy}, it COMPUTES an intended
 * set of per-Step changes over the REMAINING (not-yet-done) Steps. It NEVER mutates the
 * Journey, touches the event bus, or persists anything — it only returns a {@link ReplanResult}
 * the apply step (S1.11) will later enact via the JourneyEngine.
 *
 * The coach optimises for REAL GOAL PROGRESS, never streaks:
 *  - Deadline goal (constraints.targetDate present): compare required remaining work against the
 *    time left; if behind the policy pace band (or slipping) it COMPRESSES the remaining Steps
 *    earlier / raises frequency, then SHEDS LOAD (shrink sessions → drop scope) if still
 *    infeasible, and if it STILL can't hold the deadline it is HONEST and sets `atRisk`.
 *  - Open-ended habit (no targetDate): if slipping it SHRINKS the session toward the floor to
 *    rebuild momentum — it never piles on.
 *  - Per-Milestone reliability tunes difficulty/size: a struggling Milestone is eased (lower
 *    difficulty, smaller sessions); a consistently strong one grows and is pulled earlier to
 *    bank buffer.
 *  - A {@link NudgeHint} is derived from the observed preferred day-part + the weekdays the
 *    remaining Steps now land on (replan itself performs NO scheduling side effect).
 *
 * NO LLM, NO randomness, NO mutation: same inputs → identical {@link ReplanResult}. `now` is
 * injected so tests are fully deterministic. Mirrors the deterministic date maths of the
 * {@link Planner}. Config-before-code: every threshold lives in {@link AdaptivePolicy}.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { defaultAdaptivePolicy } from '../config/adaptivePolicy';
import type { AdaptivePolicy } from '../config/adaptivePolicy';
import type { DayPart, InsightModel, Journey, Step } from '../types/domain';
import type { NudgeHint, PlanConstraints, ReplanAdjustment, ReplanResult, StepAdjustment } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The local wall-clock hour a Step is scheduled at, by preferred day-part (mirrors the Planner). */
const DAYPART_HOUR: Record<DayPart, number> = { morning: 8, evening: 19, either: 12 };

/** Coarse-kind emit order, so {@link ReplanResult.adjustments} is stable regardless of Step order. */
const KIND_ORDER: ReplanAdjustment[] = ['rescheduled', 'resized', 'refrequency', 'added', 'removed'];

/**
 * A mutable working copy of one remaining Step while the re-planner reasons about it. Nothing
 * here escapes: replan reads it only to build the immutable {@link StepAdjustment}s at the end.
 */
interface Work {
  step: Step;
  /** The Step's current scheduled time, if any. */
  plannedFor?: number;
  /** A proposed new scheduled time (set only when the plan reschedules this Step). */
  newPlannedFor?: number;
  /** A proposed new session length (set only when the plan resizes this Step). */
  newDuration?: number;
  /** A proposed new difficulty (set only when the plan eases this Step). */
  newDifficulty?: number;
  /** True once this Step's session has been shrunk (so load-shed never double-shrinks it). */
  shrunk: boolean;
  /** True once the plan has shed this Step to hold the deadline. */
  dropped: boolean;
}

/**
 * Re-plan an existing Journey from its derived InsightModel. PURE: returns an intended set of
 * per-Step adjustments; it never mutates the Journey, emits an event, or persists. See the file
 * header for the full strategy.
 */
export function replan(
  journey: Journey,
  insight: InsightModel,
  constraints: PlanConstraints,
  policy: AdaptivePolicy = defaultAdaptivePolicy,
  now: number,
): ReplanResult {
  const work: Work[] = journey.steps
    .filter((s) => !s.done)
    .map((s) => ({ step: s, plannedFor: s.plannedFor, shrunk: false, dropped: false }));

  const hasDeadline = constraints.targetDate != null;
  const fallbackMinutes =
    insight.typicalSessionMinutes > 0 ? insight.typicalSessionMinutes : policy.session.defaultMinutes;
  const durOf = (w: Work): number => w.newDuration ?? w.step.estimatedDuration ?? fallbackMinutes;

  // Coarse behavioural verdicts, all from the policy bands (never hard-coded here).
  const strongPace = insight.paceRatio >= policy.pace.strong;
  const behindPace = insight.paceRatio < policy.pace.onTrack;
  const slipping = insight.slipRate >= policy.slip.high || insight.atRisk;
  // Open-ended slip response: shrink the session toward the floor to rebuild momentum (no piling on).
  const easeAllForMomentum = !hasDeadline && slipping;

  // ── Stage A — per-Milestone reliability tunes each remaining Step's size & difficulty ──
  for (const w of work) {
    const rel =
      w.step.milestoneId != null ? insight.reliabilityByMilestone[w.step.milestoneId] : undefined;
    const lowReliability = rel !== undefined && rel < policy.reliability.low;
    const highReliability = rel !== undefined && rel >= policy.reliability.high;
    const base = w.step.estimatedDuration ?? fallbackMinutes;

    if (lowReliability || easeAllForMomentum) {
      // Struggling / slipping → shrink the session and (if we know it) ease the difficulty.
      w.newDuration = shrink(base, policy);
      w.shrunk = true;
      if (lowReliability && w.step.difficulty != null) {
        const eased = Math.max(policy.difficulty.min, w.step.difficulty - policy.difficulty.step);
        if (eased !== w.step.difficulty) w.newDifficulty = eased;
      }
    } else if (highReliability) {
      // Consistently strong → grow the session to bank progress (pulled earlier in Stage B).
      w.newDuration = grow(base, policy);
    }
  }

  let atRisk = false;

  // ── Stages B & C — deadline compression, then load-shedding, then at-risk honesty ──
  if (hasDeadline) {
    const targetDate = constraints.targetDate!;
    const effectiveDeadline = targetDate - policy.deadline.bufferDays * MS_PER_DAY;

    // B. Compress the remaining Steps earlier when behind / slipping / strong / already overrunning.
    if (needsCompression(work, effectiveDeadline, { strongPace, behindPace, slipping, now })) {
      packToDeadline(work.filter((w) => !w.dropped), constraints, now, effectiveDeadline, targetDate);
    }

    // C. Feasibility: does the remaining work still fit the time left? Shed load if not.
    const availableDays = Math.max(0, Math.floor((effectiveDeadline - now) / MS_PER_DAY));
    const capacity = (constraints.weeklyAvailabilityMinutes * availableDays) / 7;

    let alive = work.filter((w) => !w.dropped);
    if (sumMinutes(alive, durOf) > capacity) {
      // First shrink every not-yet-shrunk Step toward the floor (keep scope, smaller sessions).
      for (const w of alive) {
        if (!w.shrunk) {
          const smaller = shrink(durOf(w), policy);
          if (smaller < durOf(w)) {
            w.newDuration = smaller;
            w.shrunk = true;
          }
        }
      }
      // If it still won't fit, drop scope from the tail — and be honest that we did.
      let droppedAny = false;
      while (sumMinutes(alive, durOf) > capacity && alive.length > 0) {
        alive[alive.length - 1].dropped = true;
        alive = alive.slice(0, -1);
        droppedAny = true;
      }
      // Shed scope, or a plan we still cannot hold ⇒ at-risk (never a silent failure).
      atRisk = droppedAny || sumMinutes(alive, durOf) > capacity;
    }
  }

  // ── Emit the intended per-Step adjustments ──
  const stepAdjustments: StepAdjustment[] = [];
  for (const w of work) {
    if (w.dropped) {
      stepAdjustments.push({ stepId: w.step.id, kind: 'removed' });
      continue;
    }
    if (w.newPlannedFor != null && w.newPlannedFor !== w.plannedFor) {
      stepAdjustments.push({ stepId: w.step.id, kind: 'rescheduled', plannedFor: w.newPlannedFor });
    }
    const durChanged = w.newDuration != null && w.newDuration !== w.step.estimatedDuration;
    const diffChanged = w.newDifficulty != null && w.newDifficulty !== w.step.difficulty;
    if (durChanged || diffChanged) {
      const adj: StepAdjustment = { stepId: w.step.id, kind: 'resized' };
      if (durChanged) adj.estimatedDuration = w.newDuration;
      if (diffChanged) adj.difficulty = w.newDifficulty;
      stepAdjustments.push(adj);
    }
  }

  const present = new Set(stepAdjustments.map((a) => a.kind));
  const adjustments = KIND_ORDER.filter((k) => present.has(k));
  if (adjustments.length === 0) adjustments.push('none');

  return {
    changed: stepAdjustments.length > 0,
    adjustments,
    stepAdjustments,
    atRisk,
    nudge: buildNudge(work, insight.preferredDaypart, policy, atRisk),
  };
}

// ── Sizing helpers ─────────────────────────────────────────────────────────────

/** Shrink minutes by the policy factor, never below the session floor. */
function shrink(minutes: number, policy: AdaptivePolicy): number {
  return Math.max(policy.session.minMinutes, Math.round(minutes * (1 - policy.session.shrinkFactor)));
}

/** Grow minutes by the policy factor, never above the session ceiling. */
function grow(minutes: number, policy: AdaptivePolicy): number {
  return Math.min(policy.session.maxMinutes, Math.round(minutes * (1 + policy.session.growFactor)));
}

/** Total effective minutes across the given Work items. */
function sumMinutes(items: Work[], durOf: (w: Work) => number): number {
  return items.reduce((sum, w) => sum + durOf(w), 0);
}

// ── Compression ────────────────────────────────────────────────────────────────

/**
 * Whether the remaining Steps should be repacked toward the deadline: when the user is behind /
 * slipping (catch up), performing strongly (pull earlier to bank buffer), or the current layout
 * already runs past the effective deadline (a Step with no time counts as an overrun).
 */
function needsCompression(
  work: Work[],
  effectiveDeadline: number,
  flags: { strongPace: boolean; behindPace: boolean; slipping: boolean; now: number },
): boolean {
  if (flags.behindPace || flags.slipping || flags.strongPace) return true;
  const alive = work.filter((w) => !w.dropped);
  const times = alive.map((w) => w.newPlannedFor ?? w.plannedFor);
  if (times.some((t) => t == null)) return true; // an unscheduled remaining Step must be placed.
  const boundary = startOfDay(effectiveDeadline).getTime();
  return times.some((t) => startOfDay(t as number).getTime() > boundary);
}

/**
 * Spread the alive Steps as evenly as possible across the preferred days on/before `boundaryMs`,
 * so the last one lands no later than the deadline (mirrors {@link Planner} back-solving). When no
 * preferred day remains, every Step is placed on the earliest slot, clamped to `hardMax` so a
 * reschedule is NEVER past the targetDate.
 */
function packToDeadline(
  alive: Work[],
  constraints: PlanConstraints,
  now: number,
  boundaryMs: number,
  hardMax: number,
): void {
  if (alive.length === 0) return;
  const preferred = normalizedPreferredDays(constraints.preferredDays);
  const boundaryDay = startOfDay(boundaryMs).getTime();

  const available: Date[] = [];
  let d = firstPreferredOnOrAfter(startOfDay(now), preferred);
  while (d.getTime() <= boundaryDay) {
    available.push(d);
    d = nextPreferred(d, preferred);
  }

  if (available.length === 0) {
    const earliest = firstPreferredOnOrAfter(startOfDay(now), preferred);
    const slot = Math.min(atDaypart(earliest, constraints.daypart), hardMax);
    for (const w of alive) w.newPlannedFor = slot;
    return;
  }

  const perDay = Math.ceil(alive.length / available.length);
  alive.forEach((w, i) => {
    const dayIndex = Math.min(Math.floor(i / perDay), available.length - 1);
    w.newPlannedFor = atDaypart(available[dayIndex], constraints.daypart);
  });
}

// ── Nudge ──────────────────────────────────────────────────────────────────────

/** Build the reminder-timing hint from the observed day-part + the weekdays the plan now lands on. */
function buildNudge(
  work: Work[],
  daypart: DayPart,
  policy: AdaptivePolicy,
  atRisk: boolean,
): NudgeHint {
  const days = [
    ...new Set(
      work
        .filter((w) => !w.dropped)
        .map((w) => w.newPlannedFor ?? w.plannedFor)
        .filter((t): t is number => t != null)
        .map((t) => new Date(t).getDay()),
    ),
  ].sort((a, b) => a - b);

  return {
    daypart,
    days,
    leadMinutes: policy.nudge.leadMinutes,
    extra: policy.nudge.extraWhenAtRisk && atRisk,
  };
}

// ── Date helpers (local wall-clock; mirror the Planner) ──────────────────────────

/** Preferred weekdays as a unique, sorted set; an empty preference means every day. */
function normalizedPreferredDays(preferredDays: number[]): number[] {
  const unique = [...new Set(preferredDays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [0, 1, 2, 3, 4, 5, 6];
}

/** Midnight (local) of the day containing `ms`. */
function startOfDay(ms: number): Date {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The epoch ms of `d` at the day-part hour. */
function atDaypart(d: Date, daypart: DayPart): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAYPART_HOUR[daypart]).getTime();
}

/** The first preferred day on or after `d` (returns `d` itself when it qualifies). */
function firstPreferredOnOrAfter(d: Date, preferred: number[]): Date {
  let c = d;
  for (let i = 0; i < 7; i++) {
    if (preferred.includes(c.getDay())) return c;
    c = addDays(c, 1);
  }
  return d; // unreachable — `preferred` is never empty.
}

/** The first preferred day strictly after `d`. */
function nextPreferred(d: Date, preferred: number[]): Date {
  let c = addDays(d, 1);
  for (let i = 0; i < 7; i++) {
    if (preferred.includes(c.getDay())) return c;
    c = addDays(c, 1);
  }
  return c; // unreachable — `preferred` is never empty.
}
