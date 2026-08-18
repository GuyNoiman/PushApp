/**
 * recurringApproaches — the three ways a REPEATED action gets established, as scaffolding the
 * DomainExperts build their variants on.
 *
 * WHY THREE, AND WHY DIFFERENT APPROACHES: without variants there is nothing to compare, and
 * without comparison there is no learning (Plan_Library_and_Learning_PRD §6). Three variants that
 * differ only in INTENSITY teach us nothing except that some people like less work. These three
 * differ in METHOD, so "which one suits whom" is a real question with a real answer.
 *
 * WHY THEY ARE SHARED RATHER THAN PER-EXPERT: the scaffold is the same everywhere — attaching a
 * new action to an existing routine works identically for a protein shake and for changing the
 * pillowcases. The DOMAIN content is the expert's ({@link DomainExpert.buildVariants}); the shape
 * of "how a repeated thing takes hold" is not domain knowledge and must not be written four times.
 *
 * WHAT A RECURRING JOURNEY IS NOT: a Milestone arc. Four of the founder's five real goals —
 * changing pillowcases fortnightly, reading twice a week, shaving twice a day, a daily protein
 * shake — have no stages. There is no "second phase" of changing pillowcases. The app forced its
 * only shape onto them, which is why the plan it produced read as though it were about somebody
 * else. A recurring Journey is: a few setup Steps, then the user's own action, repeated.
 *
 * LANGUAGE: every string here is authored in English — the experts' language (founder decision
 * 2026-08-18). It is translated once per language and cached; the user's own words are inserted
 * after translation and never go through it (see `./slots`).
 *
 * Framework-free (no React, no native modules): it resolves copy through the shared i18next core
 * instance, the same way `DomainExpert` does. CONFIG-BEFORE-CODE: adding an approach means adding
 * an entry here plus its rendered strings in `i18n/resources/<lang>/library.json`.
 */
import i18n from '../../../i18n';
import type { StepTemplate } from '../DomainExpert';

/** The three established ways a repeated action takes hold. A stable enum — extend, never repurpose. */
export type RecurringApproachId = 'anchor' | 'tiny_start' | 'prepare';

/** One authored template: a sentence with an optional `{ACTION}` hole, plus its Step sizing. */
export interface AuthoredStepTemplate {
  /**
   * Stable id, unique across the library. It is the TRANSLATION CACHE KEY (it names the entry in
   * the `library` i18n namespace) and the only part of a Step that may ever be reported outward —
   * the filled title never can (G1).
   */
  id: string;
  /**
   * The sentence, authored in English, with `{ACTION}` where the user's own words belong.
   *
   * This is the AUTHORED ORIGINAL and also the fallback: {@link approachCopy} looks the id up in
   * the translation cache first, and lands here when a language has not been rendered yet. A user
   * in an unsupported language therefore reads English rather than a missing-key placeholder.
   */
  title: string;
  estimatedMinutes: number;
  /** Relative difficulty 1..5. Setup Steps are deliberately easy; the action itself is the work. */
  difficulty: number;
}

/** One approach: how it differs, in a line the user can read, and the Steps that set it up. */
export interface RecurringApproach {
  id: RecurringApproachId;
  /**
   * The one line shown when the user is offered the other ways of doing this ("there are two other
   * ways"). It must describe the METHOD, never promise an outcome and never rank the options.
   *
   * This is the authored English, used as the fallback; {@link approachEssence} reads the
   * translated one from {@link essenceKey} first.
   */
  essence: string;
  /** This approach's entry in the `library` translation cache. */
  essenceKey: string;
  /**
   * The Steps that happen ONCE, at the start, to make the repetition possible. Kept short on
   * purpose: a plan whose first week is all preparation is a plan the user never starts.
   */
  setupSteps: readonly AuthoredStepTemplate[];
}

