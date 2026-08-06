/**
 * CoachOrchestrator — the dialogue manager for PushApp's conversational coach, rebuilt as a
 * TWO-LAYER model:
 *
 *   1. UNDERSTANDING (meta-agent):  the opening asks the user, in their own words, what they want.
 *      One LLM call then UNDERSTANDS that free text — it may name MORE THAN ONE distinct goal — and
 *      returns a structured list `goals: [{ title, kind, domain }]` ({@link extractGoals}). Domains
 *      are validated ({@link isDomainId} → `general`) and kinds default to `process`. When the user
 *      described SEVERAL goals the coach runs a FOCUS turn — it reflects them back (naming each one's
 *      kind: a simple recurring habit vs a step-by-step process) and asks the user to build ONE
 *      first; the rest are kept on {@link GoalSpec.deferredGoals} to build next. The chosen goal's
 *      title, domain (→ the matching {@link DomainExpert} via {@link getExpert}) and `processType`
 *      (INFERRED from its kind) drive the rest. If understanding yields NO usable goal, a fallback
 *      keeps the demoted closed process-type question. The active expert is exposed as
 *      `{ id, displayName }`. The meta-agent speaks in the STEADY {@link ./communicationStyles} voice.
 *
 *   2. EXPERT-DRIVEN INTERVIEW:  the selected expert OWNS its questions. The orchestrator iterates
 *      the expert's {@link DomainExpert.interviewQuestions} IN ORDER, surfacing each as
 *      `{ question, activeExpert }`. The question flow is shaped by the goal's TYPE: a `recurring`
 *      habit takes a LIGHTER path (the staging/milestones questions are skipped — it is a fixed
 *      weekly action, not a build-up), a `process` gets the full staged interview. A closed-option
 *      pick is recorded DIRECTLY (no LLM call); an "Other" answer stores the user's raw free text.
 *      This drastically cuts LLM usage — the model runs only for the one understanding call.
 *
 * After the questions the expert's {@link DomainExpert.assessFeasibility} produces an honest
 * reality-check note, and the closing recommends a Support Circle. The completed {@link GoalSpec}
 * carries `title`, `domain`, `activeExpertDisplayName`, `answers`, `feasibility` and the scheduling
 * inputs the Planner needs; {@link ./goalSpecToJourney} builds the Journey from it.
 *
 * The disclosure/extraction toolkit (front-load path) now lives in {@link ./disclosureParser} and is
 * re-exported here for backward-compatible imports.
 *
 * SECURITY-PRIVACY G1: the interview answers (including any "Other" free text) are ON-DEVICE-ONLY raw
 * signal — never logged, never copied into a DomainEvent/ProgressSummary, never synced. The
 * {@link ./SafetyLayer SafetyLayer} still guards every OUTBOUND coach message.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type {
  DomainExpert,
  DomainQuestion,
  FeasibilityAssessment,
  InterviewAnswers,
} from '../learning/DomainExpert';
import { DOMAIN_IDS, getExpert, isDomainId, type DomainId } from '../learning/experts/registry';
import type { GoalInput } from '../learning/types';
import type { LlmClient, LlmMessage } from '../llm/LlmClient';
import { COACH_SYSTEM_PROMPT, TRIAGE_SYSTEM_PROMPT, buildTriageDirective } from './coachPrompts';
import { DEFAULT_STYLE_ID, getStyle } from './communicationStyles';
import { deriveConstraints } from './goalSpecToJourney';
import {
  INTERVIEW_PLAYBOOK,
  type DeferredGoal,
  type FocusCopy,
  type GoalKind,
  type GoalSpec,
  type InterviewChoice,
  type InterviewPlaybook,
  type ProcessType,
} from './interviewPlaybook';

// The disclosure/front-load extractor moved out of this file; re-export it so existing imports from
// '../CoachOrchestrator' (e.g. DisclosureParser tests) keep resolving.
export * from './disclosureParser';

// ── Meta-agent questions (orchestrator-owned, outside any DomainExpert) ───────────
// These closed questions bracket the expert-driven interview and are surfaced through the SAME
// {@link DomainQuestion} shape as the expert questions so the harness/UI renders them identically,
// but the orchestrator maps their answers onto dedicated {@link GoalSpec} fields (processType /
// schedulingPreference) or onto the focus/deferral logic rather than into `answers`.
//   • FOCUS (meta.focus) — surfaced only when understanding detected MORE THAN ONE goal: the user
//     picks which ONE to build first; the rest are deferred.
//   • PROCESS_TYPE (meta.processType) — DEMOTED to a FALLBACK: asked only when understanding yields
//     no usable goal, so the coach can still capture the process shape before routing to `general`.
//   • SCHEDULING (meta.scheduling) — the closing optional scheduling preference.

/** The stable id of the fallback process-type meta question. */
export const PROCESS_TYPE_QUESTION_ID = 'meta.processType';
/** The stable id of the multi-goal focus meta question. */
export const FOCUS_QUESTION_ID = 'meta.focus';
/** The stable id of the closing scheduling-preference meta question. */
export const SCHEDULING_QUESTION_ID = 'meta.scheduling';

