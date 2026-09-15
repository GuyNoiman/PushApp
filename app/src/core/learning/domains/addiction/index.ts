/**
 * AddictionExpert — DomainExpert for breaking an addiction / גמילה. Broadened from the earlier
 * first-cut recovery expert to cover behavioural + substance patterns alike: drugs, drinking,
 * smoking, parties, casual flings (סטוצים), and similar. Supplies a supportive Milestone arc and
 * light Step templates for stepping away from the pattern, plus advisory risks.
 *
 * SUPPORTIVE, NON-CLINICAL FRAMING ONLY. This expert makes NO medical claims, gives NO
 * directives, and is NOT treatment. It offers gentle structure and encouragement to reach out —
 * never a substitute for professional help. Framework, not content: it asks the right questions
 * and builds a light plan; it does NOT prescribe a clinical protocol.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type {
  DomainExpert,
  DomainQuestion,
  FeasibilityVerdict,
  ProposedMilestone,
  RiskSignal,
  StepTemplate,
} from '../../DomainExpert';
import type { GoalInput, PlanConstraints } from '../../types';
import i18n from '../../../../i18n';
import { addressContext } from '../../../../i18n/addressForm';

/** Resolve `coachContent` copy in the active language + form of address. */
const cc = (key: string): string => i18n.t(key, { ns: 'coachContent', context: addressContext() });
/** The same for an OPTIONS array, as a fresh (mutation-safe) copy. */
const ccOptions = (key: string): string[] => [
  ...(i18n.t(key, { ns: 'coachContent', returnObjects: true, context: addressContext() }) as unknown as string[]),
];
import {
  answerFor,
  assessFrom,
  buildStructureFromArc,
  copyMilestones,
  difficultyFor,
  levelFromOrderedOptions,
  minutesFor,
  stepsFrom,
  usesMilestonesFrom,
} from '../../expertKit';

/** The arc: understand the pattern → early wins → replace it → sustain → bounce back. */
const MILESTONES: readonly ProposedMilestone[] = [
  { title: 'Map your triggers', weight: 1 },
  { title: 'First free stretch', weight: 2 },
  { title: 'Build replacement routines', weight: 2 },
  { title: 'Grow a sustained streak', weight: 3 },
  { title: 'Bounce back from a slip', weight: 2 },
] as const;

/** Gentle, non-directive Step titles per Milestone. */
const STEP_TITLES: Record<string, readonly string[]> = {
  'Map your triggers': [
    'Notice one urge and jot down what led up to it',
    'List the times of day that feel highest-risk',
    'Name one person you could reach out to',
  ],
  'First free stretch': [
    'Plan a free evening in advance',
    'Prepare a go-to distraction for when an urge hits',
    'Check in with your support person',
  ],
  'Build replacement routines': [
    'Swap one trigger moment for a short walk',
    'Set up a calming wind-down routine',
    'Try one new healthy reward you enjoy',
  ],
  'Grow a sustained streak': [
    'Complete a full free day and mark the win',
    'On a hard day, reach out instead of going it alone',
    'Reflect on how far you have already come',
  ],
  'Bounce back from a slip': [
    'Note what happened, gently and without judgement',
    'Re-plan just the next 24 hours',
    'Reconnect with your support person',
  ],
};

const defaultTitles = (): string[] => ccOptions('addiction.defaultTitles');

