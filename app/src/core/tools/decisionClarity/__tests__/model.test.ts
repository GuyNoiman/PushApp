/**
 * The decision reflection: four sides kept separate, a person's own ranking, and nothing anywhere
 * that computes a direction.
 */
import * as model from '../model';
import {
  addEntry,
  allEntries,
  canConfirm,
  confirmReflection,
  DECISION_SIDES,
  hasAnySide,
  history,
  isCurrentContext,
  isDecisionReflection,
  MAX_CONSIDERATIONS,
  movePriority,
  removeEntry,
  setClarity,
  setTopic,
  startReflection,
  togglePriority,
  topicChangedMeaningfully,
} from '../model';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function withFourSides() {
  let r = setTopic(startReflection('d1', NOW), 'Leaving the job', NOW);
  r = addEntry(r, 'statusQuoBenefits', 'a1', 'steady money', NOW);
  r = addEntry(r, 'statusQuoCosts', 'b1', 'I dread Sundays', NOW);
  r = addEntry(r, 'changeBenefits', 'c1', 'work I care about', NOW);
  r = addEntry(r, 'changeCosts', 'd1e', 'no safety net', NOW);
  return r;
}

describe('the four sides', () => {
  it('are kept separate and in a fixed order', () => {
    expect([...DECISION_SIDES]).toEqual([
      'statusQuoBenefits',
      'statusQuoCosts',
      'changeBenefits',
      'changeCosts',
    ]);
    expect(allEntries(withFourSides()).map((e) => e.side)).toEqual([...DECISION_SIDES]);
  });

  it('ignore a blank line instead of storing an empty entry', () => {
    const r = addEntry(startReflection('d1', NOW), 'changeCosts', 'x', '   ', NOW);
    expect(r.sides.changeCosts).toEqual([]);
  });

  it('may all be empty and the reflection still finishes', () => {
    const r = setTopic(startReflection('d1', NOW), 'Whether to move', NOW);
    expect(hasAnySide(r)).toBe(false);
    expect(canConfirm(r)).toBe(true);
    expect(confirmReflection(r, NOW).status).toBe('confirmed');
  });

  it('need a topic — without the question, the answers are not about anything', () => {
    const r = startReflection('d1', NOW);
    expect(canConfirm(r)).toBe(false);
    expect(confirmReflection(r, NOW)).toEqual(r);
  });
});

describe('what matters most', () => {
  it('keeps the person’s selection order as the ranking', () => {
    let r = withFourSides();
    r = togglePriority(r, 'c1', NOW);
    r = togglePriority(r, 'a1', NOW);
    expect(r.priorityIds).toEqual(['c1', 'a1']);
  });

  it('stops at three', () => {
    let r = withFourSides();
    for (const id of ['a1', 'b1', 'c1', 'd1e']) r = togglePriority(r, id, NOW);
    expect(r.priorityIds).toHaveLength(MAX_CONSIDERATIONS);
    expect(r.priorityIds).not.toContain('d1e');
  });

  it('unmarks what was marked', () => {
    let r = togglePriority(withFourSides(), 'a1', NOW);
    r = togglePriority(r, 'a1', NOW);
    expect(r.priorityIds).toEqual([]);
  });

  it('reorders without dragging, and refuses to fall off either end', () => {
    let r = withFourSides();
    r = togglePriority(r, 'a1', NOW);
    r = togglePriority(r, 'b1', NOW);
    expect(movePriority(r, 'b1', -1, NOW).priorityIds).toEqual(['b1', 'a1']);
    expect(movePriority(r, 'a1', -1, NOW).priorityIds).toEqual(['a1', 'b1']);
    expect(movePriority(r, 'b1', 1, NOW).priorityIds).toEqual(['a1', 'b1']);
  });

  it('drops a priority whose entry was deleted', () => {
    let r = togglePriority(withFourSides(), 'a1', NOW);
    r = removeEntry(r, 'statusQuoBenefits', 'a1', NOW);
    expect(r.priorityIds).toEqual([]);
  });
});

describe('neutrality', () => {
  it('exports nothing that scores, ranks or decides', () => {
    const forbidden = ['score', 'total', 'winner', 'readiness', 'recommend', 'decide', 'balance'];
    const exported = Object.keys(model).map((k) => k.toLowerCase());
    for (const word of forbidden) {
      expect(exported.some((name) => name.includes(word))).toBe(false);
    }
  });

  it('does not care which side holds more entries', () => {
    let r = setTopic(startReflection('d1', NOW), 'Whether to stay', NOW);
    for (let i = 0; i < 6; i += 1) r = addEntry(r, 'changeCosts', `c${i}`, `worry ${i}`, NOW);
    r = addEntry(r, 'changeBenefits', 'h1', 'one hope', NOW);
    // The only thing confirmation depends on is the topic.
    expect(canConfirm(r)).toBe(true);
  });
});

describe('the clarity statement', () => {
  it('is optional, and clearing it removes it', () => {
    let r = setClarity(withFourSides(), 'I am not ready yet', NOW);
    expect(r.clarityStatement).toBe('I am not ready yet');
    r = setClarity(r, '  ', NOW);
    expect(r.clarityStatement).toBeUndefined();
    expect(canConfirm(r)).toBe(true);
  });
});

describe('changing the question mid-flow', () => {
  it('is noticed, because the answers may no longer belong to it', () => {
    expect(topicChangedMeaningfully('Leaving the job', 'Moving city')).toBe(true);
    expect(topicChangedMeaningfully('Leaving the job', ' Leaving the job ')).toBe(false);
    expect(topicChangedMeaningfully('', 'Leaving the job')).toBe(false);
  });
});

describe('history and context', () => {
  it('lets several decisions coexist, newest first', () => {
    const a = { ...confirmReflection(withFourSides(), 100), id: 'a' };
    const b = { ...confirmReflection(withFourSides(), 200), id: 'b' };
    expect(history([a, b]).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('stops being current context after thirty days but stays private history', () => {
    const r = confirmReflection(withFourSides(), NOW);
    expect(isCurrentContext(r, NOW + 29 * DAY)).toBe(true);
    expect(isCurrentContext(r, NOW + 31 * DAY)).toBe(false);
    expect(history([r])).toHaveLength(1);
  });
});

describe('isDecisionReflection', () => {
  it('rejects a blob missing one of the four sides', () => {
    const broken = { ...withFourSides(), sides: { statusQuoBenefits: [] } };
    expect(isDecisionReflection(broken)).toBe(false);
    expect(isDecisionReflection(withFourSides())).toBe(true);
  });
});
