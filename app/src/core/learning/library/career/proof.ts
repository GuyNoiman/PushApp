/**
 * career.proof — "present my experience so that more of my applications get an answer"
 * (partner family CAR_G09).
 *
 * The second job-search bottleneck (see `./jobTarget`'s header for the three): the target is clear
 * enough, and what is missing is VISIBLE evidence that this person can do it.
 *
 * THREE JOURNEYS, three arcs: one extracts proof from experience that already exists, one builds
 * one small artifact for the single capability that cannot be seen in that experience, and one
 * translates the experience into the language of value the target role is looking for.
 *
 * THE RED LINE these arcs hold, and the reason the wording matters: **nothing invented.** Every
 * Step says to use something real, and the one about numbers says outright not to make them up. A
 * plan that quietly nudges someone toward inflating their record would be the app doing harm in the
 * name of results, and it would be the user who pays for it in the interview.
 *
 * THE AXIS is **where the proof comes from** — experience you already have, something you build, or
 * how you tell it. Not answered from the profile.
 *
 * The authored Journey titles, kept as a record:
 *   • extractExisting — "Pull the proof the target role wants out of the experience you already have"
 *   • buildArtifact   — "Build one small piece of proof for what your experience cannot show"
 *   • roleStory       — "Translate your experience into proof stories in the target role's language"
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.proof';

/** The axis these three differ along: where the proof comes from. */
export const PROOF_SOURCE_AXIS = 'proofSource';

const EXTRACT_EXISTING_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have mapped real experience of mine onto what the target asks for', titleKey: `${K}.extractExisting.m0`, weight: 1 },
    { id: 'm1', title: 'I have written proof that is clear and believable', titleKey: `${K}.extractExisting.m1`, weight: 2 },
    { id: 'm2', title: 'That proof is now part of how I present myself', titleKey: `${K}.extractExisting.m2`, weight: 1 },
    { id: 'm3', title: 'I have tried the new version in a real search action', titleKey: `${K}.extractExisting.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose one target opening that represents well what you are looking for',
      titleKey: `${K}.extractExisting.s0.title`,
      description: 'It will serve as your reference point.',
      descriptionKey: `${K}.extractExisting.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Mark three central requirements you can already prove',
      titleKey: `${K}.extractExisting.s1.title`,
      description: 'Real experience only.',
      descriptionKey: `${K}.extractExisting.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 30, difficulty: 3,
      title: 'For each requirement, find one real example from your past',
      titleKey: `${K}.extractExisting.s2.title`,
      description: 'Write the situation, what you did, and what it changed.',
      descriptionKey: `${K}.extractExisting.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 25, difficulty: 3,
      title: 'Turn two of those examples into short lines of proof',
      titleKey: `${K}.extractExisting.s3.title`,
      description: 'Without inflating anything and without inventing anything.',
      descriptionKey: `${K}.extractExisting.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Put the proof into the document or profile that matters',
      titleKey: `${K}.extractExisting.s4.title`,
      description: 'Update only what actually affects this target.',
      descriptionKey: `${K}.extractExisting.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Use the new version in one real search action',
      titleKey: `${K}.extractExisting.s5.title`,
      description: 'An application, an approach, or sharing it with someone.',
      descriptionKey: `${K}.extractExisting.s5.description`,
    },
  ],
};

