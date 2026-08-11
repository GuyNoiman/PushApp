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
import { StreakEngine } from './engines/StreakEngine';
import { createJourneyFromGoalSpec } from './coach/goalSpecToJourney';
import type { GoalSpec } from './coach/interviewPlaybook';
import type { JourneyEdit } from './coach/journeyEdit';
import { RecoveryEngine, type SubmitReasonInput } from './recovery/RecoveryEngine';
import { setMockBusy, setMockLocation, type MockPlace } from './recovery/mockEnv';
import { BehaviorModelEngine } from './learning/BehaviorModelEngine';
import { planJourney } from './learning/Planner';
import { GeneralExpert } from './learning/DomainExpert';
import { replan } from './learning/AdaptivePlanner';
import { applyReplan } from './learning/applyReplan';
import { deriveConstraints } from './learning/deriveConstraints';
import { DeterministicNarrator } from './learning/CoachNarrator';
import { buildWeeklyReview, computeJourneyProposals } from './review/weeklyReview';
import { evaluateWeekGate } from './review/weekGate';
import { resolveJourneyStatus } from './util/journeyStatus';
import { startOfWeek, weekKey } from './util/week';
import { defaultAdaptivePolicy } from './config/adaptivePolicy';
import type { GoalInput, PlanConstraints, ReplanAdjustment } from './learning/types';
import { featureFlags } from './config/featureFlags';
import type { GatedFeature } from './config/tiers';
import { EventBus } from './events/EventBus';
import type {
  JourneyCompleted,
  JourneyFrozen,
  StepCancelled,
  StepCheckedIn,
  StepPartial,
  StepReportReversed,
} from './events/events';
import { getLocationGateway } from './location';
import { getCalendarGateway } from './calendar';
import { EncryptedLocalRepository } from './persistence/EncryptedLocalRepository';
import { asyncStorageFirstRunFlag, type FirstRunFlag } from './persistence/firstRunFlag';
import type { Repository } from './persistence/Repository';
import type {
  ActiveHours,
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
  Step,
  WeeklyReview,
} from './types/domain';
import { deriveStepStatus, type StepStatus } from './status/stepStatus';
import { resolveReminderRule, type JourneyReminder } from './util/reminderView';
import type { Candidate } from './util/reschedule';
import {
  isPostponeError,
  postponeWarnings,
  resolvePostponeUntil,
  type PostponeError,
  type PostponeWarning,
} from './util/postpone';
import { createId } from './util/id';
import { FREE_ENTITLEMENT, type AccountTier, type Entitlement } from './types/entitlement';

/**
 * Schema version stamped into a data export (O1). Bumped if the exported shape
 * changes, so a future importer can tell which layout it is reading.
 */
export const EXPORT_SCHEMA_VERSION = 1;

/**
 * Weekly Review retention window (Weekly_Review_PRD §9, D40): a pending proposal is valid for at
 * most 48 hours from generation. After it, the draft expires and the previous valid plan (already
 * the active baseline) simply continues — nothing is force-applied and nothing reported is lost.
 */
export const WEEKLY_REVIEW_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * Caller-supplied metadata for a data export ({@link AppCore.exportStateJson}).
 * The timestamp + app version are injected by the UI layer so the core method
 * stays PURE (no `Date.now()` / no environment reads). `uid`/`handle` are only
 * set when signed in; both are LOCAL to this on-device export and never uploaded.
 */
export interface ExportMeta {
  appVersion: string;
  /** Epoch ms the export was produced (injected by the caller — keeps core pure). */
  exportedAt: number;
  uid?: string | null;
  handle?: string | null;
}

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
  /** The prominent day-count streak (StreakEngine) — Home's TopStatusBar reads it. */
  streak: number;
}

/**
 * The result of an adaptive week-review ({@link AppCore.reviewWeek}). Calm and never a
 * scoreboard: when the coach changed the plan it carries the on-device human `narration` to show,
 * the coarse `adjustments` kinds, and the honest `atRisk` flag. When nothing changed (inert path,
 * gated out, or a no-op re-plan) only `changed: false` is returned. The narration is rendered
 * ON-DEVICE ONLY (G1).
 */
export interface WeekReviewOutcome {
  changed: boolean;
  narration?: string;
  adjustments?: ReplanAdjustment[];
  atRisk?: boolean;
}

/**
 * The outcome of {@link AppCore.postponeStepReminder} (Step Postponement, D37). A calm result the
 * UI renders — never thrown. On success it carries the resolved `at`, any calendar-crossing
 * `warnings` to surface honestly (§4), and whether an OS notification was actually `scheduled`
 * (false when reminder permission is off — the postpone still succeeds). On failure it carries the
 * `error` (`no_slot_today` / `in_past`) so the UI can message it.
 */
