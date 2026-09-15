/**
 * readPortrait — read the whole conversation against what we still do not know about the person.
 *
 * The sibling of {@link ../readConversation}, deliberately, and with the identical contract:
 *
 *   · it reads the WHOLE transcript, not the last message, because a thing said six turns ago is
 *     still true and being unable to see it is what the old question pointer could not do;
 *   · one call does both jobs — what did they tell us, and what is worth opening next — because
 *     resolving and choosing are the same act of reading and a second call would pay twice for it;
 *   · THE MODEL READS, THE ENGINE DECIDES. Every field it returns is checked against the gaps the
 *     caller actually handed in, every coarse value against its closed taxonomy, and a "next" that
 *     was never offered is ignored;
 *   · FAILURE IS SILENCE. No session, no network, a provider error, unparseable JSON — nothing is
 *     written and the caller behaves exactly as it would if this file did not exist.
 *
 * ── WHY A VALUE IT INVENTED IS DROPPED RATHER THAN KEPT ────────────────────────────────────────
 *
 * A model that answers `stage: "figuring_it_out"` has said something real about a person and
 * something this system has no place to put. Inventing a place for it is how a closed taxonomy
 * stops being closed, and a stage nobody declared is a stage nothing downstream can read. Dropped,
 * and the gap stays open — which is the correct consequence of not knowing.
 *
 * ── AND WHY `stated` MUST MEAN STATED ──────────────────────────────────────────────────────────
 *
 * The whole value of the provenance is that {@link ./merge} can protect what somebody actually said
 * from what a model guessed. That protection is worth exactly as much as the model's honesty about
 * which is which, so the instruction below spends more words on that distinction than on anything
 * else.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import type { LlmClient } from '../../llm/LlmClient';
import type { PortraitGap } from './gaps';
import {
  isConfidence,
  isPortraitField,
  isPortraitSource,
  type PortraitFieldId,
  type PortraitUpdate,
  type PortraitValue,
} from './types';

/** What one reading of the conversation produced. */
export interface PortraitReading {
  /** The field updates that survived validation, ready for {@link ./merge mergePortrait}. */
  updates: PortraitUpdate[];
  /** Which gap the reader would open next, when it had a view and the engine offered it. */
  nextGap?: PortraitFieldId;
}

const EMPTY: PortraitReading = { updates: [] };

/** What the reader is shown about one outstanding gap. */
function describe(gap: PortraitGap): string {
  const lines = [`- field: ${gap.field}`, `  is: ${gap.spec.describe}`];
  if (gap.spec.values) {
    lines.push('  one of:');
    for (const [value, meaning] of Object.entries(gap.spec.values)) {
      lines.push(`    ${value} = ${meaning}`);
    }
  } else if (gap.spec.kind === 'list') {
    lines.push('  a short list of short lines, in their own words and their own language');
  } else {
    lines.push('  one short line, in their own words and their own language');
  }
  if (gap.held !== 'unknown') {
    lines.push(`  (we already hold this at ${gap.held} confidence — report it only if you can do better)`);
  }
  return lines.join('\n');
}

const SYSTEM = [
  'You are the reading step of an introduction: a conversation whose only purpose is to understand',
  'the person in it. You do not talk to anybody and you never write a message. You read what has',
  'been said and report two things as JSON.',
  '',
  'FIRST: which of the fields below the conversation now supports, and with what value.',
  'Report a field only when what they actually said supports it. Silence is always better than a',
  'guess. Never infer from what tends to be true of people in general — only from this person, in',
  'this conversation.',
  '',
  'Every field carries two things besides its value:',
  '  confidence: low | medium | high — how sure this reading is.',
  '  source: "stated" when they said it, in so many words; "inferred" when you worked it out from',
  '  what they said. This distinction is the most important thing you report. A guess labelled as',
  '  something they said will be treated as their own words for the rest of their time here, and',
  '  they will never be shown that it was a guess. When in doubt it is "inferred".',
  '',
  'A field listed with a set of allowed values may ONLY be reported as one of those exact values. If',
  'what they said is not one of them, leave the field out. Do not invent a value, and do not bend',
  'one to fit.',
  '',
  'A free-text field is ONE SHORT LINE in their own words and their own language. Not a paragraph,',
  'not a summary of the conversation, and never your advice about them.',
  '',
  'SECOND: which single remaining field would be most natural to open next — the one that follows',
  'from what they just said. Never one you have just reported.',
  '',
  'Return ONLY: {"fields": {"field.name": {"value": "...", "confidence": "high", "source": "stated"}},',
  '"next": "field.name"}',
  'Both may be omitted. {"fields":{}} is a good answer when they told you nothing new.',
].join('\n');

