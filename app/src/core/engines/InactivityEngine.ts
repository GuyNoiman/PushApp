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
 * ── THE SERVER IS AUTHORITATIVE NOW (2026-08-24) ───────────────────────────────────────────────
 *
 * The PRD asks for a server-side evaluator on authoritative server time (§2, §3, §10), and this used
 * to be the deferred half. It is not deferred any more: `migrations/0007_account_activity.sql` holds
 * the account's `last_active_at` and evaluates the freeze nightly, and {@link applyServerVerdict} is
 * where that verdict lands. What it replaces is the DEVICE CLOCK — the one input this engine cannot
 * trust, because a phone whose date is wrong (or simply travelled) would otherwise decide that
 * somebody had been away for a month.
 *
 * {@link tick} stays, and stays the fallback: with no session or no network there is no verdict to
 * apply, and measuring the gap locally is better than a returning user meeting a wall of missed days.
 * The two never fight — a verdict overwrites the anchor with the server's own timestamp.
 *
 * Pure TS — no React, no vendor imports; `now` and the verdict are injected by the caller, so
 * behaviour is deterministic and testable.
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

  /**
   * Apply the SERVER's account-lifecycle verdict.
   *
   * The server holds `last_active_at` on its own clock and decides the freeze on a schedule, so this
   * device does not have to be open at the moment the threshold passes — which is the whole reason
   * the PRD asks for a server-side evaluator rather than a foreground check.
   *
   * Two rules, and both are about not fighting the local engine:
   *  · the anchor is REPLACED by the server's timestamp, because that is the authoritative one;
   *  · the freeze is applied only when no unresolved cycle is already open, exactly as a local sweep
   *    would be — so a verdict that arrives twice (two launches, two devices) freezes once.
   *
   * A verdict with no `frozenAt` is not an instruction to unfreeze: returning is the user's move
   * (PRD §7 — a return never auto-resumes), and the Journeys they left frozen stay frozen until they
   * say otherwise.
   */
  applyServerVerdict(verdict: { lastActiveAt: number; frozenAt?: number }): void {
    const state = this.getState();
    state.lastAuthenticatedActivityAt = verdict.lastActiveAt;
    if (verdict.frozenAt === undefined) return;

    const inOpenCycle = state.accountInactivity != null && !state.accountInactivity.resolved;
    if (inOpenCycle) return;
    // Already handled: a cycle recorded at or after this freeze is this same freeze, seen again.
    if (state.accountInactivity && state.accountInactivity.frozenAt >= verdict.frozenAt) return;

    const toFreeze = state.journeys.filter(isRunning);
    for (const journey of toFreeze) {
      this.journeyEngine.freezeJourney(journey.id, 'account_inactivity');
    }
    const resolved = toFreeze.length === 0;
    state.accountInactivity = {
      frozenAt: verdict.frozenAt,
      returnedAt: verdict.lastActiveAt,
      ...(resolved ? { resolved: true } : {}),
    };
    this.bus.emit({
      type: 'AccountInactivityFrozen',
      frozenAt: verdict.frozenAt,
      journeyCount: toFreeze.length,
    });
    this.bus.emit({ type: 'AccountInactivityReturned', returnedAt: verdict.lastActiveAt });
  }
}
