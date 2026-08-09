/**
 * interviewPlaybook — the EDITABLE script the conversational coach follows when it interviews the
 * user to build a Journey (adaptive coach, S2.2). This is CONFIG, not logic: the opening line, the
 * three closed first-choices, and the ordered extraction targets per branch all live here so they
 * can be tuned without touching the S2.3 orchestrator (configuration-before-code, Engineering
 * Bible §E1). The orchestrator reads this playbook to decide what to ask next and fills a
 * {@link GoalSpec}; a real LLM (behind the {@link ../llm/LlmClient} seam) does the wording.
 *
 * Terminology is canonical: the mid-layer object is a Milestone (never "Phase"). A "progressive"
 * process builds through ordered Milestones; a "fixed" process is a single recurring habit with
 * none.
 *
 * SECURITY-PRIVACY G1: the FIELDS the coach extracts (title, motivation, failure risks, …) become
 * ON-DEVICE-ONLY raw signal in the resulting {@link GoalSpec} — the same invariant as
 * learning/GoalInput. This config file itself holds only static, non-PII copy.
 *
 * LANGUAGE (C-Lang-1): the user-facing copy (opening, focus, choice labels, the front-load template
 * and the closing Support-Circle line) is resolved from the `coachContent` i18n namespace so the
 * coach SPEAKS the user's selected language. Each field is a getter that reads the ACTIVE language
 * off the shared framework-free i18next instance (`i18n.t`, never a React hook), so a language change
 * is reflected on the next access. Everything else here stays plain config.
 *
 * Pure TypeScript — no React hooks, no UI, no vendor SDKs (the i18next core instance is framework-free).
 */
import i18n from '../../i18n';
import type { FeasibilityAssessment, InterviewAnswers } from '../learning/DomainExpert';
import type { DomainId } from '../learning/experts/registry';
import type { Cadence, DayPart } from '../types/domain';

/** Resolve a `coachContent` string in the user's ACTIVE language (i18next core — no React). */
const cc = (key: string): string => i18n.t(key, { ns: 'coachContent' });

/**
 * The process SHAPE the user is signing up for.
 *
 * The TWO-LAYER coach captures this up front, from the orchestrator's opening closed question, as
 * one of the meta-agent triple: `recurring` = a recurring habit to add to the weekly routine;
 * `process` = a new process/goal to build; `other` = something the user described in their own
 * words. The NEXT (scheduling) pass drives frequency-vs-staged planning from this value.
 *
 * The earlier legacy triple is retained for back-compat with the vestigial A/B/C
 * {@link InterviewChoice}s and the {@link ../coach/goalSpecToJourney} bridge: `fixed` = one
 * recurring habit (no Milestones); `progressive` = a build-up through ordered Milestones; `unknown`
 * = the transient "not sure" value.
 */
export type ProcessType =
  | 'recurring'
  | 'process'
  | 'other'
  | 'fixed'
  | 'progressive'
  | 'unknown';

/**
 * The KIND of goal the understanding step distils from the user's opening free text — the two
 * process shapes it can detect: a `recurring` habit or a staged `process`. A strict subset of
 * {@link ProcessType} (the coach never infers `other`/`fixed`/`progressive`/`unknown` from
 * understanding — those remain for the fallback path and the legacy bridge).
 */
export type GoalKind = 'recurring' | 'process';

/**
 * A goal the understanding step DETECTED but the user did NOT choose to build first. Kept
 * ON-DEVICE-ONLY on {@link GoalSpec.deferredGoals} so the coach can offer to build it next, with its
 * kind and domain already understood. Free-text `title` is on-device raw signal (G1).
 */
export interface DeferredGoal {
  /** Short title in the user's framing. ON-DEVICE-ONLY. */
  title: string;
  /** The shape of work understood for this goal — a recurring habit or a staged process. */
  processType: GoalKind;
  /** The classified domain, so building it next routes to the right expert. */
  domain: DomainId;
}

/** The three first-turn choices the coach offers, by id. */
export type InterviewBranchId = 'A' | 'B' | 'C';

/**
 * One ordered extraction target the coach works through. These map 1:1 onto {@link GoalSpec}
 * fields (and onward to learning/GoalInput + PlanConstraints), so the interview and the Planner
 * never fork on vocabulary.
 */
export type ExtractionField =
  | 'processType' // fixed vs progressive
  | 'milestones' // ordered Milestones (progressive only)
  | 'motivation' // why this matters — fuels honest, personal nudges
  | 'failureRisks' // what has derailed the user before, to plan around
  | 'timing' // when + session length + times/week
  | 'locationCalendar' // location / calendar relevance (CAPTURE-ONLY for now, S2)
  | 'supportCircle'; // closing Support-Circle recommendation

