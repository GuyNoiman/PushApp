/**
 * definitions — the Journeys the library can build, each declaring its OWN variant axis (D62).
 *
 * This file is CONTENT. It is where a Journey says what its versions differ on, which profile
 * answers already place a user on that difference, and which version each answer argues for. Adding
 * a Journey, a version, or an entirely new KIND of difference happens here and in the `library`
 * translation cache — never in the selector, the ratings, or the planner (D62 §1).
 *
 * ONE Journey exists so far: the generic recurring Journey, which is the three ways a repeated
 * action takes hold (`./recurringApproaches`) promoted from "three approaches the matcher picks
 * between" to "one Journey with three declared versions". Nothing about the plans it produces has
 * changed; what has changed is that the difference between the versions is now stated by the
 * Journey itself, the versions are addressable entities that hold ratings, and the question that
 * separates them belongs to the Journey rather than to the matcher.
 *
 * WHY THE GENERIC RECURRING JOURNEY HAS `domain: 'any'`: how a repeated action takes hold is not
 * domain knowledge. It is identical for a protein shake and for changing the pillowcases, and
 * writing it once per domain would be the same content four times, drifting apart on the fifth
 * (the same argument that keeps the horizon question out of the experts).
 *
 * WHAT IS NOT HERE, deliberately: variants for a PROCESS goal. Whether the library's authored arcs
 * replace a domain expert's arc or shape how the user moves through it is an open founder decision
 * (Status_Report_2026-08-18 §3), and it touches the sensitive domains. The model above is ready for
 * it — a process Journey is a definition with `shape: 'process'` — and this file stays honest about
 * not having made that call.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
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

/** Every Journey the library can build. Ordered; the registry never reorders it. */
export const JOURNEY_DEFINITIONS: readonly JourneyDefinition[] = [RECURRING_GENERIC];

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
  return JOURNEY_DEFINITIONS.filter((d) => d.shape === shape).sort((a, b) => {
    const specific = (d: JourneyDefinition) => (d.domain !== 'any' && d.domain === domain ? 0 : 1);
    return specific(a) - specific(b);
  });
}
