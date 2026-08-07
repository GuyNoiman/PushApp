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
import { CommunicationScheduler } from './engines/CommunicationScheduler';
import { RewardEngine } from './engines/RewardEngine';
import { ShopEngine } from './engines/ShopEngine';
import { createJourneyFromGoalSpec } from './coach/goalSpecToJourney';
import type { GoalSpec } from './coach/interviewPlaybook';
import { RecoveryEngine, type SubmitReasonInput } from './recovery/RecoveryEngine';
import { setMockBusy, setMockLocation, type MockPlace } from './recovery/mockEnv';
import { BehaviorModelEngine } from './learning/BehaviorModelEngine';
import { planJourney } from './learning/Planner';
import { GeneralExpert } from './learning/DomainExpert';
import { replan } from './learning/AdaptivePlanner';
import { applyReplan } from './learning/applyReplan';
import type { GoalInput, PlanConstraints } from './learning/types';
import { featureFlags } from './config/featureFlags';
import type { GatedFeature } from './config/tiers';
import { EventBus } from './events/EventBus';
import { getLocationGateway } from './location';
import { getCalendarGateway } from './calendar';
import { EncryptedLocalRepository } from './persistence/EncryptedLocalRepository';
import type { Repository } from './persistence/Repository';
import type {
  AppState,
  Buddy,
  BuddyStage,
  CommunicationPrefs,
  Dream,
  Journey,
  ReasonEntry,
  ReasonId,
  ReminderRule,
  ReminderTrigger,
  SchedulingPrefs,
} from './types/domain';
import type { Candidate } from './util/reschedule';
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
  /** Long-term Dreams — Home groups the week's Steps by the Dream their Journey serves. */
  dreams: Dream[];
  journeys: Journey[];
  todaySteps: TodayStep[];
  /** Home's "Week's steps" list — todaySteps plus already-done Steps (kept visible, sunk to the bottom). */
  weekSteps: TodayStep[];
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

/**
 * Default scheduling prefs: all-permissive so nothing changes until the user sets
 * one — no window, no day-part constraint, all weekdays allowed.
 */
