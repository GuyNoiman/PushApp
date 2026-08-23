/**
 * A Self-Compassion Moment — the pure model of a practice that deliberately learns NOTHING.
 *
 * THIS IS THE ONE TOOL WHOSE INFLUENCE CONTRACT IS EMPTY BY DESIGN (PRD §8). It does not ask what
 * happened, does not store why it was opened, does not count how often, and does not infer distress
 * from repetition. There is no `signals.ts` next to this file and there never will be: the absence
 * is the contract. The only thing that may outlive a session is a phrase the person deliberately
 * saved for themselves.
 *
 * WHY SO LITTLE LOGIC. The practice is three sentences and a breath. Almost everything is copy, and
 * copy belongs in i18n. What lives here is the sequence, the approved phrases' ids, and the breath
 * timing — the parts a test can hold onto.
 *
 * SAFETY (PRD §10). This is not therapy, not diagnosis, and not crisis support, and the tool must
 * never imply it can detect a crisis. A custom phrase that attacks the person is NOT interpreted —
 * we cannot judge somebody's words about themselves — but the neutral authored phrases stay offered
 * beside it, and leaving is always one tap away.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */

/** How the person moves through it. Audio is authored guidance and is dependency-gated in POC. */
export type CompassionMode = 'read' | 'audio';

/** The practice, in order (PRD §5). */
export const COMPASSION_STEPS = ['acknowledge', 'humanity', 'kindness', 'breathe', 'finish'] as const;
export type CompassionStep = (typeof COMPASSION_STEPS)[number];

export function nextStep(step: CompassionStep): CompassionStep | null {
  const index = COMPASSION_STEPS.indexOf(step);
  return index >= 0 && index < COMPASSION_STEPS.length - 1 ? COMPASSION_STEPS[index + 1] : null;
}

export function previousStep(step: CompassionStep): CompassionStep | null {
  const index = COMPASSION_STEPS.indexOf(step);
  return index > 0 ? COMPASSION_STEPS[index - 1] : null;
}

/**
 * The authored kindness phrases. Their words live in i18n; these ids are what the code carries, so a
 * saved phrase survives a language change as the SAME phrase rather than as stale text.
 */
export const KINDNESS_PHRASES = ['allowedHuman', 'bestYouCould', 'allowedHard'] as const;
export type KindnessPhraseId = (typeof KINDNESS_PHRASES)[number];

/**
 * What the person carries out of the practice: one of the authored phrases, their own words, or
 * nothing at all. Nothing is the default and it is a complete outcome.
 */
export type CarriedPhrase =
  | { kind: 'authored'; id: KindnessPhraseId }
  | { kind: 'custom'; text: string }
  | { kind: 'none' };

/** The one thing that may be persisted, and only if the person asks for it (PRD §9). */
export interface SavedPhrase {
  id: string;
  /** An authored phrase is stored by id; the person's own words are stored as words. */
  phrase: CarriedPhrase;
  createdAt: number;
  updatedAt: number;
}

export function isSavedPhrase(value: unknown): value is SavedPhrase {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<SavedPhrase>;
  if (typeof p.id !== 'string' || typeof p.createdAt !== 'number') return false;
  const phrase = p.phrase as CarriedPhrase | undefined;
  if (!phrase || typeof phrase !== 'object') return false;
  if (phrase.kind === 'authored') return (KINDNESS_PHRASES as readonly string[]).includes(phrase.id);
  if (phrase.kind === 'custom') return typeof phrase.text === 'string';
  return phrase.kind === 'none';
}

/** A custom phrase is short on purpose: this is a sentence to carry, not a journal entry. */
export const CUSTOM_PHRASE_MAX_CHARS = 120;

/** Whether there is anything to carry into the breath. */
export function hasPhrase(phrase: CarriedPhrase): boolean {
  return phrase.kind === 'authored' || (phrase.kind === 'custom' && phrase.text.trim().length > 0);
}

/** Whether a phrase is worth offering to save. Nothing to save is not an error state. */
export function canSave(phrase: CarriedPhrase): boolean {
  return hasPhrase(phrase);
}

/**
 * The breath. Three slow rounds, four seconds in and six out — the longer exhale is the part that
 * settles a body, and it is the only reason these two numbers differ.
 */
export const BREATH_ROUNDS = 3;
export const BREATH_IN_MS = 4000;
export const BREATH_OUT_MS = 6000;

/** How long the whole breathing screen runs, for the caller that shows progress through it. */
export function breathDurationMs(rounds = BREATH_ROUNDS): number {
  return rounds * (BREATH_IN_MS + BREATH_OUT_MS);
}