const BUILD_ARTIFACT_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have chosen the one gap in my proof worth closing', titleKey: `${K}.buildArtifact.m0`, weight: 1 },
    { id: 'm1', title: 'I have made something that shows the capability', titleKey: `${K}.buildArtifact.m1`, weight: 2 },
    { id: 'm2', title: 'I have checked that it is understood and relevant', titleKey: `${K}.buildArtifact.m2`, weight: 1 },
    { id: 'm3', title: 'I have used it in a real search action', titleKey: `${K}.buildArtifact.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose one requirement that keeps appearing in your target roles and is hard for you to prove today',
      titleKey: `${K}.buildArtifact.s0.title`,
      description: 'Choose a gap in the PROOF, not a skill you do not have.',
      descriptionKey: `${K}.buildArtifact.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Define one small thing you could make that would show that capability',
      titleKey: `${K}.buildArtifact.s1.title`,
      description: 'For example a map of a process, or a short piece of analysis.',
      descriptionKey: `${K}.buildArtifact.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 40, difficulty: 4,
      title: 'Build a first version of it',
      titleKey: `${K}.buildArtifact.s2.title`,
      description: 'Use only material you are allowed to show.',
      descriptionKey: `${K}.buildArtifact.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Check whether someone who knows this work understands what it proves',
      titleKey: `${K}.buildArtifact.s3.title`,
      description: 'Ask them about relevance, not about how it looks.',
      descriptionKey: `${K}.buildArtifact.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Improve it once, from what they told you',
      titleKey: `${K}.buildArtifact.s4.title`,
      description: 'The aim is proof that is good enough to use, not a finished product.',
      descriptionKey: `${K}.buildArtifact.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Fold it into how you present yourself',
      titleKey: `${K}.buildArtifact.s5.title`,
      description: 'Tie it explicitly to the requirement it proves.',
      descriptionKey: `${K}.buildArtifact.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's5',
      title: 'Use it in one real search action',
      titleKey: `${K}.buildArtifact.s6.title`,
      description: 'See whether explaining why you fit has become easier.',
      descriptionKey: `${K}.buildArtifact.s6.description`,
    },
  ],
};

const ROLE_STORY_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have connected my experience to the value the target is looking for', titleKey: `${K}.roleStory.m0`, weight: 1 },
    { id: 'm1', title: 'I have built proof stories that hold up', titleKey: `${K}.roleStory.m1`, weight: 2 },
    { id: 'm2', title: 'I have checked that they convey the right capability', titleKey: `${K}.roleStory.m2`, weight: 1 },
    { id: 'm3', title: 'I have used them in a real search action', titleKey: `${K}.roleStory.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose a target opening and mark three kinds of value it is looking for',
      titleKey: `${K}.roleStory.s0.title`,
      description: 'For example: owning something end to end, coordinating between people, or improving how work gets done.',
      descriptionKey: `${K}.roleStory.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 20, difficulty: 2, dependsOnStepId: 's0',
      title: 'Choose three past experiences that show that value',
      titleKey: `${K}.roleStory.s1.title`,
      description: 'They do not have to come from the same job title.',
      descriptionKey: `${K}.roleStory.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 30, difficulty: 3,
      title: 'Write each one as a short story: the problem, what you did, what changed',
      titleKey: `${K}.roleStory.s2.title`,
      description: 'If you do not have an exact number, do not invent one.',
      descriptionKey: `${K}.roleStory.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 25, difficulty: 3,
      title: 'Turn one story into a written version and a spoken one',
      titleKey: `${K}.roleStory.s3.title`,
      description: 'The same evidence, in two forms: one for the page, one for a conversation.',
      descriptionKey: `${K}.roleStory.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Check with one person what they think the story proves',
      titleKey: `${K}.roleStory.s4.title`,
      description: 'Ask them to describe the capability they heard, in their own words.',
      descriptionKey: `${K}.roleStory.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Update the other two stories in the same way',
      titleKey: `${K}.roleStory.s5.title`,
      description: 'Keep them short.',
      descriptionKey: `${K}.roleStory.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 15, difficulty: 2,
      title: 'Use one of the stories in a real search action',
      titleKey: `${K}.roleStory.s6.title`,
      description: 'An application, an approach, or preparing for an interview.',
      descriptionKey: `${K}.roleStory.s6.description`,
    },
  ],
};

export const PROOF_EXTRACT_EXISTING: JourneyDefinition = processJourney({
  id: `${K}.extractExisting`,
  version: 1,
  domain: 'career',
  essence: 'Turn experience you already have into clear proof, without inventing anything.',
  essenceKey: `${K}.extractExisting.essence`,
  arc: EXTRACT_EXISTING_ARC,
});

export const PROOF_BUILD_ARTIFACT: JourneyDefinition = processJourney({
  id: `${K}.buildArtifact`,
  version: 1,
  domain: 'career',
  essence: 'Make one small thing that shows the capability your existing experience cannot show.',
  essenceKey: `${K}.buildArtifact.essence`,
  arc: BUILD_ARTIFACT_ARC,
});

export const PROOF_ROLE_STORY: JourneyDefinition = processJourney({
  id: `${K}.roleStory`,
  version: 1,
  domain: 'career',
  essence: 'Tell what you have already done in the language of value the target role is looking for.',
  essenceKey: `${K}.roleStory.essence`,
  arc: ROLE_STORY_ARC,
});

/**
 * The family. Its default is EXTRACT-EXISTING: it is the cheapest of the three in time and the only
 * one that asks the person to create nothing new, which matters because someone in a job search is
 * usually doing it around a job they still have.
 */
export const CAREER_PROOF: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'LAND_ROLE',
  bottleneck: 'PROOF_GAP',
  goal: 'Present my experience so that more of my applications get an answer',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: PROOF_SOURCE_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'existing', labelKey: `${K}.axis.existing` },
        { id: 'build', labelKey: `${K}.axis.build` },
        { id: 'story', labelKey: `${K}.axis.story` },
      ],
    },
  ],
  members: [
    {
      id: PROOF_EXTRACT_EXISTING.id,
      position: { [PROOF_SOURCE_AXIS]: ['existing'] },
      // Q5/Q6 — someone whose life is full, or who only has a few minutes at a time, is the person
      // this arc was written for: it creates nothing new.
      profileSignals: { lifeBusy: 1, fewMinutes: 1 },
    },
    {
      id: PROOF_BUILD_ARTIFACT.id,
      position: { [PROOF_SOURCE_AXIS]: ['build'] },
      profileSignals: { actionFirst: 1 },
    },
    {
      id: PROOF_ROLE_STORY.id,
      position: { [PROOF_SOURCE_AXIS]: ['story'] },
      // No profile signal: nothing onboarding asks argues for retelling experience over extracting
      // it, and a made-up signal here would be a match we could not explain.
    },
  ],
  defaultDefinitionId: PROOF_EXTRACT_EXISTING.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_PROOF_JOURNEYS: readonly JourneyDefinition[] = [
  PROOF_EXTRACT_EXISTING,
  PROOF_BUILD_ARTIFACT,
  PROOF_ROLE_STORY,
];
