/**
 * RecoveryEngine — orchestrates the USER-TRIGGERED Miss-Recovery loop (PRD, mock-first
 * slice): the user taps Postpone, says WHAT HAPPENED (a closed reason), and a rules
 * engine (config, not AI) maps the reason to LEVER(s) that change the next reminder /
 * plan, then logs the reason to the per-user history.
 *
 * It reads the two config registries (config/reasons.ts, config/levers.ts) and calls
 * the existing JourneyEngine + the reminder facade — event-driven and framework-free
 * (Engineering Bible §7/§19). It does NOT emit the reserved StepMissed keystone and
 * does NOT turn on `featureFlags.intervention` (that auto-miss engine is a later
 * slice). It never performs Grace-Token math — Cancel is FREE this slice (PRD §9).
 *
 * PRIVACY (G1): the free-text `note` (only for the `other` reason) is written to the
 * on-device ReasonEntry ONLY. It is NEVER copied into any DomainEvent, log line, or
 * Profiling signal — this engine keeps it out of every emit.
 *
 * Pure TS — no React, no vendor imports.
 */
import { resolveLever, resolveLevers } from '../config/levers';
import type { EventBus } from '../events/EventBus';
import type { JourneyEngine } from '../engines/JourneyEngine';
import type { CalendarGateway } from '../calendar/CalendarGateway';
import type { LocationGateway } from '../location/LocationGateway';
import type {
  AppState,
  LeverId,
  PostponeAction,
  ReasonEntry,
  ReasonId,
  ReasonOutcome,
  ReminderRule,
  ReminderTrigger,
} from '../types/domain';
import { createId } from '../util/id';
import { proposeCandidateTimes, type Candidate, type RescheduleEnv } from '../util/reschedule';

/** The narrow slice of the reminder facade the RecoveryEngine drives (reuses AppCore's). */
export interface ReminderMutations {
  listReminderRules(journeyId?: string): ReminderRule[];
  addReminderRule(input: {
    journeyId: string;
    trigger: ReminderTrigger;
    title: string;
    body: string;
    enabled?: boolean;
  }): Promise<ReminderRule>;
  updateReminderRule(
    id: string,
    changes: Partial<Pick<ReminderRule, 'trigger' | 'title' | 'body' | 'enabled'>>,
  ): Promise<ReminderRule | null>;
}

export interface SubmitReasonInput {
  journeyId: string;
  stepId: string;
  /** Screen-1 choice: keep-and-move (postpone) or let-this-occurrence-go (cancel). */
  action: PostponeAction;
  reasonId: ReasonId;
  /** Free text — ONLY for the `other` reason. Stays on-device (G1). */
  note?: string;
  /** Epoch ms the user confirmed in the propose-times sheet (Retime bundle). */
  chosenTime?: number;
}

/** Minutes before the chosen time to add an extra pre-event reminder (Re-frequency). */
const PRE_REMINDER_LEAD_MIN = 60;

