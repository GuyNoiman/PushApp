/**
 * Passion Map — the engine, against `04_Product/PRD/Passion_Map_PRD.md`.
 *
 * Almost everything here is a way of saying ONE thing: the user stays the author. Nothing is written
 * into the map by the app, nothing is invented to fill a gap, no single day changes anything, and
 * nothing is ever deleted on the person's behalf. The PRD's acceptance criteria are the shape of
 * this file.
 */
import {
  CLUSTERING_MINIMUM,
  MAX_THEMES,
  MOMENTS_PER_DAY,
  NARROW_TO,
  PROMPTS,
  PROPOSAL_MIN_DAYS,
  PROPOSAL_MIN_SIGNALS,
  SPARKS_PER_PROMPT,
  SPARK_CAP,
  SPARK_MAX_CHARS,
  WHY_MAX_CHARS,
  addSignal,
  addSpark,
  capReached,
  cleanLabel,
  confirmMap,
  evidenceCount,
  isEarlyClues,
  localDay,
  moveSpark,
  narrow,
  nextPrompt,
  previousPrompt,
  proposeThemes,
  refinementProposals,
  removeSpark,
  renameTheme,
  setThemes,
  setWhy,
  sparksFromPrompt,
  startMap,
  visibleLength,
  type PassionMapState,
} from '../model';

const DAY = 24 * 60 * 60 * 1000;
const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();
const title = () => 'Suggested';

/** Fill the whole run with `n` sparks, spread across the prompts. */
function withSparks(n: number): PassionMapState {
  let s = startMap();
  let i = 0;
  for (const prompt of PROMPTS) {
    for (let k = 0; k < SPARKS_PER_PROMPT && i < n; k += 1, i += 1) {
      s = addSpark(s, prompt, `spark ${i}`);
    }
  }
  return s;
}

describe('the limits are the PRD’s', () => {
  it('is six prompts, two each, eight in all', () => {
    expect(PROMPTS).toHaveLength(6);
    expect(SPARKS_PER_PROMPT).toBe(2);
    expect(SPARK_CAP).toBe(8);
  });

  it('narrows to three to five, and calls anything under four early clues', () => {
    expect(NARROW_TO).toEqual({ min: 3, max: 5 });
    expect(CLUSTERING_MINIMUM).toBe(4);
  });

  it('needs three signals across two days before anything is proposed', () => {
    expect(PROPOSAL_MIN_SIGNALS).toBe(3);
    expect(PROPOSAL_MIN_DAYS).toBe(2);
  });
});

describe('a Spark is what a person sees, not what UTF-16 stores', () => {
  it('counts an emoji as one character', () => {
    expect(visibleLength('👍')).toBe(1);
    expect('👍'.length).toBe(2); // the bug this exists to avoid
  });

  it('accepts exactly twenty and refuses twenty-one', () => {
    expect(cleanLabel('a'.repeat(SPARK_MAX_CHARS))).toHaveLength(SPARK_MAX_CHARS);
    expect(cleanLabel('a'.repeat(SPARK_MAX_CHARS + 1))).toBeNull();
  });

  it('trims, and refuses whitespace alone', () => {
    expect(cleanLabel('  writing  ')).toBe('writing');
    expect(cleanLabel('   ')).toBeNull();
  });
});

describe('collecting', () => {
  it('stops at two on one prompt, and says which cap it was', () => {
    let s = startMap();
    s = addSpark(s, 'energy', 'one');
    s = addSpark(s, 'energy', 'two');

    expect(capReached(s, 'energy')).toBe('prompt');
    s = addSpark(s, 'energy', 'three');
    expect(sparksFromPrompt(s, 'energy')).toHaveLength(2);

    // Another prompt is still open — the per-prompt cap is not the total.
    expect(capReached(s, 'absorption')).toBeNull();
  });

  it('stops at eight overall', () => {
    const s = withSparks(SPARK_CAP);
    expect(s.sparks).toHaveLength(SPARK_CAP);
    expect(capReached(s, 'meaningfulChange')).toBe('total');
  });

  it('going back never loses a later answer', () => {
    let s = withSparks(4);
    const before = s.sparks.length;
    s = previousPrompt(nextPrompt(s));
    expect(s.sparks).toHaveLength(before);
  });

  it('keeps a Why note optional, and lets it be cleared', () => {
    let s = addSpark(startMap(), 'energy', 'writing');
    const id = s.sparks[0].id;
    expect(s.sparks[0].why).toBeUndefined();

    s = setWhy(s, id, '  it is the only hour nobody wants anything  ');
    expect(s.sparks[0].why).toBe('it is the only hour nobody wants anything');

    s = setWhy(s, id, '   ');
    expect(s.sparks[0].why).toBeUndefined();
  });

  it('caps a Why note without truncating the Spark', () => {
    let s = addSpark(startMap(), 'energy', 'writing');
    s = setWhy(s, s.sparks[0].id, 'x'.repeat(WHY_MAX_CHARS + 50));
    expect(s.sparks[0].why).toHaveLength(WHY_MAX_CHARS);
    expect(s.sparks[0].text).toBe('writing');
  });

  it('removing a Spark takes it out of the choice and the arrangement too', () => {
    let s = withSparks(4);
    const id = s.sparks[0].id;
    s = narrow(s, s.sparks.map((x) => x.id));
    s = setThemes(s, proposeThemes(s, title));

    s = removeSpark(s, id);

    expect(s.sparks.some((x) => x.id === id)).toBe(false);
    expect(s.chosen).not.toContain(id);
    expect(s.themes.some((t) => t.sparkIds.includes(id))).toBe(false);
  });
});

