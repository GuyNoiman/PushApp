/**
 * career.interviewStage — "get further in interviews" (partner family CAR_G12).
 *
 * THE BOTTLENECK THAT ONLY EXISTS ONCE THE OTHERS ARE SOLVED. Someone here is not being ignored —
 * they are being INVITED, and then it stops. Everything the other job-search families fix is already
 * working: the target is clear, the proof reads, the access is there. What is left is the room
 * itself. That makes this the one job-search family where "apply more" is exactly the wrong advice.
 *
 * THREE JOURNEYS, three genuinely different beliefs about how a person improves at this: one starts
 * from an interview that already happened and mines it, one starts from practice with no data at
 * all, one starts from the evidence and builds a bank of it before ever rehearsing.
 *
 * THE AXIS is **what actually teaches you** — analysing, practising, or preparing your material.
 * Deliberately not read from the profile: someone with no interviews behind them cannot analyse,
 * and someone who has had six and learned nothing from them does not need a seventh rehearsal.
 *
 * ONE THING THE CONTENT INSISTS ON, and it is worth keeping in the translation: the final Step of
 * every arc measures the CHANGE, not the outcome. "Did the pattern move" is something a person
 * controls; "did they offer me the job" is not, and a Journey that ends on someone else's decision
 * is a Journey that can be failed by being unlucky.
 *
 * ONE TRANSLATION DECISION THAT IS NOT COSMETIC. The source gives this family and `./searchProcess`
 * the SAME primary bottleneck, `SEARCH_PROCESS_GAP` — but his own diagnosis tree separates them at
 * its last question ("the search keeps collapsing" vs "I reach interviews and it stops there"), and
 * they are opposite work. Our model identifies a family by the (subtype, bottleneck) PAIR, so two
 * families sharing a pair would make the route ambiguous and silently resolve to whichever was
 * declared first. This family therefore takes `INTERVIEW_STAGE_GAP`, which is what his tree means at
 * that branch. Raised with him rather than assumed to be correct.
 *
 * Translated, not copied — see `./searchProcess`'s header for what changed on the way in and why.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.interviewStage';

/** The axis these three differ along: what actually teaches you to interview better. */
export const INTERVIEW_LEARNING_AXIS = 'interviewLearning';

const ANALYSIS_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have reconstructed a real interview', titleKey: `${K}.analysis.m0`, weight: 1 },
    { id: 'm1', title: 'I have found one pattern worth changing', titleKey: `${K}.analysis.m1`, weight: 2 },
    { id: 'm2', title: 'I have practised that one change', titleKey: `${K}.analysis.m2`, weight: 1 },
    { id: 'm3', title: 'I have tested it in a real interview', titleKey: `${K}.analysis.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1,
      title: 'Reconstruct your last interview in three moments',
      titleKey: `${K}.analysis.s0.title`,
      description: 'A moment that went well, a weak one, and a question that caught you out.',
      descriptionKey: `${K}.analysis.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 12, difficulty: 2, dependsOnStepId: 's0',
      title: 'Separate what you know from what you are guessing',
      titleKey: `${K}.analysis.s1.title`,
      description: 'Do not try to read the interviewer’s mind.',
      descriptionKey: `${K}.analysis.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2,
      title: 'If you were given real feedback, compare it with what you wrote',
      titleKey: `${K}.analysis.s2.title`,
      description: 'If you were not, do not invent any.',
      descriptionKey: `${K}.analysis.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 2,
      title: 'Choose one pattern to work on',
      titleKey: `${K}.analysis.s3.title`,
      description: 'The length of your answers, for example, or evidence that lands weakly.',
      descriptionKey: `${K}.analysis.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Prepare one small change',
      titleKey: `${K}.analysis.s4.title`,
      description: 'A way of structuring an answer, or one story ready to go.',
      descriptionKey: `${K}.analysis.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Practise it on one or two questions',
      titleKey: `${K}.analysis.s5.title`,
      description: 'A long mock interview is not needed.',
      descriptionKey: `${K}.analysis.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 3,
      title: 'Test the change in your next interview',
      titleKey: `${K}.analysis.s6.title`,
      description: 'Measure the pattern, not whether you got an offer.',
      descriptionKey: `${K}.analysis.s6.description`,
    },
  ],
};

const PRACTICE_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have a starting point for two answers', titleKey: `${K}.practice.m0`, weight: 1 },
    { id: 'm1', title: 'I have made them clearer and better evidenced', titleKey: `${K}.practice.m1`, weight: 2 },
    { id: 'm2', title: 'I have practised and heard how it lands', titleKey: `${K}.practice.m2`, weight: 1 },
    { id: 'm3', title: 'I have used the change in an interview', titleKey: `${K}.practice.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Pick two interview questions that keep coming up',
      titleKey: `${K}.practice.s0.title`,
      description: 'Real ones you have already been asked.',
      descriptionKey: `${K}.practice.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Answer them once with no preparation',
      titleKey: `${K}.practice.s1.title`,
      description: 'This is your starting point.',
      descriptionKey: `${K}.practice.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Check one answer for clarity, focus and evidence',
      titleKey: `${K}.practice.s2.title`,
      description: 'Do not try to fix everything.',
      descriptionKey: `${K}.practice.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 20, difficulty: 2,
      title: 'Build a shorter version of it',
      titleKey: `${K}.practice.s3.title`,
      description: 'Keep the story true.',
      descriptionKey: `${K}.practice.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Practise it again',
      titleKey: `${K}.practice.s4.title`,
      description: 'See whether you reach the point sooner.',
      descriptionKey: `${K}.practice.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 3,
      title: 'Ask one person for focused feedback',
      titleKey: `${K}.practice.s5.title`,
      description: 'What did they understand about you from the answer?',
      descriptionKey: `${K}.practice.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 3,
      title: 'Use the structure in your next interview',
      titleKey: `${K}.practice.s6.title`,
      description: 'Write down how it went straight afterwards.',
      descriptionKey: `${K}.practice.s6.description`,
    },
  ],
};

