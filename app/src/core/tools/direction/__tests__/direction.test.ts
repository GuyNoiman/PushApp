/**
 * Direction Statement.
 *
 * The thing worth protecting is what it is NOT. It is not a Dream and not a commitment — so nothing
 * here produces one, the tool has no completion, and the word target is a nudge rather than a gate.
 * The second thing is the drawers: "what I bring" must never be filled by the app guessing what
 * somebody is good at.
 */
import { contributedChips, hasContributions } from '../contributors';
import {
  CHIPS_PER_DRAWER,
  DRAFT_TEMPLATES,
  THOUGHT_LIMIT,
  WORD_TARGET,
  addOwnChip,
  canCompose,
  chosenChips,
  drawerChips,
  gloss,
  importantWords,
  noteWhatWouldMakeItTen,
  rateAliveness,
  setSentence,
  slotsFor,
  startDirection,
  stepDraft,
  toggleChip,
  withinTarget,
  wordCount,
} from '../model';

const VALUES = [
  { key: 'growth', label: 'growth' },
  { key: 'freedom', label: 'freedom' },
  { key: 'contribution', label: 'helping people grow' },
];

const start = () => startDirection(contributedChips({ values: VALUES }));

describe('where the drawers come from', () => {
  it('fills "what draws me" from the values a person already narrowed to, in THEIR order', () => {
    const chips = contributedChips({ values: VALUES });
    expect(chips.map((c) => c.text)).toEqual(['growth', 'freedom', 'helping people grow']);
    expect(chips.every((c) => c.drawer === 'draws' && c.source === 'values')).toBe(true);
  });

  it('leaves "what I bring" EMPTY, because guessing at a strength is the one thing it must not do', () => {
    const chips = contributedChips({ values: VALUES });
    expect(chips.some((c) => c.drawer === 'brings')).toBe(false);
    expect(hasContributions(chips, 'brings')).toBe(false);
    expect(hasContributions(chips, 'draws')).toBe(true);
  });

  it('produces empty drawers rather than an error when nothing has been done yet', () => {
    expect(contributedChips({})).toEqual([]);
  });

  it('marks a typed phrase as the person’s own, so it is never handed back as our finding', () => {
    const s = addOwnChip(start(), 'brings', '  teaching ');
    const own = drawerChips(s, 'brings')[0];
    expect(own.text).toBe('teaching');
    expect(own.source).toBe('user');
  });
});

describe('choosing what goes in', () => {
  it('caps each drawer, and a tap past the cap moves nothing', () => {
    let s = start();
    s = addOwnChip(s, 'draws', 'making things');
    const ids = drawerChips(s, 'draws').map((c) => c.id);
    for (const id of ids) s = toggleChip(s, 'draws', id);

    expect(chosenChips(s, 'draws')).toHaveLength(CHIPS_PER_DRAWER);
    // The first choice is still there — a fourth tap must not silently evict it.
    expect(chosenChips(s, 'draws')[0].id).toBe(ids[0]);
  });

  it('puts a chip back when it is tapped again', () => {
    let s = start();
    const id = drawerChips(s, 'draws')[0].id;
    s = toggleChip(s, 'draws', id);
    expect(chosenChips(s, 'draws')).toHaveLength(1);
    s = toggleChip(s, 'draws', id);
    expect(chosenChips(s, 'draws')).toHaveLength(0);
  });

  it('needs one from each drawer before there is a sentence at all', () => {
    let s = start();
    expect(canCompose(s)).toBe(false);
    expect(slotsFor(s)).toBeNull();

    s = toggleChip(s, 'draws', drawerChips(s, 'draws')[0].id);
    expect(canCompose(s)).toBe(false); // still nothing they bring

    s = addOwnChip(s, 'brings', 'teaching');
    s = toggleChip(s, 'brings', drawerChips(s, 'brings')[0].id);
    expect(canCompose(s)).toBe(true);
    expect(slotsFor(s)).toEqual({ draw: 'growth', a: 'teaching' });
  });

  it('carries a second strength into the sentence when there is one', () => {
    let s = start();
    s = toggleChip(s, 'draws', drawerChips(s, 'draws')[0].id);
    s = addOwnChip(s, 'brings', 'teaching');
    s = addOwnChip(s, 'brings', 'clear thinking');
    for (const c of drawerChips(s, 'brings')) s = toggleChip(s, 'brings', c.id);

    expect(slotsFor(s)).toEqual({ draw: 'growth', a: 'teaching', b: 'clear thinking' });
  });
});