/**
 * The addiction interview — supportive, non-clinical, general → specific.
 *
 * EVERY STRING IS A LOOKUP, NOT A LITERAL (2026-09-15), the same as {@link CareerExpert}: a Hebrew
 * conversation used to reach a Hebrew question and then English answer cards, because the prompts
 * are voiced by the meta-agent from `interview.*` while the OPTIONS come from here. In a domain
 * this tender, being answered in the wrong language is not a cosmetic bug.
 *
 * `get` rather than a computed constant: the copy is read when the question is ASKED, so a person
 * who changes language mid-interview sees the rest of it in the new one.
 *
 * `baseline` options stay ORDERED (deep in it now → protecting a long stretch) and `milestones`
 * option [1] is still the "one day at a time" choice; that ordering carries meaning that
 * `keepSimple()` and the feasibility read below both depend on.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'addiction.foundation',
    intent: 'foundation',
    get prompt() { return cc('addiction.foundation.prompt'); },
    get options() { return ccOptions('addiction.foundation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'addiction.baseline',
    intent: 'baseline',
    get prompt() { return cc('addiction.baseline.prompt'); },
    get options() { return ccOptions('addiction.baseline.options'); },
    allowOther: true,
  },
  {
    id: 'addiction.time',
    intent: 'time',
    get prompt() { return cc('addiction.time.prompt'); },
    get options() { return ccOptions('addiction.time.options'); },
    allowOther: true,
  },
  {
    id: 'addiction.obstacles',
    intent: 'obstacles',
    get prompt() { return cc('addiction.obstacles.prompt'); },
    get options() { return ccOptions('addiction.obstacles.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'addiction.motivation',
    intent: 'motivation',
    get prompt() { return cc('addiction.motivation.prompt'); },
    get options() { return ccOptions('addiction.motivation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'addiction.milestones',
    intent: 'milestones',
    get prompt() { return cc('addiction.milestones.prompt'); },
    get options() { return ccOptions('addiction.milestones.options'); },
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'addiction.baseline';
const MILESTONES_ID = 'addiction.milestones';
/** The "one day at a time" choice, read live so it matches whatever language asked. */
const keepSimple = (): string => ccOptions('addiction.milestones.options')[1];
/** This domain leans on small support routines — a modest weekly threshold is "enough". */
const COMFORTABLE_MINUTES = 60;

const feasibilityNote = (verdict: FeasibilityVerdict): string => cc(`addiction.feasibility.${verdict}`);

export const AddictionExpert: DomainExpert = {
  displayName: 'Addiction',

  proposeMilestones() {
    return copyMilestones(MILESTONES);
  },

  stepTemplatesFor(milestone: ProposedMilestone, goal: GoalInput): StepTemplate[] {
    const titles = STEP_TITLES[milestone.title] ?? defaultTitles();
    const minutes = minutesFor(goal.cadence, goal.isHabit, 10, 20);
    return stepsFrom(titles, minutes, difficultyFor(milestone.weight));
  },

  riskSignals(_goal: GoalInput, constraints: PlanConstraints): RiskSignal[] {
    const signals: RiskSignal[] = [
      {
        code: 'high_risk_time',
        message: 'Some times of day are higher-risk — plan a small buffer around them.',
      },
      {
        code: 'trigger_exposure',
        message: 'Known triggers can catch you off guard — a ready-made response helps.',
      },
      {
        code: 'isolation',
        message: 'Going it alone makes hard moments harder — keep a person to reach out to.',
      },
    ];
    if (constraints.weeklyAvailabilityMinutes <= 0) {
      signals.push({ code: 'no_time', message: 'No weekly time is set aside for this yet.' });
    }
    return signals;
  },

  interviewQuestions() {
    return QUESTIONS.map((q) => ({ ...q, options: [...q.options] }));
  },

  assessFeasibility(answers, constraints) {
    const level = levelFromOrderedOptions(answerFor(answers, BASELINE_ID), QUESTIONS[1].options);
    // Built when the verdict is READ, so the note is in the language the person is being spoken to
    // in rather than whatever was loaded when this module first evaluated.
    return assessFrom(level, constraints, COMFORTABLE_MINUTES, {
      reasonable: feasibilityNote('reasonable'),
      ambitious: feasibilityNote('ambitious'),
      tooAmbitious: feasibilityNote('tooAmbitious'),
    });
  },

  usesMilestones(answers) {
    return usesMilestonesFrom(answers, MILESTONES_ID, keepSimple());
  },

  buildStructure(goal, answers) {
    return buildStructureFromArc({
      goal,
      answers,
      milestones: MILESTONES,
      stepTitles: STEP_TITLES,
      defaultTitles: defaultTitles(),
      baselineId: BASELINE_ID,
      baselineOptions: QUESTIONS[1].options,
      dailyMinutes: 10,
      weeklyMinutes: 20,
      staged: usesMilestonesFrom(answers, MILESTONES_ID, keepSimple()),
    });
  },
};