const STORY_BANK_ARC: AuthoredArc = {
  suggestedDurationDays: 21,
  milestones: [
    { id: 'm0', title: 'I have mapped stories to what the role needs', titleKey: `${K}.storyBank.m0`, weight: 1 },
    { id: 'm1', title: 'I have cut them down to clear evidence', titleKey: `${K}.storyBank.m1`, weight: 2 },
    { id: 'm2', title: 'I can reach for them under pressure', titleKey: `${K}.storyBank.m2`, weight: 1 },
    { id: 'm3', title: 'I have used one in a real interview', titleKey: `${K}.storyBank.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Pick three capabilities that keep appearing in your target roles',
      titleKey: `${K}.storyBank.s0.title`,
      description: 'Working across teams, or deciding what comes first, for example.',
      descriptionKey: `${K}.storyBank.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 3, dependsOnStepId: 's0',
      title: 'Find a real story for each one',
      titleKey: `${K}.storyBank.s1.title`,
      description: 'Something you did, and what changed because of it.',
      descriptionKey: `${K}.storyBank.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 25, difficulty: 3,
      title: 'Cut each story down to four sentences',
      titleKey: `${K}.storyBank.s2.title`,
      description: 'The situation, what you did, what it cost to choose it, and the result.',
      descriptionKey: `${K}.storyBank.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose the one weak story',
      titleKey: `${K}.storyBank.s3.title`,
      description: 'Do not rewrite them all.',
      descriptionKey: `${K}.storyBank.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Strengthen it with evidence you already have',
      titleKey: `${K}.storyBank.s4.title`,
      description: 'Without inventing numbers.',
      descriptionKey: `${K}.storyBank.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Practise reaching for them from different questions',
      titleKey: `${K}.storyBank.s5.title`,
      description: 'Not memorising. Matching.',
      descriptionKey: `${K}.storyBank.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 3,
      title: 'Use one of them in your next interview',
      titleKey: `${K}.storyBank.s6.title`,
      description: 'See whether it came to you more easily.',
      descriptionKey: `${K}.storyBank.s6.description`,
    },
  ],
};

export const INTERVIEW_ANALYSIS = processJourney({
  id: `${K}.analysis`,
  version: 1,
  domain: 'career',
  essence: 'Mine the interviews you have already had, and change one pattern.',
  essenceKey: `${K}.analysis.essence`,
  arc: ANALYSIS_ARC,
});

export const INTERVIEW_PRACTICE = processJourney({
  id: `${K}.practice`,
  version: 1,
  domain: 'career',
  essence: 'Improve by short, focused practice rather than by analysis.',
  essenceKey: `${K}.practice.essence`,
  arc: PRACTICE_ARC,
});

export const INTERVIEW_STORY_BANK = processJourney({
  id: `${K}.storyBank`,
  version: 1,
  domain: 'career',
  essence: 'Organise the experience you already have into evidence you can reach for.',
  essenceKey: `${K}.storyBank.essence`,
  arc: STORY_BANK_ARC,
});

/**
 * The family. Its default is ANALYSIS: anyone who has landed in this family got here by reaching
 * interviews, so they have real data, and real data beats rehearsal against imagined questions.
 */
export const CAREER_INTERVIEW_STAGE: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'LAND_ROLE',
  bottleneck: 'INTERVIEW_STAGE_GAP',
  goal: 'Get further in interviews',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: INTERVIEW_LEARNING_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'analysis', labelKey: `${K}.axis.analysis` },
        { id: 'practice', labelKey: `${K}.axis.practice` },
        { id: 'stories', labelKey: `${K}.axis.stories` },
      ],
    },
  ],
  members: [
    {
      id: INTERVIEW_ANALYSIS.id,
      position: { [INTERVIEW_LEARNING_AXIS]: ['analysis'] },
      profileSignals: { clarityFirst: 1 },
    },
    {
      id: INTERVIEW_PRACTICE.id,
      position: { [INTERVIEW_LEARNING_AXIS]: ['practice'] },
      profileSignals: { actionFirst: 1 },
    },
    {
      id: INTERVIEW_STORY_BANK.id,
      position: { [INTERVIEW_LEARNING_AXIS]: ['stories'] },
      profileSignals: { detailedStructure: 1, clearPlan: 1 },
    },
  ],
  defaultDefinitionId: INTERVIEW_ANALYSIS.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_INTERVIEW_STAGE_JOURNEYS: readonly JourneyDefinition[] = [
  INTERVIEW_ANALYSIS,
  INTERVIEW_PRACTICE,
  INTERVIEW_STORY_BANK,
];
