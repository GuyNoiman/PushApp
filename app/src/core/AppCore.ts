/**
 * AppCore — the composition root. It builds the EventBus, the Repository, and
 * every engine, wires their subscriptions, loads persisted state on start and
 * saves on change, and exposes a small facade to the UI. This is the only place
 * that knows how the pieces fit together; the UI talks only to this facade.
 *
 * Business logic lives in the engines (Engineering Bible §19). AppCore just wires
 * and owns state — it performs no reward/Buddy/Journey math itself.
 */
import { resolveBuddy, stageDisplayName as resolveStageDisplayName } from './config/buddyStages';
import { LOGIN_REWARD } from './config/loginReward';
import { MISSIONS } from './config/missions';
import { REWARDS } from './config/rewards';
import { resolveCosmetic, SHOP_ITEMS, type ShopItem } from './config/shopItems';
import { BuddyEngine } from './engines/BuddyEngine';
import { JourneyEngine, type NewJourneyInput, type TodayStep } from './engines/JourneyEngine';
import {
  MissionEngine,
  type LoginRewardView,
  type MissionView,
} from './engines/MissionEngine';
import { EntitlementEngine } from './engines/EntitlementEngine';
import { ReminderEngine, type DailyReminderInput } from './engines/ReminderEngine';
import { RewardEngine } from './engines/RewardEngine';
import { ShopEngine } from './engines/ShopEngine';
import type { GatedFeature } from './config/tiers';
import { EventBus } from './events/EventBus';
import { getLocationGateway } from './location';
import { getCalendarGateway } from './calendar';
import { LocalRepository } from './persistence/LocalRepository';
import type { Repository } from './persistence/Repository';
import type {
  AppState,
  Buddy,
  BuddyStage,
  CommunicationPrefs,
  Journey,
  ReminderRule,
  ReminderTrigger,
} from './types/domain';
import { createId } from './util/id';
import { FREE_ENTITLEMENT, type AccountTier, type Entitlement } from './types/entitlement';

/** A Buddy enriched with derived progression for display. */
export interface BuddyView extends Buddy {
  stageDisplayName: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/** An immutable read-model the UI renders. Recomputed on every change. */
export interface Snapshot {
  buddy: BuddyView;
  journeys: Journey[];
  todaySteps: TodayStep[];
  activeJourneyCount: number;
  /** Rewards ready to collect now (done-unclaimed Missions + today's Login) — drives the Home badge. */
  claimableRewards: number;
}

function initialBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null };
}

/** Default communication prefs: everything on except the OS-permission opt-ins. */
function defaultCommunicationPrefs(): CommunicationPrefs {
  return {
    remindersEnabled: true,
    socialCheerEnabled: true,
    socialNudgeEnabled: true,
    locationOptIn: false,
    calendarOptIn: false,
  };
}

function emptyState(): AppState {
  return {
    dreams: [],
    journeys: [],
    buddy: initialBuddy(),
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: defaultCommunicationPrefs(),
  };
}

/**
 * Backfill fields added after a user's state was first persisted, so loading an
 * older — or partially corrupt — snapshot never crashes or drops data
 * (offline-first migration). Merges the loaded value over known-good defaults:
 * existing values win, missing/absent shape (e.g. no `buddy`, no `journeys`) is
 * healed rather than dereferenced, so a bad payload can't crash-loop launch.
 */
function migrateState(state: AppState): AppState {
  const base = emptyState();
  return {
    ...base,
    ...state,
    dreams: state.dreams ?? base.dreams,
    journeys: state.journeys ?? base.journeys,
    checkIns: state.checkIns ?? base.checkIns,
    buddy: { ...base.buddy, ...state.buddy },
    missions: {
      ...base.missions,
      ...state.missions,
      progress: state.missions?.progress ?? base.missions.progress,
    },
    login: clampLogin({ ...base.login, ...state.login }),
    reminderRules: state.reminderRules ?? base.reminderRules,
    communicationPrefs: { ...base.communicationPrefs, ...state.communicationPrefs },
    // migrateState only runs on a PRE-EXISTING persisted snapshot (first run uses
    // emptyState directly). So any state reaching here belongs to an existing user
    // who predates onboarding — treat them as already onboarded (a nonzero
    // timestamp) so they never see it. A snapshot that already recorded a value
    // keeps it.
    onboardingCompletedAt: state.onboardingCompletedAt ?? 1,
  };
}

/**
 * Keep `login.dayIndex` a valid index into the login cycle. A future cycle-length
 * change or a corrupt snapshot could leave it out of range, which would make the
 * engine grant `undefined` Coins and turn the Buddy's balance into NaN forever.
 */
