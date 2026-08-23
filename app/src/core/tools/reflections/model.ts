/**
 * Reflections — the WRITING SURFACE, and the exercises that live on it.
 *
 * THE IMPORTANT DECISION IS THAT THIS IS NOT ONE TOOL. The founder named five things at once — the
 * best possible year, a daily journal, a start-of-week page, birthdays, recording a moment that
 * mattered — and they are the same surface with different prompts, different lengths, and different
 * answers to one question: **when does this come back to you?** Building "My Best Possible Year" as a
 * screen would mean building the next four as four more screens. It is built as an EXERCISE instead,
 * which is a row in a catalogue.
 *
 * ── WHAT AN EXERCISE DECLARES ──────────────────────────────────────────────────────────────────
 *
 *  · its **prompts** — the four or five angles it offers, which are jumping-off points and never
 *    required fields. A reflection with one paragraph in it is a finished reflection;
 *  · its **horizon** — how far ahead a letter is normally sent, and the presets a person picks from;
 *  · its **checkpoint** — an optional earlier return, which is the founder's own idea and a good one:
 *    a year is long enough to forget you wrote anything, and a halfway note is not a nag, it is the
 *    difference between a letter and a direction.
 *
 * ── WHAT IT IS NOT ─────────────────────────────────────────────────────────────────────────────
 *
 * **Not a streak, not a score, not a word count that judges.** The word count in the design is a
 * fact about the page, like a page number. Nothing here counts days in a row, because a writing
 * practice with a streak is a writing practice you eventually lie to.
 *
 * SECURITY-PRIVACY G1, and here it is the sharpest it gets anywhere in the app: a letter to your own
 * future self is the most personal thing this product will ever hold. It is stored ON DEVICE, never
 * synced, never logged, never a DomainEvent — and it is never sent to a model unless the person
 * asks, in the moment, having been told that is what happens.
 *
 * Pure TypeScript — no React, no i18n, no clock reads.
 */
import type { Attachment } from '../../media/MediaGateway';

/** The exercises. `bestYear` is built; the rest are named so the surface is designed for them. */
export const REFLECTION_IDS = [
  'bestYear',
  'daily',
  'weekStart',
  'birthday',
  'moment',
] as const;
export type ReflectionId = (typeof REFLECTION_IDS)[number];

export interface ReflectionExercise {
  id: ReflectionId;
  /** The angles it offers. i18n keys under `reflections.<id>.prompts.<key>`. */
  prompts: readonly string[];
  /** Days ahead the letter is offered to return, most likely first. Empty ⇒ it does not return. */
  horizons: readonly number[];
  /**
   * An earlier check-in, in days. The founder's: at six months, "are we still standing by this, and
   * are we moving that way?" Absent for exercises where a mid-point makes no sense.
   */
  checkpointDays?: number;
  /** Whether the person chooses a date at all, or the exercise is simply for today. */
  scheduled: boolean;
}

const YEAR = 365;

export const REFLECTION_EXERCISES: Record<ReflectionId, ReflectionExercise> = {
  /**
   * My Best Possible Year — you write from a year ahead, in the past tense, as though it went as
   * well as it realistically could. The last three words carry the exercise: not a fantasy, and not
   * a plan. A fantasy teaches nothing and a plan is what the coach is for.
   */
  bestYear: {
    id: 'bestYear',
    prompts: ['personal', 'work', 'relationships', 'ordinaryDay'],
    horizons: [YEAR, YEAR * 2, 180],
    checkpointDays: 180,
    scheduled: true,
  },
  daily: { id: 'daily', prompts: ['today', 'noticed', 'tomorrow'], horizons: [], scheduled: false },
  weekStart: {
    id: 'weekStart',
    prompts: ['weekAhead', 'oneThing', 'watchFor'],
    horizons: [7],
    scheduled: true,
  },
  birthday: {
    id: 'birthday',
    prompts: ['pastYear', 'thisYear', 'toMyself'],
    horizons: [YEAR],
    scheduled: true,
  },
  moment: { id: 'moment', prompts: ['whatHappened', 'whyItMatters'], horizons: [90, YEAR], scheduled: true },
};

