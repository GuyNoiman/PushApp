/**
 * career.jobTarget — "find a new job when it is not yet clear which roles to aim at"
 * (partner family CAR_G08).
 *
 * This is the first of the three JOB-SEARCH families, and together they encode a diagnosis worth
 * stating plainly: when someone applies and nothing comes back, the cause is one of three things —
 * an unclear TARGET (this family), missing PROOF (`./proof`), or no ACCESS to the right
 * opportunities (`./access`). Treating the wrong one is how a job search stays busy and stays stuck.
 *
 * THREE JOURNEYS, three arcs: one narrows from the person's own criteria outward, one starts from
 * the market and reads the pattern in the roles that already appeal, one gets two realistic
 * directions from people who know the market and then verifies them.
 *
 * THE AXIS is **what you narrow with** — your criteria, the market itself, or people. Not answered
 * from the profile: nothing in onboarding says which of those a person can actually work from.
 *
 * The authored Journey titles, kept as a record:
 *   • criteriaFirst     — "Narrow the search to a clear target using criteria"
 *   • postingsFirst     — "Find a search target from the pattern in the roles that interest you"
 *   • conversationFirst — "Find a search target through conversations with people who know the market"
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.jobTarget';

/** The axis these three differ along: what you narrow the target WITH. */
export const TARGET_NARROWING_AXIS = 'targetNarrowing';

const CRITERIA_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I know what I am looking for in my next role', titleKey: `${K}.criteriaFirst.m0`, weight: 1 },
    { id: 'm1', title: 'I have narrowed it down to two plausible targets', titleKey: `${K}.criteriaFirst.m1`, weight: 2 },
    { id: 'm2', title: 'I have chosen a main target and a backup', titleKey: `${K}.criteriaFirst.m2`, weight: 1 },
    { id: 'm3', title: 'I have started a focused search for the main target', titleKey: `${K}.criteriaFirst.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Pick two tasks from your current work you would want more of, and less of',
      titleKey: `${K}.criteriaFirst.s0.title`,
      description: 'Real examples from the past month are enough.',
      descriptionKey: `${K}.criteriaFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Turn those examples into three criteria for the next role',
      titleKey: `${K}.criteriaFirst.s1.title`,
      description: 'For example: the kind of problems, working with people, depth of analysis, or how much is yours to own.',
      descriptionKey: `${K}.criteriaFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose no more than three possible target roles',
      titleKey: `${K}.criteriaFirst.s2.title`,
      description: 'These are hypotheses to test.',
      descriptionKey: `${K}.criteriaFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 35, difficulty: 4,
      title: 'Compare a small sample of openings from each target against those criteria',
      titleKey: `${K}.criteriaFirst.s3.title`,
      description: 'Look for patterns, not for one perfect opening.',
      descriptionKey: `${K}.criteriaFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Drop the one target that does not hold up well enough against them',
      titleKey: `${K}.criteriaFirst.s4.title`,
      description: 'Write down why it is going.',
      descriptionKey: `${K}.criteriaFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose a main target and a backup',
      titleKey: `${K}.criteriaFirst.s5.title`,
      description: 'The main target has to be clear enough to focus a search around.',
      descriptionKey: `${K}.criteriaFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2,
      title: 'Take one search action for the main target only',
      titleKey: `${K}.criteriaFirst.s6.title`,
      description: 'For example a focused search, or adjusting how you show the evidence for it.',
      descriptionKey: `${K}.criteriaFirst.s6.description`,
    },
  ],
};

const POSTINGS_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I can see what repeats in the roles that attract me', titleKey: `${K}.postingsFirst.m0`, weight: 2 },
    { id: 'm1', title: 'I have narrowed the market to two families of roles', titleKey: `${K}.postingsFirst.m1`, weight: 1 },
    { id: 'm2', title: 'I have chosen a clear search target', titleKey: `${K}.postingsFirst.m2`, weight: 1 },
    { id: 'm3', title: 'I have tested that target through a focused search', titleKey: `${K}.postingsFirst.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1,
      title: 'Collect five openings that made you stop and think "this is interesting"',
      titleKey: `${K}.postingsFirst.s0.title`,
      description: 'Even if the job titles are completely different from one another.',
      descriptionKey: `${K}.postingsFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's0',
      title: 'Mark what repeats across those five',
      titleKey: `${K}.postingsFirst.s1.title`,
      description: 'Look for tasks, problems and working environments that come up more than once.',
      descriptionKey: `${K}.postingsFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Group them into two families of roles',
      titleKey: `${K}.postingsFirst.s2.title`,
      description: 'Group by the actual work, not by the job title.',
      descriptionKey: `${K}.postingsFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 30, difficulty: 3,
      title: 'Check three more openings from each family',
      titleKey: `${K}.postingsFirst.s3.title`,
      description: 'See whether the pattern holds.',
      descriptionKey: `${K}.postingsFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose the family that fits your experience and your constraints better',
      titleKey: `${K}.postingsFirst.s4.title`,
      description: 'This is choosing a search target, not a professional identity.',
      descriptionKey: `${K}.postingsFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Write your search target as one sentence',
      titleKey: `${K}.postingsFirst.s5.title`,
      description: 'A sentence that names the role, the kind of work, and the kind of place.',
      descriptionKey: `${K}.postingsFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2,
      title: 'Run one focused search using that new sentence',
      titleKey: `${K}.postingsFirst.s6.title`,
      description: 'Check whether the results come back more relevant than before.',
      descriptionKey: `${K}.postingsFirst.s6.description`,
    },
  ],
};

