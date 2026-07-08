/**
 * MissionEngine — owns the Missions "return loop": daily/weekly Missions and the
 * daily Login reward, both of which grant **Coins only, never XP**
 * (Product_Terminology.md — Missions reward Coins, not transformation).
 *
 * It is event-driven: it subscribes to existing domain events (StepCheckedIn,
 * JourneyCompleted, ItemPurchased, ItemEquipped) to advance Mission progress, and
 * is command-driven for claims (called by the AppCore facade). Coins flow through
 * the SAME path as the rest of the app — the engine emits RewardGranted with
 * `xp: 0` and the BuddyEngine applies the Coins. It never mutates Buddy Coins
 * itself and never grants XP. Pure TS — no UI/vendor imports.
 *
 * Day/week rollover uses an injected clock (`now`) so it is deterministic in
 * tests; there is no background timer. Reads (`getMissions`/`getClaimableCount`)
 * are PURE — they compute the view for the current clock WITHOUT mutating state,
 * so they are safe to call during React render. The authoritative rollover (which
 * mutates, auto-claims earned-but-unclaimed Coins so none are forfeited, and is
 * persisted by the caller) runs only at explicit lifecycle points — `start()` and
 * app foreground, both via `refresh()` — never on read.
 */
import type { LoginRewardConfig } from '../config/loginReward';
import type { MissionCadence, MissionDef, MissionTrigger } from '../config/missions';
import type { EventBus } from '../events/EventBus';
import type { EventOf } from '../events/events';
import type { AppState, MissionProgress } from '../types/domain';

/** A Mission enriched with its live progress/claim state for the UI to render. */
export interface MissionView {
  id: string;
  title: string;
  cadence: MissionCadence;
  target: number;
  progress: number;
  rewardCoins: number;
  /** progress ≥ target — the Coins can be claimed. */
  done: boolean;
  claimed: boolean;
}

/** One tile of the Login reward rail. */
export interface LoginDayView {
  /** 1-based day in the cycle. */
  day: number;
  coins: number;
  status: 'claimed' | 'today' | 'upcoming';
}

/** The Login reward rail plus what is claimable right now. */
export interface LoginRewardView {
  days: LoginDayView[];
  /** True when today's reward has not yet been claimed. */
  claimableToday: boolean;
  /** Coins claimable now (0 once today's reward is claimed). */
  todayCoins: number;
}

/** Local date key (YYYY-MM-DD) — the unit of the daily rollover. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Week key = the date of that week's Monday, so a new week rolls weekly Missions. */
function weekKey(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (copy.getDay() + 6) % 7; // Mon=0 … Sun=6
  copy.setDate(copy.getDate() - mondayOffset);
  return dateKey(copy);
}

