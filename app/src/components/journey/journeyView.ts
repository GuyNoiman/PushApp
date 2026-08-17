/**
 * journeyView — presentational derivations for the Journeys cluster.
 *
 * Progress and the start/end window are derived here from the Journey's Steps and its effective
 * start (`effectiveStartAt`) + durationDays. The Milestone position is NOT derived here: it is read
 * from the real {@link Journey.milestones} through the shared `core/util/milestones`, the one
 * derivation Home, this list and the detail screen all share. It used to be invented from the Step
 * count on this surface alone, which is how the same Journey reported two different Milestone
 * counts (Device QA 2026-08-17, A1). This is DISPLAY math only — no rewards/Buddy logic
 * (Engineering Bible §19).
 */
import type { Journey, JourneyStatus, ReasonEntry, Step } from '@/core/types/domain';
import { isStepLocked } from '@/core/status/stepDependencies';
import { deriveStepStatus, type StepStatus } from '@/core/status/stepStatus';
import { effectiveStartAt, resolveJourneyStatus } from '@/core/util/journeyStatus';
import { journeyStepCounts } from '@/core/util/journeyProgress';
import { currentMilestone, type MilestonePosition } from '@/core/util/milestones';
import { weeksBetween } from '@/core/util/week';
import i18n from '@/i18n';

export type JourneyBucket = 'active' | 'future' | 'completed';

