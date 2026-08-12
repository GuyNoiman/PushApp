/**
 * Companion helpers (Journey Support Circle, D2) — pure unit tests for the coach-only
 * eligibility rule and the SYSTEM-DATA-ONLY Step payload. These lock the privacy contract:
 * only a manual/legacy Journey is Companion-ineligible, and the published payload carries no
 * reason/note/description/"why" — only stepId, title, derived status, and the report date.
 */
import { assertCompanionAllowed, companionStepsFor, isCompanionEligible } from '../companion';
import type { Journey, ReasonEntry, Step } from '../../types/domain';

function step(partial: Partial<Step> & { id: string; title: string }): Step {
  return { isStarterStep: false, cadence: 'once', done: false, ...partial } as Step;
}

function journey(partial: Partial<Journey>): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 0,
    status: 'active',
    ...partial,
  } as Journey;
}

describe('isCompanionEligible', () => {
  it('is true ONLY for a coach-created Journey', () => {
    expect(isCompanionEligible(journey({ createdVia: 'coach' }))).toBe(true);
  });

  it('is false for a manual Journey', () => {
    expect(isCompanionEligible(journey({ createdVia: 'manual' }))).toBe(false);
  });

  it('is false for a legacy Journey with no createdVia marker', () => {
    expect(isCompanionEligible(journey({}))).toBe(false);
  });
});

describe('assertCompanionAllowed (security-privacy #3 gate)', () => {
  it('allows Companion on a coach Journey', () => {
    expect(() => assertCompanionAllowed(journey({ createdVia: 'coach' }), 'companion')).not.toThrow();
  });

  it('throws for Companion on a manual Journey', () => {
    expect(() => assertCompanionAllowed(journey({ createdVia: 'manual' }), 'companion')).toThrow();
  });

  it('throws for Companion on a legacy Journey (no marker) and a missing Journey (fail-closed)', () => {
    expect(() => assertCompanionAllowed(journey({}), 'companion')).toThrow();
    expect(() => assertCompanionAllowed(undefined, 'companion')).toThrow();
  });

  it('always allows Encourager, regardless of createdVia', () => {
    expect(() => assertCompanionAllowed(journey({ createdVia: 'manual' }), 'encourager')).not.toThrow();
    expect(() => assertCompanionAllowed(undefined, 'encourager')).not.toThrow();
  });
});

describe('companionStepsFor', () => {
  it('emits only stepId, title, derived status, and report date (no free text)', () => {
    const doneAt = 1_700_000_000_000;
    const j = journey({
      createdVia: 'coach',
      steps: [
        step({ id: 's1', title: 'Lace up and walk', done: true, lastCheckInAt: doneAt }),
        step({ id: 's2', title: 'Jog 15 minutes' }),
      ],
    });

    const payload = companionStepsFor(j, []);

    expect(payload).toEqual([
      { stepId: 's1', title: 'Lace up and walk', status: 'completed', reportedAt: doneAt },
      { stepId: 's2', title: 'Jog 15 minutes', status: 'unreported', reportedAt: null },
    ]);
    // No object in the payload may carry a reason/note/description/why key.
    for (const row of payload) {
      expect(Object.keys(row).sort()).toEqual(['reportedAt', 'status', 'stepId', 'title']);
    }
  });

  it('excludes dropped Steps (out of scope)', () => {
    const j = journey({
      createdVia: 'coach',
      steps: [
        step({ id: 's1', title: 'Kept step' }),
        step({ id: 's2', title: 'Shed step', dropped: true }),
      ],
    });

    expect(companionStepsFor(j, []).map((r) => r.stepId)).toEqual(['s1']);
  });

  it('derives a Partial status from the reason log without leaking the reason', () => {
    const log: ReasonEntry[] = [
      { id: 'r1', stepId: 's1', at: 10, reasonId: 'did_partially', note: 'only managed 5 min' } as ReasonEntry,
    ];
    const j = journey({
      createdVia: 'coach',
      steps: [step({ id: 's1', title: 'Jog 15 minutes' })],
    });

    const payload = companionStepsFor(j, log);

    expect(payload[0].status).toBe('partially_completed');
    expect(JSON.stringify(payload)).not.toContain('only managed 5 min');
  });
});