function clampLogin(login: AppState['login']): AppState['login'] {
  const lastIndex = Math.max(0, LOGIN_REWARD.cycleCoins.length - 1);
  const dayIndex = Number.isFinite(login.dayIndex)
    ? Math.min(Math.max(0, Math.floor(login.dayIndex)), lastIndex)
    : 0;
  return { ...login, dayIndex };
}

export class AppCore {
  /** Exposed so the UI can react to one-off moments (e.g. a Buddy celebration). */
  readonly bus = new EventBus();

  private state: AppState = emptyState();
  private readonly repo: Repository;

  private readonly journeyEngine: JourneyEngine;
  private readonly rewardEngine: RewardEngine;
  private readonly buddyEngine: BuddyEngine;
  private readonly reminderEngine: ReminderEngine;
  private readonly shopEngine: ShopEngine;
  private readonly missionEngine: MissionEngine;
  private readonly entitlementEngine: EntitlementEngine;

  /**
   * Reads the entitlement the EntitlementEngine should compute against. Defaults
   * to the locally-persisted entitlement; EntitlementProvider overrides it (via
   * {@link setEntitlementReader}) so a NON-persisted server elevation (subscriber/
   * grant) can drive the effective tier without being written to disk. Behavior is
   * identical to the previous in-provider engine construction.
   */
  private entitlementReader: () => Entitlement = () => this.getEntitlement();

  private readonly listeners = new Set<() => void>();
  private started = false;

  constructor(repo: Repository = new LocalRepository()) {
    this.repo = repo;
    const getState = () => this.state;
    this.journeyEngine = new JourneyEngine(this.bus, getState);
    this.rewardEngine = new RewardEngine(this.bus, REWARDS);
    this.buddyEngine = new BuddyEngine(this.bus, getState);
    // Pass the bus as the reserved intervention seam (deferred): the engine only
    // stores it today and subscribes to nothing — no behavior change. The
    // location/calendar gateways are the DORMANT trigger seams — both resolve to
    // their Null gateway today (flags off), so those trigger kinds are graceful
    // no-ops.
    this.reminderEngine = new ReminderEngine(this.bus, {
      location: getLocationGateway(),
      calendar: getCalendarGateway(),
    });
    this.shopEngine = new ShopEngine(this.bus, getState, SHOP_ITEMS);
    this.missionEngine = new MissionEngine(this.bus, getState, MISSIONS, LOGIN_REWARD);
    // Composition root owns the EntitlementEngine (like every other engine). It
    // reads through `entitlementReader` (provider-overridable for server elevation)
    // and persists a local trial via setEntitlement — same wiring as before, just
    // hoisted out of EntitlementProvider.
    this.entitlementEngine = new EntitlementEngine(
      () => this.entitlementReader(),
      (e) => this.setEntitlement(e),
    );
  }

  /** Load persisted state (seeding a demo Journey on first run) and start engines. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const loaded = await this.repo.load();
    if (loaded) {
      this.state = migrateState(loaded);
    } else {
      this.state = emptyState();
    }

    this.rewardEngine.start();
    this.buddyEngine.start();

    // Persist + notify after any state-changing domain event. Subscribed BEFORE
    // the MissionEngine starts so that a rollover on start() (which can auto-claim
    // earned Coins) is persisted through the same path.
    this.bus.on('JourneyCreated', this.onChanged);
    this.bus.on('StepCheckedIn', this.onChanged);
    this.bus.on('JourneyCompleted', this.onChanged);
    this.bus.on('BuddyReacted', this.onChanged);
    this.bus.on('ItemPurchased', this.onChanged);
    this.bus.on('ItemEquipped', this.onChanged);
    this.bus.on('MissionClaimed', this.onChanged);
    this.bus.on('LoginRewardClaimed', this.onChanged);
    this.bus.on('ReminderRuleAdded', this.onChanged);
    this.bus.on('ReminderRuleRemoved', this.onChanged);

    // start() runs the authoritative day/week rollover once on launch.
    this.missionEngine.start();

    if (!loaded) {
      this.seedDemoJourney();
    }
  }

  private readonly onChanged = (): void => {
    void this.repo.save(this.state);
    this.notify();
  };

  /** Seed ONE demo Journey (Starter Step + 2 ordinary Steps) so Home isn't empty. */
  private seedDemoJourney(): void {
    this.journeyEngine.createJourney({
      title: 'Run 5km',
      why: ['Feel stronger and clear-headed', 'Prove to myself I follow through'],
      durationDays: 30,
      rhythm: 'few-times-week',
      steps: [
        {
          title: 'Lace up and walk for 10 minutes',
          description: 'The Starter Step — just get out the door.',
          isStarterStep: true,
          cadence: 'once',
        },
        { title: 'Jog for 15 minutes', cadence: 'weekly' },
        { title: 'Run a full 2km without stopping', cadence: 'weekly' },
      ],
    });
  }

