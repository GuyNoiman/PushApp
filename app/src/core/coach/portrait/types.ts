/**
 * THE PORTRAIT (דיוקן) — what we understand about the person, as opposed to what they told us
 * about themselves.
 *
 * ── THE TWO THINGS CALLED A PROFILE, AND WHY THIS IS THE OTHER ONE ─────────────────────────────
 *
 * PERSONAL DETAILS are facts the person owns and edits: their name, their birth date, how they want
 * to be addressed, their Active Hours. They live in `state/ProfileProvider` and a screen shows them.
 *
 * The PORTRAIT is our READING of a conversation: what they want, where they are starting, what is in
 * the way, what drives them, what stage of change they are at. Nobody typed any of it into a form,
 * and nobody sees it. It is interpretation, not fact — which is the entire reason every field
 * carries a {@link Held.confidence} and a {@link Held.source}. A system that cannot tell what
 * somebody SAID from what a model INFERRED will eventually tell a person something about themselves
 * that they never said, in a voice that sounds certain.
 *
 * The founder named it on 2026-09-15, choosing it over "match profile": a match profile belongs to
 * the Journey catalogue, and a portrait belongs to the person. That is not a naming preference, it
 * is the design rule — the fields below come from what is worth knowing about a PERSON, never from
 * what would discriminate between the Journeys that happen to be authored today. A Portrait must
 * still be right when the library doubles.
 *
 *   > שיחת ההיכרות לומדת להכיר את המשתמש ללא תלות באילו מסעות קיימים באפליקציה
 *
 * That is also why the domain taxonomy below is the SPEC'S OWN (§8.2) rather than our
 * {@link ../../learning/registry DomainId} list: `DomainId` names the experts we have written, and
 * a field defined by which experts exist is a field that has to be rebuilt when one is added.
 *
 * ── IT IS A CACHE, NEVER A SOURCE OF TRUTH ─────────────────────────────────────────────────────
 *
 * The transcript is the truth. The Portrait is a reading of it, held so the engine does not have to
 * re-derive everything on every turn — and it can always be thrown away and rebuilt by reading
 * again, which is exactly what a correction does. Treating it as the truth is how a mis-extraction
 * becomes permanent.
 *
 * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. A Portrait is a short description of somebody's situation in
 * their own words. It must NEVER enter a DomainEvent, a ProgressSummary, a log line, an analytics
 * event or any sync path, and it is stripped from the account backup as well
 * (`../../backup/redactForBackup`). It lives in `AppState` so it is covered by the data export and
 * by the account wipe for free.
 *
 * Built to `04_Product/Onboarding_Journey_Matching_And_Coach_Handoff_Spec_v2_2026-09-14.md` §7–§13.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */

/** How sure we are of one field. `unknown` is the absence of knowledge, never a value. */
export type Confidence = 'unknown' | 'low' | 'medium' | 'high';

/** Where a field came from: the person's own words, or our reading of them (spec §29). */
export type PortraitSource = 'stated' | 'inferred';

/** Confidence as a number, so two readings can be compared. `unknown` is the floor. */
export const CONFIDENCE_RANK: Record<Confidence, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
};

/** Is this confidence at least `floor`? The one comparison the rest of the module needs. */
export function atLeast(confidence: Confidence | undefined, floor: Confidence): boolean {
  return CONFIDENCE_RANK[confidence ?? 'unknown'] >= CONFIDENCE_RANK[floor];
}

/**
 * One field of the Portrait, with its provenance attached.
 *
 * The provenance is not metadata — it is what makes the merge rules possible at all (see
 * {@link ./merge}). A value with no source cannot be protected from being overwritten by a guess.
 */
export interface Held<T> {
  value: T;
  confidence: Confidence;
  source: PortraitSource;
  /** Epoch ms this reading was recorded. */
  updatedAt: number;
}

// ── The closed taxonomies (spec §8.2, §8.5, §9.1, §10, §11) ─────────────────────────────────────
//
// Each value carries its MEANING in one line, straight from the spec. The meanings are not
// documentation: they are handed to the reader so it knows what it is choosing between, and to the
// composer so the understanding check can say "you have several directions and choosing is the hard
// part" instead of reading the token `too_many_options` aloud. One source, two consumers, and no
// chance of the prompt drifting from the enum.
//
// A value the model invents is DROPPED — exactly as `readConversation` drops an unknown question id.
// Inventing a place to put it is how a closed taxonomy stops being closed.

