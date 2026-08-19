/**
 * DomainExpert — the plug-in seam that supplies DOMAIN KNOWLEDGE to the otherwise
 * domain-ignorant {@link Planner} (adaptive coach, S1). An expert proposes the Milestones a
 * goal breaks into and the Step templates inside each Milestone; the Planner stays generic
 * and only lays those Steps across the calendar. Future experts (a running coach, a
 * certification-prep expert, …) implement this same interface without touching the Planner.
 *
 * NO LLM: this seam is deliberately a plain interface backed by config/rules. An expert may
 * later be LLM-assisted, but the CONTRACT (deterministic in → deterministic out) stays.
 *
 * LANGUAGE (C-Lang-1): the default {@link GeneralExpert}'s user-facing interview copy (its question
 * prompts, closed-option labels and feasibility notes) is resolved from the `coachContent` i18n
 * namespace so the coach SPEAKS the user's language. The option list an answer is later matched
 * against comes from the SAME source, so the exact-string level/feasibility matching stays intact.
 *
 * Pure TypeScript — no React hooks, no UI, no vendor SDKs (the i18next core instance is framework-free).
 */
import i18n from '../../i18n';
import { addressContext } from '../../i18n/addressForm';
import type { GoalInput, PlanConstraints } from './types';

/** Resolve a `coachContent` string in the user's ACTIVE language + form of address (i18next core — no React, D31). */
const cc = (key: string): string => i18n.t(key, { ns: 'coachContent', context: addressContext() });
/** Resolve a `coachContent` OPTIONS array in the active language + form of address, as a FRESH (mutation-safe) copy. */
const ccOptions = (key: string): string[] => [
  ...(i18n.t(key, { ns: 'coachContent', returnObjects: true, context: addressContext() }) as unknown as string[]),
];

/** A Milestone the expert proposes, before the Planner materializes it (assigns id + order). */
export interface ProposedMilestone {
  title: string;
  /** Optional relative effort/importance weight (the Planner uses it to size the arc). */
  weight?: number;
}

/** A Step the expert proposes inside a Milestone, before the Planner schedules it. */
export interface StepTemplate {
  title: string;
  /** Expected length in minutes — the Planner packs Steps into weekly availability by this. */
  estimatedMinutes: number;
  /** Relative difficulty 1..5. */
  difficulty: number;
  /**
   * The short "what this actually means" line under the title. Optional: an expert's own arc titles
   * are self-explanatory and carry none, while an authored library arc
   * (`./library/authoredArc`) almost always does — the description is where the content
   * says what counts as having done the Step, which is exactly what stops a staged plan from
   * reading as a list of slogans.
   */
  description?: string;
  /**
   * The template's own id inside the structure it came from. Present only when something needs to
   * REFER to this template — today that is {@link dependsOnTemplateId}. It never reaches a Step: a
   * live Step carries a minted id, and the template it came from is recorded on the Journey.
   */
  id?: string;
  /**
   * An earlier template, by {@link id}, that must be reported before this one unlocks (Step
   * Dependencies, linear, within a Milestone). The Planner resolves it to the POSITIONAL
   * `dependsOnStepIndex` the engine expects once the flattened order is known, because a Step's real
   * id does not exist until it is minted.
   */
  dependsOnTemplateId?: string;
}

/**
 * An advisory risk the expert spots in the goal/constraints (coarse enum + message). ADVISORY
 * ONLY: the {@link Planner} never reads these — they surface to the coach/UI as gentle,
 * NON-CLINICAL cautions. The first three codes are generic planning risks (any domain); the
 * rest are domain risks contributed by the DomainExperts and are additive — a new expert may
 * extend this union without touching the Planner.
 */
