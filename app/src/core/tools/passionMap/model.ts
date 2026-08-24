/**
 * Passion Map — the engine behind the guided reflection, built to `04_Product/PRD/Passion_Map_PRD.md`.
 *
 * **IT IS A REFLECTION, NOT A TEST.** Everything below exists to keep it one. The PRD's §3.1 rule is
 * that the app says *clue*, *pattern*, *Spark*, *theme* — never "your true passion" or "we discovered
 * your purpose" — and the founder's own framing is sharper still: the digital Ikigai tools rush to a
 * purpose sentence as though it were uncovered objectively, and **here the user stays the author.**
 * That is not a copy rule. It is why nothing in this file ever writes a theme into the map on its
 * own, why grouping is a SUGGESTION until confirmed, and why no single day of evidence can change
 * anything.
 *
 * ── THE TWO HALVES ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. **Initial discovery** — six prompts, up to two Sparks each, eight in all; narrow to the three
 *     to five strongest; an optional Why note each; then one to four Constellations, proposed and
 *     editable.
 *  2. **Live discovery** — one to three real moments a day, each carrying ENERGY and PULL as
 *     SEPARATE readings. That separation is the whole point of the daily half: an exhausting thing
 *     can still be worth returning to, and an easy thing can mean nothing. Collapse them into one
 *     "passion score" and the tool stops being able to tell those apart.
 *
 * ── THE RULES THAT PROTECT THE PERSON FROM THE TOOL ────────────────────────────────────────────
 *
 *  · **No single signal changes anything.** A proposal needs a repeat pattern: at least three signals
 *    across at least two different days (PRD §7.3). One bad Tuesday is not evidence about a life.
 *  · **Nothing is ever deleted automatically.** Repeated draining evidence may propose adding
 *    context, weakening confidence, or asking the question — never removing a Spark.
 *  · **Absence is not negative evidence.** A blank day means a blank day.
 *  · **Fewer than four Sparks is "early clues", not a failure**, and nothing is invented to fill it.
 *
 * SECURITY-PRIVACY G1: Sparks, Why notes and daily moments are ON-DEVICE ONLY.
 *
 * Pure TypeScript — no React, no i18n, no clock reads of its own.
 */

// ── Limits, all of them from the PRD and all of them configuration ────────────────────────────

/** The six prompts, in order. Copy lives in i18n under `passionMap.prompts.<id>`. */
export const PROMPTS = [
  'energy',
  'naturalReturn',
  'absorption',
  'contribution',
  'noJudgment',
  'meaningfulChange',
] as const;
export type PromptId = (typeof PROMPTS)[number];

/** Per prompt, and in all. Both are shown to the person — "1 of 2 here · 5 of 8 total". */
export const SPARKS_PER_PROMPT = 2;
export const SPARK_CAP = 8;
/** A Spark is a scannable label, not a journal entry. */
export const SPARK_MAX_CHARS = 20;
/** The Why note is where the meaning goes, so it gets room. */
export const WHY_MAX_CHARS = 300;
/** How many are carried into the map. */
export const NARROW_TO = { min: 3, max: 5 } as const;
/** Below this, the result is honestly labelled EARLY CLUES and nothing is synthesised. */
export const CLUSTERING_MINIMUM = 4;
/** Never more than four themes, and never a group invented to reach a minimum. */
export const MAX_THEMES = 4;

/** Live discovery. */
export const MOMENTS_PER_DAY = 3;
export const MOMENT_MAX_CHARS = SPARK_MAX_CHARS;
export const MOMENT_NOTE_MAX_CHARS = WHY_MAX_CHARS;
/** A proposal needs this much repetition, across this many separate days (PRD §7.3). */
export const PROPOSAL_MIN_SIGNALS = 3;
export const PROPOSAL_MIN_DAYS = 2;

/**
 * Count what a PERSON sees, not what UTF-16 stores.
 *
 * An emoji and a Hebrew letter with niqqud are each one character to the person holding the phone,
 * and `"👍".length` is 2. `Intl.Segmenter` is the correct answer and is not present in every Hermes
 * build, so this falls back to code points — still far better than `.length`, and never over-counts
 * an emoji as two.
 */
export function visibleLength(text: string): number {
  const Segmenter = (Intl as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<unknown> } })
    .Segmenter;
  if (Segmenter) {
    return [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
  }
  return [...text].length;
}