/**
 * The FALLBACK closed question, asked ONLY when the understanding step returns no usable goal: what
 * shape of work is this? Option 0 → processType `recurring`; option 1 → `process`; an "Other"
 * free-text → `other`. Single-select. EDITABLE copy. (No longer the mandatory first step — the
 * process type is normally INFERRED from understanding.)
 */
export const PROCESS_TYPE_QUESTION: DomainQuestion = {
  id: PROCESS_TYPE_QUESTION_ID,
  intent: 'foundation',
  prompt: 'What would you like to work on?',
  options: ['Add a recurring habit to my weekly routine', 'Build a new process or goal'],
  allowOther: true,
  multiSelect: false,
};

/**
 * The optional CLOSING closed question: any specific days/times the user prefers? Option 0 (flexible)
 * leaves {@link GoalSpec.schedulingPreference} empty so the next (scheduling) pass places Steps by
 * frequency only; option 1 or an "Other" free text (e.g. "Tue/Thu evenings") is stored verbatim.
 * Single-select. EDITABLE copy.
 */
export const SCHEDULING_QUESTION: DomainQuestion = {
  id: SCHEDULING_QUESTION_ID,
  intent: 'time',
  prompt: 'Any specific days or times you’d prefer?',
  options: ['No — I’m flexible', 'Yes, specific days'],
  allowOther: true,
  multiSelect: false,
};

// ── Public turn / state shapes ──────────────────────────────────────────────────

/** The ACTIVE EXPERT the triage step selected — surfaced for the dev harness / UI. */
export interface ActiveExpert {
  id: DomainId;
  /** The expert's human-readable {@link DomainExpert.displayName} (e.g. "Body Image"). */
  displayName: string;
}

/**
 * The stage the orchestrator is at. `goal` awaits the free-text opening that
 * {@link CoachOrchestrator.triage} UNDERSTANDS; `focus` awaits the user's pick when several goals
 * were detected; `processType` awaits the FALLBACK process-type question (understanding found no
 * usable goal); `questions` walks the chosen expert's own questions; `scheduling` awaits the closing
 * scheduling-preference meta question.
 */
export type CoachPhase =
  | 'opening'
  | 'goal'
  | 'focus'
  | 'processType'
  | 'questions'
  | 'scheduling'
  | 'done';

/** What {@link CoachOrchestrator.start} returns: the opening greeting that asks for the goal. */
export interface OpeningTurn {
  coachMessage: string;
  /**
   * LEGACY: the old A/B/C choices, retained for back-compat with older callers/tests. The coach now
   * asks for the goal in free text and UNDERSTANDS it, so these are vestigial and ignored.
   */
  choices: InterviewChoice[];
  state: OrchestratorState;
}

/** What the interview turn methods return. */
export interface CoachTurn {
  /** The coach's next line (an expert question, or the closing feasibility + Support-Circle note). */
  coachMessage: string;
  /** A read-only snapshot of the interview state after this turn. */
  state: OrchestratorState;
  /** True once the interview is complete; `goalSpec` is then the completed spec. */
  done: boolean;
  /** The completed {@link GoalSpec}, present only when `done` is true. */
  goalSpec?: GoalSpec;
  /** The current expert question awaiting an answer (absent on the closing turn). */
  question?: DomainQuestion;
  /** The active expert, once triage has selected one. */
  activeExpert?: ActiveExpert;
}

