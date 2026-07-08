/**
 * Login reward configuration — the daily-login Coin reward, as DATA
 * (Engineering Bible §3 configuration-before-code). Tuning the amounts happens
 * here, never inside engine logic. Pure TS — no UI imports.
 *
 * A short repeating cycle: come back each day and claim the next tile; the cycle
 * wraps at the end. Coins are **earned, never bought** (POC guardrail: one
 * currency, no real money) and this grants **Coins only, never XP**.
 */
export interface LoginRewardConfig {
  /** Coins for each day of the cycle; index 0 = day 1. Length sets the cycle. */
  cycleCoins: number[];
}

export const LOGIN_REWARD: LoginRewardConfig = {
  cycleCoins: [5, 5, 10, 10, 15, 20, 40],
};
