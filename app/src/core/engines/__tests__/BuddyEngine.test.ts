/**
 * BuddyEngine unit tests — pure TS. Verifies the Buddy accrues XP/Coins and that
 * level/stage transitions are driven purely by config/buddyStages
 * (Engineering Bible §18 + §3 configuration-before-code).
 */
import { XP_PER_LEVEL } from '../../config/buddyStages';
import { EventBus } from '../../events/EventBus';
import type { BuddyEvolved, BuddyReacted } from '../../events/events';
import type { AppState, Buddy } from '../../types/domain';
import { BuddyEngine } from '../BuddyEngine';

function initialBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0 };
}

function emptyState(): AppState {
  return { dreams: [], journeys: [], buddy: initialBuddy(), checkIns: [] };
}

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const engine = new BuddyEngine(bus, () => state);
  engine.start();
  const reacted: BuddyReacted[] = [];
  const evolved: BuddyEvolved[] = [];
  bus.on('BuddyReacted', (event) => reacted.push(event));
  bus.on('BuddyEvolved', (event) => evolved.push(event));
  return { bus, state, reacted, evolved };
}

function grant(bus: EventBus, xp: number, coins: number) {
  bus.emit({
    type: 'RewardGranted',
    xp,
    coins,
    reason: 'StepCheckedIn',
    sourceJourneyId: 'journey_1',
  });
}

describe('BuddyEngine', () => {
  it('accrues XP + Coins and emits BuddyReacted without evolving within a stage', () => {
    const { bus, state, reacted, evolved } = setup();

    grant(bus, 10, 5);

    expect(state.buddy.xp).toBe(10);
    expect(state.buddy.coins).toBe(5);
    expect(state.buddy.level).toBe(1);
    expect(state.buddy.stage).toBe('egg');
    expect(reacted).toHaveLength(1);
    expect(reacted[0].gainedXp).toBe(10);
    expect(evolved).toHaveLength(0);
  });

  it('levels up and evolves the stage once enough XP is crossed', () => {
    const { bus, state, evolved } = setup();

    grant(bus, XP_PER_LEVEL, 0); // reaches level 2 → hatchling

    expect(state.buddy.level).toBe(2);
    expect(state.buddy.stage).toBe('hatchling');
    expect(evolved).toHaveLength(1);
    expect(evolved[0].fromStage).toBe('egg');
    expect(evolved[0].toStage).toBe('hatchling');
  });

  it('accumulates across multiple rewards and reaches later stages', () => {
    const { bus, state, evolved } = setup();

    grant(bus, XP_PER_LEVEL, 0); // level 2 → hatchling
    grant(bus, XP_PER_LEVEL, 0); // level 3 → still hatchling (sprout is level 4)
    grant(bus, XP_PER_LEVEL, 0); // level 4 → sprout

    expect(state.buddy.level).toBe(4);
    expect(state.buddy.stage).toBe('sprout');
    // egg→hatchling and hatchling→sprout — the level-3 grant does not evolve.
    expect(evolved.map((e) => e.toStage)).toEqual(['hatchling', 'sprout']);
  });
});