/**
 * Read the conversation against the outstanding gaps.
 *
 * `transcript` is the conversation so far, oldest first, as plain "who said what" lines — the same
 * shape {@link ../readConversation} takes, from the same orchestrator helper.
 */
export async function readPortrait(
  llm: LlmClient,
  transcript: string,
  outstanding: readonly PortraitGap[],
): Promise<PortraitReading> {
  if (outstanding.length === 0) return EMPTY;
  try {
    const result = await llm.complete({
      system: SYSTEM,
      json: true,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            'THE CONVERSATION SO FAR:',
            transcript,
            '',
            'WHAT WE STILL DO NOT KNOW:',
            ...outstanding.map(describe),
          ].join('\n'),
        },
      ],
    });
    return validatePortraitReading(result.text, outstanding);
  } catch {
    // Nothing was understood, so nothing is claimed. The caller asks the gap it was going to ask.
    return EMPTY;
  }
}

/**
 * Keep only what the caller actually offered, in the shape the field actually holds. This is where
 * the model's reading stops being a suggestion, so every part of it is checked rather than trusted.
 */
export function validatePortraitReading(
  raw: string,
  outstanding: readonly PortraitGap[],
): PortraitReading {
  let parsed: { fields?: Record<string, unknown>; next?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return EMPTY;
  }
  if (!parsed || typeof parsed !== 'object') return EMPTY;

  const offered = new Map(outstanding.map((gap) => [gap.field, gap]));
  const updates: PortraitUpdate[] = [];

  const fields = parsed.fields;
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    for (const [id, entry] of Object.entries(fields)) {
      if (!isPortraitField(id)) continue; // a field this system does not have
      const gap = offered.get(id);
      if (!gap) continue; // a field nobody asked about — the engine offers, the model answers
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const record = entry as { value?: unknown; confidence?: unknown; source?: unknown };

      if (!isConfidence(record.confidence) || record.confidence === 'unknown') continue;
      if (!isPortraitSource(record.source)) continue;
      const value = readValue(gap, record.value);
      if (value === undefined) continue;

      updates.push({ field: id, value, confidence: record.confidence, source: record.source });
    }
  }

  const reported = new Set(updates.map((update) => update.field));
  const nextGap =
    isPortraitField(parsed.next) && offered.has(parsed.next) && !reported.has(parsed.next)
      ? parsed.next
      : undefined;

  return { updates, ...(nextGap ? { nextGap } : {}) };
}

/** The value for one field, in the shape that field holds — or nothing at all. */
function readValue(gap: PortraitGap, raw: unknown): PortraitValue | undefined {
  if (gap.spec.values) {
    // A closed taxonomy. Case-insensitive because the model echoes the token rather than copying it
    // byte for byte; anything that is not one of the declared values is dropped.
    if (typeof raw !== 'string') return undefined;
    const wanted = raw.trim().toLowerCase();
    return Object.keys(gap.spec.values).find((value) => value.toLowerCase() === wanted);
  }
  if (gap.spec.kind === 'list') {
    const items = (Array.isArray(raw) ? raw : [raw])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? items : undefined;
  }
  if (typeof raw !== 'string') return undefined;
  const text = raw.trim();
  return text.length > 0 ? text : undefined;
}
