/**
 * career.searchProcess — "build a job search I can actually keep up" (partner family CAR_G11).
 *
 * THE FOURTH JOB-SEARCH BOTTLENECK, and the one that only shows up over time. `./jobTarget`,
 * `./proof` and `./access` are about a search that is aimed wrongly; this one is about a search that
 * is aimed correctly and keeps stopping. The target is clear, the proof is credible, the access is
 * reasonable — and the search itself collapses every few weeks and starts again from cold. That is
 * not a motivation problem and it must not be treated as one: it is a PROCESS that asks more than
 * the person's week can give.
 *
 * The diagnosis reaches it through `../../experts/careerDiagnosis`, whose fourth question is exactly
 * "with all of that in place, where does it break".
 *
 * THREE JOURNEYS, three arcs, and they are genuinely different work: one BUILDS a pipeline and then
 * finds its bottleneck, one drops the pipeline entirely for two small weekly moments, and one starts
 * from the smallest thing that keeps a search alive in a week with almost no time in it.
 *
 * THE AXIS is **what shape of search you could actually hold** — a staged process, a simple weekly
 * rhythm, or a flexible minimum. Not answerable from the profile: capacity is an onboarding signal,
 * but "much structure helps me" and "structure is what I abandon first" are both people with little
 * time, and they need opposite plans.
 *
 * TRANSLATED, NOT COPIED, from `07_Assets/Partner_Packages/Career_v1.1_2026-08-20/
 * 02_Central_Journey_Library_60_Journeys_v1.1.json`. What changed on the way in:
 *  - the source is Hebrew and the library is authored in English (D55/D64), so every line here is a
 *    translation; the Hebrew goes into the `library` cache beside it rather than being the source;
 *  - three source titles carry visible scars of a terminology substitution in his tooling
 *    ("לבנות תהליך החיפוש חיפוש ברור" repeats a word; two Milestones in `./returnAfterRejection`
 *    lost their agreement). They are translated to what they plainly mean, and the scars are
 *    reported back to him rather than reproduced;
 *  - the source's `frequencyPolicy` is dropped entirely, not translated. A library Journey carries an
 *    arc and never a cadence (D65) — the coach sets the rate from the profile and from the time the
 *    person wants to give this Journey.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads.
 */
import type { AuthoredArc } from '../authoredArc';
import type { GoalFamily } from '../goalFamily';
import type { JourneyDefinition } from '../journeyDefinition';
import { processJourney } from '../processJourney';

const K = 'career.searchProcess';

/** The axis these three differ along: what shape of search you could actually hold. */
export const SEARCH_STRUCTURE_AXIS = 'searchStructure';