export interface JourneyView {
  id: string;
  title: string;
  bucket: JourneyBucket;
  /** The authoritative lifecycle status (drives the frozen/paused badge — J3). */
  status: JourneyStatus;
  /** 0..1 share of Steps done (whole-Journey progress). */
  progress: number;
  doneSteps: number;
  /**
   * The Steps this Journey is measured against. For an ABANDONED (canceled) Journey this is the
   * count it had when the user let it go ({@link Journey.stepsAtAbandon}), NOT the shortened array
   * that survived the cancel — so the honest "3 of 12" is what the UI reads.
   */
  totalSteps: number;
  /**
   * Where the Journey stands in its REAL Milestone arc ({@link currentMilestone}). Undefined when
   * the Journey has no Milestones — such a card shows no Milestone line at all rather than an
   * invented "1 of 1" (Device QA 2026-08-17, A1).
   */
  milestone?: MilestonePosition;
  /** Epoch ms the Journey began / is expected to end. */
  startedAt: number;
  endsAt: number;
  /**
   * The instant this Journey actually ENDED, epoch ms — its {@link Journey.abandonedAt} when the
   * user canceled it, its {@link Journey.completedAt} when they finished it. This is what the
   * History surface dates and orders by, and it is undefined for a still-running Journey AND for a
   * Journey canceled/completed before its stamp existed: such a card shows no date and sorts last,
   * rather than inventing one. A non-finite persisted value is treated as absent for the same
   * reason — no surface may ever render "Invalid Date".
   */
  endedAt?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The authoritative lifecycle status of a Journey. Re-exported from the framework-free
 * {@link ../../core/util/journeyStatus} so the engines (Weekly Review, adaptive replan) and the
 * UI share ONE resolution and can never drift.
 */
export { resolveJourneyStatus };

/**
 * Bucket a Journey for the Journeys-screen tabs, from its {@link resolveJourneyStatus lifecycle
 * status}. `completed` → Completed; `future` (a complete plan saved for later) → Future — a STORED
 * status now, no longer inferred from a `createdAt` in the future (Future Journey Management §3;
 * `createdAt` means creation only). `active` and `frozen` (paused, resumable — J3) both live under
 * the Active tab; a frozen Journey is distinguished there by its `status`, not by a separate bucket.
 * `abandoned` (the user canceled it) → Completed, because that tab IS the history surface (the tabs
 * are Current · Completed · Future): a canceled Journey belongs in history, never under Current. The
 * bucket says WHERE it is listed; {@link JourneyView.status} still reports the true `abandoned`
 * status, so the row renders its own label — a canceled Journey must never read as a success.
 */
function bucketOf(journey: Journey): JourneyBucket {
  const status = resolveJourneyStatus(journey);
  if (status === 'completed' || status === 'abandoned') return 'completed';
  if (status === 'future') return 'future';
  return 'active';
}

/**
 * Derive the Journeys-screen read-model for one Journey. `now` is kept in the signature (and still
 * accepted by every existing caller) even though the bucketing no longer needs a clock — the Future
 * bucket is a stored status now — so the whole cluster keeps ONE call shape with {@link stepsByWeek}
 * and {@link computeWeekLayout}, which genuinely do need it.
 */
export function toJourneyView(journey: Journey, now: number = Date.now()): JourneyView {
  // The SHARED count (`core/util/journeyProgress`) — the same derivation the engine publishes to
  // Allies and the completion card is minted from. This surface used to count the raw Steps array,
  // so a Journey with dropped Steps read a different percentage here than the engine reported
  // (Friend Profile PRD §4.2 for the cancel rule; dropped-Step scope was the drift).
  const { totalSteps, doneSteps, progress } = journeyStepCounts(journey);

  // The one instant history dates and orders by: the stop date of a canceled Journey, the
  // completion date of a finished one (a cancel never stamps `completedAt`, so they can't collide).
  // Anything that isn't a real, finite number — a legacy Journey with no stamp at all, or a corrupt
  // persisted value — is dropped here, so the UI is never handed something it would render as
  // "Invalid Date".
  const endedRaw = journey.abandonedAt ?? journey.completedAt;
  const endedAt = typeof endedRaw === 'number' && Number.isFinite(endedRaw) ? endedRaw : undefined;

  return {
    id: journey.id,
    title: journey.title,
    bucket: bucketOf(journey),
    status: resolveJourneyStatus(journey),
    progress,
    doneSteps,
    totalSteps,
    // Read from the Journey's real Milestones — the SAME call Home makes for the Step it shows, so
    // the two surfaces cannot report different positions. Absent when there are no Milestones.
    milestone: currentMilestone(journey),
    // Anchored on the Journey's REAL start (activation → intended start → creation), never on
    // `createdAt` alone: a Future Journey's window must read from its planned start, and a Journey
    // started early from the day it actually began (Future Journey Management, §5).
    startedAt: effectiveStartAt(journey),
    endsAt: effectiveStartAt(journey) + journey.durationDays * DAY_MS,
    endedAt,
  };
}

/**
 * Order the History surface: MOST RECENTLY ENDED FIRST, by {@link JourneyView.endedAt} — one rule
 * across BOTH of its groups, so a Journey stopped yesterday leads the Stopped group exactly the way
 * a Journey finished yesterday leads the Completed one, and the two never order by different logic.
 *
 * A Journey with no end stamp (canceled or completed before the stamp existed) sorts LAST rather
 * than first: an unknown date is not a recent one, and pretending otherwise would put the oldest
 * records on top. Ties keep their snapshot order (Array.prototype.sort is stable), so the ordering
 * is deterministic and never re-shuffles between renders.
 */
export function byMostRecentlyEnded(a: JourneyView, b: JourneyView): number {
  if (a.endedAt === b.endedAt) return 0;
  if (a.endedAt == null) return 1;
  if (b.endedAt == null) return -1;
  return b.endedAt - a.endedAt;
}

export interface JourneyWeeks {
  /** Total weeks the Journey spans, derived from its duration (min 1). */
  totalWeeks: number;
  /** Non-dropped Steps grouped by 0-based week index; `weeks.length === totalWeeks`. */
  weeks: Step[][];
  /** The week the user is currently in (clamped) — a sensible default view. */
  currentWeek: number;
}

/**
 * Group a Journey's Steps into weeks for the detail screen's weekly pager. Weeks are CALENDAR weeks
 * aligned to the user's configured week-start day — the ONE authoritative week definition (D33) — not
 * a fixed number of milliseconds from `createdAt`, so the pager agrees with Missions/Streak/Week
 * Review. `totalWeeks` spans the calendar weeks from the Journey's first week (the one it started in)
 * through its last (by `durationDays`); a Journey's first or last week may therefore be partial. When
 * every Step carries a Planner `plannedFor`, Steps land in their real scheduled calendar week;
 * otherwise (manual Journeys with no schedule) they are spread evenly across the span by order.
 * DISPLAY math only (Engineering Bible §19) — dropped Steps are excluded, like progress/actionable lists.
 */
export function stepsByWeek(journey: Journey, now: number = Date.now()): JourneyWeeks {
  // The span is anchored on the Journey's REAL start (Future Journey Management, §5): its planned
  // start while it is still Future, its actual activation once it has begun, and `createdAt` only as
  // the legacy/"start now" fallback.
  const startedAt = effectiveStartAt(journey);
  const start = new Date(startedAt);
  // Calendar-correct span end (add days, not milliseconds — DST-safe).
  const endMs = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + journey.durationDays,
  ).getTime();
  const totalWeeks = Math.max(1, weeksBetween(startedAt, endMs) + 1);
  const active = journey.steps.filter((s) => !s.dropped);
  const weeks: Step[][] = Array.from({ length: totalWeeks }, () => []);
  const allPlanned = active.length > 0 && active.every((s) => s.plannedFor != null);

