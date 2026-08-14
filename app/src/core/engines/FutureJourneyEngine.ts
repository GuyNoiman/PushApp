/**
 * FutureJourneyEngine — the CLOCK RECONCILER for Journeys saved for later (Future Journey
 * Management, §9). On a local lifecycle beat (AppCore.start / syncTime) it starts every SCHEDULED
 * Future Journey whose approved instant has arrived.
 *
 * It is deliberately shaped like the {@link InactivityEngine}: pure TS, `now` injected by the
 * caller, no timers of its own, and it does NOT write `status` itself — it drives the transition
 * through {@link JourneyEngine.activateJourney}, the single idempotent Future → Active path that
 * emits the one {@link JourneyActivated}. So there is no parallel state to keep in sync.
 *
 * RECONCILES rather than fires (§9): the tick asks "which Journeys should have started by now?"
 * against persisted state, so being offline, app-killed, or first opened long after the instant all
 * land the SAME single activation on the next beat — never a burst, never a double start.
 *
 * A MANUAL-start Future Journey (no `startsAt`) is never touched here: it activates only when the
 * user explicitly starts it (§5 — "Manual never activates from the clock").
 *
 * Pure TS — no React, no vendor imports, no clock reads of its own.
 */
import type { EventBus } from '../events/EventBus';
import type { AppState } from '../types/domain';
import type { JourneyEngine } from './JourneyEngine';

export class FutureJourneyEngine {
  /**
   * `bus` is held as the RESERVED seam only (same pattern as the ReminderEngine's): this engine
   * emits nothing itself today — the one `JourneyActivated` is emitted by the JourneyEngine, which
   * owns the transition — so there is exactly one producer of that event.
   */
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    private readonly journeyEngine: JourneyEngine,
  ) {}

  /**
   * Advance the Future-start clock to `now`, activating every scheduled Journey whose instant has
   * arrived (`now >= startsAt`).
   *
   * BLOCKED WHILE FROZEN AWAY: an UNRESOLVED account-inactivity cycle stops the sweep entirely
   * (Inactivity PRD §3.3) — a user returning after a long absence must not find plans that quietly
   * started without them. Their Future Journeys keep their Future state AND their planned start
   * (§4): nothing is written, so no per-Journey marker is needed — the account-level marker already
   * IS the record. Once the return is resolved the next tick activates whatever is due.
   *
   * Idempotent: the activation itself refuses on anything that is not `future`, so re-ticking the
   * same beat, or ticking after months away, activates each Journey exactly once.
   */
  tick(now: number): void {
    const state = this.getState();

    const inOpenFreeze = state.accountInactivity != null && !state.accountInactivity.resolved;
    if (inOpenFreeze) return;

    // Snapshot the due ids first: activation mutates the Journey in place, and reading the ids up
    // front keeps this loop independent of any ordering effect.
    const due = state.journeys
      .filter((j) => j.status === 'future' && j.startsAt != null && j.startsAt <= now)
      .map((j) => ({ id: j.id, startsAt: j.startsAt! }));

    for (const journey of due) {
      // Anchor on the APPROVED instant, not on `now`: the plan keeps the timeline the user agreed
      // to, and the existing recovery rules handle genuinely elapsed Steps (§9). Hence no rebase.
      this.journeyEngine.activateJourney(journey.id, journey.startsAt, { rebase: false });
    }
  }
}
