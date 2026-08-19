/**
 * definitions — the Journeys the library can build, each declaring its OWN variant axis (D62).
 *
 * This file is CONTENT. It is where a Journey says what its versions differ on, which profile
 * answers already place a user on that difference, and which version each answer argues for. Adding
 * a Journey, a version, or an entirely new KIND of difference happens here and in the `library`
 * translation cache — never in the selector, the ratings, or the planner (D62 §1).
 *
 * WHAT IS IN IT. The generic recurring Journey — the three ways a repeated action takes hold
 * (`./recurringApproaches`), promoted from "three approaches the matcher picks between" to "one
 * Journey with three declared versions" — and the Career section (`./career`): eighteen Journeys in
 * six goal families, each Journey carrying its own authored Milestone arc.
 *
 * WHY THE GENERIC RECURRING JOURNEY HAS `domain: 'any'`: how a repeated action takes hold is not
 * domain knowledge. It is identical for a protein shake and for changing the pillowcases, and
 * writing it once per domain would be the same content four times, drifting apart on the fifth
 * (the same argument that keeps the horizon question out of the experts). A Career Journey is the
 * opposite: it is domain content, so it is a candidate only inside its own domain — see
 * {@link journeyDefinitionsFor}.
 *
 * THE TWO LEVELS. A GOAL FAMILY holds the several Journeys authored for one goal and the axis they
 * differ along; a JOURNEY holds the versions of itself, which never differ on their Milestones. The
 * founder's rule decides which of the two a difference belongs to, and it is not a matter of taste:
 * same arc ⇒ a version, different arc ⇒ another Journey in the family.
 *
 * WHAT IS STILL MISSING, and it is a route rather than content: nothing takes a real conversation to
 * a Career family yet. Choosing one needs the expert to diagnose WHICH of the six a goal is (its
 * subtype and its bottleneck), and the experts do not diagnose — each returns one hardcoded arc. So
 * these Journeys are validated, translated and unreachable, and `AppCore.matchVariant` deliberately
 * refuses to stamp provenance from a Journey whose content was not the one built.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import { CAREER_FAMILIES, CAREER_JOURNEYS } from './career';
import type { GoalFamily } from './goalFamily';
import type { JourneyDefinition } from './journeyDefinition';
import type { JourneyShape } from '../types';

/** The stable id of the generic recurring Journey — the id its ratings accumulate under. */
export const RECURRING_GENERIC_ID = 'recurring.generic';

/** The axis id of "what actually gets in the way of keeping something up". */
export const FRICTION_AXIS = 'friction';

/**
 * The generic recurring Journey: one repeated action, three ways of making it stick.
 *
 * ITS DECLARED DIFFERENCE is the FRICTION the repetition runs into — not intensity, not length, not
 * ambition. Three versions that differ only in how much they ask teach us nothing except that some
 * people prefer less work; these three differ in METHOD, so "which version suits whom" is a real
 * question with a real answer (Plan_Library_and_Learning_PRD §6).
 *
 * The three positions on that axis are the three honest answers to *what went wrong last time*:
 *  - `noOccasion` — the action never found a moment in the day, or the moment stopped motivating;
 *  - `tooBig`     — it was too much to sustain;
 *  - `deciding`   — the friction was the deciding, not the doing.
 *
 * Each position has exactly one version designed for it, which is why this Journey's question is
 * worth asking: every answer changes the plan. The moment two versions cover the same position, the
 * question stops discriminating there and {@link ./selectVariant.variantQuestionsFor} stops asking
 * it — that is handled by the engine, not by remembering to delete the axis.
 */
