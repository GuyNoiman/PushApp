/**
 * career.nextStep — "understand what my next career move is" (partner family CAR_G01).
 *
 * THREE JOURNEYS FOR ONE GOAL, and the reason they are three Journeys rather than three versions of
 * one is visible in the Milestones below: they are not the same arc at different speeds. One builds
 * criteria and candidate directions and only then meets the real world; one runs a small experiment
 * first and derives the criteria from what it taught; one alternates in short cycles. The founder's
 * rule (see `../journeyDefinition`'s header) sends exactly that difference here, as separate
 * definitions grouped by a {@link ../goalFamily.GoalFamily}.
 *
 * WHAT THEY DIFFER ALONG — the family's axis — is **how much certainty is built before the first
 * real-world test**. That is the partner's own `variantAxis` for this family, and it is a real
 * dimension: it is not "how hard do you want to work", it is where a person's confidence comes from.
 * Q7 of onboarding already asks it ("do you need to be clear before acting, or do you start by
 * doing"), so anyone who answered it is never asked again.
 *
 * TRANSLATED, NOT COPIED. The source package (`07_Assets/02_Central_Journey_Library_Career_Linked_
 * 18_Journeys_v0.6.json`) is an authoring artifact: it carries personas, a Dream, a `libraryMeta.
 * linkedExpertIds` link it explicitly does not claim is a model field, and a `matchingHypothesis`
 * written as a ranking. What survives here is what our model can hold honestly — the arcs, the
 * Steps, the axis, and which profile answers place a user on it. The personas and their Dreams do
 * NOT: a Dream belongs to the person living it, never to a library Journey.
 *
 * The authored Journey titles are kept here as a record, since a Journey built from a library arc
 * takes the USER's own goal as its title (their sentence beats a fluent one about somebody else):
 *   • clarityFirst — "Narrow the options, test the leading ones, and make the next move"
 *   • actionFirst  — "Learn from one small experiment and translate it into your next direction"
 *   • hybrid       — "Get just enough clarity, test fast, and choose the next move"
 *
 * LANGUAGE: authored English on the object (which is also the fallback), Hebrew in the `library`
 * translation cache — including the `_feminine` forms, which is how the partner wrote them.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

/** The key prefix in the `library` namespace for everything in this family. */
const K = 'career.nextStep';

/** The axis these three differ along: how much certainty before the first real-world test. */
export const CERTAINTY_AXIS = 'certaintyBeforeTest';