function defaultSchedulingPrefs(): SchedulingPrefs {
  return { window: undefined, dayPart: 'either', preferredDays: [] };
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
    schedulingPrefs: defaultSchedulingPrefs(),
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
    schedulingPrefs: { ...base.schedulingPrefs, ...state.schedulingPrefs },
    // Miss-Recovery reason log — backfill to [] for a snapshot that predates it. Kept
    // on-device only; whitelist-excluded from the Social sync path (G2).
    reasonLog: state.reasonLog ?? [],
    // Adaptive-coach on-device signal (S1.16) — backfill the raw log to [] for a snapshot
    // that predates it, so hydrate never dereferences an absent field. The derived
    // insightModel carries over untouched (undefined until first recomputed). ON-DEVICE
    // ONLY (G1); only populated when the adaptiveCoach flag is on.
    behaviorLog: state.behaviorLog ?? [],
    insightModel: state.insightModel,
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
  private readonly communicationScheduler: CommunicationScheduler;
  private readonly shopEngine: ShopEngine;
  private readonly missionEngine: MissionEngine;
  private readonly entitlementEngine: EntitlementEngine;
  private readonly recoveryEngine: RecoveryEngine;
  /**
   * The adaptive coach's "learn the user" engine — constructed ONLY when the
   * `adaptiveCoach` flag is on (undefined otherwise, so production wires nothing new).
   * The raw behaviour log it holds is ON-DEVICE ONLY (G1).
   */
  private readonly behaviorModel?: BehaviorModelEngine;

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

  constructor(repo: Repository = new EncryptedLocalRepository()) {
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
    const location = getLocationGateway();
    const calendar = getCalendarGateway();
    this.reminderEngine = new ReminderEngine(this.bus, { location, calendar });
    // The central "Communication Scheduler" plans + applies the whole reminder set
    // through the ReminderEngine. The location/calendar gateways stay dormant (Null),
    // so those trigger kinds produce nothing and nothing leaves the device (R2).
    this.communicationScheduler = new CommunicationScheduler(
      this.bus,
      getState,
      this.reminderEngine,
      { location, calendar },
    );
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
    // The RecoveryEngine orchestrates the user-triggered Miss-Recovery loop. It reuses
    // the reminder facade (add/update/list) so rule mutation + reconcile stay in ONE
    // place, and reads the SAME location/calendar gateways (Null/permissive in prod;
    // the dev mock only when featureFlags.devMockRecovery). It never emits StepMissed
    // and never touches Grace Tokens (Cancel is free — PRD §9).
    this.recoveryEngine = new RecoveryEngine(
      this.bus,
      getState,
      this.journeyEngine,
      {
        listReminderRules: (journeyId) => this.listReminderRules(journeyId),
        addReminderRule: (input) => this.addReminderRule(input),
        updateReminderRule: (id, changes) => this.updateReminderRule(id, changes),
      },
      location,
      calendar,
    );
    // Adaptive-coach pivot (S1.16): DORMANT in production. Only when the flag is on do we
    // construct the BehaviorModelEngine (shared bus + getState + default clock). Off ⇒ this
    // stays undefined and no behaviour is observed, recorded, or persisted.
    if (featureFlags.adaptiveCoach) {
      this.behaviorModel = new BehaviorModelEngine(this.bus, getState);
    }
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

    // Adaptive coach (flag on only): seed the engine from the persisted on-device log, then
    // persist the log + derived insights back through onChanged whenever a new signal lands.
    // InsightUpdated fires on every appended record (including the slip detector's), so it is
    // the single hook that captures all log changes. Off ⇒ behaviorModel is undefined, nothing
    // is hydrated or subscribed, and production behaviour is untouched.
    if (this.behaviorModel) {
      this.behaviorModel.hydrate(this.state.behaviorLog ?? []);
      this.bus.on('InsightUpdated', this.onBehaviorChanged);
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
    this.bus.on('SchedulingPrefsChanged', this.onChanged);
    // Miss-Recovery loop: persist the reason log + any Step/reminder change it makes.
    // recordReason mutates state without its own event, so these are what save it.
    this.bus.on('StepPostponed', this.onChanged);
    this.bus.on('StepCancelled', this.onChanged);
    this.bus.on('ReminderRescheduled', this.onChanged);

    // The Communication Scheduler re-plans the whole notification set whenever the
    // inputs change. The reminder facade methods reconcile directly (right after
    // persisting), so here we only wire the events they DON'T emit: a completed
    // Journey (its reminders must stop) and a scheduling-prefs change.
    this.bus.on('JourneyCompleted', this.onReconcile);
    this.bus.on('SchedulingPrefsChanged', this.onReconcile);

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

  /** Re-plan + re-apply the scheduler-owned notification set (fire-and-forget). */
  private readonly onReconcile = (): void => {
    void this.communicationScheduler.reconcile();
  };

  /**
   * Adaptive coach (flag on only): mirror the engine's on-device raw log + derived insights
   * into AppState and persist them through the existing save path. Both stay ON DEVICE (G1) —
   * they are only written to the local Repository, never emitted or synced.
   */
  private readonly onBehaviorChanged = (): void => {
    if (!this.behaviorModel) return;
    this.state.behaviorLog = this.behaviorModel.getRawLog();
    this.state.insightModel = this.behaviorModel.getInsights();
    this.onChanged();
  };

  /**
   * Seed demo data so Home / Journeys aren't empty AND the Dream connection is
   * visible: TWO Dreams, each grouping related Journeys. Home groups the week's
   * Steps by the Dream their Journey serves; the Journeys tab shows the Dream as an
   * eyebrow. (Dev seed only — real data replaces this once the coach creates plans.)
   */
  private seedDemoJourney(): void {
    const dreamFit: Dream = { id: 'dream_fit', title: 'Get fit and strong', journeyIds: [] };
    const dreamCalm: Dream = { id: 'dream_calm', title: 'Sleep and recover well', journeyIds: [] };
    this.state.dreams.push(dreamFit, dreamCalm);

    const run = this.journeyEngine.createJourney({
      title: 'Run 5km',
      dreamId: dreamFit.id,
      why: ['Feel stronger and clear-headed', 'Prove to myself I follow through'],
      durationDays: 30,
      rhythm: 'few-times-week',
      steps: [
        {
          title: 'Lace up and walk for 10 minutes',
          description: 'The Starter Step — just get out the door.',
          isStarterStep: true,
          cadence: 'once',
          // Miss-Recovery demo: an expected length (powers Reshape + slot fit) and a
          // home-only constraint (the reschedule gate drops proposed times when the
          // dev mock says "away").
          estimatedDuration: 20,
          constraints: [{ kind: 'location', place: 'home' }],
        },
        { title: 'Jog for 15 minutes', cadence: 'weekly', estimatedDuration: 30 },
        { title: 'Run a full 2km without stopping', cadence: 'weekly', estimatedDuration: 40 },
      ],
    });

    const strength = this.journeyEngine.createJourney({
      title: 'Build core strength',
      dreamId: dreamFit.id,
      why: ['Feel capable in my body', 'Protect my back'],
      durationDays: 42,
      rhythm: 'few-times-week',
      steps: [
        { title: 'Do 10 push-ups', cadence: 'weekly', estimatedDuration: 10 },
        { title: 'Hold a 60-second plank', cadence: 'weekly', estimatedDuration: 10 },
      ],
    });

    const sleep = this.journeyEngine.createJourney({
      title: 'Wind down by 11pm',
      dreamId: dreamCalm.id,
      why: ['Wake up clear-headed', 'More patience during the day'],
      durationDays: 30,
      rhythm: 'daily',
      steps: [
        { title: 'No screens after 10:30', cadence: 'daily', estimatedDuration: 5 },
        { title: 'Read for 15 minutes', cadence: 'daily', estimatedDuration: 15 },
      ],
    });

    dreamFit.journeyIds = [run.id, strength.id];
    dreamCalm.journeyIds = [sleep.id];
  }

  // ── Facade ────────────────────────────────────────────────────────────────

  createJourney(input: NewJourneyInput): Journey {
    return this.journeyEngine.createJourney(input);
  }

  /**
   * Create a real Journey from a finished coach interview's {@link GoalSpec} — the one-call bridge
   * the live coach's "Build my Journey" CTA calls. Delegates to the {@link ./coach/goalSpecToJourney}
   * helper over this core's JourneyEngine, so it plans + persists + notifies through the SAME
   * `JourneyCreated` path as {@link createJourney}. This is a NORMAL Journey creation — it is NOT
   * gated behind `adaptiveCoach`; the goal specifics stay ON DEVICE (G1). No planning logic here.
   */
  createJourneyFromGoalSpec(spec: GoalSpec): Journey {
    return createJourneyFromGoalSpec(this.journeyEngine, spec);
  }

  /**
   * Adaptive coach (flag on only): deterministically PLAN a Journey from a goal + real-world
   * constraints (via the pure {@link planJourney} over the default {@link GeneralExpert}), then
   * create it through the SAME JourneyEngine path as {@link createJourney} — so it persists and
   * notifies exactly like any other Journey. Returns null (inert) when the flag is off, so
   * production behaviour is unchanged. The goal title/specifics stay ON DEVICE (G1).
   */
  generateJourney(goal: GoalInput, constraints: PlanConstraints): Journey | null {
    if (!featureFlags.adaptiveCoach) return null;
    const input = planJourney(goal, constraints, GeneralExpert);
    return this.journeyEngine.createJourney(input);
  }

  /**
   * Adaptive coach (flag on only): re-plan an existing Journey from the on-device InsightModel
   * (pure {@link replan}) and enact the intended per-Step changes via the JourneyEngine
   * ({@link applyReplan}). Returns whether anything changed; false + inert when the flag is off
   * or the id is unknown. All reasoning stays in the pure planner; nothing new leaves the device.
   */
  adaptJourney(journeyId: string, constraints: PlanConstraints): boolean {
    if (!featureFlags.adaptiveCoach || !this.behaviorModel) return false;
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey) return false;
    const result = replan(journey, this.behaviorModel.getInsights(), constraints, undefined, Date.now());
    applyReplan(this.journeyEngine, journey, result);
    return result.changed;
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
    // Re-plan reminders on the same lifecycle beat as the Mission rollover, so a
    // day/week change (and any Journey that lapsed) is reflected in what's pending.
    void this.communicationScheduler.reconcile();
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
   * Create a reminder for a Journey, persist it, and let the Communication
   * Scheduler (re)plan + apply the whole on-device notification set. Scheduling is
   * best-effort (no permission ⇒ nothing pending); the rule is still saved so it is
   * (re)scheduled once permission is granted. The scheduler owns the OS notification
   * ids, so the rule's own `scheduledNotificationIds` stays empty.
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
    this.state.reminderRules.push(rule);
    this.bus.emit({ type: 'ReminderRuleAdded', rule });
    await this.communicationScheduler.reconcile();
    return rule;
  }

  /**
   * Replace an existing reminder rule and re-plan through the Communication
   * Scheduler (a full teardown + rebuild covers the change). No-op (returns null) if
   * the id is unknown.
   */
  async updateReminderRule(
    id: string,
    changes: Partial<Pick<ReminderRule, 'trigger' | 'title' | 'body' | 'enabled'>>,
  ): Promise<ReminderRule | null> {
    const idx = this.state.reminderRules.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const next: ReminderRule = { ...this.state.reminderRules[idx], ...changes, scheduledNotificationIds: [] };
    this.state.reminderRules[idx] = next;
    this.bus.emit({ type: 'ReminderRuleAdded', rule: next });
    await this.communicationScheduler.reconcile();
    return next;
  }

  /**
   * Remove a reminder rule, persist, and re-plan through the Communication
   * Scheduler (its teardown cancels the dropped rule's notifications). No-op
   * (returns false) if the id is unknown.
   */
  async removeReminderRule(id: string): Promise<boolean> {
    const existing = this.state.reminderRules.find((r) => r.id === id);
    if (!existing) return false;
    this.state.reminderRules = this.state.reminderRules.filter((r) => r.id !== id);
    this.bus.emit({ type: 'ReminderRuleRemoved', ruleId: id });
    await this.communicationScheduler.reconcile();
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

  /**
   * Set a single scheduling preference (window / day-part / weekdays) and persist.
   * Emits SchedulingPrefsChanged, which re-plans the Communication Scheduler so the
   * pending notification set reflects the new timing.
   */
  setSchedulingPref<K extends keyof SchedulingPrefs>(key: K, value: SchedulingPrefs[K]): void {
    this.state.schedulingPrefs = { ...this.state.schedulingPrefs, [key]: value };
    this.bus.emit({ type: 'SchedulingPrefsChanged' });
  }

  /** The user's current scheduling preferences (window / day-part / weekdays). */
  getSchedulingPrefs(): SchedulingPrefs {
    return this.state.schedulingPrefs;
  }

  // ── Miss-Recovery (user-triggered) ──────────────────────────────────────────
  // Thin pass-throughs to the RecoveryEngine — no business logic here (the facade
  // just wires). Cancel is FREE (no Grace Tokens); the reason `note` never leaves the
  // device (G1). The engine emits StepPostponed/StepCancelled/ReminderRescheduled,
  // which persist through onChanged.

  /**
   * Run the recovery loop for a Step: apply the Screen-1 action, map the reason to
   * lever(s), execute the reminder/plan levers, and log the reason. Returns the
   * recorded entry.
   */
  submitReason(input: SubmitReasonInput): Promise<ReasonEntry> {
    return this.recoveryEngine.submitReason(input);
  }

  /** Propose a few good reschedule times for a Step (Retime), gated by the env. */
  proposeStepTimes(journeyId: string, stepId: string): Candidate[] {
    return this.recoveryEngine.proposeStepTimes(journeyId, stepId);
  }

  /** A Step's reason history, newest first — the "see past reasons" view. */
  getReasonHistory(stepId: string): ReasonEntry[] {
    return this.recoveryEngine.getReasonHistory(stepId);
  }

  /** Whether a reason routes through the propose-times step (Retime). Drives the UI flow. */
  reasonNeedsReschedule(reasonId: ReasonId): boolean {
    return this.recoveryEngine.needsReschedule(reasonId);
  }

  /**
   * DEV-ONLY (behind featureFlags.devMockRecovery): set the mock "where am I" place so
   * the founder can watch the reschedule gate respond. No-op effect in production
   * (the real gateway ignores it). Not persisted.
   */
  setMockLocation(place: MockPlace): void {
    setMockLocation(place);
  }

  /** DEV-ONLY: set the mock calendar busy/free flag (see setMockLocation). Not persisted. */
  setMockBusy(busy: boolean): void {
    setMockBusy(busy);
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
      dreams: this.state.dreams,
      journeys: this.state.journeys,
      todaySteps: this.journeyEngine.getTodaySteps(),
      weekSteps: this.journeyEngine.getWeekSteps(),
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