export interface RiskSignal {
  code:
    // Generic planning risks (any domain).
    | 'no_time'
    | 'overloaded'
    | 'tight_deadline'
    // Addiction.
    | 'high_risk_time'
    | 'trigger_exposure'
    | 'isolation'
    // Relationships & loneliness.
    | 'avoidance'
    | 'fear_of_rejection'
    | 'social_withdrawal'
    // Body image (eating + activity).
    | 'skipping_meals'
    | 'late_night'
    | 'all_or_nothing'
    | 'overtraining'
    | 'injury_risk'
    // Career.
    | 'procrastination'
    | 'scope_creep'
    | 'burnout';
  message: string;
}

/**
 * The funnel an expert's interview walks — general → specific. A STABLE enum: aggregate trend
 * analysis (a future "80% completed & found it useful" recommendation layer) groups answers by
 * intent, so codes are added, never repurposed. Not every expert asks every intent, and the
 * `milestones` intent is CONDITIONAL (only when breaking the goal into stages genuinely helps).
 */
export type QuestionIntent =
  | 'foundation' // why this matters / what it means to you
  | 'baseline' // the zero-state — where you are right now
  | 'time' // how much time you can allocate
  | 'obstacles' // what has gotten in the way before
  | 'motivation' // what keeps you going when it is hard
  | 'milestones' // whether to break the goal into intermediate Milestones
  | 'variant'; // which VERSION of the chosen Journey to build (D62) — declared by the Journey itself

/**
 * One interview question an expert OWNS. Presents common CLOSED `options` (stable categories,
 * cheap+fast to analyse in aggregate) plus — always — an "Other" free-text escape so the user
 * can answer in their own words. All fields are EDITABLE config (config-before-code): text and
 * options are tuned without touching logic.
 */
export interface DomainQuestion {
  /** Stable id, keyed into {@link InterviewAnswers}. Domain-scoped, e.g. `body_image.baseline`. */
  id: string;
  /** Where this sits in the general → specific funnel. */
  intent: QuestionIntent;
  /** The question as shown to the user. */
  prompt: string;
  /** Common closed answer options — stable, domain-appropriate categories (≥2). */
  options: string[];
  /** Always true: the user may answer in their own words ("Other"). */
  allowOther: boolean;
  /**
   * When true, several options may be chosen at once — for questions where more than one answer is
   * genuinely true (e.g. `foundation` / `obstacles` / `motivation`). Single-answer questions
   * (`baseline` / `time` / `milestones`) omit this or set it false. The orchestrator records a
   * multi-select answer as the chosen option VALUE strings ({@link InterviewAnswers} `string[]`),
   * never indices.
   */
  multiSelect?: boolean;
}

/**
 * The user's interview answers, keyed by {@link DomainQuestion.id}. Each value is EITHER one of
 * that question's closed `options` OR the user's own free text (when they chose "Other"). A
 * MULTI-SELECT question ({@link DomainQuestion.multiSelect}) stores an ARRAY of the chosen option
 * value strings; a single-answer question stores one string. Never indices, never a joined label.
 *
 * SECURITY-PRIVACY G1: an "Other" free-text value is ON-DEVICE-ONLY raw signal (same invariant
 * as a GoalInput title). It feeds the on-device expert/Planner and must NEVER be copied into a
 * DomainEvent, ProgressSummary, OutreachInsight, log line, or any sync path.
 */
export type InterviewAnswers = Record<string, string | string[]>;

/**
 * Read a SINGLE-valued answer as trimmed text: the string itself, or the FIRST value of a
 * multi-select array. Single-intent questions (`baseline` / `time` / `milestones`) are never
 * multi-select, so this only ever coerces an array defensively. Returns '' when unanswered.
 */
export function answerText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? '').trim();
  return (value ?? '').trim();
}

/** How realistic the goal looks given the user's baseline, time and timeframe. */
export type FeasibilityVerdict = 'reasonable' | 'ambitious' | 'tooAmbitious';

/** An honest, supportive, NON-CLINICAL reality-check on the goal. */
export interface FeasibilityAssessment {
  verdict: FeasibilityVerdict;
  /** One-line explanation of the verdict — encouraging, never a directive or a diagnosis. */
  note: string;
}