/** Trim, and reject whitespace-only. Returns null for anything not worth saving. */
export function cleanLabel(text: string, max = SPARK_MAX_CHARS): string | null {
  const clean = text.trim();
  if (clean.length === 0) return null;
  return visibleLength(clean) <= max ? clean : null;
}

// ── Initial discovery ─────────────────────────────────────────────────────────────────────────

export interface Spark {
  id: string;
  /** The person's own words, 1–20 visible characters. */
  text: string;
  /** Which prompt it came from, or a daily signal. Provenance, never shown as a category. */
  from: PromptId | 'daily';
  /** Optional. What about it draws them — up to 300 characters. */
  why?: string;
}

export interface Theme {
  id: string;
  /** The title. `suggested` until the person confirms or renames it. */
  title: string;
  suggested: boolean;
  sparkIds: readonly string[];
}

export interface PassionMapState {
  sparks: readonly Spark[];
  /** Which prompt is on screen, 0-based. */
  promptIndex: number;
  /** The three to five carried into the map. Empty until they narrow. */
  chosen: readonly string[];
  /** The arrangement. Empty until it is proposed. */
  themes: readonly Theme[];
  /** True once the person has pressed Save my map. Nothing is "the map" before that. */
  confirmed: boolean;
  /** Dated moments from live discovery. */
  signals: readonly DailySignal[];
  /**
   * WHAT THE RUN PRODUCED — computed once, when the run ends, and never quietly rewritten
   * (founder, 2026-08-25). Absent until the map is confirmed.
   */
  result?: PassionMapResult;
}

/**
 * The result of one run of the exercise.
 *
 * ── WHY A FROZEN RESULT AND NOT A LIVE ONE (founder, 2026-08-25) ───────────────────────────────
 *
 * The screen used to recompute everything on every render, which turned the map into something that
 * drifted underneath the person: patterns appeared and disappeared as days passed, and the refinement
 * proposals sat there with no way to accept them — the app noticing something out loud and offering
 * nothing to do about it.
 *
 * His decision removes the whole problem rather than adding the missing buttons: **the exercise ENDS
 * with a result. Running it again resets the result, and a new one is computed at the end of the new
 * run.** So there is nothing to accept, because a refinement is not a proposal to approve — it is
 * material the NEXT result is computed from.
 */
export interface PassionMapResult {
  /** When the run ended. */
  at: number;
  /** The arrangement as it stood at that moment. */
  themes: readonly Theme[];
  /**
   * What the days between this run and the previous one said. Empty on a first run, which is not a
   * failure — it is a person who has not lived any days with the map yet.
   */
  refinements: readonly RefinementProposal[];
  /** True when the run was too thin to be more than early clues (§: honest labelling). */
  earlyClues: boolean;
}

export function startMap(): PassionMapState {
  return { sparks: [], promptIndex: 0, chosen: [], themes: [], confirmed: false, signals: [] };
}

export function currentPrompt(state: PassionMapState): PromptId | null {
  return PROMPTS[state.promptIndex] ?? null;
}

/** How many Sparks came from the prompt on screen. */
export function sparksFromPrompt(state: PassionMapState, prompt: PromptId): Spark[] {
  return state.sparks.filter((s) => s.from === prompt);
}

/** Whether another Spark can be added right now, and which cap says no. */
export function capReached(state: PassionMapState, prompt: PromptId): 'prompt' | 'total' | null {
  if (state.sparks.length >= SPARK_CAP) return 'total';
  if (sparksFromPrompt(state, prompt).length >= SPARKS_PER_PROMPT) return 'prompt';
  return null;
}

/** Add a Spark. Refuses silently at a cap or on bad text — the screen owns telling them why. */
export function addSpark(
  state: PassionMapState,
  prompt: PromptId,
  text: string,
  why?: string,
): PassionMapState {
  if (capReached(state, prompt)) return state;
  const clean = cleanLabel(text);
  if (!clean) return state;
  const spark: Spark = {
    id: `spark-${state.sparks.length}-${prompt}`,
    text: clean,
    from: prompt,
    ...(why?.trim() ? { why: why.trim().slice(0, WHY_MAX_CHARS) } : {}),
  };
  return { ...state, sparks: [...state.sparks, spark] };
}

