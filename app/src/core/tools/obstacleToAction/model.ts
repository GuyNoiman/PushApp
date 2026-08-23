/**
 * Obstacle to Action — the pure model behind one if–then response a person can actually recognise
 * and perform.
 *
 * WHERE IT COMES FROM AND WHAT WE CHANGED. The four-part structure (wish, outcome, obstacle,
 * response) is the well-evidenced one behind WOOP and implementation intentions. What existing
 * digital versions almost all do is collect the four texts and stop. Ours checks the thing that
 * decides whether the plan survives contact with a Tuesday: is the trigger something you would
 * NOTICE, and is the response small enough and yours to perform (PRD §2, §6).
 *
 * THE QUALITY CHECK IS DETERMINISTIC, LOCAL AND STRUCTURAL. It runs on the device, sends nothing,
 * and it looks at shape — length, several actions bundled into one, a response that depends on
 * somebody else, a promise nobody can keep. It deliberately does NOT judge content: it cannot know
 * whether "call my sister" is a good idea, and a tool that pretended to would be wrong in the exact
 * moments that matter. Every flag is a QUESTION shown to the person, never a refusal — a plan that
 * fails every check can still be saved (PRD §11).
 *
 * THE LEXICONS ARE PASSED IN, not hardcoded. The markers for "somebody else" and "a guarantee" are
 * words, and words are per-language; the screen supplies them from i18n so the engine stays pure and
 * the Hebrew check is as real as the English one.
 *
 * IT NEVER TOUCHES THE LINKED OBJECT. Choosing a Dream or a Journey creates CONTEXT and nothing
 * else: no Step, no reminder, no edit, ever (PRD §9).
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */

/** Where the obstacle came from. A standalone one belongs to nothing and that is allowed. */
export type ObstacleContextType = 'journey' | 'dream' | 'standalone';

/** The four semantic stages, in order (PRD §5). */
export const OBSTACLE_STAGES = ['wish', 'outcome', 'obstacle', 'response'] as const;
export type ObstacleStage = (typeof OBSTACLE_STAGES)[number];

export interface ObstacleActionResult {
  id: string;
  contextType: ObstacleContextType;
  /** The Dream or Journey this is about. A deleted one is dropped, never left dangling. */
  contextId?: string;
  wish: string;
  /** What would become better. Skippable (PRD §11). */
  outcome?: string;
  obstacle: string;
  /** "When I notice…" */
  trigger: string;
  /** "…I will…" */
  response: string;
  status: 'draft' | 'confirmed' | 'superseded';
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
}

