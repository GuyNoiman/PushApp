/**
 * JourneyEngine — owns Journey + Step state and the check-in flow.
 * It emits events only; it performs NO reward or Buddy math (that belongs to
 * RewardEngine / BuddyEngine reacting to these events). Pure TS.
 *
 * Model (confirmed with founder 2026-07-14): a Journey holds a FINITE set of Steps
 * (a Journey lasts up to ~2 months, so the Steps are bounded). Each Step is completed
 * ONCE; every completion fires a small celebration (via `StepCheckedIn` → reward/Buddy
 * engines). The Journey completes when the LAST Step is done — i.e. every Step is done.
 * There is no per-Step auto-recurrence; recurring practice is expressed as multiple
 * planned Steps (future: the weekly-planning flow generates them).
 */
import type { EventBus } from '../events/EventBus';
import type {
  AppState,
  Cadence,
  Constraint,
  Journey,
  Milestone,
  ReasonEntry,
  ReasonId,
  Rhythm,
  Step,
} from '../types/domain';
import { createId } from '../util/id';
import type { JourneyEdit } from '../coach/journeyEdit';

/**
 * SECURITY-PRIVACY G5: cap the per-user reason log to a rolling window PER STEP so it
 * never grows unbounded on disk. Keep the most recent N entries for each Step; a
 * future Profiling layer may derive only coarse aggregates from this — never raw
 * records, and never the `note`.
 */
const MAX_REASONS_PER_STEP = 20;

export interface NewStepInput {
  title: string;
  description?: string;
  isStarterStep?: boolean;
  cadence?: Cadence;
  /** Optional expected length in minutes (Miss-Recovery: powers Reshape + slot fit). */
  estimatedDuration?: number;
  /** Optional gating constraints (Miss-Recovery: e.g. a home-only Step). */
  constraints?: Constraint[];
  /** Optional Planner schedule for this occurrence, epoch ms (adaptive coach, S1). */
  plannedFor?: number;
  /** Optional owning {@link Milestone} id (adaptive coach, S1). */
  milestoneId?: string;
  /** Optional relative difficulty 1..5 (adaptive coach, S1). */
  difficulty?: number;
}

export interface NewJourneyInput {
  title: string;
  description?: string;
  why: string[];
  durationDays: number;
  rhythm: Rhythm;
  steps: NewStepInput[];
  dreamId?: string;
  /** Optional ordered Milestones grouping the Steps (Planner output, S1). */
  milestones?: Milestone[];
  /** Weekly session target for a FREQUENCY-BASED plan (no fixed dates); undefined when Steps are dated. */
  sessionsPerWeek?: number;
}

/** A Step surfaced for action, paired with its Journey for display/context. */
export interface TodayStep {
  journeyId: string;
  journeyTitle: string;
  step: Step;
}