export function removeSpark(state: PassionMapState, id: string): PassionMapState {
  return {
    ...state,
    sparks: state.sparks.filter((s) => s.id !== id),
    chosen: state.chosen.filter((c) => c !== id),
    themes: state.themes.map((t) => ({ ...t, sparkIds: t.sparkIds.filter((s) => s !== id) })),
  };
}

/** Write, replace or clear a Why note. */
export function setWhy(state: PassionMapState, id: string, why: string): PassionMapState {
  const clean = why.trim().slice(0, WHY_MAX_CHARS);
  return {
    ...state,
    sparks: state.sparks.map((s) =>
      s.id === id ? { ...s, ...(clean ? { why: clean } : { why: undefined }) } : s,
    ),
  };
}

export function nextPrompt(state: PassionMapState): PassionMapState {
  return { ...state, promptIndex: Math.min(state.promptIndex + 1, PROMPTS.length) };
}

export function previousPrompt(state: PassionMapState): PassionMapState {
  // Back never loses a later answer: prompts are a position, and the Sparks are the state.
  return { ...state, promptIndex: Math.max(state.promptIndex - 1, 0) };
}

/** Carry three to five forward. Anything beyond the cap, or unknown, is ignored. */
export function narrow(state: PassionMapState, ids: readonly string[]): PassionMapState {
  const known = new Set(state.sparks.map((s) => s.id));
  return { ...state, chosen: ids.filter((id) => known.has(id)).slice(0, NARROW_TO.max) };
}

/** True when the result must be labelled EARLY CLUES rather than a map (PRD §6.3). */
export function isEarlyClues(state: PassionMapState): boolean {
  return state.chosen.length < CLUSTERING_MINIMUM;
}

/**
 * Propose an arrangement, DETERMINISTICALLY — the PRD is explicit that the whole flow must work
 * without AI and offline (§6.5, §12).
 *
 * The rule is deliberately dull and explainable: group the chosen Sparks in the order they were
 * chosen, into as few groups as keeps each one small, and give every group a `suggested` title the
 * person is expected to rewrite. It does not pretend to understand what the words mean — a grouping
 * that claimed to would be exactly the objective-sounding synthesis the founder does not want.
 *
 * **It never invents a group to reach a minimum**, and it never produces more than four.
 */
export function proposeThemes(state: PassionMapState, titleFor: (spark: Spark) => string): Theme[] {
  const chosen = state.chosen
    .map((id) => state.sparks.find((s) => s.id === id))
    .filter((s): s is Spark => s !== undefined);
  if (chosen.length === 0) return [];

  // Two per group keeps a theme readable and keeps the count inside four for five Sparks.
  const perGroup = chosen.length <= MAX_THEMES ? 1 : 2;
  const themes: Theme[] = [];
  for (let i = 0; i < chosen.length; i += perGroup) {
    const members = chosen.slice(i, i + perGroup);
    themes.push({
      id: `theme-${themes.length}`,
      title: titleFor(members[0]),
      suggested: true,
      sparkIds: members.map((s) => s.id),
    });
  }
  return themes.slice(0, MAX_THEMES);
}

export function setThemes(state: PassionMapState, themes: readonly Theme[]): PassionMapState {
  return { ...state, themes };
}

/** Rename a theme. Renaming is what turns a suggestion into the person's own. */
export function renameTheme(state: PassionMapState, id: string, title: string): PassionMapState {
  const clean = title.trim();
  if (clean.length === 0) return state;
  return {
    ...state,
    themes: state.themes.map((t) => (t.id === id ? { ...t, title: clean, suggested: false } : t)),
  };
}

/** Move a Spark between themes, or out of all of them — ungrouped is allowed (PRD §6.5). */
export function moveSpark(
  state: PassionMapState,
  sparkId: string,
  toThemeId: string | null,
): PassionMapState {
  const stripped = state.themes.map((t) => ({
    ...t,
    sparkIds: t.sparkIds.filter((s) => s !== sparkId),
  }));
  const themes =
    toThemeId === null
      ? stripped
      : stripped.map((t) => (t.id === toThemeId ? { ...t, sparkIds: [...t.sparkIds, sparkId] } : t));
  // A theme emptied by the move stops existing; an empty group is not a theme.
  return { ...state, themes: themes.filter((t) => t.sparkIds.length > 0) };
}