const CONVERSATION_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have two realistic directions out of real conversations', titleKey: `${K}.conversationFirst.m0`, weight: 2 },
    { id: 'm1', title: 'I have verified that those directions exist and suit me in the market', titleKey: `${K}.conversationFirst.m1`, weight: 1 },
    { id: 'm2', title: 'I have chosen a main target', titleKey: `${K}.conversationFirst.m2`, weight: 1 },
    { id: 'm3', title: 'I have started a focused search for it', titleKey: `${K}.conversationFirst.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose two people who can show you roles close to what you already do',
      titleKey: `${K}.conversationFirst.s0.title`,
      description: 'Ideally people who see several functions, not only their own.',
      descriptionKey: `${K}.conversationFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3, dependsOnStepId: 's0',
      title: 'Have one conversation aimed at naming two or three realistic directions',
      titleKey: `${K}.conversationFirst.s1.title`,
      description: 'Ask for examples of roles, not for advice about your career.',
      descriptionKey: `${K}.conversationFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3,
      title: 'Have a second conversation and see whether the same directions come up',
      titleKey: `${K}.conversationFirst.s2.title`,
      description: 'The second conversation is what verifies the first.',
      descriptionKey: `${K}.conversationFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 25, difficulty: 3,
      title: 'Check a small sample of openings in the two directions that repeated',
      titleKey: `${K}.conversationFirst.s3.title`,
      description: 'Look for whether the actual work matches what you were told.',
      descriptionKey: `${K}.conversationFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose a main target on fit, experience and constraints',
      titleKey: `${K}.conversationFirst.s4.title`,
      description: 'Keep the second one as a backup only.',
      descriptionKey: `${K}.conversationFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2,
      title: 'Take a first search action for the main target',
      titleKey: `${K}.conversationFirst.s5.title`,
      description: 'For example one more focused conversation, or adjusting how you show the evidence for it.',
      descriptionKey: `${K}.conversationFirst.s5.description`,
    },
  ],
};

export const JOB_TARGET_CRITERIA_FIRST: JourneyDefinition = processJourney({
  id: `${K}.criteriaFirst`,
  version: 1,
  domain: 'career',
  essence: 'Say what the next role has to give you, and narrow the market down to it.',
  essenceKey: `${K}.criteriaFirst.essence`,
  arc: CRITERIA_FIRST_ARC,
});

export const JOB_TARGET_POSTINGS_FIRST: JourneyDefinition = processJourney({
  id: `${K}.postingsFirst`,
  version: 1,
  domain: 'career',
  essence: 'Start from the roles that already appeal to you, and read the pattern in them.',
  essenceKey: `${K}.postingsFirst.essence`,
  arc: POSTINGS_FIRST_ARC,
});

export const JOB_TARGET_CONVERSATION_FIRST: JourneyDefinition = processJourney({
  id: `${K}.conversationFirst`,
  version: 1,
  domain: 'career',
  essence: 'Get two realistic directions from people who know the market, then verify them against real openings.',
  essenceKey: `${K}.conversationFirst.essence`,
  arc: CONVERSATION_FIRST_ARC,
});

/**
 * The family. Its default is the CRITERIA-FIRST Journey — it starts from what the person already
 * knows about their own work, so it can begin today with no access to anyone and no market reading.
 */
export const CAREER_JOB_TARGET: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'LAND_ROLE',
  bottleneck: 'DIRECTION_GAP',
  goal: 'Find a new job when it is not yet clear which roles to aim at',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: TARGET_NARROWING_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'criteria', labelKey: `${K}.axis.criteria` },
        { id: 'market', labelKey: `${K}.axis.market` },
        { id: 'people', labelKey: `${K}.axis.people` },
      ],
    },
  ],
  members: [
    {
      id: JOB_TARGET_CRITERIA_FIRST.id,
      position: { [TARGET_NARROWING_AXIS]: ['criteria'] },
      profileSignals: { clearPlan: 1, detailedStructure: 1 },
    },
    {
      id: JOB_TARGET_POSTINGS_FIRST.id,
      position: { [TARGET_NARROWING_AXIS]: ['market'] },
      // Q3 — someone whose problem is too many directions at once is helped most by letting the
      // market do the narrowing instead of deciding in the abstract.
      profileSignals: { tooManyDirections: 1 },
    },
    {
      id: JOB_TARGET_CONVERSATION_FIRST.id,
      position: { [TARGET_NARROWING_AXIS]: ['people'] },
      profileSignals: { supportClose: 1 },
    },
  ],
  defaultDefinitionId: JOB_TARGET_CRITERIA_FIRST.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_JOB_TARGET_JOURNEYS: readonly JourneyDefinition[] = [
  JOB_TARGET_CRITERIA_FIRST,
  JOB_TARGET_POSTINGS_FIRST,
  JOB_TARGET_CONVERSATION_FIRST,
];
