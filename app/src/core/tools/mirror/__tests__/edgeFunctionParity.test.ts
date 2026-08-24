/**
 * The Edge Function and this module must say the SAME thing.
 *
 * `supabase/functions/mirror-synthesis/index.ts` carries its own copy of the prompt, the question
 * bank and the thresholds, because Deno cannot import the app's modules and because taking any of
 * them from the client would let the person a round is about write the instructions that summarise
 * other people's answers about them.
 *
 * A copy nobody checks is a copy that drifts. Six months from now somebody softens a prohibition in
 * the prompt here, ships it, and the sentence that actually reaches the model is the old one — with
 * nothing on screen to suggest anything is wrong. So the copy is checked, mechanically, at the only
 * moment it can be: now.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import bankCopy from '../../../../i18n/resources/en/tools.json';
import { QUESTION_BANK, QUESTIONS_PER_ROUND } from '../questionBank';
import { CLAIM_MIN_SUPPORT, CONFIDENTIAL_THRESHOLD } from '../round';
import { SYNTHESIS_SYSTEM_PROMPT } from '../synthesisPrompt';

const FUNCTION_PATH = join(__dirname, '../../../../../supabase/functions/mirror-synthesis/index.ts');
const source = readFileSync(FUNCTION_PATH, 'utf8');

/** The text between two marker comments, exclusive. */
function between(start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return source.slice(from + start.length, to);
}

describe('mirror-synthesis edge function parity', () => {
  it('carries the prompt verbatim', () => {
    const block = between('// ── PROMPT START', '// ── PROMPT END');
    const match = block.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(SYNTHESIS_SYSTEM_PROMPT);
  });

  it('carries every bank question, with the authored English text', () => {
    const block = between('// ── BANK START', '// ── BANK END');
    const embedded = new Map<string, string>();
    for (const line of block.split('\n')) {
      const match = line.match(/^\s*(\w+):\s*"([\s\S]*)",\s*$/);
      if (match) embedded.set(match[1], match[2]);
    }
    const authored = (bankCopy as { mirror: { bank: Record<string, string> } }).mirror.bank;

    // Every question the app can put in a round is one the function can name to the model. A missing
    // one would silently send the model an id like "atMyBest" as the question text.
    for (const question of QUESTION_BANK) {
      expect(embedded.get(question.id)).toBe(authored[question.id]);
    }
    expect(embedded.size).toBe(QUESTION_BANK.length);
  });

  it('carries the same thresholds', () => {
    expect(source).toContain(`const CONFIDENTIAL_THRESHOLD = ${CONFIDENTIAL_THRESHOLD};`);
    expect(source).toContain(`const CLAIM_MIN_SUPPORT = ${CLAIM_MIN_SUPPORT};`);
    expect(source).toContain(`const QUESTIONS_PER_ROUND = ${QUESTIONS_PER_ROUND};`);
  });

  it('never takes the question text from the request body', () => {
    // The questions are rebuilt from the round row. If this ever changes, the review that changes it
    // has to change this test too, and read the reason above while doing it.
    expect(source).toContain('round.question_ids');
    expect(source).not.toMatch(/payload\.(questions|questionText|prompt)/);
  });
});