/**
 * Save my map — the END of a run, and the only moment a result is computed.
 *
 * `carriedSignals` are the daily signals gathered since the LAST run. They are folded into this
 * result and deliberately not carried into the new map's `signals`: they have been spent, and
 * counting them again in the next result would let one good week keep voting forever.
 */
export function confirmMap(
  state: PassionMapState,
  at: number,
  carriedSignals: readonly DailySignal[] = [],
): PassionMapState {
  const forRefinement = carriedSignals.length > 0 ? { ...state, signals: carriedSignals } : state;
  return {
    ...state,
    confirmed: true,
    signals: [],
    result: {
      at,
      themes: state.themes,
      refinements: refinementProposals(forRefinement),
      earlyClues: isEarlyClues(state),
    },
  };
}

// ── Live discovery ────────────────────────────────────────────────────────────────────────────

export type Energy = 'drained' | 'neutral' | 'energized';
export type Pull = 'avoid' | 'maybe' | 'return';

export interface DailySignal {
  id: string;
  /** The LOCAL calendar day, as `YYYY-MM-DD`. Stored as the day, so travel never moves an entry. */
  day: string;
  text: string;
  energy: Energy;
  pull: Pull;
  /** Optional, up to 300 characters. */
  note?: string;
  /** The Spark it belongs to, when the person says. `undefined` is "not sure yet" and is fine. */
  sparkId?: string;
}

/** The local day of an instant, as the stored `YYYY-MM-DD`. */
export function localDay(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function signalsOn(state: PassionMapState, day: string): DailySignal[] {
  return state.signals.filter((s) => s.day === day);
}

export function addSignal(
  state: PassionMapState,
  input: Omit<DailySignal, 'id' | 'day'> & { at: number },
): PassionMapState {
  const day = localDay(input.at);
  if (signalsOn(state, day).length >= MOMENTS_PER_DAY) return state;
  const text = cleanLabel(input.text, MOMENT_MAX_CHARS);
  if (!text) return state;
  const signal: DailySignal = {
    id: `signal-${state.signals.length}-${day}`,
    day,
    text,
    energy: input.energy,
    pull: input.pull,
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, MOMENT_NOTE_MAX_CHARS) } : {}),
    ...(input.sparkId ? { sparkId: input.sparkId } : {}),
  };
  return { ...state, signals: [...state.signals, signal] };
}

/** What the map's caption says: "Based on X moments across Y days". */
export function evidenceCount(state: PassionMapState): { moments: number; days: number } {
  return { moments: state.signals.length, days: new Set(state.signals.map((s) => s.day)).size };
}

/**
 * A change the evidence would support — a PROPOSAL, never an applied change.
 *
 * `strengthen` is repeated energising-and-worth-returning evidence. `question` is repeated draining
 * evidence, and it deliberately does not propose removing anything: the PRD's rule, and the right
 * one, is that a passion that has become draining is a CHANGE to understand, not a mistake to
 * delete.
 */
export interface RefinementProposal {
  kind: 'strengthen' | 'question';
  /** The moment text the pattern is about. */
  subject: string;
  /** The signals behind it, so the proposal can always show its own evidence. */
  signalIds: readonly string[];
  days: number;
}

/**
 * Read the evidence. Conservative on purpose (PRD §7.3): a pattern needs at least three signals on
 * at least two different days, contradictory contexts are left visible rather than averaged, and an
 * absence of signals proposes nothing at all.
 */
export function refinementProposals(state: PassionMapState): RefinementProposal[] {
  const byText = new Map<string, DailySignal[]>();
  for (const signal of state.signals) {
    const key = signal.text.trim().toLocaleLowerCase();
    byText.set(key, [...(byText.get(key) ?? []), signal]);
  }

  const proposals: RefinementProposal[] = [];
  for (const signals of byText.values()) {
    const strengthening = signals.filter((s) => s.energy === 'energized' && s.pull === 'return');
    const draining = signals.filter((s) => s.energy === 'drained' && s.pull === 'avoid');

    for (const [kind, group] of [
      ['strengthen', strengthening],
      ['question', draining],
    ] as const) {
      const days = new Set(group.map((s) => s.day)).size;
      if (group.length >= PROPOSAL_MIN_SIGNALS && days >= PROPOSAL_MIN_DAYS) {
        proposals.push({
          kind,
          subject: group[0].text,
          signalIds: group.map((s) => s.id),
          days,
        });
      }
    }
  }
  return proposals;
}
