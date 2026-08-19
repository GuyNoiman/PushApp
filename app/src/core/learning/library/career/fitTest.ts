/**
 * career.fitTest — "check whether a direction that interests me really fits, before I commit"
 * (partner family CAR_G03).
 *
 * THREE JOURNEYS, three arcs. One does the work itself in miniature and separates "I am not skilled
 * at this yet" from "this is not the kind of work I want". One learns from two people who live it
 * and then adds the one piece you have to feel for yourself. One does a small real task for a real
 * person, because doing it for somebody who needs the answer is a different experience from doing it
 * as an exercise.
 *
 * THE AXIS is **what you test it with** — the work, the people, or a real context. It is not asked
 * from the profile: nothing in onboarding says which medium tells a person the truth about fit, and
 * a mapping we cannot defend is worse than a question we can ask once.
 *
 * TRANSLATED, NOT COPIED: the source Steps name the persona's own target role ("Data Analyst"). A
 * library Journey must never hand a real user somebody else's direction, so the Steps below say "the
 * direction you are testing" — which is what the arc meant — and the direction is theirs.
 *
 * The authored Journey titles, kept as a record:
 *   • workSample   — "Test the direction through a small work sample"
 *   • conversation — "Test the direction by talking to people who live the work"
 *   • realContext  — "Test the direction through a small task with a real need behind it"
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.fitTest';

/** The axis these three differ along: what you test the direction WITH. */
export const TEST_MEDIUM_AXIS = 'testMedium';