describe('narrowing, and refusing to invent', () => {
  it('carries at most five', () => {
    const s = narrow(withSparks(8), withSparks(8).sparks.map((x) => x.id));
    expect(s.chosen).toHaveLength(NARROW_TO.max);
  });

  it('ignores an id that is not a Spark', () => {
    const s = narrow(withSparks(4), ['nope']);
    expect(s.chosen).toEqual([]);
  });

  it('calls three or fewer EARLY CLUES and proposes nothing beyond them', () => {
    let s = withSparks(3);
    s = narrow(s, s.sparks.map((x) => x.id));

    expect(isEarlyClues(s)).toBe(true);
    // Three Sparks produce at most three groups — never a fourth invented to look complete.
    expect(proposeThemes(s, title).length).toBeLessThanOrEqual(3);
  });

  it('proposes nothing at all from nothing', () => {
    expect(proposeThemes(startMap(), title)).toEqual([]);
  });

  it('never proposes more than four themes', () => {
    let s = withSparks(8);
    s = narrow(s, s.sparks.map((x) => x.id));
    expect(proposeThemes(s, title).length).toBeLessThanOrEqual(MAX_THEMES);
  });

  it('marks every proposed title as SUGGESTED until the person renames it', () => {
    let s = withSparks(5);
    s = narrow(s, s.sparks.map((x) => x.id));
    s = setThemes(s, proposeThemes(s, title));

    expect(s.themes.every((t) => t.suggested)).toBe(true);

    s = renameTheme(s, s.themes[0].id, 'Making things');
    expect(s.themes[0]).toMatchObject({ title: 'Making things', suggested: false });
  });

  it('refuses to rename a theme to nothing', () => {
    let s = withSparks(5);
    s = narrow(s, s.sparks.map((x) => x.id));
    s = setThemes(s, proposeThemes(s, title));
    const before = s.themes[0].title;

    expect(renameTheme(s, s.themes[0].id, '   ').themes[0].title).toBe(before);
  });
});

describe('arranging', () => {
  const arranged = () => {
    let s = withSparks(5);
    s = narrow(s, s.sparks.map((x) => x.id));
    return setThemes(s, proposeThemes(s, title));
  };

  it('moves a Spark between themes', () => {
    let s = arranged();
    const [from, to] = s.themes;
    const spark = from.sparkIds[0];

    s = moveSpark(s, spark, to.id);

    expect(s.themes.find((t) => t.id === to.id)!.sparkIds).toContain(spark);
    expect(s.themes.find((t) => t.id === from.id)?.sparkIds ?? []).not.toContain(spark);
  });

  it('allows a Spark to be left ungrouped', () => {
    let s = arranged();
    const spark = s.themes[0].sparkIds[0];
    s = moveSpark(s, spark, null);
    expect(s.themes.some((t) => t.sparkIds.includes(spark))).toBe(false);
  });

  it('drops a theme the move emptied, because an empty group is not a theme', () => {
    let s = arranged();
    const single = s.themes.find((t) => t.sparkIds.length === 1);
    if (!single) return;
    const count = s.themes.length;

    s = moveSpark(s, single.sparkIds[0], null);
    expect(s.themes).toHaveLength(count - 1);
  });

  it('nothing is the map until Save my map', () => {
    const s = arranged();
    expect(s.confirmed).toBe(false);
    expect(confirmMap(s, NOON).confirmed).toBe(true);
  });

  it('Save my map is the END of the run: it computes the result, once', () => {
    // The founder's model (2026-08-25): the exercise ends with a result, and running it again
    // recomputes one at the end of the NEW run. So the result is a thing the run produced, not a
    // live derivation that drifts underneath somebody between two openings of the same screen.
    const s = confirmMap(arranged(), NOON);
    expect(s.result?.at).toBe(NOON);
    expect(s.result?.themes).toEqual(s.themes);
    expect(s.result?.refinements).toEqual([]); // a first run has lived no days yet
  });

  it('folds the days since the last run into the new result, and spends them', () => {
    // Three signals about the same thing across two days is the pattern threshold.
    let carried = startMap();
    const day = 24 * 60 * 60 * 1000;
    carried = addSignal(carried, { text: 'teaching', energy: 'energized', pull: 'return', at: NOON });
    carried = addSignal(carried, { text: 'teaching', energy: 'energized', pull: 'return', at: NOON + 60_000 });
    carried = addSignal(carried, { text: 'teaching', energy: 'energized', pull: 'return', at: NOON + day });

    const s = confirmMap(arranged(), NOON + 2 * day, carried.signals);

    expect(s.result?.refinements.map((r) => r.subject)).toEqual(['teaching']);
    // Spent: they shaped this result and do not vote again in the next one.
    expect(s.signals).toEqual([]);
  });
});

