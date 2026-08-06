/**
 * CareerExpert — DomainExpert for career / קריירה: direction, skills, job search and growth at
 * work. Supplies a sensible Milestone arc (clarify direction → build skills → put yourself out
 * there → sustain momentum) with light Step templates, plus advisory risks.
 *
 * FRAMEWORK, NOT CONTENT — this expert is NOT a career counsellor and gives NO field-specific
 * advice, no CV rewrites, no role recommendations. It asks the right questions and builds a light
 * plan that keeps the user acting and persisting; the professional "how" stays with them.
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

/** Progress arc: know where you're headed → build skills → reach out → keep momentum. */
const MILESTONES: readonly ProposedMilestone[] = [
  { title: 'Clarify your direction', weight: 1 },
  { title: 'Build the key skills', weight: 2 },
  { title: 'Put yourself out there', weight: 2 },
  { title: 'Grow and sustain momentum', weight: 3 },
] as const;

const STEP_TITLES: Record<string, readonly string[]> = {
  'Clarify your direction': [
    'Write down what you want from your career',
    'List roles or paths that interest you',
    'Name one strength you want to lean on',
  ],
  'Build the key skills': [
    'Spend 20 minutes learning one key skill',
    'Practice something that stretches you at work',
    'Ask someone for feedback on one thing',
  ],
  'Put yourself out there': [
    'Reach out to one person in your field',
    'Update one part of your CV or profile',
    'Apply for or propose one opportunity',
  ],
  'Grow and sustain momentum': [
    'Reflect on one win from this week',
    'Set your next small career target',
    'Reconnect with someone in your network',
  ],
};

const DEFAULT_TITLES: readonly string[] = [
  'Take one small step toward your career goal today',
  'Reflect on what progress would look like for you',
];

/**
 * The career interview — practical, non-directive, general → specific. EDITABLE config.
 * `baseline` options are ORDERED (just starting to figure it out → actively progressing);
 * `milestones` option [1] is the "one steady step at a time" (no-stages) choice.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'career.foundation',
    intent: 'foundation',
    prompt: 'What are you hoping to change in your career?',
    options: [
      'Find a new direction',
      'Land a new role or job',
      'Grow where I am',
      'Build a specific skill',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'career.baseline',
    intent: 'baseline',
    prompt: 'Where are you with it right now?',
    options: [
      'Just starting to figure it out',
      'I have a direction but little momentum',
      "I'm actively progressing and want to push further",
    ],
    allowOther: true,
  },
  {
    id: 'career.time',
    intent: 'time',
    prompt: 'How much time can you give to this each week?',
    options: ['Under 1 hour', '1–3 hours', '3–5 hours', 'More than 5 hours'],
    allowOther: true,
  },
  {
    id: 'career.obstacles',
    intent: 'obstacles',
    prompt: 'What usually gets in the way?',
    options: [
      'Not knowing where to start',
      'Procrastination or overwhelm',
      'Fear of putting myself out there',
      'No time outside work',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'career.motivation',
    intent: 'motivation',
    prompt: 'What will keep you going?',
    options: [
      'A clearer future I want',
      'More income or security',
      'Doing work that means something',
      'Proving to myself I can',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'career.milestones',
    intent: 'milestones',
    prompt: 'How would you like to approach it?',
    options: ['Build up in clear stages', 'Keep it simple — one steady step at a time'],
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'career.baseline';
const MILESTONES_ID = 'career.milestones';
const KEEP_SIMPLE = QUESTIONS[5].options[1];
/** Career progress needs meaningful focused blocks — a fuller weekly threshold is "enough". */
const COMFORTABLE_MINUTES = 90;

const FEASIBILITY_NOTES: Record<FeasibilityVerdict, string> = {
  reasonable: 'This is a realistic plan for where you are and the time you have.',
  ambitious: 'This is a real stretch — steady, focused steps each week will get you there.',
  tooAmbitious: 'This is a big reach from your starting point; a nearer first target builds momentum faster.',
};

export const CareerExpert: DomainExpert = {
  displayName: 'Career',

  proposeMilestones() {
    return copyMilestones(MILESTONES);
  },

  stepTemplatesFor(milestone: ProposedMilestone, goal: GoalInput): StepTemplate[] {
    const titles = STEP_TITLES[milestone.title] ?? DEFAULT_TITLES;
    const minutes = minutesFor(goal.cadence, goal.isHabit, 15, 30);
    return stepsFrom(titles, minutes, difficultyFor(milestone.weight));
  },

  riskSignals(_goal: GoalInput, constraints: PlanConstraints): RiskSignal[] {
    const signals: RiskSignal[] = [
      {
        code: 'procrastination',
        message: 'Big career steps are easy to put off — shrink the next one until it feels doable.',
      },
      {
        code: 'scope_creep',
        message: 'Trying to change everything at once stalls progress — pick one focus at a time.',
      },
      {
        code: 'burnout',
        message: 'Pushing career work on top of a full job can burn you out — keep the pace sustainable.',
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
      dailyMinutes: 15,
      weeklyMinutes: 30,
      staged: usesMilestonesFrom(answers, MILESTONES_ID, KEEP_SIMPLE),
    });
  },
};
