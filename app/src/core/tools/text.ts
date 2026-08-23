/**
 * Text helpers shared by the tools — currently one, and it is here because more than one tool
 * enforces a length limit and they must all count the same way.
 *
 * Pure TypeScript — no React, no vendor imports.
 */

/**
 * Length as a PERSON counts it, not as UTF-16 does (PRD §9). An emoji is one character to the human
 * typing it; `"👩‍👧".length` is 5. `Intl.Segmenter` is the correct answer where the runtime has it,
 * and the code-point count is a much better wrong answer than `.length` where it does not.
 */
export function perceivedLength(text: string): number {
  const Segmenter = (Intl as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<unknown> } }).Segmenter;
  if (Segmenter) {
    let count = 0;
    for (const _ of new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) count += 1;
    return count;
  }
  return [...text].length;
}