export const RECURRING_GENERIC: JourneyDefinition = {
  id: RECURRING_GENERIC_ID,
  version: 1,
  shape: 'recurring',
  domain: 'any',
  axes: [
    {
      id: FRICTION_AXIS,
      questionKey: 'recurring.axis.friction.question',
      values: [
        { id: 'noOccasion', labelKey: 'recurring.axis.friction.noOccasion' },
        { id: 'tooBig', labelKey: 'recurring.axis.friction.tooBig' },
        { id: 'deciding', labelKey: 'recurring.axis.friction.deciding' },
      ],
      /**
       * The onboarding answers that ALREADY place someone on this axis, so this Journey does not ask
       * a question the user has answered. These are the exact mappings the matcher used before D62
       * (`./matchApproach`), moved from code into the Journey that depends on them:
       *
       *  - Q5, what gets in the way: `lifeBusy` / `excitementFades` are failures of OCCASION;
       *    `tooMuchAtOnce` is scale; `noClearPlan` is deciding.
       *  - Q4, what helps: `smallSteps` argues that scale is the problem, `clearPlan` that deciding is.
       *
       * Q4/Q5 answers with no entry (`seeProgress`, `supportClose`, `flexibility`, `dontKnow` …)
       * genuinely do not discriminate between these three and are left out rather than assigned
       * somewhere plausible. A user whose profile says nothing here is ASKED, which is the whole
       * point: the question exists for exactly those people.
       */
      answeredByProfile: {
        lifeBusy: 'noOccasion',
        excitementFades: 'noOccasion',
        tooMuchAtOnce: 'tooBig',
        noClearPlan: 'deciding',
        smallSteps: 'tooBig',
        clearPlan: 'deciding',
      },
    },
  ],
  variants: [
    {
      id: 'anchor',
      essence: 'Attach it to something you already do every day.',
      essenceKey: 'recurring.anchor.essence',
      position: { [FRICTION_AXIS]: ['noOccasion'] },
      // Q8 — someone who wants light structure is well served by a plan that adds one attachment
      // point and nothing else. The other Q8/Q9 answers are not mapped anywhere: none of these
      // three versions is HARDER than the others, so "how much challenge do you want" cannot
      // choose between them, and pretending it can would be a fabricated match.
      profileSignals: { lightStructure: 1 },
      build: { kind: 'recurring', approach: 'anchor' },
    },
    {
      id: 'tiny_start',
      essence: 'Start smaller than feels worth it, then grow from there.',
      essenceKey: 'recurring.tiny.essence',
      position: { [FRICTION_AXIS]: ['tooBig'] },
      // Q7 — someone who starts by acting rather than by getting clear wants the smallest version
      // they can do today. Q9 — someone who wants it gentle right now is asking for the same thing
      // in different words.
      profileSignals: { actionFirst: 1, gentleNow: 1 },
      build: { kind: 'recurring', approach: 'tiny_start' },
    },
    {
      id: 'prepare',
      essence: 'Do most of the work in advance, so the moment itself needs no decision.',
      essenceKey: 'recurring.prepare.essence',
      position: { [FRICTION_AXIS]: ['deciding'] },
      // Q7 — someone who needs to be clear before acting, and Q8 — someone who wants a detailed
      // structure, are both describing a plan that front-loads every decision.
      profileSignals: { clarityFirst: 1, detailedStructure: 1 },
      build: { kind: 'recurring', approach: 'prepare' },
    },
  ],
  /**
   * `anchor` when nothing is known and nothing was asked — the only one of the three that asks for
   * no equipment, no shrinking of the goal, and no decision the user might get wrong.
   */
  defaultVariantId: 'anchor',
};

/**
 * Every Journey in the library. Ordered; the registry never reorders it.
 *
 * The generic recurring Journey first, then the eighteen Career Journeys ingested from the partner's
 * package (`./career`). They sit in ONE list rather than in a second registry so `journeyDefinition`
 * resolves any id, and so a validation test covers every shipped Journey with no way to forget one.
 */
export const JOURNEY_DEFINITIONS: readonly JourneyDefinition[] = [
  RECURRING_GENERIC,
  ...CAREER_JOURNEYS,
];

/**
 * Every goal family — the groups of several Journeys authored for ONE goal. All six are Career
 * today; a family for another domain is content, and lands beside them.
 */
export const GOAL_FAMILIES: readonly GoalFamily[] = [...CAREER_FAMILIES];

/** One family by id, or undefined for an unknown id (never throws). */
export function goalFamily(id: string | undefined): GoalFamily | undefined {
  return GOAL_FAMILIES.find((f) => f.id === id);
}

/** The families that are candidates for a goal in this domain, in authored order. */
export function goalFamiliesFor(domain: string | undefined): GoalFamily[] {
  return GOAL_FAMILIES.filter((f) => f.domain === domain);
}

/** One definition by id, or undefined for an unknown id (never throws). */
export function journeyDefinition(id: string | undefined): JourneyDefinition | undefined {
  return JOURNEY_DEFINITIONS.find((d) => d.id === id);
}

/**
 * The Journeys that are candidates for a goal of this shape and domain, most specific first: a
 * definition authored for the exact domain outranks a `'any'` one.
 *
 * There is one candidate per shape today, so this returns a list of one — and it returns a LIST
 * because "several Journeys per goal" is the architecture (Plan_Library_and_Learning_PRD §6.1) and a
 * function that returns one Journey would have to be rewritten the day the second one lands.
 */
export function journeyDefinitionsFor(shape: JourneyShape, domain?: string): JourneyDefinition[] {
  // A Journey authored FOR a domain is a candidate only inside it. Before the Career section landed
  // every definition was `domain: 'any'`, so a sort was enough and nothing could be mis-offered;
  // with domain content in the library, a filter is what stops a career arc from being handed to
  // someone working on their relationships.
  return JOURNEY_DEFINITIONS.filter(
    (d) => d.shape === shape && (d.domain === 'any' || d.domain === domain),
  ).sort((a, b) => {
    const specific = (d: JourneyDefinition) => (d.domain !== 'any' ? 0 : 1);
    return specific(a) - specific(b);
  });
}
