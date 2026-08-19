/**
 * career.twoOptions — "decide between two concrete career options" (partner family CAR_G02).
 *
 * THREE JOURNEYS, and again the Milestones are what separate them: one compares both options on the
 * same measuring stick and only then closes the gap that could still change the answer; one lives a
 * small piece of each option before comparing anything; one learns from people who are inside both
 * and then verifies what it heard. Same goal, three arcs, so three Journeys (see `../goalFamily`).
 *
 * THE AXIS is **which evidence decides it for you** — explicit criteria, your own experience, or
 * other people's. Deliberately NOT answered from the onboarding profile: Q7 asks whether someone
 * needs clarity before acting, and that genuinely does not say whether they would rather talk to two
 * people than run two experiments. Mapping it would be a fabricated match, so the question is asked
 * once the Journey's goal is known — which is exactly the moment it can change the answer.
 *
 * TRANSLATED, NOT COPIED — and here that mattered more than anywhere else. The source Journeys name
 * the persona's own two options ("Product Operations" / "Customer Success Operations") inside the
 * Step titles. That is authoring scaffolding: a library Journey must never hand a real user somebody
 * else's decision. The Steps below say "the first option" and "the second option", which is what the
 * arc actually meant, and the user's own two options are the ones they are holding.
 *
 * The authored Journey titles, kept as a record (a built Journey takes the user's own goal as its
 * title):
 *   • criteriaFirst     — "Decide between the two through criteria and evidence"
 *   • testFirst         — "Decide between the two through two small experiences"
 *   • conversationFirst — "Decide between the two through reality conversations and evidence"
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.twoOptions';

/** The axis these three differ along: which kind of evidence actually decides it. */
export const DECISION_EVIDENCE_AXIS = 'decisionEvidence';

const CRITERIA_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I know what I am really choosing by', titleKey: `${K}.criteriaFirst.m0`, weight: 1 },
    { id: 'm1', title: 'I have compared both options on the same measuring stick', titleKey: `${K}.criteriaFirst.m1`, weight: 2 },
    { id: 'm2', title: 'I have closed the main information gap that was blocking the decision', titleKey: `${K}.criteriaFirst.m2`, weight: 2 },
    { id: 'm3', title: 'I have chosen an option and started the next move', titleKey: `${K}.criteriaFirst.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Write three things the choice has to give you and two it has to respect',
      titleKey: `${K}.criteriaFirst.s0.title`,
      description: 'Use what you have already said matters to you. Do not build a list of ten criteria.',
      descriptionKey: `${K}.criteriaFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Define what would count as a strong sign for each of those criteria',
      titleKey: `${K}.criteriaFirst.s1.title`,
      description: 'For example: if working across teams matters, what would you expect to see in the role itself?',
      descriptionKey: `${K}.criteriaFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 25, difficulty: 3,
      title: 'Check the first option against those criteria',
      titleKey: `${K}.criteriaFirst.s2.title`,
      description: 'Use current information about real roles, and write down: evidence for, evidence against, and what is still unknown.',
      descriptionKey: `${K}.criteriaFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 25, difficulty: 3,
      title: 'Check the second option against exactly the same criteria',
      titleKey: `${K}.criteriaFirst.s3.title`,
      description: 'Use the same criteria, so the comparison is a fair one.',
      descriptionKey: `${K}.criteriaFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Pick the two unknowns that could genuinely change the decision',
      titleKey: `${K}.criteriaFirst.s4.title`,
      description: 'Do not research everything that interests you. Only what would change your choice if the answer came back different.',
      descriptionKey: `${K}.criteriaFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 30, difficulty: 3, dependsOnStepId: 's4',
      title: 'Close one of them through a conversation or a reliable source',
      titleKey: `${K}.criteriaFirst.s5.title`,
      description: 'Choose the shortest route to real evidence on the most important question.',
      descriptionKey: `${K}.criteriaFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose the option that wins on your evidence and your constraints',
      titleKey: `${K}.criteriaFirst.s6.title`,
      description: 'If neither wins, name one last unknown and stop there. The aim is a good enough decision, not certainty.',
      descriptionKey: `${K}.criteriaFirst.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's6',
      title: 'Take a first step in the direction you chose',
      titleKey: `${K}.criteriaFirst.s7.title`,
      description: 'A follow-up conversation, a small piece of proof, or checking one skill gap. Keep it cheap and reversible.',
      descriptionKey: `${K}.criteriaFirst.s7.description`,
    },
  ],
};

