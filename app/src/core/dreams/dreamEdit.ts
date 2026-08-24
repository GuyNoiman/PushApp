/**
 * Reshaping the Dream layer through conversation — the structured half.
 *
 * ── WHY THERE IS NO EDIT BUTTON ANYWHERE ───────────────────────────────────────────────────────
 *
 * Dream Management §7: there are no direct edit, merge, remove or delete controls. A person says
 * what changed and the coach does it. That is not an interface preference — a Dream is a sentence
 * about who somebody is becoming, and a text field invites tinkering with the words while a
 * conversation invites saying what actually changed.
 *
 * D40 removed the approval gate on top of that: the coach applies the change as part of the
 * conversation rather than proposing a form to confirm. Which puts all the weight here, on
 * VALIDATION, because "apply what the model said" is only safe if what the model said has been
 * checked against what exists.
 *
 * ── WHAT THIS MODULE REFUSES ───────────────────────────────────────────────────────────────────
 *
 * Every id must be one the caller listed. An unknown Dream, an unknown Journey, an empty title, a
 * merge of a Dream into itself, or a change of a kind we do not implement is DROPPED — not guessed
 * at, not repaired. A model that returns five changes of which two are nonsense produces three
 * changes here, and the summary tells the person exactly those three.
 *
 * The one thing it cannot check is intent, which is why nothing here touches a Journey's title,
 * Steps, schedule, history or reports. The worst a bad parse can do is move a link.
 *
 * Pure TypeScript — no React, no storage, no clock reads, no vendor.
 */
import { normalizeDreamTitle, normalizeDreamWhy } from './dreams';

/** What the model is shown: the Dreams and Journeys that exist, by id. No other text is sent. */
export interface DreamEditContext {
  dreams: { id: string; title: string }[];
  journeys: { id: string; title: string; dreamIds: string[] }[];
}

/** One change the coach may make. Anything not on this list cannot be expressed, let alone applied. */
export type DreamChange =
  /** A new Dream, in the coach's wording. */
  | { kind: 'create'; title: string; why?: string }
  /** The same Dream, said better. Never touches its Journeys. */
  | { kind: 'reword'; dreamId: string; title: string; why?: string }
  /** Two Dreams that turned out to be one. Every relationship survives on `keepId`. */
  | { kind: 'merge'; keepId: string; mergedId: string }
  /** Out of the visible list. Not completed, not celebrated, nothing awarded. */
  | { kind: 'remove'; dreamId: string }
  /** This Journey serves that Dream. `primary` sets the deterministic grouping relationship. */
  | { kind: 'link'; journeyId: string; dreamId: string; primary: boolean }
  /** It does not serve it any more. The Journey itself is untouched. */
  | { kind: 'unlink'; journeyId: string; dreamId: string };

export interface DreamEdit {
  changes: DreamChange[];
}

function knownDream(context: DreamEditContext, id: unknown): id is string {
  return typeof id === 'string' && context.dreams.some((d) => d.id === id);
}

function knownJourney(context: DreamEditContext, id: unknown): id is string {
  return typeof id === 'string' && context.journeys.some((j) => j.id === id);
}

/** One raw change from the model → a valid change, or nothing. */
function readChange(raw: unknown, context: DreamEditContext): DreamChange[] {
  if (!raw || typeof raw !== 'object') return [];
  const row = raw as Record<string, unknown>;
  const title = typeof row.title === 'string' ? normalizeDreamTitle(row.title) : '';
  const why = typeof row.why === 'string' ? normalizeDreamWhy(row.why) : undefined;

  switch (row.kind) {
    case 'create':
      return title ? [{ kind: 'create', title, ...(why ? { why } : {}) }] : [];
    case 'reword':
      return knownDream(context, row.dreamId) && title
        ? [{ kind: 'reword', dreamId: row.dreamId, title, ...(why ? { why } : {}) }]
        : [];
    case 'merge':
      return knownDream(context, row.keepId) &&
        knownDream(context, row.mergedId) &&
        row.keepId !== row.mergedId
        ? [{ kind: 'merge', keepId: row.keepId, mergedId: row.mergedId }]
        : [];
    case 'remove':
      return knownDream(context, row.dreamId) ? [{ kind: 'remove', dreamId: row.dreamId }] : [];
    case 'link':
      return knownJourney(context, row.journeyId) && knownDream(context, row.dreamId)
        ? [
            {
              kind: 'link',
              journeyId: row.journeyId,
              dreamId: row.dreamId,
              primary: row.primary === true,
            },
          ]
        : [];
    case 'unlink':
      return knownJourney(context, row.journeyId) && knownDream(context, row.dreamId)
        ? [{ kind: 'unlink', journeyId: row.journeyId, dreamId: row.dreamId }]
        : [];
    default:
      return [];
  }
}

/**
 * Read the model's answer into a validated edit.
 *
 * Anything unreadable is an EMPTY edit rather than a throw: a conversation where the coach did not
 * understand is an ordinary conversation, and the screen already knows how to say "nothing changed".
 */
export function extractDreamEdit(text: string, context: DreamEditContext): DreamEdit {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { changes: [] };
  try {
    const parsed = JSON.parse(match[0]) as { changes?: unknown };
    if (!Array.isArray(parsed.changes)) return { changes: [] };
    return { changes: parsed.changes.flatMap((raw) => readChange(raw, context)) };
  } catch {
    return { changes: [] };
  }
}

/** The title a change refers to, for the summary. Falls back to the id it could not name. */
function dreamTitle(context: DreamEditContext, id: string): string {
  return context.dreams.find((d) => d.id === id)?.title ?? id;
}

function journeyTitle(context: DreamEditContext, id: string): string {
  return context.journeys.find((j) => j.id === id)?.title ?? id;
}

/**
 * What actually happened, in one line each — the text the screen shows after the change lands.
 *
 * It is built from the VALIDATED changes rather than from the model's prose, so it can never claim
 * something that was dropped. That is the whole reason it exists.
 */
export function summarizeDreamEdit(edit: DreamEdit, context: DreamEditContext): string[] {
  return edit.changes.map((change) => {
    switch (change.kind) {
      case 'create':
        return `+ ${change.title}`;
      case 'reword':
        return `${dreamTitle(context, change.dreamId)} → ${change.title}`;
      case 'merge':
        return `${dreamTitle(context, change.mergedId)} → ${dreamTitle(context, change.keepId)}`;
      case 'remove':
        return `− ${dreamTitle(context, change.dreamId)}`;
      case 'link':
        return `${journeyTitle(context, change.journeyId)} → ${dreamTitle(context, change.dreamId)}`;
      case 'unlink':
        return `${journeyTitle(context, change.journeyId)} ⊘ ${dreamTitle(context, change.dreamId)}`;
    }
  });
}