const STAGED_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have a simple, clear search process', titleKey: `${K}.staged.m0`, weight: 1 },
    { id: 'm1', title: 'I have run it once and found where it jams', titleKey: `${K}.staged.m1`, weight: 2 },
    { id: 'm2', title: 'I have simplified it and run it again', titleKey: `${K}.staged.m2`, weight: 1 },
    { id: 'm3', title: 'I have a minimum version for a busy week', titleKey: `${K}.staged.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Write down the four stages of your search',
      titleKey: `${K}.staged.s0.title`,
      description: 'Finding, checking the fit, applying or reaching out, and following up is enough.',
      descriptionKey: `${K}.staged.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 15, difficulty: 2, dependsOnStepId: 's0',
      title: 'Set one small weekly target for each stage',
      titleKey: `${K}.staged.s1.title`,
      description: 'A target for an ordinary week, not an ideal one.',
      descriptionKey: `${K}.staged.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 35, difficulty: 3,
      title: 'Run one full round through the stages',
      titleKey: `${K}.staged.s2.title`,
      description: 'The point is to test the process, not to get a lot done.',
      descriptionKey: `${K}.staged.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 2,
      title: 'Mark where you got stuck',
      titleKey: `${K}.staged.s3.title`,
      description: 'Find one bottleneck.',
      descriptionKey: `${K}.staged.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 15, difficulty: 2,
      title: 'Simplify one stage',
      titleKey: `${K}.staged.s4.title`,
      description: 'A template, a checklist, or one small filtering rule.',
      descriptionKey: `${K}.staged.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 35, difficulty: 3,
      title: 'Run the process again',
      titleKey: `${K}.staged.s5.title`,
      description: 'See whether it is easier to carry out.',
      descriptionKey: `${K}.staged.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Define a minimum version for a busy week',
      titleKey: `${K}.staged.s6.title`,
      description: 'What keeps the search alive without adding weight.',
      descriptionKey: `${K}.staged.s6.description`,
    },
  ],
};

const RHYTHM_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have picked two realistic search moments', titleKey: `${K}.rhythm.m0`, weight: 1 },
    { id: 'm1', title: 'I have run a full rhythm once', titleKey: `${K}.rhythm.m1`, weight: 2 },
    { id: 'm2', title: 'I have adjusted it to what actually worked', titleKey: `${K}.rhythm.m2`, weight: 1 },
    { id: 'm3', title: 'I have a rhythm I can keep going', titleKey: `${K}.rhythm.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 8, difficulty: 1,
      title: 'Choose two realistic moments for searching',
      titleKey: `${K}.rhythm.s0.title`,
      description: 'Pick windows that are actually likely to happen.',
      descriptionKey: `${K}.rhythm.s0.description`,
    },
    {
      id: 's1', milestoneId: 'm0', estimatedMinutes: 10, difficulty: 1, dependsOnStepId: 's0',
      title: 'Give each moment one action',
      titleKey: `${K}.rhythm.s1.title`,
      description: 'For example, filtering in one and applying or reaching out in the other.',
      descriptionKey: `${K}.rhythm.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 40, difficulty: 3,
      title: 'Do both moments this week',
      titleKey: `${K}.rhythm.s2.title`,
      description: 'Missing one is not starting over.',
      descriptionKey: `${K}.rhythm.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Note which one went better',
      titleKey: `${K}.rhythm.s3.title`,
      description: 'The time of day, the kind of task, or having prepared beforehand.',
      descriptionKey: `${K}.rhythm.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 10, difficulty: 1,
      title: 'Change one detail, and only one',
      titleKey: `${K}.rhythm.s4.title`,
      description: 'Do not rebuild the whole rhythm.',
      descriptionKey: `${K}.rhythm.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 40, difficulty: 3,
      title: 'Do the two moments again',
      titleKey: `${K}.rhythm.s5.title`,
      description: 'See whether the rhythm holds better this time.',
      descriptionKey: `${K}.rhythm.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Choose the rhythm for the next two weeks',
      titleKey: `${K}.rhythm.s6.title`,
      description: 'What stays fixed, and what is allowed to move.',
      descriptionKey: `${K}.rhythm.s6.description`,
    },
  ],
};

const MINIMUM_ARC: AuthoredArc = {
  suggestedDurationDays: 28,
  milestones: [
    { id: 'm0', title: 'I have found my minimum action', titleKey: `${K}.minimum.m0`, weight: 1 },
    { id: 'm1', title: 'I kept it going without taking on more', titleKey: `${K}.minimum.m1`, weight: 2 },
    { id: 'm2', title: 'I have matched the minimum to my real week', titleKey: `${K}.minimum.m2`, weight: 1 },
    { id: 'm3', title: 'I have a rule for coming back after a miss', titleKey: `${K}.minimum.m3`, weight: 1 },
  ],
  steps: [
    {
      id: 's0', milestoneId: 'm0', estimatedMinutes: 5, difficulty: 1,
      title: 'Choose a search action that takes ten minutes at most',
      titleKey: `${K}.minimum.s0.title`,
      description: 'Something that keeps the search alive.',
      descriptionKey: `${K}.minimum.s0.description`,
    },
    {
      // No dependency declared: s0 sits in the previous Milestone, and a predecessor across a
      // Milestone boundary is a different kind of claim than "do this after that".
      id: 's1', milestoneId: 'm1', estimatedMinutes: 10, difficulty: 1,
      title: 'Do it once',
      titleKey: `${K}.minimum.s1.title`,
      description: 'The minimum is a success in its own right.',
      descriptionKey: `${K}.minimum.s1.description`,
    },
    {
      id: 's2', milestoneId: 'm1', estimatedMinutes: 20, difficulty: 2,
      title: 'Add a second action only if there is room for it',
      titleKey: `${K}.minimum.s2.title`,
      description: 'Do not turn a good week into the standard.',
      descriptionKey: `${K}.minimum.s2.description`,
    },
    {
      id: 's3', milestoneId: 'm1', estimatedMinutes: 8, difficulty: 1,
      title: 'Write down what was actually possible',
      titleKey: `${K}.minimum.s3.title`,
      description: 'The time and the energy you really had.',
      descriptionKey: `${K}.minimum.s3.description`,
    },
    {
      id: 's4', milestoneId: 'm2', estimatedMinutes: 8, difficulty: 1,
      title: 'Adjust the minimum',
      titleKey: `${K}.minimum.s4.title`,
      description: 'If it is still too big, make it smaller.',
      descriptionKey: `${K}.minimum.s4.description`,
    },
    {
      id: 's5', milestoneId: 'm2', estimatedMinutes: 20, difficulty: 2,
      title: 'Hold to the same principle for another week',
      titleKey: `${K}.minimum.s5.title`,
      description: 'The minimum first, more only afterwards.',
      descriptionKey: `${K}.minimum.s5.description`,
    },
    {
      id: 's6', milestoneId: 'm3', estimatedMinutes: 10, difficulty: 1,
      title: 'Write your rule for coming back after a miss',
      titleKey: `${K}.minimum.s6.title`,
      description: 'You return to the minimum. You do not make up for everything.',
      descriptionKey: `${K}.minimum.s6.description`,
    },
  ],
};

export const SEARCH_PROCESS_STAGED = processJourney({
  id: `${K}.staged`,
  version: 1,
  domain: 'career',
  essence: 'Break the search into stages, find the one that jams, and simplify it.',
  essenceKey: `${K}.staged.essence`,
  arc: STAGED_ARC,
});

export const SEARCH_PROCESS_RHYTHM = processJourney({
  id: `${K}.rhythm`,
  version: 1,
  domain: 'career',
  essence: 'Build two small weekly search moments instead of a system.',
  essenceKey: `${K}.rhythm.essence`,
  arc: RHYTHM_ARC,
});

export const SEARCH_PROCESS_MINIMUM = processJourney({
  id: `${K}.minimum`,
  version: 1,
  domain: 'career',
  essence: 'Find the smallest action that keeps the search alive, and grow only when there is room.',
  essenceKey: `${K}.minimum.essence`,
  arc: MINIMUM_ARC,
});

/**
 * The family. Its default is the RHYTHM Journey rather than the staged one: someone whose search
 * keeps collapsing has already tried carrying more than they could, and handing them a pipeline is
 * handing them the thing that broke.
 */
export const CAREER_SEARCH_PROCESS: GoalFamily = {
  id: K,
  version: 1,
  domain: 'career',
  shape: 'process',
  subtype: 'LAND_ROLE',
  bottleneck: 'SEARCH_PROCESS_GAP',
  goal: 'Build a job search I can actually keep up',
  goalKey: `${K}.goal`,
  axes: [
    {
      id: SEARCH_STRUCTURE_AXIS,
      questionKey: `${K}.axis.question`,
      values: [
        { id: 'staged', labelKey: `${K}.axis.staged` },
        { id: 'rhythm', labelKey: `${K}.axis.rhythm` },
        { id: 'minimum', labelKey: `${K}.axis.minimum` },
      ],
    },
  ],
  members: [
    {
      id: SEARCH_PROCESS_STAGED.id,
      position: { [SEARCH_STRUCTURE_AXIS]: ['staged'] },
      profileSignals: { clearPlan: 1, detailedStructure: 1 },
    },
    {
      id: SEARCH_PROCESS_RHYTHM.id,
      position: { [SEARCH_STRUCTURE_AXIS]: ['rhythm'] },
      profileSignals: { smallSteps: 1 },
    },
    {
      id: SEARCH_PROCESS_MINIMUM.id,
      position: { [SEARCH_STRUCTURE_AXIS]: ['minimum'] },
      // Q5 `hardToRestart` and Q6 `changesWeekly`: the person a single miss derails, and the person
      // whose weeks vary most. Both need a plan whose floor is low enough that a bad week clears it.
      profileSignals: { hardToRestart: 1, changesWeekly: 1, fewMinutes: 1 },
    },
  ],
  defaultDefinitionId: SEARCH_PROCESS_RHYTHM.id,
};

/** Every Journey in this family, in the order they are offered. */
export const CAREER_SEARCH_PROCESS_JOURNEYS: readonly JourneyDefinition[] = [
  SEARCH_PROCESS_STAGED,
  SEARCH_PROCESS_RHYTHM,
  SEARCH_PROCESS_MINIMUM,
];
