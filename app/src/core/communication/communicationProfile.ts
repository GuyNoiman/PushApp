/**
 * communicationProfile — the UNIFIED communication-style preference (Communication_Style_Profile_PRD,
 * D40). ONE account-level preference chooses how PushApp SPEAKS to the user (notification copy today;
 * eligible Coach phrasing later). It adapts presentation only — never facts, logic, timing, safety, or
 * protected copy (PRD §9).
 *
 * NAMING (PRD §4): the four user-facing styles are Direct / Explanatory / Warm / Energizing. Their ids
 * are DELIBERATELY a distinct type from the Coach's internal voice enum
 * ({@link ../coach/communicationStyles CommunicationStyleId} = steady/direct/gentle/spark) so the two
 * never collide. This is the user's preference; {@link profileToCoachStyle} is the (not-yet-wired) seam
 * that will one day map it onto a Coach voice.
 *
 * SCORING (PRD §7): six single-choice answers each cast one vote for a style; the plurality wins. Ties
 * are resolved by a conditional tie-break page (the UI's job); {@link breakTie} is the deterministic
 * fallback for when no tie-break runs (a skipped tie-break on a first run, or any headless resolution).
 *
 * This module also holds the CURRENTLY-APPLIED style as a plain module value so the framework-free
 * layer (the engines + notification copy adapters, which never call a React hook) can apply it too —
 * exactly the arrangement {@link ../../i18n/addressForm} uses for the form of address. The unified
 * {@link ../../state/ProfileProvider} (Own_Profile) is the source of truth and keeps this in sync via
 * {@link setCommunicationProfile}; nothing else should mutate it.
 *
 * Pure TypeScript — no React, no UI, no vendor imports, no I/O.
 */
import type { CommunicationStyleId } from '../coach/communicationStyles';

/** The four approved product styles (PRD §4). Ids are stable and language-agnostic. */
export type CommunicationProfileId = 'direct' | 'explanatory' | 'warm' | 'energizing';

/** All style ids, in PRD §4 presentation order. */
export const COMMUNICATION_PROFILE_IDS: readonly CommunicationProfileId[] = [
  'direct',
  'explanatory',
  'warm',
  'energizing',
];

/**
 * The default style before the user expresses a preference (PRD §7 Default): **Warm** best matches
 * PushApp's established supportive voice. All default copy stays concise and autonomy-supportive.
 */
export const DEFAULT_COMMUNICATION_PROFILE: CommunicationProfileId = 'warm';

/** Type guard for a persisted/untrusted value. */
export function isCommunicationProfileId(value: unknown): value is CommunicationProfileId {
  return typeof value === 'string' && (COMMUNICATION_PROFILE_IDS as readonly string[]).includes(value);
}

let current: CommunicationProfileId = DEFAULT_COMMUNICATION_PROFILE;

/** The currently-applied communication style (what the framework-free layer reads). */
export function getCommunicationProfile(): CommunicationProfileId {
  return current;
}

/** Set the applied style. Called ONLY by the ProfileProvider to mirror `profile.communicationProfile` here. */
export function setCommunicationProfile(id: CommunicationProfileId): void {
  current = id;
}

/** Vote count per style. */
export type CommunicationVotes = Record<CommunicationProfileId, number>;

/** A zeroed vote tally. */
function emptyVotes(): CommunicationVotes {
  return { direct: 0, explanatory: 0, warm: 0, energizing: 0 };
}

/**
 * Tally the answers into per-style votes (PRD §7.2). Each answer casts exactly one vote; `undefined`
 * (an unanswered/skipped page) casts none, so a partial questionnaire still tallies honestly.
 */
export function tallyVotes(answers: readonly (CommunicationProfileId | undefined)[]): CommunicationVotes {
  const votes = emptyVotes();
  for (const answer of answers) {
    if (answer) votes[answer] += 1;
  }
  return votes;
}

/** The style(s) sharing the highest vote count. One entry = a clear winner; more = a tie (PRD §7 Ties). */
export function leadingStyles(votes: CommunicationVotes): CommunicationProfileId[] {
  const max = Math.max(...COMMUNICATION_PROFILE_IDS.map((id) => votes[id]));
  // No votes at all → no leader (caller falls back to the default).
  if (max === 0) return [];
  return COMMUNICATION_PROFILE_IDS.filter((id) => votes[id] === max);
}

/** The outcome of scoring six answers. */
export interface CommunicationScore {
  votes: CommunicationVotes;
  /** Style(s) sharing the lead. */
  leaders: CommunicationProfileId[];
  /** The winner when unambiguous; `null` when a tie-break is required, or nothing was answered. */
  primary: CommunicationProfileId | null;
}

/**
 * Score a completed (or partial) questionnaire (PRD §7). `primary` is set only when there is a single
 * clear leader; a multi-way tie leaves `primary` null so the UI can run the conditional tie-break page
 * (PRD §7 Ties). Use {@link breakTie} when a deterministic resolution is needed without a tie-break.
 */
export function scoreAnswers(answers: readonly (CommunicationProfileId | undefined)[]): CommunicationScore {
  const votes = tallyVotes(answers);
  const leaders = leadingStyles(votes);
  return { votes, leaders, primary: leaders.length === 1 ? leaders[0] : null };
}

/**
 * Deterministically resolve a tie WITHOUT a tie-break page (PRD §7 Ties fallback). Prefers the
 * {@link DEFAULT_COMMUNICATION_PROFILE default} when it shares the lead, otherwise the first tied
 * style in {@link COMMUNICATION_PROFILE_IDS registry order}. With no leaders at all, returns the
 * default. This never adds hidden weighting to a real selection — it only settles an exact draw.
 */
export function breakTie(leaders: readonly CommunicationProfileId[]): CommunicationProfileId {
  if (leaders.length === 0) return DEFAULT_COMMUNICATION_PROFILE;
  if (leaders.includes(DEFAULT_COMMUNICATION_PROFILE)) return DEFAULT_COMMUNICATION_PROFILE;
  return COMMUNICATION_PROFILE_IDS.find((id) => leaders.includes(id)) ?? DEFAULT_COMMUNICATION_PROFILE;
}

/**
 * COACH VOICE SEAM (PRD §9, liveCoach-gated) — the intended mapping from the unified user preference
 * onto a Coach {@link CommunicationStyleId voice}. Pure and exported so the Coach can later adopt the
 * user's choice, but DELIBERATELY NOT WIRED into the live Coach yet: the Coach still speaks in its
 * `steady` default ({@link ../coach/CoachOrchestrator}). Wiring this in is a later slice behind the
 * liveCoach flag; the mapping lives here so that slice touches config, not control flow.
 */
export function profileToCoachStyle(id: CommunicationProfileId): CommunicationStyleId {
  switch (id) {
    case 'direct':
      return 'direct';
    case 'warm':
      return 'gentle';
    case 'energizing':
      return 'spark';
    case 'explanatory':
      return 'steady';
  }
}
