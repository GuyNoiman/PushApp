/**
 * readConversation — strike off what the person has already told us, and choose what to ask next.
 *
 * ── THE SHAPE THIS REPLACES (founder, 2026-09-14) ──────────────────────────────────────────────
 *
 * The orchestrator held an array of questions and a pointer:
 *
 *     this.answers[question.id] = answer;
 *     this.questionIndex++;
 *
 * So the next question was the next element, and nothing ever asked whether it still needed asking.
 * Somebody could write "17 years as a restaurant owner and I want to change career" and be asked,
 * one turn later, where they are starting from.
 *
 * The founder's instruction removes the array rather than reordering it:
 *
 *   > There is no "next in the list" and no order to the list. There is an open conversation in
 *   > which we learn the person in front of us and gather what we need, in whatever order feels most
 *   > natural in the conversation and richest for choosing the right plan.
 *
 * So the engine holds a SET. After every message the whole set is read against everything said so
 * far; whatever has been answered is struck off, asked or not; and the next turn is chosen from what
 * remains by what would land best now.
 *
 * ── ONE CALL DOES BOTH, AND THE ENGINE KEEPS THE VETO ──────────────────────────────────────────
 *
 * Resolving and choosing are the same act of reading, so they are one request rather than two — it
 * is cheaper, and a model that has just decided what is still missing is the one best placed to say
 * which gap to open next.
 *
 * What it does NOT get is authority. Everything it returns is checked against the set the caller
 * handed in: an id that is not there is dropped, a value that is not one of that question's options
 * is dropped for an exact-precision question, and a "next" that was not offered is ignored. The model
 * reads; the engine decides.
 *
 * ── PRECISION BELONGS TO THE QUESTION (D102) ───────────────────────────────────────────────────
 *
 * Weekly time, how long the Journey runs and which days suit — these feed the Planner's arithmetic,
 * so a near-enough reading changes the plan itself. They are struck off ONLY on an exact match with
 * one of their own options. Motivation, obstacles and what matters feed the wording; understood from
 * free text they are better than asking again.
 *
 * ── FAILURE IS SILENCE, NEVER A GUESS ──────────────────────────────────────────────────────────
 *
 * No session, no network, a provider error, unparseable JSON: nothing is struck off and nothing is
 * chosen. The caller then behaves exactly as it did before this file existed. A wrongly struck fact
 * is a plan built on something nobody said, which is the one outcome worse than an extra question.
 */
import type { LlmClient } from '../llm/LlmClient';
import type { DomainQuestion, QuestionIntent } from '../learning/DomainExpert';

/**
 * The axes whose answers reach the Planner's arithmetic. Only an exact option match strikes these
 * off; everything else may be read from ordinary language.
 */
const EXACT_INTENTS: ReadonlySet<QuestionIntent> = new Set<QuestionIntent>([
  'time',
  'horizon',
  'scheduling',
]);

export interface ConversationReading {
  /** Question id → the value the person has already given, ready to record. */
  resolved: Record<string, string>;
  /** Which remaining question to ask next, when the model had a view. */
  nextId?: string;
}

const EMPTY: ConversationReading = { resolved: {} };

/** What the reader is shown about one outstanding question. */
function describe(question: DomainQuestion): string {
  const exact = EXACT_INTENTS.has(question.intent);
  const options = question.options.length > 0 ? question.options.join(' | ') : '(free text)';
  return `- id: ${question.id}\n  asks: ${question.prompt}\n  answers: ${options}${
    exact ? '\n  EXACT: only strike this off if they named one of those answers.' : ''
  }`;
}

const SYSTEM = [
  'You are the reading step of a coaching conversation. You do not talk to anybody and you never',
  'write a message. You read what a person has said and report two things as JSON.',
  '',
  'FIRST: which of the outstanding questions their words have ALREADY answered, and with what value.',
  'Report a question only when the answer is clearly supported by something they actually said.',
  'Silence is always better than a guess — a guessed answer becomes part of a plan built for them,',
  'and they will never know it was guessed. Never infer from what seems likely about people in',
  'general. Only from this person, in this conversation.',
  '',
  'A question marked EXACT may only be reported when they named one of its listed answers, or said',
  'something that means exactly one of them. If they were vague, leave it out.',
  '',
  'SECOND: which single remaining question would be most natural to ask next — the one that follows',
  'from what they just said and would most improve the plan. Never one you just reported as answered.',
  '',
  'Return ONLY: {"answered": {"question.id": "the value"}, "next": "question.id"}',
  'Both may be omitted. {"answered":{}} is a good answer when they told you nothing new.',
].join('\n');

/**
 * Read the conversation against the outstanding questions.
 *
 * `transcript` is the conversation so far, oldest first, as plain "who said what" lines. It is the
 * whole point: a fact mentioned six turns ago still counts, which is precisely what the pointer
 * could not do.
 */
export async function readConversation(
  llm: LlmClient,
  transcript: string,
  outstanding: readonly DomainQuestion[],
): Promise<ConversationReading> {
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
            'STILL OUTSTANDING:',
            ...outstanding.map(describe),
          ].join('\n'),
        },
      ],
    });
    return validate(result.text, outstanding);
  } catch {
    // Nothing was understood, so nothing is claimed. The caller falls back to asking.
    return EMPTY;
  }
}

/**
 * Keep only what the caller actually offered. This is where the model's reading stops being a
 * suggestion and becomes a fact, so everything it says is checked rather than trusted.
 */
export function validate(raw: string, outstanding: readonly DomainQuestion[]): ConversationReading {
  let parsed: { answered?: Record<string, unknown>; next?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return EMPTY;
  }

  const byId = new Map(outstanding.map((q) => [q.id, q]));
  const resolved: Record<string, string> = {};

  for (const [id, value] of Object.entries(parsed.answered ?? {})) {
    const question = byId.get(id);
    if (!question) continue; // A question nobody asked about.
    if (typeof value !== 'string') continue;
    const text = value.trim();
    if (text.length === 0) continue;

    if (EXACT_INTENTS.has(question.intent)) {
      // Case-insensitive, because the model echoes the option rather than copying it byte for byte.
      const match = question.options.find((o) => o.toLowerCase() === text.toLowerCase());
      if (!match) continue;
      resolved[id] = match;
      continue;
    }
    resolved[id] = text;
  }

  const nextId =
    typeof parsed.next === 'string' && byId.has(parsed.next) && !(parsed.next in resolved)
      ? parsed.next
      : undefined;

  return { resolved, nextId };
}
