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
 *   2. EXPERT-DRIVEN INTERVIEW:  the selected expert supplies the interview STRUCTURE — the ordered
 *      questions' intent + closed `options` + planning logic — but is an INTERNAL TOOL that never
 *      speaks to the user directly. The META-AGENT is the sole user-facing voice: it iterates the
 *      expert's {@link DomainExpert.interviewQuestions} IN ORDER and re-voices each one in its own
 *      words (the `interview.<intent>` `coachContent` template, in the user's language — see
 *      {@link CoachOrchestrator.metaVoiced}) before surfacing `{ question, activeExpert }`. Only the
 *      user-facing prompt is authored by the meta-agent; the expert's `options` remain the user's
 *      answer choices and all answer-matching is unaffected. The question flow is shaped by the
 *      goal's TYPE: a `recurring` habit takes a LIGHTER path (the staging/milestones questions are
 *      skipped — it is a fixed weekly action, not a build-up), a `process` gets the full staged
 *      interview. A closed-option pick is recorded DIRECTLY (no LLM call); an "Other" answer stores
 *      the user's raw free text. Re-voicing is deterministic (a template lookup, no LLM), so LLM
 *      usage stays minimal — the model still runs only for the one understanding call.
 *
 * ── AND THE OTHER CONVERSATION, WHICH USES NONE OF THAT (D105, 2026-09-15) ────────────────────
 *
 * `mode: 'introduction'` is the FIRST RUN, and it is not a lighter version of the two layers above.
 * It meets the person: it learns their name, then runs from the {@link ./portrait Portrait} —
 * what we understand about them, with a confidence and a source on every field — asking whichever
 * gap in that picture is worth the most and stopping when the picture is good enough (spec §22)
 * rather than when a list is empty. It selects NO expert, runs NO diagnosis, reads NO library and
 * builds NOTHING. Everything below this line about experts, matching and the GoalSpec belongs to
 * `planning`, which is byte-identical to what it has always been.
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
 * LANGUAGE (C-Lang-1): the deterministic meta-question copy below is resolved from the `coachContent`
 * i18n namespace so the coach SPEAKS the user's language; the one LLM understanding call is told (via
 * {@link buildLocaleDirective}) that the user may write in that language and to keep each goal `title`
 * in it — while STILL classifying `domain`/`kind` into the fixed ENGLISH enum tokens.
 *
 * Pure TypeScript — no React hooks, no UI, no vendor SDKs (the i18next core instance is framework-free).
 */
import i18n from '../../i18n';
import { addressContext } from '../../i18n/addressForm';
import type {
  DomainExpert,
  DomainQuestion,
  FeasibilityAssessment,
  InterviewAnswers,
  QuestionIntent,
} from '../learning/DomainExpert';
import {
  APPLY_NO_RESPONSE,
  CAREER_SIGNAL_HINTS,
  nextQuestion as nextDiagnosisQuestion,
  outcomeOf,
  type CareerDiagnosisAnswers,
  type CareerDiagnosisQuestion,
  type CareerDiagnosisTree,
  type CareerKnownSignals,
} from '../learning/domains/career/diagnosis';
import {
  consultCareer,
  type CareerNoMatchReason,
} from '../learning/domains/career/consultation';
import { arcCopy } from '../learning/library/authoredArc';
import { DOMAIN_IDS, getExpert, isDomainId, type DomainId } from '../learning/registry';
import type { GoalInput } from '../learning/types';
import type { LlmClient, LlmMessage } from '../llm/LlmClient';
import { composeCoachTurn, looksLikeReflection, type KnownFact } from './composeTurn';
import { readConversation } from './readConversation';
import {
  QUIET_TURNS_TO_STOP,
  clonePortrait,
  emptyPortrait,
  nextGap,
  outstandingGaps,
  mergePortrait,
  portraitFacts,
  readPortrait,
  readyToFinish,
  type Portrait,
  type PortraitFieldId,
  type PortraitGap,
} from './portrait';
import {
  DIAGNOSIS_SIGNAL_SYSTEM_PROMPT,
  FOCUS_SYSTEM_PROMPT,
  NAME_SYSTEM_PROMPT,
  buildDiagnosisDirective,
  buildFocusDirective,
  buildNameDirective,
  parseDiagnosisSignals,
  parseFocusChoice,
  parsePersonalName,
  coachSystemPrompt,
  TRIAGE_SYSTEM_PROMPT,
  buildLocaleDirective,
  buildTriageDirective,
} from './coachPrompts';
import { DEFAULT_STYLE_ID, getStyle, type CommunicationStyleId } from './communicationStyles';
import { horizonQuestion } from './horizonQuestion';
import { deriveConstraints, journeyShapeFor } from './goalSpecToJourney';
import { noteOf, type TechnicalNote } from './technicalMode';
import { variantInterviewQuestions } from './variantQuestions';
import {
  SEEDED_DOMAINS,
  baselineDefault,
  coveredIntents,
  firstConversationFacts,
  resumeOf,
  seedLines,
  type PortraitResume,
} from './portraitHandoff';
import { familyInterviewQuestions } from './familyQuestions';
import {
  goalFamily,
  journeyDefinition,
  journeyDefinitionsFor,
} from '../learning/library/definitions';
import { profileSignals } from '../learning/library/matchApproach';
import type { CoachOnboardingSummary } from '../onboarding/model';
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

/**
 * Resolve a `coachContent` string in the user's ACTIVE language (i18next core — no React), carrying
 * the user's FORM OF ADDRESS as context so gendered `_feminine`/`_masculine` variants resolve (base
 * key is the fallback — D31).
 *
 * `lng` resolves it in another language for this one call, without touching the app's. It is how a
 * coach turn is written in the CONVERSATION's language (see {@link CoachOrchestrator.say}); absent,
 * the app language, exactly as before.
 */
const cc = (key: string, lng?: string): string =>
  i18n.t(key, { ns: 'coachContent', context: addressContext(), ...(lng ? { lng } : {}) });
/** {@link cc} for the few strings that name something back to the user (a Journey, a goal). */
const ccWith = (key: string, vars: Record<string, string>, lng?: string): string =>
  i18n.t(key, { ns: 'coachContent', context: addressContext(), ...vars, ...(lng ? { lng } : {}) });
/**
 * Resolve a `coachContent` OPTIONS array in the active language, as a FRESH copy so callers can't
 * mutate the shared resource. The rendered option list AND the constant an answer is matched against
 * both come from THIS single source, so translating the labels never desyncs the exact-string match
 * in {@link processTypeFromAnswer} / {@link schedulingPreferenceFromAnswer}.
 */
const ccOptions = (key: string): string[] => [
  ...(i18n.t(key, { ns: 'coachContent', returnObjects: true }) as unknown as string[]),
];

/**
 * The human name of a Journey — its authored essence, in the user's language — falling back to the
 * definition id only when the library has no essence for it, which would be a content bug and is
 * better shown than silently blank.
 */
const journeyEssenceLabel = (definitionId: string, lng?: string): string => {
  const key = journeyDefinition(definitionId)?.variants[0]?.essenceKey;
  return key
    ? i18n.t(key, { ns: 'library', context: addressContext(), ...(lng ? { lng } : {}) })
    : definitionId;
};

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
  get prompt() {
    return cc('processType.prompt');
  },
  get options() {
    return ccOptions('processType.options');
  },
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
  intent: 'scheduling',
  get prompt() {
    return cc('scheduling.prompt');
  },
  get options() {
    return ccOptions('scheduling.options');
  },
  allowOther: true,
  multiSelect: false,
};

/** The stable id of the understanding check — the last thing asked before anything is built. */
export const CONFIRM_QUESTION_ID = 'meta.confirm';

/**
 * THE UNDERSTANDING CHECK (founder, 2026-09-14).
 *
 * The coach used to say what it had understood on the turn AFTER the interview ended — composed
 * from the whole conversation, well written, and worth nothing, because by then the plan was
 * already being built from it. A person who read it and thought "that is not what I meant" had
 * nowhere to put that.
 *
 * So it moved. This question carries the same reflection to the one moment where it can still
 * change the outcome, and adds the only thing that makes a reflection a CHECK: an answer that says
 * no. `allowOther` is true so the correction can be written straight into the same turn instead of
 * costing a round trip.
 *
 * `intent: 'variant'` because a synthetic meta question needs an intent that no `interview.*`
 * template voices over — this prompt is the composed understanding, and being replaced by a
 * catalogue string is precisely the failure this whole change exists to end.
 */
export const CONFIRM_QUESTION: DomainQuestion = {
  id: CONFIRM_QUESTION_ID,
  intent: 'variant',
  get prompt() {
    return cc('understandingCheck.prompt');
  },
  get options() {
    return ccOptions('understandingCheck.options');
  },
  allowOther: true,
  multiSelect: false,
};

/**
 * ONE QUESTION BUILT FROM ONE GAP IN THE PORTRAIT (the introduction, 2026-09-15).
 *
 * Free text and nothing else: the Portrait is built by TALKING, which is the whole reason the first
 * run's personal-details screen was replaced by a conversation. A set of cards here would be the
 * form again, with the coach reading it aloud.
 *
 * The authored prompt is the OFFLINE FALLBACK. On the ordinary path {@link CoachOrchestrator.voiced}
 * rewrites it so it follows from what the person just said; with no model reachable, this sentence
 * is still a real question and the conversation still works.
 *
 * `intent: 'variant'` for the same reason {@link CONFIRM_QUESTION} uses it — it is the one intent no
 * `interview.*` template voices over, and being replaced by a catalogue string from the planner's
 * slate is exactly what must not happen to these.
 */
function portraitGapQuestion(gap: PortraitGap, lng?: string): DomainQuestion {
  return {
    id: `portrait.${gap.field}`,
    intent: 'variant',
    // The conversation's language, not the app's: there are no cards here for a tap to be matched
    // against, and this sentence is both what the composer rephrases and what is shown without it.
    prompt: cc(`portrait.${gap.field}.prompt`, lng),
    options: [],
    allowOther: true,
    multiSelect: false,
  };
}

/**
 * What is asked after "Not quite." — free text only, because a correction that has to be chosen
 * from options we wrote is the same failure as the reflection it is correcting.
 */
export const CORRECTION_QUESTION: DomainQuestion = {
  id: 'meta.correction',
  intent: 'variant',
  get prompt() {
    return cc('understandingCheck.askCorrection');
  },
  options: [],
  allowOther: true,
  multiSelect: false,
};

// ── Public turn / state shapes ──────────────────────────────────────────────────

/**
 * The coach could not REACH a model for the understanding call — no session, no network, a timeout,
 * an HTTP error. It is not "the model had nothing useful to say"; it is "we never asked anybody".
 *
 * It exists so the surface can tell the truth. A coach with no connection must not quietly become a
 * worse coach: it cannot understand a goal, so it must not start an interview it can only finish by
 * guessing. The screen shows the person that the coach is unavailable and offers to try again
 * ({@link ../../components/coach/useLiveCoach}); the orchestrator stays retryable.
 */
export class CoachUnavailableError extends Error {
  /** The underlying transport/config failure (an `LlmError`, usually). Never shown to the user. */
  constructor(readonly reason?: unknown) {
    super('The coach could not reach the server.');
    this.name = 'CoachUnavailableError';
  }
}

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
  /**
   * THE NAME (introduction only). The first thing the first conversation learns, because the screen
   * that used to ask for it left the flow and nothing replaced it. There is no question object here
   * — the composer is simply open, exactly as it is for the opening.
   */
  | 'name'
  | 'goal'
  | 'focus'
  | 'processType'
  /** The expert's DIAGNOSIS — which family of Journeys this goal actually belongs to. */
  | 'diagnosis'
  | 'journeyFit'
  | 'journeyChoice'
  | 'questions'
  /**
   * THE INTRODUCTION'S OWN PHASE (2026-09-15). Not `questions`: there is no slate and no pointer
   * here, only a {@link ./portrait Portrait} with holes in it. What is asked next is whichever hole
   * is worth the most, re-derived after every message, and the conversation ends when the picture is
   * good enough rather than when a list is empty.
   */
  | 'portrait'
  | 'scheduling'
  /**
   * THE UNDERSTANDING CHECK — the coach says what it understood and asks whether that is right,
   * BEFORE the plan is built (founder, 2026-09-14). "Not quite" does not acknowledge a correction;
   * it re-reads the whole conversation and rebuilds what is known from it.
   */
  | 'confirm'
  /** Awaiting the free-text correction that follows a "not quite". */
  | 'correcting'
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
  /** The Coach is asking for a newly phrased goal; the UI should reopen its free-text composer. */
  awaitingGoalText?: boolean;
  /**
   * THE NAME the person just gave, on the one turn that learns it (introduction mode).
   *
   * Surfaced rather than written: the core is framework-free and the name belongs in the profile,
   * which is React state the screen owns. Absent whenever nothing was understood — which is a normal
   * outcome and never an error, and the screens that greet by name already carry a second, complete
   * sentence for it.
   */
  personalName?: string;
  /**
   * THE PORTRAIT (דיוקן) as it stands after this turn, in `introduction` mode.
   *
   * Surfaced rather than written, exactly like {@link personalName}: the core is framework-free and
   * this belongs in `AppState`, which the screen owns the door to. Absent in `planning` mode and on
   * any turn that did not read the conversation.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. Never logged, never sent, never copied into an event.
   */
  portrait?: Portrait;
  /**
   * Why this turn did what it did, when TECHNICAL MODE is on (see {@link ./technicalMode}). Empty
   * or absent otherwise.
   *
   * DISPLAY-ONLY, and that is load-bearing: these lines are never pushed to {@link history}, so the
   * model never reads its own commentary back as if the user had said it.
   */
  technicalNotes?: TechnicalNote[];
}