const TEST_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have lived a small piece of each of the two options', titleKey: `${K}.testFirst.m0`, weight: 2 },
    { id: 'm1', title: 'I know which one felt more like me, and which less', titleKey: `${K}.testFirst.m1`, weight: 1 },
    { id: 'm2', title: 'I have checked that the leading option also fits my constraints', titleKey: `${K}.testFirst.m2`, weight: 2 },
    { id: 'm3', title: 'I have chosen an option and started the next move', titleKey: `${K}.testFirst.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose a small task that simulates part of the first option',
      titleKey: `${K}.testFirst.s0.title`,
      description: 'Something you can do with material already available to you: no course, and no asking to change roles.',
      descriptionKey: `${K}.testFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 30, difficulty: 3, dependsOnStepId: 's0',
      title: 'Run that micro-experiment for the first option',
      titleKey: `${K}.testFirst.s1.title`,
      description: 'The point is to feel the kind of work — analysing, coordinating, improving something — not to prove you are already good at it.',
      descriptionKey: `${K}.testFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose a small task that simulates part of the second option',
      titleKey: `${K}.testFirst.s2.title`,
      description: 'Keep it about the same size in time and effort, so the comparison is not tilted.',
      descriptionKey: `${K}.testFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm0', estimatedMinutes: 30, difficulty: 3, dependsOnStepId: 's2',
      title: 'Run that micro-experiment for the second option',
      titleKey: `${K}.testFirst.s3.title`,
      description: 'Test the kind of work itself, not only whether the result came out well.',
      descriptionKey: `${K}.testFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Write what each experiment gave you, what took too much out of you, and what you would do again',
      titleKey: `${K}.testFirst.s4.title`,
      description: 'Use the experience as evidence, not as a single gut feeling.',
      descriptionKey: `${K}.testFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Check two critical constraints against both options',
      titleKey: `${K}.testFirst.s5.title`,
      description: 'For example pay or stability, or something the role must include. Use current information where you need it.',
      descriptionKey: `${K}.testFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Choose the option with the better combination of fit and constraints right now',
      titleKey: `${K}.testFirst.s6.title`,
      description: 'If doubt is left, write one single question that could turn the decision around.',
      descriptionKey: `${K}.testFirst.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's6',
      title: 'Take a first step in the direction you chose',
      titleKey: `${K}.testFirst.s7.title`,
      description: 'Start something small and reversible that goes deeper: a piece of proof, a conversation, or mapping a gap.',
      descriptionKey: `${K}.testFirst.s7.description`,
    },
  ],
};

