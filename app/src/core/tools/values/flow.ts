/**
 * Values Clarification — the ladder from a deck of cards down to five values in order, and the gap
 * between what somebody says matters and how they are actually living.
 *
 * ── THE SHAPE, WHICH IS THE FOUNDER'S ──────────────────────────────────────────────────────────
 *
 *   sort → reduce → (reduce again, deep only) → rank → presence → done
 *
 * A person cannot rank sixty things and cannot honestly rank twenty. They CAN say yes or no to one
 * card at a time, and they can choose between five. So the tool never asks a question the mind
 * cannot answer: it narrows by repeated easy decisions until the hard one is small enough to make.
 *
 * **Quick** (five minutes): 15 cards, TWO buckets, straight to five. **Deep** (fifteen to twenty):
 * 65 cards, THREE buckets, down through twenty and ten before five. The extra rung is the whole
 * difference — with sixty cards, "the ones I said yes to" is still thirty, and choosing five out of
 * thirty is the same impossible question as choosing five out of sixty.
 *
 * **Two buckets in the quick pass, three in the deep one, and that is deliberate** (founder): three
 * grades slow the sort down, and the pace IS the product in a five-minute tool. Over twenty minutes
 * the middle grade earns its place, because it is what stops everything drifting into "important".
 *
 * ── THE PART THAT MAKES IT MORE THAN A SORTING GAME ────────────────────────────────────────────
 *
 * The last step asks, of the top three only: **how present is this in your life today?** That turns
 * a list into a finding. A list of values is a self-portrait; the DISTANCE between "this is my
 * first value" and "it is a three out of ten in my life" is the thing a person can actually act on,
 * and the thing a coach can use. It is the same instinct as the Life Wheel's second question, and
 * for the same reason.
 *
 * "NOW" IS LOAD-BEARING COPY, everywhere. Values reorder with a season, and a tool that presents
 * them as a permanent identity makes taking it again feel like an admission rather than an update.
 *
 * SECURITY-PRIVACY G1: on-device only. What somebody's five values are, and how far they feel from
 * them, is not ours.
 *
 * Pure TypeScript — no React, no i18n, no clock reads.
 */
import { CUSTOM_VALUE_KEY, QUICK_POOL, VALUE_POOL, shuffled, type ValueCard } from './catalog';

/** Which pass a person is taking. */
export type ValuesDepth = 'quick' | 'deep';

/**
 * Where a card lands when it is sorted.
 *
 * THE GESTURES ARE THE FOUNDER'S CORRECTION to his own design: **right = very important, left = not
 * for me now, down = somewhere in between.** Recorded here rather than in the screen because a
 * direction is a meaning, and a screen that owns it is a screen that can quietly change it.
 */
export type Bucket = 'core' | 'maybe' | 'notNow';

export const BUCKET_GESTURE: Record<Bucket, 'right' | 'down' | 'left'> = {
  core: 'right',
  maybe: 'down',
  notNow: 'left',
};

/** The rungs of the ladder, per depth. Each is "narrow to at most this many". */
export const LADDER: Record<ValuesDepth, readonly number[]> = {
  // Fifteen cards and at most seven kept means the first reduction is already nearly there.
  quick: [5],
  deep: [20, 10, 5],
};

/** How many values a person ends with, in order. The one number both passes share. */
export const FINAL_COUNT = 5;
/** How many of the final list are asked the presence question. Three, because five is a survey. */
export const PRESENCE_COUNT = 3;
/** The quick pass caps what can be kept, to force a real choice at the sort rather than after it. */
export const QUICK_KEEP_CAP = 7;

/** Where the flow is. */
export type ValuesStage = 'sort' | 'reduce' | 'rank' | 'presence' | 'done';

/** A value the person wrote themselves. Name and meaning are theirs; nothing is authored for it. */
export interface CustomValue {
  name: string;
  meaning?: string;
}

export interface ValuesState {
  depth: ValuesDepth;
  /** Fixes the deck order for this run, so leaving and coming back meets the same cards. */
  seed: number;
  /** How each sorted card landed. Unsorted cards are absent. */
  buckets: Readonly<Record<string, Bucket>>;
  /** The survivors of each completed reduction, most recent last. */
  reductions: readonly (readonly string[])[];
  /** The final five, in the person's own order. Empty until they have ranked. */
  ranked: readonly string[];
  /** How present each of the top three feels today, 1–10. */
  presence: Readonly<Record<string, number>>;
  /** Their own value, if they added one. */
  custom?: CustomValue;
}

export function startValues(depth: ValuesDepth, seed: number): ValuesState {
  return { depth, seed, buckets: {}, reductions: [], ranked: [], presence: {} };
}

/** The deck for this run, in its fixed order, with the person's own value last if they added one. */
export function deck(state: ValuesState): ValueCard[] {
  const pool = state.depth === 'quick' ? QUICK_POOL : VALUE_POOL;
  const cards = shuffled(pool, state.seed);
  // Their own value is always last: it is offered after they have seen what we had, so it is an
  // addition to the pool rather than an escape from reading it.
  if (state.custom) cards.push({ key: CUSTOM_VALUE_KEY, category: 'self' });
  return cards;
}

