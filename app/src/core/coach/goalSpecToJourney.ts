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
import type { Cadence, Journey, JourneyStart, ParkedGoal } from '../types/domain';
import { isValidDreamTitle, type NewDreamInput } from '../dreams/dreams';
import { answerText, type DomainExpert, type InterviewAnswers } from '../learning/DomainExpert';
import { getExpert } from '../learning/experts/registry';
import {
  planJourney,
  planJourneyFromStructure,
  RECURRING_DEFAULT_DAYS,
  type PlanOptions,
} from '../learning/Planner';
import { buildRecurringStructure, recurringOccurrences } from '../learning/library/buildRecurring';
import {
  DEFAULT_RECURRING_APPROACH,
  recurringSetupCount,
} from '../learning/library/recurringApproaches';
import { buildProcessStructure, type AuthoredArc } from '../learning/library/authoredArc';
import { journeyDefinition, RECURRING_GENERIC } from '../learning/library/definitions';
import type { LibraryRef } from '../learning/library/journeyDefinition';
import type { GoalInput, JourneyShape, PlanConstraints } from '../learning/types';
import type { JourneyEngine, NewJourneyInput } from '../engines/JourneyEngine';
import type { GoalSpec, ProcessType } from './interviewPlaybook';
import { horizonDays, HORIZON_QUESTION_ID } from './horizonQuestion';

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
    shape: shapeFrom(spec),
    ...(spec.description ? { description: spec.description } : {}),
    ...(spec.cadence ? { cadence: spec.cadence } : {}),
  };
}

/**
 * The plan {@link JourneyShape} for a spec — the single most consequential derivation in this file,
 * because it decides whether the user gets a Milestone arc or their own action repeated.
 *
 * The coach's understanding step already classifies the goal as a `recurring` habit or a staged
 * `process`, so this reads that classification rather than guessing from the text. The reason it
 * exists as its own function is the FALLBACK, which is where the judgement lives:
 *
 *  - `fixed` / `recurring` → recurring. Unambiguous.
 *  - `progressive` / `process` → process. Unambiguous.
 *  - `unknown` / `other` → the `cadence` hint decides: a goal the user gave a `daily` or `weekly`
 *    rhythm to is a repeated action whatever else went unsaid. With no cadence either, `process` —
 *    the conservative answer, because a staged plan for a repeated goal is merely wrong, while
 *    repeating a single Step for a goal that genuinely has stages would strand the user on the
 *    first one for two months.
 */
function shapeFrom(spec: GoalSpec): JourneyShape {
  return journeyShapeFor(spec.processType, spec.cadence);
}

/**
 * The same derivation, from the two fields it actually depends on — exported so the INTERVIEW can
 * know the shape at the moment the goal is understood, and ask the chosen Journey's own variant
 * question there (D62 §2). One derivation, two callers: a second copy would eventually disagree
 * about which shape a goal has, and the user would be asked a question about a Journey they were
 * not going to get.
 */
export function journeyShapeFor(processType: ProcessType, cadence?: Cadence): JourneyShape {
  if (processType === 'fixed' || processType === 'recurring') return 'recurring';
  if (processType === 'progressive' || processType === 'process') return 'process';
  return cadence === 'daily' || cadence === 'weekly' ? 'recurring' : 'process';
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

  // A RECURRING goal takes the shape path, BEFORE any expert is consulted for structure. This is
  // the protein-shake fix: the expert's staged content is the wrong answer for "drink a protein
  // shake daily" no matter how good the content is, because the goal has no stages. The expert
  // still routed the domain, still ran its interview, and still shaped the constraints above — it
  // is only the ARC that a recurring goal does not want.
  if (goal.shape === 'recurring') {
    // ONE length, used for both the number of repetitions and the Journey's own duration. Computing
    // it here and passing it down is what keeps them agreeing: the Planner would otherwise fall back
    // to its standing default and lay 30 days of Steps inside a 56-day Journey.
    const lengthDays = recurringLengthDays(spec, constraints, options);
    const structure = buildRecurringStructure({
      goal,
      approach: spec.approach,
      occurrences: recurringOccurrences({
        durationDays: lengthDays,
        preferredDays: constraints.preferredDays,
        // Read off the approach, never assumed: one added later with three setup Steps stays
        // correct without touching this call.
        setupStepCount: recurringSetupCount(spec.approach),
      }),
    });
    // PROVENANCE (D62): which Journey and which of its versions this plan came from. The matcher
    // fills it when it chooses; a spec that arrived with only an approach (or with none) is resolved
    // here, so every library-built plan is attributable and the version's rating is counted from the
    // same fact the plan was built from.
    const libraryRef = libraryRefFor(spec);
    return {
      ...planJourneyFromStructure(goal, constraints, structure, { ...options, durationDays: lengthDays }),
      ...(libraryRef ? { libraryRef } : {}),
    };
  }

  // A PROCESS goal the library was actually chosen for builds from the AUTHORED ARC — the partner's
  // Milestones and Steps, in the user's language — instead of from the expert's generic arc. This is
  // the last rung of the route the diagnosis opens: the matcher named a Journey, and this is where
  // that Journey's content reaches the person. Without it the twenty-seven authored Career Journeys
  // were selectable and still unbuildable, which is the state this file was in until 2026-08-24.
  const authored = authoredArcFor(spec);
  if (authored) {
    return {
      ...planJourneyFromStructure(goal, constraints, buildProcessStructure(authored), {
        ...options,
        ...(authored.suggestedDurationDays !== undefined
          ? { durationDays: authored.suggestedDurationDays }
          : {}),
      }),
      ...(spec.libraryRef ? { libraryRef: spec.libraryRef } : {}),
    };
  }

  if (hasAnswers(spec.answers) && expert.buildStructure) {
    const structure = expert.buildStructure(goal, spec.answers, constraints);
    return planJourneyFromStructure(goal, constraints, structure, options);
  }
  return planJourney(goal, constraints, expert, options);
}