/**
 * The answer-aware plan structure an expert builds from the interview: the Milestone arc plus
 * the Step templates inside each Milestone (aligned by index). It carries NO scheduling — the
 * {@link Planner} lays these on the calendar. Unlike the fixed generic arc of
 * {@link DomainExpert.proposeMilestones}, this reflects the user's REAL baseline (a beginner
 * gets an easier, shorter start than an advanced user).
 */
export interface PlanStructure {
  milestones: ProposedMilestone[];
  /** Step templates per Milestone, aligned by index to `milestones` (same length). */
  stepsByMilestone: StepTemplate[][];
  /**
   * Steps that belong to NO Milestone. This is the ENTIRE plan of a `recurring` Journey (see
   * {@link JourneyShape}), which has an empty `milestones` arc: a few setup Steps, then the user's
   * own action repeated on every active day. A staged plan leaves this absent.
   *
   * They are appended AFTER the staged Steps, so a structure that somehow carries both keeps the
   * arc's order intact.
   */
  unstagedSteps?: StepTemplate[];
}

/**
 * Supplies the domain knowledge the Planner needs. The two structure methods are pure and
 * deterministic; the rest are optional. `riskSignals` is advisory context; the INTERVIEW
 * methods (`interviewQuestions`/`assessFeasibility`/`usesMilestones`/`buildStructure`) let an
 * expert OWN its interview and build an answer-aware plan — the foundation of the coach
 * redesign. They are additive: the existing `proposeMilestones`/`stepTemplatesFor` path keeps
 * working unchanged for callers (e.g. the current Planner) that don't run an interview.
 */
export interface DomainExpert {
  /** Human-readable label for this domain (surfaced in the dev harness / UI). */
  displayName?: string;
  /** The ordered Milestones this goal breaks into, given the user's constraints. */
  proposeMilestones(goal: GoalInput, constraints: PlanConstraints): ProposedMilestone[];
  /** The Step templates that make up one Milestone of this goal. */
  stepTemplatesFor(milestone: ProposedMilestone, goal: GoalInput): StepTemplate[];
  /** Optional advisory risks in the goal/constraints (e.g. no time set aside). */
  riskSignals?(goal: GoalInput, constraints: PlanConstraints): RiskSignal[];

  /** The ORDERED (general → specific) interview this expert asks for the goal. */
  interviewQuestions?(goal: GoalInput): DomainQuestion[];
  /** An honest reality-check on the goal given the collected answers + constraints. */
  assessFeasibility?(answers: InterviewAnswers, constraints: PlanConstraints): FeasibilityAssessment;
  /** Whether intermediate Milestones genuinely help this goal (not always). */
  usesMilestones?(answers: InterviewAnswers): boolean;
  /** Build the answer-aware Milestone + Step structure (no scheduling — that's the Planner). */
  buildStructure?(
    goal: GoalInput,
    answers: InterviewAnswers,
    constraints: PlanConstraints,
  ): PlanStructure;
}

/** Generic Milestone arc for an open-ended habit (three consistency phases). */
const HABIT_MILESTONES: readonly ProposedMilestone[] = [
  { title: 'Get started', weight: 1 },
  { title: 'Build the routine', weight: 2 },
  { title: 'Make it stick', weight: 3 },
] as const;

/** Generic Milestone arc for a finite goal (foundations → finish). */
const GOAL_MILESTONES: readonly ProposedMilestone[] = [
  { title: 'Foundations', weight: 1 },
  { title: 'Core practice', weight: 2 },
  { title: 'Deepen', weight: 2 },
  { title: 'Finish strong', weight: 1 },
] as const;

/** Sessions per Milestone by pace hint — more for a daily cadence, fewer for weekly. */
function sessionsPerMilestone(cadence: GoalInput['cadence'], isHabit: boolean): number {
  const c = cadence ?? (isHabit ? 'daily' : 'weekly');
  if (c === 'daily') return 4;
  if (c === 'weekly') return 2;
  return 3; // 'once'
}