/**
 * What the person WROTE to cause a turn (never a tap). Read for a request to change language, and
 * handed to the composer when nothing else carries their words.
 */
interface TypedMessage {
  text: string;
  /** Hand the words to the composer even when they name no language — the no-goal re-invite. */
  quote?: boolean;
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

/**
 * WHICH CONVERSATION THIS IS (D105).
 *
 * `planning` is the Coach tab and everything this file did before the mode existed: understand the
 * goal, diagnose, match a Journey, ask what the Planner needs, build a {@link GoalSpec}.
 *
 * `introduction` is the FIRST RUN, and the decision it implements is that the first conversation
 * chooses and builds NOTHING — it meets the person. That is not a lighter version of planning. The
 * first run inherited the planner's slate, and three of that slate's questions (`time`, `horizon`,
 * `scheduling`) are the D102 EXACT intents {@link ./readConversation} deliberately refuses to strike
 * off from ordinary language — so they were exactly the ones that survived to the end of every
 * conversation. The last third of the first run was "how many minutes a week / how long / which
 * days", which is the questionnaire the founder felt on 2026-09-15.
 *
 * Dropping those questions is only half of it. The mode must ALSO build nothing: a planner that
 * loses its time and horizon answers but still builds silently falls back to an eight-week default
 * with no capacity, which is the precise failure {@link ./horizonQuestion} was written to end.
 */
export type CoachMode = 'introduction' | 'planning';

/** Construction options — inject the LlmClient (tests use MockLlmClient); everything else defaults. */
export interface CoachOrchestratorOptions {
  /**
   * Which conversation this is — see {@link CoachMode}. Defaults to `planning`, so every caller that
   * existed before the mode did behaves exactly as it did.
   */
  mode?: CoachMode;

  /**
   * The name they are called, when it is known. Threaded in rather than read
   * here because the core is framework-free and the name lives in the profile
   * the screen already holds. Absent is normal — the character reads correctly
   * without it and never invents one.
   */
  firstName?: string | null;

  /** The completion seam. Required. Used ONLY for triage classification (and optional "Other" parse). */
  llm: LlmClient;
  /** The editable interview script; defaults to {@link INTERVIEW_PLAYBOOK} (opening + closing copy). */
  playbook?: InterviewPlaybook;
  /** Optional outbound safety guard applied to every coach message; defaults to identity. */
  guard?: CoachMessageGuard;
  /**
   * The user's ACTIVE language code (e.g. `he`), threaded into the one understanding call so the model
   * reads a non-English opening in that language and keeps each goal `title` in it — while STILL
   * classifying `domain`/`kind` into the fixed English enum tokens. Absent/`en` ⇒ default English.
   */
  locale?: string;
  /**
   * What onboarding already learned about this person, used for ONE thing here: to skip a chosen
   * Journey's variant question when the profile has already answered it (D62 §2). Absent ⇒ nothing
   * is known and the question is asked, which is the correct behaviour at cold start rather than a
   * degraded one.
   */
  profile?: CoachOnboardingSummary | null;
  /**
   * The VOICE the coach speaks in — the user's own choice, mapped from their communication profile
   * through `profileToCoachStyle`.
   *
   * Until 2026-08-24 this was fixed to `steady` for everybody, which meant the whole Communication
   * Style feature changed nothing a person could hear: they answered six comparisons, saw a
   * confirmation screen, and the coach went on talking exactly as before. That is the PRD's own
   * Acceptance Criterion #4, and it was the one thing missing. Absent ⇒ `steady`, which is both the
   * old behaviour and the right default for somebody who has not chosen.
   */
  styleId?: CommunicationStyleId;
  /**
   * WHAT THE FIRST CONVERSATION UNDERSTOOD (Stage 1 of
   * `04_Product/Planning_From_Portrait_Plan_2026-09-16.md`), handed to the SECOND one so it does not
   * restart discovery from zero.
   *
   * `planning` only. The introduction is the conversation that BUILDS the Portrait, and it is
   * ignored there. Absent, or too thin to open from ({@link ./portraitHandoff resumeOf}), and the
   * conversation is exactly today's, request for request.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. Its lines reach the goal-reading and composing calls that
   * already carry what the person says; never a log, an event or a technical note.
   */
  portrait?: Portrait | null;
}

// ── The orchestrator ────────────────────────────────────────────────────────────

/**
 * A stateful, single-interview dialogue manager. Construct one per Journey the user is shaping.
 * Primary drive: {@link start} → {@link triage} → repeated {@link selectOption} / {@link answerOther}.
 * The legacy {@link chooseBranch} / {@link respond} pair is kept for the not-yet-rewritten harness.
 */
export class CoachOrchestrator {
  /** Which conversation this is (D105). Decided at construction and never changes. */
  private readonly mode: CoachMode;
  private readonly llm: LlmClient;
  private readonly playbook: InterviewPlaybook;
  private readonly guard?: CoachMessageGuard;
  /** The user's active language code, threaded into the understanding call's locale directive. */
  private readonly locale?: string;
  /** The onboarding profile, read only to decide which variant questions still need asking. */
  private readonly profile?: CoachOnboardingSummary | null;
  /**
   * The name they are called. NOT readonly since 2026-09-15: in `introduction` mode the first thing
   * the conversation does is ask, and a name learned on turn one has to reach the composer that
   * writes turn two. Every other path still sets it once, at construction.
   */
  private firstName: string | null;
  /**
   * TECHNICAL MODE (2026-08-27). Off by default. While on, every turn carries the reasoning behind
   * it — read by the domain expert who authored the trees, who otherwise has no way to see whether
   * what he designed is what actually ran.
   */
  private technicalMode = false;
  /** Notes gathered during the CURRENT turn; drained by {@link takeNotes} as the turn is returned. */
  private notes: TechnicalNote[] = [];

  /** The steady meta-agent tone, composed onto the coach persona for triage. */
  private readonly styleFragment: string;

  private readonly history: LlmMessage[] = [];
  private phase: CoachPhase = 'opening';
  /** True once the understanding check has been asked — so the landing turn does not reflect twice. */
  private understandingChecked = false;
  /**
   * The interview's answers, set aside while a correction is being rebuilt from. Present ONLY during
   * a rebuild, and the signal {@link reread} uses to tell one from an ordinary turn.
   */
  private answersBeforeRebuild?: Record<string, string | string[]>;

  private expert?: DomainExpert;
  private activeExpert?: ActiveExpert;
  private goal?: GoalInput;

  // ── The diagnosis (career, today) ────────────────────────────────────────────
  /** The tree being walked, or undefined when this goal has no diagnosis to run. */
  private diagnosisTree?: CareerDiagnosisTree;
  /** Answers to the tree's questions so far, keyed by question id. Closed values only. */
  private diagnosisAnswers: CareerDiagnosisAnswers = {};
  /** What the opening message already established, so those questions are never asked. */
  private knownSignals: CareerKnownSignals = {};
  private journeyFitQuestion?: DomainQuestion;
  private journeyFitAxisId?: string;
  private journeyFitValueIds: string[] = [];
  private familyAnswers: Record<string, string> = {};
  private journeyChoiceQuestion?: DomainQuestion;
  private journeyChoiceDefinitionIds: string[] = [];
  private questions: DomainQuestion[] = [];
  /** The question currently on the table. There is no index: the slate is a set (D103). */
  private pending?: DomainQuestion;

  // ── The Portrait (introduction only) ─────────────────────────────────────────
  /**
   * WHAT WE UNDERSTAND ABOUT THE PERSON so far (דיוקן). Empty in `planning` mode, forever: the
   * Coach tab is building a plan for somebody we have already met.
   */
  private portrait: Portrait = emptyPortrait();
  /** The gap the question on the table was built from, so a re-read knows what is being asked. */
  private pendingGap?: PortraitFieldId;
  /** The question on the table in `portrait` phase. */
  private portraitQuestion?: DomainQuestion;
  /**
   * How many consecutive turns have added nothing at medium confidence or better. Two is where the
   * introduction stops, because a third question to somebody who is not telling us anything is an
   * interrogation rather than a conversation (see {@link ./portrait/gaps readyToFinish}).
   */
  private quietPortraitTurns = 0;
  /**
   * The Portrait set aside while a correction is being rebuilt from — the exact counterpart of
   * {@link answersBeforeRebuild}, and it comes back untouched when the re-read cannot run.
   */
  private portraitBeforeRebuild?: Portrait;
  private readonly answers: InterviewAnswers = {};

  // ── The handoff from the first conversation (planning only) ──────────────────────────────────
  /**
   * The Portrait this conversation opened from, and what it opened with. Undefined in
   * `introduction` mode, and whenever the Portrait was absent or too thin to open from — which is
   * what keeps those conversations byte-identical to what they were.
   */
  private readonly handoff?: { portrait: Portrait; resume: PortraitResume };
  /**
   * True once the goal read in THIS conversation is the domain the Portrait is about. Nothing from
   * the Portrait reaches a request, the question queue or the spec until it is: somebody who says
   * "actually I want to get fit" gets today's conversation for that, with the Portrait untouched.
   */
  private continuing = false;
  /** The interview intents the Portrait already answers, while {@link continuing}. Empty otherwise. */
  private covered: ReadonlySet<QuestionIntent> = new Set<QuestionIntent>();
  /** How many turns have handed something back, so the character's budget can be respected. */
  private reflections = 0;
  /**
   * The language the PERSON is writing in, decided once from their opening message.
   *
   * The app's language decides the interface; it does not decide what somebody types. The founder
   * wrote to the coach in Hebrew inside an English install on 2026-09-07 and was answered in
   * English, which is the app talking past the person in front of it.
   *
   * DECIDED ONCE FROM THE OPENING, deliberately. Reading it afresh per message would swing the
   * conversation on a single English word inside a Hebrew sentence — a brand name, a job title —
   * which is worse than being wrong consistently.
   *
   * ── REFINED 2026-09-17, DELIBERATELY: THE PERSON CAN STILL CHANGE IT ─────────────────────────
   *
   * D101 exists so the coach speaks the person's language. It was never meant to lock them out of
   * it, and on the founder's device test it did exactly that: "Can I answer in Hebrew?" in an
   * English conversation was answered "I can only communicate in English". So after the opening the
   * language still changes, but only on a clear signal, never on a stray word:
   *  · they PLAINLY WRITE in the other language ({@link plainlyWrittenLocale}, deterministic — see
   *    there for why the bar is lower for Hebrew than for English); or
   *  · they ASK for it in words ({@link namedLocales}) AND the composer, reading that request, wrote
   *    its turn in the language asked for ({@link voiced}). No extra model call: the request is read
   *    by the call that already writes the turn, and the engine only follows what came back.
   * Tapped cards never count. They are rendered in the APP language, so tapping one says nothing
   * about what the person writes in.
   */
  private conversationLocale?: string;
  /** True once the opening message has decided {@link conversationLocale}; later messages only switch it. */
  private openingLocaleRead = false;
  /**
   * How many messages IN A ROW understanding has read no goal from. The first gets a free-text
   * re-invite; only the second gets the closed process-type card (founder, 2026-09-17: a question
   * such as "Can I answer in Hebrew?" is not a goal, and a closed card on turn one is the "closed
   * questions too early" he has asked us to stop).
   */
  private goalMisses = 0;

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
    this.mode = options.mode ?? 'planning';
    this.llm = options.llm;
    this.playbook = options.playbook ?? INTERVIEW_PLAYBOOK;
    this.guard = options.guard;
    this.locale = options.locale;
    this.profile = options.profile;
    this.firstName = options.firstName ?? null;
    this.styleFragment = getStyle(options.styleId ?? DEFAULT_STYLE_ID).systemPromptFragment ?? '';
    // A BELT, like the ones in {@link beginDiagnosis} and {@link beginExpertQuestions}. The
    // introduction is the conversation that BUILDS the Portrait; handing it one to continue from
    // would have it skip the very questions it exists to ask. So a Portrait passed to it is ignored.
    const resume = this.mode === 'planning' ? resumeOf(options.portrait) : undefined;
    if (resume && options.portrait) {
      this.handoff = { portrait: clonePortrait(options.portrait), resume };
    }
  }