export class RecoveryEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    private readonly journeys: JourneyEngine,
    private readonly reminders: ReminderMutations,
    private readonly location: LocationGateway,
    private readonly calendar: CalendarGateway,
  ) {}

  /**
   * Propose a few good reschedule times for a Step (Retime lever). Reads the Step +
   * the user's scheduling prefs and gates against the transient device env (location
   * / calendar-busy). Returns `[]` for a missing Step. The env reads are gating-only
   * and never persisted (G4).
   */
  proposeStepTimes(journeyId: string, stepId: string, now: number = Date.now()): Candidate[] {
    const step = this.findStep(journeyId, stepId);
    if (!step) return [];
    return proposeCandidateTimes(now, step, this.getState().schedulingPrefs, this.resolveEnv());
  }

  /** The Step's reason history, newest first (the "see past reasons" view). */
  getReasonHistory(stepId: string): ReasonEntry[] {
    return this.journeys.getReasonHistory(stepId);
  }

  /**
   * Record the OPTIONAL reason attached to a fast POSTPONE (Step Postponement, D37 §11.2). The
   * reason never forces or changes the schedule here — the per-occurrence one-shot is already
   * scheduled by AppCore.postponeStepReminder — so this only appends the on-device {@link ReasonEntry}
   * (with the reason's resolved lever ids for history fidelity, `action: 'postpone'`, outcome
   * `rescheduled`). The free-text `note` stays ON-DEVICE ONLY (G1) — never copied into any event.
   * Returns the recorded entry.
   */
  recordPostponeReason(
    journeyId: string,
    stepId: string,
    reasonId: ReasonId,
    note?: string,
  ): ReasonEntry {
    const entry: ReasonEntry = {
      id: createId('reason'),
      stepId,
      journeyId,
      reasonId,
      leverIds: resolveLevers(reasonId),
      outcome: 'rescheduled',
      at: Date.now(),
      action: 'postpone',
      ...(note ? { note } : {}),
    };
    this.journeys.recordReason(entry);
    return entry;
  }

  /**
   * Whether a reason should route through the propose-times step (the Retime lever) —
   * lets the UI branch to the reschedule sheet without knowing the lever rules
   * (config-before-code stays in core, not the screen).
   */
  needsReschedule(reasonId: ReasonId): boolean {
    return resolveLevers(reasonId).includes('retime');
  }

  /**
   * Run the recovery loop for one Step: apply the Screen-1 action, resolve the
   * reason's lever(s), execute the reminder-affecting / plan levers (log the deferred
   * ones), record exactly one ReasonEntry, and emit ReminderRescheduled iff the
   * schedule actually changed. Never copies `note` into any event (G1).
   */
  async submitReason(input: SubmitReasonInput): Promise<ReasonEntry> {
    const { journeyId, stepId, action, reasonId, note, chosenTime } = input;

    // Screen-1 action. Cancel is FREE — no Grace-Token cost, no token language.
    if (action === 'cancel') this.journeys.cancelStep(journeyId, stepId, reasonId);
    else this.journeys.postponeStep(journeyId, stepId);

    const leverIds = resolveLevers(reasonId);
    let outcome: ReasonOutcome = 'logged';
    let scheduleChanged = false;

    for (const leverId of leverIds) {
      const lever = resolveLever(leverId);
      if (!lever) continue;
      if (!lever.executesForReal) {
        // rally / reconnect_why — deferred pillars. Logged as "would do X" and still
        // recorded in ReasonEntry.leverIds; no reminder/plan change this slice.
        this.logPlaceholderLever(leverId, journeyId, stepId);
        continue;
      }
      switch (leverId) {
        case 'retime':
          if (chosenTime !== undefined) {
            if (action === 'postpone') {
              // SUPERSEDED for the postpone path (Step Postponement, D37 §11.4): per-occurrence
              // retiming is now a ONE-SHOT reminder for THIS occurrence, scheduled by
              // AppCore.postponeStepReminder — NOT a Journey-level reminder retime. So a postpone
              // no longer moves the whole Journey's recurring reminder here. `applyRetime` is
              // deliberately KEPT (not deleted — preserve the reasoning) for any NON-postpone
              // caller that still retimes the Journey reminder (below).
              outcome = 'rescheduled';
            } else {
              scheduleChanged = (await this.applyRetime(journeyId, stepId, chosenTime)) || scheduleChanged;
              outcome = 'rescheduled';
            }
          }
          break;
        case 'refrequency':
          if (chosenTime !== undefined) {
            scheduleChanged = (await this.applyPreReminder(journeyId, stepId, chosenTime)) || scheduleChanged;
            outcome = 'rescheduled';
          }
          break;
        case 'reshape':
          this.applyReshape(journeyId, stepId);
          outcome = 'edited';
          break;
        case 'grace':
          // Accept, no change — self-compassion.
          outcome = 'accepted';
          break;
        case 'mirror':
          // No schedule change — the "see past reasons" view is opened by the UI.
          break;
      }
    }

    // "Did it partially": record the partial progress on top of the reshape (a smaller
    // remainder). The partial outcome wins.
    if (reasonId === 'did_partially') {
      this.journeys.markPartial(journeyId, stepId);
      outcome = 'partial';
    }

    const entry: ReasonEntry = {
      id: createId('reason'),
      stepId,
      journeyId,
      reasonId,
      leverIds,
      outcome,
      at: Date.now(),
      // The Screen-1 action, so status derivation can read it back precisely (D36). Enum only.
      action,
      // G1: `note` lives ONLY on the on-device entry — never in an emitted event. The optional
      // `did_partially` (Partial) note rides the SAME on-device-only path as the `other` note.
      ...(note ? { note } : {}),
    };
    this.journeys.recordReason(entry);

    if (scheduleChanged) {
      // Ids + lever enums only — never the reason `note` (G1).
      this.bus.emit({ type: 'ReminderRescheduled', journeyId, stepId, leverIds });
    }
    return entry;
  }

  // ── Lever execution ────────────────────────────────────────────────────────

  /**
   * Retime: point the Journey's reminder at the chosen time (reminders are per-Journey
   * today — per-Step retiming is a later data-model change). Reuses the same rule if
   * one exists, else adds one. Reminder content is on-device only.
   */
  private async applyRetime(journeyId: string, stepId: string, when: number): Promise<boolean> {
    const trigger = this.triggerAt(when);
    const existing = this.reminders.listReminderRules(journeyId);
    if (existing.length > 0) {
      await this.reminders.updateReminderRule(existing[0].id, { trigger });
    } else {
      const { title, body } = this.reminderCopy(journeyId, stepId);
      await this.reminders.addReminderRule({ journeyId, trigger, title, body });
    }
    return true;
  }

  /**
   * Re-frequency ("Forgot" bundle): add ONE extra pre-event reminder ahead of the
   * chosen time. The scheduler's MAX_PENDING/SchedulerCapped protect against runaway.
   */
  private async applyPreReminder(journeyId: string, stepId: string, when: number): Promise<boolean> {
    const trigger = this.triggerAt(when - PRE_REMINDER_LEAD_MIN * 60 * 1000);
    const { title } = this.reminderCopy(journeyId, stepId);
    const step = this.findStep(journeyId, stepId);
    await this.reminders.addReminderRule({
      journeyId,
      trigger,
      title,
      body: step ? `Coming up soon: ${step.title}` : 'Coming up soon.',
    });
    return true;
  }

  /** Reshape: shrink the Step's expected duration by half (min 5 min), if it has one. */
  private applyReshape(journeyId: string, stepId: string): void {
    const step = this.findStep(journeyId, stepId);
    const current = step?.estimatedDuration;
    const changes = current ? { estimatedDuration: Math.max(5, Math.round(current / 2)) } : {};
    this.journeys.resizeStep(journeyId, stepId, changes);
  }

  /** Structured, dev-only log for a deferred (placeholder) lever. Never runs in prod. */
  private logPlaceholderLever(leverId: LeverId, journeyId: string, stepId: string): void {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[recovery] placeholder lever (deferred pillar, not executed):', {
        leverId,
        journeyId,
        stepId,
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Build a fixedTime trigger at the local wall-clock of an epoch ms. */
  private triggerAt(when: number): ReminderTrigger {
    const d = new Date(when);
    return { kind: 'fixedTime', hour: d.getHours(), minute: d.getMinutes() };
  }

  /** Default reminder copy for a Journey/Step (on-device only). */
  private reminderCopy(journeyId: string, stepId: string): { title: string; body: string } {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    const step = journey?.steps.find((s) => s.id === stepId);
    return {
      title: journey?.title ?? 'Your Journey',
      body: step ? `Time for: ${step.title}` : 'A gentle nudge from your Buddy.',
    };
  }

  /**
   * Resolve the transient device env for gating — permissive by default: the real
   * gateways return 'unknown' (never dropping a candidate); only the dev mock returns
   * a concrete home/away or busy/free. NEVER persisted or emitted (G4).
   */
  private resolveEnv(): RescheduleEnv {
    return {
      place: this.location.currentPlace?.() ?? 'unknown',
      isBusy: (window) => this.calendar.isBusy?.(window) ?? 'unknown',
    };
  }

  /** Find a Step within a Journey, or undefined. */
  private findStep(journeyId: string, stepId: string) {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    return journey?.steps.find((s) => s.id === stepId);
  }
}
