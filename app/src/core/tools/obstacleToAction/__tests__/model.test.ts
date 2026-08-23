/**
 * The if–then response: a structural check that asks rather than refuses, and a link to a Dream or
 * Journey that can never change it.
 */
import {
  canConfirm,
  checkQuality,
  confirmed,
  confirmResult,
  dropMissingContext,
  isCurrent,
  isObstacleActionResult,
  OBSTACLE_STAGES,
  setField,
  startResult,
  supersede,
  type QualityLexicon,
} from '../model';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const EN: QualityLexicon = {
  otherPeople: ['they', 'he', 'she', 'my boss'],
  guarantees: ['always', 'never', 'completely'],
  conjunctions: ['and', 'then', 'also'],
};

const HE: QualityLexicon = {
  otherPeople: ['הוא', 'היא', 'הם'],
  guarantees: ['תמיד', 'לעולם', 'לגמרי'],
  conjunctions: ['וגם', 'ואז'],
};

function ready(trigger: string, response: string) {
  let r = startResult('o1', 'standalone', NOW);
  r = setField(r, 'wish', 'to move in the evenings', NOW);
  r = setField(r, 'obstacle', 'I am too tired', NOW);
  r = setField(r, 'trigger', trigger, NOW);
  r = setField(r, 'response', response, NOW);
  return r;
}

describe('the four stages', () => {
  it('are wish, outcome, obstacle, response', () => {
    expect([...OBSTACLE_STAGES]).toEqual(['wish', 'outcome', 'obstacle', 'response']);
  });

  it('treat the outcome as skippable — clearing it removes it', () => {
    let r = setField(startResult('o1', 'standalone', NOW), 'outcome', 'I would sleep better', NOW);
    expect(r.outcome).toBe('I would sleep better');
    r = setField(r, 'outcome', '   ', NOW);
    expect(r.outcome).toBeUndefined();
  });
});

describe('the quality check', () => {
  it('says nothing when the shape is fine', () => {
    expect(checkQuality(ready('when I sit on the sofa after dinner', 'put my shoes by the door'), EN)).toEqual([]);
  });

  it('notices a trigger nobody could recognise', () => {
    expect(checkQuality({ trigger: 'later', response: 'put my shoes by the door' }, EN)).toContain('triggerVague');
  });

  it('notices a response that depends on somebody else', () => {
    expect(checkQuality({ trigger: 'when the meeting ends', response: 'they will remind me' }, EN)).toContain(
      'responseNotYours',
    );
  });

  it('notices several actions bundled into one', () => {
    expect(
      checkQuality({ trigger: 'when I wake up', response: 'stretch and run and shower' }, EN),
    ).toContain('responseSeveralActions');
  });

  it('notices a promise nobody can keep', () => {
    expect(
      checkQuality({ trigger: 'when I open the laptop', response: 'never look at the phone again' }, EN),
    ).toContain('responsePromisesTooMuch');
  });

  it('works in Hebrew, because the markers are passed in', () => {
    expect(checkQuality({ trigger: 'כשאני נכנס הביתה', response: 'הוא יזכיר לי' }, HE)).toContain('responseNotYours');
    expect(checkQuality({ trigger: 'כשאני נכנס הביתה', response: 'אשתה כוס מים' }, HE)).toEqual([]);
  });

  it('matches whole words only, so "band" is not "and"', () => {
    expect(checkQuality({ trigger: 'when I hear the band', response: 'stand by the window' }, EN)).toEqual([]);
  });

  it('never blocks: a plan that fails every check can still be confirmed', () => {
    const r = ready('later', 'they will always sort it and fix it');
    expect(checkQuality(r, EN).length).toBeGreaterThan(2);
    expect(canConfirm(r)).toBe(true);
    expect(confirmResult(r, NOW).status).toBe('confirmed');
  });
});

describe('confirming', () => {
  it('needs both halves of the sentence', () => {
    expect(canConfirm(ready('', 'drink water'))).toBe(false);
    expect(canConfirm(ready('when I get home', ''))).toBe(false);
    expect(canConfirm(ready('when I get home', 'drink water'))).toBe(true);
  });

  it('refuses to confirm an unfinished one instead of throwing', () => {
    const r = ready('', '');
    expect(confirmResult(r, NOW)).toEqual(r);
  });

  it('trims what it stores', () => {
    const r = confirmResult(ready('  when I get home  ', '  drink water  '), NOW);
    expect(r.trigger).toBe('when I get home');
    expect(r.response).toBe('drink water');
  });
});

describe('the link to a Dream or Journey', () => {
  it('is context only — a deleted one leaves a standalone result, not a broken link', () => {
    const linked = startResult('o1', 'journey', NOW, 'j1');
    const orphaned = dropMissingContext(linked, false, NOW);
    expect(orphaned.contextType).toBe('standalone');
    expect(orphaned.contextId).toBeUndefined();
  });

  it('leaves a live link alone', () => {
    const linked = startResult('o1', 'journey', NOW, 'j1');
    expect(dropMissingContext(linked, true, NOW)).toEqual(linked);
  });
});

describe('freshness and history', () => {
  it('stops being current after ninety days', () => {
    const r = confirmResult(ready('when I get home', 'drink water'), NOW);
    expect(isCurrent(r, NOW + 89 * DAY)).toBe(true);
    expect(isCurrent(r, NOW + 91 * DAY)).toBe(false);
  });

  it('stops being current when its Journey no longer is', () => {
    const r = confirmResult(ready('when I get home', 'drink water'), NOW);
    expect(isCurrent(r, NOW, false)).toBe(false);
  });

  it('a superseded version is history, not a result', () => {
    const first = confirmResult(ready('when I get home', 'drink water'), NOW);
    const old = supersede(first, NOW + 10);
    const second = { ...confirmResult(ready('when I sit down', 'stand up'), NOW + 20), id: 'o2' };
    expect(confirmed([old, second]).map((r) => r.id)).toEqual(['o2']);
  });
});

describe('isObstacleActionResult', () => {
  it('rejects a blob missing the sentence', () => {
    const r = confirmResult(ready('when I get home', 'drink water'), NOW);
    expect(isObstacleActionResult(r)).toBe(true);
    expect(isObstacleActionResult({ ...r, response: undefined })).toBe(false);
  });
});