const WORK_SAMPLE_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have lived a small stretch of work like the direction that interests me', titleKey: `${K}.workSample.m0`, weight: 2 },
    { id: 'm1', title: 'I know what drew me in and what did not', titleKey: `${K}.workSample.m1`, weight: 1 },
    { id: 'm2', title: 'I have compared my experience with what real roles actually involve', titleKey: `${K}.workSample.m2`, weight: 1 },
    { id: 'm3', title: 'I have decided whether to go deeper, and taken the next step', titleKey: `${K}.workSample.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 5, difficulty: 1,
      title: 'Choose one small question from work or from life that this kind of work could answer',
      titleKey: `${K}.workSample.s0.title`,
      description: 'Choose a question that genuinely interests you. It does not need to be an impressive project.',
      descriptionKey: `${K}.workSample.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Find the smallest material you need to answer it',
      titleKey: `${K}.workSample.s1.title`,
      description: 'Use what you are already allowed to work with, or what is public. Do not let the search become a project of its own.',
      descriptionKey: `${K}.workSample.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 45, difficulty: 4, dependsOnStepId: 's1',
      title: 'Do the small piece of work that tries to answer the question',
      titleKey: `${K}.workSample.s2.title`,
      description: 'The aim is to live the sequence — understand a question, work through it, reach a conclusion, say it clearly — not to meet a professional standard.',
      descriptionKey: `${K}.workSample.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Write three lines: what you enjoyed, what drained you, and what you would be willing to learn',
      titleKey: `${K}.workSample.s3.title`,
      description: 'Separate "I do not know how yet" from "I do not like this kind of work".',
      descriptionKey: `${K}.workSample.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Read two current role descriptions in the direction you are testing',
      titleKey: `${K}.workSample.s4.title`,
      description: 'Look for whether the kind of work you just did appears in real roles, and what is still missing from the picture.',
      descriptionKey: `${K}.workSample.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Decide whether to go deeper, to stop, or to run one more check',
      titleKey: `${K}.workSample.s5.title`,
      description: 'Choose by fit, not by how well the first attempt went.',
      descriptionKey: `${K}.workSample.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's5',
      title: 'Take a small step in line with that decision',
      titleKey: `${K}.workSample.s6.title`,
      description: 'Going deeper: pick one skill or piece of proof to build. Stopping: write down what you learned about what to look for next.',
      descriptionKey: `${K}.workSample.s6.description`,
    },
  ],
};

const CONVERSATION_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have heard what the work looks like from two real points of view', titleKey: `${K}.conversation.m0`, weight: 2 },
    { id: 'm1', title: 'I have verified what actually repeats in real roles, not just in one conversation', titleKey: `${K}.conversation.m1`, weight: 1 },
    { id: 'm2', title: 'I have felt for myself the one part that mattered most to test', titleKey: `${K}.conversation.m2`, weight: 1 },
    { id: 'm3', title: 'I have decided whether to go deeper in this direction', titleKey: `${K}.conversation.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 7, difficulty: 1,
      title: 'Write three questions that would show you what the work is like day to day',
      titleKey: `${K}.conversation.s0.title`,
      description: 'Ask about the kind of tasks, the draining parts, and what surprises people who move into it.',
      descriptionKey: `${K}.conversation.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3, dependsOnStepId: 's0',
      title: 'Talk to one person doing this work about a real working day',
      titleKey: `${K}.conversation.s1.title`,
      description: 'The aim is to understand the work, not to be told whether you should switch.',
      descriptionKey: `${K}.conversation.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3,
      title: 'Talk to one more person, in a different setting or at a different level of experience',
      titleKey: `${K}.conversation.s2.title`,
      description: 'The second conversation is what stops one person’s experience from becoming the truth about a whole profession.',
      descriptionKey: `${K}.conversation.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Write down three things that came up in both conversations, and one that differed',
      titleKey: `${K}.conversation.s3.title`,
      description: 'Look for patterns in the work itself, not only for career advice.',
      descriptionKey: `${K}.conversation.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 20, difficulty: 2,
      title: 'Check two current role descriptions against what you heard',
      titleKey: `${K}.conversation.s4.title`,
      description: 'Verify that the main tasks they described also show up in the roles that are actually out there.',
      descriptionKey: `${K}.conversation.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose the one part of the work you still need to feel for yourself',
      titleKey: `${K}.conversation.s5.title`,
      description: 'A conversation can teach a great deal, but it cannot fully replace doing it.',
      descriptionKey: `${K}.conversation.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm2', estimatedMinutes: 30, difficulty: 3, dependsOnStepId: 's5',
      title: 'Run a micro-test of the part you chose',
      titleKey: `${K}.conversation.s6.title`,
      description: 'A short piece of work that lets you feel the kind of work without committing to any training.',
      descriptionKey: `${K}.conversation.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Decide whether to go deeper, to stop, or to look at another direction',
      titleKey: `${K}.conversation.s7.title`,
      description: 'Sum up the decision from what the people, the market and your own micro-test told you.',
      descriptionKey: `${K}.conversation.s7.description`,
    },
  ],
};

const REAL_CONTEXT_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have worked on a small question with a real need behind it', titleKey: `${K}.realContext.m0`, weight: 2 },
    { id: 'm1', title: 'I got feedback, and I know how the real context felt', titleKey: `${K}.realContext.m1`, weight: 1 },
    { id: 'm2', title: 'I have checked how much of that experience represents the wider role', titleKey: `${K}.realContext.m2`, weight: 1 },
    { id: 'm3', title: 'I have decided whether to go deeper, and taken the next step', titleKey: `${K}.realContext.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1,
      title: 'Find one small real problem where this kind of work would help someone decide something',
      titleKey: `${K}.realContext.s0.title`,
      description: 'Best from a context already open to you: work, a personal project, a community. Do not invent a large project.',
      descriptionKey: `${K}.realContext.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Agree with that person, or that context, on the question you are answering',
      titleKey: `${K}.realContext.s1.title`,
      description: 'Keep the scope small: one question, not a whole system.',
      descriptionKey: `${K}.realContext.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 45, difficulty: 4, dependsOnStepId: 's1',
      title: 'Do the small piece of work and give back an answer they can use',
      titleKey: `${K}.realContext.s2.title`,
      description: 'The aim is to feel what it is like to work with real context and real responsibility to someone, not to build a perfect portfolio.',
      descriptionKey: `${K}.realContext.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Ask for one piece of feedback on what was useful and what was missing',
      titleKey: `${K}.realContext.s3.title`,
      description: 'This is feedback on the work, not a grade on whether the career suits you.',
      descriptionKey: `${K}.realContext.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Write down what changed when the work was for a real need rather than an exercise',
      titleKey: `${K}.realContext.s4.title`,
      description: 'Check whether you enjoyed clarifying the question, doing the work, explaining it, and the back-and-forth around the result.',
      descriptionKey: `${K}.realContext.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Read two current role descriptions to see how much of this represents the direction',
      titleKey: `${K}.realContext.s5.title`,
      description: 'Separate this particular experience from the wider role.',
      descriptionKey: `${K}.realContext.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Decide whether to go deeper, to stop, or to test one more part',
      titleKey: `${K}.realContext.s6.title`,
      description: 'Choose on fit, not on one successful attempt.',
      descriptionKey: `${K}.realContext.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's6',
      title: 'Take a small step in line with that decision',
      titleKey: `${K}.realContext.s7.title`,
      description: 'Going deeper: choose one focused skill or piece of proof. If not: write down what you learned about the kind of work you do want.',
      descriptionKey: `${K}.realContext.s7.description`,
    },
  ],
};

export const FIT_TEST_WORK_SAMPLE: JourneyDefinition = processJourney({
  id: `${K}.workSample`,
  version: 1,
  domain: 'career',
  essence: 'Do a small piece of the work itself, and tell a skill gap apart from a bad fit.',
  essenceKey: `${K}.workSample.essence`,
  arc: WORK_SAMPLE_ARC,
});

export const FIT_TEST_CONVERSATION: JourneyDefinition = processJourney({
  id: `${K}.conversation`,
  version: 1,
  domain: 'career',
  essence: 'Learn it from two people who live the work, then feel the one part you cannot take on trust.',
  essenceKey: `${K}.conversation.essence`,
  arc: CONVERSATION_ARC,
});

export const FIT_TEST_REAL_CONTEXT: JourneyDefinition = processJourney({
  id: `${K}.realContext`,
  version: 1,
  domain: 'career',
  essence: 'Do one small real task for someone who needs the answer, and test the context as well as the work.',
  essenceKey: `${K}.realContext.essence`,
  arc: REAL_CONTEXT_ARC,
});

/**
 * The family. Its default is the WORK-SAMPLE Journey: it is the only one of the three that needs
 * nobody's cooperation. The conversation route needs two people willing to talk, and the real-context
 * route needs a real need to attach to — both are usually available, but neither is guaranteed, and a
 * default must be the arc that cannot be blocked before it starts.
 */
export const CAREER_FIT_TEST: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'FIND_DIRECTION',
  bottleneck: 'DIRECTION_GAP',
  goal: 'Check whether a direction that interests me really fits, before committing to it',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: TEST_MEDIUM_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'work', labelKey: `${K}.axis.work` },
        { id: 'people', labelKey: `${K}.axis.people` },
        { id: 'realContext', labelKey: `${K}.axis.realContext` },
      ],
      // No `answeredByProfile` — see the file header.
    },
  ],
  members: [
    {
      id: FIT_TEST_WORK_SAMPLE.id,
      position: { [TEST_MEDIUM_AXIS]: ['work'] },
      profileSignals: { actionFirst: 1 },
    },
    {
      id: FIT_TEST_CONVERSATION.id,
      position: { [TEST_MEDIUM_AXIS]: ['people'] },
      profileSignals: { supportClose: 1 },
    },
    {
      id: FIT_TEST_REAL_CONTEXT.id,
      position: { [TEST_MEDIUM_AXIS]: ['realContext'] },
      // Q4 — someone who needs to SEE that it mattered is served by work that had a real need behind
      // it, because the feedback is the visible result.
      profileSignals: { seeProgress: 1 },
    },
  ],
  defaultDefinitionId: FIT_TEST_WORK_SAMPLE.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_FIT_TEST_JOURNEYS: readonly JourneyDefinition[] = [
  FIT_TEST_WORK_SAMPLE,
  FIT_TEST_CONVERSATION,
  FIT_TEST_REAL_CONTEXT,
];