  // ── Facade ────────────────────────────────────────────────────────────────

  createJourney(input: NewJourneyInput): Journey {
    return this.journeyEngine.createJourney(input);
  }

  checkInStep(journeyId: string, stepId: string): void {
    this.journeyEngine.checkInStep(journeyId, stepId);
  }

  /**
   * A Journey's completion ratio in [0,1] (done Steps / total). Facade over the
   * JourneyEngine selector so callers (e.g. SocialProvider's progress publish)
   * don't recompute Step math inline (Engineering Bible §19).
   */
  journeyProgress(journeyId: string): number {
    return this.journeyEngine.journeyProgress(journeyId);
  }

  /** The Shop cosmetic catalog (read-only config) for the Shop screen to render. */
  getShopItems(): ShopItem[] {
    return SHOP_ITEMS;
  }

  /**
   * The full cosmetic catalog for presentational Buddy surfaces (e.g. the
   * inventory grid), so components read the catalog through the facade rather than
   * importing core config directly (Engineering Bible §19). Same data as the Shop
   * catalog today; a distinct method keeps the intent (cosmetics, not the Shop).
   */
  getCosmetics(): ShopItem[] {
    return SHOP_ITEMS;
  }

  /**
   * Resolve an equipped cosmetic by id (or undefined), so the Buddy scene doesn't
   * import core config directly. Delegates to the config resolver.
   */
  resolveCosmetic(id: string | null | undefined): ShopItem | undefined {
    return resolveCosmetic(id);
  }

  /** Buy a cosmetic with Coins. Returns whether the purchase succeeded. */
  purchaseItem(itemId: string): boolean {
    return this.shopEngine.purchase(itemId);
  }

  /** Wear an owned cosmetic on the Buddy. Returns whether it was equipped. */
  equipItem(itemId: string): boolean {
    return this.shopEngine.equip(itemId);
  }

  /** Remove whatever cosmetic the Buddy is wearing. */
  unequipItem(): void {
    this.shopEngine.unequip();
  }

  /** Daily/weekly Missions with live progress (Coins-only game loop). */
  getMissions(): MissionView[] {
    return this.missionEngine.getMissions();
  }

  /** Claim a completed Mission's Coins. Returns whether it was claimed. */
  claimMission(id: string): boolean {
    return this.missionEngine.claimMission(id);
  }

  /** The daily Login reward rail plus today's claimable amount. */
  getLoginReward(): LoginRewardView {
    return this.missionEngine.getLoginReward();
  }

  /** Claim today's Login reward Coins. Returns whether it was claimed. */
  claimLoginReward(): boolean {
    return this.missionEngine.claimLoginReward();
  }

  /**
   * Reconcile Missions with the wall clock (day/week rollover) at an explicit
   * lifecycle point — called by the UI glue on app foreground, never during
   * render. Any earned-but-unclaimed Coins are auto-claimed before a reset (so
   * none are forfeited), then state is persisted + subscribers notified once.
   */
  syncTime(): void {
    this.missionEngine.refresh();
    this.onChanged();
  }

  /** Request notification permission for on-device reminders. Returns whether granted. */
  initReminders(): Promise<boolean> {
    return this.reminderEngine.init();
  }

  /** Schedule a simple time/day reminder. Returns the reminder id, or null if unavailable. */
  scheduleDailyReminder(input: DailyReminderInput): Promise<string | null> {
    return this.reminderEngine.scheduleDailyReminder(input);
  }

  // ── Reminders / communication prefs ─────────────────────────────────────────

  /**
   * Create a reminder for a Journey, schedule its OS notification(s), and persist.
   * The rule owns the scheduled notification ids so it can later be cancelled.
   * Scheduling is best-effort (no permission ⇒ no ids); the rule is still saved so
   * it can be (re)scheduled once permission is granted.
   */
  async addReminderRule(input: {
    journeyId: string;
    trigger: ReminderTrigger;
    title: string;
    body: string;
    enabled?: boolean;
  }): Promise<ReminderRule> {
    const rule: ReminderRule = {
      id: createId('reminder'),
      journeyId: input.journeyId,
      trigger: input.trigger,
      title: input.title,
      body: input.body,
      enabled: input.enabled ?? true,
      scheduledNotificationIds: [],
    };
    rule.scheduledNotificationIds = await this.reminderEngine.scheduleRule(rule);
    this.state.reminderRules.push(rule);
    this.bus.emit({ type: 'ReminderRuleAdded', rule });
    return rule;
  }