/** A read-only snapshot of the orchestrator's progress. */
export interface OrchestratorState {
  /** The current stage. */
  phase: CoachPhase;
  /** The GoalSpec filled so far. */
  spec: GoalSpec;
  /** The expert triage selected, once it has run. */
  activeExpert?: ActiveExpert;
  /** The current expert question awaiting an answer. */
  question?: DomainQuestion;
  /** 0-based index of the current (or last) expert question. */
  questionIndex: number;
  /** How many questions the active expert asks in total. */
  totalQuestions: number;
  /** LEGACY (dev-harness display): the id of the current question awaiting an answer. */
  pendingTarget?: string;
  /** LEGACY (dev-harness display): the ids of the questions still to come. */
  remainingTargets: string[];
  /** The visible dialogue so far (coach lines + user answers). ON-DEVICE-ONLY. */
  history: LlmMessage[];
}

/**
 * An outbound guard applied to every coach message before it is surfaced (S2.5). It receives the
 * coach's line and returns the SAFE text to show — the same line when clean, a softened rewrite when
 * needed, or a safe fallback when blocked. Adapt {@link ./SafetyLayer SafetyLayer} via its
 * `messageGuard()`. Defaults to identity when omitted.
 */
export type CoachMessageGuard = (text: string) => string;

/** Construction options — inject the LlmClient (tests use MockLlmClient); everything else defaults. */
export interface CoachOrchestratorOptions {
  /** The completion seam. Required. Used ONLY for triage classification (and optional "Other" parse). */
  llm: LlmClient;
  /** The editable interview script; defaults to {@link INTERVIEW_PLAYBOOK} (opening + closing copy). */
  playbook?: InterviewPlaybook;
  /** Optional outbound safety guard applied to every coach message; defaults to identity. */
  guard?: CoachMessageGuard;
}

// ── The orchestrator ────────────────────────────────────────────────────────────

/**
 * A stateful, single-interview dialogue manager. Construct one per Journey the user is shaping.
 * Primary drive: {@link start} → {@link triage} → repeated {@link selectOption} / {@link answerOther}.
 * The legacy {@link chooseBranch} / {@link respond} pair is kept for the not-yet-rewritten harness.
 */
export class CoachOrchestrator {
  private readonly llm: LlmClient;
  private readonly playbook: InterviewPlaybook;
  private readonly guard?: CoachMessageGuard;
  /** The steady meta-agent tone, composed onto the coach persona for triage. */
  private readonly styleFragment: string;

  private readonly history: LlmMessage[] = [];
  private phase: CoachPhase = 'opening';

  private expert?: DomainExpert;
  private activeExpert?: ActiveExpert;
  private goal?: GoalInput;
  private questions: DomainQuestion[] = [];
  private questionIndex = 0;
  private readonly answers: InterviewAnswers = {};

  /** The goals understanding detected, in order — held while the user makes a focus pick. */
  private understoodGoals: UnderstoodGoal[] = [];
  /** The synthetic multi-goal focus question, built when >1 goal is detected. */
  private focusQuestion?: DomainQuestion;

  /** The GoalSpec being filled; the two-layer fields land as the interview progresses. */
  private readonly spec: GoalSpec = {
    title: '',
    domain: 'general', // set by triage classification (falls back to 'general')
    processType: 'unknown',
    isHabit: false,
    milestones: [],
    failureRisks: [],
    timing: {},
    answers: {},
  };

  constructor(options: CoachOrchestratorOptions) {
    this.llm = options.llm;
    this.playbook = options.playbook ?? INTERVIEW_PLAYBOOK;
    this.guard = options.guard;
    this.styleFragment = getStyle(DEFAULT_STYLE_ID).systemPromptFragment ?? '';
  }

