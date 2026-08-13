/**
 * buildCompletionCard tests (Completion Celebration, I1) — the builder emits ONLY whitelisted safe
 * fields (asserted as an exact key set), snapshots the title, stamps the template version, and NEVER
 * leaks Step reports / `why` / notes / Dream / Ally data even when the source Journey is rich.
 */
import type { Journey } from '../../types/domain';
import { buildCompletionCard } from '../completionCard';
import { CARD_TEMPLATE_VERSION } from '../cardTemplates';

/** A completed Journey deliberately loaded with sensitive content the card must never copy. */
function richJourney(): Journey {
  return {
    id: 'journey_1',
    title: 'Quit smoking',
    description: 'a private description',
    why: ['my kids', 'my health'],
    durationDays: 45,
    rhythm: 'daily',
    createdAt: 1,
    dreamId: 'dream_secret',
    secondaryDreamIds: ['dream_other'],
    completedAt: 1_000,
    status: 'completed',
    steps: [
      { id: 's1', title: 'Toss the ashtrays', isStarterStep: true, cadence: 'once', done: true },
      { id: 's2', title: 'Call the clinic', isStarterStep: false, cadence: 'once', done: true },
      { id: 's3', title: 'Dropped extra', isStarterStep: false, cadence: 'once', done: false, dropped: true },
    ],
  };
}

describe('buildCompletionCard', () => {
  it('emits ONLY the whitelisted safe keys (exact key set)', () => {
    const card = buildCompletionCard(richJourney(), 2_000);
    expect(Object.keys(card).sort()).toEqual(
      ['completedAt', 'durationDays', 'journeyId', 'journeyTitleSnapshot', 'templateVersion', 'totalSteps'].sort(),
    );
  });

  it('never leaks Step reports/why/notes, Dream, or Ally data', () => {
    const card = buildCompletionCard(richJourney(), 2_000);
    const serialized = JSON.stringify(card);
    for (const secret of ['my kids', 'my health', 'private description', 'dream_secret', 'dream_other']) {
      expect(serialized).not.toContain(secret);
    }
    // No structural leak of sensitive keys either.
    expect(card).not.toHaveProperty('why');
    expect(card).not.toHaveProperty('steps');
    expect(card).not.toHaveProperty('dreamId');
    expect(card).not.toHaveProperty('description');
  });

  it('snapshots the Journey title at completion time', () => {
    const card = buildCompletionCard(richJourney(), 2_000);
    expect(card.journeyTitleSnapshot).toBe('Quit smoking');
    expect(card.journeyId).toBe('journey_1');
  });

  it('stamps the current template version', () => {
    const card = buildCompletionCard(richJourney(), 2_000);
    expect(card.templateVersion).toBe(CARD_TEMPLATE_VERSION);
  });

  it('records non-sensitive display counts (in-scope steps + planned duration)', () => {
    const card = buildCompletionCard(richJourney(), 2_000);
    expect(card.totalSteps).toBe(2); // the dropped Step is out of scope
    expect(card.durationDays).toBe(45);
  });

  it('uses the Journey completedAt when present, else falls back to now', () => {
    expect(buildCompletionCard(richJourney(), 2_000).completedAt).toBe(1_000);
    const notYet = { ...richJourney(), completedAt: undefined };
    expect(buildCompletionCard(notYet, 5_000).completedAt).toBe(5_000);
  });

  it('does not carry a ceremonyShownAt marker (the builder never marks a card shown)', () => {
    expect(buildCompletionCard(richJourney(), 2_000).ceremonyShownAt).toBeUndefined();
  });
});
