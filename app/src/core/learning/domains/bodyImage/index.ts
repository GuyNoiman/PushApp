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

const defaultTitles = (): string[] => ccOptions('bodyImage.defaultTitles');

/**
 * The body-image interview — general-wellness, non-prescriptive, general → specific. Modelled on
 * the founder's flow (do you do this today · why it matters · what you want · what YOU would count
 * as success). NO calorie/macro/rep targets.
 *
 * EVERY STRING IS A LOOKUP, NOT A LITERAL (2026-09-15), the same as {@link CareerExpert}: a Hebrew
 * conversation used to reach a Hebrew question and then English answer cards, because the prompts
 * are voiced by the meta-agent from `interview.*` while the OPTIONS come from here.
 *
 * `get` rather than a computed constant: the copy is read when the question is ASKED, so a person
 * who changes language mid-interview sees the rest of it in the new one.
 *
 * `baseline` options stay ORDERED (inactive & on-the-go → active & balanced) and `milestones`
 * option [1] is still the "one habit at a time" choice; that ordering carries meaning that
 * `keepSimple()` and the feasibility read below both depend on.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'body_image.foundation',
    intent: 'foundation',
    get prompt() { return cc('bodyImage.foundation.prompt'); },
    get options() { return ccOptions('bodyImage.foundation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'body_image.baseline',
    intent: 'baseline',
    get prompt() { return cc('bodyImage.baseline.prompt'); },
    get options() { return ccOptions('bodyImage.baseline.options'); },
    allowOther: true,
  },
  {
    id: 'body_image.time',
    intent: 'time',
    get prompt() { return cc('bodyImage.time.prompt'); },
    get options() { return ccOptions('bodyImage.time.options'); },
    allowOther: true,
  },
  {
    id: 'body_image.obstacles',
    intent: 'obstacles',
    get prompt() { return cc('bodyImage.obstacles.prompt'); },
    get options() { return ccOptions('bodyImage.obstacles.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'body_image.motivation',
    intent: 'motivation',
    get prompt() { return cc('bodyImage.motivation.prompt'); },
    get options() { return ccOptions('bodyImage.motivation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'body_image.milestones',
    intent: 'milestones',
    get prompt() { return cc('bodyImage.milestones.prompt'); },
    get options() { return ccOptions('bodyImage.milestones.options'); },
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'body_image.baseline';
const MILESTONES_ID = 'body_image.milestones';
/** The "one habit at a time" choice, read live so it matches whatever language asked. */
const keepSimple = (): string => ccOptions('bodyImage.milestones.options')[1];
/** Movement + eating together need a fuller weekly block than the gentler domains. */
const COMFORTABLE_MINUTES = 120;

const feasibilityNote = (verdict: FeasibilityVerdict): string => cc(`bodyImage.feasibility.${verdict}`);

export const BodyImageExpert: DomainExpert = {
  displayName: 'Body Image',

  proposeMilestones() {
    return copyMilestones(MILESTONES);
  },

  stepTemplatesFor(milestone: ProposedMilestone, goal: GoalInput): StepTemplate[] {
    const titles = STEP_TITLES[milestone.title] ?? defaultTitles();
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
      dailyMinutes: 15,
      weeklyMinutes: 30,
      staged: usesMilestonesFrom(answers, MILESTONES_ID, keepSimple()),
    });
  },
};
