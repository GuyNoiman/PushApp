/**
 * goalSpecToJourney — the BRIDGE from the conversational coach's {@link GoalSpec} (what the
 * {@link ./CoachOrchestrator} interview PRODUCES) onto the deterministic planning path
 * (learning/{@link ../learning/Planner Planner} → {@link ../engines/JourneyEngine JourneyEngine}).
 *
 * TWO-LAYER coach: when the spec carries the ACTIVE EXPERT's interview {@link GoalSpec.answers}, this
 * builds the ANSWER-AWARE plan — {@link ../learning/DomainExpert DomainExpert.buildStructure} shapes
 * the Milestone + Step arc from the user's real baseline/choices, then the Planner lays it across the
 * REAL timeline honouring the constraints derived from those same answers (weekly availability from
 * the time question, plus any target date / preferred days / day-part). Without answers it falls back
 * to the generic {@link ../learning/Planner planJourney} path, so a legacy/partial spec still plans.
 *
 * Timing → constraints: `sessionMinutes × sessionsPerWeek` back-solves to
 * PlanConstraints.weeklyAvailabilityMinutes when the interview captured explicit timing; otherwise
 * the expert's `time`-intent answer maps to a weekly-minutes bucket. Day-part / preferred days /
 * target date map straight across. Missing scalars degrade to the Planner's permissive defaults.
 *
 * SECURITY-PRIVACY G1: the GoalSpec's `motivation` and `failureRisks` are ON-DEVICE-ONLY raw signal
 * and are DELIBERATELY NOT mapped into the GoalInput / PlanConstraints / Journey. The `answers` are
 * likewise on-device; only their coarse SCHEDULING signal (weekly minutes, etc.) crosses into the
 * plan — never the raw free-text of an "Other" answer.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { Journey } from '../types/domain';
import { isValidDreamTitle, type NewDreamInput } from '../dreams/dreams';
import { answerText, type DomainExpert, type InterviewAnswers } from '../learning/DomainExpert';
import { getExpert } from '../learning/experts/registry';
import { planJourney, planJourneyFromStructure, type PlanOptions } from '../learning/Planner';
import type { GoalInput, PlanConstraints } from '../learning/types';
import type { JourneyEngine, NewJourneyInput } from '../engines/JourneyEngine';
import type { GoalSpec } from './interviewPlaybook';

/** The deterministic Planner's two inputs, produced from one {@link GoalSpec}. */
export interface GoalPlanInputs {
  goal: GoalInput;
  constraints: PlanConstraints;
}

/** Representative weekly minutes for a 4-bucket `time`-intent question (index → minutes). */
const TIME_BUCKET_MINUTES = [30, 120, 240, 360] as const;

/**
 * Map a {@link GoalSpec} onto the Planner's ({@link GoalInput}, {@link PlanConstraints}) pair. PURE:
 * ON-DEVICE-ONLY motivation/failureRisks are intentionally left behind (G1). The `expert` (routed
 * from the spec's domain by default) lets the constraints read the interview's `time` answer.
 */
export function goalSpecToPlan(
  spec: GoalSpec,
  expert: DomainExpert = getExpert(spec.domain),
): GoalPlanInputs {
  const goal = goalInputFrom(spec);
  return { goal, constraints: deriveConstraints(spec, expert, goal) };
}

/** Build the {@link GoalInput} half of the plan from a spec (habit vs finite goal, description, pace). */
function goalInputFrom(spec: GoalSpec): GoalInput {
  // `fixed`/`recurring` are open-ended habits; `progressive`/`process`/`unknown` are finite goals.
  const isHabit = spec.processType === 'fixed' || spec.processType === 'recurring';
  return {
    title: spec.title,
    isHabit,
    ...(spec.description ? { description: spec.description } : {}),
    ...(spec.cadence ? { cadence: spec.cadence } : {}),
  };
}

/**
 * Derive the real-world {@link PlanConstraints} the Planner lays Steps within. Weekly availability
 * comes from explicit interview timing when present, else from the active expert's `time`-intent
 * answer bucket; day-part, preferred days and any target date map across from the captured timing.
 * Exported so the orchestrator can assess feasibility against the SAME constraints it will plan with.
 */
export function deriveConstraints(
  spec: GoalSpec,
  expert: DomainExpert = getExpert(spec.domain),
  goal: GoalInput = goalInputFrom(spec),
): PlanConstraints {
  return {
    weeklyAvailabilityMinutes: weeklyMinutes(spec, expert, goal),
    preferredDays: [...(spec.timing.preferredDays ?? [])],
    daypart: spec.timing.daypart ?? 'either',
    ...(spec.timing.targetDate != null ? { targetDate: spec.timing.targetDate } : {}),
  };
}

