/**
 * The account's clock moved to the server (Account Inactivity Freeze §2/§3/§10), and this is what
 * changed on the device.
 *
 * Three things the device could not do on its own, and one it must keep not doing:
 *   • trust its own clock — a phone whose date is wrong, or that travelled, used to be able to decide
 *     somebody had been away for three weeks;
 *   • notice a threshold that passed while the app was closed — the local sweep only ever ran when
 *     the person came back, which is the one moment it should already have been true;
 *   • agree with another device — two phones each measuring their own gap can disagree.
 *
 * And the one it must not do: unfreeze. Returning is the user's move (§7); a verdict that carries no
 * freeze is not an instruction to resume anything.
 */
import { EventBus } from '../../events/EventBus';
import type { AppState, Journey } from '../../types/domain';
import { InactivityEngine } from '../InactivityEngine';
import type { JourneyEngine } from '../JourneyEngine';

function journey(id: string, over: Partial<Journey> = {}): Journey {
  return {
    id,
    title: id,
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 1,
    status: 'active',
    ...over,
  } as Journey;
}

function harness(journeys: Journey[] = [journey('j1')]) {
  const state = { journeys, dreams: [] } as unknown as AppState;
  const bus = new EventBus();
  const events: { type: string }[] = [];
  bus.on('AccountInactivityFrozen', (e) => events.push(e));
  bus.on('AccountInactivityReturned', (e) => events.push(e));

  // The freeze itself is the SAME J3 path the manual freeze uses; only its provenance differs.
  const journeyEngine = {
    freezeJourney(id: string, reason: Journey['freezeReason']) {
      const found = state.journeys.find((j) => j.id === id);
      if (found) {
        found.status = 'frozen';
        found.freezeReason = reason;
      }
      return true;
    },
  } as unknown as JourneyEngine;

  return { state, events, engine: new InactivityEngine(bus, () => state, journeyEngine) };
}

describe('the server’s timestamp wins over the device’s', () => {
  it('replaces the anchor even when the device thinks it is a different day', () => {
    const { state, engine } = harness();
    state.lastAuthenticatedActivityAt = 999_999_999;

    engine.applyServerVerdict({ lastActiveAt: 5_000 });

    expect(state.lastAuthenticatedActivityAt).toBe(5_000);
  });
});

describe('a freeze the device slept through', () => {
  it('is applied on arrival, with the server’s own timestamp on the cycle', () => {
    const { state, events, engine } = harness([journey('j1'), journey('j2')]);

    engine.applyServerVerdict({ lastActiveAt: 9_000, frozenAt: 8_000 });

    expect(state.journeys.every((j) => j.status === 'frozen')).toBe(true);
    expect(state.accountInactivity?.frozenAt).toBe(8_000);
    expect(state.accountInactivity?.resolved).toBeUndefined(); // there IS something to review
    expect(events.map((e) => e.type)).toEqual([
      'AccountInactivityFrozen',
      'AccountInactivityReturned',
    ]);
  });

  it('resolves immediately when there was nothing running to freeze', () => {
    const { state, engine } = harness([journey('done', { status: 'completed' })]);

    engine.applyServerVerdict({ lastActiveAt: 9_000, frozenAt: 8_000 });

    // Nothing for the user to review, so the cycle is closed and re-arms on the next absence.
    expect(state.accountInactivity?.resolved).toBe(true);
  });
});

describe('the same verdict twice', () => {
  it('freezes once — two launches, or two devices, are not two absences', () => {
    const { state, events, engine } = harness();
    engine.applyServerVerdict({ lastActiveAt: 9_000, frozenAt: 8_000 });
    const first = { ...state.accountInactivity! };

    engine.applyServerVerdict({ lastActiveAt: 10_000, frozenAt: 8_000 });

    expect(state.accountInactivity).toEqual(first);
    expect(events).toHaveLength(2); // not four
  });

  it('does not re-freeze while a cycle is still open', () => {
    const { state, events, engine } = harness();
    engine.applyServerVerdict({ lastActiveAt: 9_000, frozenAt: 8_000 });

    engine.applyServerVerdict({ lastActiveAt: 20_000, frozenAt: 19_000 });

    expect(state.accountInactivity?.frozenAt).toBe(8_000);
    expect(events).toHaveLength(2);
  });
});

describe('what a verdict may never do', () => {
  it('never unfreezes — returning is the user’s move, not the server’s', () => {
    const { state, engine } = harness();
    engine.applyServerVerdict({ lastActiveAt: 9_000, frozenAt: 8_000 });

    engine.applyServerVerdict({ lastActiveAt: 20_000 });

    expect(state.journeys.every((j) => j.status === 'frozen')).toBe(true);
    expect(state.lastAuthenticatedActivityAt).toBe(20_000);
  });
});
