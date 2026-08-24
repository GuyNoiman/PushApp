/**
 * Coach Context Summaries — what the coach is allowed to REMEMBER between conversations.
 *
 * Built to `04_Product/PRD/Coach_Context_Summaries_PRD.md` (Approved 2026-08-11).
 *
 * ── THE PROBLEM, AND THE THING WE ARE NOT DOING ────────────────────────────────────────────────
 *
 * A coach who forgets everything asks the same three questions every time, and a person who has to
 * re-explain their life to a machine stops bothering. The obvious fix is to keep the conversation —
 * and that is exactly the fix this PRD refuses. A transcript is an open-ended archive of somebody's
 * most private sentences, held forever, for a benefit that a few bounded fields already deliver.
 *
 * So what persists is a SUMMARY: short, bounded, derived, and attached to one Dream or one Journey.
 * Never a transcript, never a profile of the person, never a diagnosis, and never something inferred
 * from behaviour alone.
 *
 * ── THE FOUR RULES THE TYPES THEMSELVES ENFORCE ────────────────────────────────────────────────
 *
 * 1. **BOUNDED.** Every field is a short line or a short list of short lines, and the bounds are
 *    applied on the way in ({@link ../bounds}) rather than hoped for. An unbounded string field is
 *    how a "summary" becomes a transcript one paste at a time.
 * 2. **ATTACHED.** A context belongs to a Dream or a Journey and dies with it. There is deliberately
 *    no account-level object — that would be a user profile, which is the thing this is not.
 * 3. **PROVENANCE.** Every context records whether it came from something the person SAID or from a
 *    change they APPROVED. Approving a Journey is not permission to infer anything else about them.
 * 4. **VERSIONED.** Schema version on the record, text version on the consent. A material change to
 *    what we keep means asking again, and that is only possible if we wrote down what was agreed to.
 *
 * ── AND THE ONE THING THIS INITIAL VERSION DOES NOT DO (2026-08-24) ────────────────────────────
 *
 * It does not SYNC. PRD §9 requires end-to-end encryption for synchronised summaries and says in as
 * many words that Claude must propose the key-management design for security review first. Until
 * that review happens, these records stay on the device that made them: excluded from the account
 * backup ({@link ../../backup/redactForBackup}), from every social payload, and from export-by-sync.
 * The honest consequence is written into the consent text — a lost phone means the coach starts
 * fresh — because a consent screen that implies otherwise is worse than no screen at all.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */

/** Bumped when the SHAPE of a stored context changes. */
export const COACH_CONTEXT_SCHEMA_VERSION = 1;

/**
 * The version of the CONSENT TEXT people agree to.
 *
 * A date rather than a number, because the thing being versioned is wording somebody read. When the
 * data, the purpose, the recipient or the protection changes materially, this moves and everybody is
 * asked again — see {@link ./consent needsAsking}.
 */
export const COACH_MEMORY_CONSENT_VERSION = '2026-08-24';

/** How long any single remembered line may be. Short enough to be a summary, not a paragraph. */
export const MAX_FIELD_CHARS = 240;
/** How many lines any single list may hold. */
export const MAX_LIST_ITEMS = 5;

/**
 * Where a remembered field came from.
 *
 * `stated` — the person said it. `approvedChange` — it follows narrowly and deterministically from a
 * Dream/Journey change they approved. There is no third value on purpose: "we noticed you keep
 * missing Tuesdays" is behaviour, and behaviour may shape a suggestion today but never becomes
 * memory (PRD §6).
 */
export type ContextProvenance = 'stated' | 'approvedChange';

/**
 * The KINDS of obstacle a plan may anticipate — categories, never a description of a person.
 *
 * An enum rather than free text is the minimisation rule doing real work: "he drinks when work is
 * bad" is a sentence this shape cannot hold, and `energy` is all the planner ever needed.
 */
export const OBSTACLE_CATEGORIES = [
  'time',
  'energy',
  'motivation',
  'environment',
  'skill',
  'support',
  'other',
] as const;
export type ObstacleCategory = (typeof OBSTACLE_CATEGORIES)[number];

interface ContextBase {
  /** The id of the Dream or Journey this belongs to. It has no independent life. */
  id: string;
  schemaVersion: number;
  updatedAt: number;
  provenance: ContextProvenance;
  /** The conversation or approved change this came from, so a correction knows what to replace. */
  sourceId?: string;
}

/** What the coach remembers about a Dream. Never Steps, never a schedule, never "they want to start now". */
export interface DreamCoachContext extends ContextBase {
  kind: 'dream';
  /** The approved direction, and why it matters to them. */
  direction?: string;
  /** Where they said they are starting from. */
  startingPoint?: string;
  /** Durable preferences that should shape any future Journey under this Dream. */
  boundaries: string[];
  /** What is still open — so the coach can ask, rather than assume it once knew. */
  openQuestions: string[];
}

/** What the coach remembers about a Journey. Never the Steps — those are the Journey itself. */
export interface JourneyCoachContext extends ContextBase {
  kind: 'journey';
  outcome?: string;
  startingPoint?: string;
  /** The reasons already represented by the Journey's Why. */
  reasons: string[];
  /** What shaped the plan: time, place, preference. */
  constraints: string[];
  obstacleCategories: ObstacleCategory[];
  /** Why an approved adaptation was made, so the next one does not undo it. */
  adaptationRationale: string[];
  /** What we are ASSUMING — the coach says these out loud rather than treating them as facts. */
  assumptions: string[];
}

export type CoachContext = DreamCoachContext | JourneyCoachContext;

/** Affirmative, versioned, and recorded with what was actually agreed to (PRD §4). */
export interface CoachMemoryConsent {
  state: 'granted' | 'declined' | 'withdrawn';
  /** The {@link COACH_MEMORY_CONSENT_VERSION} in force when they answered. */
  version: string;
  /** The language the text was read in. A consent is to WORDS, and the words have a language. */
  locale: string;
  at: number;
}

/** Everything this feature stores. Absent on an account that has never been asked. */
export interface CoachMemoryState {
  consent?: CoachMemoryConsent;
  dreams: DreamCoachContext[];
  journeys: JourneyCoachContext[];
}

export function emptyCoachMemory(): CoachMemoryState {
  return { dreams: [], journeys: [] };
}
