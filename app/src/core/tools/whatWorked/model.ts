/**
 * What Worked for Me? — the pure model behind one honest piece of evidence: something that went
 * well, what helped it happen, what the person themselves did, and one small thing worth trying
 * again.
 *
 * THE LINE THIS TOOL WALKS. "It worked because I planned it" is a story, not a fact. The tool
 * collects the person's own account and keeps it as an account: the result copy says a condition
 * MAY have helped, and nothing here computes a cause, scores a week, or turns a correlation into a
 * rule (PRD §1, §9). What it refuses to do is the reason it is safe to be honest in.
 *
 * NOTHING IS REQUIRED EXCEPT ONE MOMENT. The weekly route may hold up to three, and requires one.
 * Credit can be declined: a success that depended on luck or on another person is allowed to stay
 * that way (PRD §9), so `ownContribution` is optional and its absence is never a gap to fill.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import { startOfLocalDay, startOfNextLocalDay } from '../../util/date';
import { startOfNextWeek, startOfWeek, type Weekday } from '../../util/week';

/** Looking at today, or looking at the week. */
export type WhatWorkedPeriod = 'day' | 'week';

/** How many moments the weekly route may hold. One is enough to finish. */
export const MAX_MOMENTS = 3;

/** The offered conditions. `custom` carries the user's own words instead. */
export const SUPPORT_CONDITIONS = [
  'planning',
  'environment',
  'anotherPerson',
  'timing',
  'smallerStart',
] as const;
export type SupportConditionId = (typeof SUPPORT_CONDITIONS)[number];

export interface WhatWorkedRecord {
  id: string;
  periodType: WhatWorkedPeriod;
  /** The local period this record is about. Set once, preserved through every later edit. */
  periodStart: number;
  periodEnd: number;
  /** One or more moments, in the order they were written. */
  moments: string[];
  conditions: SupportConditionId[];
  /** The user's own condition, when the offered five did not fit. */
  customCondition?: string;
  /** What they did. Optional on purpose — not every success is owed to the person. */
  ownContribution?: string;
  /** One small thing worth trying again. Optional. */
  repeatIdea?: string;
  status: 'draft' | 'confirmed';
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
}

/** The period a record started now covers. */
export function periodBounds(
  periodType: WhatWorkedPeriod,
  now: number,
  weekStart?: Weekday,
): { periodStart: number; periodEnd: number } {
  return periodType === 'day'
    ? { periodStart: startOfLocalDay(now), periodEnd: startOfNextLocalDay(now) - 1 }
    : { periodStart: startOfWeek(now, weekStart), periodEnd: startOfNextWeek(now, weekStart) - 1 };
}

export function startRecord(
  id: string,
  periodType: WhatWorkedPeriod,
  now: number,
  weekStart?: Weekday,
): WhatWorkedRecord {
  return {
    id,
    periodType,
    ...periodBounds(periodType, now, weekStart),
    moments: [''],
    conditions: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function filledMoments(record: WhatWorkedRecord): string[] {
  return record.moments.map((m) => m.trim()).filter((m) => m.length > 0);
}

/** The weekly route may collect up to three; it must never require them (PRD §4). */
export function canAddMoment(record: WhatWorkedRecord): boolean {
  return record.periodType === 'week' && record.moments.length < MAX_MOMENTS;
}

export function setMoment(record: WhatWorkedRecord, index: number, text: string, now: number): WhatWorkedRecord {
  return {
    ...record,
    moments: record.moments.map((m, i) => (i === index ? text : m)),
    updatedAt: now,
  };
}

export function addMoment(record: WhatWorkedRecord, now: number): WhatWorkedRecord {
  if (!canAddMoment(record)) return record;
  return { ...record, moments: [...record.moments, ''], updatedAt: now };
}

export function toggleCondition(
  record: WhatWorkedRecord,
  condition: SupportConditionId,
  now: number,
): WhatWorkedRecord {
  const has = record.conditions.includes(condition);
  return {
    ...record,
    conditions: has
      ? record.conditions.filter((c) => c !== condition)
      : [...record.conditions, condition],
    updatedAt: now,
  };
}

/** Set an optional free-text field; blank clears it rather than storing an empty string. */
export function setOptional(
  record: WhatWorkedRecord,
  field: 'customCondition' | 'ownContribution' | 'repeatIdea',
  text: string,
  now: number,
): WhatWorkedRecord {
  if (text.trim().length === 0) {
    const next = { ...record, updatedAt: now };
    delete next[field];
    return next;
  }
  return { ...record, [field]: text, updatedAt: now };
}

/** One moment is the whole requirement. Everything else may be left empty and still be true. */
export function canConfirm(record: WhatWorkedRecord): boolean {
  return filledMoments(record).length >= 1;
}

export function confirmRecord(record: WhatWorkedRecord, now: number): WhatWorkedRecord {
  if (!canConfirm(record)) return record;
  return {
    ...record,
    moments: filledMoments(record),
    status: 'confirmed',
    confirmedAt: now,
    updatedAt: now,
  };
}

/**
 * Whether a record says anything about what helped. Used only to decide whether the result shows the
 * conditions block at all — never to grade a record as thin.
 */
export function hasConditions(record: WhatWorkedRecord): boolean {
  return record.conditions.length > 0 || (record.customCondition?.trim().length ?? 0) > 0;
}

/**
 * The shape guard stored JSON is read through — see the note on the Gratitude one. A record from an
 * older build must be ignored, not rendered into a crash.
 */
export function isWhatWorkedRecord(value: unknown): value is WhatWorkedRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<WhatWorkedRecord>;
  return (
    typeof r.id === 'string' &&
    (r.periodType === 'day' || r.periodType === 'week') &&
    typeof r.periodStart === 'number' &&
    Array.isArray(r.moments) &&
    r.moments.every((m) => typeof m === 'string') &&
    Array.isArray(r.conditions) &&
    (r.status === 'draft' || r.status === 'confirmed')
  );
}

/** History, newest first. Confirmed only — an unfinished draft is not evidence yet. */
export function history(records: readonly WhatWorkedRecord[]): WhatWorkedRecord[] {
  return [...records]
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0));
}

/**
 * How long a reusable idea is offered as CURRENT context — ninety days (PRD §7). Past that the
 * record is still true history; it simply stops being offered as something to act on now.
 */
export const IDEA_FRESH_DAYS = 90;

export function ideaIsFresh(record: WhatWorkedRecord, now: number): boolean {
  if (!record.confirmedAt) return false;
  return now - record.confirmedAt <= IDEA_FRESH_DAYS * 24 * 60 * 60 * 1000;
}