describe('the five phrasings', () => {
  it('offers five, and they are templates rather than generated text', () => {
    expect(DRAFT_TEMPLATES).toHaveLength(5);
    expect(new Set(DRAFT_TEMPLATES).size).toBe(5);
  });

  it('wraps in both directions, so the carousel has no dead end', () => {
    let s = start();
    expect(s.draft).toBe(DRAFT_TEMPLATES[0]);
    s = stepDraft(s, -1);
    expect(s.draft).toBe(DRAFT_TEMPLATES[4]);
    s = stepDraft(s, 1);
    expect(s.draft).toBe(DRAFT_TEMPLATES[0]);
  });

  it('abandons an edit when the phrasing changes, because the edit was OF that sentence', () => {
    let s = setSentence(start(), 'my own words');
    s = stepDraft(s, 1);
    expect(s.sentence).toBe('');
  });
});

describe('how alive it feels', () => {
  it('clamps into the scale', () => {
    expect(rateAliveness(start(), 99).aliveness).toBe(10);
    expect(rateAliveness(start(), -4).aliveness).toBe(1);
  });

  it('caps "what would make it a 10" so it stays a thought', () => {
    const long = 'x'.repeat(THOUGHT_LIMIT + 40);
    expect(noteWhatWouldMakeItTen(start(), long).whatWouldMakeItTen).toHaveLength(THOUGHT_LIMIT);
  });
});

describe('length is a nudge, never a gate', () => {
  it('knows when a sentence is inside the target', () => {
    expect(WORD_TARGET).toEqual({ min: 8, max: 12 });
    expect(withinTarget('I want to help people grow by using my teaching')).toBe(true);
    expect(withinTarget('too short')).toBe(false);
  });

  it('counts words without tripping over spacing', () => {
    expect(wordCount('  two   words  ')).toBe(2);
    expect(wordCount('   ')).toBe(0);
  });
});

describe('the words worth explaining', () => {
  it('is the chips, not every word in the sentence', () => {
    let s = start();
    s = toggleChip(s, 'draws', drawerChips(s, 'draws')[0].id);
    s = addOwnChip(s, 'brings', 'teaching');
    s = toggleChip(s, 'brings', drawerChips(s, 'brings')[0].id);

    // "using" and "and" mean the same to everybody; a chosen word is the kind that does not.
    expect(importantWords(s)).toEqual(['growth', 'teaching']);
  });

  it('keeps a gloss, and removes it when it is emptied', () => {
    let s = gloss(start(), 'growth', '  becoming someone else  ');
    expect(s.glosses.growth).toBe('becoming someone else');
    s = gloss(s, 'growth', '   ');
    expect(s.glosses.growth).toBeUndefined();
  });
});

describe('the "what I bring" drawer, once Strength Evidence exists (2026-08-25)', () => {
  it('offers confirmed strengths, and still nothing derived from what they value', () => {
    const chips = contributedChips({
      values: [{ key: 'growth', label: 'Growth' }],
      strengths: [{ key: 's1', label: 'Steady when it matters' }],
    });

    const brings = chips.filter((c) => c.drawer === 'brings');
    expect(brings.map((c) => c.text)).toEqual(['Steady when it matters']);
    // The person authored both, which is the whole test: a value is what they chose to live by, and
    // a confirmed strength is their own word for a pattern in their own stories. Neither is us
    // telling them what they are good at — and a VALUE still never lands in this drawer.
    expect(brings.every((c) => c.source === 'strengthEvidence')).toBe(true);
  });

  it('is empty when the tool was never done, or the result never confirmed and allowed', () => {
    // `strengths` is absent in exactly those cases: the caller reads them through `derivedSummary`,
    // which returns null when it is unconfirmed, unpermitted, or revoked.
    const chips = contributedChips({ values: [{ key: 'growth', label: 'Growth' }] });
    expect(chips.filter((c) => c.drawer === 'brings')).toEqual([]);
  });
});
