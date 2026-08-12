/**
 * questionnaire — the pure questionnaire config (PRD §5/§6): six events in page order, a non-scored
 * conditional tie-break event, a non-mutating deterministic-seedable shuffle for per-page answer-order
 * randomization, and the ordered-answers projection the scorer tallies.
 */
import {
  COMMUNICATION_EVENTS,
  COMMUNICATION_QUESTION_COUNT,
  COMMUNICATION_TIEBREAK_EVENT,
  orderedAnswers,
  shuffle,
  shuffledStyleOrder,
  type CommunicationAnswers,
} from '@/core/communication/questionnaire';
import { COMMUNICATION_PROFILE_IDS } from '@/core/communication/communicationProfile';

describe('questionnaire config', () => {
  it('has exactly six scored events, tie-break excluded', () => {
    expect(COMMUNICATION_QUESTION_COUNT).toBe(6);
    expect(COMMUNICATION_EVENTS).toHaveLength(6);
    expect(COMMUNICATION_EVENTS).not.toContain(COMMUNICATION_TIEBREAK_EVENT);
  });

  describe('shuffle', () => {
    it('is a permutation and never mutates the input', () => {
      const input = [...COMMUNICATION_PROFILE_IDS];
      const rng = seededRng(0.42);
      const out = shuffle(input, rng);
      expect(out.slice().sort()).toEqual(input.slice().sort());
      expect(input).toEqual([...COMMUNICATION_PROFILE_IDS]); // untouched
    });

    it('is deterministic for a given rng sequence', () => {
      expect(shuffle([1, 2, 3, 4], seededRng(0.1))).toEqual(shuffle([1, 2, 3, 4], seededRng(0.1)));
    });

    it('shuffledStyleOrder always returns all four styles', () => {
      const order = shuffledStyleOrder(seededRng(0.7));
      expect(order.slice().sort()).toEqual([...COMMUNICATION_PROFILE_IDS].sort());
    });
  });

  describe('orderedAnswers', () => {
    it('projects answers into page order with undefined for unanswered pages', () => {
      const answers: CommunicationAnswers = { friendRequest: 'direct', stepsRemain: 'warm' };
      const ordered = orderedAnswers(answers);
      expect(ordered).toHaveLength(6);
      expect(ordered[0]).toBe('direct'); // friendRequest is first
      expect(ordered[2]).toBe('warm'); // stepsRemain is third
      expect(ordered[1]).toBeUndefined(); // friendSupport unanswered
    });
  });
});

/** A tiny deterministic rng: cycles through a fixed value so shuffle is reproducible in tests. */
function seededRng(value: number): () => number {
  let n = value;
  return () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
}
