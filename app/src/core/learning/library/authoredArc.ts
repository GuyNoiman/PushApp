/**
 * authoredArc — a PROCESS Journey's own Milestone arc and Steps, as authored content.
 *
 * WHY THIS EXISTS. Until now the only staged arc in the app was the one hardcoded inside each
 * {@link ../experts/DomainExpert}: one arc per domain, the same four Milestones for every career
 * goal anyone ever brings. The founder's rule settles what the alternative is — **a set of
 * Milestones IS a Journey**, several Journeys exist for the same goal, and a version never changes
 * Milestones (D62, and `../../../../04_Product/PRD/Plan_Library_and_Learning_PRD.md` §6). So an arc
 * that differs is simply ANOTHER definition in the library, and this file is the shape one is
 * written in.
 *
 * IT IS CONTENT, NOT CODE. An arc is milestones + steps + i18n keys + minutes. Nothing here knows
 * what a career is, and adding a Journey never touches the planner, the selector or the ratings.
 *
 * LANGUAGE (D55). Every user-facing string is authored in English on the object itself and
 * ALSO carries a key into the `library` namespace, which is the translation cache: the authored set
 * is closed and we write it, so a language is paid for once and then served offline, with no model
 * call and no network. The authored English is the fallback, so a missing translation degrades to
 * readable English rather than to a key. Copy resolves in the user's FORM OF ADDRESS (D31) too —
 * an arc's Steps are instructions addressed to a person ("choose one task…"), which in Hebrew is
 * inflected; a `_feminine` / `_masculine` variant is used when the cache has one and the base key
 * when it does not.
 *
 * SECURITY-PRIVACY G1: an arc holds authored content only. No user text ever enters one; the
 * user's own words reach a plan through the goal title and the recurring path's `{ACTION}` slot,
 * never through here.
 *
 * Pure TypeScript apart from the framework-free i18next core instance — no React, no clock reads.
 */
import i18n from '../../../i18n';
import { addressContext } from '../../../i18n/addressForm';
import type { PlanStructure, StepTemplate } from '../DomainExpert';

/** One Milestone of an authored arc. `id` is local to the arc and is what its Steps point at. */
export interface AuthoredMilestone {
  id: string;
  /** The authored English title — also the fallback when the cache has no translation. */
  title: string;
  /** Key into the `library` namespace for this Milestone's title. */
  titleKey: string;
  /** Relative effort/importance, passed through to the live Milestone. */
  weight?: number;
}

/** One Step of an authored arc, in plan order. */
export interface AuthoredProcessStep {
  id: string;
  /** The {@link AuthoredMilestone.id} this Step belongs to. Every Step belongs to exactly one. */
  milestoneId: string;
  title: string;
  titleKey: string;
  /** The short "what this actually means" line under the title. Optional but almost always present. */
  description?: string;
  descriptionKey?: string;
  estimatedMinutes: number;
  /** Relative difficulty 1..5. */
  difficulty: number;
  /**
   * Another Step of the SAME Milestone, earlier in the arc, that must be reported before this one
   * unlocks (Step Dependencies — linear, within a Milestone). Authored by id; the positional
   * resolution to a real `Step.dependsOnStepId` happens once the Steps are minted.
   */
  dependsOnStepId?: string;
}

/** A whole authored arc: the Milestones, and the Steps in the order the plan runs them. */
export interface AuthoredArc {
  milestones: readonly AuthoredMilestone[];
  steps: readonly AuthoredProcessStep[];
  /**
   * The span the author wrote this arc for, in days. ADVISORY and not read by the Planner: a
   * Journey's real length comes from the user's own horizon answer and their constraints, and it
   * must keep doing so — the person's available weeks outrank the author's intent.
   *
   * It is recorded because it is a real piece of the content ("this is a five-week arc, not a
   * fortnight's"), it is what the author balanced the Step count against, and dropping it would
   * mean guessing it back later from nothing.
   */
  suggestedDurationDays?: number;
}

/** One authored string in the ACTIVE language and form of address, falling back to the English. */
export function arcCopy(key: string | undefined, authored: string): string {
  if (!key) return authored;
  const translated = i18n.t(key, { ns: 'library', context: addressContext(), defaultValue: '' });
  return translated || authored;
}