const CLARITY_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 35,
  milestones: [
    { id: 'm0', title: 'I know what my next direction has to give me, and what it has to respect', titleKey: `${K}.clarityFirst.m0`, weight: 1 },
    { id: 'm1', title: 'I have two plausible directions worth testing', titleKey: `${K}.clarityFirst.m1`, weight: 1 },
    { id: 'm2', title: 'I have compared both directions against real-world information', titleKey: `${K}.clarityFirst.m2`, weight: 2 },
    { id: 'm3', title: 'I have tested the leading direction through a small piece of real work', titleKey: `${K}.clarityFirst.m3`, weight: 2 },
    { id: 'm4', title: 'I have chosen my next move and started it', titleKey: `${K}.clarityFirst.m4`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Pick one task at work that gives you energy and one that drains you',
      titleKey: `${K}.clarityFirst.s0.title`,
      description: 'Two real examples from the past month are enough. Start from your own experience, not from job titles.',
      descriptionKey: `${K}.clarityFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's0',
      title: 'Turn those two examples into three criteria and two constraints',
      titleKey: `${K}.clarityFirst.s1.title`,
      description: 'For example: the kind of problems, learning, working across teams, income stability, or a limit on time for studying.',
      descriptionKey: `${K}.clarityFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose two plausible directions that seem to fit those criteria',
      titleKey: `${K}.clarityFirst.s2.title`,
      description: 'These are hypotheses to test, not a decision. Do not sign up for a course and do not commit to a direction yet.',
      descriptionKey: `${K}.clarityFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm2', estimatedMinutes: 25, difficulty: 3,
      title: 'Look through a small sample of current roles in the first direction',
      titleKey: `${K}.clarityFirst.s3.title`,
      description: 'Check what repeats across the roles, what attracts you, what puts you off, and what is still unclear.',
      descriptionKey: `${K}.clarityFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 25, difficulty: 3,
      title: 'Do the same check for the second direction',
      titleKey: `${K}.clarityFirst.s4.title`,
      description: 'Use the same criteria, so you are not choosing by job title alone.',
      descriptionKey: `${K}.clarityFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 30, difficulty: 3,
      title: 'Talk to one person who knows the direction that looks strongest right now',
      titleKey: `${K}.clarityFirst.s5.title`,
      description: 'Come with two or three questions about the actual work, the hard parts, and what surprises people who enter the field.',
      descriptionKey: `${K}.clarityFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2,
      title: 'Map one problem you already know that resembles the work in the leading direction',
      titleKey: `${K}.clarityFirst.s6.title`,
      description: 'For example: a problem that keeps coming back for customers, who it affects, and what you think causes it.',
      descriptionKey: `${K}.clarityFirst.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 30, difficulty: 4, dependsOnStepId: 's6',
      title: 'Write a short improvement proposal for the problem you mapped',
      titleKey: `${K}.clarityFirst.s7.title`,
      description: 'This is a cheap, reversible experiment that simulates part of the work without a long course.',
      descriptionKey: `${K}.clarityFirst.s7.description`,
    },
    {
      id: 's8', milestoneId: 'm4', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose your next career move from the evidence you gathered',
      titleKey: `${K}.clarityFirst.s8.title`,
      description: 'For example: one more piece of proof, a defined skill gap, a focused search, or testing one more direction.',
      descriptionKey: `${K}.clarityFirst.s8.description`,
    },
    {
      id: 's9', milestoneId: 'm4', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's8',
      title: 'Take the first action of the move you chose',
      titleKey: `${K}.clarityFirst.s9.title`,
      description: 'Start the move with one real action.',
      descriptionKey: `${K}.clarityFirst.s9.description`,
    },
  ],
};

const ACTION_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 35,
  milestones: [
    { id: 'm0', title: 'I have tried a small piece of work built on what already gives me energy', titleKey: `${K}.actionFirst.m0`, weight: 2 },
    { id: 'm1', title: 'I have turned what I learned into two plausible directions', titleKey: `${K}.actionFirst.m1`, weight: 1 },
    { id: 'm2', title: 'I have checked whether those directions really contain the work I am looking for', titleKey: `${K}.actionFirst.m2`, weight: 2 },
    { id: 'm3', title: 'I know what my next direction has to give me, and what it has to respect', titleKey: `${K}.actionFirst.m3`, weight: 1 },
    { id: 'm4', title: 'I have chosen my next move and started it', titleKey: `${K}.actionFirst.m4`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 5, difficulty: 1,
      title: 'Pick one problem that keeps coming back at work and that you would like to solve differently',
      titleKey: `${K}.actionFirst.s0.title`,
      description: 'Choose a problem you already know. You do not need to know which job title it "belongs" to yet.',
      descriptionKey: `${K}.actionFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Map briefly who the problem affects and what seems to cause it',
      titleKey: `${K}.actionFirst.s1.title`,
      description: 'The aim is to have material for an experiment, not a perfect document.',
      descriptionKey: `${K}.actionFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3, dependsOnStepId: 's1',
      title: 'Write a short improvement proposal, or another way of handling the problem',
      titleKey: `${K}.actionFirst.s2.title`,
      description: 'This is a first experiment, and it produces information about which kind of work gives you energy.',
      descriptionKey: `${K}.actionFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1,
      title: 'Write down what in the experiment gave you energy and what did not',
      titleKey: `${K}.actionFirst.s3.title`,
      description: 'Focus on what you actually did: analysing, coordinating, writing, solving a problem, working with people.',
      descriptionKey: `${K}.actionFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Turn what you learned into two plausible career directions',
      titleKey: `${K}.actionFirst.s4.title`,
      description: 'The coach can suggest possibilities, but they stay hypotheses to test.',
      descriptionKey: `${K}.actionFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 30, difficulty: 3,
      title: 'Look through a small sample of current roles in both directions',
      titleKey: `${K}.actionFirst.s5.title`,
      description: 'Look for the overlap between what you enjoyed in the experiment and what the roles actually ask for.',
      descriptionKey: `${K}.actionFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm2', estimatedMinutes: 30, difficulty: 3,
      title: 'Talk to one person who knows the leading direction',
      titleKey: `${K}.actionFirst.s6.title`,
      description: 'Ask whether the kind of work you tried really appears in the role, and what it looks like day to day.',
      descriptionKey: `${K}.actionFirst.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Write three criteria and two constraints for the final choice',
      titleKey: `${K}.actionFirst.s7.title`,
      description: 'By now the criteria rest on something you have done, not only on a guess.',
      descriptionKey: `${K}.actionFirst.s7.description`,
    },
    {
      id: 's8', milestoneId: 'm4', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose your next career move from the evidence you gathered',
      titleKey: `${K}.actionFirst.s8.title`,
      description: 'Choose one move, not a career for life.',
      descriptionKey: `${K}.actionFirst.s8.description`,
    },
    {
      id: 's9', milestoneId: 'm4', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's8',
      title: 'Take the first action of the move you chose',
      titleKey: `${K}.actionFirst.s9.title`,
      description: 'Start for real: a piece of proof, a conversation, a defined skill gap, or a focused search.',
      descriptionKey: `${K}.actionFirst.s9.description`,
    },
  ],
};

