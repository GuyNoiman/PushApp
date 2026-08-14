/**
 * InactivityEngine — the LOCAL-FIRST POC of Account Inactivity Freeze (J5). It detects, on a local
 * lifecycle beat (AppCore.start / syncTime), that an authenticated user has been away for at least
 * the configured threshold (config/inactivityPolicy) and FREEZES their active Journeys so a returning
 * user is met with a calm "welcome back" rather than a wall of missed days.
 *
 * It does NOT invent a parallel state: freezing reuses the SAME J3 `status='frozen'` path via
 * {@link JourneyEngine.freezeJourney}, distinguished only by a `freezeReason='account_inactivity'`
 * provenance. A frozen Journey already fires no reminders, gets its postpone one-shots cancelled, and
 * is excluded from the adaptive loop + weekly review — all reused, nothing duplicated.
 *
 * The server-authoritative version (freezing while the app is closed, exact-time) is DEFERRED. This
 * engine only measures the elapsed gap on the next beat. Pure TS — no React, no vendor imports; `now`
 * is injected by the caller so behaviour is deterministic and testable.
 *
 * SECURITY-PRIVACY G1: the events it emits are SCALAR-ONLY (a timestamp + a plain count); no Journey
 * title, id list, or reason ever rides them.
 */
import type { EventBus } from '../events/EventBus';
import type { AppState } from '../types/domain';
import { isRunning } from '../util/journeyStatus';
import { INACTIVITY_POLICY } from '../config/inactivityPolicy';
import type { JourneyEngine } from './JourneyEngine';

export class InactivityEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    private readonly journeyEngine: JourneyEngine,
  ) {}

  /**
   * Advance the inactivity clock to `now`. Three outcomes:
   *
   *  1. FIRST SIGHT — no `lastAuthenticatedActivityAt` yet (fresh install / legacy snapshot): SEED it
   *     to `now` and return. Never freezes on first sight (grace).
   *  2. FREEZE — not inside an UNRESOLVED freeze cycle AND the gap since last activity is at least the
   *     threshold: freeze every started-active Journey (provenance `account_inactivity`), record a
   *     FRESH cycle (overwriting any prior resolved one so the account re-arms), and emit the
   *     scalar-only frozen/returned events. When nothing was actually frozen this cycle, the marker is
   *     recorded already `resolved` (there is nothing for the user to review, and it re-arms next gap).
   *  3. IDLE — otherwise (gap too small, or an UNRESOLVED cycle is already open): just refresh anchor.
   *
   * The anchor is refreshed to `now` at the end of EVERY non-first-sight tick. Idempotent WITHIN a
   * cycle: while an unresolved cycle is open a later tick never re-freezes or re-emits. Once that cycle
   * is RESOLVED (all away-frozen Journeys handled, or nothing to review) a subsequent ≥threshold gap
   * re-arms and freezes again — the freeze is per-absence, not once per account lifetime.
   */
  tick(now: number): void {
    const state = this.getState();

    // First sight: seed and bail — a legacy/fresh install must never freeze the instant it is seen.
    if (state.lastAuthenticatedActivityAt == null) {
      state.lastAuthenticatedActivityAt = now;
      return;
    }

    // Clamp a backward clock (device time moved back) to 0 so a negative gap can never freeze.
    const gap = Math.max(0, now - state.lastAuthenticatedActivityAt);

    // Only an UNRESOLVED cycle blocks a fresh sweep; a resolved one re-arms so a new absence freezes.
    const inOpenCycle = state.accountInactivity != null && !state.accountInactivity.resolved;
    if (!inOpenCycle && gap >= INACTIVITY_POLICY.thresholdMs) {
      // Only RUNNING Journeys are swept. A FUTURE Journey keeps its Future lifecycle state and its
      // planned start date rather than being converted into a Frozen one (Inactivity PRD §4) — the
      // `createdAt <= now` proxy that used to stand in for "already started" is gone with the
      // createdAt-derived Future bucket (Future Journey Management §3).
      const toFreeze = state.journeys.filter(isRunning);
      for (const journey of toFreeze) {
        this.journeyEngine.freezeJourney(journey.id, 'account_inactivity');
      }
      // Nothing was actually frozen ⇒ there is nothing for the user to review (even if a Future
      // Journey awaits — it is surfaced elsewhere), so resolve immediately. The marker is still
      // recorded (so an open-cycle tick is idempotent), and being resolved it re-arms on the next gap.
      const resolved = toFreeze.length === 0;
      state.accountInactivity = {
        frozenAt: now,
        returnedAt: now,
        ...(resolved ? { resolved: true } : {}),
      };
      this.bus.emit({ type: 'AccountInactivityFrozen', frozenAt: now, journeyCount: toFreeze.length });
      this.bus.emit({ type: 'AccountInactivityReturned', returnedAt: now });
    }

    state.lastAuthenticatedActivityAt = now;
  }
}
