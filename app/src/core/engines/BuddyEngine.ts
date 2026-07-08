/**
 * BuddyEngine — the Buddy's reaction to rewards. Subscribes to RewardGranted,
 * adds XP + Coins, recomputes level and stage from config/buddyStages, and emits
 * BuddyReacted (always) plus BuddyEvolved (only when the stage changes).
 * Buddy state is owned by AppCore and reached through an accessor. Pure TS.
 */
import { resolveBuddy } from '../config/buddyStages';
import type { EventBus } from '../events/EventBus';
import type { RewardGranted } from '../events/events';
import type { AppState, Buddy } from '../types/domain';

export class BuddyEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
  ) {}

  start(): void {
    this.bus.on('RewardGranted', this.onRewardGranted);
  }

  stop(): void {
    this.bus.off('RewardGranted', this.onRewardGranted);
  }

  private readonly onRewardGranted = (event: RewardGranted): void => {
    const state = this.getState();
    const prev = state.buddy;

    const totalXp = prev.xp + event.xp;
    const progression = resolveBuddy(totalXp);

    const next: Buddy = {
      ...prev,
      xp: totalXp,
      coins: prev.coins + event.coins,
      level: progression.level,
      stage: progression.stage,
    };
    state.buddy = next;

    this.bus.emit({
      type: 'BuddyReacted',
      buddy: next,
      gainedXp: event.xp,
      gainedCoins: event.coins,
    });

    if (next.stage !== prev.stage) {
      this.bus.emit({
        type: 'BuddyEvolved',
        buddy: next,
        fromStage: prev.stage,
        toStage: next.stage,
      });
    }
  };
}