  /**
   * Replace an existing reminder rule: cancel its old OS notifications, reschedule
   * from the new definition, and persist. No-op (returns null) if the id is unknown.
   */
  async updateReminderRule(
    id: string,
    changes: Partial<Pick<ReminderRule, 'trigger' | 'title' | 'body' | 'enabled'>>,
  ): Promise<ReminderRule | null> {
    const existing = this.state.reminderRules.find((r) => r.id === id);
    if (!existing) return null;
    await this.reminderEngine.cancelRule(existing);
    const next: ReminderRule = { ...existing, ...changes, scheduledNotificationIds: [] };
    next.scheduledNotificationIds = await this.reminderEngine.scheduleRule(next);
    const idx = this.state.reminderRules.findIndex((r) => r.id === id);
    this.state.reminderRules[idx] = next;
    this.bus.emit({ type: 'ReminderRuleAdded', rule: next });
    return next;
  }

  /**
   * Remove a reminder rule: cancel its OS notifications, drop it, and persist.
   * No-op (returns false) if the id is unknown.
   */
  async removeReminderRule(id: string): Promise<boolean> {
    const existing = this.state.reminderRules.find((r) => r.id === id);
    if (!existing) return false;
    await this.reminderEngine.cancelRule(existing);
    this.state.reminderRules = this.state.reminderRules.filter((r) => r.id !== id);
    this.bus.emit({ type: 'ReminderRuleRemoved', ruleId: id });
    return true;
  }

  /** All reminder rules, or only those for a given Journey when `journeyId` is passed. */
  listReminderRules(journeyId?: string): ReminderRule[] {
    const rules = this.state.reminderRules;
    return journeyId ? rules.filter((r) => r.journeyId === journeyId) : [...rules];
  }

  /** Set a single communication preference and persist. */
  setCommunicationPref<K extends keyof CommunicationPrefs>(key: K, value: CommunicationPrefs[K]): void {
    this.state.communicationPrefs = { ...this.state.communicationPrefs, [key]: value };
    this.onChanged();
  }

  /** Opt in/out of location-triggered reminders (dormant seam). Persists. */
  setLocationOptIn(value: boolean): void {
    this.setCommunicationPref('locationOptIn', value);
  }

  /** Opt in/out of calendar-triggered reminders (dormant seam). Persists. */
  setCalendarOptIn(value: boolean): void {
    this.setCommunicationPref('calendarOptIn', value);
  }

  /**
   * The LOCALLY-persisted entitlement (types/entitlement.ts), or the offline-
   * first `free` default when none has been stored. This holds only the local
   * dev/POC trial; a server `subscriber` tier is read live via EntitlementGateway
   * and is never persisted here. Carries no PII.
   */
  getEntitlement(): Entitlement {
    return this.state.entitlement ?? FREE_ENTITLEMENT;
  }

  /**
   * Persist a locally-derived entitlement (the dev/POC trial only — a
   * subscriber tier is never client-written). Saved through the Repository like
   * every other state change and notifies subscribers.
   */
  setEntitlement(entitlement: Entitlement): void {
    this.state.entitlement = entitlement;
    this.onChanged();
  }

  /**
   * Point the EntitlementEngine at a custom entitlement source (used by
   * EntitlementProvider to feed a NON-persisted server elevation into the effective
   * tier). Passing no reader restores the default (the persisted local entitlement).
   */
  setEntitlementReader(reader?: () => Entitlement): void {
    this.entitlementReader = reader ?? (() => this.getEntitlement());
  }

  /** The account's EFFECTIVE tier for the current clock (a lapsed trial → free). */
  getEffectiveTier(): AccountTier {
    return this.entitlementEngine.getEffectiveTier();
  }

  /** Whether a feature is unlocked at the account's effective tier. */
  isFeatureActive(feature: GatedFeature): boolean {
    return this.entitlementEngine.isActive(feature);
  }

  /** Start a LOCAL dev/POC trial for `days` days. Returns whether it started. */
  startTrial(days: number): boolean {
    return this.entitlementEngine.startTrial(days);
  }

  /**
   * Display name for a Buddy stage — lets a one-off UI surface (e.g. the
   * evolution reveal) name the new stage without importing engine/config.
   */
  stageDisplayName(stage: BuddyStage): string {
    return resolveStageDisplayName(stage);
  }

  getSnapshot(): Snapshot {
    const p = resolveBuddy(this.state.buddy.xp);
    const buddy: BuddyView = {
      ...this.state.buddy,
      level: p.level,
      stage: p.stage,
      stageDisplayName: p.stageDisplayName,
      xpIntoLevel: p.xpIntoLevel,
      xpForNextLevel: p.xpForNextLevel,
    };
    return {
      buddy,
      journeys: this.state.journeys,
      todaySteps: this.journeyEngine.getTodaySteps(),
      activeJourneyCount: this.state.journeys.filter((j) => !j.completedAt).length,
      claimableRewards: this.missionEngine.getClaimableCount(),
    };
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