/**
 * Build the full {@link NewJourneyInput} for a {@link GoalSpec}. When the spec carries the active
 * expert's interview {@link GoalSpec.answers}, it builds the ANSWER-AWARE structure via
 * {@link DomainExpert.buildStructure} and schedules it with {@link planJourneyFromStructure};
 * otherwise it uses the generic {@link planJourney} path. The expert is ROUTED from `spec.domain` by
 * default (callers may override). Deterministic given the same spec, expert and `options.now`.
 */
export function buildJourneyInput(
  spec: GoalSpec,
  expert: DomainExpert = getExpert(spec.domain),
  options?: PlanOptions,
): NewJourneyInput {
  const goal = goalInputFrom(spec);
  const constraints = deriveConstraints(spec, expert, goal);

  if (hasAnswers(spec.answers) && expert.buildStructure) {
    const structure = expert.buildStructure(goal, spec.answers, constraints);
    return planJourneyFromStructure(goal, constraints, structure, options);
  }
  return planJourney(goal, constraints, expert, options);
}

/**
 * Create a real {@link Journey} from a {@link GoalSpec} through the {@link JourneyEngine} — the
 * one-call path from a finished interview to a live Journey (emits `JourneyCreated`). Reuses the
 * deterministic Planner via {@link buildJourneyInput}; no planning logic lives here.
 */
export function createJourneyFromGoalSpec(
  engine: JourneyEngine,
  spec: GoalSpec,
  expert: DomainExpert = getExpert(spec.domain),
  options?: PlanOptions,
): Journey {
  // Journey Support Circle (D2): the coach path marks the Journey `createdVia: 'coach'`, so it may
  // later offer the Companion bundle — its Step titles are coach-generated template text, never user
  // free text. A manually-created Journey (the wizard) carries `'manual'` and stays Companion-ineligible.
  return engine.createJourney({ ...buildJourneyInput(spec, expert, options), createdVia: 'coach' });
}

/**
 * The Dream signal the coach formulated for this Journey, or null when the conversation carried none
 * (Dream Management, D40). Validated by framework-free domain logic — a Dream with an empty/whitespace
 * title is treated as NO signal, so the Journey is created UNLINKED rather than tied to a junk Dream.
 * The caller (AppCore) turns a returned signal into a created-or-reused primary Dream link; raw model
 * text is never persisted directly.
 */
export function dreamSignalFromSpec(spec: GoalSpec): NewDreamInput | null {
  const dream = spec.dream;
  if (!dream || !isValidDreamTitle(dream.title)) return null;
  return { title: dream.title, ...(dream.why ? { why: dream.why } : {}) };
}

/** True when the spec carries at least one recorded interview answer. */
function hasAnswers(answers: InterviewAnswers | undefined): answers is InterviewAnswers {
  return !!answers && Object.keys(answers).length > 0;
}

/**
 * Weekly availability minutes for the plan. Explicit interview timing wins (session length ×
 * frequency); otherwise the active expert's `time`-intent answer maps to a bucket; otherwise 0 (the
 * Planner reads that as "one Step per preferred day"), so a partial interview never invents time.
 */
function weeklyMinutes(spec: GoalSpec, expert: DomainExpert, goal: GoalInput): number {
  const { sessionMinutes, sessionsPerWeek } = spec.timing;
  if (sessionMinutes != null && sessionsPerWeek != null) {
    return Math.max(0, sessionMinutes * sessionsPerWeek);
  }
  return weeklyFromAnswers(spec.answers, expert, goal) ?? 0;
}

/**
 * Map the active expert's `time`-intent answer to weekly minutes: a chosen bucket by its option
 * index, or a light parse of an "Other" free-text hours figure. Returns undefined when there is no
 * usable time signal, so the caller can fall back to 0.
 */
function weeklyFromAnswers(
  answers: InterviewAnswers | undefined,
  expert: DomainExpert,
  goal: GoalInput,
): number | undefined {
  if (!answers || !expert.interviewQuestions) return undefined;
  const timeQuestion = expert.interviewQuestions(goal).find((q) => q.intent === 'time');
  if (!timeQuestion) return undefined;

  const answer = answerText(answers[timeQuestion.id]);
  if (!answer) return undefined;

  const index = timeQuestion.options.indexOf(answer);
  if (index >= 0) return TIME_BUCKET_MINUTES[Math.min(index, TIME_BUCKET_MINUTES.length - 1)];

  // "Other" free text — light optional parse of an hours figure (e.g. "about 2 hours").
  const hours = parseHours(answer);
  return hours != null ? Math.round(hours * 60) : undefined;
}

/** Extract a leading hours figure from free text (e.g. "2h", "about 1.5 hours"); undefined if none. */
function parseHours(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  if (!match) return undefined;
  const hours = Number(match[1]);
  return Number.isFinite(hours) && hours > 0 ? hours : undefined;
}
