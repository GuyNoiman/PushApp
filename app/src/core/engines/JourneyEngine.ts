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
  Dream,
  FreezeReason,
  Journey,
  Milestone,
  ReasonEntry,
  ReasonId,
  Rhythm,
  Step,
} from '../types/domain';
import { createId } from '../util/id';
import type { JourneyEdit } from '../coach/journeyEdit';
import {
  findDreamByTitle,
  normalizeDreamTitle,
  normalizeDreamWhy,
  type NewDreamInput,
} from '../dreams/dreams';
import { deriveStepStatus, isTerminalReport, type StepStatus } from '../status/stepStatus';
import { isStepLocked, transitiveDependentsOf, validateDependency } from '../status/stepDependencies';
import { buildCompletionCard } from '../celebration/completionCard';

/**
 * SECURITY-PRIVACY G5: cap the per-user reason log to a rolling window PER STEP so it
 * never grows unbounded on disk. Keep the most recent N entries for each Step; a
 * future Profiling layer may derive only coarse aggregates from this — never raw
 * records, and never the `note`.
 */
const MAX_REASONS_PER_STEP = 20;

/** One calendar week in ms — the amount {@link JourneyEngine.deferDependents} shifts a slipped chain. */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Remove `id` from a Dream-links list, returning undefined when the result is empty so a Journey's
 * {@link Journey.secondaryDreamIds} never lingers as an empty array (Dream Management, D40).
 */
function dropId(ids: string[] | undefined, id: string): string[] | undefined {
  const next = (ids ?? []).filter((existing) => existing !== id);
  return next.length > 0 ? next : undefined;
}

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
  /**
   * POSITIONAL dependency for {@link createJourney} (Step Dependencies, linear): an index into the
   * SAME `input.steps[]`, which MUST be `< own index` (a Step may only depend on an earlier one).
   * Because a Step's `id` is minted in {@link makeStep}, a build-time dependency is expressed
   * positionally and RESOLVED to a real {@link Step.dependsOnStepId} after minting (dropped if it
   * fails {@link validateDependency}). Ignored by the addSteps edit path (which passes a resolved id).
   */
  dependsOnStepIndex?: number;
  /**
   * An ALREADY-RESOLVED predecessor id (Step Dependencies). Used by the addSteps edit path, which
   * already holds minted ids; {@link makeStep} carries it straight through. The creation path uses
   * {@link dependsOnStepIndex} instead (resolved positionally after minting).
   */
  dependsOnStepId?: string;
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
  /**
   * How this Journey was created (Journey Support Circle, D2) — see {@link Journey.createdVia}. Set by
   * the caller: the coach path passes `'coach'`, the manual wizard `'manual'`. Absent ⇒ the created
   * Journey carries no marker and is treated as `'manual'` (Companion-ineligible).
   */
  createdVia?: 'coach' | 'manual';
}

