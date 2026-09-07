/**
 * composeTurn — the coach SAYS its turn instead of selecting it.
 *
 * ── THE PROBLEM THIS EXISTS TO FIX (partner, 2026-09-06) ───────────────────────────────────────
 *
 * Until now every word the coach spoke was a string chosen from a catalogue:
 *
 *     const coachMessage = this.applyGuard(question.prompt);
 *
 * `question.prompt` is written months before the person installs the app, so it cannot contain one
 * thing they said. The orchestrator's two model calls are both extractors — `json: true`,
 * `temperature: 0` — and one of them says in its own prompt "do not coach, do not reply, do not ask
 * anything". Neither produces a sentence anybody reads.
 *
 * That single fact explains almost the whole of the partner's list. It is why the conversation feels
 * like a questionnaire however good the questions are; why a reflection never appears; why the
 * pre-build line reads as though it could belong to anyone (it could — it is a bucket label); and
 * why every edit to the coach's CHARACTER changed nothing he could see. The character was attached
 * to the triage classifier, whose output is a JSON object of goals. It was never printed anywhere.
 *
 * ── WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT ───────────────────────────────────────────────
 *
 * The orchestrator still decides **what** the coach needs to know and **when** the interview is
 * finished. That stays deterministic, on-device, and testable, and it is what stops a model
 * inventing a plan. What moves to the model is **how the turn is said**: whether this is a moment to
 * hand back what was understood, and how to ask the next question in language that follows from what
 * the person just wrote instead of arriving beside it.
 *
 * So: the decision stays in the engine, the voice moves to the model. The founder's phrasing for it
 * was exact — the next question should be woven into the conversation rather than pushed at it, and
 * a reflection is part of an ANSWER, not a ceremony of its own.
 *
 * ── IT MUST NEVER MAKE THE COACH WORSE THAN THE CANNED STRING ──────────────────────────────────
 *
 * Every failure returns the original prompt: no session, no network, a provider error, an empty
 * completion, or a reply so long it is obviously not a coach turn. The offline path is therefore
 * exactly what it was, which is also what keeps this honest — the app still works with the model
 * down, and a Journey is never built out of something nobody said.
 *
 * The options are NOT repeated in the text. They are rendered as cards by the screen, and a coach
 * that reads its own multiple-choice answers aloud is the questionnaire again in a nicer voice.
 */
import type { LlmClient } from '../llm/LlmClient';
import { coachCharacter } from './coachCharacter';

/** One thing the person has already told us, ready to be handed to the composer. */
export interface KnownFact {
  /** What was asked, in the words it was asked in. */
  asked: string;
  /** What they answered. */
  answered: string;
}

/** Everything the composer is allowed to know. Nothing here is invented by the model. */
export interface ComposeTurnInput {
  /** The person's preferred first name, when there is one. */
  firstName?: string | null;
  /** The goal in the person's own words, once it is known. */
  goal?: string | null;
  /** What has already been asked and answered, oldest first. */
  known: KnownFact[];
  /** The question the orchestrator has decided to ask next, already localised. */
  prompt: string;
  /**
   * True when this is the closing turn rather than a question — the moment before a Journey is
   * built. It is the highest-value turn in the conversation and the one the partner found most
   * generic, so it gets its own instruction.
   */
  closing?: boolean;
  /** How many reflections have already happened, so the character's budget can be respected. */
  reflectionsSoFar: number;
  /** The conversation's language, so a Hebrew conversation cannot come back in English. */
  locale: string;
}

/** Longer than this is not a coach turn; it is an essay, and the canned line is better. */
const MAX_TURN_CHARS = 700;

