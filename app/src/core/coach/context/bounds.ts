/**
 * The bounds, applied on the way IN.
 *
 * PRD §5 asks for "short bounded summaries" and forbids transcripts. Those are the same requirement
 * seen from two sides: a field with no ceiling becomes a transcript the moment somebody pastes a
 * paragraph into it, and no amount of prompt instruction prevents that — only a truncation does.
 *
 * So every write goes through here. Cheap, deterministic, and impossible to forget as long as the
 * only way to build a context is {@link ./derive}.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import { MAX_FIELD_CHARS, MAX_LIST_ITEMS } from './types';

/** One line: trimmed, collapsed to single spaces, cut to the ceiling. Empty becomes undefined. */
export function boundLine(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return undefined;
  return clean.length <= MAX_FIELD_CHARS ? clean : `${clean.slice(0, MAX_FIELD_CHARS - 1).trimEnd()}…`;
}

/**
 * A list of lines: each bounded, empties dropped, duplicates dropped, and the whole list capped.
 *
 * The cap keeps the FIRST items rather than the last. What a person said first about their own
 * Journey is what they led with, and a memory that quietly replaced it with their most recent aside
 * would drift away from them one conversation at a time.
 */
export function boundList(values: readonly (string | undefined)[] | undefined): string[] {
  if (!values) return [];
  const out: string[] = [];
  for (const value of values) {
    const line = boundLine(value);
    if (line && !out.includes(line)) out.push(line);
    if (out.length === MAX_LIST_ITEMS) break;
  }
  return out;
}
