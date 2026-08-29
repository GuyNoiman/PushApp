/**
 * technicalMode — the switch that makes the coach show its work, and the words it shows.
 *
 * ── WHAT IT IS FOR ────────────────────────────────────────────────────────────────────────────
 *
 * Saying "עבור למצב טכני" in the conversation turns on a second, parallel commentary: alongside the
 * ordinary reply, the coach and the expert say WHY they did what they did — which domain was read
 * out of the opening message, which expert that selected, what the diagnosis concluded and on what,
 * which Journey family that named, which version was built and on the strength of which signal, and
 * what bounded the plan's pace.
 *
 * It exists because the product's most important decisions are invisible by design. The coach is
 * supposed to feel like a person, so it never says "I matched you to variant `career.proof.roleStory`
 * on a profile signal". That is right for a user and useless for the domain expert who authored the
 * tree, who has no way to see whether the thing he designed is the thing that ran.
 *
 * ── THE RULES IT OBEYS ────────────────────────────────────────────────────────────────────────
 *
 *  1. **Nothing extra is sent anywhere.** The notes are built from decisions that had already been
 *     made; there is no additional model call and nothing new leaves the device.
 *  2. **They never enter the conversation the model sees.** A technical note is display-only and is
 *     never pushed to the orchestrator's `history` — otherwise the coach would start reading its own
 *     commentary back as if the user had said it.
 *  3. **They are never remembered.** Nothing here reaches coach memory, the account backup or any
 *     event.
 *  4. **Turning it on costs no call.** The command is recognised before anything is sent, so it can
 *     never be mistaken for a goal and charged for.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports.
 */

/** What a recognised command asks for. `null` means the text was not a command at all. */
export type TechnicalModeCommand = 'on' | 'off';

/**
 * Phrases that turn it ON. Hebrew first, because that is the language the founder asked in and the
 * one the testers use. Matching is on the NORMALISED text (see below), so punctuation, case and
 * doubled spaces do not matter.
 */
const ON_PHRASES: readonly string[] = [
  'עבור למצב טכני',
  'מעבר למצב טכני',
  'תעבור למצב טכני',
  'מצב טכני',
  'switch to technical mode',
  'enter technical mode',
  'technical mode on',
  'technical mode',
];

/** Phrases that turn it OFF. Checked FIRST, because every one of them contains an ON phrase. */
const OFF_PHRASES: readonly string[] = [
  'צא ממצב טכני',
  'צאי ממצב טכני',
  'כבה מצב טכני',
  'בטל מצב טכני',
  'סיים מצב טכני',
  'exit technical mode',
  'leave technical mode',
  'technical mode off',
  'turn off technical mode',
];

/**
 * Strip what a person types around a command: surrounding whitespace, doubled spaces, and trailing
 * punctuation. Hebrew is left alone otherwise — no case folding is meaningful for it, and the Latin
 * phrases are lowercased for the same comparison.
 */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.!?,:;"'`״׳]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Whether the WHOLE message is the technical-mode command, and which way.
 *
 * An exact match. Kept as its own function because "the entire message was the
 * switch" is a different question from "the switch appears in the message", and
 * only the first one means there is nothing else to answer.
 */
export function technicalModeCommand(raw: string): TechnicalModeCommand | null {
  const text = normalize(raw);
  if (!text) return null;
  if (OFF_PHRASES.some((p) => normalize(p) === text)) return 'off';
  if (ON_PHRASES.some((p) => normalize(p) === text)) return 'on';
  return null;
}

/**
 * The command as part of a longer message, plus whatever else was said.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NOT A SUBSTRING SEARCH ────────────────
 *
 * The first version matched only a whole message, on the reasoning that
 * somebody writing "I want to move into a more technical mode of working" must
 * not have their opening swallowed by a debug switch. That reasoning is right
 * and the rule that came from it was too strict: a tester wrote the command
 * with a sentence after it and nothing happened at all — no switch, and no hint
 * that the words had been read as an ordinary message.
 *
 * So the phrase is recognised only as a STANDALONE CLAUSE: it must start at the
 * beginning of the message or just after a sentence break, and end at a
 * sentence break or at the end of the message. "…a more technical mode of
 * working" still does not match, because the phrase there is followed by more
 * words rather than by a break — which is exactly the distinction the original
 * comment was reaching for.
 *
 * What remains after removing the clause is returned, so a message that both
 * flips the switch and says something is answered rather than eaten.
 */
export interface TechnicalModeMatch {
  command: TechnicalModeCommand | null;
  /** The message with the command clause removed, trimmed. Empty when it was the whole message. */
  rest: string;
}

/** A sentence break: punctuation or a newline, with any spacing around it. */
const BREAK = '[.!?,:;\n\r]';

function clausePattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  // Start of string or just after a break · the phrase · a break or end of string.
  return new RegExp(`(^|${BREAK}\\s*)(${escaped})\\s*(?=${BREAK}|$)`, 'iu');
}

export function extractTechnicalMode(raw: string): TechnicalModeMatch {
  const text = raw.trim();
  if (!text) return { command: null, rest: '' };

  // OFF first: every off phrase contains an on phrase.
  for (const [command, phrases] of [
    ['off', OFF_PHRASES],
    ['on', ON_PHRASES],
  ] as const) {
    // Longest phrase first, so "technical mode on" is not matched as "technical mode".
    for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
      const match = clausePattern(phrase).exec(text);
      if (!match) continue;
      const rest = (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length))
        // The break that ENDED the clause is left behind; it belongs to the clause.
        .replace(new RegExp(`^\\s*${BREAK}\\s*`, 'u'), ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(new RegExp(`^${BREAK}\\s*`, 'u'), '')
        .trim();
      return { command, rest };
    }
  }
  return { command: null, rest: text };
}

// ── The notes themselves ────────────────────────────────────────────────────────────────────────

/**
 * One line of commentary. Kept as plain strings rather than a structured type on purpose: this is
 * something a human reads in a chat bubble, and every consumer would only turn a structure back into
 * a sentence. The `[…]` prefix is added by the surface, so the same note reads correctly in either
 * language.
 */
export type TechnicalNote = string;

/** A list of `label: value` pairs rendered as one note. Skips anything unknown rather than guessing. */
export function noteOf(title: string, fields: Record<string, string | number | undefined | null>): TechnicalNote {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(([k, v]) => `· ${k}: ${v}`);
  return lines.length > 0 ? `${title}\n${lines.join('\n')}` : title;
}