export class JourneyEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
  ) {}

  createJourney(input: NewJourneyInput): Journey {
    const now = Date.now();
    const steps: Step[] = input.steps.map((s) => this.makeStep(s));

    const journey: Journey = {
      id: createId('journey'),
      title: input.title,
      description: input.description,
      why: input.why,
      durationDays: input.durationDays,
      rhythm: input.rhythm,
      steps,
      createdAt: now,
      // A new Journey starts in progress. `status` is authoritative for the Journeys-tab
      // bucketing and for freeze/resume (J3); it is set explicitly from creation onward.
      status: 'active',
      dreamId: input.dreamId,
      ...(input.milestones !== undefined ? { milestones: input.milestones } : {}),
    };

    this.getState().journeys.push(journey);
    this.bus.emit({ type: 'JourneyCreated', journey });
    return journey;
  }

  /**
   * The SINGLE Step-construction path, shared by {@link createJourney} and {@link updateJourney}'s
   * addSteps — so a Step added later is built exactly like one created up front (fresh id, defaults,
   * optional metadata carried through). Pure builder: it does not touch state or emit.
   */
  private makeStep(s: NewStepInput): Step {
    return {
      id: createId('step'),
      title: s.title,
      description: s.description,
      isStarterStep: s.isStarterStep ?? false,
      cadence: s.cadence ?? 'once',
      done: false,
      ...(s.estimatedDuration !== undefined ? { estimatedDuration: s.estimatedDuration } : {}),
      ...(s.constraints !== undefined ? { constraints: s.constraints } : {}),
      ...(s.plannedFor !== undefined ? { plannedFor: s.plannedFor } : {}),
      ...(s.milestoneId !== undefined ? { milestoneId: s.milestoneId } : {}),
      ...(s.difficulty !== undefined ? { difficulty: s.difficulty } : {}),
    };
  }

  /**
   * Coach-led EDIT of an existing Journey (task J1). Applies a VALIDATED {@link JourneyEdit} in place,
   * preserving every Step's id, check-in history and the XP already earned. Returns the mutated Journey,
   * or null when the id is unknown OR the Journey is already completed (a completed Journey is not
   * editable — the UI hides the pencil, and this is the belt-and-braces guard).
   *
   * Order: scalars → edit Steps → remove Steps → add Steps. Step removal follows the founder's
   * drop-vs-splice rule: a Step that is `done` or carries check-in/reason HISTORY is marked
   * `dropped: true` (history is preserved, it simply leaves scope); a pristine, never-touched Step is
   * spliced out entirely. Cross-Journey / unknown Step ids in editSteps are ignored (the parser already
   * validates against this Journey, but the engine re-guards by only touching its own Steps).
   *
   * Emits {@link JourneyUpdated} carrying the Journey IN-PROCESS ONLY (like JourneyCreated); AppCore
   * persists + re-plans reminders off it. This never triggers the weekly review.
   */
  updateJourney(journeyId: string, edit: JourneyEdit): Journey | null {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey || journey.completedAt) return null;

    // Scalars — apply only the fields the validated edit carries.
    if (edit.title !== undefined) journey.title = edit.title;
    if (edit.why !== undefined) journey.why = edit.why;
    if (edit.rhythm !== undefined) journey.rhythm = edit.rhythm;
    if (edit.durationDays !== undefined) journey.durationDays = edit.durationDays;

    // Edit existing Steps by id (guard: only Steps that belong to THIS Journey).
    for (const change of edit.editSteps ?? []) {
      const step = journey.steps.find((s) => s.id === change.stepId);
      if (!step) continue;
      if (change.title !== undefined) step.title = change.title;
      if (change.description !== undefined) step.description = change.description;
      if (change.cadence !== undefined) step.cadence = change.cadence;
    }

    // Remove Steps: drop-preserve when there is history, splice when pristine.
    for (const stepId of edit.removeStepIds ?? []) {
      const step = journey.steps.find((s) => s.id === stepId);
      if (!step) continue;
      if (this.stepHasHistory(step)) {
        step.dropped = true; // keep the record; simply leave scope
      } else {
        journey.steps = journey.steps.filter((s) => s.id !== stepId);
      }
    }

    // Add new Steps through the shared builder.
    for (const add of edit.addSteps ?? []) {
      journey.steps.push(this.makeStep(add));
    }

    this.bus.emit({ type: 'JourneyUpdated', journey });
    return journey;
  }

  /**
   * Permanently delete/abandon a Journey and all its Steps (task J2) — a hard remove from AppState,
   * distinct from a Freeze/pause. Emits {@link JourneyDeleted} (id only) IN-PROCESS ONLY; AppCore
   * persists off it and re-plans reminders so the Journey's on-device notifications are cancelled.
   * Any orphaned on-device behaviorLog/reasonLog rows referencing removed Step ids are harmless raw
   * local logs. Returns whether a Journey was actually removed (false on an unknown id).
   */
  deleteJourney(journeyId: string): boolean {
    const journeys = this.getState().journeys;
    const index = journeys.findIndex((j) => j.id === journeyId);
    if (index === -1) return false;
    journeys.splice(index, 1);
    this.bus.emit({ type: 'JourneyDeleted', journeyId });
    return true;
  }

  /**
   * PAUSE a Journey (task J3) — flip its {@link Journey.status} to `frozen` without losing any
   * progress (Step ids / check-in history / XP all stay). A frozen Journey fires no reminders (the
   * CommunicationScheduler skips it) and reads as paused in the UI. No-op (returns null) for an
   * unknown id, an already-frozen Journey, or a completed one (nothing to pause). Emits
   * {@link JourneyFrozen}; AppCore persists + re-plans reminders off it.
   */
  freezeJourney(journeyId: string): Journey | null {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey || journey.completedAt || journey.status === 'frozen') return null;
    journey.status = 'frozen';
    this.bus.emit({ type: 'JourneyFrozen', journey });
    return journey;
  }

  /**
   * RESUME a frozen Journey (task J3) — flip its {@link Journey.status} back to `active` so it runs
   * and schedules reminders again. No-op (returns null) for an unknown id or a Journey that is not
   * currently frozen. Emits {@link JourneyResumed}; AppCore persists + re-plans reminders off it.
   */
  resumeJourney(journeyId: string): Journey | null {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey || journey.status !== 'frozen') return null;
    journey.status = 'active';
    this.bus.emit({ type: 'JourneyResumed', journey });
    return journey;
  }

  /**
   * Whether a Step carries HISTORY worth preserving on removal: it was completed, it was ever touched
   * (a check-in / partial set `lastCheckInAt`), or it has entries in the reason log. Such a Step is
   * dropped rather than spliced so its record survives.
   */
  private stepHasHistory(step: Step): boolean {
    if (step.done || step.lastCheckInAt !== undefined) return true;
    const log = this.getState().reasonLog ?? [];
    return log.some((e) => e.stepId === step.id);
  }

  /**
   * Check in on a Step: mark it done (one-shot), record a CheckIn, and emit
   * StepCheckedIn — the reward/Buddy engines turn that into the small per-Step
   * celebration. When every Step in the Journey is done, mark the Journey complete
   * and emit JourneyCompleted. No-op if the Journey/Step is missing or already done.
   */
  checkInStep(journeyId: string, stepId: string): void {
    const state = this.getState();
    const journey = state.journeys.find((j) => j.id === journeyId);
    if (!journey) return;
    const step = journey.steps.find((s) => s.id === stepId);
    if (!step || step.done) return;

    const now = Date.now();
    step.done = true;
    step.lastCheckInAt = now;

    const checkIn = { id: createId('checkin'), journeyId, stepId, at: now };
    state.checkIns.push(checkIn);
    this.bus.emit({ type: 'StepCheckedIn', journeyId, step, checkIn });

    // Finite Steps: the Journey completes when every non-dropped Step is done (a Step shed
    // by the adaptive coach is out of scope and never blocks completion).
    if (!journey.completedAt && journey.steps.every((s) => s.done || s.dropped)) {
      journey.completedAt = now;
      journey.status = 'completed';
      this.bus.emit({ type: 'JourneyCompleted', journey });
    }
  }

  /**
   * A Journey's completion ratio in [0,1] — done Steps over total Steps, or 0 when
   * the Journey is missing or has no Steps. The single source of this math (was
   * inlined in SocialProvider's progress publish): keeps engine logic out of the UI
   * (Engineering Bible §19).
   */
  journeyProgress(journeyId: string): number {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey) return 0;
    // Dropped Steps are out of scope: they count toward neither the numerator nor denominator.
    const inScope = journey.steps.filter((s) => !s.dropped);
    const total = inScope.length;
    if (total === 0) return 0;
    const done = inScope.filter((s) => s.done).length;
    return done / total;
  }

  // ── Miss-Recovery (user-triggered) ───────────────────────────────────────
  // Additive methods behind the Postpone loop. They emit ids/enums only (never the
  // reason `note`), perform NO Grace-Token math (Cancel is FREE this slice), and never
  // emit the reserved StepMissed keystone.

  /**
   * Postpone a Step: the user kept it and will move it. Emits StepPostponed; makes NO
   * `done` change. No-op if the Journey/Step is missing or already done.
   */
  postponeStep(journeyId: string, stepId: string): void {
    const step = this.findStep(journeyId, stepId);
    if (!step || step.done) return;
    this.bus.emit({ type: 'StepPostponed', journeyId, stepId });
  }

  /**
   * Let THIS occurrence of a Step go ("Not this time"). Emits StepCancelled with the
   * closed reason id only. Cancel is FREE — deliberately NO Grace-Token cost and no
   * token language (founder decision, PRD §9). Steps are one-shot with no occurrence
   * model yet, so the Step is left pending (the "let it go" is captured in the reason
   * log); a true occurrence/skip model is a later slice. No-op if the Step is missing.
   */
  cancelStep(journeyId: string, stepId: string, reasonId: ReasonId): void {
    const step = this.findStep(journeyId, stepId);
    if (!step) return;
    this.bus.emit({ type: 'StepCancelled', journeyId, stepId, reasonId });
  }

  /**
   * The SOLE writer of the per-user reason log. Appends the entry and applies the G5
   * rolling-window cap per Step. The caller (RecoveryEngine) always emits a
   * StepPostponed/StepCancelled alongside, which is what persists the new state.
   */
  recordReason(entry: ReasonEntry): void {
    const state = this.getState();
    if (!state.reasonLog) state.reasonLog = [];
    state.reasonLog.push(entry);
    this.capReasonLog(state, entry.stepId);
  }

  /**
   * The Step's reason history, newest first — the read model behind the user-facing
   * "see past reasons" view (internally the Mirror lever). Reflective, not a
   * scoreboard. Returns `[]` when the Step has no history.
   */
  getReasonHistory(stepId: string): ReasonEntry[] {
    const log = this.getState().reasonLog ?? [];
    return log.filter((e) => e.stepId === stepId).sort((a, b) => b.at - a.at);
  }

  /**
   * Record a PARTIAL check-in: the user did some of the Step. Touches the Step
   * (lastCheckInAt) but leaves it NOT done — a partial isn't a completion (no
   * celebration, no Journey completion). Emits StepPartial (ids only) so the
   * BehaviorModelEngine records the signal. No-op if the Step is missing or already done.
   */
  markPartial(journeyId: string, stepId: string): void {
    const step = this.findStep(journeyId, stepId);
    if (!step || step.done) return;
    step.lastCheckInAt = Date.now();
    this.bus.emit({ type: 'StepPartial', journeyId, stepId });
  }

  /**
   * Move a Step's scheduled occurrence — the Planner's retime lever. Updates
   * Step.plannedFor and emits PlanAdapted (ids + the new scalar timestamp only). No-op
   * if the Journey/Step is missing. Leaves `done` untouched.
   */
  rescheduleStep(journeyId: string, stepId: string, plannedFor: number): void {
    const step = this.findStep(journeyId, stepId);
    if (!step) return;
    step.plannedFor = plannedFor;
    this.bus.emit({ type: 'PlanAdapted', journeyId, stepId, plannedFor });
  }

  /**
   * Reshape a Step in place — the Reshape lever (resize/edit), also the AdaptivePlanner's
   * resize apply. Applies the given partial (e.g. a shrunk estimatedDuration, an eased
   * difficulty, an edited title). No-op if the Step is missing. True retire/archive of a
   * Step or Journey is a flagged follow-up.
   */
  resizeStep(
    journeyId: string,
    stepId: string,
    changes: Partial<Pick<Step, 'title' | 'description' | 'estimatedDuration' | 'difficulty'>>,
  ): void {
    const step = this.findStep(journeyId, stepId);
    if (!step) return;
    if (changes.title !== undefined) step.title = changes.title;
    if (changes.description !== undefined) step.description = changes.description;
    if (changes.estimatedDuration !== undefined) step.estimatedDuration = changes.estimatedDuration;
    if (changes.difficulty !== undefined) step.difficulty = changes.difficulty;
  }

  /**
   * Drop a remaining Step from scope — the AdaptivePlanner's load-shed lever, applied when a
   * deadline plan cannot be held after compression + shrinking. Marks the Step `dropped`
   * (excluded from completion, the actionable / week lists, progress, and slip detection) and
   * emits StepDropped (ids only). The Step is NOT deleted — history is preserved. No-op if the
   * Step is missing, already done, or already dropped.
   */
  dropStep(journeyId: string, stepId: string): void {
    const step = this.findStep(journeyId, stepId);
    if (!step || step.done || step.dropped) return;
    step.dropped = true;
    this.bus.emit({ type: 'StepDropped', journeyId, stepId });
  }

  /** Find a Step within a Journey, or undefined if either is missing. */
  private findStep(journeyId: string, stepId: string): Step | undefined {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    return journey?.steps.find((s) => s.id === stepId);
  }

  /** Trim the reason log so no Step keeps more than MAX_REASONS_PER_STEP entries (G5). */
  private capReasonLog(state: AppState, stepId: string): void {
    const log = state.reasonLog;
    if (!log) return;
    const forStep = log.filter((e) => e.stepId === stepId);
    if (forStep.length <= MAX_REASONS_PER_STEP) return;
    // Keep only the newest N for this Step; other Steps' entries are untouched.
    const keep = new Set(
      [...forStep].sort((a, b) => b.at - a.at).slice(0, MAX_REASONS_PER_STEP).map((e) => e.id),
    );
    state.reasonLog = log.filter((e) => e.stepId !== stepId || keep.has(e.id));
  }

  /** Steps the user can act on now: the not-yet-done Steps of active (incomplete) Journeys. */
  getTodaySteps(): TodayStep[] {
    const today: TodayStep[] = [];
    for (const journey of this.getState().journeys) {
      if (journey.completedAt) continue;
      for (const step of journey.steps) {
        if (!step.done && !step.dropped) {
          today.push({ journeyId: journey.id, journeyTitle: journey.title, step });
        }
      }
    }
    return today;
  }

  /**
   * Every Step of active (incomplete) Journeys — INCLUDING already-done ones —
   * for Home's "Week's steps" list. This is the display SUPERSET of getTodaySteps:
   * a checked-in Step stays in the list (the UI sinks it to the bottom, dimmed, with
   * a done indicator) instead of vanishing (Home_Screen.md: "Completed Steps move to
   * the bottom of the feed, shown disabled"). getTodaySteps() stays the "actionable"
   * subset that drives counts. No filtering by date yet — the domain Step has no
   * scheduled window (TODO: data model), so "week" mirrors getTodaySteps' scope.
   */
  getWeekSteps(): TodayStep[] {
    const week: TodayStep[] = [];
    for (const journey of this.getState().journeys) {
      if (journey.completedAt) continue;
      for (const step of journey.steps) {
        if (step.dropped) continue; // shed from scope — not shown in the week's steps.
        week.push({ journeyId: journey.id, journeyTitle: journey.title, step });
      }
    }
    return week;
  }
}
