/**
 * Coach Context Summaries — the rules that decide what a coach may carry between conversations.
 *
 * Everything asserted here is a promise made on a consent screen, which is why it is tested rather
 * than trusted: the bounds (a summary cannot grow into a transcript), the consent lifecycle
 * (a "no" is final, a material change asks again), the derivation (only approved objects, never the
 * conversation), and the brief (nothing at all without consent, and never more than the request
 * needs).
 */
import {
  MAX_FIELD_CHARS,
  MAX_LIST_ITEMS,
  COACH_MEMORY_CONSENT_VERSION,
  boundLine,
  boundList,
  briefFor,
  consentActive,
  dreamContextFrom,
  journeyContextFrom,
  needsAsking,
  recordConsent,
  renderBrief,
  updateContext,
  type CoachMemoryState,
} from '..';
import type { Dream, Journey } from '../../../types/domain';

const journey = (over: Partial<Journey> = {}): Journey =>
  ({
    id: 'j1',
    title: 'Run three times a week',
    why: ['so I can keep up with my daughter', 'so I can keep up with my daughter'],
    steps: [{ id: 's1', title: 'Run on Monday' }],
    createdAt: 1,
    ...over,
  }) as Journey;

const dream: Dream = { id: 'd1', title: 'Be someone my body can rely on' };

describe('bounds', () => {
  it('collapses whitespace and cuts a long line to the ceiling', () => {
    const long = boundLine(`${'a '.repeat(400)}`);
    expect(long!.length).toBeLessThanOrEqual(MAX_FIELD_CHARS);
    expect(boundLine('  two   words  ')).toBe('two words');
  });

  it('treats an empty or whitespace-only line as nothing', () => {
    expect(boundLine('')).toBeUndefined();
    expect(boundLine('   ')).toBeUndefined();
    expect(boundLine(undefined)).toBeUndefined();
  });

  it('drops duplicates and keeps the FIRST items when a list overflows', () => {
    const list = boundList(['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(list).toHaveLength(MAX_LIST_ITEMS);
    expect(list[0]).toBe('a');
    expect(list).not.toContain('g');
  });
});

describe('consent', () => {
  it('is not active until it is granted against the current wording', () => {
    expect(consentActive(undefined)).toBe(false);
    expect(consentActive(recordConsent('declined', 'he', 1))).toBe(false);
    expect(consentActive(recordConsent('withdrawn', 'he', 1))).toBe(false);
    expect(consentActive(recordConsent('granted', 'he', 1))).toBe(true);
  });

  it('asks when nobody has been asked, and again when the wording changed materially', () => {
    expect(needsAsking(undefined)).toBe(true);
    expect(needsAsking({ state: 'granted', version: 'older-text', locale: 'he', at: 1 })).toBe(true);
    expect(needsAsking(recordConsent('granted', 'he', 1))).toBe(false);
  });

  it('never asks again after a no — a version bump they never saw does not reopen it', () => {
    expect(needsAsking({ state: 'declined', version: 'older-text', locale: 'he', at: 1 })).toBe(false);
    expect(needsAsking({ state: 'withdrawn', version: 'older-text', locale: 'he', at: 1 })).toBe(false);
  });

  it('records the wording and the language the answer was given against', () => {
    const consent = recordConsent('granted', 'he', 99);
    expect(consent).toEqual({
      state: 'granted',
      version: COACH_MEMORY_CONSENT_VERSION,
      locale: 'he',
      at: 99,
    });
  });
});

describe('derivation', () => {
  it('takes the outcome and the reasons from the approved Journey, and never the Steps', () => {
    const context = journeyContextFrom(journey(), 10);

    expect(context.outcome).toBe('Run three times a week');
    expect(context.reasons).toEqual(['so I can keep up with my daughter']); // deduped
    expect(context.provenance).toBe('approvedChange');
    expect(JSON.stringify(context)).not.toContain('Run on Monday');
  });

  it('bounds whatever a caller passes in, however long it is', () => {
    const context = journeyContextFrom(journey(), 10, {
      constraints: ['x'.repeat(1000), 'a', 'b', 'c', 'd', 'e'],
    });
    expect(context.constraints).toHaveLength(MAX_LIST_ITEMS);
    expect(context.constraints[0].length).toBeLessThanOrEqual(MAX_FIELD_CHARS);
  });

  it('reads a Dream direction from the approved Dream itself', () => {
    expect(dreamContextFrom(dream, 10).direction).toBe('Be someone my body can rely on');
  });

  it('REPLACES on update rather than accumulating, and an empty value removes', () => {
    const first = journeyContextFrom(journey(), 10, { assumptions: ['they train alone'] });
    const corrected = updateContext(first, { assumptions: ['they train with a friend'] }, 20);
    expect(corrected.assumptions).toEqual(['they train with a friend']);
    expect(corrected.updatedAt).toBe(20);

    const removed = updateContext(corrected, { outcome: '' }, 30);
    expect(removed.outcome).toBeUndefined();
  });

  it('keeps obstacle categories unique — they are categories, not a description', () => {
    const context = journeyContextFrom(journey(), 10, { obstacleCategories: ['time', 'time', 'energy'] });
    expect(context.obstacleCategories).toEqual(['time', 'energy']);
  });
});

describe('what reaches the model', () => {
  const memory = (granted: boolean): CoachMemoryState => ({
    consent: recordConsent(granted ? 'granted' : 'declined', 'he', 1),
    dreams: [dreamContextFrom(dream, 1)],
    journeys: [journeyContextFrom(journey(), 1), journeyContextFrom(journey({ id: 'j2', title: 'Read at night' }), 1)],
  });

  it('is nothing at all without active consent', () => {
    expect(briefFor(memory(false), { journeyId: 'j1' })).toBeNull();
    expect(briefFor(undefined, { journeyId: 'j1' })).toBeNull();
  });

  it('is only the records the request is about — never the catalogue', () => {
    const brief = briefFor(memory(true), { journeyId: 'j1' });
    expect(brief?.journey?.id).toBe('j1');
    expect(brief?.dream).toBeUndefined();
    expect(JSON.stringify(brief)).not.toContain('Read at night');
  });

  it('renders assumptions AS assumptions, so a guess is never stated as a fact', () => {
    const withAssumption: CoachMemoryState = {
      consent: recordConsent('granted', 'he', 1),
      dreams: [],
      journeys: [journeyContextFrom(journey(), 1, { assumptions: ['mornings work better for them'] })],
    };
    const text = renderBrief(briefFor(withAssumption, { journeyId: 'j1' }));
    expect(text).toContain('ASSUMPTIONS');
    expect(text).toContain('mornings work better for them');
    expect(text).toContain('never treat an');
  });

  it('renders nothing when there is nothing to say', () => {
    expect(renderBrief(null)).toBe('');
    expect(renderBrief(briefFor(memory(true), { journeyId: 'unknown' }))).toBe('');
  });
});