/** The task, over and above the character. Deliberately short: the character carries the rest. */
function composerTask(input: ComposeTurnInput): string {
  const lines = [
    'YOUR JOB RIGHT NOW.',
    'Write the coach’s next turn in this conversation. One turn, nothing else. No preamble, no',
    'labels, no headings, no quotation marks around it.',
    '',
    input.closing
      ? [
          'This is the LAST turn before a plan is built, and it is the moment the person finds out',
          'whether they were listened to. Do not motivate and do not congratulate. Say back, in their',
          'own words wherever you can: what they want, where they are now, what is actually in the way,',
          'and therefore where you would start. Only things they told you — if something was never',
          'said, it does not appear. End on where you would start, not on a promise.',
        ].join('\n')
      : [
          'IF THEIR LAST MESSAGE ASKED YOU SOMETHING, ANSWER IT FIRST, in a sentence or two, before',
          'anything else. A person who asks a question and gets a question back has been handled, not',
          'talked to. Answer it plainly and truthfully — including when the answer is that you do not',
          'know or cannot do it — and only then continue. This outranks everything below.',
          '',
          'Ask the ONE question given below. Ask it in your own words, so it follows from what they',
          'just said instead of arriving beside it. Do not ask anything else.',
          '',
          'If this is one of the moments the character names for reflecting, hand back what you',
          'understood FIRST, in one or two sentences, and then ask — in the same turn. If it is not',
          'one of those moments, just ask.',
          `You have reflected ${input.reflectionsSoFar} time(s) so far in this conversation.`,
          '',
          'The person will see tappable answer options underneath your turn. NEVER list them, number',
          'them, or hint at them. Reading multiple-choice answers aloud is what makes a conversation',
          'feel like a form.',
        ].join('\n'),
    '',
    'NEVER add a fact they did not tell you, including one that seems obvious from what they did say.',
    `Write in this language and no other: ${input.locale}.`,
  ];
  return lines.join('\n');
}

/** The conversation so far, as the composer sees it. */
function contextBlock(input: ComposeTurnInput): string {
  const parts: string[] = [];
  if (input.goal) parts.push(`WHAT THEY CAME FOR, in their words: ${input.goal}`);
  if (input.known.length > 0) {
    parts.push(
      'WHAT THEY HAVE ALREADY TOLD YOU. Never ask any of this again:',
      ...input.known.map((fact) => `• ${fact.asked} → ${fact.answered}`),
    );
  } else {
    parts.push('They have not answered anything yet.');
  }
  if (!input.closing) parts.push('', `THE QUESTION TO ASK: ${input.prompt}`);
  return parts.join('\n');
}

/**
 * Compose one coach turn. Resolves to the composed text, or to `prompt` unchanged when anything at
 * all goes wrong — which is the whole safety story: this can improve a turn and can never break one.
 */
export async function composeCoachTurn(
  llm: LlmClient,
  input: ComposeTurnInput,
): Promise<string> {
  try {
    const result = await llm.complete({
      system: [coachCharacter({ firstName: input.firstName }), composerTask(input)].join('\n\n'),
      // Prose, so a little warmth is wanted — but not enough to wander. The extractors elsewhere
      // stay at 0 because they must be reproducible; this one must sound like a person.
      temperature: 0.6,
      messages: [{ role: 'user', content: contextBlock(input) }],
    });
    const text = result.text.trim();
    if (text.length === 0 || text.length > MAX_TURN_CHARS) return input.prompt;
    return text;
  } catch {
    // No session, no network, a provider error. The canned line is a worse conversation and a
    // correct one, and it is exactly what shipped before this file existed.
    return input.prompt;
  }
}

/**
 * Did this turn actually reflect, for the purposes of the character's two-or-three budget?
 *
 * Deliberately crude, and deliberately biased towards NOT counting. A turn that is only the question
 * is one sentence; a turn that reflects first is longer and usually carries a second sentence before
 * the question mark. Counting a reflection that did not happen would silence the next real one,
 * which is the expensive mistake — undercounting only risks one extra.
 */
export function looksLikeReflection(composed: string, prompt: string): boolean {
  if (composed === prompt) return false;
  const sentences = composed.split(/[.!?…]\s|\n/).filter((s) => s.trim().length > 0);
  return sentences.length >= 2;
}
