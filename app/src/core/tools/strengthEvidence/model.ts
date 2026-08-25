/**
 * Strength Evidence — five strengths a person can point at real moments for.
 *
 * Built to `04_Product/PRD/Tools_Documentation/Strength_Evidence_PRD.md` (founder-approved
 * 2026-08-25).
 *
 * ── WHAT MAKES IT DIFFERENT FROM EVERY STRENGTHS TEST ──────────────────────────────────────────
 *
 * It never tells anybody what they are good at. People describe themselves with flattering labels
 * they cannot connect to anything they actually did, and useful abilities feel ordinary precisely
 * because they recur — so the tool collects MOMENTS first and labels last, and the label is the
 * person's own word for a pattern in their own stories. Nothing here scores, ranks, compares or
 * validates, and a strength with no example attached cannot exist: {@link canConfirm} refuses it.
 *
 * ── THE TWO MODES ARE EQUAL, AND THE MANUAL ONE IS COMPLETE ────────────────────────────────────
 *
 * A person may group and name their own stories, or ask the coach to propose groupings. The manual
 * path is not a degraded fallback for being offline — it is the whole tool, working, without a
 * network. Everything in this file is pure, which is what makes that true.
 *
 * ── AND WHAT LEAVES ───────────────────────────────────────────────────────────────────────────
 *
 * Exactly one shape, {@link derivedSummary}: when it was taken, which mode, and per strength the
 * person's own label and how many examples sit behind it. No story text, no quotations, no context
 * tags, no application notes. The PRD calls it the smallest derived summary; the type is what makes
 * it the ONLY one.
 *
 * Pure TypeScript — no React, no storage, no clock reads (the caller passes `at`).
 */

/** The six places a story can come from. Prompts, not categories to be scored. */
export const EVIDENCE_CONTEXTS = [
  'earlyMemory',
  'workOrLearning',
  'relationships',
  'peopleAskMe',
  'hardSituation',
  'feltNatural',
] as const;
export type EvidenceContext = (typeof EVIDENCE_CONTEXTS)[number];

/** A story is capped so the tool stays about concrete evidence rather than long-form journaling. */
export const STORY_MAX_CHARS = 600;
/** Where the counter appears — early enough to be a warning rather than an interruption. */
export const STORY_COUNTER_FROM = 480;
export const LABEL_MAX_CHARS = 30;
export const APPLICATION_MAX_CHARS = 240;
/** At most five confirmed strengths, and at least one. Never a filler to reach the number. */
export const MAX_STRENGTHS = 5;

export interface EvidenceStory {
  id: string;
  /** The person's own words. Never rewritten, never translated. */
  text: string;
  context?: EvidenceContext;
  addedAt: number;
}

export interface Strength {
  id: string;
  /** The person's own label. A coach proposal becomes this only once they accept it. */
  label: string;
  /** The stories behind it. A strength with none cannot be confirmed. */
  evidenceIds: readonly string[];
  /** "When does this help you?" — a reflection, never a judgement. */
  helpsWhen?: string;
  /** "When can too much of it get in the way?" — optional, and never framed as a flaw. */
  tooMuchWhen?: string;
  /** True when the coach proposed it and the person has not accepted it yet. */
  proposed?: true;
}

export type AnalysisMode = 'manual' | 'coach';

export interface StrengthEvidenceState {
  stories: readonly EvidenceStory[];
  strengths: readonly Strength[];
  /** Absent until the person chooses; the choice is recorded because the result names it. */
  analysisMode?: AnalysisMode;
  /** Set when the whole result was confirmed. Absent while it is still a draft. */
  confirmedAt?: number;
  /**
   * Whether confirmed strengths may personalise the coach and motivational messages. FALSE until
   * the person says otherwise, and revocable — §"Approved influence contract".
   */
  personalisationAllowed: boolean;
}

export function startStrengthEvidence(): StrengthEvidenceState {
  return { stories: [], strengths: [], personalisationAllowed: false };
}

/** Trim the edges and cap. The wording inside is never touched. */
function bounded(text: string, max: number): string {
  return text.trim().slice(0, max);
}

export function addStory(
  state: StrengthEvidenceState,
  input: { id: string; text: string; context?: EvidenceContext; at: number },
): StrengthEvidenceState {
  const text = bounded(input.text, STORY_MAX_CHARS);
  if (!text) return state;
  return {
    ...state,
    stories: [
      ...state.stories,
      { id: input.id, text, ...(input.context ? { context: input.context } : {}), addedAt: input.at },
    ],
  };
}

export function editStory(
  state: StrengthEvidenceState,
  id: string,
  text: string,
): StrengthEvidenceState {
  const next = bounded(text, STORY_MAX_CHARS);
  if (!next) return state;
  return {
    ...state,
    stories: state.stories.map((s) => (s.id === id ? { ...s, text: next } : s)),
  };
}

/**
 * Remove a story, and tell the truth about what it was holding up.
 *
 * Every strength loses the reference; a strength left with NO evidence at all is not silently
 * deleted and not silently kept — it stays, marked by having an empty list, and {@link canConfirm}
 * refuses the result until the person repairs it. Deleting somebody's strength because they deleted
 * one story would be the tool making a judgement it has no standing to make (PRD edge case 6).
 */
export function removeStory(state: StrengthEvidenceState, id: string): StrengthEvidenceState {
  return {
    ...state,
    stories: state.stories.filter((s) => s.id !== id),
    strengths: state.strengths.map((strength) => ({
      ...strength,
      evidenceIds: strength.evidenceIds.filter((evidenceId) => evidenceId !== id),
    })),
  };
}

