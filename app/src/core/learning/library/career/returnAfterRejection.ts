/**
 * career.returnAfterRejection — "start moving again after being turned down" (partner family CAR_G13).
 *
 * THE ONLY JOB-SEARCH FAMILY WHOSE BOTTLENECK IS NOT IN THE SEARCH. Nothing here is aimed at getting
 * a better result; it is aimed at getting started again. Someone who has been rejected several times
 * usually does not need a better CV, they need a way back in that does not require the motivation
 * they no longer have. That is why every Journey below starts SMALLER than the search they left.
 *
 * THE ROUTING RULE THE PARTNER ATTACHED TO IT, and it is the important part: this family is reached
 * ONLY when target, proof, access and the interview stage have all been ruled out as the primary
 * bottleneck. It is the last thing to conclude, never the first — because "you have lost your
 * confidence" is the most flattering explanation available to a search that is simply aimed wrongly,
 * and it is the one that leads to a person working on themselves instead of on the thing in the way.
 *
 * THREE JOURNEYS: one restarts on the smallest possible action, one restarts on a short defined
 * route back, one rebuilds a piece of evidence of their own competence and takes it straight out
 * into the search.
 *
 * THE AXIS is **what gets you moving again** — going tiny, following a route, or proving something
 * to yourself first.
 *
 * WHAT EVERY ARC ENDS ON, in the source and kept here: a rule for the NEXT rejection. The Journey's
 * last Step is not about this setback, it is about the one after it, which is the difference between
 * recovering once and being able to recover. And every one of those rules says the same thing —
 * come back to the small action, do not try to make up for the lost time. Catching up is how a
 * return becomes the next collapse.
 *
 * TRANSLATION NOTE: two Milestone titles in the source arrived with their grammar broken by a
 * terminology substitution ("קיצרתי אותם ל-הוכחה ברור", "זיהיתי ראיות קיים ליכולת"). They are
 * translated to what they plainly mean, and reported back rather than reproduced. Otherwise as
 * `./searchProcess`'s header describes.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.returnAfterRejection';

/** The axis these three differ along: what gets you moving again. */
export const MOMENTUM_REBUILD_AXIS = 'momentumRebuild';

const SMALLEST_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have done one small search action again', titleKey: `${K}.smallest.m0`, weight: 1 },
    { id: 'm1', title: 'I proved I can come back without a burst of effort', titleKey: `${K}.smallest.m1`, weight: 2 },
    { id: 'm2', title: 'I have built a small rhythm', titleKey: `${K}.smallest.m2`, weight: 1 },
    { id: 'm3', title: 'I have a rule for the next rejection', titleKey: `${K}.smallest.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 5, difficulty: 1,
      title: 'Choose a search action that takes ten minutes at most',
      titleKey: `${K}.smallest.s0.title`,
      description: 'Something very small.',
      descriptionKey: `${K}.smallest.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1, dependsOnStepId: 's0',
      title: 'Do it once',
      titleKey: `${K}.smallest.s1.title`,
      description: 'The point is movement.',
      descriptionKey: `${K}.smallest.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 5, difficulty: 1,
      title: 'Choose one more small action',
      titleKey: `${K}.smallest.s2.title`,
      description: 'The same size as the first.',
      descriptionKey: `${K}.smallest.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Do that one too',
      titleKey: `${K}.smallest.s3.title`,
      description: 'Note what turned out to be easier than you expected.',
      descriptionKey: `${K}.smallest.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Pick two short moments for next week',
      titleKey: `${K}.smallest.s4.title`,
      description: 'Do not scale up quickly.',
      descriptionKey: `${K}.smallest.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Do at least one of them',
      titleKey: `${K}.smallest.s5.title`,
      description: 'Missing the second is not starting over.',
      descriptionKey: `${K}.smallest.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Write your rule for the next rejection',
      titleKey: `${K}.smallest.s6.title`,
      description: 'Back to a small action, with nothing to make up for.',
      descriptionKey: `${K}.smallest.s6.description`,
    },
  ],
};

const ROUTE_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have a way back made of two small actions', titleKey: `${K}.route.m0`, weight: 1 },
    { id: 'm1', title: 'I did both of them without making up for lost time', titleKey: `${K}.route.m1`, weight: 2 },
    { id: 'm2', title: 'I came back for a second week at a small pace', titleKey: `${K}.route.m2`, weight: 2 },
    { id: 'm3', title: 'I have a clear rule for the next rejection', titleKey: `${K}.route.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose two search actions you already know how to do',
      titleKey: `${K}.route.s0.title`,
      description: 'One message and checking two openings, for example. No new preparation task.',
      descriptionKey: `${K}.route.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 5, difficulty: 1, dependsOnStepId: 's0',
      title: 'Order them by which is easiest to begin',
      titleKey: `${K}.route.s1.title`,
      description: 'The aim is a simple way in, not a full plan.',
      descriptionKey: `${K}.route.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Do the first one',
      titleKey: `${K}.route.s2.title`,
      description: 'Do not add actions to make up for the time that was lost.',
      descriptionKey: `${K}.route.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Do the second one',
      titleKey: `${K}.route.s3.title`,
      description: 'If the week is busy, keep the action the same size.',
      descriptionKey: `${K}.route.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose one action for next week',
      titleKey: `${K}.route.s4.title`,
      description: 'Keep it small enough that it needs no burst of motivation.',
      descriptionKey: `${K}.route.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Do the one you chose',
      titleKey: `${K}.route.s5.title`,
      description: 'The aim is a second week of continuity, not more load.',
      descriptionKey: `${K}.route.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 8, difficulty: 1,
      title: 'Write your rule for the next rejection',
      titleKey: `${K}.route.s6.title`,
      description: 'For example: after a rejection I go back to one of the two actions, and make up for nothing.',
      descriptionKey: `${K}.route.s6.description`,
    },
  ],
};