  /** The opening greeting, which asks the user for their goal in free text. No model call. */
  start(): OpeningTurn {
    if (this.phase !== 'opening') {
      throw new Error('CoachOrchestrator.start() was already called');
    }
    // THE INTRODUCTION OPENS BY ASKING WHAT TO CALL THEM (spec §6). Deterministic copy, no model
    // call — this is the app's first sentence and it must be there with the screen.
    this.phase = this.mode === 'introduction' ? 'name' : 'goal';
    const coachMessage = this.applyGuard(
      this.mode === 'introduction' ? cc('introduction.namePrompt') : this.planningOpening(),
    );
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      choices: this.playbook.choices.map((choice) => ({ ...choice })),
      state: this.snapshot(),
    };
  }

  /**
   * THE SECOND CONVERSATION'S FIRST LINE. No model call, so it is there with the screen.
   *
   * Something they SAID is quoted back to them. Something we only INFERRED is remembered in the
   * coach's own voice, as its reading, and never put in quotation marks as if they had said it. With
   * no Portrait to open from, it is exactly today's playbook line.
   */
  private planningOpening(): string {
    const resume = this.handoff?.resume;
    if (!resume) return this.playbook.opening;
    return ccWith(resume.stated ? 'planning.resume.openingStated' : 'planning.resume.openingUnquoted', {
      want: resume.want,
    });
  }

  /**
   * Whether this conversation opened from the Portrait (read by the surface, which marks the handoff
   * used once a Journey is built from it, so the next planning conversation opens fresh).
   */
  isResumed(): boolean {
    return this.handoff !== undefined;
  }

  /**
   * UNDERSTANDING: read the user's free-text opening (one LLM call) and distil the distinct goals it
   * describes ({@link extractGoals}). The only model call of the interview proper. Then branch:
   *   • several goals → a FOCUS turn (the user picks which ONE to build first; the rest are deferred);
   *   • exactly one  → straight into that goal's expert questions;
   *   • none usable  → a free-text re-invite the first time; the FALLBACK process-type question
   *                    only when a second message in a row still holds no goal.
   * Named `triage` for continuity; it now understands rather than merely classifies.
   */
  /** Turn the commentary on or off. Changes nothing about what the coach decides — only what it says. */
  setTechnicalMode(on: boolean): void {
    this.technicalMode = on;
    if (!on) this.notes = [];
  }

  /** Whether the commentary is currently on. */
  isTechnicalMode(): boolean {
    return this.technicalMode;
  }

  /**
   * Whether this is the INTRODUCTION (D105) — read by the surface, which behaves differently when a
   * conversation ends with nothing to build. Asked of the orchestrator rather than passed beside it,
   * so the screen and the engine can never disagree about which conversation this is.
   */
  isIntroduction(): boolean {
    return this.mode === 'introduction';
  }

  /** Record one note, when the mode is on. A no-op otherwise, so callers need no branch. */
  private note(title: string, fields: Record<string, string | number | undefined | null> = {}): void {
    if (this.technicalMode) this.notes.push(noteOf(title, fields));
  }

  /**
   * A goal title as a technical note may show it. Unchanged in a conversation with no Portrait. In one
   * that opened from the Portrait a title can be the Portrait's own words (the reading is told to
   * title a "yes, still that" from it), and a note may name fields, never carry their values.
   */
  private noteTitle(title: string): string {
    return this.handoff ? '(not shown: it may carry words from the Portrait)' : title;
  }

  /** Hand the turn its notes and clear the buffer, so nothing is ever reported twice. */
  private takeNotes(): TechnicalNote[] | undefined {
    if (this.notes.length === 0) return undefined;
    const taken = this.notes;
    this.notes = [];
    return taken;
  }

  async triage(goalText: string): Promise<CoachTurn> {
    // The introduction's first message is not a goal — it is a name. Same entry point, because the
    // surface has one composer and one send, and which message this is belongs to the engine.
    if (this.phase === 'name') {
      const said = goalText.trim();
      return this.voiced(await this.readPersonalName(said), { text: said });
    }
    if (this.phase !== 'goal') {
      throw new Error('Describe the goal after start(), and triage() only once');
    }
    const text = goalText.trim();
    // Their first words in their own language, before anything is interpreted. A LATER goal message
    // (after a re-invite, or after no Journey matched) only switches it on a clear signal — see
    // {@link conversationLocale}.
    if (this.openingLocaleRead) this.followWrittenLanguage(text);
    else this.conversationLocale = writtenLocale(text);
    this.history.push({ role: 'user', content: text });

    let goals: UnderstoodGoal[];
    try {
      goals = await this.understand(text);
    } catch (e) {
      // The coach could not reach a model. Leave the orchestrator EXACTLY where it was — still in
      // `goal`, with the unanswered line taken back out of the history — so the same instance can be
      // retried without the opening being counted twice.
      this.history.pop();
      throw e;
    }
    this.openingLocaleRead = true;
    const typed: TypedMessage = { text };

    this.note('Understanding the opening message', {
      'goals detected': goals.length,
      'each one': goals.map((g) => `${this.noteTitle(g.title)} (${g.domain}, ${g.kind})`).join(' | ') || undefined,
    });

    if (goals.length === 0 && this.handoff) {
      // "Yes, still that" is not a goal on its own, and the reading may say so. But this person was
      // just asked whether the goal we remembered is still the one, so the closed process-type card
      // would be the coach forgetting the question it asked. The remembered goal is the answer.
      this.note('No goal read from the reply; continuing with the one from the first conversation', {
        'read from': 'the Portrait (primaryWant, domain)',
      });
      this.goalMisses = 0;
      return this.voiced(
        this.activateGoal(
          { title: this.handoff.resume.want, kind: 'process', domain: this.handoff.resume.domain as DomainId },
          [],
        ),
        typed,
      );
    }

    if (goals.length === 0 && this.goalMisses === 0) {
      // NOT A GOAL, FOR THE FIRST TIME (founder, 2026-09-17). "Can I answer in Hebrew?" is a
      // question, and answering it with a closed "habit or process" card on turn one is the "closed
      // questions too early" he keeps pointing at. Answer what they asked (the composer does that
      // first, and is handed their words to do it) and invite the goal again in their own words.
      // Same shape in both modes, and it touches nothing: no expert, no catalogue, no spec.
      this.goalMisses = 1;
      this.note('No goal read from this message', {
        'what happens now': 'answer anything they asked, and invite the goal again in their own words',
        'the closed card': 'only if the next message holds no goal either',
      });
      return this.voiced(this.reinviteGoal(), { ...typed, quote: true });
    }

    if (goals.length === 0) {
      // Understanding produced nothing usable TWICE IN A ROW — keep the demoted process-type
      // question as a fallback so the user can still tell us the shape, and route to the general
      // expert. It is what makes the conversation reachable when understanding keeps failing, and it
      // needs no model at all. In `introduction` mode the card's answer leads to the Portrait, never
      // to an expert or the catalogue (the belt in {@link beginExpertQuestions}).
      this.goalMisses += 1;
      this.spec.title = text;
      this.spec.domain = 'general';
      return this.voiced(this.askProcessTypeFallback(), typed);
    }

    this.goalMisses = 0;
    if (goals.length > 1) {
      // Several distinct goals — focus the user on ONE first before interviewing.
      this.understoodGoals = goals;
      return this.voiced(this.askFocusChoice(goals), typed);
    }

    // A single goal — no need to focus; activate it and start its expert's questions.
    //
    // THE INTRODUCTION READS THE OPENING BEFORE IT ASKS ANYTHING. Somebody who writes "I have been
    // in marketing eight years, I am burned out and I have no idea what else" has just filled half
    // the Portrait, and asking them where they are starting from would be the questionnaire again.
    // `reread` is the same async seam the interview already uses after every message.
    return this.voiced(await this.rereadIntroduction(this.activateGoal(goals[0], [])), typed);
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
    return this.voiced(await this.reread(this.record(question, answer)));
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
    const answer = text.trim();
    // Written, not tapped — so it may say which language they are writing in now.
    this.followWrittenLanguage(answer);
    const typed: TypedMessage = { text: answer };
    // ONE CALL PER MESSAGE (founder, 2026-08-21). During the diagnosis a sentence usually answers more
    // than the question in front of it, so it is read for EVERY signal it supports and the tree skips
    // all of them at once. Everywhere else a free-text answer is stored verbatim, exactly as before.
    if (this.phase === 'diagnosis') {
      return this.voiced(await this.readSpokenDiagnosisAnswer(question, answer), typed);
    }
    // The focus pick is a choice between goals they named themselves, so a sentence has to be placed
    // back onto one of them before it means anything.
    if (this.phase === 'focus') return this.voiced(await this.readSpokenFocusPick(answer), typed);
    return this.voiced(await this.reread(this.record(question, answer)), typed);
  }

  /**
   * Read a spoken answer during the diagnosis: one call, every signal it supports, then continue.
   *
   * WHY THIS EXISTS AT ALL, and it is not only polish: before it, typing instead of tapping recorded
   * nothing. The tree could not match a sentence to a closed option, so the diagnosis simply ended
   * with no outcome — the person had answered and the coach had heard nothing.
   *
   * A call that fails changes nothing rather than guessing: the same question is asked again, with
   * the cards still there. That is a worse conversation and a correct one.
   */
  private async readSpokenDiagnosisAnswer(
    question: DomainQuestion,
    answer: string,
  ): Promise<CoachTurn> {
    this.history.push({ role: 'user', content: answer });
    let signals: Record<string, string> = {};
    try {
      const result = await this.llm.complete({
        system: DIAGNOSIS_SIGNAL_SYSTEM_PROMPT,
        json: true,
        temperature: 0,
        messages: [
          { role: 'user', content: buildDiagnosisDirective(question.prompt, answer) },
        ],
      });
      signals = parseDiagnosisSignals(result.text);
    } catch {
      // No session, no network, a provider error. Nothing was understood, and nothing is invented.
      signals = {};
    }

    this.knownSignals = { ...this.knownSignals, ...signals };
    const tree = this.diagnosisTree;
    if (!tree) return this.settleDiagnosis();
    const next = nextDiagnosisQuestion(tree, this.diagnosisAnswers, this.knownSignals);
    return next ? this.askDiagnosisQuestion(next) : this.settleDiagnosis();
  }

  /**
   * Read a TYPED answer to the focus pick: which of their own goals did they just choose?
   *
   * Modelled on {@link readSpokenDiagnosisAnswer} deliberately, including the part that matters
   * most: the model returns a POSITION, the engine checks it against the goals it actually offered
   * ({@link parseFocusChoice}), and a reading it cannot place changes NOTHING — the same question
   * stands, with its cards still there. Choosing wrongly here would build one goal and park the one
   * they came for, which is a silent failure they would have no way to see.
   */
  private async readSpokenFocusPick(answer: string): Promise<CoachTurn> {
    const options = this.focusQuestion?.options ?? [];
    this.history.push({ role: 'user', content: answer });
    let index: number | null = null;
    try {
      const result = await this.llm.complete({
        system: FOCUS_SYSTEM_PROMPT,
        json: true,
        temperature: 0,
        messages: [{ role: 'user', content: buildFocusDirective(options, answer) }],
      });
      index = parseFocusChoice(result.text, options.length);
    } catch {
      // No session, no network, a provider error. Nothing was understood, and nothing is chosen.
      index = null;
    }

    if (index === null) {
      this.note('The focus answer could not be placed', {
        'what happens now': 'the same question stands, with the goals still on offer',
        why: 'choosing for them would build one goal and park the one they came for',
      });
      const coachMessage = this.applyGuard(this.playbookLine('focus.intro', this.playbook.focus.intro));
      this.history.push({ role: 'model', content: coachMessage });
      return {
        coachMessage,
        state: this.snapshot(),
        technicalNotes: this.takeNotes(),
        done: false,
        question: cloneQuestion(this.focusQuestion ?? buildFocusQuestion(this.understoodGoals, this.playbook.focus)),
      };
    }

    this.note('Focus chosen in their own words', {
      chose: this.noteTitle(options[index]),
      'read from': 'what they typed, mapped back onto the goals we offered',
    });
    const chosen = this.understoodGoals[index];
    const deferred = this.understoodGoals.filter((_, i) => i !== index);
    return this.rereadIntroduction(this.activateGoal(chosen, deferred));
  }

  /**
   * The introduction's async seam: read the conversation into the Portrait before the turn is said.
   * A no-op in `planning` mode, which is what keeps that path byte-identical.
   */
  private async rereadIntroduction(turn: CoachTurn): Promise<CoachTurn> {
    return this.mode === 'introduction' ? this.readPortraitTurn(turn) : turn;
  }

  /**
   * READ THE NAME, then open the conversation properly (introduction mode).
   *
   * One call, one job, and it may only report a name the person actually typed — {@link
   * parsePersonalName} checks it against their own message before it is kept. A call that fails
   * changes nothing except that there is no name: the offline fallback below reads a one-word
   * answer literally, which is not a guess (it is what they wrote), and anything else simply moves
   * on without one.
   *
   * IT NEVER RE-ASKS. A conversation that keeps asking for a name until it understands one is a
   * worse door than a coach that gets on with it, and with the model down it would never stop.
   */
  private async readPersonalName(said: string): Promise<CoachTurn> {
    this.history.push({ role: 'user', content: said });
    let name: string | null = null;
    try {
      const result = await this.llm.complete({
        system: NAME_SYSTEM_PROMPT,
        json: true,
        temperature: 0,
        messages: [{ role: 'user', content: buildNameDirective(said) }],
      });
      name = parsePersonalName(result.text, said);
    } catch {
      // No session, no network, a provider error. Nothing was understood, and nothing is invented.
      name = null;
    }
    name = name ?? literalName(said);
    if (name) {
      // The composer writes every turn from here on and is told who it is talking to. A name learned
      // on turn one that never reached it would be a name nobody ever hears.
      this.firstName = name;
      this.note('Name understood', { name, 'where it goes': 'the profile, through the screen' });
    } else {
      this.note('No name understood', {
        'what happens now': 'the conversation continues without one, and nothing is invented',
      });
    }

    this.phase = 'goal';
    // Their first words, in their own language, before anything is interpreted.
    this.conversationLocale = writtenLocale(said);
    const coachMessage = this.applyGuard(
      name ? this.sayWith('introduction.openingNamed', { name }) : this.say('introduction.opening'),
    );
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      // The composer reopens: what follows is the broad opening, answered in their own words.
      awaitingGoalText: true,
      ...(name ? { personalName: name } : {}),
    };
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /**
   * UNDERSTAND the free-text opening via the meta-agent (one LLM call): return the distinct goals it
   * describes, each with a validated domain + kind ({@link extractGoals}).
   *
   * THIS USED TO SWALLOW EVERY FAILURE and return an empty list, which put a call we never made and
   * an answer we could not use into the same box. They are not the same thing:
   *  · the model ANSWERED and its answer held no usable goal ⇒ {@link extractGoals} returns `[]`
   *    without throwing, and the demoted process-type question is exactly the right fallback;
   *  · the call never reached a model at all (no session, no network, a timeout, an HTTP error) ⇒
   *    there is nothing to fall back ONTO, and pretending otherwise is how a person's message became
   *    the title of a Journey they never asked for (partner, 2026-08-20).
   *
   * So a throw stays a throw, re-labelled {@link CoachUnavailableError} for the surface to recognise.
   * `extractGoals` never throws, so anything caught here is genuinely the call, never the answer.
   */
  private async understand(goalText: string): Promise<UnderstoodGoal[]> {
    const system = [
      this.styleFragment,
      coachSystemPrompt({ firstName: this.firstName }),
      TRIAGE_SYSTEM_PROMPT,
      // The language they are WRITING in, once the opening has shown it — not the app's. A Hebrew
      // message in an English install is read as Hebrew, and its goal title is kept in Hebrew.
      buildLocaleDirective(this.conversationLocale ?? this.locale),
    ]
      .filter((s) => s.length > 0)
      .join('\n\n');
    let result;
    try {
      result = await this.llm.complete({
        system,
        json: true,
        temperature: 0,
        messages: [
          ...this.history,
          {
            role: 'user',
            content: buildTriageDirective(
              goalText,
              this.handoff ? seedLines(this.handoff.portrait) : undefined,
            ),
          },
        ],
      });
    } catch (cause) {
      throw new CoachUnavailableError(cause);
    }
    return extractGoals(result.text);
  }

  /**
   * Activate the CHOSEN goal: set its title, domain and inferred `processType` (from its kind), store
   * any DEFERRED goals on the spec, then begin the expert's questions. Called for a single understood
   * goal and for the goal the user picks on the focus turn.
   */
  private activateGoal(goal: UnderstoodGoal, deferred: UnderstoodGoal[]): CoachTurn {
    const known = Object.entries(goal.signals ?? {})
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(', ');
    this.note('Goal activated', {
      title: this.noteTitle(goal.title),
      domain: goal.domain,
      'kind (shapes the plan)': goal.kind,
      'already known from their message': known || 'nothing — everything will be asked',
      'other goals parked': deferred.length > 0 ? deferred.map((g) => this.noteTitle(g.title)).join(' | ') : undefined,
    });
    this.spec.title = goal.title;
    this.spec.domain = goal.domain;
    // What their own message already said. Read before anything is asked, which is the point.
    this.knownSignals = goal.signals ?? {};
    this.spec.processType = goal.kind; // INFERRED from understanding: 'recurring' | 'process'
    this.spec.isHabit = goal.kind === 'recurring';
    this.continueFromPortrait(goal.domain);
    if (deferred.length > 0) {
      this.spec.deferredGoals = deferred.map(
        (g): DeferredGoal => ({ title: g.title, processType: g.kind, domain: g.domain }),
      );
    }
    // ── THE INTRODUCTION LEARNS THE PERSON, NOT THE CATALOGUE ────────────────────────────────
    //
    // The founder's words on 2026-09-15: the introduction gets to know the user INDEPENDENTLY of
    // which Journeys exist in the app. Three phases below this line exist only to choose from that
    // catalogue — the career DIAGNOSIS picks a family, `journeyFit` asks an axis inside one, and
    // `journeyChoice` offers the eligible entries. All three are matching, and matching is the
    // SECOND conversation (D105).
    //
    // It also has to be true for somebody whose goal has no authored Journey at all: three of our
    // four domains have almost none, and an introduction that felt different depending on what
    // happens to be in the library is the opposite of getting to know somebody. So the introduction
    // takes NO library lookup, NO consultation and NO diagnosis.
    //
    // ── AND NO DOMAIN EXPERT EITHER (founder, 2026-09-15) ────────────────────────────────────────
    //
    //   > מומחה התחום רלוונטי רק לשלב בניית המסעות — לא לשלב שיחת ההיכרות ולא לאונבורדינג.
    //
    // This corrects what shipped a day earlier, which took the introduction's four questions from
    // `expert.interviewQuestions()`. Those questions are a plan's questions — the same four every
    // expert asks before building one — and they are a dependency on which experts exist. The
    // introduction now asks what a PORTRAIT is missing instead, which depends on nothing but the
    // person in front of it.
    if (this.mode === 'introduction') return this.beginPortrait();
    return this.beginDiagnosis() ?? this.beginExpertQuestions();
  }

  /**
   * Decide whether the goal read NOW is the one the Portrait is about, and if so which interview
   * intents it already answers. Deterministic, so it holds with every model call failing.
   *
   * Only this conversation's reading switches it on. A career Portrait with a fitness goal read now
   * is not a career conversation, and nothing from the Portrait may reach it.
   */
  private continueFromPortrait(domain: DomainId): void {
    const handoff = this.handoff;
    this.continuing =
      handoff !== undefined &&
      handoff.resume.domain === domain &&
      (SEEDED_DOMAINS as readonly string[]).includes(domain);
    this.covered = this.continuing && handoff ? coveredIntents(handoff.portrait) : new Set<QuestionIntent>();
    if (!handoff) return;
    // NAMES ONLY. A technical note is read on a device by a tester; nothing the person said reaches it.
    this.note(this.continuing ? 'Continuing from the first conversation' : 'Not continuing from the first conversation', {
      'goal domain now': domain,
      'Portrait domain': handoff.resume.domain,
      'already answered (never asked)': this.continuing ? [...this.covered].join(', ') || 'nothing' : undefined,
      'always asked': this.continuing ? 'time, horizon, scheduling, milestones, Journey version' : undefined,
      why: this.continuing ? undefined : 'the goal read now is a different domain; the Portrait is left untouched',
    });
  }

  /**
   * Run the expert's DIAGNOSIS first, when the domain has one and this goal is what it diagnoses.
   *
   * ── WHY THIS COMES BEFORE THE EXPERT'S OWN QUESTIONS ───────────────────────────────────────────
   *
   * Because it decides which JOURNEY the person gets, and the expert's questions only shape one. Up
   * to now the Career expert asked four fixed questions and everybody got the same arc, while
   * twenty-seven authored Career Journeys sat in the library unreachable — "I apply and nobody
   * answers" is a symptom with at least five different causes, and treating the wrong one is exactly
   * how a job search stays busy and stays stuck.
   *
   * ── AND WHY IT IS GATED ON AN ACTIVE SEARCH ────────────────────────────────────────────────────
   *
   * The one authored tree diagnoses a job search. Running it on "I want to be promoted" would ask
   * somebody about applications they are not sending. So it runs when the opening message said the
   * search is active — and when the message said nothing either way, the tree's own first question
   * (the target) is a fair thing to ask a career goal, so it still runs. `activeJobSearch: no` is the
   * only answer that skips it, because that is the one case we know it is wrong for.
   *
   * Returns null when there is no diagnosis to run, so the caller falls through unchanged.
   */
  private beginDiagnosis(): CoachTurn | null {
    // A SECOND BELT. {@link activateGoal} already goes straight to the questions in `introduction`
    // mode, so nothing reaches here today — but the diagnosis is the entrance to every matching
    // phase (`journeyFit` and `journeyChoice` are only reachable through it), and a future caller
    // that wires a new path into it must not quietly let the introduction start matching again.
    if (this.mode === 'introduction') {
      this.note('Diagnosis skipped', {
        reason: 'this is the INTRODUCTION — it chooses no Journey (D105)',
        'what happens instead': 'the coach gets to know them; matching is a later conversation',
      });
      return null;
    }
    if (this.spec.domain !== 'career') {
      this.note('Diagnosis skipped', {
        reason: `no authored diagnosis tree for domain "${this.spec.domain}" — only career has one`,
        consequence: 'the expert\u2019s own questions run, and the plan is the generic arc',
      });
      return null;
    }
    if (this.knownSignals.activeJobSearch === 'no') {
      this.note('Diagnosis skipped', {
        reason: 'the opening message said the job search is NOT active',
        why: 'the one authored tree diagnoses a job search; running it here would ask about applications nobody is sending',
      });
      return null;
    }
    this.note('Diagnosis starting', {
      tree: 'career — apply, no response',
      'answers already in hand': Object.entries(this.knownSignals).map(([k, v]) => `${k}=${String(v)}`).join(', ') || 'none',
    });

    this.diagnosisTree = APPLY_NO_RESPONSE;
    this.diagnosisAnswers = {};
    const question = nextDiagnosisQuestion(this.diagnosisTree, this.diagnosisAnswers, this.knownSignals);
    // Everything it would have asked was already answered in the opening message — which is the best
    // possible outcome and not a failure: settle it now and go straight on.
    if (!question) return this.settleDiagnosis();

    this.phase = 'diagnosis';
    return this.askDiagnosisQuestion(question);
  }

  /** Surface one diagnosis question, in the partner's own words plus the free-text escape. */
  private askDiagnosisQuestion(question: CareerDiagnosisQuestion): CoachTurn {
    const surfaced = diagnosisQuestionAsDomainQuestion(question);
    // Spoken in the conversation's language. `surfaced` keeps the app-language prompt and options,
    // because its options are what a tap is matched back against ({@link diagnosisValueFor}).
    const coachMessage = this.applyGuard(arcCopy(question.promptKey, question.prompt, this.speechLocale()));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(surfaced),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Record what the diagnosis concluded and move on to the expert's questions.
   *
   * BOTH outcomes are recorded, including the unresolved ones. The partner's rule is that the coach
   * must not motivate past an unresolved diagnosis — a plan built after "they cannot do the target
   * work yet" is a plan that should say so — and the only way anything downstream can respect that is
   * if the reason is on the spec rather than swallowed here.
   */
  private settleDiagnosis(): CoachTurn {
    const tree = this.diagnosisTree;
    const outcome = tree ? outcomeOf(tree, this.diagnosisAnswers, this.knownSignals) : null;
    if (outcome?.kind === 'family') {
      this.spec.diagnosis = { subtype: outcome.subtype, bottleneck: outcome.bottleneck };
      this.note('Diagnosis settled', {
        subtype: outcome.subtype,
        bottleneck: outcome.bottleneck,
        'answers it rested on': Object.entries(this.diagnosisAnswers).map(([k, v]) => `${k}=${String(v)}`).join(', ') || 'the opening message alone',
        'what this decides': 'which FAMILY of authored Journeys this person gets',
      });
    } else if (outcome?.kind === 'unresolved') {
      this.spec.diagnosisUnresolved = outcome.reason;
      this.note('Diagnosis UNRESOLVED', {
        reason: outcome.reason,
        'what happens now': 'no family is forced — the plan must not motivate past this',
      });
    }
    return this.spec.domain === 'career'
      ? this.continueCareerConsultation()
      : this.beginExpertQuestions();
  }

  /** Ask only what can change the Career match, then select or offer the eligible Journeys. */
  private continueCareerConsultation(): CoachTurn {
    const result = consultCareer({
      schemaVersion: 1,
      knownSignals: this.knownSignals,
      diagnosisAnswers: this.diagnosisAnswers,
      familyAnswers: this.familyAnswers,
      profileSignals: profileSignals(this.profile),
    });

    if (result.kind === 'no_match') return this.offerJourneyRefinement(result.reason);
    if (result.kind === 'needs_information') {
      if (result.request.kind === 'diagnosis') {
        this.phase = 'diagnosis';
        return this.askDiagnosisQuestion(result.request.question);
      }
      const family = goalFamily(result.request.familyId);
      if (!family) return this.offerJourneyRefinement('missing_authored_family');
      this.journeyFitAxisId = result.request.question.axisId;
      this.journeyFitValueIds = result.request.question.values.map((value) => value.id);
      this.journeyFitQuestion = familyInterviewQuestions(
        family,
        { answers: this.familyAnswers, signals: profileSignals(this.profile) },
        this.speechLocale(),
      )[0];
      if (!this.journeyFitQuestion) return this.offerJourneyRefinement('missing_journey_content');
      this.phase = 'journeyFit';
      const coachMessage = this.applyGuard(this.journeyFitQuestion.prompt);
      this.history.push({ role: 'model', content: coachMessage });
      return {
        coachMessage,
        state: this.snapshot(),
        technicalNotes: this.takeNotes(),
        done: false,
        question: cloneQuestion(this.journeyFitQuestion),
        activeExpert: this.activeExpert,
      };
    }

    if (result.items.length === 1) {
      const selected = result.autoSelectedDefinitionId;
      if (!selected) return this.offerJourneyRefinement('missing_journey_content');
      this.spec.selectedJourneyDefinitionId = selected;
      return this.beginExpertQuestions(this.say('journeyMatching.singleMatch'));
    }

    // When the matcher has a recommendation, TAKE IT. Handing the user our own taxonomy of Journey
    // families and asking them to pick — right after saying we found the fit — moves our internal
    // filing onto a person who has no way to tell the options apart. The coach chooses, and says in
    // one sentence what it chose and what that means; the full Journey is still reviewed and
    // approved before anything starts, which is where a real disagreement belongs.
    const recommended = result.items.find(
      (item) => item.definitionId === result.recommendedDefinitionId,
    );
    if (recommended) {
      this.spec.selectedJourneyDefinitionId = recommended.definitionId;
      this.note('Journey selected', {
        journey: recommended.definitionId,
        'chosen from': `${result.items.length} eligible Journeys`,
        why: 'the matcher recommended it — the user is told which, not asked to pick',
      });
      return this.beginExpertQuestions(
        this.sayWith('journeyMatching.recommendedSelected', {
          journey: journeyEssenceLabel(recommended.definitionId, this.speechLocale()),
        }),
      );
    }

    // No recommendation: the eligible Journeys are genuinely equivalent on what we know, so the
    // choice is a real one and belongs to the user.
    this.journeyChoiceDefinitionIds = result.items.map((item) => item.definitionId);
    this.journeyChoiceQuestion = {
      id: 'career.journeyChoice',
      intent: 'variant',
      prompt: this.say('journeyMatching.multipleMatch'),
      // The cards stay in the app language: a tap is matched back against exactly these strings.
      options: this.journeyChoiceDefinitionIds.map((id) => journeyEssenceLabel(id)),
      allowOther: false,
    };
    this.phase = 'journeyChoice';
    const coachMessage = this.applyGuard(this.journeyChoiceQuestion.prompt);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(this.journeyChoiceQuestion),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Invite the goal again, in their own words — the first message that held no goal (see
   * {@link goalMisses}). The same shape as {@link offerJourneyRefinement}: still in `goal`, the
   * composer open, no question and no cards. Nothing about a goal is set, because none was read.
   */
  private reinviteGoal(): CoachTurn {
    this.phase = 'goal';
    const coachMessage = this.applyGuard(this.say('goalReinvite'));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      awaitingGoalText: true,
    };
  }

  /** Keep the Coach open for a better description; no GoalSpec means no unrelated Build action. */
  private offerJourneyRefinement(reason: CareerNoMatchReason): CoachTurn {
    this.note('No matching Journey', { reason, next: 'ask the user to refine the goal' });
    this.resetActiveGoal();
    this.phase = 'goal';
    const coachMessage = this.applyGuard(this.say('journeyMatching.noMatch'));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      awaitingGoalText: true,
      activeExpert: this.activeExpert,
    };
  }

  /** Clear only the active goal's routing state; the visible conversation history remains. */
  private resetActiveGoal(): void {
    this.expert = undefined;
    this.activeExpert = undefined;
    this.goal = undefined;
    this.diagnosisTree = undefined;
    this.diagnosisAnswers = {};
    this.knownSignals = {};
    this.familyAnswers = {};
    this.journeyFitQuestion = undefined;
    this.journeyFitAxisId = undefined;
    this.journeyFitValueIds = [];
    this.journeyChoiceQuestion = undefined;
    this.journeyChoiceDefinitionIds = [];
    this.understandingChecked = false;
    this.answersBeforeRebuild = undefined;
    this.questions = [];
    this.pending = undefined;
    this.pendingGap = undefined;
    this.portraitQuestion = undefined;
    this.continuing = false;
    this.covered = new Set<QuestionIntent>();
    for (const key of Object.keys(this.answers)) delete this.answers[key];
    this.spec.title = '';
    this.spec.domain = 'general';
    this.spec.processType = 'unknown';
    this.spec.isHabit = false;
    delete this.spec.diagnosis;
    delete this.spec.diagnosisUnresolved;
    delete this.spec.selectedJourneyDefinitionId;
  }

  // ── THE INTRODUCTION RUNS FROM THE PORTRAIT ────────────────────────────────────────────────
  //
  // Everything below replaces a list of questions with a picture that has holes in it. What is asked
  // next is the most valuable hole; the conversation ends when the picture is good enough (spec
  // §22), or when two turns in a row have added nothing to it.
  //
  // Nothing here reads the budget, and that is deliberate (D103): running low changes HOW the coach
  // asks, never how much it needs to understand.

  /** Open the Portrait conversation: no expert, no slate, no catalogue. */
  private beginPortrait(prefix?: string): CoachTurn {
    this.phase = 'portrait';
    // The Portrait is NOT cleared here. This is reachable a second time (the belt in
    // {@link beginExpertQuestions}), and forgetting everything somebody has already told us because
    // the conversation took another door would be a worse bug than the one that belt guards.
    // A rebuild clears it deliberately, in {@link rebuildFromCorrection}.
    //
    // THE SAFETY STOP STILL HAS TO FIRE. The surface reads `activeExpert.id` to decide whether this
    // is a domain we hand off rather than coach ({@link ./sensitiveDomains}), and a first run that
    // quietly lost that stop would be the worst possible regression to make silently. The id is the
    // TRIAGE classification, which this conversation already has — no expert is loaded and nothing
    // an expert authored is read.
    this.activeExpert = { id: this.spec.domain, displayName: this.spec.domain };
    this.note('The introduction begins from the Portrait', {
      'what drives it': 'what we still do not understand about the person, best-first',
      'what does not': 'a domain expert, the Journey library, or a list of questions',
    });
    return this.askNextGap(prefix);
  }

  /**
   * Ask the most valuable thing we still do not understand — or move to the check when there is
   * nothing left worth asking.
   *
   * `preferred` is the reader's suggestion; {@link ./portrait/gaps nextGap} honours it only when it
   * is genuinely one of the askable gaps, so the engine keeps the veto.
   */
  private askNextGap(prefix?: string, preferred?: PortraitFieldId): CoachTurn {
    const gap = nextGap(this.portrait, preferred);
    if (!gap) return this.askUnderstandingCheck(prefix);
    this.pendingGap = gap.field;
    this.portraitQuestion = portraitGapQuestion(gap, this.speechLocale());
    this.note('Opening the most valuable gap', {
      gap: gap.field,
      'worth asking': gap.weight,
      'held at': gap.held,
      'chosen by': preferred === gap.field ? 'the reader, and the engine agreed' : 'the authored weight',
      'never asked': 'support need, readiness, previous attempts, constraints — listened for only',
    });
    const question = this.portraitQuestion;
    const coachMessage = this.applyGuard(prefix ? `${prefix}\n\n${question.prompt}` : question.prompt);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(question),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Read the whole conversation into the Portrait, then decide what this turn actually is.
   *
   * The counterpart of {@link reread}, and the same three properties: it runs AFTER the turn has
   * been built, it can only replace the question that was about to be asked, and a reading that
   * produced nothing leaves the turn exactly as it arrived. Failure is silence, so the offline path
   * is the authored question and nothing else.
   */
  private async readPortraitTurn(turn: CoachTurn): Promise<CoachTurn> {
    if (this.phase !== 'portrait') return turn;
    const outstanding = outstandingGaps(this.portrait);
    const rebuilding = this.portraitBeforeRebuild !== undefined;

    const reading =
      outstanding.length > 0
        ? await readPortrait(this.llm, this.transcript(), outstanding)
        : { updates: [] };

    // A REBUILD re-reads a transcript that already contains everything the person has said, so a
    // reading that finds nothing did not run — {@link ./portrait/readPortrait} is silent on failure
    // by design. Put the Portrait back and return to the check rather than starting the
    // conversation over on somebody who has already had it.
    if (rebuilding && reading.updates.length === 0 && this.portraitBeforeRebuild) {
      this.portrait = this.portraitBeforeRebuild;
      this.portraitBeforeRebuild = undefined;
      this.note('The rebuild could not read the conversation', {
        'what was done': 'the Portrait we had was put back',
        'what happens now': 'the check is asked again, with the correction now part of the transcript',
      });
      if (turn.question) this.history.pop();
      return this.askUnderstandingCheck();
    }
    this.portraitBeforeRebuild = undefined;

    const merged = mergePortrait(this.portrait, reading.updates, Date.now());
    this.portrait = merged.portrait;
    // THE QUIET-TURN CLAUSE. A turn that taught us nothing we can hold counts; two in a row end the
    // conversation. Anything that landed at medium or better resets it.
    this.quietPortraitTurns = merged.landed.length > 0 ? 0 : this.quietPortraitTurns + 1;
    if (merged.landed.length > 0) {
      this.note('Understood without asking', {
        fields: merged.landed.join(', '),
        'read from': 'everything said so far, not only the last message',
      });
    } else {
      this.note('That turn added nothing we can hold', {
        'quiet turns in a row': this.quietPortraitTurns,
        'what happens at the limit': `at ${QUIET_TURNS_TO_STOP} the conversation stops — another question would be an interrogation`,
      });
    }

    if (readyToFinish(this.portrait, this.quietPortraitTurns)) {
      this.note('The introduction has heard enough', {
        why:
          this.quietPortraitTurns >= QUIET_TURNS_TO_STOP
            ? `${this.quietPortraitTurns} turns in a row added nothing`
            : 'the picture meets the minimum understanding (spec §22)',
        'what it never read': 'the budget — that changes how we ask, never how much we understand',
      });
      if (turn.question) this.history.pop(); // the question we were about to ask is not being asked
      return this.askUnderstandingCheck();
    }

    const gap = nextGap(this.portrait, reading.nextGap);
    if (gap && this.pendingGap === gap.field && turn.question) return turn;
    if (turn.question) this.history.pop();
    return this.askNextGap(undefined, reading.nextGap);
  }

  /** The Portrait as it stands. A defensive copy — nothing outside may edit what we understood. */
  getPortrait(): Portrait {
    return clonePortrait(this.portrait);
  }

  /**
   * Select the expert for the active goal's domain, load its questions SHAPED BY the goal's type (a
   * recurring habit skips the staging/milestones questions), and surface the first — or the closing
   * scheduling question when the expert asks nothing.
   */
  private beginExpertQuestions(prefix?: string): CoachTurn {
    // A SECOND BELT, exactly like the one in {@link beginDiagnosis}. The introduction must not
    // consult a DomainExpert at all (founder, 2026-09-15), and this method is where an expert is
    // loaded. Nothing routes here in `introduction` today; a future path that does would silently
    // put the planner's four questions back into the first run.
    if (this.mode === 'introduction') {
      this.note('Expert questions skipped', {
        reason: 'this is the INTRODUCTION — the domain expert belongs to Journey building only',
        'what happens instead': 'the conversation continues from the Portrait',
      });
      return this.beginPortrait(prefix);
    }
    this.expert = getExpert(this.spec.domain);
    this.activeExpert = {
      id: this.spec.domain,
      displayName: this.expert.displayName ?? this.spec.domain,
    };
    this.spec.activeExpertDisplayName = this.activeExpert.displayName;

    this.goal = { title: this.spec.title, isHabit: this.spec.isHabit };
    // The expert's own questions, plus the ONE question that is not domain knowledge: how long the
    // user wants to give this. It used to be assumed (eight weeks, silently) rather than asked.
    // Then, LAST, whatever the chosen Journey says it needs in order to pick between its own
    // versions (D62 §2) — asked here because this is the first moment the Journey is known, and
    // asked only when the profile has not already answered it.
    const all = [
      ...(this.expert.interviewQuestions?.(this.goal) ?? []),
      horizonQuestion(),
      ...this.journeyVariantQuestions(),
    ];
    this.questions = questionsForProcessType(all, this.spec.processType);
    this.note('Expert selected', {
      expert: this.activeExpert.displayName,
      'routed by': `the domain read from the opening message (${this.spec.domain})`,
    });
    this.note('Interview assembled', {
      'expert questions': this.expert.interviewQuestions?.(this.goal).length ?? 0,
      'plus the horizon question': 'how long they want to give this',
      'plus Journey variant questions': this.journeyVariantQuestions().length,
      'dropped as irrelevant to this shape':
        all.length - this.questions.length > 0 ? all.length - this.questions.length : undefined,
      'will actually be asked': this.questions.length,
      note:
        this.journeyVariantQuestions().length === 0
          ? 'no variant question needed — the profile already places them, or the versions no longer differ'
          : undefined,
    });
    this.pending = undefined;
    this.phase = 'questions';

    return this.questions.length > 0
      ? this.askNextOutstanding(prefix)
      : this.afterQuestions(prefix);
  }

  /**
   * The questions the chosen Journey declares it needs, in order to build the right VERSION of
   * itself for this person (D62 §2).
   *
   * It returns nothing at all in the ordinary case, and that is the design working: a user whose
   * onboarding answers already place them on the Journey's axis is not asked again, and neither is
   * anyone whose remaining versions no longer differ. The question exists for the people we know
   * nothing about — who, at cold start, are most people.
   *
   * There is one candidate Journey per shape today, so it reads the first; when several Journeys
   * per goal land, the professional choice happens before this line and this code does not change.
   */
  private journeyVariantQuestions(): DomainQuestion[] {
    const shape = journeyShapeFor(this.spec.processType, this.spec.cadence);
    const definition = journeyDefinition(this.spec.selectedJourneyDefinitionId)
      ?? journeyDefinitionsFor(shape, this.spec.domain)[0];
    if (!definition) return [];
    return variantInterviewQuestions(definition, { signals: profileSignals(this.profile) }, this.speechLocale());
  }

  /**
   * Surface the multi-goal FOCUS turn: reflect the detected goals back (each labelled by its kind)
   * and ask the user to pick which ONE to build first. The synthetic question is closed (no "Other")
   * so the harness/UI renders a simple numbered choice of the goals.
   */
  private askFocusChoice(goals: UnderstoodGoal[]): CoachTurn {
    this.phase = 'focus';
    this.focusQuestion = buildFocusQuestion(goals, this.playbook.focus);
    const coachMessage = this.applyGuard(this.playbookLine('focus.intro', this.playbook.focus.intro));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(this.focusQuestion),
    };
  }

  /** Surface the FALLBACK process-type question (understanding found no usable goal). */
  private askProcessTypeFallback(): CoachTurn {
    this.phase = 'processType';
    const coachMessage = this.applyGuard(this.say('processType.prompt'));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
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
      case 'diagnosis': {
        const question = this.diagnosisTree
          ? nextDiagnosisQuestion(this.diagnosisTree, this.diagnosisAnswers, this.knownSignals)
          : null;
        return question ? diagnosisQuestionAsDomainQuestion(question) : undefined;
      }
      case 'journeyFit':
        return this.journeyFitQuestion;
      case 'journeyChoice':
        return this.journeyChoiceQuestion;
      case 'questions':
        return this.pending;
      case 'portrait':
        return this.portraitQuestion;
      case 'scheduling':
        return SCHEDULING_QUESTION;
      case 'confirm':
        return CONFIRM_QUESTION;
      case 'correcting':
        return CORRECTION_QUESTION;
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
      case 'diagnosis':
        return this.recordDiagnosisAnswer(question, answer);
      case 'journeyFit':
        {
          const value = Array.isArray(answer) ? answer[0] : answer;
          const index = question.options.indexOf(value);
          const axisValue = this.journeyFitValueIds[index];
          if (!this.journeyFitAxisId || !axisValue) {
            return this.offerJourneyRefinement('missing_journey_content');
          }
          this.familyAnswers[this.journeyFitAxisId] = axisValue;
        }
        return this.continueCareerConsultation();
      case 'journeyChoice': {
        const value = Array.isArray(answer) ? answer[0] : answer;
        const index = this.journeyChoiceQuestion?.options.indexOf(value) ?? -1;
        const chosen = this.journeyChoiceDefinitionIds[index];
        if (!chosen) return this.askJourneyChoiceAgain();
        this.spec.selectedJourneyDefinitionId = chosen;
        return this.beginExpertQuestions();
      }
      case 'questions':
        // Recorded here; WHAT TO ASK NEXT is decided by `advanceQuestions`, after the conversation
        // has been read. The pointer that used to live on this line is gone (D103).
        this.answers[question.id] = answer;
        return this.askNextOutstanding();
      case 'portrait':
        // NOTHING IS RECORDED HERE, and that is the difference between this and the slate above.
        // What they said is already in the history, and what it MEANS is decided by reading the
        // whole conversation against the Portrait ({@link readPortraitTurn}) — never by filing an
        // answer under the question that happened to be on the table. The turn built here is the
        // provisional one that reading may replace, and the one that stands if it cannot run.
        return this.askNextGap();
      case 'scheduling': {
        const preference = schedulingPreferenceFromAnswer(answer);
        if (preference) this.spec.schedulingPreference = preference;
        // NOT `finish()` any more. Nothing is built until the person has seen what we understood
        // and said it is right (founder, 2026-09-14).
        return this.askUnderstandingCheck();
      }
      case 'confirm': {
        const value = Array.isArray(answer) ? answer[0] : answer;
        const [yes, no] = CONFIRM_QUESTION.options;
        if (value === yes) return this.finish();
        // "Not quite." on its own says there is something wrong but not what; ask. Anything else is
        // the correction itself, typed straight into this turn, and does not cost a round trip.
        if (value === no || value.trim().length === 0) return this.askForCorrection();
        this.history.pop(); // rebuildFromCorrection pushes it; don't record the same line twice
        return this.rebuildFromCorrection(value);
      }
      case 'correcting': {
        const value = Array.isArray(answer) ? answer[0] : answer;
        this.history.pop();
        return this.rebuildFromCorrection(value);
      }
      default:
        throw new Error('There is no question to answer right now');
    }
  }

  private askJourneyChoiceAgain(): CoachTurn {
    const question = this.journeyChoiceQuestion;
    if (!question) return this.offerJourneyRefinement('missing_journey_content');
    const coachMessage = this.applyGuard(this.say('journeyMatching.selectionUnavailable'));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(question),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Record one diagnosis answer and ask the next question, or settle.
   *
   * A LABEL the person tapped maps back to its closed value; anything else — free text, or a label
   * from a question that is no longer current — settles nothing, and the honest thing is to move on
   * rather than to read a value into a sentence we did not parse. The tree then asks its next
   * question, which is a better outcome than a wrong route.
   */
  private recordDiagnosisAnswer(question: DomainQuestion, answer: string | string[]): CoachTurn {
    const tree = this.diagnosisTree;
    if (!tree) return this.beginExpertQuestions();
    const current = nextDiagnosisQuestion(tree, this.diagnosisAnswers, this.knownSignals);
    if (!current || current.id !== question.id) return this.settleDiagnosis();

    const chosen = Array.isArray(answer) ? answer[0] : answer;
    const value = diagnosisValueFor(current, chosen);
    if (value) this.diagnosisAnswers = { ...this.diagnosisAnswers, [current.id]: value };

    const next = nextDiagnosisQuestion(tree, this.diagnosisAnswers, this.knownSignals);
    // No option matched AND nothing left to ask would loop; settling is the only way out and it is
    // also the correct one — an unreadable answer is not evidence.
    if (!next || (!value && next.id === current.id)) return this.settleDiagnosis();
    return this.askDiagnosisQuestion(next);
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

  /**
   * What follows the last question. Planning asks when the Steps should go; the introduction has
   * nothing to schedule, so it goes straight to the check and says what it understood.
   */
  private afterQuestions(prefix?: string): CoachTurn {
    return this.mode === 'introduction'
      ? this.askUnderstandingCheck(prefix)
      : this.askSchedulingQuestion(prefix);
  }

  /** Surface the closing scheduling-preference meta question after the expert's questions. */
  private askSchedulingQuestion(prefix?: string): CoachTurn {
    this.phase = 'scheduling';
    const body = this.say('scheduling.prompt');
    const coachMessage = this.applyGuard(prefix ? `${prefix}\n\n${body}` : body);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(SCHEDULING_QUESTION),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Surface the current expert question — VOICED BY THE META-AGENT. The expert is an INTERNAL
   * tool: it supplies the structured intent (id/`intent`) and the closed `options`, but it never
   * speaks to the user directly. The meta-agent authors the words the user reads, in the user's
   * language and its own voice, via {@link metaVoiced}. No LLM phrasing (deterministic templates).
   */
  /**
   * THE SLATE — every authored question this interview still needs an answer to.
   *
   * A SET with no positions, which is the whole change (D103). `questionIndex` is gone: a question
   * leaves this list by being ANSWERED, whether it was ever asked or not, and the next turn is
   * chosen from what is left rather than from where a pointer happened to be.
   */
  private outstanding(): DomainQuestion[] {
    return this.unanswered().filter((q) => !this.covered.has(q.intent));
  }

  /**
   * Everything still UNANSWERED, including what the first conversation already covers — the set the
   * conversation READER is offered.
   *
   * The split from {@link outstanding} is the whole handoff in two lines: a covered question is never
   * ASKED, but it is still READ for, so what the person says in this conversation overwrites what
   * the Portrait implied. With nothing covered the two are the same list.
   */
  private unanswered(): DomainQuestion[] {
    return this.questions.filter((q) => this.answers[q.id] === undefined);
  }

  /**
   * The conversation so far, as the reader sees it — "who said what", oldest first.
   *
   * The whole transcript rather than the last message, deliberately: a fact mentioned six turns ago
   * is still a fact, and being unable to see it is exactly what the pointer could not do.
   */
  private transcript(): string {
    return this.history
      .map((m) => `${m.role === 'user' ? 'PERSON' : 'COACH'}: ${m.content}`)
      .join('\n');
  }

  /**
   * Ask whatever is still outstanding, or move on when nothing is.
   *
   * `outstanding()[0]` is the authored order as a TIEBREAK, not a sequence: the expert's opinion
   * about which gap matters most is a better default than whichever happens to be first in memory.
   * {@link reread} overrides it whenever the conversation suggests a better next.
   */
  private askNextOutstanding(prefix?: string): CoachTurn {
    const left = this.outstanding();
    if (left.length === 0) return this.afterQuestions(prefix);
    this.pending = left[0];
    return this.askQuestion(this.pending, prefix);
  }

  /**
   * Read the whole conversation against everything still outstanding, strike off whatever it has
   * already answered, and re-choose what to ask — all AFTER the turn has been built.
   *
   * It runs here, at the async boundary, rather than inside `record`: the builders below are
   * synchronous and every one of them would have had to change, which is a wide refactor to buy the
   * same behaviour. This is the one seam where a model call already belongs.
   *
   * A reading that strikes nothing off and suggests nothing leaves the turn exactly as it arrived.
   */
  private async reread(turn: CoachTurn): Promise<CoachTurn> {
    // The introduction has no slate to re-read; it has a Portrait, and its own reader.
    if (this.phase === 'portrait') return this.readPortraitTurn(turn);
    if (this.phase !== 'questions') return turn;
    const before = this.unanswered();
    if (before.length === 0) return turn;

    const rebuilding = this.answersBeforeRebuild !== undefined;
    const reading = await readConversation(this.llm, this.transcript(), before);

    // A REBUILD reads the whole slate against a transcript that already contains every answer, so a
    // reading that strikes nothing off did not run — {@link readConversation} is silent on failure
    // by design and returns exactly this. Put the answers back and go straight to the check rather
    // than marching the person through an interview they have already done.
    if (rebuilding && Object.keys(reading.resolved).length === 0 && this.answersBeforeRebuild) {
      Object.assign(this.answers, this.answersBeforeRebuild);
      this.answersBeforeRebuild = undefined;
      this.note('The rebuild could not read the conversation', {
        'what was done': 'the previous answers were put back',
        'what happens now': 'the check is asked again, with the correction now part of the transcript',
      });
      this.history.pop(); // the question that is no longer being asked
      return this.askUnderstandingCheck();
    }
    this.answersBeforeRebuild = undefined;

    const struck = Object.entries(reading.resolved);
    for (const [id, value] of struck) this.answers[id] = value;
    if (struck.length > 0) {
      this.note('Answered without being asked', {
        questions: struck.map(([id]) => id).join(', '),
        'read from': 'everything said so far, not only the last message',
      });
    }

    const left = this.outstanding();
    // Nothing left to ask: the reading finished the interview on its own, which is the best possible
    // outcome and the one a pointer could never produce.
    if (left.length === 0) {
      this.history.pop(); // the question we were about to ask is not being asked
      // After a rebuild the scheduling answer is still on the spec and asking for it again would be
      // the coach forgetting; go back to the check, which is what the correction was aimed at.
      return rebuilding ? this.askUnderstandingCheck() : this.afterQuestions();
    }

    const chosen = left.find((q) => q.id === reading.nextId) ?? left[0];
    if (this.pending && chosen.id === this.pending.id) return turn;

    // A different question is now the right one. Take the old one back out of the history so the
    // coach is never recorded as having asked something the person did not see.
    this.history.pop();
    this.pending = chosen;
    return this.askQuestion(chosen);
  }

  private askQuestion(raw: DomainQuestion, prefix?: string): CoachTurn {
    const question = this.metaVoiced(raw);
    const coachMessage = this.applyGuard(prefix ? `${prefix}\n\n${question.prompt}` : question.prompt);
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(question),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Re-voice an expert question in the META-AGENT'S own words. The expert's `question.prompt` is an
   * internal placeholder; the surfaced prompt is resolved from the meta-agent's `interview.<intent>`
   * template in the `coachContent` namespace (the user's active language, no LLM call). Only the
   * `prompt` is replaced — the `options` (the user's answer choices) and every logic field are
   * untouched, so the exact-string answer matching is unaffected. Falls back to the expert's own
   * prompt only if a template is somehow missing (defensive — every {@link QuestionIntent} has one).
   */
  private metaVoiced(question: DomainQuestion): DomainQuestion {
    const key = META_VOICE_KEYS[question.intent];
    if (!key) return question;
    const voiced = this.say(key);
    return voiced && voiced !== key ? { ...question, prompt: voiced } : question;
  }

  /**
   * Say what was understood, and ask whether it is right — before anything is built.
   *
   * The prompt below is the FALLBACK. On the ordinary path {@link voiced} replaces it with the
   * composed reflection (`understanding: true`), which is the whole point: the words are written
   * from this conversation. Offline, the canned sentence still asks the question, so the check
   * exists on every path rather than only when a model answers.
   */
  private askUnderstandingCheck(prefix?: string): CoachTurn {
    this.phase = 'confirm';
    this.understandingChecked = true;
    const body = this.say('understandingCheck.prompt');
    const coachMessage = this.applyGuard(prefix ? `${prefix}\n\n${body}` : body);
    this.history.push({ role: 'model', content: coachMessage });
    this.note('Understanding check', {
      'what happens next': 'nothing is built until they say the picture is right',
      'if they say no': 'the whole conversation is read again and what is known is rebuilt',
    });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(CONFIRM_QUESTION),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * They said the picture is wrong. Ask what is wrong — and say what will happen to the answer,
   * because "I'll take it from the top" is a promise this code actually keeps.
   */
  private askForCorrection(): CoachTurn {
    this.phase = 'correcting';
    const coachMessage = this.applyGuard(this.say('understandingCheck.askCorrection'));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: false,
      question: cloneQuestion(CORRECTION_QUESTION),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * REBUILD, rather than acknowledge.
   *
   * A correction that is merely thanked for leaves the wrong answer sitting in `answers`, and the
   * plan is built from `answers`. So everything the interview recorded is dropped and the whole
   * slate is read again against the whole transcript — which now ends with the correction. Whatever
   * the person still means is struck off exactly as it was the first time; whatever the correction
   * changed comes back either with its new value or as an open question. The correction is a fact in
   * the conversation, not a note appended to a conclusion.
   *
   * This is the same {@link reread} machinery the interview already runs after every message. It
   * gets no special case, and that is deliberate: a second, parallel path for corrections is how the
   * two drift apart.
   */
  private rebuildFromCorrection(correction: string): CoachTurn {
    this.history.push({ role: 'user', content: correction });
    if (this.mode === 'introduction') return this.rebuildPortraitFromCorrection();
    // Kept, not discarded: if the reading cannot run (no network, a provider error) these come back
    // untouched, because re-asking somebody every question they already answered is a worse failure
    // than carrying one stale answer to a check they can fail again.
    this.answersBeforeRebuild = { ...this.answers };
    for (const key of Object.keys(this.answers)) delete this.answers[key];
    this.spec.answers = {};
    delete this.spec.feasibility;
    this.pending = undefined;
    this.phase = 'questions';
    this.note('Rebuilding from a correction', {
      'answers set aside': Object.keys(this.answersBeforeRebuild).length,
      'read again from': 'the whole conversation, which now ends with what they just corrected',
      why: 'a correction acknowledged is a plan still built on the wrong answer',
    });
    // `reread`, at the async boundary, does the reading. This returns the turn it works from.
    return this.askNextOutstanding(this.say('understandingCheck.rebuilt'));
  }

  /**
   * THE SAME REBUILD, FOR THE PORTRAIT.
   *
   * "I want to clarify" must mean the same thing in both conversations: everything we thought we
   * understood is dropped and the whole transcript — which now ends with the correction — is read
   * again. That is only safe because the Portrait was never the source of truth; it is a reading,
   * and a reading can be redone. A correction merely appended to it would leave the wrong belief in
   * place underneath the right sentence.
   *
   * The quiet-turn count resets with it. The person has just told us something; starting the new
   * reading two turns from the end would stop the conversation before it could use what they said.
   */
  private rebuildPortraitFromCorrection(): CoachTurn {
    // Kept rather than discarded, exactly as the interview's answers are: if the re-read cannot run
    // (no network, a provider error), the picture we had comes back and the person is asked to
    // confirm it again — which is a better failure than meeting them from scratch.
    this.portraitBeforeRebuild = clonePortrait(this.portrait);
    this.portrait = emptyPortrait();
    this.quietPortraitTurns = 0;
    this.pendingGap = undefined;
    this.portraitQuestion = undefined;
    this.phase = 'portrait';
    this.note('Rebuilding the Portrait from a correction', {
      'what was set aside': Object.keys(this.portraitBeforeRebuild).length + ' fields',
      'read again from': 'the whole conversation, which now ends with what they just corrected',
      why: 'a correction acknowledged is a picture still built on what they told us was wrong',
    });
    // `readPortraitTurn`, at the async boundary, does the reading. This is the turn it works from.
    return this.askNextGap(this.say('understandingCheck.rebuilt'));
  }

  /**
   * THE INTRODUCTION LANDS, AND BUILDS NOTHING (D105).
   *
   * No feasibility — that is an assessment of a plan against a week, and there is no plan and no
   * week. No {@link GoalSpec} either, and that is the load-bearing line rather than a tidiness one:
   * this conversation deliberately never asked for weekly time, a horizon or preferred days, so a
   * spec handed on from here would be built against the Planner's silent eight-week default with no
   * capacity — the exact failure {@link ./horizonQuestion} exists to end.
   *
   * What the person gets instead is the first run's own tail: the intro Journey, the reminder ask,
   * and the handoff. Matching a real Journey is the SECOND conversation.
   */
  private landIntroduction(): CoachTurn {
    this.note('The introduction is over', {
      'what was built': 'nothing — this conversation chooses no Journey (D105)',
      'what happens next': 'the first run continues with the intro Journey and its tail',
    });
    const coachMessage = this.applyGuard(this.say('introduction.closing'));
    this.history.push({ role: 'model', content: coachMessage });
    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: true,
      activeExpert: this.activeExpert,
    };
  }

  /**
   * Close the interview: record the answers, run the expert's honest feasibility check, and surface
   * its note followed by the Support-Circle recommendation. Produces the completed {@link GoalSpec}.
   */
  private finish(): CoachTurn {
    this.phase = 'done';
    if (this.mode === 'introduction') return this.landIntroduction();
    this.defaultBaselineFromPortrait();
    this.spec.answers = { ...this.answers };

    let feasibility: FeasibilityAssessment | undefined;
    if (this.expert?.assessFeasibility && this.goal) {
      // The SAME account capacity the builder will plan with (D82) — the profile is already here
      // for the variant questions. Reading it in only one of the two places would let the coach
      // call a plan feasible against a wider week than the one it then builds against.
      const constraints = deriveConstraints(
        this.spec,
        this.expert,
        this.goal,
        this.profile?.capacity,
      );
      feasibility = this.expert.assessFeasibility(this.answers, constraints);
      this.spec.feasibility = feasibility;
      this.note('Constraints the plan is built inside', {
        'weekly minutes': constraints.weeklyAvailabilityMinutes || '0 (no time signal — one Step per preferred day)',
        'where that came from':
          this.spec.timing.sessionMinutes != null && this.spec.timing.sessionsPerWeek != null
            ? 'this interview, explicitly'
            : this.profile?.capacity
              ? `the expert's time question, or failing that onboarding capacity "${this.profile.capacity}"`
              : "the expert's time question",
        'preferred days': constraints.preferredDays.length > 0 ? constraints.preferredDays.join(', ') : 'none set',
        daypart: constraints.daypart,
        'feasibility verdict': feasibility?.note ? 'the expert had something to say' : 'nothing flagged',
      });
    }

    const lines = [
      feasibility?.note,
      this.playbookLine('supportCircleRecommendation', this.playbook.supportCircleRecommendation),
    ].filter(
      (l): l is string => !!l && l.length > 0,
    );
    const coachMessage = this.applyGuard(lines.join('\n\n'));
    this.history.push({ role: 'model', content: coachMessage });

    return {
      coachMessage,
      state: this.snapshot(),
      technicalNotes: this.takeNotes(),
      done: true,
      goalSpec: this.snapshotSpec(),
      activeExpert: this.activeExpert,
    };
  }

  /**
   * The level the Portrait implies, written into the baseline answer ONLY when this conversation
   * left it empty. Anything the person said about where they are now was read into it already and
   * wins; this fills the one gap that covering the question left behind, because the plan's level
   * is built from it.
   */
  private defaultBaselineFromPortrait(): void {
    if (!this.continuing || !this.handoff || !this.covered.has('baseline')) return;
    const question = this.questions.find((q) => q.intent === 'baseline');
    if (!question || this.answers[question.id] !== undefined) return;
    const value = baselineDefault(this.handoff.portrait, question.options);
    if (value === undefined) return;
    this.answers[question.id] = value;
    this.note('Baseline taken from the first conversation', {
      question: question.id,
      'read from': 'the Portrait (stage)',
      why: 'this conversation did not say where they are now, and the plan level is built from it',
    });
  }

  /**
   * Run an outbound coach line through the optional safety guard. Identity when no guard is
   * configured; a guard that returns empty is ignored so the coach never surfaces a blank turn.
   */
  /**
   * SAY the turn instead of selecting it.
   *
   * The turn arrives from the deterministic builders with `coachMessage` set to a catalogue string
   * and `question` set to what the engine decided to ask. This replaces the words — and only the
   * words — with a composed turn that can hand back what was understood before it asks. What is
   * asked, whether the interview is over, and everything that reaches the Planner are untouched.
   *
   * THE HISTORY IS CORRECTED TOO, and that is not a detail: the builder already pushed the canned
   * line, and leaving it there would let the model read back a sentence it never said and reflect on
   * words the person never saw.
   *
   * A failure returns the turn exactly as it arrived (see {@link composeCoachTurn}), so the offline
   * path is unchanged.
   *
   * `typed` is what the person WROTE to cause this turn, absent after a tap. It is where a request
   * to change language is read (see {@link conversationLocale}): the composer is handed their words
   * when they name a language, and if its turn comes back in the language they asked for, the
   * conversation follows from here on. The model is trusted only to have read the request; the
   * engine checks the script of what it wrote and that the language asked for is one we speak.
   */
  private async voiced(turn: CoachTurn, typed?: TypedMessage): Promise<CoachTurn> {
    // WHAT THE FIRST RUN ACTUALLY PRODUCES rides out with every turn of it. Not a Journey — a
    // Portrait, which the screen writes to AppState. Attached HERE, at the one seam every turn
    // passes through, rather than at each builder: a builder that forgot would hand the screen a
    // picture one turn out of date, and nothing would fail.
    const said = this.mode === 'introduction' ? this.withPortrait(turn) : turn;
    const original = said.coachMessage;
    if (original.trim().length === 0) return said;

    const current = this.conversationLocale ?? this.locale ?? 'en';
    // A language they ASKED for in words, other than the one we are already in. Deterministic; the
    // composer decides whether it was a request, and the check below decides whether it is honoured.
    const requested = typed ? namedLocales(typed.text).filter((locale) => locale !== current) : [];

    const composed = this.applyGuard(
      await composeCoachTurn(this.llm, {
        firstName: this.firstName,
        goal: this.goal?.title ?? this.spec.title ?? null,
        known: this.knownSoFar(),
        prompt: original,
        // Three different turns, three different jobs. The reflection that used to arrive with the
        // finished plan now arrives at the CHECK, where it can still change it; the turn after a
        // confirmed check only lands. `closing` survives for the paths that reach the end without a
        // check at all, so nothing silently loses its voice.
        closing: turn.done && !this.understandingChecked,
        understanding: this.phase === 'confirm',
        landing: turn.done && this.understandingChecked,
        // There is no plan on the other side of an introduction, and the landing instruction says
        // there is. One sentence, and it would be the coach promising something that is not
        // happening — which is the whole reason this mode exists.
        introduction: this.mode === 'introduction',
        reflectionsSoFar: this.reflections,
        locale: current,
        // Only when nothing else carries their words to the composer — see `lastMessage`.
        ...(typed && (typed.quote || requested.length > 0) ? { lastMessage: typed.text } : {}),
      }),
    );
    if (composed === original) return said;

    const wroteIn = dominantLocale(composed);
    const switching = wroteIn !== undefined && requested.includes(wroteIn) && turnIsWrittenIn(composed, wroteIn);
    // THE TURN MUST BE IN THE CONVERSATION'S LANGUAGE, AND ONLY IN IT (partner's device test,
    // 2026-09-17). Handed a Hebrew conversation, the composer once wrote "ליעם, you mentioned that
    // if this changed…" — a Hebrew name and then English. Nothing checked, so it was shown. Now a
    // turn that is in the wrong language, or carries a whole sentence of the other one, is dropped
    // and the canned line (already resolved in the conversation's language) is shown instead. The
    // one exception is the switch they asked for, which has to arrive in the language they asked for.
    if (!switching && !turnIsWrittenIn(composed, current)) {
      this.note('Composed turn discarded', {
        'conversation language': current,
        'written in': wroteIn ?? 'no clear language',
        why: 'a turn that is not wholly in the conversation language is worse than the canned line',
        'shown instead': 'the canned line, in the conversation language',
      });
      return said;
    }
    if (switching && wroteIn) {
      this.conversationLocale = wroteIn;
      this.note('Conversation language changed', {
        to: wroteIn,
        why: 'they asked for it in words, and the turn was written in it',
        'the cards': 'stay in the app language',
      });
    }

    if (looksLikeReflection(composed, original)) this.reflections += 1;
    // Replace what the builder pushed rather than appending beside it.
    const last = this.history[this.history.length - 1];
    if (last?.role === 'model' && last.content === original) {
      this.history[this.history.length - 1] = { role: 'model', content: composed };
    } else {
      this.history.push({ role: 'model', content: composed });
    }
    this.note('Turn composed', { reflections: this.reflections });
    return { ...said, coachMessage: composed };
  }

  /**
   * Follow the language somebody PLAINLY WROTE in, after the opening has decided it. A message that
   * is not clearly in one supported language changes nothing (see {@link plainlyWrittenLocale}).
   */
  private followWrittenLanguage(text: string): void {
    const written = plainlyWrittenLocale(text);
    if (!written || written === (this.conversationLocale ?? this.locale ?? 'en')) return;
    this.conversationLocale = written;
    this.note('Conversation language changed', {
      to: written,
      why: 'they are writing in it now',
      'the cards': 'stay in the app language',
    });
  }

  /** The turn, carrying the Portrait as it stands. A copy, so the screen holds no live reference. */
  private withPortrait(turn: CoachTurn): CoachTurn {
    return { ...turn, portrait: clonePortrait(this.portrait) };
  }

  /**
   * What the person has already told us, in the words it was asked and answered in. This is the
   * whole defence against asking twice: a composer that can see the answer cannot ask for it again,
   * and the instruction above it says so explicitly.
   */
  private knownSoFar(): KnownFact[] {
    // THE INTRODUCTION KNOWS THE PERSON, NOT A SET OF ANSWERS.
    //
    // This is what makes the understanding check a real check: what the composer says back is
    // composed from the Portrait, so it IS what the engine believes. A mis-extraction becomes a
    // sentence the person can recognise as wrong and correct, instead of a belief that silently
    // shapes everything after it. It also stops the coach asking for something it already
    // understood, which is the same guarantee the slate version gives.
    if (this.mode === 'introduction') return portraitFacts(this.portrait);
    const asked = new Map<string, string>();
    for (const q of this.questions) asked.set(q.id, q.prompt);
    if (this.journeyChoiceQuestion) asked.set(this.journeyChoiceQuestion.id, this.journeyChoiceQuestion.prompt);
    if (this.focusQuestion) asked.set(this.focusQuestion.id, this.focusQuestion.prompt);

    // WHAT THE FIRST CONVERSATION ALREADY HEARD comes first, labelled as such, and only once the goal
    // read now is the one it is about. A composer that can see it cannot ask for it again.
    const facts: KnownFact[] =
      this.continuing && this.handoff ? firstConversationFacts(this.handoff.portrait) : [];
    for (const [id, answer] of Object.entries(this.answers)) {
      if (answer === undefined) continue;
      const text = Array.isArray(answer) ? answer.join(', ') : String(answer);
      if (text.trim().length === 0) continue;
      facts.push({ asked: asked.get(id) ?? id, answered: text });
    }
    return facts;
  }

  /**
   * The language a coach turn is resolved in: the language of the CONVERSATION once a message has
   * shown it, and the app's until then (which is also what the composer is told, in {@link voiced}).
   * Undefined only when neither is known, which resolves in the active app language.
   */
  private speechLocale(): string | undefined {
    return this.conversationLocale ?? this.locale;
  }

  /**
   * A `coachContent` line for a coach TURN, in the conversation's language (partner, 2026-09-17).
   *
   * The app's language decides the interface; it does not decide the conversation. Resolving the
   * question in the app language handed a Hebrew conversation an English question to rephrase, and
   * the composer half-translated it. Only the words said move: option CARDS stay in the app language,
   * because a tap is matched back against the exact string rendered ({@link ccOptions}).
   */
  private say(key: string): string {
    return cc(key, this.speechLocale());
  }

  /** {@link say} for a line that names something back to them. */
  private sayWith(key: string, vars: Record<string, string>): string {
    return ccWith(key, vars, this.speechLocale());
  }

  /**
   * A playbook line, in the conversation's language when the playbook is the shipped one. An injected
   * playbook says exactly what it was given: its copy is not ours to translate.
   */
  private playbookLine(key: string, injected: string): string {
    return this.playbook === INTERVIEW_PLAYBOOK ? this.say(key) : injected;
  }

  private applyGuard(text: string): string {
    if (!this.guard) return text;
    const safe = this.guard(text);
    return safe.trim().length > 0 ? safe : text;
  }

  /** The question ids still to come after the current one (legacy dev-harness display). */
  private remainingQuestionIds(): string[] {
    if (this.phase !== 'questions') return [];
    return this.outstanding().map((q) => q.id);
  }

  /** A defensive read-only snapshot of the current state. */
  private snapshot(): OrchestratorState {
    const question = this.pendingQuestion();
    return {
      phase: this.phase,
      spec: this.snapshotSpec(),
      activeExpert: this.activeExpert ? { ...this.activeExpert } : undefined,
      question: question ? cloneQuestion(question) : undefined,
      // How many of the slate are answered. Kept on the snapshot under its old name because the
      // dev harness reads it; it is a COUNT now, never a position.
      questionIndex: this.questions.filter((q) => this.answers[q.id] !== undefined).length,
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
  /**
   * What the opening message ALREADY said about a career search, as closed signal values — so the
   * diagnosis never asks a question the person has effectively answered already. Absent whenever the
   * message supported nothing, which is the ordinary case and is not a failure.
   */
  signals?: CareerKnownSignals;
}

/**
 * A diagnosis question, as the interview surfaces it.
 *
 * The OPTIONS ARE THE PARTNER'S ANSWER KINDS, worded as somebody would say them — and `allowOther` is
 * true because the whole move the founder asked for on 2026-08-21 is fewer closed cards and more of a
 * conversation. Tapping is free, typing is a call; the cards stay underneath as an offer rather than
 * as the only way through.
 *
 * `intent: 'baseline'` because that is what a diagnosis question IS — where you are right now — and
 * the surfaced prompt is the authored one rather than a meta-voiced template: these words are the
 * partner's clinical instrument, not a phrasing choice.
 */
function diagnosisQuestionAsDomainQuestion(question: CareerDiagnosisQuestion): DomainQuestion {
  return {
    id: question.id,
    intent: 'baseline',
    // The user's own language, through the same `library` cache the authored Journeys use — the
    // authored English is the fallback, never the thing a Hebrew speaker is shown.
    prompt: arcCopy(question.promptKey, question.prompt),
    options: question.options.map((option) => arcCopy(option.labelKey, option.label)),
    allowOther: true,
  };
}

/** The closed value behind a label the person tapped, in whatever language they read it in. */
function diagnosisValueFor(
  question: CareerDiagnosisQuestion,
  chosen: string,
): string | undefined {
  return question.options.find((option) => arcCopy(option.labelKey, option.label) === chosen)?.value;
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
/**
 * Which copy key voices each axis. A MAP rather than `interview.${intent}` (which is what this was
 * until 2026-09-07) because that template silently paired a question with another axis's words the
 * moment two questions shared an intent — and two did. The horizon question was `time`, so it was
 * asked as "how much time can you realistically give this each week?" and answered with "about two
 * months", and the same prompt appeared twice in one interview. Both were the partner's findings 10
 * and 11, and both were this one line.
 *
 * An intent with no entry is NOT voiced: the question keeps the words its author gave it, which is
 * the safe direction to fail in.
 */
const META_VOICE_KEYS: Partial<Record<QuestionIntent, string>> = {
  foundation: 'interview.foundation',
  baseline: 'interview.baseline',
  time: 'interview.time',
  obstacles: 'interview.obstacles',
  motivation: 'interview.motivation',
  milestones: 'interview.milestones',
  horizon: 'interview.horizon.prompt',
};

/**
 * The offline reading of "what should I call you": their answer, when it IS a name and nothing else.
 *
 * Not a guess — it is literally what they typed, unchanged. It exists so the name still lands when
 * the model is unreachable, which is the ordinary offline invariant applied to the one thing the
 * introduction has to learn. One word, letters only, short: "Guy" or "גיא" qualifies, "I'd rather
 * not say" does not, and anything it cannot place returns nothing.
 */
function literalName(said: string): string | null {
  const text = said.trim();
  if (text.length === 0 || text.length > 24) return null;
  return /^[\p{L}][\p{L}'\u2019-]*$/u.test(text) ? text : null;
}

/**
 * Which language somebody is writing in, from what they wrote.
 *
 * Script detection rather than language detection, and only for the scripts this product actually
 * ships. It answers the one question that matters — *is this person writing Hebrew?* — without a
 * dependency, a model call, or a confident guess about a language we do not speak. Anything it
 * cannot place returns undefined, and the caller falls back to the app's own language, which is
 * exactly what happened before this existed.
 */
export function writtenLocale(text: string): string | undefined {
  // The Hebrew block. A single Hebrew letter is enough: nobody types one by accident, while an
  // English word inside a Hebrew sentence is ordinary.
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  if (/[A-Za-z]/.test(text)) return 'en';
  return undefined;
}

/** Hebrew and Latin letters in a text, counted. The two scripts this product ships. */
function scriptCounts(text: string): { hebrew: number; latin: number } {
  return {
    hebrew: (text.match(/[\u05D0-\u05EA]/g) ?? []).length,
    latin: (text.match(/[A-Za-z]/g) ?? []).length,
  };
}

/** How many Latin words a message needs, with no Hebrew at all, before it counts as written in English. */
const PLAIN_ENGLISH_MIN_WORDS = 4;

/**
 * Which language a message MID-CONVERSATION is plainly written in, or undefined when it is not clear.
 *
 * Stricter than {@link writtenLocale}, which reads the opening, because here a wrong answer switches
 * a conversation that is already under way. And deliberately LOPSIDED:
 *  · Hebrew wins when there are more Hebrew letters than Latin ones. Somebody writing Hebrew is
 *    writing Hebrew; an English speaker does not type a Hebrew sentence by accident.
 *  · English needs no Hebrew at all and at least {@link PLAIN_ENGLISH_MIN_WORDS} Latin words.
 *    English words inside Hebrew are ordinary (a job title, a tool, "Python", "Google Cloud"), and an
 *    answer made only of them must not turn a Hebrew conversation into an English one.
 */
export function plainlyWrittenLocale(text: string): string | undefined {
  const { hebrew, latin } = scriptCounts(text);
  if (hebrew > latin) return 'he';
  if (hebrew > 0) return undefined;
  const words = (text.match(/[A-Za-z][A-Za-z'\u2019-]*/g) ?? []).length;
  return words >= PLAIN_ENGLISH_MIN_WORDS ? 'en' : undefined;
}

/**
 * The language a COMPOSED turn is written in: whichever script has more letters. Used only to see
 * whether the composer honoured a request, so a quoted word in the other script cannot tip it.
 */
export function dominantLocale(text: string): string | undefined {
  const { hebrew, latin } = scriptCounts(text);
  if (hebrew > latin) return 'he';
  if (latin > hebrew) return 'en';
  return undefined;
}

/**
 * How many words IN A ROW of the other script make a sentence rather than a name or a term.
 *
 * The same bar as {@link PLAIN_ENGLISH_MIN_WORDS}, deliberately: four Latin words are where a
 * person's own message counts as English, so four are where a coach turn has English in it. A name
 * ("ליעם"), a product ("Google Cloud") or a job title ("Senior product manager") stays under it.
 */
const FOREIGN_SENTENCE_MIN_WORDS = PLAIN_ENGLISH_MIN_WORDS;

/** Runs of Hebrew letters, and runs of Latin ones, as words. */
const HEBREW_LETTERS = /[\u05D0-\u05EA]+/g;
const LATIN_LETTERS = /[A-Za-z]+/g;
const HEBREW_WORD = /[\u05D0-\u05EA][\u05D0-\u05EA'"\u05F3\u05F4-]*/g;
const LATIN_WORD = /[A-Za-z][A-Za-z'\u2019-]*/g;

/**
 * The most words of the OTHER script that appear with none of `locale`'s own letters between them.
 * Punctuation, digits and spaces do not break a run: "you mentioned that if this changed, you'd…" is
 * one run, however many commas it has.
 */
function longestForeignRun(text: string, locale: 'he' | 'en'): number {
  const [own, foreignWord] = locale === 'he' ? [HEBREW_LETTERS, LATIN_WORD] : [LATIN_LETTERS, HEBREW_WORD];
  return text
    .split(own)
    .reduce((most, segment) => Math.max(most, (segment.match(foreignWord) ?? []).length), 0);
}

/**
 * Is a COMPOSED turn written in `locale`, and only in it? Deterministic; no model call.
 *
 * Two conditions, both needed:
 *  · more WORDS in the locale's script than in the other. Words rather than letters (which is what
 *    {@link dominantLocale} counts): "אתה עובד כ-Senior product manager כבר שנתיים?" has more Latin
 *    letters than Hebrew ones and is plainly a Hebrew sentence; and
 *  · no run of {@link FOREIGN_SENTENCE_MIN_WORDS} or more words in the other script. That is what
 *    catches a turn that is mostly Hebrew and then says a whole sentence in English, which the
 *    count alone would let through.
 * A locale this product does not ship is not judged: there is nothing to check it against.
 */
export function turnIsWrittenIn(text: string, locale: string): boolean {
  if (locale !== 'he' && locale !== 'en') return true;
  const hebrew = (text.match(HEBREW_WORD) ?? []).length;
  const latin = (text.match(LATIN_WORD) ?? []).length;
  const [own, other] = locale === 'he' ? [hebrew, latin] : [latin, hebrew];
  if (own <= other) return false;
  return longestForeignRun(text, locale) < FOREIGN_SENTENCE_MIN_WORDS;
}

/**
 * The supported languages a message NAMES, in either language's word for it. Only a name, never a
 * decision: "I want to improve my English" names English too, which is why a switch also needs the
 * composer to have read it as a request and written its turn in that language.
 */
const LANGUAGE_NAMES: readonly { locale: string; pattern: RegExp }[] = [
  { locale: 'he', pattern: /hebrew|ivrit|עברית/i },
  { locale: 'en', pattern: /english|אנגלית/i },
];

export function namedLocales(text: string): string[] {
  return LANGUAGE_NAMES.filter(({ pattern }) => pattern.test(text)).map(({ locale }) => locale);
}

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
 * with its KIND in plain language (e.g. "Pushups 100→500/week — a step-by-step plan …").
 *
 * ── IT IS OPEN NOW (founder, 2026-09-15) ───────────────────────────────────────────────────────
 *
 * It used to be `allowOther: false`, which made it the most jarring card in the flow: somebody had
 * just written two goals in their own words and was handed a numbered menu, on the second turn. The
 * goals are still the only real answers — so the cards stay, the composer stays open beside them,
 * and a typed sentence is read back onto one of these exact options by
 * {@link CoachOrchestrator.readSpokenFocusPick}. An answer that cannot be placed changes nothing.
 */
function buildFocusQuestion(goals: UnderstoodGoal[], copy: FocusCopy): DomainQuestion {
  return {
    id: FOCUS_QUESTION_ID,
    intent: 'foundation',
    prompt: copy.intro,
    options: goals.map((g) => `${g.title} — ${copy.kindLabels[g.kind]}`),
    allowOther: true,
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
    const signals = extractCareerSignals((rec as { careerSignals?: unknown }).careerSignals);
    goals.push({ title, kind, domain, ...(signals ? { signals } : {}) });
  }
  return goals;
}

/**
 * Read the career signals the understanding step reported, keeping ONLY what the vocabulary allows.
 *
 * Every name must be a signal we declared and every value must be one that signal may take. A model
 * that returns `targetClarity: "unsure"` has said something real about a person and something this
 * system has no place to put — and inventing a place for it is how a closed enum stops being closed.
 * Dropped, and the question stays askable, which is the correct outcome of not knowing.
 */
function extractCareerSignals(raw: unknown): CareerKnownSignals | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const hint of CAREER_SIGNAL_HINTS) {
    const value = (raw as Record<string, unknown>)[hint.signal];
    if (typeof value === 'string' && hint.values.includes(value)) out[hint.signal] = value;
  }
  return Object.keys(out).length > 0 ? (out as CareerKnownSignals) : undefined;
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
