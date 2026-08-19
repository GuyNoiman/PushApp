/**
 * career.access — "reach more relevant opportunities and people in a job search"
 * (partner family CAR_G10).
 *
 * The third job-search bottleneck (see `./jobTarget`'s header): the target is clear and the proof is
 * there, and the applications still go into a void — because the route in is missing.
 *
 * THREE JOURNEYS, three arcs: one works the ties that already exist, one replaces one-off networking
 * with turning up repeatedly somewhere relationships form on their own, one sends small, precise
 * approaches to specific people who hold information worth having.
 *
 * WHAT THESE ARCS REFUSE TO DO, and it is why the wording is what it is: none of them asks anyone
 * for a job. Every approach asks for a perspective, an introduction or an understanding, and every
 * one of them is small enough to send today. Networking advice usually fails not because people
 * disagree with it but because the ask it implies is too big to make, and a plan that produces
 * paralysis is not a plan.
 *
 * THE AXIS is **which route in fits you** — people who already know you, a place you come back to,
 * or a precise approach to a stranger with a reason.
 *
 * The authored Journey titles, kept as a record:
 *   • warmNetwork          — "Reach opportunities through people who already know you"
 *   • repeatedCommunity    — "Build access through a professional community you keep coming back to"
 *   • targetedConversations — "Open access through focused information conversations"
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.access';

/** The axis these three differ along: which route in. */
export const ACCESS_CHANNEL_AXIS = 'accessChannel';

const WARM_NETWORK_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have found the existing ties that could open information or a way in', titleKey: `${K}.warmNetwork.m0`, weight: 1 },
    { id: 'm1', title: 'I have made two natural, focused approaches', titleKey: `${K}.warmNetwork.m1`, weight: 1 },
    { id: 'm2', title: 'I have turned a reply into information, a conversation or an introduction', titleKey: `${K}.warmNetwork.m2`, weight: 2 },
    { id: 'm3', title: 'I have a way of using this route again', titleKey: `${K}.warmNetwork.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'List five people who already know you and might be one connection away from the field',
      titleKey: `${K}.warmNetwork.s0.title`,
      description: 'They do not need to be important people.',
      descriptionKey: `${K}.warmNetwork.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1, dependsOnStepId: 's0',
      title: 'Choose the two you have a natural reason to contact',
      titleKey: `${K}.warmNetwork.s1.title`,
      description: 'Ask for a perspective or an introduction, not for a job.',
      descriptionKey: `${K}.warmNetwork.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 2,
      title: 'Send one approach that says clearly why you are writing',
      titleKey: `${K}.warmNetwork.s2.title`,
      description: 'Write what you are asking about and what would actually help.',
      descriptionKey: `${K}.warmNetwork.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 2,
      title: 'Send the second one',
      titleKey: `${K}.warmNetwork.s3.title`,
      description: 'Improve the wording first if the first one taught you something.',
      descriptionKey: `${K}.warmNetwork.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Follow through on whatever conversation or introduction came out of it',
      titleKey: `${K}.warmNetwork.s4.title`,
      description: 'Write down what you learned and what the next step is.',
      descriptionKey: `${K}.warmNetwork.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose one way to use this route once a week',
      titleKey: `${K}.warmNetwork.s5.title`,
      description: 'A small, realistic minimum.',
      descriptionKey: `${K}.warmNetwork.s5.description`,
    },
  ],
};

const REPEATED_COMMUNITY_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have found a relevant community and seen how it works', titleKey: `${K}.repeatedCommunity.m0`, weight: 1 },
    { id: 'm1', title: 'I have taken part in it more than once', titleKey: `${K}.repeatedCommunity.m1`, weight: 2 },
    { id: 'm2', title: 'One professional connection has formed naturally', titleKey: `${K}.repeatedCommunity.m2`, weight: 1 },
    { id: 'm3', title: 'I have decided whether this becomes a route I keep using', titleKey: `${K}.repeatedCommunity.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose one professional community where people from the field keep meeting',
      titleKey: `${K}.repeatedCommunity.s0.title`,
      description: 'Somewhere that comes round again is better than a one-off event.',
      descriptionKey: `${K}.repeatedCommunity.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 25, difficulty: 2, dependsOnStepId: 's0',
      title: 'Turn up once, just to understand what happens there',
      titleKey: `${K}.repeatedCommunity.s1.title`,
      description: 'Notice who takes part and how connections actually form.',
      descriptionKey: `${K}.repeatedCommunity.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 20, difficulty: 2,
      title: 'Next time, contribute one small thing',
      titleKey: `${K}.repeatedCommunity.s2.title`,
      description: 'A good question, an answer to someone, or one short conversation.',
      descriptionKey: `${K}.repeatedCommunity.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 30, difficulty: 3,
      title: 'Come back to the same community one more time',
      titleKey: `${K}.repeatedCommunity.s3.title`,
      description: 'The point is that people start recognising you.',
      descriptionKey: `${K}.repeatedCommunity.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Open one conversation with the person the contact came most naturally with',
      titleKey: `${K}.repeatedCommunity.s4.title`,
      description: 'Ask about the work, out of the context you already share.',
      descriptionKey: `${K}.repeatedCommunity.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Decide whether this community is worth keeping as a route',
      titleKey: `${K}.repeatedCommunity.s5.title`,
      description: 'If it is, set the minimum you will keep up.',
      descriptionKey: `${K}.repeatedCommunity.s5.description`,
    },
  ],
};