const CONVERSATION_FIRST_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have heard what both options actually look like', titleKey: `${K}.conversationFirst.m0`, weight: 2 },
    { id: 'm1', title: 'I have verified the differences that matter to me against other evidence', titleKey: `${K}.conversationFirst.m1`, weight: 1 },
    { id: 'm2', title: 'I have chosen an option and tested it before committing', titleKey: `${K}.conversationFirst.m2`, weight: 2 },
    { id: 'm3', title: 'I have started the next move in the direction I chose', titleKey: `${K}.conversationFirst.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 7, difficulty: 1,
      title: 'Write two questions you would ask someone who lives one of these options day to day',
      titleKey: `${K}.conversationFirst.s0.title`,
      description: 'Questions about the actual work: what eats the time, what is hard, and what people outside it do not understand.',
      descriptionKey: `${K}.conversationFirst.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3, dependsOnStepId: 's0',
      title: 'Have one reality conversation with someone who knows the first option',
      titleKey: `${K}.conversationFirst.s1.title`,
      description: 'The aim is to understand the work, not to ask for a job or to impress anyone.',
      descriptionKey: `${K}.conversationFirst.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3,
      title: 'Have one reality conversation with someone who knows the second option',
      titleKey: `${K}.conversationFirst.s2.title`,
      description: 'Use the same two base questions, so you can actually compare the answers.',
      descriptionKey: `${K}.conversationFirst.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Write down three meaningful differences you heard between the options',
      titleKey: `${K}.conversationFirst.s3.title`,
      description: 'Focus on what affects your own fit: the kind of problems, the collaboration, the pace, the stability, the learning.',
      descriptionKey: `${K}.conversationFirst.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 20, difficulty: 2,
      title: 'Check against current information whether the two most important things you heard show up in real roles',
      titleKey: `${K}.conversationFirst.s4.title`,
      description: 'A conversation is evidence, not the whole truth. Look for corroboration.',
      descriptionKey: `${K}.conversationFirst.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose the option that fits better right now, and say why',
      titleKey: `${K}.conversationFirst.s5.title`,
      description: 'Write the decision in one sentence, including the trade-off you are willing to accept.',
      descriptionKey: `${K}.conversationFirst.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm2', estimatedMinutes: 30, difficulty: 3, dependsOnStepId: 's5',
      title: 'Run one small reality check on the option you chose',
      titleKey: `${K}.conversationFirst.s6.title`,
      description: 'Before any big commitment, do one small thing that makes sure the decision does not rest on a conversation alone.',
      descriptionKey: `${K}.conversationFirst.s6.description`,
    },
    {
      id: 's7', milestoneId: 'm3', estimatedMinutes: 20, difficulty: 2,
      title: 'Start the next career move in the direction you chose',
      titleKey: `${K}.conversationFirst.s7.title`,
      description: 'Choose a reversible step: a piece of proof, a focused skill gap, or a follow-up conversation.',
      descriptionKey: `${K}.conversationFirst.s7.description`,
    },
  ],
};

export const TWO_OPTIONS_CRITERIA_FIRST: JourneyDefinition = processJourney({
  id: `${K}.criteriaFirst`,
  version: 1,
  domain: 'career',
  essence: 'Decide what matters first, measure both options by it, and close only the gaps that could change the answer.',
  essenceKey: `${K}.criteriaFirst.essence`,
  arc: CRITERIA_FIRST_ARC,
});

export const TWO_OPTIONS_TEST_FIRST: JourneyDefinition = processJourney({
  id: `${K}.testFirst`,
  version: 1,
  domain: 'career',
  essence: 'Live a short piece of each option before deciding, then check the winner against your constraints.',
  essenceKey: `${K}.testFirst.essence`,
  arc: TEST_FIRST_ARC,
});

export const TWO_OPTIONS_CONVERSATION_FIRST: JourneyDefinition = processJourney({
  id: `${K}.conversationFirst`,
  version: 1,
  domain: 'career',
  essence: 'Learn from people inside both options, verify what you heard, and test the choice before committing.',
  essenceKey: `${K}.conversationFirst.essence`,
  arc: CONVERSATION_FIRST_ARC,
});

/**
 * The family. Its default is the CRITERIA-FIRST Journey — the only one of the three that depends on
 * nothing outside the person: the experiment route needs a task they can actually simulate, and the
 * conversation route needs access to people in both worlds. For someone we know nothing about, the
 * arc that cannot be blocked is the safest one to hand over.
 */
export const CAREER_TWO_OPTIONS: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'FIND_DIRECTION',
  bottleneck: 'DIRECTION_GAP',
  goal: 'Decide between two concrete career options',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: DECISION_EVIDENCE_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'criteria', labelKey: `${K}.axis.criteria` },
        { id: 'experience', labelKey: `${K}.axis.experience` },
        { id: 'people', labelKey: `${K}.axis.people` },
      ],
      // No `answeredByProfile` ON PURPOSE — see the file header. Nothing onboarding asks says which
      // evidence a person trusts to settle a decision, and inventing a mapping would produce a match
      // we could not defend.
    },
  ],
  members: [
    {
      id: TWO_OPTIONS_CRITERIA_FIRST.id,
      position: { [DECISION_EVIDENCE_AXIS]: ['criteria'] },
      // Q4/Q8 — someone helped by a clear plan or a detailed structure is describing this arc.
      profileSignals: { clearPlan: 1, detailedStructure: 1 },
    },
    {
      id: TWO_OPTIONS_TEST_FIRST.id,
      position: { [DECISION_EVIDENCE_AXIS]: ['experience'] },
      profileSignals: { actionFirst: 1 },
    },
    {
      id: TWO_OPTIONS_CONVERSATION_FIRST.id,
      position: { [DECISION_EVIDENCE_AXIS]: ['people'] },
      // Q4 — someone who says having people close by is what helps them.
      profileSignals: { supportClose: 1 },
    },
  ],
  defaultDefinitionId: TWO_OPTIONS_CRITERIA_FIRST.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_TWO_OPTIONS_JOURNEYS: readonly JourneyDefinition[] = [
  TWO_OPTIONS_CRITERIA_FIRST,
  TWO_OPTIONS_TEST_FIRST,
  TWO_OPTIONS_CONVERSATION_FIRST,
];
