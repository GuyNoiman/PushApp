/**
 * Values Clarification — the ladder from a deck of cards to five values in order.
 *
 * What is worth protecting: a person can never be asked a question their mind cannot answer. Nobody
 * ranks sixty things, and nobody honestly ranks twenty — so the flow narrows by repeated easy
 * decisions until the hard one is small enough to make, and the rungs are different for a
 * five-minute pass and a twenty-minute one.
 */
import { CUSTOM_VALUE_KEY, QUICK_POOL, VALUE_POOL, findValue, shuffled } from '../catalog';
import {
  BUCKET_GESTURE,
  FINAL_COUNT,
  LADDER,
  NOTABLE_GAP,
  PRESENCE_COUNT,
  addCustom,
  candidates,
  deck,
  kept,
  nextCard,
  rank,
  readValues,
  reduceTo,
  setPresence,
  sortCard,
  stageOf,
  startValues,
  targetCount,
  undoSort,
  type Bucket,
  type ValuesState,
} from '../flow';

const SEED = 12345;

/** Sort the whole deck, cycling through the given buckets. */
function sortAll(state: ValuesState, buckets: Bucket[]): ValuesState {
  let s = state;
  let i = 0;
  for (;;) {
    const card = nextCard(s);
    if (!card) return s;
    s = sortCard(s, card.key, buckets[i % buckets.length]);
    i += 1;
  }
}

