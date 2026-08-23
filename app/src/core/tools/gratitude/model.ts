/**
 * Gratitude Log — the pure model behind a private, dated record of at least five things a person
 * appreciated in the period that just passed.
 *
 * WHAT MAKES IT OURS, and it is not the idea. Digital gratitude journals almost all pair three
 * prompts with a streak, a reminder that shames, a public feed or a word-cloud that mines the
 * entries for themes. This one takes FIVE, because five forces a pause past the obvious three; it
 * offers daily and weekly rhythms because a week is the honest unit for some people; and it analyses
 * nothing, ever (PRD §8: nothing enters the general user model, under D66).
 *
 * FIVE IS THE FLOOR, NOT A TARGET. A record with four entries is a draft and is kept as one — never
 * discarded, never scolded. Confirmation is the only thing five gates.
 *
 * THE PERIOD IS DECIDED WHEN THE DRAFT STARTS, and never silently reassigned. A draft begun on
 * Tuesday evening belongs to Tuesday even if it is confirmed after midnight, because the person was
 * writing about Tuesday (PRD §10, timezone change).
 *
 * Pure TypeScript — no React, no storage, no clock reads except where a caller passes `now`.
 */
import { dateKey } from '../../util/date';
export { perceivedLength } from '../text';
import { weekKey, type Weekday } from '../../util/week';

/** Daily or weekly. The chosen cadence becomes the default next time; it is never a commitment. */
export type GratitudeCadence = 'daily' | 'weekly';

/** How many entries a record must hold before it can be confirmed. */
export const MIN_ENTRIES = 5;

/** The POC ceiling — enough room to keep going, few enough that the ritual stays bounded. */
export const MAX_ENTRIES = 10;

/** User-perceived character limits (PRD §9). */
export const ENTRY_MAX_CHARS = 120;
export const WHY_MAX_CHARS = 300;

/** One line of the record, plus the optional note attached to the one entry the user chose. */
export interface GratitudeEntry {
  id: string;
  text: string;
}

export type GratitudeStatus = 'draft' | 'confirmed';

export interface GratitudeRecord {
  id: string;
  cadence: GratitudeCadence;
  /** The local period this record belongs to: a date key, or a week key. Assigned once. */
  periodKey: string;
  entries: GratitudeEntry[];
  /** The one entry the user chose to say more about, when they chose one. */
  deepenedEntryId?: string;
  /** Why that one mattered. Optional, always. */
  whyNote?: string;
  status: GratitudeStatus;
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
}

/** The period a record started now would belong to. */
export function periodKeyFor(cadence: GratitudeCadence, now: number, weekStart?: Weekday): string {
  return cadence === 'daily'
    ? dateKey(new Date(now))
    : weekKey(now, weekStart);
}