const TARGETED_CONVERSATIONS_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have found specific people I have a real reason to talk to', titleKey: `${K}.targetedConversations.m0`, weight: 1 },
    { id: 'm1', title: 'I have sent focused approaches rather than generic ones', titleKey: `${K}.targetedConversations.m1`, weight: 1 },
    { id: 'm2', title: 'I have turned a reply into information, a conversation or a connection', titleKey: `${K}.targetedConversations.m2`, weight: 2 },
    { id: 'm3', title: 'I have set a small pace I can actually repeat', titleKey: `${K}.targetedConversations.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose three companies or teams you would like to understand better',
      titleKey: `${K}.targetedConversations.s0.title`,
      description: 'Choose places that are relevant to your target.',
      descriptionKey: `${K}.targetedConversations.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'In each one, find a person who could tell you something useful',
      titleKey: `${K}.targetedConversations.s1.title`,
      description: 'It does not have to be a recruiter.',
      descriptionKey: `${K}.targetedConversations.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2,
      title: 'Write one specific question for each of them',
      titleKey: `${K}.targetedConversations.s2.title`,
      description: 'Why this person in particular, and what you want to understand.',
      descriptionKey: `${K}.targetedConversations.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 15, difficulty: 2,
      title: 'Send two focused approaches',
      titleKey: `${K}.targetedConversations.s3.title`,
      description: 'Ask for a short perspective, not for a job.',
      descriptionKey: `${K}.targetedConversations.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 25, difficulty: 3,
      title: 'If someone replies, have a short conversation and take away one insight and one next step',
      titleKey: `${K}.targetedConversations.s4.title`,
      description: 'If nobody replies, learn from the wording and try the third person.',
      descriptionKey: `${K}.targetedConversations.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Send one follow-up that continues the contact naturally',
      titleKey: `${K}.targetedConversations.s5.title`,
      description: 'A thank you with a short update, or the question that came out of the conversation.',
      descriptionKey: `${K}.targetedConversations.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Decide whether this route is worth repeating weekly',
      titleKey: `${K}.targetedConversations.s6.title`,
      description: 'For example two good approaches a week.',
      descriptionKey: `${K}.targetedConversations.s6.description`,
    },
  ],
};

export const ACCESS_WARM_NETWORK: JourneyDefinition = processJourney({
  id: `${K}.warmNetwork`,
  version: 1,
  domain: 'career',
  essence: 'Use the ties you already have, naturally and with a clear reason.',
  essenceKey: `${K}.warmNetwork.essence`,
  arc: WARM_NETWORK_ARC,
});

export const ACCESS_REPEATED_COMMUNITY: JourneyDefinition = processJourney({
  id: `${K}.repeatedCommunity`,
  version: 1,
  domain: 'career',
  essence: 'Trade one-off networking for turning up again where connections form on their own.',
  essenceKey: `${K}.repeatedCommunity.essence`,
  arc: REPEATED_COMMUNITY_ARC,
});

export const ACCESS_TARGETED_CONVERSATIONS: JourneyDefinition = processJourney({
  id: `${K}.targetedConversations`,
  version: 1,
  domain: 'career',
  essence: 'Small, precise approaches to specific people who hold something worth knowing.',
  essenceKey: `${K}.targetedConversations.essence`,
  arc: TARGETED_CONVERSATIONS_ARC,
});

/**
 * The family. Its default is the WARM-NETWORK Journey — it starts with people who already know the
 * person, which is both the cheapest route emotionally and the one least likely to end in silence.
 */
export const CAREER_ACCESS: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'LAND_ROLE',
  bottleneck: 'OPPORTUNITY_ACCESS_GAP',
  goal: 'Reach more relevant opportunities and people in my job search',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: ACCESS_CHANNEL_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'warm', labelKey: `${K}.axis.warm` },
        { id: 'community', labelKey: `${K}.axis.community` },
        { id: 'targeted', labelKey: `${K}.axis.targeted` },
      ],
    },
  ],
  members: [
    {
      id: ACCESS_WARM_NETWORK.id,
      position: { [ACCESS_CHANNEL_AXIS]: ['warm'] },
      profileSignals: { supportClose: 1 },
    },
    {
      id: ACCESS_REPEATED_COMMUNITY.id,
      position: { [ACCESS_CHANNEL_AXIS]: ['community'] },
      // Q5 — someone whose difficulty is having nobody around them is served by the route that
      // BUILDS that, rather than by one that assumes it already exists.
      profileSignals: { lackSupport: 1 },
    },
    {
      id: ACCESS_TARGETED_CONVERSATIONS.id,
      position: { [ACCESS_CHANNEL_AXIS]: ['targeted'] },
      profileSignals: { clearPlan: 1 },
    },
  ],
  defaultDefinitionId: ACCESS_WARM_NETWORK.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_ACCESS_JOURNEYS: readonly JourneyDefinition[] = [
  ACCESS_WARM_NETWORK,
  ACCESS_REPEATED_COMMUNITY,
  ACCESS_TARGETED_CONVERSATIONS,
];
