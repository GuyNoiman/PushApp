/**
 * Simulation — the headless rig that PROVES the adaptive coach's closed loop (S1.14). It wires the
 * REAL engines together over a fresh {@link EventBus} — {@link JourneyEngine} (user actions),
 * {@link BehaviorModelEngine} (learns from the outcome events + flags slips), the pure
 * {@link replan} + {@link applyReplan} (the coach's decisions), and the
 * {@link CommunicationScheduler} with a {@link MockReminderEngine} (where nudges land) — then
 * drives them with a VIRTUAL CLOCK advancing one day at a time for N weeks.
 *
 * The loop each day, in order:
 *   1. (on a weekly cadence, or the day after a slip) the coach RE-PLANS: derive the on-device
 *      InsightModel → `replan` → `applyReplan` enacts the per-Step changes through the engine, and
 *      the new nudge is pushed to the CommunicationScheduler → MockReminderEngine.
 *   2. the persona ACTS on the day's due Steps via the real JourneyEngine methods (checkIn /
 *      markPartial / cancel / skip) → real outcome events → the BehaviorModelEngine records them.
 *   3. the BehaviorModelEngine `tick`s at end of day, flagging any still-unmet elapsed Step as a
 *      slip (its StepMissed is captured into the trace).
 *
 * Determinism: the only randomness is the persona's seeded PRNG, and every clock the engines read
 * is the injected virtual clock — so a run is fully reproducible from (persona, seed, config). The
 * JourneyEngine's own `Date.now()` only stamps incidental fields (createdAt / lastCheckInAt) that
 * never feed the InsightModel or any assertion.
 *
 * Pure TypeScript rig — no React, no UI, no vendor imports (the ReminderEngine is mocked).
 */
import { defaultAdaptivePolicy, type AdaptivePolicy } from '../../config/adaptivePolicy';
import { NullCalendarGateway } from '../../calendar/CalendarGateway';
import { NullLocationGateway } from '../../location/LocationGateway';
import { CommunicationScheduler } from '../../engines/CommunicationScheduler';
import { JourneyEngine } from '../../engines/JourneyEngine';
import type { ReminderEngine } from '../../engines/ReminderEngine';
import { EventBus } from '../../events/EventBus';
import type { AppState, DayPart, Journey, ReminderTrigger } from '../../types/domain';
import { BehaviorModelEngine } from '../BehaviorModelEngine';
import { applyReplan } from '../applyReplan';
import { replan } from '../AdaptivePlanner';
import { DeterministicNarrator } from '../CoachNarrator';
import { GeneralExpert, type DomainExpert } from '../DomainExpert';
import { planJourney } from '../Planner';
import type { GoalInput, PlanConstraints, ReplanAdjustment } from '../types';
import { MockReminderEngine } from './MockReminderEngine';
import type { DayContext, Outcome, Persona } from './personas';
import { makeRng } from './personas';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local wall-clock hour a Step / nudge is placed at, by day-part (mirrors the planners). */
const DAYPART_HOUR: Record<DayPart, number> = { morning: 8, evening: 19, either: 12 };

/** Everything a single simulation run needs. */
export interface SimConfig {
  persona: Persona;
  goal: GoalInput;
  constraints: PlanConstraints;
  /** Local midnight (epoch ms) the run starts on. */
  now0: number;
  /** How many weeks to run (days = weeks × 7). */
  weeks: number;
  /** PRNG seed — the run is reproducible from this. */
  seed: number;
  policy?: AdaptivePolicy;
  expert?: DomainExpert;
  /** Re-plan every this-many days (default 7). */
  replanCadenceDays?: number;
  /** Also re-plan the day after any slip (default true). */
  replanOnSlip?: boolean;
  /** Hour of day the persona acts at (default the day-part hour). */
  actionHour?: number;
}

/** A snapshot of the on-device InsightModel, recorded after each day. */
export interface InsightSnapshot {
  slipRate: number;
  paceRatio: number;
  atRisk: boolean;
  preferredDaypart: DayPart;
  typicalSessionMinutes: number;
  reliabilityByMilestone: Record<string, number>;
}