/** One of the three closed choices presented on the opening turn. */
export interface InterviewChoice {
  id: InterviewBranchId;
  /** The user-facing label of the choice. */
  label: string;
  /** The process shape this choice implies (the "other" choice starts `unknown`). */
  processType: ProcessType;
  /** Whether this branch builds through Milestones. */
  usesMilestones: boolean;
}

/** The ordered interview plan for one branch. */
export interface InterviewBranch {
  id: InterviewBranchId;
  /** The extraction targets, in the order the coach should try to cover them. */
  extractionOrder: ExtractionField[];
}

/**
 * The editable copy for the multi-goal FOCUS turn. When the understanding step detects more than one
 * goal in the user's opening, the coach reflects them back and asks the user to build ONE first.
 * `intro` frames the choice; `kindLabels` renders each detected goal's KIND in plain language next
 * to its title (so a `recurring` habit and a staged `process` read differently). CONFIG.
 */
export interface FocusCopy {
  /** Framing line shown before the numbered goal choices. */
  intro: string;
  /** Plain-language label for each goal kind, shown next to the goal title in the choices. */
  kindLabels: Record<GoalKind, string>;
}

/** The whole editable playbook. */
export interface InterviewPlaybook {
  /** The very first thing the coach says. */
  opening: string;
  /** The three closed choices offered right after {@link opening}. */
  choices: InterviewChoice[];
  /** Copy for the multi-goal focus turn (reflect detected goals, ask which to build first). */
  focus: FocusCopy;
  /** Per-branch ordered extraction plans, keyed by {@link InterviewBranchId}. */
  branches: Record<InterviewBranchId, InterviewBranch>;
  /**
   * A ready-made template the coach offers so a user who prefers to front-load everything can
   * describe the goal in one message instead of a back-and-forth. Placeholders in `{braces}`.
   */
  exampleMessageTemplate: string;
  /** The closing line that recommends building a Support Circle around the Journey. */
  supportCircleRecommendation: string;
}

// ── Extraction orders ─────────────────────────────────────────────────────────
// A fixed habit skips Milestones; a progressive process leads with them. Motivation and failure
// risks come early (they colour everything after); timing and location/calendar are concrete
// scheduling inputs; the Support-Circle recommendation always closes.

const FIXED_HABIT_ORDER: ExtractionField[] = [
  'processType',
  'motivation',
  'failureRisks',
  'timing',
  'locationCalendar',
  'supportCircle',
];

const PROGRESSIVE_ORDER: ExtractionField[] = [
  'processType',
  'milestones',
  'motivation',
  'failureRisks',
  'timing',
  'locationCalendar',
  'supportCircle',
];

// The "other / not sure" branch first resolves the process type, then follows the fuller
// progressive-style plan (Milestones become a no-op if it turns out fixed).
const OTHER_ORDER: ExtractionField[] = [
  'processType',
  'milestones',
  'motivation',
  'failureRisks',
  'timing',
  'locationCalendar',
  'supportCircle',
];

/**
 * The default, editable playbook. Tune the copy and the extraction orders here; the orchestrator
 * (S2.3) consumes this object and never hardcodes any of it.
 */
export const INTERVIEW_PLAYBOOK: InterviewPlaybook = {
  get opening() {
    return cc('opening');
  },
  focus: {
    get intro() {
      return cc('focus.intro');
    },
    kindLabels: {
      get recurring() {
        return cc('focus.kindLabels.recurring');
      },
      get process() {
        return cc('focus.kindLabels.process');
      },
    },
  },
  choices: [
    {
      id: 'A',
      get label() {
        return cc('choices.habit');
      },
      processType: 'fixed',
      usesMilestones: false,
    },
    {
      id: 'B',
      get label() {
        return cc('choices.process');
      },
      processType: 'progressive',
      usesMilestones: true,
    },
    {
      id: 'C',
      get label() {
        return cc('choices.other');
      },
      processType: 'unknown',
      usesMilestones: false,
    },
  ],
  branches: {
    A: { id: 'A', extractionOrder: FIXED_HABIT_ORDER },
    B: { id: 'B', extractionOrder: PROGRESSIVE_ORDER },
    C: { id: 'C', extractionOrder: OTHER_ORDER },
  },
  get exampleMessageTemplate() {
    return cc('exampleMessageTemplate');
  },
  get supportCircleRecommendation() {
    return cc('supportCircleRecommendation');
  },
};

// ── GoalSpec: the extraction schema the orchestrator fills ──────────────────────
// GoalSpec is what the interview PRODUCES. It is aligned field-for-field with learning/GoalInput
// (title, isHabit, description, cadence) and learning/PlanConstraints (targetDate,
// weeklyAvailabilityMinutes ← sessionMinutes × sessionsPerWeek, preferredDays, daypart) so S2.6
// can feed the deterministic Planner with no lossy translation.

/** One ordered Milestone the user described (progressive processes only). */
export interface MilestoneSpec {
  /** Short Milestone title (ON-DEVICE-ONLY, G1). */
  title: string;
  /** 0-based order within the Journey. */
  order: number;
}