  active.forEach((step, i) => {
    const raw =
      allPlanned && step.plannedFor != null
        ? weeksBetween(startedAt, step.plannedFor)
        : Math.floor((i * totalWeeks) / Math.max(1, active.length));
    weeks[Math.min(totalWeeks - 1, Math.max(0, raw))].push(step);
  });

  const currentWeek = Math.min(totalWeeks - 1, Math.max(0, weeksBetween(startedAt, now)));
  return { totalWeeks, weeks, currentWeek };
}

/**
 * A single render unit for a shown week's Steps (Step Dependencies, Slice 5) — either a plain Step,
 * or a STACK: an actionable `top` Step with the still-LOCKED dependents piled behind it
 * (`hiddenChain`, in dependency order). `depth` is how many Steps wait behind the top. The stacked-card
 * VISUAL is rendered later (Pass 3); this type only describes the arrangement.
 */
export type WeekLayoutUnit =
  | { kind: 'step'; step: Step }
  | { kind: 'stack'; top: Step; hiddenChain: Step[]; depth: number };

/**
 * Arrange a shown week's Steps into ordered render units, resolving Step Dependencies into stacks
 * (Slice 5). PURE display arrangement — it writes NO state and mutates nothing; it only reads
 * {@link stepsByWeek} plus the dependency helpers to decide what stacks behind what.
 *
 * Rules:
 *  - Same-week stack: a LOCKED dependent whose predecessor is also in this week renders behind that
 *    predecessor — the actionable predecessor is the stack `top`, the waiting dependents are its
 *    `hiddenChain` (in order), and `depth` is how many wait.
 *  - Promote-on-unlock: once a predecessor is partial/complete the next Step moves to the front (a
 *    normal unit, or the new stack top when a further dependent still waits behind it).
 *  - Cross-week display-pull: a Step locked by a predecessor NOT shown in this week pulls that
 *    predecessor in (RENDER-ONLY — no `plannedFor` change) as the stack top; if the predecessor is
 *    already done the dependent simply renders as a normal unit.
 *
 * `reasonLog` powers the predecessor's DERIVED status (a partial unlocks — D36); it defaults to empty
 * for callers that only track `done`.
 */
export function computeWeekLayout(
  journey: Journey,
  shownWeek: number,
  now: number = Date.now(),
  reasonLog: readonly ReasonEntry[] = [],
): WeekLayoutUnit[] {
  const { weeks } = stepsByWeek(journey, now);
  const weekSteps = weeks[shownWeek] ?? [];
  const weekIds = new Set(weekSteps.map((s) => s.id));
  const predecessorOf = (step: Step): Step | undefined =>
    step.dependsOnStepId ? journey.steps.find((s) => s.id === step.dependsOnStepId) : undefined;

  // The ordered VISUAL node set: the week's Steps, plus any out-of-week predecessor pulled in
  // (render-only) IN FRONT of a dependent it still locks (cross-week display-pull).
  const nodes: Step[] = [];
  const seen = new Set<string>();
  const pushNode = (step: Step) => {
    if (!seen.has(step.id)) {
      seen.add(step.id);
      nodes.push(step);
    }
  };
  for (const step of weekSteps) {
    const predecessor = predecessorOf(step);
    if (predecessor && !weekIds.has(predecessor.id) && isStepLocked(step, journey, reasonLog)) {
      pushNode(predecessor); // pull the undone out-of-week predecessor in as the stack top
    }
    pushNode(step);
  }
  const nodeIds = new Set(nodes.map((s) => s.id));

  // Group the nodes into linear chains (single predecessor → single dependent) and arrange each.
  const units: WeekLayoutUnit[] = [];
  const consumed = new Set<string>();
  for (const node of nodes) {
    if (consumed.has(node.id)) continue;
    const predecessor = predecessorOf(node);
    if (predecessor && nodeIds.has(predecessor.id)) continue; // not a chain root — its root handles it

    // Walk the chain forward through the dependents that live in the visual set.
    const chain: Step[] = [node];
    let cursor = node;
    for (;;) {
      const next = nodes.find((s) => s.dependsOnStepId === cursor.id && !consumed.has(s.id));
      if (!next || next.id === node.id) break;
      chain.push(next);
      cursor = next;
    }
    chain.forEach((s) => consumed.add(s.id));

    // The FIRST locked Step's predecessor is the actionable stack top; earlier Steps render normally
    // and the locked tail piles behind. No locked Step (index -1) — or a locked root with no visible
    // predecessor (index 0, a fail-safe) — ⇒ every Step is a plain unit.
    const firstLocked = chain.findIndex((s) => isStepLocked(s, journey, reasonLog));
    if (firstLocked <= 0) {
      for (const s of chain) units.push({ kind: 'step', step: s });
      continue;
    }
    for (let i = 0; i < firstLocked - 1; i++) units.push({ kind: 'step', step: chain[i] });
    const hiddenChain = chain.slice(firstLocked);
    units.push({ kind: 'stack', top: chain[firstLocked - 1], hiddenChain, depth: hiddenChain.length });
  }

  return units;
}