/** A Step surfaced for action, paired with its Journey for display/context. */
export interface TodayStep {
  journeyId: string;
  journeyTitle: string;
  step: Step;
  /** The DERIVED Daily-Reporting status (D36) — from `done`/`dropped` + the reasonLog + any clear. */
  status: StepStatus;
  /**
   * Whether this Step is LOCKED by an unmet dependency (Step Dependencies). Computed ONCE here via
   * {@link isStepLocked} so the UI reads a single source of truth. Always `false` in
   * {@link getTodaySteps} (locked Steps are excluded from the actionable subset); it is meaningful in
   * {@link getWeekSteps}, where a locked Step is KEPT but flagged so the UI can render + disable it.
   */
  locked: boolean;
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
      ...(input.createdVia !== undefined ? { createdVia: input.createdVia } : {}),
    };

    this.resolveDependencies(steps, input.steps, journey);

    this.getState().journeys.push(journey);
    this.bus.emit({ type: 'JourneyCreated', journey });
    return journey;
  }

  /**
   * Resolve each POSITIONAL {@link NewStepInput.dependsOnStepIndex} to the minted predecessor's real
   * {@link Step.dependsOnStepId}, then DROP any link that fails {@link validateDependency} (Step
   * Dependencies, linear). Fail-safe: an invalid reference (forward/self, cross-Milestone, a cycle, a
   * 4th link, or a second predecessor) is silently dropped so the Journey is always created with a
   * VALID dependency graph — never a broken one. Runs after all Steps are minted (ids exist) and the
   * Journey's Milestone data is in place (validation is Milestone-aware).
   */
  private resolveDependencies(steps: Step[], inputs: NewStepInput[], journey: Journey): void {
    inputs.forEach((input, index) => {
      const predecessorIndex = input.dependsOnStepIndex;
      // Positional guard: an index must point to an EARLIER Step in the same list.
      if (predecessorIndex == null) return;
      if (predecessorIndex < 0 || predecessorIndex >= index) return;
      const dependent = steps[index];
      const predecessor = steps[predecessorIndex];
      dependent.dependsOnStepId = predecessor.id;
      if (!validateDependency(dependent.id, predecessor.id, journey)) {
        // Invalid link — never persist it (fail-safe).
        delete dependent.dependsOnStepId;
      }
    });
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
      ...(s.dependsOnStepId !== undefined ? { dependsOnStepId: s.dependsOnStepId } : {}),
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
      // Dependency authoring (Step Dependencies): the parser validated it, but re-guard against the
      // LIVE Journey (defensive, mirrors resolveDependencies) before persisting the link.
      if (
        change.dependsOnStepId !== undefined &&
        validateDependency(step.id, change.dependsOnStepId, journey)
      ) {
        step.dependsOnStepId = change.dependsOnStepId;
      }
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

    // Unlink dangling dependents (Step Dependencies): any Step that pointed at a REMOVED predecessor
    // clears its `dependsOnStepId` and becomes a normal Step — never left stranded on a gone predecessor.
    for (const removedId of edit.removeStepIds ?? []) {
      for (const s of journey.steps) {
        if (s.dependsOnStepId === removedId) delete s.dependsOnStepId;
      }
    }

    // Add new Steps through the shared builder, then validate any dependency now that the id exists.
    for (const add of edit.addSteps ?? []) {
      const step = this.makeStep(add);
      journey.steps.push(step);
      // A newly-added Step's dependency can only be checked now (its id was just minted); drop it if
      // invalid (fail-safe, mirrors createJourney's resolveDependencies).
      if (
        step.dependsOnStepId !== undefined &&
        !validateDependency(step.id, step.dependsOnStepId, journey)
      ) {
        delete step.dependsOnStepId;
      }
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
   * PAUSE a Journey — flip its {@link Journey.status} to `frozen` without losing any progress (Step
   * ids / check-in history / XP all stay). A frozen Journey fires no reminders (the
   * CommunicationScheduler skips it) and reads as paused in the UI. No-op (returns null) for an
   * unknown id, an already-frozen Journey, or a completed one (nothing to pause). Emits
   * {@link JourneyFrozen}; AppCore persists + re-plans reminders off it.
   *
   * `reason` records PROVENANCE on the SAME frozen path (Account Inactivity Freeze, J5): the user
   * pause (task J3) passes the default `'manual'`; the {@link InactivityEngine} passes
   * `'account_inactivity'`. The default keeps every existing caller/test unchanged.
   */
  freezeJourney(journeyId: string, reason: FreezeReason = 'manual'): Journey | null {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey || journey.completedAt || journey.status === 'frozen') return null;
    journey.status = 'frozen';
    journey.freezeReason = reason;
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
    // Clear the freeze provenance (J5) so a later manual pause / inactivity freeze starts clean.
    journey.freezeReason = undefined;
    this.bus.emit({ type: 'JourneyResumed', journey });
    return journey;
  }

  // ── Dreams (Dream Management, D40 — coach-owned Dream layer) ────────────────
  // The Journey↔Dream relationship is authoritative on the JOURNEY side (dreamId = primary +
  // secondaryDreamIds). A Dream holds no back-reference; its Journeys are derived on read
  // (core/dreams/dreams). These methods apply atomically on-device and emit id/boolean-only events
  // (the Dream title/why is private on-device data — G1/G2). Linking/unlinking NEVER edits a
  // Journey's Steps, schedule, or status (PRD §6/§9). There is NO user-approval gate (D40).

  /**
   * Create a Dream from validated coach output (Dream Management, D40). The title is normalized +
   * length-capped and must be non-empty; an optional `why` is stored as {@link Dream.description}.
   * Emits {@link DreamCreated} (id only). Returns the Dream, or null when the title is empty after
   * normalization (fail-safe — the UI never persists free-form model text).
   */
  createDream(input: NewDreamInput): Dream | null {
    const title = normalizeDreamTitle(input.title);
    if (!title) return null;
    const why = input.why ? normalizeDreamWhy(input.why) : '';
    const dream: Dream = { id: createId('dream'), title, ...(why ? { description: why } : {}) };
    this.getState().dreams.push(dream);
    this.bus.emit({ type: 'DreamCreated', dreamId: dream.id });
    return dream;
  }

  /**
   * Create a Dream, or REUSE an existing one whose normalized title matches (case-insensitive), so
   * the coach never mints a duplicate Dream for the same aspiration. Returns the new/existing Dream,
   * or null when the title is empty after normalization.
   */
  createOrReuseDream(input: NewDreamInput): Dream | null {
    const title = normalizeDreamTitle(input.title);
    if (!title) return null;
    const existing = findDreamByTitle(this.getState().dreams, title);
    return existing ?? this.createDream(input);
  }

  /**
   * Link a Journey to a Dream (Dream Management, D40). `primary: true` sets the deterministic PRIMARY
   * relationship — any current primary is DEMOTED to a secondary (the link is preserved, never lost);
   * `primary: false` adds a secondary relationship. Duplicate links are impossible (a Dream is never
   * both primary and secondary for the same Journey, and never listed twice as a secondary). Fails
   * safely (returns false, no event) on an unknown Journey/Dream or a no-op re-link, so a corrupt id
   * can't create a dangling relationship. Emits {@link JourneyDreamLinked}. NEVER edits Steps/schedule.
   */
  linkJourneyToDream(journeyId: string, dreamId: string, opts: { primary: boolean }): boolean {
    const state = this.getState();
    const journey = state.journeys.find((j) => j.id === journeyId);
    if (!journey) return false;
    // Unknown Dream id fails safe (§9: unknown/missing linked IDs must not create a bad link).
    if (!state.dreams.some((d) => d.id === dreamId)) return false;

    if (opts.primary) {
      if (journey.dreamId === dreamId) return false; // already the primary — no-op
      // Demote the outgoing primary to a secondary so its relationship survives (many-to-many target).
      if (journey.dreamId) {
        const secondary = journey.secondaryDreamIds ?? [];
        if (!secondary.includes(journey.dreamId)) secondary.push(journey.dreamId);
        journey.secondaryDreamIds = secondary;
      }
      // The new primary can never also be a secondary (no duplicate link).
      journey.secondaryDreamIds = dropId(journey.secondaryDreamIds, dreamId);
      journey.dreamId = dreamId;
    } else {
      if (journey.dreamId === dreamId) return false; // already the primary — never dup as secondary
      if (journey.secondaryDreamIds?.includes(dreamId)) return false; // already a secondary — no dup
      journey.secondaryDreamIds = [...(journey.secondaryDreamIds ?? []), dreamId];
    }

    this.bus.emit({ type: 'JourneyDreamLinked', journeyId, dreamId, primary: opts.primary });
    return true;
  }

  /**
   * Remove a Journey↔Dream relationship (Dream Management, D40). Unlinking the PRIMARY promotes the
   * first secondary to primary when one exists (keeping the Journey linked deterministically), else
   * clears the primary so the Journey becomes unlinked (allowed — linking is not a hard gate). The
   * Journey itself is NEVER deleted or edited (PRD §9). No-op (returns false) when the Journey is
   * unknown or not linked to that Dream. Emits {@link JourneyDreamUnlinked}.
   */
  unlinkJourneyFromDream(journeyId: string, dreamId: string): boolean {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey) return false;

    let changed = false;
    if (journey.dreamId === dreamId) {
      const secondary = journey.secondaryDreamIds ?? [];
      journey.dreamId = secondary[0]; // promote the first secondary, or undefined when there is none
      journey.secondaryDreamIds = secondary.length > 1 ? secondary.slice(1) : undefined;
      changed = true;
    } else if (journey.secondaryDreamIds?.includes(dreamId)) {
      journey.secondaryDreamIds = dropId(journey.secondaryDreamIds, dreamId);
      changed = true;
    }

    if (changed) this.bus.emit({ type: 'JourneyDreamUnlinked', journeyId, dreamId });
    return changed;
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

    // Idempotent rewards (D36): the FIRST check-in of this Step is the only one the RewardEngine
    // pays out. A re-completion after a reverseReport keeps its prior CheckIn rows, so a matching
    // stepId already in the log marks this as a repeat (no XP twice, no clawback).
    const firstCompletion = !state.checkIns.some((c) => c.stepId === stepId);

    const now = Date.now();
    step.done = true;
    step.lastCheckInAt = now;

    const checkIn = { id: createId('checkin'), journeyId, stepId, at: now };
    state.checkIns.push(checkIn);
    this.bus.emit({ type: 'StepCheckedIn', journeyId, step, checkIn, firstCompletion });

    // Finite Steps: the Journey completes when every non-dropped Step is done (a Step shed
    // by the adaptive coach is out of scope and never blocks completion).
    if (!journey.completedAt && journey.steps.every((s) => s.done || s.dropped)) {
      // The completion reward is paid ONCE (D36): completionRewarded latches true on first
      // completion and is never cleared, so a reversal + re-completion pays nothing again.
      const firstJourneyCompletion = !journey.completionRewarded;
      journey.completionRewarded = true;
      journey.completedAt = now;
      journey.status = 'completed';
      // Completion Celebration (I1): mint the durable completion card ONCE, latched like
      // completionRewarded (guarded by `!completionCard`) so a reversal + re-completion — or a
      // rapid duplicate check-in — never rebuilds or overwrites it. Safe fields only (the builder
      // copies no report/why/note/Dream/Ally data).
      if (!journey.completionCard) {
        journey.completionCard = buildCompletionCard(journey, now);
      }
      this.bus.emit({ type: 'JourneyCompleted', journey, firstCompletion: firstJourneyCompletion });
    }
  }

  /**
   * PURE selector (Completion Celebration, I1): would checking in `stepId` complete the Journey —
   * i.e. is this the LAST required Step? True iff every OTHER non-dropped Step is already done.
   * Mutates nothing (safe to call during render, e.g. to gate the "you complete the Journey" final
   * confirmation). Returns false for an unknown Journey/Step, an already-completed Journey, or a
   * Step that is already done or dropped (checking it in would change nothing).
   */
  willCompleteJourney(journeyId: string, stepId: string): boolean {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey) return false;
    if (journey.status === 'completed' || journey.completedAt !== undefined) return false;
    const step = journey.steps.find((s) => s.id === stepId);
    if (!step || step.done || step.dropped) return false;
    // The target Step counts as done; every other in-scope Step must already be done.
    return journey.steps.every((s) => s.dropped || s.done || s.id === stepId);
  }

  /**
   * Reverse a Step's report — the open-week "un-report" path (Daily Step Reporting, D36). Moves the
   * Step back out of a terminal status: clears the completion (`done=false`, drops `lastCheckInAt`)
   * and stamps {@link Step.lastReportClearedAt} = now so {@link deriveStepStatus} supersedes any
   * earlier terminal `reasonLog` row. History is PRESERVED — prior CheckIn and reason rows are kept,
   * and there is NO XP clawback ({@link Journey.completionRewarded} stays latched, so a later
   * re-completion pays nothing again). If the reversal un-completes an auto-completed Journey (it is
   * no longer all-done), the Journey is REOPENED (`completedAt` cleared, `status` back to `active`)
   * so it runs and schedules reminders again. Emits {@link StepReportReversed} (ids/booleans only).
   * No-op (returns false) if the Journey/Step is missing.
   */
  reverseReport(journeyId: string, stepId: string): boolean {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey) return false;
    const step = journey.steps.find((s) => s.id === stepId);
    if (!step) return false;

    // Completion is FINAL (I1 / D32): once a Journey is completed its reports are locked — a
    // report reversal can never un-complete it. In-week corrections apply to ACTIVE Journeys
    // only; a completed Journey may be deleted (J2) but never reopened.
    if (journey.status === 'completed' || journey.completedAt !== undefined) return false;

    step.done = false;
    step.lastCheckInAt = undefined;
    step.lastReportClearedAt = Date.now();

    this.bus.emit({ type: 'StepReportReversed', journeyId, stepId, reopenedJourney: false });
    return true;
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
   * Postpone a Step: the user kept it and will move it (Step Postponement, D37). Stamps the
   * per-occurrence postpone fields — `postponedAt = now`, an incremented `postponeCount`, and the
   * resolved `postponedUntil` when `opts.postponedUntil` is given (the OS one-shot is scheduled by
   * AppCore and its id set via {@link setStepPostponeNotificationId}). "Postponed" is an ACTION,
   * not a status (D37.1) — `done` is untouched and the Step stays `unreported`. Emits StepPostponed
   * with SCALARS ONLY (never a reason `note`, G1). Returns whether it acted — `false` (a no-op) if
   * the Journey/Step is missing or already done, so a caller (AppCore) can bail before scheduling a
   * one-shot for a Step that was never actually postponed.
   */
  postponeStep(journeyId: string, stepId: string, opts?: { postponedUntil?: number }): boolean {
    const step = this.findStep(journeyId, stepId);
    if (!step || step.done) return false;
    if (opts?.postponedUntil !== undefined) step.postponedUntil = opts.postponedUntil;
    step.postponedAt = Date.now();
    step.postponeCount = (step.postponeCount ?? 0) + 1;
    this.bus.emit({
      type: 'StepPostponed',
      journeyId,
      stepId,
      ...(step.postponedUntil !== undefined ? { postponedUntil: step.postponedUntil } : {}),
      postponeCount: step.postponeCount,
    });
    return true;
  }

  /**
   * Record the OS notification id of a Step's pending postpone one-shot (Step Postponement, D37),
   * so AppCore can cancel it on re-postpone or on any final report. Pass `undefined` to clear it
   * (e.g. permission was off, so nothing was scheduled). Pure field-writer — emits NO event;
   * AppCore persists off the surrounding StepPostponed. No-op if the Journey/Step is missing.
   */
  setStepPostponeNotificationId(journeyId: string, stepId: string, notificationId?: string): void {
    const step = this.findStep(journeyId, stepId);
    if (!step) return;
    step.postponeNotificationId = notificationId;
  }

  /**
   * Clear ALL four per-occurrence postpone fields (Step Postponement, D37) — called when the
   * occurrence gets a FINAL report (Done/Partial/Couldn't) or its Journey is frozen/completed/
   * deleted, so no stale "postponed to <time>" affordance or count lingers. Pure field-writer —
   * emits NO event; AppCore persists off the surrounding event. Returns whether anything actually
   * changed (so a caller can skip a redundant save). No-op (returns false) if the Step is missing.
   */
  clearStepPostpone(journeyId: string, stepId: string): boolean {
    const step = this.findStep(journeyId, stepId);
    if (!step) return false;
    const had =
      step.postponedUntil !== undefined ||
      step.postponeCount !== undefined ||
      step.postponedAt !== undefined ||
      step.postponeNotificationId !== undefined;
    step.postponedUntil = undefined;
    step.postponeCount = undefined;
    step.postponedAt = undefined;
    step.postponeNotificationId = undefined;
    return had;
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

  /**
   * Defer a slipped predecessor AND its whole DEPENDENT chain forward by one week (Step Dependencies).
   * When a predecessor is reported not-done, it must re-appear ACTIONABLE next week WITH its chain —
   * otherwise next week it sits in a now-closed, read-only week, can never be completed, its dependent
   * never unlocks, and the Journey becomes uncompletable (the dead-end the fail-open rule exists to
   * prevent). So we move the predecessor +1 week too, then every Step that transitively depends on it,
   * all through the SAME {@link rescheduleStep} seam (emitting PlanAdapted per Step) so relative order
   * is preserved. A Step with no schedule (`plannedFor` absent) is left as-is — nothing to move; that
   * (even-spread) case relies on the display-pull in computeWeekLayout to re-surface it. No-op for an
   * unknown Journey/Step, or when nothing depends on the predecessor (no chain to defer).
   */
  deferDependents(journeyId: string, predecessorStepId: string): void {
    const journey = this.getState().journeys.find((j) => j.id === journeyId);
    if (!journey) return;
    const predecessor = journey.steps.find((s) => s.id === predecessorStepId);
    if (!predecessor) return;
    const dependents = transitiveDependentsOf(predecessor, journey);
    if (dependents.length === 0) return; // nothing depends on it → leave the predecessor put
    // Move the predecessor forward too, so it re-appears reachable next week ahead of its chain.
    if (predecessor.plannedFor != null) {
      this.rescheduleStep(journeyId, predecessor.id, predecessor.plannedFor + ONE_WEEK_MS);
    }
    for (const dependent of dependents) {
      if (dependent.plannedFor != null) {
        this.rescheduleStep(journeyId, dependent.id, dependent.plannedFor + ONE_WEEK_MS);
      }
    }
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
    // Keep the newest N for this Step; other Steps' entries are untouched.
    const byRecency = [...forStep].sort((a, b) => b.at - a.at);
    const keep = new Set(byRecency.slice(0, MAX_REASONS_PER_STEP).map((e) => e.id));
    // ALWAYS retain the newest TERMINAL report (Partial / let-go), even if a burst of later
    // postpones pushed it past the window — otherwise capping would silently revert the derived
    // status to `unreported` (D36). This may keep one row beyond the cap, which is intended.
    const terminal = byRecency.find(isTerminalReport);
    if (terminal) keep.add(terminal.id);
    state.reasonLog = log.filter((e) => e.stepId !== stepId || keep.has(e.id));
  }

  /**
   * Steps the user can act on now: the not-yet-done Steps of active (incomplete) Journeys. A Step
   * LOCKED by an unmet dependency (Step Dependencies) is EXCLUDED — the actionable "today" subset must
   * never include a Step the user cannot do yet (its predecessor is still open).
   */
  getTodaySteps(): TodayStep[] {
    const state = this.getState();
    const reasonLog = state.reasonLog ?? [];
    const today: TodayStep[] = [];
    for (const journey of state.journeys) {
      if (journey.completedAt) continue;
      for (const step of journey.steps) {
        if (!step.done && !step.dropped && !isStepLocked(step, journey, reasonLog)) {
          today.push({
            journeyId: journey.id,
            journeyTitle: journey.title,
            step,
            status: deriveStepStatus(step, reasonLog),
            locked: false,
          });
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
    const state = this.getState();
    const reasonLog = state.reasonLog ?? [];
    const week: TodayStep[] = [];
    for (const journey of state.journeys) {
      if (journey.completedAt) continue;
      for (const step of journey.steps) {
        if (step.dropped) continue; // shed from scope — not shown in the week's steps.
        // A locked Step (Step Dependencies) is KEPT here but flagged so the UI can render it disabled.
        week.push({
          journeyId: journey.id,
          journeyTitle: journey.title,
          step,
          status: deriveStepStatus(step, reasonLog),
          locked: isStepLocked(step, journey, reasonLog),
        });
      }
    }
    return week;
  }
}