/** Which area of life the want belongs to (§8.2). */
export const DOMAIN_MEANINGS = {
  career: 'work, study, profession, what they do for a living',
  relationships: 'a partner, family, friendships, how they relate to people',
  health: 'body, fitness, food, sleep, medical',
  habits_lifestyle: 'daily routine, consistency, how the ordinary day is spent',
  money: 'income, spending, debt, financial security',
  personal_growth: 'who they are becoming, confidence, meaning, emotional life',
  other: 'something real that none of the above describes',
} as const;
export type PortraitDomain = keyof typeof DOMAIN_MEANINGS;

/** Where they are in the process of change, independently of domain (§8.5). */
export const STAGE_MEANINGS = {
  explore: 'still trying to understand what they want or what is possible',
  choose: 'they have meaningful options and need to decide',
  prepare: 'they know the direction and need to get ready',
  act: 'ready, and trying to take concrete action',
  unblock: 'already acting, but one specific obstacle prevents progress',
  sustain: 'they can start, but consistency is the problem',
  grow: 'already on the path and want to improve or advance',
} as const;
export type PortraitStage = keyof typeof STAGE_MEANINGS;

/**
 * What is actually preventing progress, universally (§9.1).
 *
 * The spec is emphatic that this is a DIFFERENT question from what they want: two people can want
 * the same thing and be stuck for reasons that have nothing to do with each other.
 */
export const BOTTLENECK_MEANINGS = {
  lack_of_clarity: 'they do not know what they want or where to aim',
  too_many_options: 'too many possibilities, none of them ruled out',
  decision_difficulty: 'the options are clear and choosing between them is the hard part',
  knowledge_or_skill_gap: 'they do not yet know how, or cannot yet do it',
  lack_of_plan: 'they know the direction and have no path to it',
  difficulty_starting: 'starting at all is where it breaks down',
  specific_execution_block: 'one concrete part of doing it is blocked',
  lack_of_access_or_opportunity: 'the door is not open to them',
  lack_of_evidence_or_confidence: 'they do not believe it can work, or that they can',
  inconsistent_behavior: 'they start and stop, repeatedly',
  lack_of_support: 'they are doing it alone and that is the problem',
  external_constraint: 'something outside their control is in the way',
  unknown: 'they have not said, and nothing in the conversation supports a guess',
} as const;
export type PortraitBottleneck = keyof typeof BOTTLENECK_MEANINGS;

/** How we can best help — not the same question as the bottleneck (§10). */
export const SUPPORT_NEED_MEANINGS = {
  clarity: 'help them understand what they want or what is happening',
  direction: 'help them find or choose a direction',
  planning: 'help them turn a direction into a path',
  action: 'help them start, or take the next concrete step',
  consistency: 'help them keep going',
  support: 'accountability, encouragement, or the right people around them',
} as const;
export type PortraitSupportNeed = keyof typeof SUPPORT_NEED_MEANINGS;

/** What they are realistically ready to do next (§11). */
export const READINESS_MEANINGS = {
  reflect: 'ready to think about it, not to move yet',
  explore: 'ready to look around',
  decide: 'ready to choose',
  prepare: 'ready to get ready',
  act: 'ready to do something concrete',
  maintain: 'ready to keep something going',
  unknown: 'not clear from the conversation',
} as const;
export type PortraitReadiness = keyof typeof READINESS_MEANINGS;

/**
 * THE PORTRAIT ITSELF.
 *
 * Every field is optional and absent means "we do not know", which is why there is no migration:
 * an account that predates this simply has no Portrait, and an empty Portrait is what a new one
 * starts as anyway.
 */
