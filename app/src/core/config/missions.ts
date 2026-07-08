/**
 * Mission catalog — the small set of daily/weekly game-loop tasks, as DATA
 * (Engineering Bible §3 configuration-before-code). Adding or tuning a Mission
 * happens here, never inside engine logic. Pure TS — no UI imports.
 *
 * A Mission is a "game-generated activity" that rewards **Coins, not personal
 * growth** (Product_Terminology.md). Missions therefore grant **Coins only,
 * never XP** — XP is reserved for transformation (Steps / Journeys).
 *
 * POC guardrail (POC_and_MVP_Scope §1.5): a SHALLOW economy — a handful of
 * Mission types, one currency (Coins; no gems). Each Mission's `trigger` maps to
 * an existing domain event so no bespoke tracking is needed.
 */

/** When a Mission resets: every day, or every week. */
export type MissionCadence = 'daily' | 'weekly';

/**
 * The domain event that advances a Mission by one. Reusing existing events keeps
 * the MissionEngine purely reactive (no new instrumentation in other engines).
 */
export type MissionTrigger =
  | 'StepCheckedIn'
  | 'JourneyCompleted'
  | 'ItemPurchased'
  | 'ItemEquipped';

export interface MissionDef {
  id: string;
  title: string;
  cadence: MissionCadence;
  trigger: MissionTrigger;
  /** How many trigger events complete the Mission. */
  target: number;
  /** Coins granted when the completed Mission is claimed. */
  rewardCoins: number;
}

/** The full Mission catalog. Small on purpose (POC guardrail). */
export const MISSIONS: MissionDef[] = [
  // Daily — reset each day.
  { id: 'daily_checkin_1', title: 'Check in on a Step', cadence: 'daily', trigger: 'StepCheckedIn', target: 1, rewardCoins: 5 },
  { id: 'daily_checkin_3', title: 'Check in on 3 Steps', cadence: 'daily', trigger: 'StepCheckedIn', target: 3, rewardCoins: 10 },
  { id: 'daily_dress_buddy', title: 'Dress up your Buddy', cadence: 'daily', trigger: 'ItemEquipped', target: 1, rewardCoins: 5 },
  // Weekly — reset each week.
  { id: 'weekly_checkin_10', title: 'Check in on 10 Steps this week', cadence: 'weekly', trigger: 'StepCheckedIn', target: 10, rewardCoins: 25 },
  { id: 'weekly_complete_journey', title: 'Complete a Journey', cadence: 'weekly', trigger: 'JourneyCompleted', target: 1, rewardCoins: 40 },
  { id: 'weekly_buy_cosmetic', title: 'Buy a cosmetic in the Shop', cadence: 'weekly', trigger: 'ItemPurchased', target: 1, rewardCoins: 20 },
];