describe('the pool', () => {
  it('has sixty-five values, fifteen of them in the quick pool', () => {
    expect(VALUE_POOL).toHaveLength(65);
    expect(QUICK_POOL).toHaveLength(15);
  });

  it('has unique keys, so a stored choice can never mean two values', () => {
    const keys = VALUE_POOL.map((v) => v.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('names no OUTCOME as a value', () => {
    // Money, success, status, comfort, a home. Each is a result or an area of life, and each hides
    // the actual driver — which is why security, independence, freedom and stability are in by name.
    const keys = new Set(VALUE_POOL.map((v) => v.key));
    for (const outcome of ['money', 'success', 'status', 'comfort', 'home']) {
      expect(keys.has(outcome)).toBe(false);
    }
    for (const driver of ['independence', 'freedom', 'stability', 'contribution']) {
      expect(keys.has(driver)).toBe(true);
    }
  });

  it('shuffles from a seed, so leaving and returning meets the same deck', () => {
    expect(shuffled(VALUE_POOL, SEED).map((v) => v.key)).toEqual(
      shuffled(VALUE_POOL, SEED).map((v) => v.key),
    );
    expect(shuffled(VALUE_POOL, SEED)[0].key).not.toBe(shuffled(VALUE_POOL, SEED + 1)[0].key);
  });

  it('does not present the deck in category order', () => {
    // Ten "independence" values in a row make the eleventh card feel like a change of subject.
    const first = shuffled(VALUE_POOL, SEED).slice(0, 8).map((v) => v.category);
    expect(new Set(first).size).toBeGreaterThan(1);
  });
});

describe('the gestures are the founder’s correction, and they live in the model', () => {
  it('sends right to very important and left to not for me now', () => {
    expect(BUCKET_GESTURE).toEqual({ core: 'right', maybe: 'down', notNow: 'left' });
  });
});

describe('the ladder', () => {
  it('is one rung for the quick pass and three for the deep one', () => {
    // With sixty cards, "the ones I said yes to" is still thirty, and choosing five out of thirty is
    // the same impossible question as choosing five out of sixty.
    expect(LADDER.quick).toEqual([5]);
    expect(LADDER.deep).toEqual([20, 10, 5]);
  });

  it('walks sort → reduce → rank → presence → done', () => {
    let s = startValues('quick', SEED);
    expect(stageOf(s)).toBe('sort');

    s = sortAll(s, ['core']);
    expect(stageOf(s)).toBe('reduce');
    expect(targetCount(s)).toBe(5);

    s = reduceTo(s, kept(s).slice(0, 5));
    expect(stageOf(s)).toBe('rank');

    s = rank(s, candidates(s));
    expect(stageOf(s)).toBe('presence');

    for (const key of s.ranked.slice(0, PRESENCE_COUNT)) s = setPresence(s, key, 6);
    expect(stageOf(s)).toBe('done');
  });

  it('takes the deep pass down through twenty and ten', () => {
    let s = sortAll(startValues('deep', SEED), ['core']);

    expect(targetCount(s)).toBe(20);
    s = reduceTo(s, kept(s).slice(0, 20));
    expect(targetCount(s)).toBe(10);
    s = reduceTo(s, candidates(s).slice(0, 10));
    expect(targetCount(s)).toBe(5);
    s = reduceTo(s, candidates(s).slice(0, 5));

    expect(targetCount(s)).toBeNull();
    expect(stageOf(s)).toBe('rank');
  });
});

describe('sorting', () => {
  it('offers each card once and keeps its place through an undo', () => {
    let s = startValues('quick', SEED);
    const first = nextCard(s)!;
    s = sortCard(s, first.key, 'core');

    expect(nextCard(s)?.key).not.toBe(first.key);

    s = undoSort(s, first.key);
    expect(nextCard(s)?.key).toBe(first.key);
  });

  it('keeps core before maybe, so a reduction starts from what they were surest about', () => {
    let s = startValues('quick', SEED);
    const cards = deck(s);
    s = sortCard(s, cards[0].key, 'maybe');
    s = sortCard(s, cards[1].key, 'core');
    for (const card of cards.slice(2)) s = sortCard(s, card.key, 'notNow');

    expect(kept(s)).toEqual([cards[1].key, cards[0].key]);
  });

  it('drops everything in "not for me now"', () => {
    const s = sortAll(startValues('quick', SEED), ['notNow']);
    expect(kept(s)).toEqual([]);
  });

  it('puts a person’s own value LAST in the deck, after they have read ours', () => {
    const s = addCustom(startValues('quick', SEED), { name: 'Quiet', meaning: 'Room to think' });
    const cards = deck(s);

    expect(cards).toHaveLength(QUICK_POOL.length + 1);
    expect(cards[cards.length - 1].key).toBe(CUSTOM_VALUE_KEY);
    expect(findValue(CUSTOM_VALUE_KEY)).toBeUndefined(); // it is theirs, not authored
  });
});

describe('reducing and ranking refuse anything that was not on the table', () => {
  it('ignores a choice that is not a candidate, and anything past the target', () => {
    let s = sortAll(startValues('quick', SEED), ['core']);
    s = reduceTo(s, [...kept(s).slice(0, 9), 'not-a-real-value']);

    expect(candidates(s)).toHaveLength(5);
    expect(candidates(s)).not.toContain('not-a-real-value');
  });

  it('ranks only the survivors, and only five of them', () => {
    let s = sortAll(startValues('deep', SEED), ['core']);
    for (const target of [20, 10, 5]) s = reduceTo(s, candidates(s).slice(0, target));
    const survivors = candidates(s);

    s = rank(s, [...survivors, 'sneaked-in']);

    expect(s.ranked).toHaveLength(FINAL_COUNT);
    expect(s.ranked).not.toContain('sneaked-in');
  });
});

describe('the reading — the distance between saying and living', () => {
  /** A finished quick pass with the given presence scores on the top three. */
  function finished(scores: number[]): ValuesState {
    let s = sortAll(startValues('quick', SEED), ['core']);
    s = reduceTo(s, kept(s).slice(0, 5));
    s = rank(s, candidates(s));
    s.ranked.slice(0, PRESENCE_COUNT).forEach((key, i) => {
      s = setPresence(s, key, scores[i]);
    });
    return s;
  }

  it('refuses to read an unfinished flow', () => {
    expect(readValues(startValues('quick', SEED))).toBeNull();
  });

  it('asks about the top three only — five would be a survey', () => {
    const result = readValues(finished([8, 8, 8]))!;
    expect(result.top).toHaveLength(PRESENCE_COUNT);
    expect(result.values).toHaveLength(FINAL_COUNT);
    expect(result.values[4].presence).toBeUndefined();
  });

  it('names the value furthest from being lived', () => {
    const result = readValues(finished([9, 2, 9]))!;
    expect(result.widestGap?.position).toBe(2);
  });

  it('weights the gap by position, so a FIRST value unlived outranks a third', () => {
    // Same distance from ten, different place in the list: the one they put first is further from
    // the life they say they want.
    const result = readValues(finished([3, 10, 3]))!;
    expect(result.widestGap?.position).toBe(1);
  });

  it('names nothing when somebody is living close to their values', () => {
    expect(readValues(finished([9, 9, 10]))!.widestGap).toBeNull();
  });

  it('clamps a presence score into the scale', () => {
    let s = finished([5, 5, 5]);
    s = setPresence(s, s.ranked[0], 99);
    expect(s.presence[s.ranked[0]]).toBe(10);
    s = setPresence(s, s.ranked[0], -3);
    expect(s.presence[s.ranked[0]]).toBe(1);
  });

  it('the notable-gap threshold is what keeps a small distance from becoming a finding', () => {
    expect(NOTABLE_GAP).toBeGreaterThan(1);
  });
});