export function startResult(
  id: string,
  contextType: ObstacleContextType,
  now: number,
  contextId?: string,
): ObstacleActionResult {
  return {
    id,
    contextType,
    ...(contextId ? { contextId } : {}),
    wish: '',
    obstacle: '',
    trigger: '',
    response: '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function setField(
  result: ObstacleActionResult,
  field: 'wish' | 'outcome' | 'obstacle' | 'trigger' | 'response',
  text: string,
  now: number,
): ObstacleActionResult {
  if (field === 'outcome' && text.trim().length === 0) {
    const { outcome: _o, ...rest } = result;
    return { ...rest, updatedAt: now };
  }
  return { ...result, [field]: text, updatedAt: now };
}

/** A link whose Dream or Journey is gone becomes a standalone result (PRD §11). */
export function dropMissingContext(
  result: ObstacleActionResult,
  contextExists: boolean,
  now: number,
): ObstacleActionResult {
  if (result.contextType === 'standalone' || contextExists) return result;
  const { contextId: _c, ...rest } = result;
  return { ...rest, contextType: 'standalone', updatedAt: now };
}

// ── The local quality check ──────────────────────────────────────────────────

/** What the check can notice. Each one is a question for the person, never a verdict. */
export type QualityFlag =
  | 'triggerVague'
  | 'responseVague'
  | 'responseNotYours'
  | 'responseSeveralActions'
  | 'responsePromisesTooMuch';

/** The words that make a check real in this language. Supplied by the screen from i18n. */
export interface QualityLexicon {
  /** Markers that the response depends on somebody else: "they will", "he agrees"… */
  otherPeople: readonly string[];
  /** Absolutes nobody can promise: "always", "never", "completely"… */
  guarantees: readonly string[];
  /** Words that join two actions into one sentence: "and", "then", "also"… */
  conjunctions: readonly string[];
}

const MIN_WORDS = 3;

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function containsAny(text: string, markers: readonly string[]): boolean {
  const haystack = ` ${text.toLowerCase()} `;
  return markers.some((marker) => marker.trim().length > 0 && haystack.includes(` ${marker.toLowerCase()} `));
}

/**
 * Look at the shape of the trigger and the response.
 *
 * Returns the flags in a fixed order so the screen's wording is stable between runs, and returns an
 * EMPTY array when nothing stands out — which is the common case and not a compliment.
 */
export function checkQuality(
  result: Pick<ObstacleActionResult, 'trigger' | 'response'>,
  lexicon: QualityLexicon,
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const trigger = result.trigger.trim();
  const response = result.response.trim();

  if (words(trigger).length < MIN_WORDS) flags.push('triggerVague');
  if (words(response).length < MIN_WORDS) flags.push('responseVague');
  if (containsAny(response, lexicon.otherPeople)) flags.push('responseNotYours');
  if (containsAny(response, lexicon.conjunctions)) flags.push('responseSeveralActions');
  if (containsAny(response, lexicon.guarantees)) flags.push('responsePromisesTooMuch');

  return flags;
}

/** Both halves must exist before the sentence means anything. Quality flags never block. */
export function canConfirm(result: ObstacleActionResult): boolean {
  return result.trigger.trim().length > 0 && result.response.trim().length > 0;
}

/**
 * Confirm the response.
 *
 * The previous confirmed version is the caller's to keep or supersede — this returns the new one and
 * never mutates anything else, because "the original remains current until the user approves the
 * complete replacement" (PRD §6) is a rule about what the SCREEN does with two objects.
 */
export function confirmResult(result: ObstacleActionResult, now: number): ObstacleActionResult {
  if (!canConfirm(result)) return result;
  return {
    ...result,
    wish: result.wish.trim(),
    obstacle: result.obstacle.trim(),
    trigger: result.trigger.trim(),
    response: result.response.trim(),
    status: 'confirmed',
    confirmedAt: now,
    updatedAt: now,
  };
}

export function supersede(result: ObstacleActionResult, now: number): ObstacleActionResult {
  return { ...result, status: 'superseded', updatedAt: now };
}

/**
 * How long a response stays CURRENT — ninety days, or until the Journey it belongs to ends or
 * changes materially (PRD §9). It stays visible either way; it simply stops being offered as
 * current context until the person confirms it again.
 */
export const RESULT_FRESH_DAYS = 90;

export function isCurrent(
  result: ObstacleActionResult,
  now: number,
  contextStillActive = true,
): boolean {
  if (result.status !== 'confirmed' || !result.confirmedAt) return false;
  if (!contextStillActive) return false;
  return now - result.confirmedAt <= RESULT_FRESH_DAYS * 24 * 60 * 60 * 1000;
}

/** The confirmed responses, newest first. Superseded ones are history, not results. */
export function confirmed(results: readonly ObstacleActionResult[]): ObstacleActionResult[] {
  return [...results]
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0));
}

export function isObstacleActionResult(value: unknown): value is ObstacleActionResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<ObstacleActionResult>;
  return (
    typeof r.id === 'string' &&
    typeof r.trigger === 'string' &&
    typeof r.response === 'string' &&
    typeof r.wish === 'string' &&
    typeof r.obstacle === 'string' &&
    (r.contextType === 'journey' || r.contextType === 'dream' || r.contextType === 'standalone') &&
    (r.status === 'draft' || r.status === 'confirmed' || r.status === 'superseded')
  );
}