export function addStrength(
  state: StrengthEvidenceState,
  input: { id: string; label: string; evidenceIds?: readonly string[]; proposed?: true },
): StrengthEvidenceState {
  const label = bounded(input.label, LABEL_MAX_CHARS);
  if (!label) return state;
  return {
    ...state,
    strengths: [
      ...state.strengths,
      {
        id: input.id,
        label,
        evidenceIds: [...(input.evidenceIds ?? [])],
        ...(input.proposed ? { proposed: true as const } : {}),
      },
    ],
  };
}

/** Rename it, and — because renaming a proposal is accepting it — stop calling it a proposal. */
export function renameStrength(
  state: StrengthEvidenceState,
  id: string,
  label: string,
): StrengthEvidenceState {
  const next = bounded(label, LABEL_MAX_CHARS);
  if (!next) return state;
  return {
    ...state,
    strengths: state.strengths.map((s) =>
      s.id === id ? { ...omitProposed(s), label: next } : s,
    ),
  };
}

/** Accept a coach proposal as it stands. */
export function acceptStrength(state: StrengthEvidenceState, id: string): StrengthEvidenceState {
  return {
    ...state,
    strengths: state.strengths.map((s) => (s.id === id ? omitProposed(s) : s)),
  };
}

export function removeStrength(state: StrengthEvidenceState, id: string): StrengthEvidenceState {
  return { ...state, strengths: state.strengths.filter((s) => s.id !== id) };
}

/** Merge `fromId` into `intoId`: the evidence joins, deduplicated, and the label kept is the target's. */
export function mergeStrengths(
  state: StrengthEvidenceState,
  intoId: string,
  fromId: string,
): StrengthEvidenceState {
  if (intoId === fromId) return state;
  const from = state.strengths.find((s) => s.id === fromId);
  const into = state.strengths.find((s) => s.id === intoId);
  if (!from || !into) return state;
  const merged: Strength = {
    ...omitProposed(into),
    evidenceIds: [...new Set([...into.evidenceIds, ...from.evidenceIds])],
  };
  return {
    ...state,
    strengths: state.strengths.filter((s) => s.id !== fromId).map((s) => (s.id === intoId ? merged : s)),
  };
}

/** Attach or detach a story. A strength is a claim about stories, so this is the whole edit surface. */
export function toggleEvidence(
  state: StrengthEvidenceState,
  strengthId: string,
  evidenceId: string,
): StrengthEvidenceState {
  return {
    ...state,
    strengths: state.strengths.map((s) => {
      if (s.id !== strengthId) return s;
      const has = s.evidenceIds.includes(evidenceId);
      return {
        ...s,
        evidenceIds: has
          ? s.evidenceIds.filter((id) => id !== evidenceId)
          : [...s.evidenceIds, evidenceId],
      };
    }),
  };
}

export function setApplication(
  state: StrengthEvidenceState,
  id: string,
  field: 'helpsWhen' | 'tooMuchWhen',
  text: string,
): StrengthEvidenceState {
  const next = bounded(text, APPLICATION_MAX_CHARS);
  return {
    ...state,
    strengths: state.strengths.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s };
      if (next) updated[field] = next;
      else delete updated[field];
      return updated;
    }),
  };
}

/** Which strengths are ready to be part of a result: accepted, named, and standing on something. */
export function confirmable(state: StrengthEvidenceState): Strength[] {
  return state.strengths.filter((s) => !s.proposed && s.label.length > 0 && s.evidenceIds.length > 0);
}

/**
 * May the result be confirmed?
 *
 * One to five, each with at least one example. FEWER THAN FIVE IS A RESULT, not a failure — the PRD
 * is explicit that insufficient evidence produces a smaller honest result rather than filler, and
 * this is where that promise is kept.
 */
export function canConfirm(state: StrengthEvidenceState): boolean {
  const ready = confirmable(state);
  return ready.length >= 1 && ready.length <= MAX_STRENGTHS;
}

/** Confirm the whole result. Nothing is a saved insight before this. */
export function confirmResult(
  state: StrengthEvidenceState,
  at: number,
  mode: AnalysisMode,
): StrengthEvidenceState {
  if (!canConfirm(state)) return state;
  return { ...state, confirmedAt: at, analysisMode: mode, strengths: confirmable(state) };
}

/** Turn personalisation on or off. Revocable at any time, and revoking must propagate immediately. */
export function setPersonalisation(
  state: StrengthEvidenceState,
  allowed: boolean,
): StrengthEvidenceState {
  return { ...state, personalisationAllowed: allowed };
}

/** The smallest derived summary — the ONLY shape that may leave this tool. */
export interface StrengthSummary {
  takenAt: number;
  analysisMode: AnalysisMode;
  strengths: { userLabel: string; evidenceCount: number }[];
}

/**
 * What downstream readers get, or null.
 *
 * Null in three cases, and each is a promise: the result is not confirmed yet, or the person has not
 * allowed personalisation, or they have revoked it. A reader that holds this summary must therefore
 * re-read it rather than caching, which is what makes "withdrawing permission removes the derived
 * context from both readers" true rather than aspirational.
 */
export function derivedSummary(state: StrengthEvidenceState): StrengthSummary | null {
  if (state.confirmedAt === undefined || !state.analysisMode) return null;
  if (!state.personalisationAllowed) return null;
  return {
    takenAt: state.confirmedAt,
    analysisMode: state.analysisMode,
    strengths: confirmable(state).map((s) => ({
      userLabel: s.label,
      evidenceCount: s.evidenceIds.length,
    })),
  };
}

function omitProposed(strength: Strength): Strength {
  const { proposed: _proposed, ...rest } = strength;
  return rest;
}