/**
 * Check an arc for the content mistakes that would silently produce a broken plan — a Step pointing
 * at a Milestone that does not exist, a Milestone nothing ever happens in, a dependency that runs
 * backwards or crosses a Milestone boundary. Returns a list of problems; EMPTY means valid.
 *
 * It exists for the same reason {@link ./journeyDefinition.validateJourneyDefinition} does: an arc
 * is content, and content is what gets edited by someone who is not reading this file. A test
 * asserts every shipped arc passes, so a typo fails the suite instead of quietly shipping a
 * Milestone with no Steps in it.
 */
export function validateAuthoredArc(arc: AuthoredArc): string[] {
  const problems: string[] = [];
  const milestoneIds = new Set(arc.milestones.map((m) => m.id));
  if (arc.milestones.length !== milestoneIds.size) problems.push('duplicate Milestone id');
  if (arc.milestones.length === 0) problems.push('arc has no Milestones');

  const stepIds = new Set(arc.steps.map((s) => s.id));
  if (arc.steps.length !== stepIds.size) problems.push('duplicate Step id');
  if (arc.steps.length === 0) problems.push('arc has no Steps');

  const seen = new Set<string>();
  const used = new Set<string>();
  for (const step of arc.steps) {
    if (!milestoneIds.has(step.milestoneId)) {
      problems.push(`step ${step.id}: unknown Milestone ${step.milestoneId}`);
    }
    used.add(step.milestoneId);
    if (step.estimatedMinutes <= 0) problems.push(`step ${step.id}: non-positive minutes`);
    if (step.difficulty < 1 || step.difficulty > 5) problems.push(`step ${step.id}: difficulty out of 1..5`);
    const dep = step.dependsOnStepId;
    if (dep !== undefined) {
      if (!stepIds.has(dep)) problems.push(`step ${step.id}: unknown predecessor ${dep}`);
      else if (!seen.has(dep)) problems.push(`step ${step.id}: predecessor ${dep} comes later`);
      else {
        const predecessor = arc.steps.find((s) => s.id === dep);
        if (predecessor && predecessor.milestoneId !== step.milestoneId) {
          // The dependency rule is per-Milestone by design (`core/status/stepDependencies.ts`): a
          // Step blocked by something in an earlier Milestone would be unreachable in a plan whose
          // Milestones are allowed to run loosely.
          problems.push(`step ${step.id}: predecessor ${dep} is in another Milestone`);
        }
      }
    }
    seen.add(step.id);
  }
  // A Milestone with no Steps is a stage the user can never complete, so progress would stall on it.
  for (const milestone of arc.milestones) {
    if (!used.has(milestone.id)) problems.push(`Milestone ${milestone.id} has no Steps`);
  }
  return problems;
}

/**
 * Turn an authored arc into the {@link PlanStructure} the Planner lays across the calendar — the
 * same contract a {@link ../DomainExpert} returns, so a library Journey and an expert's arc reach
 * the scheduler through one path and nothing downstream has to know which it was.
 *
 * Milestones keep the order they were authored in; a Milestone's Steps keep theirs. Copy is
 * resolved HERE, once, in the user's language and form of address.
 */
export function buildProcessStructure(arc: AuthoredArc): PlanStructure {
  const milestones = arc.milestones.map((m) => ({
    title: arcCopy(m.titleKey, m.title),
    ...(m.weight !== undefined ? { weight: m.weight } : {}),
  }));
  const stepsByMilestone: StepTemplate[][] = arc.milestones.map((m) =>
    arc.steps
      .filter((s) => s.milestoneId === m.id)
      .map((s) => ({
        id: s.id,
        title: arcCopy(s.titleKey, s.title),
        estimatedMinutes: s.estimatedMinutes,
        difficulty: s.difficulty,
        ...(s.description !== undefined
          ? { description: arcCopy(s.descriptionKey, s.description) }
          : {}),
        ...(s.dependsOnStepId !== undefined ? { dependsOnTemplateId: s.dependsOnStepId } : {}),
      })),
  );
  return { milestones, stepsByMilestone };
}
