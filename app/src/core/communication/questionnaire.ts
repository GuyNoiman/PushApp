/**
 * questionnaire — the pure config for the Communication Style questionnaire (PRD §5/§6). Six pages,
 * each showing ONE realistic notification event written in all four styles; the user picks the
 * formulation they'd most like to receive, and the plurality style wins (scoring lives in
 * {@link ./communicationProfile}). This file holds only the STRUCTURE (event order + the tie-break
 * event); the localized copy for each event × style lives in the `communication` i18n namespace, so
 * the exact wording is authored natively per language (PRD §6/§10) and never hard-coded here.
 *
 * Pure TypeScript — no React, no UI, no vendor imports, no I/O.
 */
import { COMMUNICATION_PROFILE_IDS, type CommunicationProfileId } from './communicationProfile';

/** The six notification events compared in the questionnaire (PRD §6), in page order. */
export type CommunicationEventId =
  | 'friendRequest'
  | 'friendSupport'
  | 'stepsRemain'
  | 'streakRisk'
  | 'positiveProgress'
  | 'stepReminder';

/** The six events in page order (PRD §6 Q1–Q6). */
export const COMMUNICATION_EVENTS: readonly CommunicationEventId[] = [
  'friendRequest',
  'friendSupport',
  'stepsRemain',
  'streakRisk',
  'positiveProgress',
  'stepReminder',
];

/** Total scored pages (PRD §5: six). The tie-break page is conditional and NOT counted here. */
export const COMMUNICATION_QUESTION_COUNT = COMMUNICATION_EVENTS.length;

/** Bump when the event SET or scoring changes, so saved progress/results carry correct provenance (PRD §7.5). */
export const COMMUNICATION_QUESTIONNAIRE_VERSION = 1;

/**
 * The conditional tie-break event (PRD §7 Ties): a NEW neutral scheduled-reminder comparison shown
 * only when the six scored pages end in a tie. It resolves preference between the tied styles and is
 * deliberately NOT one of {@link COMMUNICATION_EVENTS} — it is never a "seventh scored question".
 */
export const COMMUNICATION_TIEBREAK_EVENT = 'tieBreak' as const;
export type CommunicationTieBreakEvent = typeof COMMUNICATION_TIEBREAK_EVENT;

/** The user's answer per event (a chosen style id). Absent = an unanswered/skipped page. */
export type CommunicationAnswers = Partial<Record<CommunicationEventId, CommunicationProfileId>>;

/** The six answers in page order (undefined where unanswered) — the shape {@link scoreAnswers} tallies. */
export function orderedAnswers(answers: CommunicationAnswers): (CommunicationProfileId | undefined)[] {
  return COMMUNICATION_EVENTS.map((event) => answers[event]);
}

/**
 * A copy formulation shown on a page: which style authored it (kept HIDDEN from the user during
 * selection — PRD §5) and its localized title/body. The style id is the vote the choice casts.
 */
export interface CommunicationFormulation {
  styleId: CommunicationProfileId;
  title: string;
  body: string;
}

/**
 * Return a shuffled copy of `items` (Fisher–Yates). Answer order is randomized INDEPENDENTLY per page
 * (PRD §5: no order bias, no style-name leakage). Takes an `rng` so callers can seed it deterministically
 * in tests; defaults to `Math.random`. Never mutates the input.
 */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A fresh, randomized style order for one page (PRD §5). All four styles, none omitted. */
export function shuffledStyleOrder(rng: () => number = Math.random): CommunicationProfileId[] {
  return shuffle(COMMUNICATION_PROFILE_IDS, rng);
}
