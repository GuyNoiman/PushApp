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
} from '../DomainExpert';
import type { GoalInput, PlanConstraints } from '../types';
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
} from './expertKit';

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

const DEFAULT_TITLES: readonly string[] = [
  'Take one small step toward staying free today',
  'Reflect on what is helping most right now',
];

/**
 * The addiction interview — supportive, non-clinical, general → specific. EDITABLE config.
 * `baseline` options are ORDERED (deep in it now → protecting a long stretch); `milestones`
 * option [1] is the "one day at a time" (no-stages) choice.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'addiction.foundation',
    intent: 'foundation',
    prompt: "What's driving you to change this now?",
    options: [
      'My health',
      'My relationships',
      'My work or finances',
      'I want to feel in control again',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'addiction.baseline',
    intent: 'baseline',
    prompt: 'Where are you with it right now?',
    options: [
      "I'm deep in the pattern right now",
      "I've had some short breaks from it",
      "I've been free for a while and want to protect it",
    ],
    allowOther: true,
  },
  {
    id: 'addiction.time',
    intent: 'time',
    prompt: 'How much time can you give to support routines each week?',
    options: ['A few minutes a day', 'About 1–2 hours', '3–5 hours', 'As much as it takes'],
    allowOther: true,
  },
  {
    id: 'addiction.obstacles',
    intent: 'obstacles',
    prompt: 'When is the urge hardest to resist?',
    options: ['Evenings or at night', 'Around certain people', 'When stressed or upset', "When I'm bored or alone"],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'addiction.motivation',
    intent: 'motivation',
    prompt: 'What helps you most on a hard day?',
    options: [
      'Reaching out to someone',
      'A distraction or activity',
      'Remembering my reasons',
      'Tracking my streak',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'addiction.milestones',
    intent: 'milestones',
    prompt: 'How would you like to structure this?',
    options: ['Take it in clear stages', 'Keep it simple — one day at a time'],
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'addiction.baseline';
const MILESTONES_ID = 'addiction.milestones';
const KEEP_SIMPLE = QUESTIONS[5].options[1];
/** This domain leans on small support routines — a modest weekly threshold is "enough". */
const COMFORTABLE_MINUTES = 60;

const FEASIBILITY_NOTES: Record<FeasibilityVerdict, string> = {
  reasonable: 'This is a realistic footing — small, steady support routines can hold this.',
  ambitious: 'This is a real challenge, and worth it — lean on your support and go one step at a time.',
  tooAmbitious:
    'This is a lot to carry — please consider reaching out for extra support alongside these steps.',
};

export const AddictionExpert: DomainExpert = {
  displayName: 'Addiction',

  proposeMilestones() {
    return copyMilestones(MILESTONES);
  },

  stepTemplatesFor(milestone: ProposedMilestone, goal: GoalInput): StepTemplate[] {
    const titles = STEP_TITLES[milestone.title] ?? DEFAULT_TITLES;
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
    return assessFrom(level, constraints, COMFORTABLE_MINUTES, FEASIBILITY_NOTES);
  },

  usesMilestones(answers) {
    return usesMilestonesFrom(answers, MILESTONES_ID, KEEP_SIMPLE);
  },

  buildStructure(goal, answers) {
    return buildStructureFromArc({
      goal,
      answers,
      milestones: MILESTONES,
      stepTitles: STEP_TITLES,
      defaultTitles: DEFAULT_TITLES,
      baselineId: BASELINE_ID,
      baselineOptions: QUESTIONS[1].options,
      dailyMinutes: 10,
      weeklyMinutes: 20,
      staged: usesMilestonesFrom(answers, MILESTONES_ID, KEEP_SIMPLE),
    });
  },
};
