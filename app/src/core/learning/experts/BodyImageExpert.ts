/**
 * BodyImageExpert — DomainExpert for body image / דימוי גוף. MERGES the earlier first-cut
 * nutrition and sport experts into ONE: it covers eating, movement/activity, and how a person
 * feels in their body, as a single connected domain. Supplies a general-wellness Milestone arc
 * (gentle baseline → movement you enjoy → steady nourishment → lasting routine) with light Step
 * templates, plus advisory risks.
 *
 * GENERAL WELLNESS FRAMING ONLY — NO medical or diet prescriptions, NO calorie/macro targets, NO
 * training protocols (sets/reps), NO claims. Framework, not content: it asks the right questions
 * and builds a light, sustainable plan, then keeps the user persisting — it does NOT hand over a
 * meal plan or a training program.
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

/** Feel-good arc: get the basics in → move in a way you enjoy → fuel steadily → keep it up. */
const MILESTONES: readonly ProposedMilestone[] = [
  { title: 'Build gentle baseline habits', weight: 1 },
  { title: 'Add movement you enjoy', weight: 2 },
  { title: 'Nourish and fuel steadily', weight: 2 },
  { title: 'Make it a lasting routine', weight: 3 },
] as const;

const STEP_TITLES: Record<string, readonly string[]> = {
  'Build gentle baseline habits': [
    'Move your body for a few minutes today',
    'Add a vegetable or a glass of water to one meal',
    'Notice one thing you appreciate about your body',
  ],
  'Add movement you enjoy': [
    'Do one activity you actually enjoy',
    'Move at a comfortable pace for about 20 minutes',
    'Stretch or wind down gently afterwards',
  ],
  'Nourish and fuel steadily': [
    'Eat your meals at roughly regular times',
    'Prep one simple, nourishing meal ahead',
    'Eat one meal away from screens',
  ],
  'Make it a lasting routine': [
    'Repeat your routine for a full day',
    'Reflect on how your body feels this week',
    'Adjust one habit that slipped',
  ],
};

const DEFAULT_TITLES: readonly string[] = [
  'Make one small, kind choice for your body today',
  'Reflect on how you feel in your body today',
];

/**
 * The body-image interview — general-wellness, non-prescriptive, general → specific. Modelled on
 * the founder's flow (do you do this today · why it matters · what you want · what YOU would count
 * as success). EDITABLE config, with NO calorie/macro/rep targets. `baseline` options are ORDERED
 * (inactive & on-the-go → active & balanced); `milestones` option [1] is the "one habit at a
 * time" (no-stages) choice.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'body_image.foundation',
    intent: 'foundation',
    prompt: 'Why does this matter to you right now?',
    options: [
      'More energy and health',
      'Feeling better in my body',
      'Building strength or fitness',
      'A steadier relationship with food',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'body_image.baseline',
    intent: 'baseline',
    prompt: 'How active and balanced are things right now?',
    options: [
      'Mostly inactive, eating on the go',
      'Some movement and balance, but not consistent',
      'Fairly active and balanced already',
    ],
    allowOther: true,
  },
  {
    id: 'body_image.time',
    intent: 'time',
    prompt: 'How much time can you give to this each week?',
    options: ['Under 1 hour', '1–3 hours', '3–5 hours', 'More than 5 hours'],
    allowOther: true,
  },
  {
    id: 'body_image.obstacles',
    intent: 'obstacles',
    prompt: 'What usually throws this off?',
    options: [
      'No time or too busy',
      'Low energy or motivation',
      'Stress or emotional eating',
      'All-or-nothing thinking',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'body_image.motivation',
    intent: 'motivation',
    prompt: 'What would you count as success?',
    options: [
      'Feeling stronger and more energetic',
      'Feeling at home in my body',
      'Keeping the habit going',
      'Enjoying movement and food again',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'body_image.milestones',
    intent: 'milestones',
    prompt: 'How would you like to approach it?',
    options: ['Build up in clear stages', 'Keep it simple — one habit at a time'],
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'body_image.baseline';
const MILESTONES_ID = 'body_image.milestones';
const KEEP_SIMPLE = QUESTIONS[5].options[1];
/** Movement + eating together need a fuller weekly block than the gentler domains. */
const COMFORTABLE_MINUTES = 120;

const FEASIBILITY_NOTES: Record<FeasibilityVerdict, string> = {
  reasonable: 'This is a realistic fit — small, repeatable habits will carry it.',
  ambitious: 'This is a real stretch — build one habit at a time so it sticks rather than snaps back.',
  tooAmbitious: 'This is a lot to change at once; a smaller first habit is far likelier to last.',
};

export const BodyImageExpert: DomainExpert = {
  displayName: 'Body Image',

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
        code: 'all_or_nothing',
        message: 'One off day is not a setback — aim for mostly, not perfectly.',
      },
      {
        code: 'skipping_meals',
        message: 'Skipping meals often backfires later — regular meals keep energy steady.',
      },
      {
        code: 'overtraining',
        message: 'Too much too soon backfires — keep rest and recovery in the plan.',
      },
      {
        code: 'injury_risk',
        message: 'Ramping up fast raises injury risk — build gradually and warm up.',
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