/**
 * The outcome to SHOW for one Step of a CANCELED Journey's history list.
 *
 * Why this exists rather than calling {@link deriveStepStatus} straight: canceling KEEPS every Step
 * that carries a record and marks the non-done ones `dropped`, to shed them from scope so a canceled
 * Journey asks nothing and nothing waits on it. But `dropped` is exactly what `deriveStepStatus`
 * reads as "out of reporting scope → unreported" — so a Step the user honestly reported as a partial
 * or a "couldn't" would render blank in the very history the cancel exists to preserve. Reading past
 * the `dropped` flag here restores the truth WITHOUT weakening the engine's scope rule: this is a
 * display-only read of the same pure derivation, it writes nothing, and every ACTIONABLE surface
 * (Home, weekly planning, dependency locks) still sees the Step as dropped.
 *
 * History only — never call this for a live Journey.
 */
export function historyStepStatus(
  step: Step,
  reasonLog: readonly ReasonEntry[] = [],
): StepStatus {
  return deriveStepStatus({ ...step, dropped: false }, reasonLog);
}

/**
 * "ends in 3 wks" / "ends this week" / "ended" — a soft relative window, localized.
 * Framework-free: this is a plain TS helper, so it resolves copy through the shared
 * i18next instance (`i18n.t`) rather than a React hook. Uses the `journeys`
 * namespace (`ends.*`) so the list and this helper read from one source of truth.
 */
export function endsInLabel(endsAt: number, now: number = Date.now()): string {
  const ms = endsAt - now;
  if (ms <= 0) return i18n.t('ends.ended', { ns: 'journeys' });
  const days = Math.ceil(ms / DAY_MS);
  if (days <= 7) return i18n.t('ends.thisWeek', { ns: 'journeys' });
  const weeks = Math.round(days / 7);
  return i18n.t('ends.inWeeks', { ns: 'journeys', count: weeks });
}

/** "Jun 2" — a short absolute date for detail metadata. */
export function shortDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * A small stable glyph + accent colour per Journey/Step, derived from its title.
 * The domain has no icon field yet, so this is a light, honest guess from
 * keywords (display-only — Engineering Bible §19). Shared by the Journeys list
 * and Home's Step cards so the same title always reads the same icon tile.
 */
export type JourneyGlyphColor = 'gold' | 'teal' | 'green' | 'coral' | 'purple';

export interface JourneyGlyph {
  icon: string;
  color: JourneyGlyphColor;
}

export function journeyGlyph(title: string): JourneyGlyph {
  const t = title.toLowerCase();
  if (/run|walk|jog|km|fit|gym|workout|flame/.test(t)) return { icon: '🔥', color: 'teal' };
  if (/span|french|german|lang|learn|study|read|lesson/.test(t)) return { icon: '💬', color: 'green' };
  if (/medit|calm|breath|mind|yoga/.test(t)) return { icon: '🌿', color: 'gold' };
  if (/draw|paint|art|music|write/.test(t)) return { icon: '🎨', color: 'purple' };
  if (/call|phone|mom|dad|family|friend/.test(t)) return { icon: '📞', color: 'coral' };
  return { icon: '🧭', color: 'teal' };
}
