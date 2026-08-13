/**
 * journeyView — presentational derivations for the Journeys cluster.
 *
 * The domain `Journey` (core/types/domain.ts) has no explicit Phases in the POC;
 * the mockups speak in "Phase X / Y". We derive a light, honest Phase read-out from
 * Steps (done Steps → current Phase) plus progress and a start/end window from
 * createdAt + durationDays. This is DISPLAY math only — no rewards/Buddy logic
 * (Engineering Bible §19). When real Phases land, replace these derivations.
 */
import type { Journey, JourneyStatus, ReasonEntry, Step } from '@/core/types/domain';
import { isStepLocked } from '@/core/status/stepDependencies';
import { resolveJourneyStatus } from '@/core/util/journeyStatus';
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
  totalSteps: number;
  /** Derived current Phase (1-based) and total Phases. */
  phase: number;
  phases: number;
  /** Epoch ms the Journey began / is expected to end. */
  startedAt: number;
  endsAt: number;
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
 * status}. `completed` → Completed. A still-`active` Journey scheduled to BEGIN later (createdAt in
 * the future — the creation flow starts "now", but adopted/scheduled Journeys may not) reads as
 * Future. `active` and `frozen` (paused, resumable — J3) both live under the Active tab; a frozen
 * Journey is distinguished there by its `status`, not by a separate bucket. `abandoned` Journeys are
 * removed outright today, so they never reach this.
 */
function bucketOf(journey: Journey, now: number): JourneyBucket {
  const status = resolveJourneyStatus(journey);
  if (status === 'completed') return 'completed';
  if (status === 'active' && journey.createdAt > now) return 'future';
  return 'active';
}

export function toJourneyView(journey: Journey, now: number = Date.now()): JourneyView {
  const totalSteps = journey.steps.length;
  const doneSteps = journey.steps.filter((s) => s.done).length;
  const progress = totalSteps === 0 ? 0 : doneSteps / totalSteps;

  // Derive Phases from Steps: one Phase per Step feels too granular, so we group
  // into a small number of Phases (min 1). The current Phase advances with progress.
  const phases = Math.max(1, Math.min(4, totalSteps || 1));
  const phase = journey.completedAt
    ? phases
    : Math.min(phases, Math.floor(progress * phases) + 1);

  return {
    id: journey.id,
    title: journey.title,
    bucket: bucketOf(journey, now),
    status: resolveJourneyStatus(journey),
    progress,
    doneSteps,
    totalSteps,
    phase,
    phases,
    startedAt: journey.createdAt,
    endsAt: journey.createdAt + journey.durationDays * DAY_MS,
  };
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
  const start = new Date(journey.createdAt);
  // Calendar-correct span end (add days, not milliseconds — DST-safe).
  const endMs = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + journey.durationDays,
  ).getTime();
  const totalWeeks = Math.max(1, weeksBetween(journey.createdAt, endMs) + 1);
  const active = journey.steps.filter((s) => !s.dropped);
  const weeks: Step[][] = Array.from({ length: totalWeeks }, () => []);
  const allPlanned = active.length > 0 && active.every((s) => s.plannedFor != null);

  active.forEach((step, i) => {
    const raw =
      allPlanned && step.plannedFor != null
        ? weeksBetween(journey.createdAt, step.plannedFor)
        : Math.floor((i * totalWeeks) / Math.max(1, active.length));
    weeks[Math.min(totalWeeks - 1, Math.max(0, raw))].push(step);
  });

  const currentWeek = Math.min(totalWeeks - 1, Math.max(0, weeksBetween(journey.createdAt, now)));
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
