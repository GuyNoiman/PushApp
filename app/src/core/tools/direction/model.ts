/**
 * Direction Statement — one sentence about where a person is pointed, built from two drawers.
 *
 * **IT IS NOT A DREAM AND IT IS NOT A COMMITMENT** (founder, 2026-08-20). That sentence is the whole
 * design, not a disclaimer at the bottom of a screen. A Dream is something you are going after; a
 * commitment is something you owe. A direction is neither — it is a long-term reading of what pulls
 * you and what you bring, and its use is that a coach can later phrase SEVERAL different Dreams out
 * of it. So nothing here ever creates a Dream, this tool has no completion, and the copy never says
 * "your goal".
 *
 * ── THE TWO DRAWERS, AND WHERE THEIR CONTENTS COME FROM ─────────────────────────────────────────
 *
 * "What draws me" and "What I bring". The founder's design fills them from two other tools — a
 * Passion Map and Strength Evidence — **and neither of those exists yet.** Rather than wait for them
 * or invent them, a drawer is fed by CONTRIBUTORS: anything that can offer a short phrase with a
 * reason to believe it. Today that is
 *
 *   · the person's own typing, always, in both drawers;
 *   · their Values Clarification top five, which is exactly "what draws me" and is already built.
 *
 * When the Passion Map and Strength Evidence land they add themselves to this list and change
 * nothing else. That is why a chip carries its `source`: the founder's own values screen shows
 * "where these showed up — Passion Map 3, Strength Evidence 4, Life Wheel 2", and a tool that
 * forgets where a phrase came from can never draw that.
 *
 * ── FIVE PHRASINGS, WITHOUT A MODEL ────────────────────────────────────────────────────────────
 *
 * The drafts are TEMPLATES over the same chips, not generated text. Five arrangements of "what draws
 * me" and "what I bring" say genuinely different things — one leads with the pull, one with the
 * gift, one with the person it is for — and they cost nothing, work offline, and are identical every
 * time somebody comes back. A model here would be paying per sentence for variety a person can get
 * by tapping "next".
 *
 * SECURITY-PRIVACY G1: chips, ratings and glosses are ON-DEVICE ONLY.
 *
 * Pure TypeScript — no React, no i18n, no clock reads.
 */

/** Which drawer a phrase belongs in. */
export type Drawer = 'draws' | 'brings';

/**
 * Where a phrase came from. Kept so the tool can say "this showed up in three places", and so a
 * phrase a person typed is never presented back to them as something we worked out.
 */
export type ChipSource = 'user' | 'values' | 'passionMap' | 'strengthEvidence' | 'lifeWheel';

export interface Chip {
  /** Stable within a run. For a sourced chip this is the source's own key. */
  id: string;
  drawer: Drawer;
  /** The words on the chip, as they will appear in the sentence. */
  text: string;
  source: ChipSource;
}

/** How many chips a person may carry forward from each drawer. */
export const CHIPS_PER_DRAWER = 3;
/** The sentence's target length. A direction longer than this stops being sayable. */
export const WORD_TARGET = { min: 8, max: 12 } as const;
/** How many phrasings are offered. */
export const DRAFT_COUNT = 5;

/**
 * The five arrangements. `{draw}` is the pull, `{a}` and `{b}` are what they bring.
 *
 * They are i18n keys, not sentences: a direction has to be sayable in the person's own language, and
 * a template translated word for word from English is a sentence nobody would say out loud.
 */
export const DRAFT_TEMPLATES = [
  'leadWithPull', // I want to {draw} by using my {a} and {b}.
  'leadWithGift', // My {a} and {b} are for {draw}.
  'leadWithPerson', // I am at my best when my {a} helps somebody {draw}.
  'leadWithPractice', // I keep practising {a} so that I can {draw}.
  'leadWithPlain', // {draw}, with {a}.
] as const;
export type DraftTemplate = (typeof DRAFT_TEMPLATES)[number];

export interface DirectionState {
  /** Everything on offer, from every contributor plus anything typed. */
  chips: readonly Chip[];
  /** The ids carried forward from each drawer, in the order chosen. */
  chosen: Readonly<Record<Drawer, readonly string[]>>;
  /** Which of the five phrasings is in front of them. */
  draft: DraftTemplate;
  /** The sentence as it currently stands, once they have edited it. Empty ⇒ still the template's. */
  sentence: string;
  /** How alive it feels, 1–10. Absent until they answer. */
  aliveness?: number;
  /** What would make it a ten — their words, capped so it stays a thought and not an essay. */
  whatWouldMakeItTen?: string;
  /** What the important words mean to them, keyed by the word. */
  glosses: Readonly<Record<string, string>>;
}

/** The cap on "what would make it a 10", from the founder's design. */
export const THOUGHT_LIMIT = 120;