/** One written reflection. */
export interface Reflection {
  id: string;
  exercise: ReflectionId;
  writtenAt: number;
  /** What was written under each prompt. A prompt with nothing under it is simply absent. */
  sections: Readonly<Record<string, string>>;
  /**
   * Photos and voice notes kept with it (2026-08-21). Files on THIS device — see
   * {@link ../../media/MediaGateway}. They travel with the reflection and are deleted with it, and
   * like everything else here they never leave the phone.
   *
   * ADDITIVE ON PURPOSE: a reflection written before attachments existed simply has none, and a
   * build without the native modules simply cannot add any. Neither is a migration.
   */
  attachments?: readonly Attachment[];
  /** When the letter comes back, if it does. */
  deliverAt?: number;
  /** The earlier check-in, if the person kept it. */
  checkpointAt?: number;
  /** Set when the person has actually read it back, so it is never delivered twice. */
  readBackAt?: number;
}

/** Everything written, newest first. */
export type ReflectionArchive = readonly Reflection[];

/** How much has been written, across every prompt. A fact about the page, never a judgement. */
export function wordCount(sections: Readonly<Record<string, string>>): number {
  return Object.values(sections)
    .join(' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * True when there is anything at all to keep. One paragraph is a finished reflection — and so is one
 * photo with no words at all, which is often what a moment worth recording actually is.
 */
export function hasContent(
  sections: Readonly<Record<string, string>>,
  attachments: readonly Attachment[] = [],
): boolean {
  return (
    Object.values(sections).some((text) => text.trim().length > 0) || attachments.length > 0
  );
}

/** The instant a horizon lands on, from the day it was written. */
export function deliveryInstant(writtenAt: number, days: number): number {
  return writtenAt + days * 24 * 60 * 60 * 1000;
}

/**
 * Build the reflection to store.
 *
 * The checkpoint is only kept when it lands BEFORE the delivery — a "halfway" note that arrives
 * after the letter itself is not a checkpoint, it is a second letter, and someone choosing a
 * six-month horizon should not get one.
 */
export function buildReflection(input: {
  id: string;
  exercise: ReflectionId;
  writtenAt: number;
  sections: Readonly<Record<string, string>>;
  horizonDays?: number;
  keepCheckpoint?: boolean;
  attachments?: readonly Attachment[];
}): Reflection {
  const exercise = REFLECTION_EXERCISES[input.exercise];
  const sections = Object.fromEntries(
    Object.entries(input.sections).filter(([, text]) => text.trim().length > 0),
  );

  const deliverAt =
    input.horizonDays !== undefined
      ? deliveryInstant(input.writtenAt, input.horizonDays)
      : undefined;

  const checkpointAt =
    input.keepCheckpoint && exercise.checkpointDays !== undefined && deliverAt !== undefined
      ? deliveryInstant(input.writtenAt, exercise.checkpointDays)
      : undefined;

  return {
    id: input.id,
    exercise: input.exercise,
    writtenAt: input.writtenAt,
    sections,
    ...(input.attachments?.length ? { attachments: [...input.attachments] } : {}),
    ...(deliverAt !== undefined ? { deliverAt } : {}),
    ...(checkpointAt !== undefined && checkpointAt < deliverAt! ? { checkpointAt } : {}),
  };
}

/**
 * Anything due to be read back now — a checkpoint that has arrived, or the letter itself.
 *
 * A reflection already read back never returns: a letter that keeps arriving stops being a letter.
 */
export function dueNow(archive: ReflectionArchive, now: number): Reflection[] {
  return archive.filter(
    (r) =>
      r.readBackAt === undefined &&
      ((r.deliverAt !== undefined && r.deliverAt <= now) ||
        (r.checkpointAt !== undefined && r.checkpointAt <= now)),
  );
}

/** Which of the two moments is due, for copy that must not call a checkpoint "the letter". */
export function dueKind(r: Reflection, now: number): 'letter' | 'checkpoint' | null {
  if (r.readBackAt !== undefined) return null;
  if (r.deliverAt !== undefined && r.deliverAt <= now) return 'letter';
  if (r.checkpointAt !== undefined && r.checkpointAt <= now) return 'checkpoint';
  return null;
}