export interface PostponeReminderResult {
  ok: boolean;
  at?: number;
  warnings?: PostponeWarning[];
  scheduled?: boolean;
  error?: PostponeError;
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
 * one — no window, no Active Hours (⇒ all-day, all-days-enabled), no day-part
 * constraint, all weekdays allowed. `activeHours` stays undefined so older snapshots
 * merge unchanged (offline-first migration keeps existing behaviour, D40).
 */
function defaultSchedulingPrefs(): SchedulingPrefs {
  return { window: undefined, activeHours: undefined, dayPart: 'either', preferredDays: [] };
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
    weekReviewAt: {},
    streak: 0,
    lastActiveDay: null,
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
    // Daily Step Reporting (D36): an already-completed Journey persisted before `completionRewarded`
    // existed had its reward granted historically — latch the flag true so a later reversal +
    // re-completion never re-grants it (idempotent rewards; no double-pay).
    journeys: (state.journeys ?? base.journeys).map((j) =>
      j.completedAt && j.completionRewarded === undefined ? { ...j, completionRewarded: true } : j,
    ),
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
    // Adaptive report→replan cadence ledger — backfill to {} for a snapshot that predates it.
    // ON-DEVICE ONLY (G1); only written when the adaptive loop is enabled.
    weekReviewAt: state.weekReviewAt ?? {},
    // Streak (D26.4) — backfill for a snapshot that predates the StreakEngine: no counted
    // history yet, so start at 0 with no active day. On-device only, no PII.
    streak: state.streak ?? 0,
    lastActiveDay: state.lastActiveDay ?? null,
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
  /**
   * Guards the one-time first-run demo seed so it is NEVER re-seeded after an
   * account deletion (O1). Survives {@link Repository.clear} because it is a
   * separate persisted key; {@link resetToFirstRun} sets it.
   */
  private readonly firstRunFlag: FirstRunFlag;

  private readonly journeyEngine: JourneyEngine;
  private readonly rewardEngine: RewardEngine;
  private readonly buddyEngine: BuddyEngine;
  private readonly streakEngine: StreakEngine;
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
   * The deterministic narrator that turns a {@link replan} result into calm on-device coaching
   * copy. Built ONLY alongside the {@link behaviorModel} (adaptive loop on); undefined otherwise.
   * Templated + pure — no LLM, no I/O; the S2 LLM narrator drops in behind the same seam.
   */
  private readonly narrator?: DeterministicNarrator;
  /**
   * Single gate for the whole adaptive-coach path: the reviewed production `adaptiveCoach` flag
   * OR the founder-device-only `adaptiveCoachDev` flag. Both OFF ⇒ nothing adaptive is built,
   * observed, or persisted, and production behaviour is unchanged.
   */
  private readonly adaptiveEnabled = featureFlags.adaptiveCoach || featureFlags.adaptiveCoachDev;

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

  constructor(
    repo: Repository = new EncryptedLocalRepository(),
    firstRunFlag: FirstRunFlag = asyncStorageFirstRunFlag,
  ) {
    this.repo = repo;
    this.firstRunFlag = firstRunFlag;
    const getState = () => this.state;
    this.journeyEngine = new JourneyEngine(this.bus, getState);
    this.rewardEngine = new RewardEngine(this.bus, REWARDS);
    this.buddyEngine = new BuddyEngine(this.bus, getState);
    // The prominent day-count streak (D26.4). Always on — the increment path (a check-in on a
    // new calendar day) works in production; the reset path only fires when a StepMissed is
    // emitted (adaptive-coach slip detector, flag-gated), so with the flag off it never resets.
    this.streakEngine = new StreakEngine(this.bus, getState);
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
    if (this.adaptiveEnabled) {
      this.behaviorModel = new BehaviorModelEngine(this.bus, getState);
      this.narrator = new DeterministicNarrator();
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
    // Started before the persistence hooks so a check-in updates the streak before the save runs.
    this.streakEngine.start();

    // Persist + notify after any state-changing domain event. Subscribed BEFORE
    // the MissionEngine starts so that a rollover on start() (which can auto-claim
    // earned Coins) is persisted through the same path.
    this.bus.on('JourneyCreated', this.onChanged);
    this.bus.on('StepCheckedIn', this.onChanged);
    this.bus.on('JourneyCompleted', this.onChanged);
    // Daily Step Reporting reversal (D36): persist the cleared report; a reopened Journey also
    // needs its reminders re-planned (handled in onReportReversed).
    this.bus.on('StepReportReversed', this.onChanged);
    this.bus.on('StepReportReversed', this.onReportReversed);
    this.bus.on('JourneyUpdated', this.onChanged);
    this.bus.on('JourneyDeleted', this.onChanged);
    this.bus.on('JourneyFrozen', this.onChanged);
    this.bus.on('JourneyResumed', this.onChanged);
    this.bus.on('BuddyReacted', this.onChanged);
    // Persist a streak increment (new-day check-in) or reset (urgent miss). StepMissed itself is
    // not a persistence hook, so this is what saves a reset.
    this.bus.on('StreakChanged', this.onChanged);
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

    // Step Postponement (D37): a FINAL report of an occurrence clears its pending one-shot. Done,
    // Couldn't (let-go), AND Partial are all final reports (§11.6a — a Partial is a final report of
    // execution), so each cancels the OS notification + wipes the postpone fields. Handlers run in
    // REGISTRATION order, so an earlier onChanged (for StepCheckedIn/StepCancelled) saves first with
    // the fields still present; these clear handlers then wipe them and persist via their OWN
    // onChanged — which is also the only save on the StepPartial path (it has no onChanged hook).
    this.bus.on('StepCheckedIn', this.onCheckInClearsPostpone);
    this.bus.on('StepCancelled', this.onStepReportClearsPostpone);
    this.bus.on('StepPartial', this.onStepReportClearsPostpone);
    // A frozen/completed Journey stops nudging: cancel every pending one-shot on its Steps. A
    // DELETED Journey is handled in the deleteJourney facade (the Journey is gone by the event).
    this.bus.on('JourneyFrozen', this.onJourneyClearsPostpone);
    this.bus.on('JourneyCompleted', this.onJourneyClearsPostpone);

    // The Communication Scheduler re-plans the whole notification set whenever the
    // inputs change. The reminder facade methods reconcile directly (right after
    // persisting), so here we only wire the events they DON'T emit: a completed
    // Journey (its reminders must stop) and a scheduling-prefs change.
    this.bus.on('JourneyCompleted', this.onReconcile);
    this.bus.on('SchedulingPrefsChanged', this.onReconcile);
    // A coach-led edit can change a Journey's rhythm / Steps, so re-plan its reminders. It persists
    // through the JourneyUpdated → onChanged hook above; here we only add the reminder reconcile.
    this.bus.on('JourneyUpdated', this.onReconcile);
    // A deleted Journey's reminders must stop — persist off JourneyDeleted (above) and re-plan here.
    this.bus.on('JourneyDeleted', this.onReconcile);
    // Freeze/resume (J3): a paused Journey's reminders must stop; a resumed one's must come back.
    // Both persist through onChanged (above); here we add the reminder reconcile.
    this.bus.on('JourneyFrozen', this.onReconcile);
    this.bus.on('JourneyResumed', this.onReconcile);

    // start() runs the authoritative day/week rollover once on launch.
    this.missionEngine.start();

    // Seed the demo data ONLY on a genuine first run — never after an account
    // deletion. resetToFirstRun clears the repo (so load() returns null again) but
    // marks the first-run flag consumed, so a post-deletion relaunch stays clean
    // (O1 adopted decision). A brand-new install has no flag ⇒ seeds as before.
    if (!loaded && !(await this.firstRunFlag.isConsumed())) {
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
   * Daily Step Reporting reversal (D36): when an un-report REOPENED an auto-completed Journey, its
   * reminders must resume — re-plan the whole set. A plain report change (the Journey stayed active)
   * needs no reminder change, so we reconcile only on `reopenedJourney`.
   */
  private readonly onReportReversed = (event: StepReportReversed): void => {
    if (event.reopenedJourney) void this.communicationScheduler.reconcile();
  };

  /**
   * Step Postponement (D37): a Done check-in clears the occurrence's pending one-shot. The
   * StepCheckedIn event carries the Step object, so read its id from there.
   */
  private readonly onCheckInClearsPostpone = (event: StepCheckedIn): void => {
    this.clearOneShotForStep(event.journeyId, event.step.id);
  };

  /** Step Postponement (D37): a Couldn't (let-go) or Partial report clears the pending one-shot. */
  private readonly onStepReportClearsPostpone = (event: StepCancelled | StepPartial): void => {
    this.clearOneShotForStep(event.journeyId, event.stepId);
  };

  /** Step Postponement (D37): a frozen/completed Journey clears every Step's pending one-shot. */
  private readonly onJourneyClearsPostpone = (event: JourneyFrozen | JourneyCompleted): void => {
    let changed = false;
    for (const step of event.journey.steps) {
      if (step.postponeNotificationId) void this.reminderEngine.cancel(step.postponeNotificationId);
      if (this.journeyEngine.clearStepPostpone(event.journey.id, step.id)) changed = true;
    }
    if (changed) this.onChanged();
  };

  /**
   * Cancel a single occurrence's pending postpone one-shot (if any) and wipe its four postpone
   * fields. Reads the OS id BEFORE clearing, fires the cancel best-effort (fire-and-forget), and
   * only persists when a field actually changed — so a normal report of a never-postponed Step
   * costs nothing.
   */
  private clearOneShotForStep(journeyId: string, stepId: string): void {
    const step = this.findStep(journeyId, stepId);
    if (!step) return;
    const notifId = step.postponeNotificationId;
    const changed = this.journeyEngine.clearStepPostpone(journeyId, stepId);
    if (notifId) void this.reminderEngine.cancel(notifId);
    if (changed) this.onChanged();
  }

  /** Find a Step within a Journey, or undefined if either is missing. */
  private findStep(journeyId: string, stepId: string): Step | undefined {
    return this.state.journeys.find((j) => j.id === journeyId)?.steps.find((s) => s.id === stepId);
  }

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

    // A couple of the seeded Steps carry a `plannedFor` THIS WEEK, so the adaptive loop's slip
    // detector + `replan`'s reschedule have real scheduled occurrences to move for the demo (a
    // manually-created Journey otherwise has none). Off-flag builds simply ignore these.
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

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
        { title: 'Jog for 15 minutes', cadence: 'weekly', estimatedDuration: 30, plannedFor: now + 2 * DAY },
        { title: 'Run a full 2km without stopping', cadence: 'weekly', estimatedDuration: 40, plannedFor: now + 4 * DAY },
      ],
    });

    const strength = this.journeyEngine.createJourney({
      title: 'Build core strength',
      dreamId: dreamFit.id,
      why: ['Feel capable in my body', 'Protect my back'],
      durationDays: 42,
      rhythm: 'few-times-week',
      steps: [
        { title: 'Do 10 push-ups', cadence: 'weekly', estimatedDuration: 10, plannedFor: now + 1 * DAY },
        { title: 'Hold a 60-second plank', cadence: 'weekly', estimatedDuration: 10, plannedFor: now + 3 * DAY },
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

  // ── Account: data export + deletion (O1) ────────────────────────────────────

  /**
   * Serialize the FULL on-device AppState to pretty JSON for a LOCAL "export my
   * data" (never uploaded). Pure — the caller injects the timestamp + app version
   * ({@link ExportMeta}) so this stays deterministic and free of environment reads.
   *
   * The on-device-only logs ({@link AppState.reasonLog} / {@link AppState.behaviorLog})
   * are always present (defaulted to `[]`) so the export is COMPLETE and predictable
   * regardless of which flags populated them (privacy G6: the user's own copy of
   * their data includes everything held about them on device).
   */
  exportStateJson(meta: ExportMeta): string {
    const payload = {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      appVersion: meta.appVersion,
      exportedAt: meta.exportedAt,
      uid: meta.uid ?? null,
      handle: meta.handle ?? null,
      state: {
        ...this.state,
        reasonLog: this.state.reasonLog ?? [],
        behaviorLog: this.state.behaviorLog ?? [],
      },
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Wipe ALL local data and return to a clean first-run state (O1). Clears the
   * Repository (which destroys the encryption key), marks the first-run seed
   * consumed so the demo Journeys are NEVER re-seeded, resets in-memory state to
   * empty, and notifies subscribers. Deliberately does NOT save (that would mint a
   * fresh key + re-persist an empty snapshot); the next real change persists.
   *
   * The orchestrator (useAccountActions) owns the surrounding steps — remote delete
   * first, cancel scheduled notifications, sign out, and remove the theme/language
   * keys — so this method only owns the AppCore-managed state.
   */
  async resetToFirstRun(): Promise<void> {
    // Step Postponement (D37): drop every pending one-shot too, so an account wipe leaves no
    // orphaned OS notification scheduled. cancelAll is a safe superset of the per-Step ids.
    await this.reminderEngine.cancelAll();
    await this.repo.clear();
    await this.firstRunFlag.markConsumed();
    this.state = emptyState();
    // Keep the adaptive in-memory model consistent with the wiped state (no-op when
    // the loop is off / the engine was never built).
    this.behaviorModel?.hydrate([]);
    this.notify();
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
   * Enact a coach-led EDIT on an existing Journey (task J1). Delegates to the JourneyEngine, which
   * applies the VALIDATED {@link JourneyEdit} in place (preserving Step ids, check-in history and XP)
   * and emits {@link JourneyUpdated} — persisting through onChanged and re-planning reminders through
   * onReconcile. Returns the mutated Journey, or null when the id is unknown or the Journey is already
   * completed. This applies IMMEDIATELY (user layer); it deliberately does NOT trigger the weekly review.
   */
  updateJourney(journeyId: string, edit: JourneyEdit): Journey | null {
    return this.journeyEngine.updateJourney(journeyId, edit);
  }

  /**
   * Permanently delete/abandon a Journey and all its Steps (task J2) — distinct from a Freeze/pause.
   * Delegates to the JourneyEngine, which hard-removes it and emits {@link JourneyDeleted}: AppCore
   * persists off it (onChanged) and re-plans reminders (onReconcile) so its notifications are
   * cancelled. Returns whether a Journey was actually removed. Irreversible.
   */
  deleteJourney(journeyId: string): boolean {
    // Step Postponement (D37): cancel any pending one-shots BEFORE the Journey (and its Steps'
    // stored ids) are hard-removed — JourneyDeleted carries only the id, so the ids must be read here.
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (journey) {
      for (const step of journey.steps) {
        if (step.postponeNotificationId) void this.reminderEngine.cancel(step.postponeNotificationId);
      }
    }
    return this.journeyEngine.deleteJourney(journeyId);
  }

  /**
   * PAUSE a Journey (task J3) — flip its status to `frozen` without losing progress. Delegates to the
   * JourneyEngine, which emits {@link JourneyFrozen}: AppCore persists (onChanged) and re-plans
   * reminders (onReconcile) so the paused Journey stops firing notifications. Returns the mutated
   * Journey, or null for an unknown id, an already-frozen, or a completed Journey. Reversible via
   * {@link resumeJourney}.
   */
  freezeJourney(journeyId: string): Journey | null {
    return this.journeyEngine.freezeJourney(journeyId);
  }

  /**
   * RESUME a frozen Journey (task J3) — flip its status back to `active` so it runs and schedules
   * reminders again. Delegates to the JourneyEngine, which emits {@link JourneyResumed}: AppCore
   * persists + re-plans reminders off it. Returns the mutated Journey, or null when the id is unknown
   * or the Journey is not currently frozen.
   */
  resumeJourney(journeyId: string): Journey | null {
    return this.journeyEngine.resumeJourney(journeyId);
  }

  /**
   * Adaptive coach (flag on only): deterministically PLAN a Journey from a goal + real-world
   * constraints (via the pure {@link planJourney} over the default {@link GeneralExpert}), then
   * create it through the SAME JourneyEngine path as {@link createJourney} — so it persists and
   * notifies exactly like any other Journey. Returns null (inert) when the flag is off, so
   * production behaviour is unchanged. The goal title/specifics stay ON DEVICE (G1).
   */
  generateJourney(goal: GoalInput, constraints: PlanConstraints): Journey | null {
    if (!this.adaptiveEnabled) return null;
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
    if (!this.adaptiveEnabled || !this.behaviorModel) return false;
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey) return false;
    const result = replan(journey, this.behaviorModel.getInsights(), constraints, undefined, Date.now());
    applyReplan(this.journeyEngine, journey, result);
    return result.changed;
  }

  /**
   * The adaptive report→replan ENTRY POINT the UI calls after a Step report (Done/Partial/
   * Couldn't/Postpone/slip). It re-reads the on-device InsightModel, re-plans the Journey's
   * remaining week (pure {@link replan}), enacts the per-Step changes ({@link applyReplan}), and
   * returns a calm {@link WeekReviewOutcome} the UI surfaces. INERT (`{ changed: false }`) when the
   * adaptive loop is off or the model is absent, so production behaviour is unchanged.
   *
   * CADENCE (founder decision): at most once per CALENDAR DAY per Journey — UNLESS the model newly
   * reads slipping/at-risk, in which case a fresh miss re-plans immediately. `devReviewWeek`
   * bypasses the gate for the dev trigger. This never enacts the re-plan's reminder NudgeHint —
   * reminders stay owned by the RecoveryEngine/CommunicationScheduler.
   */
  reviewWeek(journeyId: string): WeekReviewOutcome {
    return this.runReview(journeyId, false);
  }

  /**
   * Shared implementation for {@link reviewWeek} (gated) and {@link devReviewWeek} (`force`). Emits
   * the enum-only {@link WeekReplanned} event on a real change and persists the plan mutations +
   * the cadence timestamp. The narration is built on-device only (G1).
   */
  private runReview(journeyId: string, force: boolean): WeekReviewOutcome {
    if (!this.adaptiveEnabled || !this.behaviorModel) return { changed: false };
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey || journey.completedAt) return { changed: false };
    // A FROZEN Journey is paused — never re-plan it (Weekly Review §7: frozen Journeys are excluded
    // from next-week changes, and their days are never read as non-completion). Resume re-includes it.
    if (resolveJourneyStatus(journey) !== 'active') return { changed: false };

    const insight = this.behaviorModel.getInsights();
    // Bypass the once/day gate when the model newly reads slipping/at-risk (mirrors the planner's
    // own "slipping" verdict), so a fresh miss re-plans immediately rather than waiting a day.
    const urgent = insight.atRisk || insight.slipRate >= defaultAdaptivePolicy.slip.high;
    const now = Date.now();
    if (!force && !urgent && !this.dueForReview(journeyId, now)) return { changed: false };

    const constraints = deriveConstraints(journey, this.state.schedulingPrefs);
    const result = replan(journey, insight, constraints, undefined, now);
    applyReplan(this.journeyEngine, journey, result);

    // Record the attempt so the calendar-day gate holds; applyReplan's mutations (reschedule/
    // resize/drop) don't all emit a persisted event, so this save covers them too.
    (this.state.weekReviewAt ??= {})[journeyId] = now;
    if (!result.changed) {
      this.onChanged();
      return { changed: false };
    }

    const narration = this.narrator?.describeAdaptation(result, { journeyTitle: journey.title });
    // ENUM/SCALAR-ONLY event (G1) — no title, no note, no narration text.
    this.bus.emit({
      type: 'WeekReplanned',
      journeyId,
      adjustments: result.adjustments,
      atRisk: result.atRisk,
    });
    this.onChanged();
    return { changed: true, narration, adjustments: result.adjustments, atRisk: result.atRisk };
  }

  /** Whether `journeyId` has not yet been week-reviewed on the local calendar day of `now`. */
  private dueForReview(journeyId: string, now: number): boolean {
    const last = this.state.weekReviewAt?.[journeyId];
    if (last == null) return true;
    const a = new Date(last);
    const b = new Date(now);
    return (
      a.getFullYear() !== b.getFullYear() ||
      a.getMonth() !== b.getMonth() ||
      a.getDate() !== b.getDate()
    );
  }

  /**
   * DEV-ONLY (gated by the adaptive loop): back-date a Step's planned occurrence into the past and
   * run the slip detector, so the founder can watch a miss flow into a re-plan. No-op when the
   * adaptive loop is off. Not something a real user can trigger.
   */
  devForceSlip(journeyId: string, stepId: string): void {
    if (!this.adaptiveEnabled || !this.behaviorModel) return;
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    this.journeyEngine.rescheduleStep(journeyId, stepId, yesterday);
    this.behaviorModel.tick(Date.now());
    this.onChanged();
  }

  /** DEV-ONLY: force a week-review for `journeyId`, bypassing the once/day cadence gate. */
  devReviewWeek(journeyId: string): WeekReviewOutcome {
    if (!this.adaptiveEnabled) return { changed: false };
    return this.runReview(journeyId, true);
  }

  // ── Weekly Review (Weekly_Review_PRD, D40/D41) ──────────────────────────────
  // ONE user-level review per closed week (the per-week gate keyed by weekKey — distinct from the
  // per-Journey daily weekReviewAt). Generation is deterministic (reuses the AdaptivePlanner); the
  // proposal is a forward-only diff the user must approve. Whole path is gated behind the adaptive
  // loop, so production (flag off) generates nothing and behaves exactly as before.

  /**
   * Generate a Weekly Review for the just-closed week IFF the authoritative week rolled over since
   * the last check (pure {@link evaluateWeekGate}). Records the current week key either way (so the
   * first-ever observation only records, never reviews). Returns whether a review was generated —
   * on a rollover tick {@link syncTime} skips the daily auto-apply in favour of this proposal.
   */
  private maybeGenerateWeeklyReview(now: number): boolean {
    const gate = evaluateWeekGate(this.state.lastWeeklyReviewKey, now);
    this.state.lastWeeklyReviewKey = gate.nextKey;
    if (!gate.shouldGenerate) return false;
    this.generateWeeklyReview(gate.windowStart!, gate.windowEnd!, now);
    return true;
  }

  /**
   * Build + store ONE Weekly Review for the closed week `[windowStart, windowEnd)`. Never stacks
   * two: an existing PENDING review is marked `superseded` first (PRD §9). Requires the behaviour
   * model (adaptive loop on); a no-op otherwise.
   */
  private generateWeeklyReview(windowStart: number, windowEnd: number, now: number): void {
    if (!this.behaviorModel) return;
    const prev = this.state.weeklyReview;
    if (prev && prev.status === 'pending') prev.status = 'superseded';
    this.state.weeklyReview = buildWeeklyReview(
      {
        journeys: this.state.journeys,
        dreams: this.state.dreams,
        reasonLog: this.state.reasonLog ?? [],
        insight: this.behaviorModel.getInsights(),
        constraintsFor: (journey) => deriveConstraints(journey, this.state.schedulingPrefs),
        id: createId('review'),
        windowStart,
        windowEnd,
      },
      now,
    );
  }

  /**
   * The current PENDING Weekly Review the UI should surface (the screen + Home card), or null when
   * none is pending / it has passed the 48-hour retention window / the loop is off. PURE READ — safe
   * to call during render: a proposal past the window reads as null but is only flipped to `expired`
   * by {@link expireStaleWeeklyReview} on the next lifecycle beat (never a state write mid-render).
   */
  getPendingWeeklyReview(): WeeklyReview | null {
    const review = this.state.weeklyReview;
    if (!review || review.status !== 'pending') return null;
    if (Date.now() - review.generatedAt > WEEKLY_REVIEW_TTL_MS) return null;
    return review;
  }

  /**
   * Flip a pending review that has passed the 48-hour window to `expired` (PRD §9): the previous
   * valid plan simply continues — nothing is force-applied, nothing reported is lost. Runs on the
   * lifecycle beat ({@link syncTime}), not during render. Returns whether it changed anything.
   */
  private expireStaleWeeklyReview(now: number): boolean {
    const review = this.state.weeklyReview;
    if (!review || review.status !== 'pending') return false;
    if (now - review.generatedAt <= WEEKLY_REVIEW_TTL_MS) return false;
    review.status = 'expired';
    review.resolvedAt = now;
    return true;
  }

  /**
   * Stamp the pending review as OPENED so the screen auto-opens only on the FIRST app entry after
   * week close (PRD §9); afterwards the Home card is the persistent entry point. Idempotent.
   */
  markWeeklyReviewOpened(): void {
    const review = this.getPendingWeeklyReview();
    if (review && review.openedAt == null) {
      review.openedAt = Date.now();
      this.onChanged();
    }
  }

  /** Whether the pending review has not yet been auto-opened (drives the one-shot auto-open). */
  weeklyReviewNeedsAutoOpen(): boolean {
    const review = this.getPendingWeeklyReview();
    return review != null && review.openedAt == null;
  }

  /**
   * APPROVE the pending Weekly Review — apply the proposed plan change (PRD §8 "Approve the complete
   * upcoming plan"). REBASED against current reality and FORWARD-ONLY (D40/D41): the proposal is
   * recomputed from the live state at approval time, so it never creates occurrences on past days
   * and never rewrites an already-reported occurrence; the AdaptivePlanner only ever touches
   * not-done Steps. Application is ATOMIC — every diff is computed first, then all are enacted.
   * Returns whether a pending review was approved.
   */
  approveWeeklyReview(): boolean {
    const review = this.getPendingWeeklyReview();
    if (!review || !this.behaviorModel) return false;
    const now = Date.now();
    // Rebase: recompute the proposal from the CURRENT active Journeys + insights (frozen/completed
    // excluded), then enact — so a late approval applies to today's reality, forward-only.
    const insight = this.behaviorModel.getInsights();
    const rebased = computeJourneyProposals(
      this.state.journeys,
      insight,
      (journey) => deriveConstraints(journey, this.state.schedulingPrefs),
      now,
    );
    for (const proposal of rebased) {
      const journey = this.state.journeys.find((j) => j.id === proposal.journeyId);
      if (!journey) continue;
      applyReplan(this.journeyEngine, journey, {
        changed: true,
        adjustments: proposal.adjustments,
        stepAdjustments: proposal.stepAdjustments,
        atRisk: proposal.atRisk,
        nudge: { daypart: 'either', days: [], leadMinutes: 0, extra: false },
      });
    }
    review.status = 'approved';
    review.resolvedAt = now;
    this.onChanged();
    return true;
  }

  /**
   * DISMISS the pending Weekly Review — keep the proposed changes OUT of the plan (PRD §8 "keep
   * selected proposed changes out of the draft"). The previous valid plan simply continues; nothing
   * is applied and nothing reported is lost. Returns whether a pending review was dismissed.
   */
  dismissWeeklyReview(): boolean {
    const review = this.getPendingWeeklyReview();
    if (!review) return false;
    review.status = 'dismissed';
    review.resolvedAt = Date.now();
    this.onChanged();
    return true;
  }

  /**
   * DEV-ONLY (gated by the adaptive loop): force-generate a Weekly Review for the most-recently
   * closed week, bypassing the week-rollover gate, so the founder can exercise the screen/card
   * on-device. Advances the week key so the next real rollover doesn't immediately re-generate.
   * Returns the generated review, or null when the loop is off.
   */
  devGenerateWeeklyReview(): WeeklyReview | null {
    if (!this.adaptiveEnabled || !this.behaviorModel) return null;
    const now = Date.now();
    const currentStart = startOfWeek(now);
    this.generateWeeklyReview(startOfWeek(currentStart - 1), currentStart, now);
    this.state.lastWeeklyReviewKey = weekKey(now);
    this.onChanged();
    return this.state.weeklyReview ?? null;
  }

  checkInStep(journeyId: string, stepId: string): void {
    this.journeyEngine.checkInStep(journeyId, stepId);
  }

  /**
   * Reverse a Step's report — the open-week "un-report" path (Daily Step Reporting, D36). Delegates
   * to the JourneyEngine, which clears the completion + stamps {@link Step.lastReportClearedAt}
   * (superseding earlier terminal reason rows) while KEEPING history and clawing back NO XP, and
   * reopens an auto-completed Journey when it is no longer all-done. Emits {@link StepReportReversed}:
   * AppCore persists off it and re-plans a reopened Journey's reminders. Returns whether a Step was
   * reversed (false on an unknown Journey/Step).
   */
  reverseReport(journeyId: string, stepId: string): boolean {
    return this.journeyEngine.reverseReport(journeyId, stepId);
  }

  /**
   * A Journey's completion ratio in [0,1] (done Steps / total). Facade over the
   * JourneyEngine selector so callers (e.g. SocialProvider's progress publish)
   * don't recompute Step math inline (Engineering Bible §19).
   */
  journeyProgress(journeyId: string): number {
    return this.journeyEngine.journeyProgress(journeyId);
  }

  /**
   * The DERIVED Daily-Reporting status of a Step (D36). The SINGLE status entry point for surfaces
   * that hold a Step but not the snapshot's TodayStep (e.g. Journey detail) — it derives from the
   * SAME raw `reasonLog` in append order as {@link Snapshot.weekSteps}/`todaySteps`, so Home and the
   * Journey detail can never disagree on equal-`at` rows ("last-appended wins").
   */
  getStepStatus(step: Step): StepStatus {
    return deriveStepStatus(step, this.state.reasonLog ?? []);
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
    // Adaptive report→replan real path (loop on only): first `tick` the behaviour model so any
    // Step whose planned occurrence elapsed is flagged as a slip, THEN either generate the WEEKLY
    // Review (strategic, at the week boundary — PRD §2/§5) or, on a normal tick, run the DAILY
    // tactical auto-apply per active Journey (once/day cadence gate). On a week-rollover tick the
    // weekly PROPOSAL supersedes the daily auto-apply, so the change is proposed for approval rather
    // than silently applied. Off ⇒ none of it runs.
    if (this.adaptiveEnabled && this.behaviorModel) {
      const now = Date.now();
      this.behaviorModel.tick(now);
      // Expire a stale (>48h) pending proposal before deciding whether to generate a new one, so a
      // week-rollover tick always supersedes cleanly rather than stacking on an unresolved draft.
      this.expireStaleWeeklyReview(now);
      this.maybeGenerateWeeklyReview(now);
      // The DAILY tactical auto-apply runs ONLY while there is no pending weekly proposal: a
      // strategic proposal OWNS the plan for its whole 48h window, so the change the user was asked
      // to approve is never silently applied (incl. via runReview's atRisk bypass) before they
      // decide. Once the review is resolved/expired the daily loop resumes on the next tick.
      if (!this.getPendingWeeklyReview()) {
        for (const journey of this.state.journeys) this.reviewWeek(journey.id);
      }
    }
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
    mode?: ReminderRule['mode'];
  }): Promise<ReminderRule> {
    const rule: ReminderRule = {
      id: createId('reminder'),
      journeyId: input.journeyId,
      trigger: input.trigger,
      title: input.title,
      body: input.body,
      enabled: input.enabled ?? true,
      ...(input.mode ? { mode: input.mode } : {}),
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
    changes: Partial<Pick<ReminderRule, 'trigger' | 'title' | 'body' | 'enabled' | 'mode'>>,
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

  // ── Journey Reminder Management (D40) — the managed Off/Fixed per-Journey view ────────
  // The Smart mode is DEFERRED (needs Weekly Review): the `'smart'` enum value exists but is
  // never produced or selectable here. Account Active Hours CLAMP a Fixed time into the allowed
  // window (D40), so there is no conflict state to manage — only the disabled-by-permission one.

  /**
   * The current managed reminder view for a Journey — mode (Off/Fixed/Smart) + Fixed time +
   * weekdays. Resolves the single managed `fixedTime` rule for the Journey through
   * {@link resolveReminderRule} (backward-compat: an old rule with no `mode` reads as Fixed when
   * enabled, Off when not). Off + a default time when the Journey has no reminder yet.
   */
  getJourneyReminder(journeyId: string): JourneyReminder {
    const rule = this.state.reminderRules.find(
      (r) => r.journeyId === journeyId && r.trigger.kind === 'fixedTime',
    );
    return resolveReminderRule(rule);
  }

  /**
   * Whether OS notification permission is currently granted (cached from the last check/init).
   * The reminder UI reads this to show the "disabled by permission" state; call
   * {@link refreshReminderPermission} first for an accurate value.
   */
  isReminderPermissionGranted(): boolean {
    return this.reminderEngine.hasPermission();
  }

  /** Re-read OS notification permission WITHOUT prompting (updates the cache). UI calls on mount. */
  refreshReminderPermission(): Promise<boolean> {
    return this.reminderEngine.refreshPermission();
  }

  /**
   * Set a Journey's reminder to **Fixed** — an exact local time on the chosen weekdays (empty =
   * every day) — through the managed reminder path (add or update the single `fixedTime` rule).
   * Scheduling flows through the Communication Scheduler (idempotent reconcile); a Fixed time
   * outside account Active Hours is CLAMPED into the window, never dropped (D40). Best-effort: no
   * permission ⇒ nothing pending, but the rule is saved so it (re)schedules once permission is
   * granted. Returns the created/updated rule.
   */
  async setJourneyReminderFixed(
    journeyId: string,
    time: { hour: number; minute: number; weekdays: number[] },
    copy: { title: string; body: string },
  ): Promise<ReminderRule> {
    const trigger: ReminderTrigger = {
      kind: 'fixedTime',
      hour: time.hour,
      minute: time.minute,
      weekdays: time.weekdays.length > 0 ? [...time.weekdays].sort((a, b) => a - b) : undefined,
    };
    const existing = this.state.reminderRules.find(
      (r) => r.journeyId === journeyId && r.trigger.kind === 'fixedTime',
    );
    if (existing) {
      const updated = await this.updateReminderRule(existing.id, {
        trigger,
        title: copy.title,
        body: copy.body,
        enabled: true,
        mode: 'fixed',
      });
      return updated!;
    }
    return this.addReminderRule({
      journeyId,
      trigger,
      title: copy.title,
      body: copy.body,
      enabled: true,
      mode: 'fixed',
    });
  }

  /**
   * Turn a Journey's reminder **Off** — disable the managed rule (mode `'off'`, `enabled: false`)
   * so the scheduler stops firing it, while PRESERVING its time/weekdays for a later switch back to
   * Fixed. Reconciles through the same path. No-op when the Journey has no reminder rule yet.
   */
  async setJourneyReminderOff(journeyId: string): Promise<void> {
    const existing = this.state.reminderRules.find(
      (r) => r.journeyId === journeyId && r.trigger.kind === 'fixedTime',
    );
    if (existing) await this.updateReminderRule(existing.id, { enabled: false, mode: 'off' });
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

  /**
   * Set the account-level Active Hours (D40) — the authoritative per-day boundary the
   * scheduler clamps into. Thin facade over {@link setSchedulingPref} so the same
   * SchedulingPrefsChanged → reconcile() path re-plans the notification set. Passing
   * `undefined` clears the preference back to the all-day (legacy/all-permissive) view.
   */
  setActiveHours(activeHours: ActiveHours | undefined): void {
    this.setSchedulingPref('activeHours', activeHours);
  }

  /** The user's current scheduling preferences (window / Active Hours / day-part / weekdays). */
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

  /**
   * Step Postponement (D37) — the ONE orchestration point for a per-occurrence "remind me later".
   * The fast, reason-free default (no `opts`) is one tap: it resolves the fixed 2-hour target with
   * the day-crossing shorten rule (pure {@link resolvePostponeUntil}). The user may instead pass a
   * `chosenTime` (a specific pick) and/or an OPTIONAL `reasonId`/`note` — a reason is NEVER required
   * (D37 §11.2).
   *
   * Steps: resolve the target (returning `no_slot_today`/`in_past` for the UI to message, never
   * throwing) → evaluate calendar-crossing warnings → CANCEL any prior one-shot (so a re-postpone
   * or a duplicate tap never stacks OS notifications) → stamp the Step fields + emit StepPostponed →
   * schedule the OS one-shot (best-effort — permission off ⇒ no notification, but the postpone still
   * succeeds) → store its id → record the optional on-device reason. The reminder is OS-scheduled,
   * so it still fires while the app is offline.
   */
  async postponeStepReminder(
    journeyId: string,
    stepId: string,
    opts?: { chosenTime?: number; reasonId?: ReasonId; note?: string },
  ): Promise<PostponeReminderResult> {
    const now = Date.now();
    const resolution = resolvePostponeUntil(now, opts?.chosenTime);
    if (isPostponeError(resolution)) return { ok: false, error: resolution.error };
    const at = resolution.at;

    const journey = this.state.journeys.find((j) => j.id === journeyId);
    const step = journey?.steps.find((s) => s.id === stepId);
    if (!journey || !step) return { ok: false };
    // A done Step has no live occurrence to postpone — bail before touching any notification.
    if (step.done) return { ok: false };

    const warnings = postponeWarnings({
      now,
      at,
      plannedFor: step.plannedFor,
      // FLEXIBLE-WEEKLY when the Journey's rhythm allows moving across days in the week, or the Step
      // itself recurs weekly (D37 §4) — so a same-week move warns nothing and only a next-week move
      // flags `crosses_week`. A DAY-SPECIFIC occurrence stays on its own day (warns `crosses_day`).
      flexibleWeekly:
        journey.rhythm === 'few-times-week' ||
        journey.rhythm === 'weekly' ||
        step.cadence === 'weekly',
      journeyEndsAt: this.journeyEndsAt(journeyId),
    });

    // Cancel any prior one-shot BEFORE scheduling the new one (re-postpone / duplicate-tap safe).
    if (step.postponeNotificationId) await this.reminderEngine.cancel(step.postponeNotificationId);

    // Stamp the per-occurrence fields + emit StepPostponed (persists via onChanged). Bail if it was
    // a no-op (e.g. the Step just became done in a race), so no orphan one-shot is scheduled (#3).
    if (!this.journeyEngine.postponeStep(journeyId, stepId, { postponedUntil: at })) {
      return { ok: false };
    }

    const { title, body } = this.postponeReminderCopy(journeyId, stepId);
    const notifId = await this.reminderEngine.scheduleOneShot({ title, body, at });
    this.journeyEngine.setStepPostponeNotificationId(journeyId, stepId, notifId ?? undefined);

    // OPTIONAL reason — skipped entirely on the fast path (D37 §11.2). The `note` stays on-device (G1).
    if (opts?.reasonId) {
      this.recoveryEngine.recordPostponeReason(journeyId, stepId, opts.reasonId, opts.note);
    }

    // Persist the notification id (+ any reason) written AFTER the StepPostponed save.
    this.onChanged();
    return { ok: true, at, warnings, scheduled: notifId !== null };
  }

  /** Epoch ms a Journey is scheduled to end (createdAt + duration), or undefined if unknown. */
  private journeyEndsAt(journeyId: string): number | undefined {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey) return undefined;
    return journey.createdAt + journey.durationDays * 24 * 60 * 60 * 1000;
  }

  /**
   * On-device copy for a postpone one-shot. Uses the user's OWN Journey/Step text (no synthetic
   * English body to translate), so the notification reads naturally in any language. On-device only
   * — the string is captured at schedule time and never leaves the device (G1).
   */
  private postponeReminderCopy(journeyId: string, stepId: string): { title: string; body: string } {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    const step = journey?.steps.find((s) => s.id === stepId);
    return {
      title: journey?.title ?? 'PushApp',
      body: step?.title ?? '',
    };
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
      streak: this.state.streak ?? 0,
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