export function startDirection(chips: readonly Chip[]): DirectionState {
  return {
    chips,
    chosen: { draws: [], brings: [] },
    draft: DRAFT_TEMPLATES[0],
    sentence: '',
    glosses: {},
  };
}

/** Everything on offer in one drawer. */
export function drawerChips(state: DirectionState, drawer: Drawer): Chip[] {
  return state.chips.filter((c) => c.drawer === drawer);
}

/** Look one up. `undefined` for an id that is no longer offered. */
export function chipById(state: DirectionState, id: string): Chip | undefined {
  return state.chips.find((c) => c.id === id);
}

/**
 * Take a chip, or put it back. Choosing past the cap does nothing rather than silently dropping the
 * first one — a person who has three and taps a fourth should see nothing move, not watch their own
 * first choice disappear.
 */
export function toggleChip(state: DirectionState, drawer: Drawer, id: string): DirectionState {
  const current = state.chosen[drawer];
  if (current.includes(id)) {
    return { ...state, chosen: { ...state.chosen, [drawer]: current.filter((x) => x !== id) } };
  }
  if (current.length >= CHIPS_PER_DRAWER) return state;
  return { ...state, chosen: { ...state.chosen, [drawer]: [...current, id] } };
}

/** Add a phrase the person typed. It joins the drawer and can be chosen like anything else. */
export function addOwnChip(state: DirectionState, drawer: Drawer, text: string): DirectionState {
  const clean = text.trim();
  if (clean.length === 0) return state;
  const chip: Chip = { id: `user-${drawer}-${state.chips.length}`, drawer, text: clean, source: 'user' };
  return { ...state, chips: [...state.chips, chip] };
}

/** The chosen chips of one drawer, in the order chosen. */
export function chosenChips(state: DirectionState, drawer: Drawer): Chip[] {
  return state.chosen[drawer]
    .map((id) => chipById(state, id))
    .filter((c): c is Chip => c !== undefined);
}

/** Enough to build a sentence: one thing that draws you, and one you bring. */
export function canCompose(state: DirectionState): boolean {
  return chosenChips(state, 'draws').length >= 1 && chosenChips(state, 'brings').length >= 1;
}

/** The three slots a template fills. `b` is absent when only one strength was chosen. */
export interface DraftSlots {
  draw: string;
  a: string;
  b?: string;
}

export function slotsFor(state: DirectionState): DraftSlots | null {
  const draws = chosenChips(state, 'draws');
  const brings = chosenChips(state, 'brings');
  if (draws.length === 0 || brings.length === 0) return null;
  return {
    draw: draws[0].text,
    a: brings[0].text,
    ...(brings[1] ? { b: brings[1].text } : {}),
  };
}

/** Step through the phrasings. Wraps, so the carousel has no dead end. */
export function stepDraft(state: DirectionState, delta: number): DirectionState {
  const at = DRAFT_TEMPLATES.indexOf(state.draft);
  const next = (at + delta + DRAFT_TEMPLATES.length) % DRAFT_TEMPLATES.length;
  // Moving to another phrasing abandons an edit of the old one: the edit was OF that sentence.
  return { ...state, draft: DRAFT_TEMPLATES[next], sentence: '' };
}

export function rateAliveness(state: DirectionState, score: number): DirectionState {
  return { ...state, aliveness: Math.min(10, Math.max(1, Math.round(score))) };
}

export function noteWhatWouldMakeItTen(state: DirectionState, text: string): DirectionState {
  return { ...state, whatWouldMakeItTen: text.slice(0, THOUGHT_LIMIT) };
}

/** Set the sentence, once it has been edited or trimmed. */
export function setSentence(state: DirectionState, text: string): DirectionState {
  return { ...state, sentence: text };
}

/** Say what one of the important words means to them. */
export function gloss(state: DirectionState, word: string, meaning: string): DirectionState {
  const clean = meaning.trim();
  const glosses = { ...state.glosses };
  if (clean.length === 0) delete glosses[word];
  else glosses[word] = clean;
  return { ...state, glosses };
}

/**
 * The words worth explaining: the chips themselves.
 *
 * Not every word in the sentence — "using" and "and" mean the same to everybody. A chip is a word
 * somebody chose, which is exactly the kind that means something different to each person, and is
 * the reason the gloss step exists at all.
 */
export function importantWords(state: DirectionState): string[] {
  return [...chosenChips(state, 'draws'), ...chosenChips(state, 'brings')].map((c) => c.text);
}

export function wordCount(sentence: string): number {
  return sentence.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/** Whether it is inside the target. Outside is allowed — it is a nudge, never a gate. */
export function withinTarget(sentence: string): boolean {
  const n = wordCount(sentence);
  return n >= WORD_TARGET.min && n <= WORD_TARGET.max;
}