const HYBRID_ARC: AuthoredArc = {
  suggestedDurationDays: 35,
  milestones: [
    { id: 'm0', title: 'I have one hypothesis good enough to test without committing to it', titleKey: `${K}.hybrid.m0`, weight: 1 },
    { id: 'm1', title: 'I have tested that hypothesis both in information and in a small action', titleKey: `${K}.hybrid.m1`, weight: 2 },
    { id: 'm2', title: 'I know what got stronger, what got weaker, and what I still need to find out', titleKey: `${K}.hybrid.m2`, weight: 1 },
    { id: 'm3', title: 'I have closed the last information gap that was blocking a decision', titleKey: `${K}.hybrid.m3`, weight: 2 },
    { id: 'm4', title: 'I have chosen my next move and started it', titleKey: `${K}.hybrid.m4`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 5, difficulty: 1,
      title: 'Write in one sentence what you want more of in your next job, and what you want less of',
      titleKey: `${K}.hybrid.s0.title`,
      description: 'No long list. One sentence, based on how the work feels to you today.',
      descriptionKey: `${K}.hybrid.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1, dependsOnStepId: 's0',
      title: 'Choose one direction that looks plausible enough to test right now',
      titleKey: `${K}.hybrid.s1.title`,
      description: 'This is a temporary hypothesis. You do not have to be sure.',
      descriptionKey: `${K}.hybrid.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 20, difficulty: 2,
      title: 'Read two current role descriptions in that direction',
      titleKey: `${K}.hybrid.s2.title`,
      description: 'Look for three things only: what attracts you, what puts you off, and what is still unclear.',
      descriptionKey: `${K}.hybrid.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 30, difficulty: 3, dependsOnStepId: 's2',
      title: 'Run one micro-experiment that simulates part of the work in that direction',
      titleKey: `${K}.hybrid.s3.title`,
      description: 'Choose a small, cheap action you can do out of the experience you already have.',
      descriptionKey: `${K}.hybrid.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Write down what became clearer after the reading and the experiment',
      titleKey: `${K}.hybrid.s4.title`,
      description: 'What got stronger, what is off the table, and what still needs checking.',
      descriptionKey: `${K}.hybrid.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Add a second direction only if real doubt is left',
      titleKey: `${K}.hybrid.s5.title`,
      description: 'If the first direction looks promising enough, there is no need to add an option just to have something to compare against.',
      descriptionKey: `${K}.hybrid.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 30, difficulty: 3,
      title: 'Talk to one person who knows the direction that is leading now',
      titleKey: `${K}.hybrid.s6.title`,
      description: 'Use the conversation to close the gaps you have left, not to start the research over.',
      descriptionKey: `${K}.hybrid.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Write three criteria and two constraints for the decision',
      titleKey: `${K}.hybrid.s7.title`,
      description: 'Build them out of what you have already learned, not before any contact with reality.',
      descriptionKey: `${K}.hybrid.s7.description`,
    },
    {
      id: 's8', milestoneId: 'm4', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose your next career move',
      titleKey: `${K}.hybrid.s8.title`,
      description: 'Choose the most reasonable next step, not a career for life.',
      descriptionKey: `${K}.hybrid.s8.description`,
    },
    {
      id: 's9', milestoneId: 'm4', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's8',
      title: 'Take the first action of the move you chose',
      titleKey: `${K}.hybrid.s9.title`,
      description: 'Move from a decision to something you actually did.',
      descriptionKey: `${K}.hybrid.s9.description`,
    },
  ],
};

export const NEXT_STEP_CLARITY_FIRST: JourneyDefinition = processJourney({
  id: `${K}.clarityFirst`,
  version: 1,
  domain: 'career',
  essence: 'Build the criteria and the candidate directions first, and only then take them to the real world.',
  essenceKey: `${K}.clarityFirst.essence`,
  arc: CLARITY_FIRST_ARC,
});

export const NEXT_STEP_ACTION_FIRST: JourneyDefinition = processJourney({
  id: `${K}.actionFirst`,
  version: 1,
  domain: 'career',
  essence: 'Start with one small experiment inside work you already know, and let it narrow the directions.',
  essenceKey: `${K}.actionFirst.essence`,
  arc: ACTION_FIRST_ARC,
});

export const NEXT_STEP_HYBRID: JourneyDefinition = processJourney({
  id: `${K}.hybrid`,
  version: 1,
  domain: 'career',
  essence: 'A little clarity, then a fast real-world test, and narrowing only from what it taught you.',
  essenceKey: `${K}.hybrid.essence`,
  arc: HYBRID_ARC,
});

/**
 * The family. Its default is the HYBRID Journey, and that is a deliberate choice for a cold start:
 * it is the one that asks for neither a long analysis before anything happens nor a leap with no
 * ground under it, so it is the least likely to be wrong for someone we know nothing about.
 */
export const CAREER_NEXT_STEP: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'FIND_DIRECTION',
  bottleneck: 'DIRECTION_EVIDENCE_GAP',
  goal: 'Understand what my next step in my career is',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: CERTAINTY_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'clarityFirst', labelKey: `${K}.axis.clarityFirst` },
        { id: 'actionFirst', labelKey: `${K}.axis.actionFirst` },
        { id: 'both', labelKey: `${K}.axis.both` },
      ],
      /**
       * Q7 of onboarding IS this question, asked earlier and in general terms. Someone who told us
       * how they start is not asked again — and `dependsGoal` ("it depends on the goal") is a real
       * answer that places them on the middle position, not a missing one.
       */
      answeredByProfile: {
        clarityFirst: 'clarityFirst',
        actionFirst: 'actionFirst',
        dependsGoal: 'both',
      },
    },
  ],
  members: [
    {
      id: NEXT_STEP_CLARITY_FIRST.id,
      position: { [CERTAINTY_AXIS]: ['clarityFirst'] },
      // Q8 — someone who wants a detailed structure is describing this arc: everything is decided
      // before the first real move.
      profileSignals: { detailedStructure: 1 },
    },
    {
      id: NEXT_STEP_ACTION_FIRST.id,
      position: { [CERTAINTY_AXIS]: ['actionFirst'] },
      // Q5 — someone whose excitement fades during long preparation needs the experiment first.
      profileSignals: { excitementFades: 1, lightStructure: 1 },
    },
    {
      id: NEXT_STEP_HYBRID.id,
      position: { [CERTAINTY_AXIS]: ['both'] },
      profileSignals: { firmThenLoose: 1 },
    },
  ],
  defaultDefinitionId: NEXT_STEP_HYBRID.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_NEXT_STEP_JOURNEYS: readonly JourneyDefinition[] = [
  NEXT_STEP_CLARITY_FIRST,
  NEXT_STEP_ACTION_FIRST,
  NEXT_STEP_HYBRID,
];
