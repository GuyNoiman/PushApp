/**
 * career — the Career-linked section of the central Journey Library.
 *
 * SIX GOAL FAMILIES, EIGHTEEN JOURNEYS, ingested from the partner's authoring package
 * (`07_Assets/01_Central_Journey_Library_Career_Linked_v0.6.md` + the `02_…json` beside it) and
 * translated into our model rather than copied into it. What changed in the translation, and why,
 * is written at the top of each family file; the three structural decisions are here:
 *
 *  1. **A family's three "variants" became three JOURNEYS.** Every one of them carries a different
 *     Milestone arc, and the founder's rule is that a differing arc is a different Journey. So the
 *     library grew the object that holds several Journeys for one goal
 *     ({@link ../goalFamily.GoalFamily}) instead of pretending three arcs are three versions of one.
 *  2. **The personas and their Dreams did not come across.** The package carries a persona per
 *     family, with a named Dream. A Dream belongs to the person living it — a library Journey may
 *     never arrive holding someone else's.
 *  3. **The persona's own particulars were generalised out of the Steps.** Two families named the
 *     persona's actual options and target role inside Step titles. Those now say "the first option",
 *     "the direction you are testing", and so on, because the user's own answer belongs there.
 *
 * WHAT IS STILL NOT WIRED, stated plainly so nobody reads this as finished: the coach cannot yet
 * reach these Journeys. Choosing a family needs the Career expert to DIAGNOSE which of the six a
 * goal belongs to (its `subtype` and `bottleneck`), and that diagnosis does not exist — the expert
 * asks four questions and returns one hardcoded arc. The content is correct, validated and
 * translated; the route from a conversation to it is the next decision.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { CAREER_ACCESS, CAREER_ACCESS_JOURNEYS } from './access';
import { CAREER_FIT_TEST, CAREER_FIT_TEST_JOURNEYS } from './fitTest';
import { CAREER_JOB_TARGET, CAREER_JOB_TARGET_JOURNEYS } from './jobTarget';
import { CAREER_NEXT_STEP, CAREER_NEXT_STEP_JOURNEYS } from './nextStep';
import { CAREER_PROOF, CAREER_PROOF_JOURNEYS } from './proof';
import { CAREER_TWO_OPTIONS, CAREER_TWO_OPTIONS_JOURNEYS } from './twoOptions';

export * from './access';
export * from './fitTest';
export * from './jobTarget';
export * from './nextStep';
export * from './proof';
export * from './twoOptions';

/** The six Career goal families, in the order the partner's package lists them. */
export const CAREER_FAMILIES: readonly GoalFamily[] = [
  CAREER_NEXT_STEP,
  CAREER_TWO_OPTIONS,
  CAREER_FIT_TEST,
  CAREER_JOB_TARGET,
  CAREER_PROOF,
  CAREER_ACCESS,
];

/** All eighteen Career Journeys, grouped by their family, in the same order. */
export const CAREER_JOURNEYS: readonly JourneyDefinition[] = [
  ...CAREER_NEXT_STEP_JOURNEYS,
  ...CAREER_TWO_OPTIONS_JOURNEYS,
  ...CAREER_FIT_TEST_JOURNEYS,
  ...CAREER_JOB_TARGET_JOURNEYS,
  ...CAREER_PROOF_JOURNEYS,
  ...CAREER_ACCESS_JOURNEYS,
];
