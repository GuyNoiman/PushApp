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

const defaultTitles = (): string[] => ccOptions('career.defaultTitles');

/**
 * The career interview — practical, non-directive, general → specific. EDITABLE config.
 * `baseline` options are ORDERED (just starting to figure it out → actively progressing);
 * `milestones` option [1] is the "one steady step at a time" (no-stages) choice.
 */
/**
 * The career interview — practical, non-directive, general → specific.
 *
 * EVERY STRING IS A LOOKUP, NOT A LITERAL (2026-09-07). These prompts and options used to be
 * hard-coded English in this file, which is why a Hebrew first run answered a Hebrew question with
 * English cards: the founder saw "Find a new direction" and "Not knowing where to start" in the
 * middle of his own language. The prompts were already localised, because the meta-agent voices
 * those from `interview.*` — the OPTIONS were the leak, and they come from here.
 *
 * `get` rather than a computed constant: the copy is read when the question is ASKED, so a person
 * who changes language mid-interview sees the rest of it in the new one.
 *
 * `baseline` options stay ORDERED (just figuring it out → actively progressing) and `milestones`
 * option [1] is still the "one steady step at a time" choice; the ordering carries meaning that
 * `keepSimple()` and the feasibility read below both depend on.
 */
const QUESTIONS: readonly DomainQuestion[] = [
  {
    id: 'career.foundation',
    intent: 'foundation',
    get prompt() { return cc('career.foundation.prompt'); },
    get options() { return ccOptions('career.foundation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'career.baseline',
    intent: 'baseline',
    get prompt() { return cc('career.baseline.prompt'); },
    get options() { return ccOptions('career.baseline.options'); },
    allowOther: true,
  },
  {
    id: 'career.time',
    intent: 'time',
    get prompt() { return cc('career.time.prompt'); },
    get options() { return ccOptions('career.time.options'); },
    allowOther: true,
  },
  {
    id: 'career.obstacles',
    intent: 'obstacles',
    get prompt() { return cc('career.obstacles.prompt'); },
    get options() { return ccOptions('career.obstacles.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'career.motivation',
    intent: 'motivation',
    get prompt() { return cc('career.motivation.prompt'); },
    get options() { return ccOptions('career.motivation.options'); },
    allowOther: true,
    multiSelect: true,
  },
  {
    id: 'career.milestones',
    intent: 'milestones',
    get prompt() { return cc('career.milestones.prompt'); },
    get options() { return ccOptions('career.milestones.options'); },
    allowOther: true,
  },
] as const;

const BASELINE_ID = 'career.baseline';
const MILESTONES_ID = 'career.milestones';
/** The "one steady step at a time" choice, read live so it matches whatever language asked. */
const keepSimple = (): string => ccOptions('career.milestones.options')[1];
/** Career progress needs meaningful focused blocks — a fuller weekly threshold is "enough". */
const COMFORTABLE_MINUTES = 90;

const feasibilityNote = (verdict: FeasibilityVerdict): string => cc(`career.feasibility.${verdict}`);

export const CareerExpert: DomainExpert = {
  displayName: 'Career',

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