export const RECURRING_APPROACHES: readonly RecurringApproach[] = [
  {
    id: 'anchor',
    essence: 'Attach it to something you already do every day.',
    essenceKey: 'recurring.anchor.essence',
    setupSteps: [
      {
        id: 'recurring.anchor.pick',
        title: 'Pick something you already do every day, and decide to do {ACTION} right after it',
        estimatedMinutes: 5,
        difficulty: 1,
      },
      {
        id: 'recurring.anchor.rehearse',
        title: 'Do {ACTION} straight after that thing once, just to see how it fits',
        estimatedMinutes: 10,
        difficulty: 1,
      },
    ],
  },
  {
    id: 'tiny_start',
    essence: 'Start smaller than feels worth it, then grow from there.',
    essenceKey: 'recurring.tiny.essence',
    setupSteps: [
      {
        id: 'recurring.tiny.define',
        title: 'Decide the smallest version of {ACTION} that you could not fail to do',
        estimatedMinutes: 5,
        difficulty: 1,
      },
      {
        id: 'recurring.tiny.first',
        title: 'Do that smallest version of {ACTION} today',
        estimatedMinutes: 5,
        difficulty: 1,
      },
    ],
  },
  {
    id: 'prepare',
    essence: 'Do most of the work in advance, so the moment itself needs no decision.',
    essenceKey: 'recurring.prepare.essence',
    setupSteps: [
      {
        id: 'recurring.prepare.gather',
        title: 'Get everything {ACTION} needs, and put it where you will see it',
        estimatedMinutes: 20,
        difficulty: 2,
      },
      {
        id: 'recurring.prepare.place',
        title: 'Set up the spot where {ACTION} is going to happen',
        estimatedMinutes: 10,
        difficulty: 1,
      },
    ],
  },
] as const;

/** Look one up by id; `undefined` for an unknown id (never throws — an unknown id falls back). */
export function recurringApproach(id: string): RecurringApproach | undefined {
  return RECURRING_APPROACHES.find((a) => a.id === id);
}

/**
 * How many setup Steps an approach spends before the repetitions start. The caller subtracts these
 * from the active days available, so the count is read from the approach rather than assumed — an
 * approach added later with three setup Steps stays correct without touching the caller.
 */
export function recurringSetupCount(id: string | undefined): number {
  return (recurringApproach(id ?? DEFAULT_RECURRING_APPROACH)
    ?? recurringApproach(DEFAULT_RECURRING_APPROACH)!).setupSteps.length;
}

/**
 * The DEFAULT approach when nothing is known about the user yet. `anchor` on purpose: it is the
 * only one of the three that asks for no equipment, no shrinking of the goal, and no decision the
 * user might get wrong — the safest thing to hand someone we have not learned anything about.
 */
export const DEFAULT_RECURRING_APPROACH: RecurringApproachId = 'anchor';

/**
 * The user-facing sentence for one authored template, in the ACTIVE language.
 *
 * Content is authored in English — the experts' language (D55) — and each template is rendered once
 * per language into `i18n/resources/<lang>/library.json`. That file IS the translation cache: the
 * templates are a closed set we write, so a language is paid for once and then served to every user
 * of it forever, with no model call, no cost and no network. A live per-user translation would put
 * the coach's own words behind a network round-trip and leave an offline user reading English.
 *
 * The slot is still in the string when this returns. That order is the whole design: the FRAME is
 * translated, then the user's own words are inserted. Translating after filling would send
 * "שייק חלבון" through a translator and hand it back as "protein shake" — no longer theirs.
 */
export function templateCopy(authored: AuthoredStepTemplate): string {
  // The id IS the cache key: template ids are written as the dotted path into the `library`
  // namespace, so the two can never drift out of step through a mapping function.
  const translated = i18n.t(authored.id, { ns: 'library', defaultValue: '' });
  return translated || authored.title;
}

/** The one-line "what makes this different", in the active language (same cache, same fallback). */
export function approachEssence(approach: RecurringApproach): string {
  const translated = i18n.t(approach.essenceKey, { ns: 'library', defaultValue: '' });
  return translated || approach.essence;
}

/** Convert an authored template into the Planner's {@link StepTemplate} (id dropped — see below). */
export function toStepTemplate(authored: AuthoredStepTemplate, title: string): StepTemplate {
  // The authored id does NOT travel onto the Step: a Step carries the filled, user-facing title,
  // and the template it came from is recorded on the Journey (not per Step) for the library.
  return {
    title,
    estimatedMinutes: authored.estimatedMinutes,
    difficulty: authored.difficulty,
  };
}
