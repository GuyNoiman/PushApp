/**
 * The outcome vocabulary — the closed sets the matching engine will eventually
 * learn from, authored now so the data being collected is already in a shape it
 * can use.
 *
 * ── WHY CLOSED SETS AND NOT FREE TEXT ────────────────────────────────────
 *
 * §3A.7: "structured evidence, not an uncontrolled text embedding, drives
 * matching." A person may always write in their own words, and that comment is
 * theirs — it is not what the engine reads. Everything the engine reads is one
 * of these ids, which is what makes "for whom does this Journey work" answerable
 * without reading anybody's sentences.
 *
 * The mismatch dimensions are §6's A–K, unchanged in meaning. Ids are stable
 * forever: adding is free, repurposing is a schema version.
 *
 * Pure TypeScript — no React, no vendor imports.
 */

export const OUTCOME_SCHEMA_VERSION = 1;

/** How a Journey ended. Not a judgement — see {@link INTENDED_DEPTHS}. */
export type JourneyEnding = 'completed' | 'abandoned' | 'expired' | 'replaced';

/**
 * What the person was after when they started (§5.2).
 *
 * Without this, adherence is measured against an assumption nobody made:
 * somebody who wanted one answer, got it in week two and stopped has an
 * excellent outcome and a terrible completion rate.
 */
export const INTENDED_DEPTHS = Object.freeze([
  { value: 'whole_thing', label: 'Go through the whole thing' },
  { value: 'specific_answer', label: 'Get one specific thing I need' },
  { value: 'trying_it', label: 'See whether it suits me' },
]);

/** §6's dimensions, A–K. The id encodes the letter so a row can be read back against the PRD. */
export const MISMATCH_DIMENSIONS = Object.freeze([
  { value: 'a_goal_fit', letter: 'A', label: 'It did not address what I actually wanted to change' },
  { value: 'b_level_fit', letter: 'B', label: 'The level was wrong — too basic, too advanced, or it jumped' },
  { value: 'c_time_fit', letter: 'C', label: 'The time, effort or cost did not fit my life' },
  { value: 'd_structure_fit', letter: 'D', label: 'The order or structure did not work for me' },
  { value: 'e_language_fit', letter: 'E', label: 'The language, examples or accessibility did not fit me' },
  { value: 'f_method_fit', letter: 'F', label: 'The method is not how I change' },
  { value: 'g_feedback_fit', letter: 'G', label: 'I needed more guidance or accountability than it gave' },
  { value: 'h_social_fit', letter: 'H', label: 'The social side did not suit me' },
  { value: 'i_voice_fit', letter: 'I', label: 'The voice or communication did not land' },
  { value: 'j_motivation_fit', letter: 'J', label: 'It was not the right moment in my life' },
  { value: 'k_trust_fit', letter: 'K', label: 'Something technical or about trust got in the way' },
]);

/**
 * What helped. §3A.7 asks for positive attribution too, and the reason is not
 * balance: a taxonomy that can only record complaints learns only how to avoid
 * harm, never what to do more of.
 */
export const HELPED_FACTORS = Object.freeze([
  { value: 'right_size', label: 'The Steps were the right size' },
  { value: 'clear_next', label: 'I always knew what was next' },
  { value: 'good_rhythm', label: 'The rhythm fitted my week' },
  { value: 'recovery', label: 'It was easy to come back after missing' },
  { value: 'method_fit', label: 'The method suited how I work' },
  { value: 'support', label: 'Having somebody alongside me' },
  { value: 'coach', label: 'The coach’s guidance' },
  { value: 'evidence', label: 'Seeing my own progress' },
]);

export const EFFORT_ACCURACY = Object.freeze([
  { value: 'much_less', label: 'Much less than expected' },
  { value: 'less', label: 'A bit less' },
  { value: 'as_expected', label: 'About what I expected' },
  { value: 'more', label: 'A bit more' },
  { value: 'much_more', label: 'Much more than expected' },
]);

const ids = (list: readonly { value: string }[]) => new Set(list.map((x) => x.value));
const MISMATCH_IDS = ids(MISMATCH_DIMENSIONS);
const HELPED_IDS = ids(HELPED_FACTORS);
const DEPTH_IDS = ids(INTENDED_DEPTHS);
const EFFORT_IDS = ids(EFFORT_ACCURACY);

export const isMismatchId = (v: string) => MISMATCH_IDS.has(v);
export const isHelpedId = (v: string) => HELPED_IDS.has(v);
export const isIntendedDepth = (v: string) => DEPTH_IDS.has(v);
export const isEffortAccuracy = (v: string) => EFFORT_IDS.has(v);
