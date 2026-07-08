/**
 * Reward configuration — XP and Coin values per action, as DATA
 * (Engineering Bible §3 configuration-before-code). Tuning happens here,
 * never inside engine logic. Pure TS.
 *
 * XP is awarded only for behaviours connected to transformation (Steps, Journeys).
 * Coins reward engagement with the game layer. See Product_Terminology.md.
 */
export interface RewardConfig {
  /** Granted for checking in on an ordinary Step. */
  checkInStepXp: number;
  checkInStepCoins: number;
  /** Granted when a whole Journey is completed. */
  completeJourneyXp: number;
  completeJourneyCoins: number;
  /** Extra reward for checking in on the Starter Step (the momentum-maker). */
  starterStepBonus: {
    xp: number;
    coins: number;
  };
}

export const REWARDS: RewardConfig = {
  checkInStepXp: 10,
  checkInStepCoins: 5,
  completeJourneyXp: 100,
  completeJourneyCoins: 50,
  starterStepBonus: {
    xp: 15,
    coins: 5,
  },
};
