/**
 * BehaviorModelEngine — the adaptive coach's "learn the user" layer (adaptive coach, S1).
 * It subscribes to Step-outcome events on the bus, appends a structured
 * {@link RawBehaviorRecord} for each, detects Steps whose planned occurrence elapsed
 * unmet (`tick`), and derives the on-device {@link InsightModel} the coach consumes.
 *
 * Event → record kind mapping (the full RawBehaviorRecord.kind union):
 *   StepCheckedIn → 'done'  · StepPartial → 'partial'
 *   StepPostponed → 'postponed'  · StepCancelled → 'couldnt'
 *   slip detector (`tick`) → 'slipped' (also emits the reserved StepMissed)
 * `actualMinutes` has no source event yet (no timed-session event exists), so it is
 * never populated today — it stays an optional slot for a future timing signal.
 *
 * SECURITY-PRIVACY G1: the raw log is ON-DEVICE ONLY, FOREVER. A RawBehaviorRecord — and
 * any timestamp series built from it — must NEVER leave the device. This engine emits only
 * the enum/ids DomainEvents (StepMissed, InsightUpdated) and NEVER puts a record, a note, or
 * a goal/title into an event. Only the bucketed OutreachInsight (via deriveOutreachInsight)
 * is ever server-eligible. In scope for account deletion/export (G6) when that lands.
 *
 * The log is held in memory and backed by AppState.behaviorLog (S1.16): AppCore hydrates the
 * engine from the persisted log on load and writes getRawLog()/getInsights() back through the
 * existing save path on change. Constructor mirrors the other engines: injected bus + getState +
 * injected clock, so it is deterministic and unit-testable. Pure TS — no React/vendor imports.
 */
import type { EventBus } from '../events/EventBus';
import type { AppState, InsightModel, RawBehaviorRecord, Step } from '../types/domain';
import { createId } from '../util/id';
import { isRunning } from '../util/journeyStatus';
import { deriveInsights } from '../insights/deriveInsights';
import { isStepLocked } from '../status/stepDependencies';

/**
 * SECURITY-PRIVACY G5: cap the on-device raw log to a rolling window PER STEP so it never
 * grows unbounded on disk (same approach as JourneyEngine.capReasonLog). Keep the most
 * recent N records for each Step; older records for that Step are dropped.
 */
export const MAX_RECORDS_PER_STEP = 50;

export class BehaviorModelEngine {
  /**
   * The on-device raw behavioural log. Held in memory and persisted behind AppState.behaviorLog
   * (S1.16, via AppCore hydrate + save). NEVER serialized into an event or a sync path (G1).
   */
  private log: RawBehaviorRecord[] = [];

  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    /** Injected clock (epoch ms; defaults to the real one) — overridden in tests. */
    private readonly now: () => number = () => Date.now(),
  ) {
    // Subscribe to the Step-outcome events that exist today. Each maps to one record kind.
    this.bus.on('StepCheckedIn', (e) => this.append(e.journeyId, e.step.id, 'done', this.now()));
    this.bus.on('StepPartial', (e) => this.append(e.journeyId, e.stepId, 'partial', this.now()));
    this.bus.on('StepPostponed', (e) => this.append(e.journeyId, e.stepId, 'postponed', this.now()));
    this.bus.on('StepCancelled', (e) => this.append(e.journeyId, e.stepId, 'couldnt', this.now()));
  }

  /**
   * Slip detector: scan active Journeys for not-yet-done Steps whose `plannedFor` has
   * passed, emit the reserved StepMissed (its first producer) and record a `slipped`
   * signal. Deduped by (stepId, plannedFor) against the existing log, so re-ticking never
   * re-flags the same elapsed occurrence; a re-planned Step (new plannedFor) slips afresh.
   */
  tick(now: number): void {
    for (const journey of this.getState().journeys) {
      // Only a RUNNING Journey can slip. A FROZEN Journey is paused — its elapsed occurrences are
      // NEVER slips (Weekly Review §7: frozen days are never interpreted as non-completion), and a
      // FUTURE Journey has not started, so a `plannedFor` that already passed is not a miss either
      // (Future Journey Management §9 — "no overdue/failure language before activation").
      if (!isRunning(journey)) continue;
      for (const step of journey.steps) {
        if (step.done || step.dropped) continue; // a shed Step is out of scope — never slips.
        // A LOCKED Step (Step Dependencies) cannot be actioned yet — its predecessor is still open —
        // so an elapsed `plannedFor` on it is never the user's miss. Never emit StepMissed for it.
        if (isStepLocked(step, journey, this.getState().reasonLog ?? [])) continue;
        const plannedFor = step.plannedFor;
        if (plannedFor == null || plannedFor > now) continue;
        const alreadyFlagged = this.log.some(
          (r) => r.kind === 'slipped' && r.stepId === step.id && r.plannedFor === plannedFor,
        );
        if (alreadyFlagged) continue;
        this.bus.emit({ type: 'StepMissed', journeyId: journey.id, stepId: step.id });
        this.append(journey.id, step.id, 'slipped', now);
      }
    }
  }

  /**
   * Seed the in-memory log from the persisted AppState.behaviorLog (S1.16). Replaces the
   * current log with a defensive copy and emits NOTHING — hydration is not a behavioural
   * signal. AppCore calls this once on load when the adaptiveCoach flag is on.
   */
  hydrate(records: RawBehaviorRecord[]): void {
    this.log = [...records];
  }

  /** The raw log (a defensive copy) — for S1.16 persistence and tests. Stays on-device. */
  getRawLog(): RawBehaviorRecord[] {
    return [...this.log];
  }

  /** The DERIVED on-device model the adaptive coach consumes (deriveInsights). */
  getInsights(): InsightModel {
    return deriveInsights(this.log, this.now());
  }

  /**
   * Append one raw record for a Step occurrence, carrying over the Step's `milestoneId`
   * and `plannedFor` when present, then apply the per-Step cap and signal InsightUpdated.
   */
  private append(
    journeyId: string,
    stepId: string,
    kind: RawBehaviorRecord['kind'],
    at: number,
  ): void {
    const step = this.findStep(journeyId, stepId);
    const record: RawBehaviorRecord = {
      id: createId('behavior'),
      stepId,
      journeyId,
      ...(step?.milestoneId !== undefined ? { milestoneId: step.milestoneId } : {}),
      kind,
      at,
      ...(step?.plannedFor !== undefined ? { plannedFor: step.plannedFor } : {}),
    };
    this.log.push(record);
    this.capLog(stepId);
    // Pure signal — carries no derived values; the model stays on-device (G1).
    this.bus.emit({ type: 'InsightUpdated' });
  }

  /** Find a Step within a Journey, or undefined if either is missing. */
  private findStep(journeyId: string, stepId: string): Step | undefined {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    return journey?.steps.find((s) => s.id === stepId);
  }

  /** Trim the log so no Step keeps more than MAX_RECORDS_PER_STEP records (G5). */
  private capLog(stepId: string): void {
    const forStep = this.log.filter((r) => r.stepId === stepId);
    if (forStep.length <= MAX_RECORDS_PER_STEP) return;
    // Keep only the newest N for this Step; other Steps' records are untouched.
    const keep = new Set(
      [...forStep].sort((a, b) => b.at - a.at).slice(0, MAX_RECORDS_PER_STEP).map((r) => r.id),
    );
    this.log = this.log.filter((r) => r.stepId !== stepId || keep.has(r.id));
  }
}