const PROOF_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have found evidence of what I can already do', titleKey: `${K}.proof.m0`, weight: 1 },
    { id: 'm1', title: 'I have made one small piece of proof', titleKey: `${K}.proof.m1`, weight: 2 },
    { id: 'm2', title: 'I have used it inside the search itself', titleKey: `${K}.proof.m2`, weight: 1 },
    { id: 'm3', title: 'I am moving again, with a rule that protects it', titleKey: `${K}.proof.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Name one thing that proves you moved forward, offer or no offer',
      titleKey: `${K}.proof.s0.title`,
      description: 'An interview, a skill, a connection, or something you made.',
      descriptionKey: `${K}.proof.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1, dependsOnStepId: 's0',
      title: 'Choose one small thing you can do that is entirely yours to do',
      titleKey: `${K}.proof.s1.title`,
      description: 'Something inside your own control.',
      descriptionKey: `${K}.proof.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 30, difficulty: 3,
      title: 'Take it as far as a usable version',
      titleKey: `${K}.proof.s2.title`,
      description: 'Usable, not perfect.',
      descriptionKey: `${K}.proof.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Use what you made in one real search action',
      titleKey: `${K}.proof.s3.title`,
      description: 'Preparing must not become the way you avoid searching.',
      descriptionKey: `${K}.proof.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Note what changed in how ready you feel',
      titleKey: `${K}.proof.s4.title`,
      description: 'The fear does not have to be gone.',
      descriptionKey: `${K}.proof.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Do one more search action',
      titleKey: `${K}.proof.s5.title`,
      description: 'Keep the dose small.',
      descriptionKey: `${K}.proof.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose a rule that protects your sense of capability through rejections',
      titleKey: `${K}.proof.s6.title`,
      description: 'Without stopping the search itself.',
      descriptionKey: `${K}.proof.s6.description`,
    },
  ],
};

export const RETURN_SMALLEST = processJourney({
  id: `${K}.smallest`,
  version: 1,
  domain: 'career',
  essence: 'Get moving again on actions so small they need no motivation.',
  essenceKey: `${K}.smallest.essence`,
  arc: SMALLEST_ARC,
});

export const RETURN_ROUTE = processJourney({
  id: `${K}.route`,
  version: 1,
  domain: 'career',
  essence: 'Come back along a short, defined route rather than deciding where to start.',
  essenceKey: `${K}.route.essence`,
  arc: ROUTE_ARC,
});

export const RETURN_PROOF = processJourney({
  id: `${K}.proof`,
  version: 1,
  domain: 'career',
  essence: 'Rebuild a piece of evidence of what you can do, then take it straight out into the search.',
  essenceKey: `${K}.proof.essence`,
  arc: PROOF_ARC,
});

/**
 * The family. Its default is the SMALLEST restart, because it is the only one of the three that
 * cannot be too much for the week somebody is actually having — and everyone who arrives here
 * arrives with less in reserve than they had.
 */
export const CAREER_RETURN_AFTER_REJECTION: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'LAND_ROLE',
  bottleneck: 'SELF_EFFICACY_PERSISTENCE_GAP',
  goal: 'Start moving again after being turned down',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: MOMENTUM_REBUILD_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'smallest', labelKey: `${K}.axis.smallest` },
        { id: 'route', labelKey: `${K}.axis.route` },
        { id: 'proof', labelKey: `${K}.axis.proof` },
      ],
    },
  ],
  members: [
    {
      id: RETURN_SMALLEST.id,
      position: { [MOMENTUM_REBUILD_AXIS]: ['smallest'] },
      profileSignals: { smallSteps: 1, hardToRestart: 1 },
    },
    {
      id: RETURN_ROUTE.id,
      position: { [MOMENTUM_REBUILD_AXIS]: ['route'] },
      profileSignals: { clearPlan: 1, detailedStructure: 1 },
    },
    {
      id: RETURN_PROOF.id,
      position: { [MOMENTUM_REBUILD_AXIS]: ['proof'] },
      profileSignals: { seeProgress: 1, actionFirst: 1 },
    },
  ],
  defaultDefinitionId: RETURN_SMALLEST.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_RETURN_AFTER_REJECTION_JOURNEYS: readonly JourneyDefinition[] = [
  RETURN_SMALLEST,
  RETURN_ROUTE,
  RETURN_PROOF,
];
