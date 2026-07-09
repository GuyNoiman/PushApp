/**
 * journeyView — presentational derivations for the Journeys cluster.
 *
 * The domain `Journey` (core/types/domain.ts) has no explicit Phases in the POC;
 * the mockups speak in "Phase X / Y". We derive a light, honest Phase read-out from
 * Steps (done Steps → current Phase) plus progress and a start/end window from
 * createdAt + durationDays. This is DISPLAY math only — no rewards/Buddy logic
 * (Engineering Bible §19). When real Phases land, replace these derivations.
 */
import type { Journey } from '@/core/types/domain';

export type JourneyBucket = 'active' | 'future' | 'completed';

export interface JourneyView {
  id: string;
  title: string;
  bucket: JourneyBucket;
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
 * Bucket a Journey. Completed = has completedAt. Future = starts later than now
 * (createdAt in the future — the creation flow starts "now", but adopted/scheduled
 * Journeys may not). Everything else is Active.
 */
function bucketOf(journey: Journey, now: number): JourneyBucket {
  if (journey.completedAt) return 'completed';
  if (journey.createdAt > now) return 'future';
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
    progress,
    doneSteps,
    totalSteps,
    phase,
    phases,
    startedAt: journey.createdAt,
    endsAt: journey.createdAt + journey.durationDays * DAY_MS,
  };
}

/** "ends in 3 wks" / "ends this week" / "ended" — a soft relative window. */
export function endsInLabel(endsAt: number, now: number = Date.now()): string {
  const ms = endsAt - now;
  if (ms <= 0) return 'ended';
  const days = Math.ceil(ms / DAY_MS);
  if (days <= 7) return 'ends this week';
  const weeks = Math.round(days / 7);
  return `ends in ${weeks} wk${weeks === 1 ? '' : 's'}`;
}

/** "Jun 2" — a short absolute date for detail metadata. */
export function shortDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