/** Base minutes per session by pace hint — shorter daily reps, longer weekly blocks. */
function baseMinutes(cadence: GoalInput['cadence'], isHabit: boolean): number {
  const c = cadence ?? (isHabit ? 'daily' : 'weekly');
  return c === 'daily' ? 15 : 30;
}

/** A single ongoing-practice Milestone, used when the user prefers no intermediate stages. */
const SINGLE_MILESTONE: ProposedMilestone = { title: 'Keep a steady practice', weight: 1 };

/**
 * The generic fallback interview — domain-agnostic, general → specific. Prompts and options are
 * EDITABLE config resolved from the `coachContent` i18n namespace (so the coach speaks the user's
 * language) — built fresh per call in the ACTIVE language. `baseline` options are ORDERED novice →
 * experienced (index → starting level); `milestones` option [1] is the "keep it simple" choice.
 */
function generalQuestions(): DomainQuestion[] {
  return [
    {
      id: 'general.foundation',
      intent: 'foundation',
      prompt: cc('general.foundation.prompt'),
      options: ccOptions('general.foundation.options'),
      allowOther: true,
      multiSelect: true,
    },
    {
      id: 'general.baseline',
      intent: 'baseline',
      prompt: cc('general.baseline.prompt'),
      options: ccOptions('general.baseline.options'),
      allowOther: true,
    },
    {
      id: 'general.time',
      intent: 'time',
      prompt: cc('general.time.prompt'),
      options: ccOptions('general.time.options'),
      allowOther: true,
    },
    {
      id: 'general.obstacles',
      intent: 'obstacles',
      prompt: cc('general.obstacles.prompt'),
      options: ccOptions('general.obstacles.options'),
      allowOther: true,
      multiSelect: true,
    },
    {
      id: 'general.motivation',
      intent: 'motivation',
      prompt: cc('general.motivation.prompt'),
      options: ccOptions('general.motivation.options'),
      allowOther: true,
      multiSelect: true,
    },
    {
      id: 'general.milestones',
      intent: 'milestones',
      prompt: cc('general.milestones.prompt'),
      options: ccOptions('general.milestones.options'),
      allowOther: true,
    },
  ];
}

/** The stable id of the general `baseline` question — shared by structure + feasibility. */
const GENERAL_BASELINE_ID = 'general.baseline';
const GENERAL_MILESTONES_ID = 'general.milestones';

/**
 * The ORDERED `baseline` option labels (novice → experienced), in the ACTIVE language. The rendered
 * question and the level-matching in {@link GeneralExpert.assessFeasibility}/`buildStructure` both read
 * THIS single source, so translating the labels never desyncs the exact-string match.
 */
function generalBaselineOptions(): string[] {
  return ccOptions('general.baseline.options');
}

/** The `milestones` option labels in the active language; option [1] is the "keep it simple" choice. */
function generalMilestonesOptions(): string[] {
  return ccOptions('general.milestones.options');
}

/**
 * Map an ORDERED baseline answer to a starting level 0 (novice) .. 2 (experienced). A free-text
 * ("Other") or unmatched answer returns the middle level 1 — we assume neither extreme.
 */
function levelFromOrdered(answer: string, ordered: readonly string[]): 0 | 1 | 2 {
  const i = ordered.indexOf(answer.trim());
  if (i < 0 || ordered.length <= 1) return 1;
  const frac = i / (ordered.length - 1);
  return frac <= 0.34 ? 0 : frac >= 0.67 ? 2 : 1;
}

/** Ease Step difficulty for novices, raise it for the experienced; clamp to 1..5. */
function difficultyForLevel(weight: number | undefined, level: 0 | 1 | 2): number {
  return Math.min(5, Math.max(1, (weight ?? 1) + level - 1));
}