/**
 * The concrete timing the coach extracts. `sessionMinutes × sessionsPerWeek` back-solves to
 * PlanConstraints.weeklyAvailabilityMinutes; `daypart`/`preferredDays`/`targetDate` map straight
 * across. All scalars — no PII.
 */
export interface TimingSpec {
  /** Preferred part of day → PlanConstraints.daypart. */
  daypart?: DayPart;
  /** Minutes per session. */
  sessionMinutes?: number;
  /** Target sessions per week. */
  sessionsPerWeek?: number;
  /** Preferred weekdays, JS `Date.getDay()` 0=Sun…6=Sat → PlanConstraints.preferredDays. */
  preferredDays?: number[];
  /** Optional deadline (epoch ms) → PlanConstraints.targetDate; absent ⇒ open-ended. */
  targetDate?: number;
}

/**
 * The structured result of one interview — what the orchestrator (S2.3) fills and the Planner
 * feed (S2.6) consumes. Free-text fields are ON-DEVICE-ONLY raw signal (G1) and must never be
 * synced or logged.
 */
export interface GoalSpec {
  /** What the user wants to become / achieve → GoalInput.title. ON-DEVICE-ONLY. */
  title: string;
  /**
   * The classified goal domain (SX.2) — routes {@link ../coach/goalSpecToJourney} to the matching
   * {@link ../learning/experts/registry DomainExpert}, so the SAME engine builds domain-appropriate
   * Milestones. The coach's extraction fills this; it defaults to `'general'` and any unrecognized
   * value falls back to `'general'` (never crashes, never invents a bad domain). Not PII — a coarse
   * category label, so it is safe to keep alongside the scheduling scalars.
   */
  domain: DomainId;
  /** Optional elaboration → GoalInput.description. ON-DEVICE-ONLY. */
  description?: string;
  /** The chosen / inferred process shape. */
  processType: ProcessType;
  /** Convenience mirror of GoalInput.isHabit — true for a `fixed` habit. */
  isHabit: boolean;
  /** Ordered Milestones for a progressive process; empty for a fixed habit. */
  milestones: MilestoneSpec[];
  /** Why this matters to the user. ON-DEVICE-ONLY. */
  motivation?: string;
  /** The failure risks the user named, for the coach to plan around. ON-DEVICE-ONLY. */
  failureRisks: string[];
  /** When / how long / how often the user can commit. */
  timing: TimingSpec;
  /** CAPTURE-ONLY (S2): did location seem relevant to this goal? (No geofencing yet.) */
  locationRelevant?: boolean;
  /** CAPTURE-ONLY (S2): did the user’s calendar seem relevant to this goal? */
  calendarRelevant?: boolean;
  /** Optional pace hint → GoalInput.cadence. */
  cadence?: Cadence;
  /** Whether the user accepted the closing Support-Circle recommendation. */
  wantsSupportCircle?: boolean;

  // ── Two-layer coach fields (triage → expert-driven interview) ──────────────────
  // Filled by the new {@link ./CoachOrchestrator} flow, ADDITIVELY over the fields above so the
  // deterministic build path (goalSpecToJourney) can honour the user's real answers. All optional
  // so a legacy or partially-built spec (no interview) still type-checks and plans.

  /**
   * The {@link ../learning/DomainExpert DomainExpert.displayName} of the expert the triage step
   * selected for this goal (e.g. "Body Image"). Surfaced for the dev harness / UI; not PII.
   */
  activeExpertDisplayName?: string;
  /**
   * The user's answers to the ACTIVE EXPERT's own {@link ../learning/DomainExpert interviewQuestions},
   * keyed by {@link ../learning/DomainExpert DomainQuestion.id}. Each value is a chosen closed option
   * or the user's free "Other" text. ON-DEVICE-ONLY raw signal (G1) — feeds the on-device expert +
   * Planner, never synced or logged.
   */
  answers?: InterviewAnswers;
  /** The expert's honest reality-check on the goal, from `assessFeasibility` (surfaced to the coach). */
  feasibility?: FeasibilityAssessment;

  /**
   * The user's free-text scheduling preference from the meta-agent "any specific days or times?"
   * question (e.g. "Tue/Thu evenings", or the plain "Yes, specific days" pick). EMPTY / undefined
   * when the user said they are flexible — the next (scheduling) pass then places Steps by frequency
   * only. Distinct from {@link TimingSpec.preferredDays} (the numeric weekday scheduling field the
   * next pass will populate). ON-DEVICE-ONLY raw signal (G1).
   */
  schedulingPreference?: string;

  /**
   * The OTHER goals the understanding step detected in the user's opening but that the user did NOT
   * choose to build first. Present only when the opening described more than one goal; the coach can
   * offer to build these next (their kind + domain are already understood). ON-DEVICE-ONLY (G1).
   */
  deferredGoals?: DeferredGoal[];
}