/** The next card to sort, or null when the deck is done. */
export function nextCard(state: ValuesState): ValueCard | null {
  return deck(state).find((card) => state.buckets[card.key] === undefined) ?? null;
}

export function sortCard(state: ValuesState, key: string, bucket: Bucket): ValuesState {
  return { ...state, buckets: { ...state.buckets, [key]: bucket } };
}

/** Take back the last card sorted. Undo is on the screen because a swipe is easy to misfire. */
export function undoSort(state: ValuesState, key: string): ValuesState {
  const buckets = { ...state.buckets };
  delete buckets[key];
  return { ...state, buckets };
}

/** Add the person's own value. It joins the deck and is sorted like any other card. */
export function addCustom(state: ValuesState, custom: CustomValue): ValuesState {
  return { ...state, custom: { name: custom.name.trim(), meaning: custom.meaning?.trim() } };
}

/**
 * Everything that survived the sort, in deck order.
 *
 * `core` first, then `maybe` — so the reduction screen opens with what the person was most sure
 * about, and the middle bucket is what they cut from if they have to.
 */
export function kept(state: ValuesState): string[] {
  const order = deck(state).map((c) => c.key);
  const inBucket = (b: Bucket) => order.filter((k) => state.buckets[k] === b);
  return [...inBucket('core'), ...inBucket('maybe')];
}

/** What the person is choosing from at this rung: the previous rung's survivors, or the sort's. */
export function candidates(state: ValuesState): string[] {
  return state.reductions.length > 0 ? [...state.reductions[state.reductions.length - 1]] : kept(state);
}

/** How many they must narrow to now, or null when there is no reduction left. */
export function targetCount(state: ValuesState): number | null {
  const rungs = LADDER[state.depth];
  return state.reductions.length < rungs.length ? rungs[state.reductions.length] : null;
}

/** Record one reduction. Extra choices beyond the target are ignored rather than silently accepted. */
export function reduceTo(state: ValuesState, chosen: readonly string[]): ValuesState {
  const target = targetCount(state);
  if (target === null) return state;
  const allowed = candidates(state);
  const clean = chosen.filter((k) => allowed.includes(k)).slice(0, target);
  return { ...state, reductions: [...state.reductions, clean] };
}

/** Fix the final order. Only the last reduction's survivors may be ranked. */
export function rank(state: ValuesState, order: readonly string[]): ValuesState {
  const allowed = candidates(state);
  return { ...state, ranked: order.filter((k) => allowed.includes(k)).slice(0, FINAL_COUNT) };
}

/** The values the presence question is asked about — the top three, in order. */
export function presenceTargets(state: ValuesState): string[] {
  return state.ranked.slice(0, PRESENCE_COUNT);
}

export function setPresence(state: ValuesState, key: string, score: number): ValuesState {
  const clamped = Math.min(10, Math.max(1, Math.round(score)));
  return { ...state, presence: { ...state.presence, [key]: clamped } };
}

/** Which stage the flow is in, derived from the state rather than stored beside it. */
export function stageOf(state: ValuesState): ValuesStage {
  if (nextCard(state) !== null) return 'sort';
  if (targetCount(state) !== null) return 'reduce';
  if (state.ranked.length < Math.min(FINAL_COUNT, candidates(state).length)) return 'rank';
  if (presenceTargets(state).some((k) => state.presence[k] === undefined)) return 'presence';
  return 'done';
}

// ── The result ────────────────────────────────────────────────────────────────────────────────

export interface ValueStanding {
  key: string;
  /** 1-based position in the final list. */
  position: number;
  /** How present it feels today, 1–10. Absent for anything below the top three. */
  presence?: number;
  /** How far it is from being lived, for the top three. Higher is further. */
  gap?: number;
}

export interface ValuesResult {
  values: ValueStanding[];
  /** The top three, which are the ones with a presence score. */
  top: ValueStanding[];
  /** The one furthest from being lived. Null when nothing is far, which is a real answer. */
  widestGap: ValueStanding | null;
}

/** The gap has to be at least this wide to be worth naming, like the Life Wheel's. */
export const NOTABLE_GAP = 3;

/** Read the finished flow. `null` while it is unfinished — a partial reading names the wrong value. */
export function readValues(state: ValuesState): ValuesResult | null {
  if (stageOf(state) !== 'done') return null;

  const values: ValueStanding[] = state.ranked.map((key, index) => {
    const presence = state.presence[key];
    return {
      key,
      position: index + 1,
      ...(presence !== undefined
        ? // A first value living at 3 is further from being lived than a third value at 3, so the
          // gap is weighted by position: distance from ten, scaled by how high they placed it.
          { presence, gap: Math.round((10 - presence) * (1 - index * 0.15)) }
        : {}),
    };
  });

  const top = values.filter((v) => v.presence !== undefined);
  const widest = [...top].sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0];
  return {
    values,
    top,
    widestGap: widest && (widest.gap ?? 0) >= NOTABLE_GAP ? widest : null,
  };
}
