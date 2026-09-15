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

const defaultTitles = (): string[] => ccOptions('relationships.defaultTitles');

/**
 * The relationships interview — gentle, non-clinical, general → specific.
 *
 * EVERY STRING IS A LOOKUP, NOT A LITERAL (2026-09-15), the same as {@link CareerExpert}: a Hebrew
 * conversation used to reach a Hebrew question and then English answer cards, because the prompts
 * are voiced by the meta-agent from `interview.*` while the OPTIONS come from here. Being asked
 * about loneliness and handed cards in a foreign language is its own small rejection.
 *
 * `get` rather than a computed constant: the copy is read when the question is ASKED, so a person
 * who changes language mid-interview sees the rest of it in the new one.
 *
 * `baseline` options stay ORDERED (quite isolated → solid circle wanting depth) and `milestones`
 * option [1] is still the "one small reach-out at a time" choice; that ordering carries meaning
 * that `keepSimple()` and the feasibility read below both depend on.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'relationships.foundation',
    intent: 'foundation',
    get prompt() { return cc('relationships.foundation.prompt'); },
    get options() { return ccOptions('relationships.foundation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'relationships.baseline',
    intent: 'baseline',
    get prompt() { return cc('relationships.baseline.prompt'); },
    get options() { return ccOptions('relationships.baseline.options'); },
    allowOther: true,
  },
  {
    id: 'relationships.time',
    intent: 'time',
    get prompt() { return cc('relationships.time.prompt'); },
    get options() { return ccOptions('relationships.time.options'); },
    allowOther: true,
  },
  {
    id: 'relationships.obstacles',
    intent: 'obstacles',
    get prompt() { return cc('relationships.obstacles.prompt'); },
    get options() { return ccOptions('relationships.obstacles.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'relationships.motivation',
    intent: 'motivation',
    get prompt() { return cc('relationships.motivation.prompt'); },
    get options() { return ccOptions('relationships.motivation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'relationships.milestones',
    intent: 'milestones',
    get prompt() { return cc('relationships.milestones.prompt'); },
    get options() { return ccOptions('relationships.milestones.options'); },
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'relationships.baseline';
const MILESTONES_ID = 'relationships.milestones';
/** The "one small reach-out at a time" choice, read live so it matches whatever language asked. */
const keepSimple = (): string => ccOptions('relationships.milestones.options')[1];
/** Connection is built in small, frequent reach-outs — a modest weekly threshold is "enough". */
const COMFORTABLE_MINUTES = 60;

const feasibilityNote = (verdict: FeasibilityVerdict): string =>
  cc(`relationships.feasibility.${verdict}`);

export const RelationshipsExpert: DomainExpert = {
  displayName: 'Relationships & Loneliness',

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
