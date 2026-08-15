/**
 * outcome — the §4 classification matrix of Smart Notification Timing, case by case. These are the
 * rules that decide what a send MEANT, so every branch is pinned here rather than inferred from the
 * proposal tests: a positive response, a same-day rescue, a genuine negative, contamination, an
 * already-foregrounded send, and the not-yet-concluded case.
 *
 * Everything is pure, so the "clock" is just numbers built from a fixed local noon.
 */
import {
  classifiedTrial,
  classifyTrial,
  contaminates,
  effectiveSendAt,
  isEvidence,
  isSameLocalDay,
  responseKindOf,
  withinResponseWindow,
} from '../outcome';
import type { TimingTrial } from '../../types/domain';

const MINUTE = 60 * 1000;
/** A fixed local send time: 2026-03-10 09:00 local. */
const SEND = new Date(2026, 2, 10, 9, 0, 0, 0).getTime();

function trial(over: Partial<TimingTrial> = {}): TimingTrial {
  return {
    modelKey: 'journey_1|*',
    scheduledAt: SEND,
    outcome: 'pending',
    journeyIds: ['journey_1'],
    ...over,
  };
}

describe('the response window', () => {
  it('is measured from the scheduled time when the OS gave no delivery receipt', () => {
    expect(effectiveSendAt({ scheduledAt: SEND })).toBe(SEND);
  });

  it('is measured from the actual delivery time when one is known', () => {
    expect(effectiveSendAt({ scheduledAt: SEND, deliveredAt: SEND + 5 * MINUTE })).toBe(
      SEND + 5 * MINUTE,
    );
  });

  it('covers the send instant itself and the full 30 minutes after it', () => {
    expect(withinResponseWindow(SEND, SEND)).toBe(true);
    expect(withinResponseWindow(SEND, SEND + 30 * MINUTE)).toBe(true);
    expect(withinResponseWindow(SEND, SEND + 30 * MINUTE + 1)).toBe(false);
  });

  it('never counts something that happened BEFORE the send', () => {
    expect(withinResponseWindow(SEND, SEND - 1)).toBe(false);
  });

  it('treats another send within 30 minutes on EITHER side as contamination', () => {
    expect(contaminates(SEND, SEND - 30 * MINUTE)).toBe(true);
    expect(contaminates(SEND, SEND + 30 * MINUTE)).toBe(true);
    expect(contaminates(SEND, SEND + 31 * MINUTE)).toBe(false);
  });
});

describe('§4 classification matrix', () => {
  it('POSITIVE when the Journey is opened inside the window', () => {
    expect(
      classifyTrial({ scheduledAt: SEND, journeyInteractionAt: SEND + 10 * MINUTE, dayClosed: true }),
    ).toBe('positive');
  });

  it('POSITIVE at the very edge of the window', () => {
    expect(classifyTrial({ scheduledAt: SEND, journeyInteractionAt: SEND + 30 * MINUTE })).toBe(
      'positive',
    );
  });

  it('does NOT count a Journey interaction that fell outside the window', () => {
    const outcome = classifyTrial({
      scheduledAt: SEND,
      journeyInteractionAt: SEND + 31 * MINUTE,
      dayClosed: true,
    });
    expect(outcome).toBe('negative');
  });

  it('NEUTRAL when the Step was completed later the same local day — no negative conclusion', () => {
    expect(
      classifyTrial({ scheduledAt: SEND, reportAt: SEND + 8 * 60 * MINUTE, dayClosed: true }),
    ).toBe('neutral');
  });

  it('NEUTRAL when the Step was already done earlier that same day', () => {
    expect(classifyTrial({ scheduledAt: SEND, reportAt: SEND - 2 * 60 * MINUTE, dayClosed: true })).toBe(
      'neutral',
    );
  });

  it('NEGATIVE only when the day closed with no interaction and no report', () => {
    expect(classifyTrial({ scheduledAt: SEND, dayClosed: true })).toBe('negative');
  });

  it('a report on a DIFFERENT local day does not rescue the day', () => {
    const nextDay = new Date(2026, 2, 11, 9, 0, 0, 0).getTime();
    expect(classifyTrial({ scheduledAt: SEND, reportAt: nextDay, dayClosed: true })).toBe('negative');
  });

  it('PENDING while the day is still open and nothing has happened', () => {
    expect(classifyTrial({ scheduledAt: SEND })).toBe('pending');
  });

  it('CONTAMINATED when another of our sends overlapped — even with a positive interaction', () => {
    expect(
      classifyTrial({
        scheduledAt: SEND,
        journeyInteractionAt: SEND + MINUTE,
        contaminated: true,
        dayClosed: true,
      }),
    ).toBe('contaminated');
  });

  it('CONTAMINATED when the app was already in the foreground at send time (§3)', () => {
    expect(classifyTrial({ scheduledAt: SEND, foregroundedAtSend: true, dayClosed: true })).toBe(
      'contaminated',
    );
  });

  it('classifies against the DELIVERY time when one is known', () => {
    // The interaction is 40 minutes after the schedule, but only 10 after actual delivery.
    const outcome = classifyTrial({
      scheduledAt: SEND,
      deliveredAt: SEND + 30 * MINUTE,
      journeyInteractionAt: SEND + 40 * MINUTE,
    });
    expect(outcome).toBe('positive');
  });

  it('counts only positive and negative as evidence', () => {
    expect(isEvidence('positive')).toBe(true);
    expect(isEvidence('negative')).toBe(true);
    expect(isEvidence('neutral')).toBe(false);
    expect(isEvidence('contaminated')).toBe(false);
    expect(isEvidence('pending')).toBe(false);
  });
});

describe('the general response, recorded separately (§4)', () => {
  it('reports a tap', () => {
    expect(responseKindOf({ scheduledAt: SEND, foregroundAt: SEND + MINUTE, viaTap: true })).toBe(
      'tap',
    );
  });

  it('reports an organic foreground', () => {
    expect(responseKindOf({ scheduledAt: SEND, foregroundAt: SEND + MINUTE })).toBe('organic');
  });

  it('reports none when the foreground fell outside the window', () => {
    expect(responseKindOf({ scheduledAt: SEND, foregroundAt: SEND + 45 * MINUTE })).toBe('none');
  });

  it('reports none when the app never came forward at all', () => {
    expect(responseKindOf({ scheduledAt: SEND })).toBe('none');
  });

  it('keeps the response SEPARATE from the verdict — a tap alone is not positive evidence', () => {
    const stamped = classifiedTrial(trial(), {
      scheduledAt: SEND,
      foregroundAt: SEND + MINUTE,
      viaTap: true,
      dayClosed: true,
    });
    expect(stamped.responseKind).toBe('tap');
    expect(stamped.outcome).toBe('negative');
  });

  it('never mutates the trial it classifies', () => {
    const original = trial();
    classifiedTrial(original, { scheduledAt: SEND, journeyInteractionAt: SEND, dayClosed: true });
    expect(original.outcome).toBe('pending');
    expect(original.responseKind).toBeUndefined();
  });
});

describe('the local-day boundary', () => {
  it('uses ONE definition of "that day" (the shared startOfLocalDay)', () => {
    expect(isSameLocalDay(SEND, new Date(2026, 2, 10, 23, 59, 59).getTime())).toBe(true);
    expect(isSameLocalDay(SEND, new Date(2026, 2, 11, 0, 0, 0).getTime())).toBe(false);
  });
});
