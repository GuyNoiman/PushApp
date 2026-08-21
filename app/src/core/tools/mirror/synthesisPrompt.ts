/**
 * The one prompt that writes a confidential synthesis.
 *
 * ONE REQUEST FOR A WHOLE ROUND. Five questions and their answers go in together and five summaries
 * come back together, so these instructions are paid for once instead of five times, and the five
 * outputs are written knowing about each other.
 *
 * ── WHY THIS TEXT IS AS BLUNT AS IT IS ─────────────────────────────────────────────────────────
 *
 * Every line below is a rule somebody's anonymity depends on, and a model asked politely does the
 * polite thing about 90% of the time. The prohibitions are stated as prohibitions, the output shape
 * is fixed so there is nowhere to put a stray sentence, and the two rules that CAN be checked
 * afterwards — no source token survives, and no claim rests on one person — are checked afterwards
 * regardless of what it says here. The prompt is the first line of defence and never the only one.
 *
 * NOTE ON REDACTION, and it is the non-obvious part: the model sees the answers RAW. That looks
 * wrong next to the coach's stack, which redacts before sending — but the coach is minimising a
 * person's own words on their way out, and here the job IS the de-identification. Sending
 * pre-mangled text would destroy exactly the detail the model has to generalise, and would leave it
 * summarising something nobody wrote. The safety comes from where it belongs instead: the paid
 * provider's terms, this prompt, and the free local check on the way back.
 *
 * Pure TypeScript — no React, no vendor, no network.
 */
import { CLAIM_MIN_SUPPORT } from './round';

/** The output shape. Fixed, so there is nowhere for a stray sentence to live. */
export const SYNTHESIS_SCHEMA_HINT = `{"syntheses":[{"questionId":"…","text":"…"|null,"support":0}]}`;

export const SYNTHESIS_SYSTEM_PROMPT = [
  'You summarise anonymous feedback that several people wrote about one person.',
  'You are writing to that person. Warm, plain, and short — three or four sentences at most.',
  '',
  'ABSOLUTE PROHIBITIONS. Breaking any of these makes the answer unusable:',
  '· Never name or describe a contributor, or say how many said what.',
  '· Never quote anyone, and never reuse a distinctive phrase from an answer.',
  '· Never mention a date, a place, an employer, a role, a relationship, or a specific event.',
  '· Never infer a diagnosis, a personality type, a motive, a history, or anything about anybody',
  '  other than the person you are writing to.',
  '· Never invent a pattern. If the answers do not repeat, say so by returning null.',
  '',
  `SUPPORT. Only describe something at least ${CLAIM_MIN_SUPPORT} answers agree on. Report how many`,
  'agreed in "support". A single person\'s point is dropped, never softened into the summary.',
  '',
  'DISAGREEMENT is described generally — "people saw this differently" — never attributed.',
  '',
  'Write in the language the answers are written in.',
  `Return ONLY JSON: ${SYNTHESIS_SCHEMA_HINT}`,
].join('\n');

/** Build the single user message carrying the whole round. */
export function buildSynthesisRequest(
  inputs: readonly { questionId: string; question: string; answers: readonly string[] }[],
): string {
  return inputs
    .map((input) =>
      [
        `QUESTION ${input.questionId}: ${input.question}`,
        ...input.answers.map((answer, i) => `answer ${i + 1}: ${answer}`),
      ].join('\n'),
    )
    .join('\n\n');
}

/** One synthesis as the model returns it. */
export interface RawSynthesis {
  questionId: string;
  text: string | null;
  support: number;
}

/**
 * Read the model's answer.
 *
 * Anything unreadable becomes an EMPTY result rather than a throw: a round that produced nothing is
 * a state the product already has words for, and a crash here would be a crash holding other
 * people's answers.
 */
export function parseSyntheses(text: string): RawSynthesis[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { syntheses?: unknown };
    if (!Array.isArray(parsed.syntheses)) return [];
    return parsed.syntheses.flatMap((item): RawSynthesis[] => {
      if (!item || typeof item !== 'object') return [];
      const row = item as { questionId?: unknown; text?: unknown; support?: unknown };
      if (typeof row.questionId !== 'string') return [];
      return [
        {
          questionId: row.questionId,
          text: typeof row.text === 'string' ? row.text : null,
          support: typeof row.support === 'number' ? row.support : 0,
        },
      ];
    });
  } catch {
    return [];
  }
}