/** Scale session length by starting level — shorter for novices, longer for the experienced. */
function minuteScale(level: 0 | 1 | 2): number {
  return level === 0 ? 0.7 : level === 2 ? 1.2 : 1;
}

/**
 * The trivial, domain-agnostic default expert. Produces sensible generic Milestones and
 * Steps purely from the goal title + cadence hint — no field-specific knowledge. It is the
 * fallback when no specialised expert is registered, and the reference implementation of the
 * seam. Deterministic: the same GoalInput always yields the same proposal.
 */
export const GeneralExpert: DomainExpert = {
  displayName: 'General',

  proposeMilestones(goal) {
    const source = goal.isHabit ? HABIT_MILESTONES : GOAL_MILESTONES;
    // Return fresh objects so callers can't mutate the shared catalog.
    return source.map((m) => ({ ...m }));
  },

  stepTemplatesFor(milestone, goal) {
    const count = sessionsPerMilestone(goal.cadence, goal.isHabit);
    const minutes = baseMinutes(goal.cadence, goal.isHabit);
    const difficulty = Math.min(5, Math.max(1, milestone.weight ?? 1));
    const templates: StepTemplate[] = [];
    for (let n = 0; n < count; n++) {
      templates.push({
        title: `${goal.title} · ${milestone.title} ${n + 1}`,
        estimatedMinutes: minutes,
        difficulty,
      });
    }
    return templates;
  },

  riskSignals(_goal, constraints) {
    const signals: RiskSignal[] = [];
    if (constraints.weeklyAvailabilityMinutes <= 0) {
      signals.push({
        code: 'no_time',
        message: 'No weekly time is set aside for this goal yet.',
      });
    }
    return signals;
  },

  interviewQuestions() {
    // Fresh copies in the active language so callers can't mutate the shared config.
    return generalQuestions();
  },

  assessFeasibility(answers, constraints) {
    const level = levelFromOrdered(answerText(answers[GENERAL_BASELINE_ID]), generalBaselineOptions());
    // A novice with little weekly time is the least likely to hit an ambitious goal.
    const time = constraints.weeklyAvailabilityMinutes;
    const score = (time <= 0 ? 2 : time < 60 ? 1 : 0) + (level === 0 ? 1 : 0) - (level === 2 ? 1 : 0);
    const verdict: FeasibilityVerdict = score <= 0 ? 'reasonable' : score <= 2 ? 'ambitious' : 'tooAmbitious';
    const note = cc(`feasibility.${verdict}`);
    return { verdict, note };
  },

  usesMilestones(answers) {
    const a = answerText(answers[GENERAL_MILESTONES_ID]);
    if (!a) return true; // default: staged
    return a !== generalMilestonesOptions()[1]; // the "keep it simple" choice
  },

  buildStructure(goal, answers, _constraints) {
    const level = levelFromOrdered(answerText(answers[GENERAL_BASELINE_ID]), generalBaselineOptions());
    const staged = GeneralExpert.usesMilestones!(answers);
    const source = staged ? (goal.isHabit ? HABIT_MILESTONES : GOAL_MILESTONES) : [SINGLE_MILESTONE];
    let arc = source.map((m) => ({ ...m }));
    // The experienced skip the gentlest intro Milestone.
    if (level === 2 && arc.length > 2) arc = arc.slice(1);

    const count = sessionsPerMilestone(goal.cadence, goal.isHabit);
    const minutes = Math.max(1, Math.round(baseMinutes(goal.cadence, goal.isHabit) * minuteScale(level)));
    const stepsByMilestone = arc.map((m) => {
      const difficulty = difficultyForLevel(m.weight, level);
      const templates: StepTemplate[] = [];
      for (let n = 0; n < count; n++) {
        templates.push({
          title: `${goal.title} · ${m.title} ${n + 1}`,
          estimatedMinutes: minutes,
          difficulty,
        });
      }
      return templates;
    });
    return { milestones: arc, stepsByMilestone };
  },
};
