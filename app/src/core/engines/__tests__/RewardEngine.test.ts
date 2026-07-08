/**
 * RewardEngine unit tests — pure TS. Verifies XP/Coins are read from config and
 * that the Starter Step bonus is applied (Engineering Bible §18).
 */
import { REWARDS } from '../../config/rewards';
import { EventBus } from '../../events/EventBus';
import type { RewardGranted } from '../../events/events';
import type { CheckIn, Journey, Step } from '../../types/domain';
import { RewardEngine } from '../RewardEngine';

function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    id: 'step_1',
    title: 'Walk',
    isStarterStep: false,
    cadence: 'once',
    done: true,
    ...overrides,
  };
}

function makeCheckIn(): CheckIn {
  return { id: 'checkin_1', journeyId: 'journey_1', stepId: 'step_1', at: 0 };
}

function makeJourney(): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 0,
  };
}

function setup() {
  const bus = new EventBus();
  const engine = new RewardEngine(bus, REWARDS);
  engine.start();
  const rewards: RewardGranted[] = [];
  bus.on('RewardGranted', (event) => rewards.push(event));
  return { bus, rewards };
}

describe('RewardEngine', () => {
  it('grants the base XP/Coins for an ordinary Step check-in', () => {
    const { bus, rewards } = setup();

    bus.emit({
      type: 'StepCheckedIn',
      journeyId: 'journey_1',
      step: makeStep(),
      checkIn: makeCheckIn(),
    });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].xp).toBe(REWARDS.checkInStepXp);
    expect(rewards[0].coins).toBe(REWARDS.checkInStepCoins);
    expect(rewards[0].reason).toBe('StepCheckedIn');
  });

  it('adds the Starter Step bonus for a Starter Step check-in', () => {
    const { bus, rewards } = setup();

    bus.emit({
      type: 'StepCheckedIn',
      journeyId: 'journey_1',
      step: makeStep({ isStarterStep: true }),
      checkIn: makeCheckIn(),
    });

    expect(rewards[0].xp).toBe(REWARDS.checkInStepXp + REWARDS.starterStepBonus.xp);
    expect(rewards[0].coins).toBe(REWARDS.checkInStepCoins + REWARDS.starterStepBonus.coins);
  });

  it('grants completion XP/Coins when a Journey is completed', () => {
    const { bus, rewards } = setup();

    bus.emit({ type: 'JourneyCompleted', journey: makeJourney() });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].xp).toBe(REWARDS.completeJourneyXp);
    expect(rewards[0].coins).toBe(REWARDS.completeJourneyCoins);
    expect(rewards[0].reason).toBe('JourneyCompleted');
  });
});
