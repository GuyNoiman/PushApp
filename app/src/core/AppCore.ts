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
import { defaultAdaptivePolicy } from './config/adaptivePolicy';
import type { GoalInput, PlanConstraints, ReplanAdjustment } from './learning/types';
import { featureFlags } from './config/featureFlags';
import type { GatedFeature } from './config/tiers';
import { EventBus } from './events/EventBus';
import { getLocationGateway } from './location';
import { getCalendarGateway } from './calendar';
import { EncryptedLocalRepository } from './persistence/EncryptedLocalRepository';
import { asyncStorageFirstRunFlag, type FirstRunFlag } from './persistence/firstRunFlag';
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

/**
 * Schema version stamped into a data export (O1). Bumped if the exported shape
 * changes, so a future importer can tell which layout it is reading.
 */
export const EXPORT_SCHEMA_VERSION = 1;

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
    // Adaptive report→replan real path (loop on only): first `tick` the behaviour model so any
    // Step whose planned occurrence elapsed is flagged as a slip, THEN week-review each active
    // Journey (each respecting the once/day cadence gate). Off ⇒ neither runs.
    if (this.adaptiveEnabled && this.behaviorModel) {
      this.behaviorModel.tick(Date.now());
      for (const journey of this.state.journeys) {
        if (!journey.completedAt) this.reviewWeek(journey.id);
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