/** One re-plan the coach performed, flattened for assertions/printing. */
export interface ReplanDecision {
  changed: boolean;
  adjustments: ReplanAdjustment[];
  atRisk: boolean;
  rescheduled: number;
  resized: number;
  removed: number;
  /** The new session lengths from resized adjustments (to see grow vs shrink at a glance). */
  resizedDurations: number[];
  nudgeDaypart: DayPart;
  nudgeDays: number[];
  nudgeExtra: boolean;
  narration: string;
  /** JS weekdays the CommunicationScheduler + MockReminderEngine actually scheduled a nudge on. */
  scheduledWeekdays: number[];
  /** True when a plain (every-day) nudge was scheduled. */
  scheduledDaily: boolean;
}

/** The trace of a single simulated day. */
export interface DayTrace {
  dayIndex: number;
  date: number;
  weekday: number;
  dueStepIds: string[];
  actions: { stepId: string; outcome: Outcome }[];
  /** Step ids the end-of-day slip detector flagged. */
  slips: string[];
  /** Present only on days the coach re-planned. */
  replan?: ReplanDecision;
  insight: InsightSnapshot;
}

/** The final state of one Step, for eyeballing the outcome. */
export interface StepState {
  stepId: string;
  milestoneId?: string;
  done: boolean;
  dropped: boolean;
  plannedFor?: number;
  estimatedDuration?: number;
  difficulty?: number;
}

/** The full, deterministic record of one simulation run — the object every assertion reads. */
export interface SimTrace {
  persona: string;
  journeyId: string;
  now0: number;
  totalDays: number;
  targetDate?: number;
  days: DayTrace[];
  // ── roll-ups (derived from `days`, kept here so assertions read cleanly) ──
  totalRescheduled: number;
  totalResized: number;
  totalRemoved: number;
  everReplanAtRisk: boolean;
  firstReplanAtRiskDay: number | null;
  everInsightAtRisk: boolean;
  firstInsightAtRiskDay: number | null;
  /** How many days the on-device model read at-risk (a "how rescued" gauge). */
  insightAtRiskDayCount: number;
  everNudgeExtra: boolean;
  finalProgress: number;
  completedAt: number | null;
  /** The simulation day the Journey first became fully complete, or null if it never did. */
  completedDayIndex: number | null;
  finalSteps: StepState[];
}

// ── Local date helpers (local wall-clock; mirror the planners) ──────────────────

function dayStartAt(now0: number, dayIndex: number): number {
  const d = new Date(now0);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayIndex).getTime();
}