/**
 * The authored arc this spec is being built from, or undefined.
 *
 * Resolved through the stamped {@link LibraryRef} rather than by re-deciding anything: the matcher
 * already chose, and a second decision here could disagree with the one whose provenance is on the
 * Journey. Undefined for every spec the library did not choose a process Journey for — which is most
 * of them, and is why the caller falls through to the expert's own arc.
 */
function authoredArcFor(spec: GoalSpec): AuthoredArc | undefined {
  const ref = spec.libraryRef;
  if (!ref) return undefined;
  const variant = journeyDefinition(ref.definitionId)?.variants.find((v) => v.id === ref.variantId);
  return variant?.build.kind === 'process' ? variant.build.arc : undefined;
}

/**
 * The {@link LibraryRef} to stamp on a recurring plan: what the matcher chose, or — for a spec built
 * without it — the version whose content is the approach the spec names. Resolved through the
 * Journey's declared variants rather than by assuming a variant id equals an approach id, so the two
 * may be renamed independently. Undefined when the approach matches no version, which is the honest
 * answer: an unattributable plan must not be credited to a version we did not build.
 */
function libraryRefFor(spec: GoalSpec): LibraryRef | undefined {
  if (spec.libraryRef) return spec.libraryRef;
  const approach = spec.approach ?? DEFAULT_RECURRING_APPROACH;
  const variant = RECURRING_GENERIC.variants.find(
    (v) => v.build.kind === 'recurring' && v.build.approach === approach,
  );
  return variant
    ? { definitionId: RECURRING_GENERIC.id, variantId: variant.id, version: RECURRING_GENERIC.version }
    : undefined;
}

/**
 * The length a recurring Journey is being planned for, used ONLY to decide how many repetitions to
 * mint. The Planner computes the Journey's real `durationDays` from the same two inputs, so the two
 * cannot disagree.
 */
function recurringLengthDays(
  spec: GoalSpec,
  constraints: PlanConstraints,
  options?: PlanOptions,
): number {
  // The user's OWN answer first. The coach now asks how long they want to give this, so the old
  // eight-week fallback is reached only by someone who chose "no fixed end" or skipped the
  // question — never by someone who was simply never asked (founder, 2026-08-18).
  const chosen = horizonDays(spec.answers?.[HORIZON_QUESTION_ID]);
  if (chosen != null) return chosen;
  if (constraints.targetDate != null) {
    const now = options?.now ?? Date.now();
    const days = Math.ceil((constraints.targetDate - now) / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, days);
  }
  return options?.durationDays ?? RECURRING_DEFAULT_DAYS;
}

/**
 * Create a real {@link Journey} from a {@link GoalSpec} through the {@link JourneyEngine} — the
 * one-call path from a finished interview to a live Journey (emits `JourneyCreated`). Reuses the
 * deterministic Planner via {@link buildJourneyInput}; no planning logic lives here.
 *
 * `start` is the mode chosen at final approval (Future Journey Management, §5): the default
 * `{ mode: 'now' }` creates it Active, while a `scheduled`/`manual` start routes to
 * {@link JourneyEngine.createFutureJourney} — which returns null when the Future list is at its cap
 * (§10). Routing only; the Planner's own timeline is decided by `options.now` (the caller passes the
 * intended start there for a scheduled Journey, so the plan lands on the real timeline).
 */
export function createJourneyFromGoalSpec(
  engine: JourneyEngine,
  spec: GoalSpec,
  expert: DomainExpert = getExpert(spec.domain),
  options?: PlanOptions,
  start: JourneyStart = { mode: 'now' },
): Journey | null {
  // Journey Support Circle (D2): the coach path marks the Journey `createdVia: 'coach'`, so it may
  // later offer the Companion bundle — its Step titles are coach-generated template text, never user
  // free text. A manually-created Journey (the wizard) carries `'manual'` and stays Companion-ineligible.
  const input = { ...buildJourneyInput(spec, expert, options), createdVia: 'coach' as const };
  if (start.mode === 'now') return engine.createJourney(input);
  return engine.createFutureJourney(input, start);
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

/**
 * Turn a durable {@link ../types/domain ParkedGoal} back into the MINIMAL {@link GoalSpec} needed to
 * build it (Parked/deferred goals, L1). It carries only what the understanding step knew — title,
 * domain and process shape — with empty milestones/failureRisks/timing, so {@link buildJourneyInput}
 * takes the generic {@link planJourney} fallback path (there are no interview answers to honour).
 * `isHabit` mirrors a `recurring` habit. PURE.
 */
export function parkedGoalToSpec(goal: ParkedGoal): GoalSpec {
  return {
    title: goal.title,
    domain: goal.domain,
    processType: goal.processType,
    isHabit: goal.processType === 'recurring',
    milestones: [],
    failureRisks: [],
    timing: {},
  };
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