/** A fresh, empty draft for this cadence and period. Five blank lines, because the form is five. */
export function startRecord(
  id: string,
  cadence: GratitudeCadence,
  now: number,
  makeEntryId: (index: number) => string,
  weekStart?: Weekday,
): GratitudeRecord {
  return {
    id,
    cadence,
    periodKey: periodKeyFor(cadence, now, weekStart),
    entries: Array.from({ length: MIN_ENTRIES }, (_, i) => ({ id: makeEntryId(i), text: '' })),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/** Entries with something in them. Whitespace is not something. */
export function filledEntries(record: GratitudeRecord): GratitudeEntry[] {
  return record.entries.filter((e) => e.text.trim().length > 0);
}

export function filledCount(record: GratitudeRecord): number {
  return filledEntries(record).length;
}

/** Whether the record may be confirmed. The ONLY thing the five-entry floor gates. */
export function canConfirm(record: GratitudeRecord): boolean {
  return filledCount(record) >= MIN_ENTRIES;
}

/** Whether another line may be added. */
export function canAddEntry(record: GratitudeRecord): boolean {
  return record.entries.length < MAX_ENTRIES;
}

export function setEntryText(
  record: GratitudeRecord,
  entryId: string,
  text: string,
  now: number,
): GratitudeRecord {
  return {
    ...record,
    entries: record.entries.map((e) => (e.id === entryId ? { ...e, text } : e)),
    updatedAt: now,
  };
}

export function addEntry(record: GratitudeRecord, id: string, now: number): GratitudeRecord {
  if (!canAddEntry(record)) return record;
  return { ...record, entries: [...record.entries, { id, text: '' }], updatedAt: now };
}

/**
 * Choose the entry to say more about. Passing `undefined` clears the choice AND the note — a note
 * with no entry behind it is an orphan, and keeping it would show it against the wrong line later.
 */
export function chooseDeepened(
  record: GratitudeRecord,
  entryId: string | undefined,
  now: number,
): GratitudeRecord {
  if (entryId === undefined) {
    const { deepenedEntryId: _d, whyNote: _w, ...rest } = record;
    return { ...rest, updatedAt: now };
  }
  return { ...record, deepenedEntryId: entryId, updatedAt: now };
}

export function setWhyNote(record: GratitudeRecord, note: string, now: number): GratitudeRecord {
  const trimmed = note.trim();
  if (trimmed.length === 0) {
    const { whyNote: _w, ...rest } = record;
    return { ...rest, updatedAt: now };
  }
  return { ...record, whyNote: note, updatedAt: now };
}

/**
 * Confirm the record: drop the blank lines, stamp the time.
 *
 * Returns the record UNCHANGED when it is not confirmable, rather than throwing. A screen that
 * cannot confirm should be showing a disabled action, and an exception here would turn a UI slip
 * into a crash in the middle of somebody's ritual.
 */
export function confirmRecord(record: GratitudeRecord, now: number): GratitudeRecord {
  if (!canConfirm(record)) return record;
  const kept = filledEntries(record).map((e) => ({ ...e, text: e.text.trim() }));
  const deepenedSurvives = kept.some((e) => e.id === record.deepenedEntryId);
  const base = { ...record, entries: kept, status: 'confirmed' as const, confirmedAt: now, updatedAt: now };
  if (deepenedSurvives) return base;
  const { deepenedEntryId: _d, whyNote: _w, ...rest } = base;
  return rest;
}

/**
 * The shape guard the store reads stored JSON through. Stored records outlive the code that wrote
 * them, so a tool that trusts the blob will one day render a two-versions-old record into a crash.
 */
export function isGratitudeRecord(value: unknown): value is GratitudeRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<GratitudeRecord>;
  return (
    typeof r.id === 'string' &&
    typeof r.periodKey === 'string' &&
    Array.isArray(r.entries) &&
    r.entries.every((e) => typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.text === 'string') &&
    (r.cadence === 'daily' || r.cadence === 'weekly') &&
    (r.status === 'draft' || r.status === 'confirmed')
  );
}

/** The suggestion themes, rotated so the same prompt does not open every session (PRD §4). */
export const GRATITUDE_PROMPTS = [
  'people',
  'smallMoments',
  'body',
  'places',
  'opportunities',
  'learning',
  'helpReceived',
  'nature',
  'comfort',
  'takenForGranted',
] as const;
export type GratitudePromptId = (typeof GRATITUDE_PROMPTS)[number];

/**
 * Which prompts to offer, deterministically, from how many records already exist. Deterministic
 * rather than random so the same session always shows the same three — a suggestion list that
 * reshuffles under the user while they think is a list that cannot be returned to.
 */
export function promptsFor(recordCount: number, howMany = 3): GratitudePromptId[] {
  const start = ((recordCount % GRATITUDE_PROMPTS.length) + GRATITUDE_PROMPTS.length) % GRATITUDE_PROMPTS.length;
  return Array.from(
    { length: Math.min(howMany, GRATITUDE_PROMPTS.length) },
    (_, i) => GRATITUDE_PROMPTS[(start + i) % GRATITUDE_PROMPTS.length],
  );
}

/**
 * What the tool should open on (PRD §6): a draft for the CURRENT period if one exists, otherwise the
 * newest confirmed record, otherwise nothing.
 */
export type GratitudeEntryPoint =
  | { kind: 'draft'; record: GratitudeRecord }
  | { kind: 'latest'; record: GratitudeRecord; canWriteThisPeriod: boolean }
  | { kind: 'empty' };

export function entryPoint(
  records: readonly GratitudeRecord[],
  cadence: GratitudeCadence,
  now: number,
  weekStart?: Weekday,
): GratitudeEntryPoint {
  const period = periodKeyFor(cadence, now, weekStart);
  const draft = records.find(
    (r) => r.status === 'draft' && r.cadence === cadence && r.periodKey === period,
  );
  if (draft) return { kind: 'draft', record: draft };

  const confirmed = [...records]
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0));
  const latest = confirmed[0];
  if (!latest) return { kind: 'empty' };

  // One confirmed record per cadence and period (PRD §6). Having written this period's record is
  // not a reason to hide the tool — it is a reason not to offer to write it twice.
  const writtenThisPeriod = confirmed.some(
    (r) => r.cadence === cadence && r.periodKey === period,
  );
  return { kind: 'latest', record: latest, canWriteThisPeriod: !writtenThisPeriod };
}

/** History, newest first. Confirmed records only — a draft is not a memory yet. */
export function history(records: readonly GratitudeRecord[]): GratitudeRecord[] {
  return [...records]
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0));
}
