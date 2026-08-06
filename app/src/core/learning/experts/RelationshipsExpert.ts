/**
 * RelationshipsExpert — DomainExpert for relationships & loneliness / זוגיות ובדידות. Supplies a
 * gentle Milestone arc (reconnect → regular contact → open up → grow the circle) with light Step
 * templates, plus advisory risks. Covers connection, dating, sustaining relationships and
 * reducing isolation.
 *
 * NON-CLINICAL FRAMING ONLY — this expert is NOT a matchmaker and NOT a therapist. It offers
 * encouragement and light structure to reach out and connect; it makes no diagnosis and gives no
 * directives. Framework, not content: it asks the right questions and builds a light plan; it
 * never scripts a relationship for the user.
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

/** Connection grows in steps: reach out → keep in touch → open up → widen the circle. */
const MILESTONES: readonly ProposedMilestone[] = [
  { title: 'Reach out and reconnect', weight: 1 },
  { title: 'Build regular contact', weight: 2 },
  { title: 'Open up and deepen', weight: 2 },
  { title: 'Grow your circle', weight: 3 },
] as const;

const STEP_TITLES: Record<string, readonly string[]> = {
  'Reach out and reconnect': [
    'Message one person you have been missing',
    'Say yes to one invitation this week',
    'Plan a small get-together with someone',
  ],
  'Build regular contact': [
    'Set a regular check-in with someone you care about',
    'Reply warmly to one message today',
    'Suggest meeting up in person this week',
  ],
  'Open up and deepen': [
    'Share something real with someone you trust',
    'Ask someone how they are really doing',
    'Let someone in on a small worry',
  ],
  'Grow your circle': [
    'Join one group or activity that interests you',
    'Introduce yourself to someone new',
    'Follow up with someone you recently met',
  ],
};

const DEFAULT_TITLES: readonly string[] = [
  'Take one small step toward connection today',
  'Reflect on a relationship that matters to you',
];

/**
 * The relationships interview — gentle, non-clinical, general → specific. EDITABLE config.
 * `baseline` options are ORDERED (quite isolated → solid circle wanting depth); `milestones`
 * option [1] is the "one small reach-out at a time" (no-stages) choice.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'relationships.foundation',
    intent: 'foundation',
    prompt: 'What matters most to you here?',
    options: [
      'Feeling less alone',
      'Finding a partner',
      'Deepening the relationships I have',
      'Building new friendships',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'relationships.baseline',
    intent: 'baseline',
    prompt: 'How connected do you feel right now?',
    options: [
      'I feel quite isolated right now',
      'I have some connections but want more',
      'I have a solid circle and want to deepen it',
    ],
    allowOther: true,
  },
  {
    id: 'relationships.time',
    intent: 'time',
    prompt: 'How much time can you give to nurturing connection each week?',
    options: ['A few minutes a day', 'About 1–2 hours', '3–5 hours', 'More than 5 hours'],
    allowOther: true,
  },
  {
    id: 'relationships.obstacles',
    intent: 'obstacles',
    prompt: 'What gets in the way of connecting?',
    options: [
      'Fear of rejection',
      'Not knowing where to meet people',
      'Feeling too busy or tired',
      'A habit of withdrawing',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'relationships.motivation',
    intent: 'motivation',
    prompt: 'What keeps you reaching out?',
    options: [
      'Wanting to feel understood',
      'How good real connection feels',
      'Not wanting to stay isolated',
      'Someone specific I care about',
    ],
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'relationships.milestones',
    intent: 'milestones',
    prompt: 'How would you like to approach it?',
    options: ['Build up in clear stages', 'Keep it simple — one small reach-out at a time'],
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'relationships.baseline';
const MILESTONES_ID = 'relationships.milestones';
const KEEP_SIMPLE = QUESTIONS[5].options[1];
/** Connection is built in small, frequent reach-outs — a modest weekly threshold is "enough". */
const COMFORTABLE_MINUTES = 60;

const FEASIBILITY_NOTES: Record<FeasibilityVerdict, string> = {
  reasonable: 'This is a realistic reach — small, regular reach-outs build real connection over time.',
  ambitious: 'This is a genuine stretch — start with one small, low-pressure reach-out and let it grow.',
  tooAmbitious: 'This is a big leap at once — a gentler first step gives you a win to build on.',
};

export const RelationshipsExpert: DomainExpert = {
  displayName: 'Relationships & Loneliness',

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
        code: 'fear_of_rejection',
        message: 'Fear of rejection makes reaching out feel bigger than it is — start small.',
      },
      {
        code: 'avoidance',
        message: 'It is easy to put off the first message — a tiny reach-out beats waiting.',
      },
      {
        code: 'social_withdrawal',
        message: 'Withdrawing feels safe but deepens isolation — keep one steady connection warm.',
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