  /** The opening greeting, which asks the user for their goal in free text. No model call. */
  start(): OpeningTurn {
    if (this.phase !== 'opening') {
      throw new Error('CoachOrchestrator.start() was already called');
    }
    this.phase = 'goal';
    const coachMessage = this.applyGuard(this.playbook.opening);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      choices: this.playbook.choices.map((choice) => ({ ...choice })),
      state: this.snapshot(),
    };
  }

  /**
   * UNDERSTANDING: read the user's free-text opening (one LLM call) and distil the distinct goals it
   * describes ({@link extractGoals}). The only model call of the interview proper. Then branch:
   *   • several goals → a FOCUS turn (the user picks which ONE to build first; the rest are deferred);
   *   • exactly one  → straight into that goal's expert questions;
   *   • none usable  → the FALLBACK process-type question.
   * Named `triage` for continuity; it now understands rather than merely classifies.
   */
  async triage(goalText: string): Promise<CoachTurn> {
    if (this.phase !== 'goal') {
      throw new Error('Describe the goal after start(), and triage() only once');
    }
    const text = goalText.trim();
    this.history.push({ role: 'user', content: text });

    const goals = await this.understand(text);

    if (goals.length === 0) {
      // Understanding produced nothing usable — keep the demoted process-type question as a fallback
      // so the user can still tell us the shape, and route to the general expert.
      this.spec.title = text;
      this.spec.domain = 'general';
      return this.askProcessTypeFallback();
    }

    if (goals.length > 1) {
      // Several distinct goals — focus the user on ONE first before interviewing.
      this.understoodGoals = goals;
      return this.askFocusChoice(goals);
    }

    // A single goal — no need to focus; activate it and start its expert's questions.
    return this.activateGoal(goals[0], []);
  }

  /**
   * Record a CHOSEN closed option (by index) for the current question and advance. NO LLM call — a
   * closed pick needs no interpretation. On a {@link DomainQuestion.multiSelect} question this records
   * a single-element `string[]`; on a single-answer question, a `string`. Delegates to
   * {@link selectOptions}.
   */
  async selectOption(optionIndex: number): Promise<CoachTurn> {
    return this.selectOptions([optionIndex]);
  }

  /**
   * Record one or MORE chosen closed options for the current question and advance. The answer is
   * always stored as the option VALUE string(s), never indices: a multi-select question records the
   * chosen values as a `string[]`; a single-answer question records the first value as a `string`.
   * NO LLM call.
   */
  async selectOptions(optionIndices: number[]): Promise<CoachTurn> {
    const question = this.currentQuestion();
    if (optionIndices.length === 0) {
      throw new RangeError(`No option chosen for "${question.id}"`);
    }
    for (const i of optionIndices) {
      if (i < 0 || i >= question.options.length) {
        throw new RangeError(`Option index ${i} is out of range for "${question.id}"`);
      }
    }
    const values = optionIndices.map((i) => question.options[i]);
    // Single-answer questions collapse to the first value; multi-select keeps every chosen value.
    const answer: string | string[] = question.multiSelect ? values : values[0];
    return this.record(question, answer);
  }

  /**
   * Record a free-text "Other" answer for the current question and advance. The raw text is stored
   * as ON-DEVICE-ONLY signal (a single string, even on a multi-select question); NO required LLM call.
   */
  async answerOther(text: string): Promise<CoachTurn> {
    const question = this.currentQuestion();
    if (!question.allowOther) {
      throw new Error(`Question "${question.id}" does not allow a free-text answer`);
    }
    return this.record(question, text.trim());
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /**
   * UNDERSTAND the free-text opening via the meta-agent (one LLM call): return the distinct goals it
   * describes, each with a validated domain + kind ({@link extractGoals}). A transport/LLM failure
   * degrades to an EMPTY list so the caller takes the safe fallback path — the interview never crashes.
   */
  private async understand(goalText: string): Promise<UnderstoodGoal[]> {
    try {
      const system = [this.styleFragment, COACH_SYSTEM_PROMPT, TRIAGE_SYSTEM_PROMPT]
        .filter((s) => s.length > 0)
        .join('\n\n');
      const result = await this.llm.complete({
        system,
        json: true,
        temperature: 0,
        messages: [...this.history, { role: 'user', content: buildTriageDirective(goalText) }],
      });
      return extractGoals(result.text);
    } catch {
      return [];
    }
  }

  /**
   * Activate the CHOSEN goal: set its title, domain and inferred `processType` (from its kind), store
   * any DEFERRED goals on the spec, then begin the expert's questions. Called for a single understood
   * goal and for the goal the user picks on the focus turn.
   */
  private activateGoal(goal: UnderstoodGoal, deferred: UnderstoodGoal[]): CoachTurn {
    this.spec.title = goal.title;
    this.spec.domain = goal.domain;
    this.spec.processType = goal.kind; // INFERRED from understanding: 'recurring' | 'process'
    this.spec.isHabit = goal.kind === 'recurring';
    if (deferred.length > 0) {
      this.spec.deferredGoals = deferred.map(
        (g): DeferredGoal => ({ title: g.title, processType: g.kind, domain: g.domain }),
      );
    }
    return this.beginExpertQuestions();
  }

  /**
   * Select the expert for the active goal's domain, load its questions SHAPED BY the goal's type (a
   * recurring habit skips the staging/milestones questions), and surface the first — or the closing
   * scheduling question when the expert asks nothing.
   */
  private beginExpertQuestions(): CoachTurn {
    this.expert = getExpert(this.spec.domain);
    this.activeExpert = {
      id: this.spec.domain,
      displayName: this.expert.displayName ?? this.spec.domain,
    };
    this.spec.activeExpertDisplayName = this.activeExpert.displayName;

    this.goal = { title: this.spec.title, isHabit: this.spec.isHabit };
    const all = this.expert.interviewQuestions?.(this.goal) ?? [];
    this.questions = questionsForProcessType(all, this.spec.processType);
    this.questionIndex = 0;
    this.phase = 'questions';

    return this.questions.length > 0 ? this.askCurrentQuestion() : this.askSchedulingQuestion();
  }

  /**
   * Surface the multi-goal FOCUS turn: reflect the detected goals back (each labelled by its kind)
   * and ask the user to pick which ONE to build first. The synthetic question is closed (no "Other")
   * so the harness/UI renders a simple numbered choice of the goals.
   */
  private askFocusChoice(goals: UnderstoodGoal[]): CoachTurn {
    this.phase = 'focus';
    this.focusQuestion = buildFocusQuestion(goals, this.playbook.focus);
    const coachMessage = this.applyGuard(this.playbook.focus.intro);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      done: false,
      question: cloneQuestion(this.focusQuestion),
    };
  }

  /** Surface the FALLBACK process-type question (understanding found no usable goal). */
  private askProcessTypeFallback(): CoachTurn {
    this.phase = 'processType';
    const coachMessage = this.applyGuard(PROCESS_TYPE_QUESTION.prompt);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      done: false,
      question: cloneQuestion(PROCESS_TYPE_QUESTION),
    };
  }

  /** The question currently awaiting an answer (meta or expert), or throw if there is none. */
  private currentQuestion(): DomainQuestion {
    const question = this.pendingQuestion();
    if (!question) throw new Error('There is no question to answer right now');
    return question;
  }

  /** The question awaiting an answer for the current phase (meta or expert), else undefined. */
  private pendingQuestion(): DomainQuestion | undefined {
    switch (this.phase) {
      case 'focus':
        return this.focusQuestion;
      case 'processType':
        return PROCESS_TYPE_QUESTION;
      case 'questions':
        return this.questions[this.questionIndex];
      case 'scheduling':
        return SCHEDULING_QUESTION;
      default:
        return undefined;
    }
  }

  /**
   * Record an answer for the current question, echo it into the visible dialogue, and advance. The
   * two META questions map onto dedicated {@link GoalSpec} fields; an expert question stores its
   * value(s) in `answers` keyed by the question id. Both drive the phase machine forward.
   */
  private record(question: DomainQuestion, answer: string | string[]): CoachTurn {
    this.history.push({ role: 'user', content: displayAnswer(answer) });
    switch (this.phase) {
      case 'focus':
        return this.recordFocusPick(answer);
      case 'processType':
        this.spec.processType = processTypeFromAnswer(answer);
        this.spec.isHabit =
          this.spec.processType === 'recurring' || this.spec.processType === 'fixed';
        return this.beginExpertQuestions();
      case 'questions':
        this.answers[question.id] = answer;
        this.questionIndex++;
        return this.questionIndex < this.questions.length
          ? this.askCurrentQuestion()
          : this.askSchedulingQuestion();
      case 'scheduling': {
        const preference = schedulingPreferenceFromAnswer(answer);
        if (preference) this.spec.schedulingPreference = preference;
        return this.finish();
      }
      default:
        throw new Error('There is no question to answer right now');
    }
  }

  /**
   * Record the user's FOCUS pick: map the chosen option value back to its goal index, activate that
   * goal, and defer the rest. An unrecognized value defensively falls back to the first goal so the
   * interview always proceeds.
   */
  private recordFocusPick(answer: string | string[]): CoachTurn {
    const value = Array.isArray(answer) ? answer[0] : answer;
    const options = this.focusQuestion?.options ?? [];
    const picked = options.indexOf(value);
    const index = picked >= 0 ? picked : 0;
    const chosen = this.understoodGoals[index];
    const deferred = this.understoodGoals.filter((_, i) => i !== index);
    return this.activateGoal(chosen, deferred);
  }

  /** Surface the closing scheduling-preference meta question after the expert's questions. */
  private askSchedulingQuestion(): CoachTurn {
    this.phase = 'scheduling';
    const coachMessage = this.applyGuard(SCHEDULING_QUESTION.prompt);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      done: false,
      question: cloneQuestion(SCHEDULING_QUESTION),
      activeExpert: this.activeExpert,
    };
  }

  /** Surface the current expert question. The expert OWNS the prompt — no LLM phrasing. */
  private askCurrentQuestion(): CoachTurn {
    const question = this.questions[this.questionIndex];
    const coachMessage = this.applyGuard(question.prompt);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      done: false,
      question: cloneQuestion(question),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Close the interview: record the answers, run the expert's honest feasibility check, and surface
   * its note followed by the Support-Circle recommendation. Produces the completed {@link GoalSpec}.
   */
  private finish(): CoachTurn {
    this.phase = 'done';
    this.spec.answers = { ...this.answers };

    let feasibility: FeasibilityAssessment | undefined;
    if (this.expert?.assessFeasibility && this.goal) {
      const constraints = deriveConstraints(this.spec, this.expert, this.goal);
      feasibility = this.expert.assessFeasibility(this.answers, constraints);
      this.spec.feasibility = feasibility;
    }

    const lines = [feasibility?.note, this.playbook.supportCircleRecommendation].filter(
      (l): l is string => !!l && l.length > 0,
    );
    const coachMessage = this.applyGuard(lines.join('\n\n'));
    this.history.push({ role: 'model', content: coachMessage });

    return {
      coachMessage,
      state: this.snapshot(),
      done: true,
      goalSpec: this.snapshotSpec(),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Run an outbound coach line through the optional safety guard. Identity when no guard is
   * configured; a guard that returns empty is ignored so the coach never surfaces a blank turn.
   */
  private applyGuard(text: string): string {
    if (!this.guard) return text;
    const safe = this.guard(text);
    return safe.trim().length > 0 ? safe : text;
  }

  /** The question ids still to come after the current one (legacy dev-harness display). */
  private remainingQuestionIds(): string[] {
    if (this.phase !== 'questions') return [];
    return this.questions.slice(this.questionIndex + 1).map((q) => q.id);
  }

  /** A defensive read-only snapshot of the current state. */
  private snapshot(): OrchestratorState {
    const question = this.pendingQuestion();
    return {
      phase: this.phase,
      spec: this.snapshotSpec(),
      activeExpert: this.activeExpert ? { ...this.activeExpert } : undefined,
      question: question ? cloneQuestion(question) : undefined,
      questionIndex: this.questionIndex,
      totalQuestions: this.questions.length,
      pendingTarget: question?.id,
      remainingTargets: this.remainingQuestionIds(),
      history: this.history.map((turn) => ({ ...turn })),
    };
  }

  /** A defensive copy of the GoalSpec so callers cannot mutate the orchestrator's state. */
  private snapshotSpec(): GoalSpec {
    return {
      ...this.spec,
      milestones: this.spec.milestones.map((m) => ({ ...m })),
      failureRisks: [...this.spec.failureRisks],
      timing: { ...this.spec.timing },
      answers: { ...this.answers },
      ...(this.spec.feasibility ? { feasibility: { ...this.spec.feasibility } } : {}),
    };
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────────

/** One goal the understanding step distilled from the user's opening free text (validated). */
export interface UnderstoodGoal {
  /** Short title in the user's framing. ON-DEVICE-ONLY. */
  title: string;
  /** The shape of work understood: a recurring habit or a staged process. */
  kind: GoalKind;
  /** The classified domain (validated to a known {@link DomainId}, else `general`). */
  domain: DomainId;
}

/** A defensive copy of a {@link DomainQuestion} (fresh `options` array). */
function cloneQuestion(question: DomainQuestion): DomainQuestion {
  return { ...question, options: [...question.options] };
}

/**
 * Shape the expert's questions to the goal's TYPE. A `recurring` habit is a fixed weekly action, so
 * the staging/milestones questions are dropped (it does not build through Milestones); every other
 * type keeps the full staged interview. Pure — the input array is returned unchanged for non-recurring
 * goals.
 */
function questionsForProcessType(
  questions: DomainQuestion[],
  processType: ProcessType,
): DomainQuestion[] {
  const recurring = processType === 'recurring' || processType === 'fixed';
  if (!recurring) return questions;
  return questions.filter((q) => q.intent !== 'milestones');
}

/**
 * Build the synthetic multi-goal FOCUS question: one closed option per detected goal, each labelled
 * with its KIND in plain language (e.g. "Pushups 100→500/week — a step-by-step plan …"). Closed (no
 * "Other") so the user simply picks which goal to build first. The orchestrator maps the chosen value
 * back to its goal index.
 */
function buildFocusQuestion(goals: UnderstoodGoal[], copy: FocusCopy): DomainQuestion {
  return {
    id: FOCUS_QUESTION_ID,
    intent: 'foundation',
    prompt: copy.intro,
    options: goals.map((g) => `${g.title} — ${copy.kindLabels[g.kind]}`),
    allowOther: false,
    multiSelect: false,
  };
}

/** Render an answer for the visible dialogue: multi-select values join with " · ". */
function displayAnswer(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(' · ') : answer;
}

/**
 * Map the opening process-type answer onto a {@link ProcessType}: option 0 → `recurring`, option 1
 * → `process`, anything else (an "Other" free text) → `other`. The meta question is single-select,
 * so the answer is a string; an array defensively coerces to its first value.
 */
function processTypeFromAnswer(answer: string | string[]): ProcessType {
  const value = Array.isArray(answer) ? answer[0] : answer;
  if (value === PROCESS_TYPE_QUESTION.options[0]) return 'recurring';
  if (value === PROCESS_TYPE_QUESTION.options[1]) return 'process';
  return 'other';
}

/**
 * Map the closing scheduling answer onto a preference string, or `undefined` when the user is
 * flexible (option 0) — the next (scheduling) pass then places Steps by frequency only. The plain
 * "Yes, specific days" pick and any "Other" free text (e.g. "Tue/Thu evenings") are kept verbatim.
 */
function schedulingPreferenceFromAnswer(answer: string | string[]): string | undefined {
  const value = Array.isArray(answer) ? answer[0] : answer;
  if (value === SCHEDULING_QUESTION.options[0]) return undefined; // flexible → leave empty
  return value.trim() || undefined;
}

/**
 * Read the understanding model's answer into a validated list of goals. Expects a
 * `{"goals": [{title, kind, domain}]}` JSON object; each entry is validated defensively — a missing
 * `title` is dropped, an unknown `domain` degrades to `general` ({@link isDomainId}), and any `kind`
 * other than `recurring` defaults to `process`. Returns an EMPTY list when the answer is unparseable
 * or carries no usable goal, so the caller can take the safe fallback path (never crashes, never
 * invents a goal the user did not describe).
 */
export function extractGoals(text: string): UnderstoodGoal[] {
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (!objectMatch) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(objectMatch[0]);
  } catch {
    return [];
  }
  const raw = (parsed as { goals?: unknown }).goals;
  if (!Array.isArray(raw)) return [];

  const goals: UnderstoodGoal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as { title?: unknown; kind?: unknown; domain?: unknown };
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    if (!title) continue; // never invent a goal with no title
    const domain: DomainId = isDomainId(rec.domain) ? rec.domain : 'general';
    const kind: GoalKind = rec.kind === 'recurring' ? 'recurring' : 'process';
    goals.push({ title, kind, domain });
  }
  return goals;
}

/**
 * Read a validated {@link DomainId} out of a single-domain model answer. Prefers a `{"domain": …}`
 * JSON object; otherwise scans for the first known domain token in the raw text. Anything
 * unrecognized degrades to `general`. Retained as a utility (the interview now uses
 * {@link extractGoals}).
 */
export function extractDomain(text: string): DomainId {
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]) as { domain?: unknown };
      if (isDomainId(parsed.domain)) return parsed.domain;
    } catch {
      // fall through to token scanning
    }
  }
  const lower = text.toLowerCase();
  for (const id of DOMAIN_IDS) {
    if (lower.includes(id)) return id;
  }
  return 'general';
}