export interface Portrait {
  /** What they want to change, achieve or move toward right now, in their words (§8.1). */
  primaryWant?: Held<string>;
  /** Which area of life it belongs to (§8.2). */
  domain?: Held<PortraitDomain>;
  /** Where they are now in relation to the want, in their words (§8.3). */
  currentState?: Held<string>;
  /** What would meaningfully be different if this moved, in their words (§8.4). */
  desiredOutcome?: Held<string>;
  /** Where they are in the change process (§8.5). */
  stage?: Held<PortraitStage>;
  /** What is actually preventing progress (§9.1). */
  bottleneck?: Held<PortraitBottleneck>;
  /** How we can best help (§10). Opportunistic — it never creates a question of its own. */
  supportNeed?: Held<PortraitSupportNeed>;
  /** What they are ready to do next (§11). Opportunistic. */
  readiness?: Held<PortraitReadiness>;
  /** What they have already tried and what happened (§12). Opportunistic. */
  previousAttempts?: Held<string>;
  /** Constraints that change what is realistic — time, money, health, people (§13). Opportunistic. */
  constraints?: Held<string[]>;
}

/** Every field name the Portrait holds. */
export type PortraitFieldId = keyof Portrait;

/** What shape of value a field holds, which decides how a reading of it is validated. */
export type PortraitFieldKind = 'text' | 'list' | 'enum';

/** The declaration of one field: how it is validated, and how it is described to a model. */
export interface PortraitFieldSpec {
  id: PortraitFieldId;
  kind: PortraitFieldKind;
  /**
   * What this field IS, in one line, in English. Read by the reader (so it knows what to look for)
   * and by the composer (so the understanding check can say it in the person's own language).
   */
  describe: string;
  /** The closed vocabulary, for an `enum` field: value → its meaning. Absent otherwise. */
  values?: Readonly<Record<string, string>>;
}

/**
 * THE FIELD REGISTRY. Declaration order is the tiebreak everywhere a weight ties, so it reads
 * top-down the way a person is actually met: what they want, where, how it stands, where it is
 * going, what stage, what is in the way, and then the things nobody is ever asked outright.
 */
export const PORTRAIT_FIELDS: readonly PortraitFieldSpec[] = [
  { id: 'primaryWant', kind: 'text', describe: 'what they want to change or move toward right now' },
  { id: 'domain', kind: 'enum', describe: 'which area of life this belongs to', values: DOMAIN_MEANINGS },
  { id: 'currentState', kind: 'text', describe: 'where they are starting from right now' },
  { id: 'desiredOutcome', kind: 'text', describe: 'what would be different if this moved' },
  { id: 'stage', kind: 'enum', describe: 'where they are in the process of changing this', values: STAGE_MEANINGS },
  { id: 'bottleneck', kind: 'enum', describe: 'what is actually preventing progress', values: BOTTLENECK_MEANINGS },
  { id: 'supportNeed', kind: 'enum', describe: 'how we can best help them', values: SUPPORT_NEED_MEANINGS },
  { id: 'readiness', kind: 'enum', describe: 'what they are realistically ready to do next', values: READINESS_MEANINGS },
  { id: 'previousAttempts', kind: 'text', describe: 'what they already tried, and what happened' },
  { id: 'constraints', kind: 'list', describe: 'constraints that change what is realistic for them' },
];

/** The declaration of one field, by id. */
export function portraitField(id: PortraitFieldId): PortraitFieldSpec | undefined {
  return PORTRAIT_FIELDS.find((field) => field.id === id);
}

/** Is this one of the field names the Portrait actually holds? */
export function isPortraitField(value: unknown): value is PortraitFieldId {
  return typeof value === 'string' && PORTRAIT_FIELDS.some((field) => field.id === value);
}

/** Is this one of the four confidences? */
export function isConfidence(value: unknown): value is Confidence {
  return value === 'unknown' || value === 'low' || value === 'medium' || value === 'high';
}

/** Is this one of the two provenances? */
export function isPortraitSource(value: unknown): value is PortraitSource {
  return value === 'stated' || value === 'inferred';
}

/** What the Portrait holds for one field, whatever its shape. */
export type PortraitValue = string | string[];

/** One validated field update, as the reader hands it to the merge. */
export interface PortraitUpdate {
  field: PortraitFieldId;
  value: PortraitValue;
  confidence: Confidence;
  source: PortraitSource;
}