export class MissionEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    private readonly missions: MissionDef[],
    private readonly loginReward: LoginRewardConfig,
    /** Injected clock (defaults to the real one) — overridden in tests. */
    private readonly now: () => Date = () => new Date(),
  ) {}

  start(): void {
    this.refresh();
    this.bus.on('StepCheckedIn', this.onStepCheckedIn);
    this.bus.on('JourneyCompleted', this.onJourneyCompleted);
    this.bus.on('ItemPurchased', this.onItemPurchased);
    this.bus.on('ItemEquipped', this.onItemEquipped);
  }

  stop(): void {
    this.bus.off('StepCheckedIn', this.onStepCheckedIn);
    this.bus.off('JourneyCompleted', this.onJourneyCompleted);
    this.bus.off('ItemPurchased', this.onItemPurchased);
    this.bus.off('ItemEquipped', this.onItemEquipped);
  }

  private readonly onStepCheckedIn = (): void => this.advance('StepCheckedIn');
  private readonly onJourneyCompleted = (): void => this.advance('JourneyCompleted');
  private readonly onItemPurchased = (): void => this.advance('ItemPurchased');
  private readonly onItemEquipped = (e: EventOf<'ItemEquipped'>): void => {
    // Only an actual equip counts toward "Dress up your Buddy" — not unequip.
    if (e.itemId === null) return;
    this.advance('ItemEquipped');
  };

  /** The current progress entry for a Mission, creating a fresh one on demand. */
  private entryFor(missionId: string): MissionProgress {
    const progress = this.getState().missions.progress;
    let entry = progress[missionId];
    if (!entry) {
      entry = { progress: 0, claimed: false };
      progress[missionId] = entry;
    }
    return entry;
  }

  /** Advance every unclaimed, not-yet-complete Mission wired to this trigger. */
  private advance(trigger: MissionTrigger): void {
    this.refresh();
    for (const def of this.missions) {
      if (def.trigger !== trigger) continue;
      const entry = this.entryFor(def.id);
      if (entry.claimed || entry.progress >= def.target) continue;

      entry.progress += 1;
      this.bus.emit({
        type: 'MissionProgressed',
        missionId: def.id,
        progress: entry.progress,
        target: def.target,
      });
      if (entry.progress >= def.target) {
        this.bus.emit({ type: 'MissionCompleted', missionId: def.id });
      }
    }
  }

  /** The daily/weekly reset keys for the current clock (pure). */
  private currentKeys(): { today: string; week: string } {
    const now = this.now();
    return { today: dateKey(now), week: weekKey(now) };
  }

  /** Whether a cadence's stored reset key is stale vs the current clock (pure). */
  private isCadenceStale(cadence: MissionCadence, keys: { today: string; week: string }): boolean {
    const missions = this.getState().missions;
    return cadence === 'daily'
      ? missions.dailyResetKey !== keys.today
      : missions.weeklyResetKey !== keys.week;
  }

  /**
   * The effective progress/claim entry for a Mission at the current clock, WITHOUT
   * mutating state: a Mission whose cadence has rolled over reads as fresh
   * (0/unclaimed) even before the authoritative `refresh()` persists that reset.
   */
  private effectiveEntry(def: MissionDef, keys: { today: string; week: string }): MissionProgress {
    if (this.isCadenceStale(def.cadence, keys)) return { progress: 0, claimed: false };
    return this.getState().missions.progress[def.id] ?? { progress: 0, claimed: false };
  }

  /**
   * Authoritative rollover: roll daily Missions over on a new day and weekly ones
   * on a new week, comparing stored reset keys to the runtime clock. Mutates state
   * (and may grant Coins) so it must run OUTSIDE render — only from `start()` and
   * app foreground; the caller persists + notifies. Idempotent.
   */
  refresh(): void {
    const state = this.getState();
    const keys = this.currentKeys();

    if (state.missions.dailyResetKey !== keys.today) {
      this.resetCadence('daily');
      state.missions.dailyResetKey = keys.today;
    }
    if (state.missions.weeklyResetKey !== keys.week) {
      this.resetCadence('weekly');
      state.missions.weeklyResetKey = keys.week;
    }
  }

  /**
   * Reset every Mission of this cadence to fresh progress. Before wiping a
   * `done`-but-unclaimed Mission, auto-claim it (grant its Coins via the normal
   * RewardGranted{ xp: 0 } path) so earned Coins are NEVER forfeited on rollover
   * — punishing the user would be against the PushApp philosophy. This is the one
   * place the engine grants on the user's behalf, and it runs outside render.
   */
  private resetCadence(cadence: MissionCadence): void {
    const progress = this.getState().missions.progress;
    for (const def of this.missions) {
      if (def.cadence !== cadence) continue;
      const entry = progress[def.id];
      if (entry && !entry.claimed && entry.progress >= def.target) {
        this.bus.emit({
          type: 'RewardGranted',
          xp: 0,
          coins: def.rewardCoins,
          reason: 'MissionClaimed',
          sourceMissionId: def.id,
        });
        this.bus.emit({ type: 'MissionClaimed', missionId: def.id, coins: def.rewardCoins });
      }
      progress[def.id] = { progress: 0, claimed: false };
    }
  }

  /**
   * Missions with their live progress, in catalog order (UI groups by cadence).
   * PURE — computes the view for the current clock (rolled-over cadences read as
   * fresh) without mutating or persisting, so it is safe during React render.
   */
  getMissions(): MissionView[] {
    const keys = this.currentKeys();
    return this.missions.map((def) => {
      const entry = this.effectiveEntry(def, keys);
      return {
        id: def.id,
        title: def.title,
        cadence: def.cadence,
        target: def.target,
        progress: Math.min(entry.progress, def.target),
        rewardCoins: def.rewardCoins,
        done: entry.progress >= def.target,
        claimed: entry.claimed,
      };
    });
  }

  /**
   * Claim a completed Mission's Coins. No-op (returns false) when the Mission is
   * unknown, not yet complete, or already claimed. On success marks it claimed
   * and emits RewardGranted (xp: 0) so the Buddy applies the Coins, then
   * MissionClaimed. A second claim is blocked by the `claimed` flag.
   */
  claimMission(id: string): boolean {
    this.refresh();
    const def = this.missions.find((d) => d.id === id);
    if (!def) return false;
    const entry = this.entryFor(id);
    if (entry.progress < def.target) return false;
    if (entry.claimed) return false;

    entry.claimed = true;
    this.bus.emit({
      type: 'RewardGranted',
      xp: 0,
      coins: def.rewardCoins,
      reason: 'MissionClaimed',
      sourceMissionId: id,
    });
    this.bus.emit({ type: 'MissionClaimed', missionId: id, coins: def.rewardCoins });
    return true;
  }

  /** The Login reward rail plus today's claimable amount. */
  getLoginReward(): LoginRewardView {
    const login = this.getState().login;
    const cycle = this.loginReward.cycleCoins;
    const today = dateKey(this.now());
    const claimedToday = login.lastClaimedKey === today;
    // After claiming the final day, dayIndex wraps to 0; show the whole cycle as
    // claimed for the rest of the day rather than resetting the rail to upcoming.
    const cycleComplete = claimedToday && login.dayIndex === 0;

    const days: LoginDayView[] = cycle.map((coins, i) => {
      let status: LoginDayView['status'];
      if (cycleComplete || i < login.dayIndex) {
        status = 'claimed';
      } else if (!claimedToday && i === login.dayIndex) {
        status = 'today';
      } else {
        status = 'upcoming';
      }
      return { day: i + 1, coins, status };
    });

    return {
      days,
      claimableToday: !claimedToday,
      // `?? 0` guards a dayIndex that fell out of range (cycle-length change /
      // corrupt snapshot) so the claimable amount can never read as undefined.
      todayCoins: claimedToday ? 0 : (cycle[login.dayIndex] ?? 0),
    };
  }

  /**
   * Claim today's Login reward. No-op (returns false) when it was already claimed
   * today. On success advances the cycle (wrapping), records the claim date, and
   * emits RewardGranted (xp: 0) so the Buddy applies the Coins, then
   * LoginRewardClaimed. Re-claiming the same day is blocked by the date check.
   */
  claimLoginReward(): boolean {
    const state = this.getState();
    const cycle = this.loginReward.cycleCoins;
    const today = dateKey(this.now());
    if (state.login.lastClaimedKey === today) return false;

    const coins = cycle[state.login.dayIndex] ?? 0; // never grant undefined Coins
    const day = state.login.dayIndex + 1;
    state.login.lastClaimedKey = today;
    state.login.dayIndex = (state.login.dayIndex + 1) % cycle.length;

    this.bus.emit({ type: 'RewardGranted', xp: 0, coins, reason: 'LoginRewardClaimed' });
    this.bus.emit({ type: 'LoginRewardClaimed', day, coins });
    return true;
  }

  /**
   * Count of rewards ready to collect now (done-unclaimed Missions + today's
   * Login). PURE — computes for the current clock without mutating, so it is safe
   * to call from `getSnapshot()` during render.
   */
  getClaimableCount(): number {
    const keys = this.currentKeys();
    let count = this.getLoginReward().claimableToday ? 1 : 0;
    for (const def of this.missions) {
      const entry = this.effectiveEntry(def, keys);
      if (!entry.claimed && entry.progress >= def.target) count += 1;
    }
    return count;
  }
}
