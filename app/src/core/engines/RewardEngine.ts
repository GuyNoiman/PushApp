/**
 * RewardEngine — turns transformation events into XP + Coins.
 * Subscribes to StepCheckedIn and JourneyCompleted; reads values from
 * config/rewards (never hardcoded here); emits RewardGranted.
 * Owns no state and knows nothing about the Buddy. Pure TS.
 */
import type { RewardConfig } from '../config/rewards';
import type { EventBus } from '../events/EventBus';
import type { JourneyCompleted, StepCheckedIn } from '../events/events';

export class RewardEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly rewards: RewardConfig,
  ) {}

  start(): void {
    this.bus.on('StepCheckedIn', this.onStepCheckedIn);
    this.bus.on('JourneyCompleted', this.onJourneyCompleted);
  }

  stop(): void {
    this.bus.off('StepCheckedIn', this.onStepCheckedIn);
    this.bus.off('JourneyCompleted', this.onJourneyCompleted);
  }

  private readonly onStepCheckedIn = (event: StepCheckedIn): void => {
    let xp = this.rewards.checkInStepXp;
    let coins = this.rewards.checkInStepCoins;
    if (event.step.isStarterStep) {
      xp += this.rewards.starterStepBonus.xp;
      coins += this.rewards.starterStepBonus.coins;
    }
    this.bus.emit({
      type: 'RewardGranted',
      xp,
      coins,
      reason: 'StepCheckedIn',
      sourceJourneyId: event.journeyId,
      sourceStepId: event.step.id,
    });
  };

  private readonly onJourneyCompleted = (event: JourneyCompleted): void => {
    this.bus.emit({
      type: 'RewardGranted',
      xp: this.rewards.completeJourneyXp,
      coins: this.rewards.completeJourneyCoins,
      reason: 'JourneyCompleted',
      sourceJourneyId: event.journey.id,
    });
  };
}