describe('live discovery keeps energy and pull apart', () => {
  const draining = { energy: 'drained', pull: 'return' } as const;

  it('records an exhausting thing that is still worth returning to', () => {
    // Collapse these into one score and the tool can no longer tell them apart.
    const s = addSignal(startMap(), { text: 'teaching', ...draining, at: NOON });
    expect(s.signals[0]).toMatchObject({ energy: 'drained', pull: 'return' });
  });

  it('takes at most three moments a day', () => {
    let s = startMap();
    for (let i = 0; i < MOMENTS_PER_DAY + 2; i += 1) {
      s = addSignal(s, { text: `m${i}`, energy: 'neutral', pull: 'maybe', at: NOON });
    }
    expect(s.signals).toHaveLength(MOMENTS_PER_DAY);
  });

  it('stamps the LOCAL day, so travel never moves an entry', () => {
    const late = new Date(2026, 7, 20, 23, 30).getTime();
    expect(localDay(late)).toBe('2026-08-20');
  });

  it('counts the caption’s moments and days', () => {
    let s = addSignal(startMap(), { text: 'a', energy: 'energized', pull: 'return', at: NOON });
    s = addSignal(s, { text: 'b', energy: 'neutral', pull: 'maybe', at: NOON + DAY });

    expect(evidenceCount(s)).toEqual({ moments: 2, days: 2 });
  });

  it('allows "not sure yet" — a moment need not belong to a Spark', () => {
    const s = addSignal(startMap(), { text: 'a walk', energy: 'energized', pull: 'return', at: NOON });
    expect(s.signals[0].sparkId).toBeUndefined();
  });
});

describe('what the evidence is allowed to propose', () => {
  /** `n` identical signals, spread one per day. */
  function repeat(text: string, n: number, energy: 'energized' | 'drained', spreadDays: number) {
    let s = startMap();
    for (let i = 0; i < n; i += 1) {
      s = addSignal(s, {
        text,
        energy,
        pull: energy === 'energized' ? 'return' : 'avoid',
        at: NOON + (i % spreadDays) * DAY,
      });
    }
    return s;
  }

  it('proposes NOTHING from a single signal', () => {
    expect(refinementProposals(repeat('teaching', 1, 'energized', 1))).toEqual([]);
  });

  it('proposes nothing from three signals on ONE day', () => {
    // One good Tuesday is not evidence about a life.
    expect(refinementProposals(repeat('teaching', 3, 'energized', 1))).toEqual([]);
  });

  it('proposes strengthening once the pattern repeats across days', () => {
    const proposals = refinementProposals(repeat('teaching', 3, 'energized', 3));
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({ kind: 'strengthen', subject: 'teaching', days: 3 });
  });

  it('proposes a QUESTION for repeated draining evidence, never a deletion', () => {
    const proposals = refinementProposals(repeat('reporting', 3, 'drained', 3));
    expect(proposals[0].kind).toBe('question');
    // A passion that has become draining is a change to understand, not a mistake to delete.
    expect(proposals.some((p) => (p.kind as string) === 'delete')).toBe(false);
  });

  it('treats absence as nothing at all', () => {
    expect(refinementProposals(startMap())).toEqual([]);
  });

  it('keeps a contradiction visible instead of averaging it away', () => {
    let s = repeat('creating', 3, 'energized', 3);
    // Twenty characters exactly — the cap is real, and a longer label here silently records nothing.
    for (let i = 0; i < 3; i += 1) {
      s = addSignal(s, { text: 'creating on deadline', energy: 'drained', pull: 'avoid', at: NOON + i * DAY });
    }

    const kinds = refinementProposals(s).map((p) => p.kind).sort();
    expect(kinds).toEqual(['question', 'strengthen']);
  });

  it('carries its own evidence, so a proposal can always show why', () => {
    const proposal = refinementProposals(repeat('teaching', 3, 'energized', 3))[0];
    expect(proposal.signalIds).toHaveLength(3);
  });
});
