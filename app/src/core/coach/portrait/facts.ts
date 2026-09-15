/**
 * THE UNDERSTANDING CHECK IS COMPOSED FROM THE PORTRAIT.
 *
 * This is the most valuable safety property in the design, and it is one small function: what the
 * engine believes is exactly what the person is read back. A mis-extraction therefore becomes
 * VISIBLE — "no, it is not that I cannot start, it is that I cannot choose" — and correctable, on
 * the one turn where correcting it still changes everything downstream. A check composed from
 * anything else would be a check of something we are not actually holding.
 *
 * ── WHAT IS HANDED OVER, AND WHAT IS NOT ───────────────────────────────────────────────────────
 *
 * A free-text field is handed over as the person's own line. A coarse field is handed over as its
 * MEANING rather than its token, because `too_many_options` is a database value and "you have
 * several directions and choosing between them is the hard part" is a sentence a person can
 * recognise or reject. The composer writes the actual words, in their language.
 *
 * An INFERRED field says so. The coach saying "I think" about something it worked out, and stating
 * plainly the things they told it, is not a stylistic nicety — it is the difference between a coach
 * that can be corrected and one that sounds like it already knows.
 *
 * Fields we are not yet confident about are left out entirely: the check is for confirming a
 * picture, not for reading a list of half-formed guesses back at somebody.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import type { KnownFact } from '../composeTurn';
import {
  PORTRAIT_FIELDS,
  atLeast,
  portraitField,
  type Held,
  type Portrait,
  type PortraitFieldId,
  type PortraitValue,
} from './types';

/** How the composer is told about one field. Deliberately prose, because it is read by a writer. */
function describeValue(field: PortraitFieldId, held: Held<PortraitValue>): string | undefined {
  const spec = portraitField(field);
  if (!spec) return undefined;
  if (spec.values) {
    const meaning = spec.values[String(held.value)];
    return meaning ? meaning : undefined;
  }
  return Array.isArray(held.value) ? held.value.join('; ') : held.value;
}

/**
 * What the coach believes about this person, in the shape the composer already takes.
 *
 * Only what is held at MEDIUM or better, in the registry's own order — which reads the way somebody
 * would actually say it back: what you want, where that is, where you are now, where it is going,
 * what stage, what is in the way.
 */
export function portraitFacts(portrait: Portrait): KnownFact[] {
  const facts: KnownFact[] = [];
  // The REGISTRY's order, not the Portrait's insertion order: which field happened to be filled
  // first is an accident of the conversation, and the picture should be said back in the order a
  // person would say it.
  for (const spec of PORTRAIT_FIELDS) {
    const held = portrait[spec.id] as Held<PortraitValue> | undefined;
    if (!held || !atLeast(held.confidence, 'medium')) continue;
    const described = describeValue(spec.id, held);
    if (!described) continue;
    facts.push({
      asked:
        held.source === 'stated'
          ? `${spec.describe} (they told you this)`
          : `${spec.describe} (YOUR READING, not their words — offer it, do not assert it)`,
      answered: described,
    });
  }
  return facts;
}