function atHour(dayStart: number, hour: number): number {
  const d = new Date(dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour).getTime();
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** A minimal, valid AppState for the rig (mirrors the engine tests' builders). */
function freshState(): AppState {
  return {
    dreams: [],
    journeys: [],
    buddy: { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null },
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: {
      remindersEnabled: true,
      socialCheerEnabled: true,
      socialNudgeEnabled: true,
      locationOptIn: false,
      calendarOptIn: false,
    },
    schedulingPrefs: { window: undefined, dayPart: 'either', preferredDays: [] },
  };
}

/**
 * Run one full simulation and return its deterministic trace. Async only because the
 * CommunicationScheduler's apply path (→ MockReminderEngine) is async; there is no real I/O.
 */
export async function runSimulation(config: SimConfig): Promise<SimTrace> {
  const policy = config.policy ?? defaultAdaptivePolicy;
  const expert = config.expert ?? GeneralExpert;
  const cadence = config.replanCadenceDays ?? 7;
  const replanOnSlip = config.replanOnSlip ?? true;
  const actionHour = config.actionHour ?? DAYPART_HOUR[config.constraints.daypart];
  const rng = makeRng(config.seed);
  const narrator = new DeterministicNarrator();

  // The single virtual clock every engine reads (mutated as the day progresses).
  let clock = config.now0;

  const bus = new EventBus();
  const state = freshState();
  const journeyEngine = new JourneyEngine(bus, () => state);
  const model = new BehaviorModelEngine(bus, () => state, () => clock);
  const reminder = new MockReminderEngine();
  const scheduler = new CommunicationScheduler(
    bus,
    () => state,
    reminder as unknown as ReminderEngine,
    { location: NullLocationGateway, calendar: NullCalendarGateway },
    () => new Date(clock),
  );

  // Capture slips (only the end-of-day tick emits StepMissed).
  const slipBuffer: string[] = [];
  bus.on('StepMissed', (e) => slipBuffer.push(e.stepId));

  // 1. Build + create the Journey from the deterministic Planner (clock at start).
  const plan = planJourney(config.goal, config.constraints, expert, { now: config.now0 });
  const journey = journeyEngine.createJourney(plan);
  const journeyId = journey.id;

  // A single reminder rule for this Journey; its nudge target is rewritten on each re-plan.
  state.reminderRules.push({
    id: 'reminder_sim',
    journeyId,
    trigger: { kind: 'fixedTime', hour: actionHour, minute: 0 },
    title: 'Time for your Step',
    body: 'Your Journey is waiting.',
    enabled: true,
    scheduledNotificationIds: [],
  });

  const totalDays = config.weeks * 7;
  const days: DayTrace[] = [];
  let slippedPrevDay = false;
  let completedDayIndex: number | null = null;

  const live = (): Journey => state.journeys.find((j) => j.id === journeyId)!;

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const dayStart = dayStartAt(config.now0, dayIndex);
    const weekday = new Date(dayStart).getDay();

    // ── 1. Coach re-plan (weekly cadence, or the morning after a slip) ──
    let replanDecision: ReplanDecision | undefined;
    const replanDue =
      dayIndex > 0 &&
      !live().completedAt &&
      (dayIndex % cadence === 0 || (replanOnSlip && slippedPrevDay));
    if (replanDue) {
      clock = dayStart + 30 * 60 * 1000; // 00:30 — before the day's actions
      replanDecision = await doReplan();
    }

    // ── 2. The persona acts on the day's due Steps ──
    clock = atHour(dayStart, actionHour);
    const due = live().steps.filter(
      (s) => !s.done && !s.dropped && s.plannedFor != null && startOfDay(s.plannedFor) === dayStart,
    );
    const daysToDeadline =
      config.constraints.targetDate != null
        ? Math.floor((startOfDay(config.constraints.targetDate) - dayStart) / MS_PER_DAY)
        : null;
    const ctx: DayContext = { date: dayStart, weekday, dayIndex, totalDays, daysToDeadline };
    const actions: { stepId: string; outcome: Outcome }[] = [];
    for (const step of due) {
      const outcome = config.persona.decide(step, ctx, rng);
      applyOutcome(step.id, outcome);
      actions.push({ stepId: step.id, outcome });
    }
    if (completedDayIndex == null && live().completedAt != null) completedDayIndex = dayIndex;

    // ── 3. End-of-day slip detection ──
    slipBuffer.length = 0;
    clock = atHour(dayStart, 23);
    model.tick(clock);
    const slips = [...slipBuffer];
    slippedPrevDay = slips.length > 0;

    const insight = model.getInsights();
    days.push({
      dayIndex,
      date: dayStart,
      weekday,
      dueStepIds: due.map((s) => s.id),
      actions,
      slips,
      replan: replanDecision,
      insight: {
        slipRate: insight.slipRate,
        paceRatio: insight.paceRatio,
        atRisk: insight.atRisk,
        preferredDaypart: insight.preferredDaypart,
        typicalSessionMinutes: insight.typicalSessionMinutes,
        reliabilityByMilestone: { ...insight.reliabilityByMilestone },
      },
    });
  }

  return buildTrace();

  // ── Inner helpers (close over the rig) ────────────────────────────────────────

  function applyOutcome(stepId: string, outcome: Outcome): void {
    switch (outcome) {
      case 'done':
        journeyEngine.checkInStep(journeyId, stepId);
        break;
      case 'partial':
        journeyEngine.markPartial(journeyId, stepId);
        break;
      case 'couldnt':
        journeyEngine.cancelStep(journeyId, stepId, 'couldnt');
        break;
      case 'skip':
        // Do nothing — the end-of-day tick will flag the elapsed Step as a slip.
        break;
    }
  }

  async function doReplan(): Promise<ReplanDecision> {
    const jrn = live();
    const insight = model.getInsights();
    const result = replan(jrn, insight, config.constraints, policy, clock);
    applyReplan(journeyEngine, jrn, result);

    // Push the new nudge to the CommunicationScheduler, then apply through the mock engine.
    // The coach's NudgeHint (day-part + the weekdays the remaining Steps land on) becomes a
    // fixedTime reminder rule; an empty day list means "no specific day" (a plain daily).
    const trigger: ReminderTrigger = {
      kind: 'fixedTime',
      hour: DAYPART_HOUR[result.nudge.daypart],
      minute: 0,
      weekdays: result.nudge.days.length > 0 ? result.nudge.days : undefined,
    };
    const rule = state.reminderRules.find((r) => r.id === 'reminder_sim')!;
    rule.trigger = trigger;
    rule.enabled = !jrn.completedAt;
    await scheduler.reconcile();
    const scheduled = reminder.drain();

    const rescheduled = result.stepAdjustments.filter((a) => a.kind === 'rescheduled').length;
    const resizedAdj = result.stepAdjustments.filter((a) => a.kind === 'resized');
    const removed = result.stepAdjustments.filter((a) => a.kind === 'removed').length;
    const scheduledWeekdays = [
      ...new Set(scheduled.flatMap((s) => s.weekdays ?? [])),
    ].sort((a, b) => a - b);

    return {
      changed: result.changed,
      adjustments: result.adjustments,
      atRisk: result.atRisk,
      rescheduled,
      resized: resizedAdj.length,
      removed,
      resizedDurations: resizedAdj
        .map((a) => a.estimatedDuration)
        .filter((n): n is number => n != null),
      nudgeDaypart: result.nudge.daypart,
      nudgeDays: result.nudge.days,
      nudgeExtra: result.nudge.extra,
      narration: narrator.describeAdaptation(result, { journeyTitle: jrn.title }),
      scheduledWeekdays,
      scheduledDaily: scheduled.some((s) => s.weekdays == null || s.weekdays.length === 0),
    };
  }

  function buildTrace(): SimTrace {
    const jrn = live();
    const replans = days.map((d) => d.replan).filter((r): r is ReplanDecision => r != null);
    const firstReplanAtRiskDay =
      days.find((d) => d.replan?.atRisk)?.dayIndex ?? null;
    const firstInsightAtRiskDay = days.find((d) => d.insight.atRisk)?.dayIndex ?? null;
    return {
      persona: config.persona.name,
      journeyId,
      now0: config.now0,
      totalDays,
      targetDate: config.constraints.targetDate,
      days,
      totalRescheduled: replans.reduce((n, r) => n + r.rescheduled, 0),
      totalResized: replans.reduce((n, r) => n + r.resized, 0),
      totalRemoved: replans.reduce((n, r) => n + r.removed, 0),
      everReplanAtRisk: replans.some((r) => r.atRisk),
      firstReplanAtRiskDay,
      everInsightAtRisk: days.some((d) => d.insight.atRisk),
      firstInsightAtRiskDay,
      insightAtRiskDayCount: days.filter((d) => d.insight.atRisk).length,
      everNudgeExtra: replans.some((r) => r.nudgeExtra),
      finalProgress: journeyEngine.journeyProgress(journeyId),
      completedAt: jrn.completedAt ?? null,
      completedDayIndex,
      finalSteps: jrn.steps.map((s) => ({
        stepId: s.id,
        milestoneId: s.milestoneId,
        done: s.done,
        dropped: s.dropped ?? false,
        plannedFor: s.plannedFor,
        estimatedDuration: s.estimatedDuration,
        difficulty: s.difficulty,
      })),
    };
  }
}
