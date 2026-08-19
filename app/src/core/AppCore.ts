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
import { InactivityEngine } from './engines/InactivityEngine';
import { FutureJourneyEngine } from './engines/FutureJourneyEngine';
import {
  ReminderEngine,
  type DailyReminderInput,
  type ReminderNotificationData,
} from './engines/ReminderEngine';
import { CommunicationScheduler } from './engines/CommunicationScheduler';
import { RewardEngine } from './engines/RewardEngine';
import { ShopEngine } from './engines/ShopEngine';
import { StreakEngine } from './engines/StreakEngine';
import {
  createJourneyFromGoalSpec,
  dreamSignalFromSpec,
  journeyShapeFor,
  parkedGoalToSpec,
} from './coach/goalSpecToJourney';
import { isSensitiveDomain } from './coach/sensitiveDomains';
import { companionStepsFor, isCompanionEligible } from './social/companion';
import { getSocialGateway } from './social';
import type { CompanionStepInput, SocialGateway } from './social/SocialGateway';
import {
  buildJourneyClosedNotice,
  deliverCircleNotice,
  type CircleNotice,
} from './notify/circleNotice';
import { buildReminderCopy } from './notify/reminderCopy';
import { journeysForDream, type NewDreamInput } from './dreams/dreams';
import { futureCapacity, type FutureCapacity } from './journeys/futureJourneys';
import type { GoalSpec } from './coach/interviewPlaybook';
import type { JourneyEdit } from './coach/journeyEdit';
import { RecoveryEngine, type SubmitReasonInput } from './recovery/RecoveryEngine';
import { setMockBusy, setMockLocation, type MockPlace } from './recovery/mockEnv';
import { BehaviorModelEngine } from './learning/BehaviorModelEngine';
import { profileSignals } from './learning/library/matchApproach';
import { journeyDefinitionsFor } from './learning/library/definitions';
import { selectVariant } from './learning/library/selectVariant';
import { rateLibrary, variantScores } from './learning/library/variantRatings';
import { axisAnswersFrom } from './coach/variantQuestions';
import { planJourney } from './learning/Planner';
import { GeneralExpert } from './learning/DomainExpert';
import { replan } from './learning/AdaptivePlanner';
import { applyReplan } from './learning/applyReplan';
import { deriveConstraints } from './learning/deriveConstraints';
import { DeterministicNarrator } from './learning/CoachNarrator';
import { buildWeeklyReview, computeJourneyProposals } from './review/weeklyReview';
// Smart Notification Timing: the PURE §4 classifier + window helpers. AppCore only OBSERVES and
// stores; every judgement about what a send meant is made in core/timing.
import { classifyTrial, effectiveSendAt, withinResponseWindow } from './timing/outcome';
import { evaluateWeekGate } from './review/weekGate';
import { isFuture, isRunning, resolveJourneyStatus } from './util/journeyStatus';
import { startOfWeek, weekKey } from './util/week';
import { STREAK_CONFIG } from './config/streak';
import { streakRole, type StreakRole } from './util/urgency';
import {
  buildWeekByDay,
  pullForwardCandidates,
  summariseWeek,
  type WeekByDay,
  type WeekSummary,
} from './util/weekByDay';
import { defaultAdaptivePolicy } from './config/adaptivePolicy';
import type { GoalInput, PlanConstraints, ReplanAdjustment } from './learning/types';
import { featureFlags } from './config/featureFlags';
import type { GatedFeature } from './config/tiers';
import { EventBus } from './events/EventBus';
import type {
  JourneyAbandoned,
  JourneyCompleted,
  JourneyCreated,
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
import type { LoadFailureReason, Repository } from './persistence/Repository';
import type {
  ActiveHours,
  AppState,
  Buddy,
  BuddyStage,
  CommunicationPrefs,
  CompletionCard,
  Dream,
  Journey,
  JourneyStart,
  ParkedGoal,
  ReasonEntry,
  ReasonId,
  ReminderRule,
  ReminderTrigger,
  SchedulingPrefs,
  Step,
  WeeklyReview,
} from './types/domain';
import { buildCompletionCard } from './celebration/completionCard';
import {
  buildJourneyFeedback,
  pendingFeedback,
  type Helped,
  type PendingFeedback,
} from './celebration/journeyFeedback';
import { deriveStepStatus, type StepStatus } from './status/stepStatus';
import { directDependentsOf } from './status/stepDependencies';
import { emptyOnboardingAnswers, toCoachSummary } from './onboarding/answers';
import type { CoachOnboardingSummary, OnboardingAnswers, OnboardingStep } from './onboarding/model';
import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  defaultReminderTimeFor,
  resolveReminderRule,
  type JourneyReminder,
} from './util/reminderView';
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

/**
 * An immutable read-model the UI renders. Recomputed on every change — and every list on it is a
 * NEW array each time, so a React memo keyed on one of them always recomputes after the engines
 * mutate a Journey/Step in place (Device QA 2026-08-17, A2). Treat it as read-only.
 */
export interface Snapshot {
  buddy: BuddyView;
  /** Long-term Dreams — Home groups the week's Steps by the Dream their Journey serves. */
  dreams: Dream[];
  journeys: Journey[];
  /** Goals the coach detected but the user didn't build first — the Journeys "For later" surface (L1). */
  parkedGoals: ParkedGoal[];
  /**
   * How full the Future list is (Future Journey Management, §10) — the Future tab and the creation
   * flow read it to know whether another plan may be saved for later and whether the Coach may offer
   * a relevance review. The Future Journeys themselves are already in {@link journeys}.
   */
  futureCapacity: FutureCapacity;
  todaySteps: TodayStep[];
  /** Home's "Week's steps" list — todaySteps plus already-done Steps (kept visible, sunk to the bottom). */
  weekSteps: TodayStep[];
  activeJourneyCount: number;
  /** Rewards ready to collect now (done-unclaimed Missions + today's Login) — drives the Home badge. */
  claimableRewards: number;
  /** The prominent day-count streak (StreakEngine) — Home's TopStatusBar reads it. */
  streak: number;
  /**
   * Whether first-run onboarding is complete (K2). The root layout's first-run gate reads this to
   * route into the onboarding stack until it is true, then never again.
   */
  onboardingCompleted: boolean;
  /**
   * Set ONLY when the stored data exists but could not be opened. The root layout routes to the
   * recovery screen while it is non-null, and nothing is saved until it is resolved. Null on every
   * normal launch, including a genuine first run.
   */
  dataRecovery: DataRecovery | null;
}

/**
 * The "we could not open your data" state (Encryption_Design §6, Phase C0). Carries the
 * classification and when it was first seen, so the screen can be honest and specific without
 * guessing. It is NOT part of AppState — it describes the store, not the user's content.
 */
export interface DataRecovery {
  reason: LoadFailureReason;
  /** When the failure was first seen (epoch ms). Survives relaunches via the recovery marker. */
  at: number;
  /** Whether the untouched original bytes were successfully copied aside. */
  quarantined: boolean;
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

/**
 * The pending "welcome back" return after an inactivity freeze (Account Inactivity Freeze, J5),
 * split by provenance so the UI never conflates the three groups:
 *  - `frozenJourneyIds` — the away-frozen Journeys (freezeReason `account_inactivity`), the ONLY set
 *    offered for one-tap resume;
 *  - `futureJourneyIds` — Journeys scheduled to begin later (untouched by the sweep), shown for
 *    context;
 *  - `manualFrozenJourneyIds` — Journeys the user had already paused themselves, shown LABELED and
 *    never in the resume set.
 * Ids only; the screen resolves titles from the snapshot. Ordered by the Journeys' array order.
 */
export interface InactivityReturn {
  frozenJourneyIds: string[];
  futureJourneyIds: string[];
  manualFrozenJourneyIds: string[];
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
    parkedGoals: [],
    // Smart Notification Timing (PRD §7): the learned models + their raw trials live INSIDE
    // AppState on purpose — that is what makes them part of the export and of the account wipe
    // without a single extra line in either path. Empty until the `smartTiming` flag is on.
    timingModels: [],
    timingTrials: [],
    // First-run gate marker (K2): a genuine fresh run stamps the resume step BEFORE any state is
    // persisted (the demo seed in start() saves immediately). This makes a first-run snapshot
    // distinguishable from a legacy pre-onboarding snapshot — so a user who opens the app and leaves
    // during onboarding (e.g. sits on the language screen) is RESUMED, not silently marked onboarded
    // by migrateState. `getOnboardingStep` already defaults to 'language', so behaviour is unchanged;
    // this only makes the marker explicit on disk.
    onboardingStep: 'language',
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
    // Strip any legacy runtime field (e.g. the removed `journeyIds`) from persisted Dreams so a
    // pre-D40 snapshot never carries — or re-exports — a stale duplicate (Dream Management review).
    dreams: (state.dreams ?? base.dreams).map((d) => ({
      id: d.id,
      title: d.title,
      ...(d.description ? { description: d.description } : {}),
    })),
    // Daily Step Reporting (D36): an already-completed Journey persisted before `completionRewarded`
    // existed had its reward granted historically — latch the flag true so a later reversal +
    // re-completion never re-grants it (idempotent rewards; no double-pay).
    //
    // Completion Celebration (I1): a Journey that was ALREADY completed before this feature existed
    // (completed + NO completionCard) must never retro-flood a ceremony. Give it a minimal card
    // STAMPED already-shown at its completion time so getPendingCompletionCeremony never surfaces it.
    // A Journey completed AFTER this feature carries its OWN card and is left untouched — so a
    // genuinely-pending ceremony (card present, no ceremonyShownAt) survives an app restart.
    journeys: (state.journeys ?? base.journeys).map((j) => {
      let next = j;
      if (next.completedAt && next.completionRewarded === undefined) {
        next = { ...next, completionRewarded: true };
      }
      // Account Inactivity Freeze (J5): a Journey persisted as `frozen` before provenance existed was
      // a MANUAL (user) pause — backfill `freezeReason: 'manual'`, the safe default (never auto-resumed
      // by the inactivity return). Only an inactivity sweep sets `'account_inactivity'`.
      if (next.status === 'frozen' && next.freezeReason === undefined) {
        next = { ...next, freezeReason: 'manual' };
      }
      if (next.completedAt && !next.completionCard) {
        next = {
          ...next,
          completionCard: {
            ...buildCompletionCard(next, next.completedAt),
            ceremonyShownAt: next.completedAt,
          },
        };
      }
      return next;
    }),
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
    // Parked/deferred goals (L1) — backfill to [] for a snapshot that predates it, and defensively
    // keep only the known fields (drop any junk a hand-edited/legacy blob carried). ON-DEVICE ONLY (G1).
    parkedGoals: (state.parkedGoals ?? base.parkedGoals ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      processType: g.processType,
      domain: g.domain,
    })),
    // Adaptive-coach on-device signal (S1.16) — backfill the raw log to [] for a snapshot
    // that predates it, so hydrate never dereferences an absent field. The derived
    // insightModel carries over untouched (undefined until first recomputed). ON-DEVICE
    // ONLY (G1); only populated when the adaptiveCoach flag is on.
    behaviorLog: state.behaviorLog ?? [],
    insightModel: state.insightModel,
    // Adaptive report→replan cadence ledger — backfill to {} for a snapshot that predates it.
    // ON-DEVICE ONLY (G1); only written when the adaptive loop is enabled.
    weekReviewAt: state.weekReviewAt ?? {},
    // Smart Notification Timing (PRD §7) — backfill both stores to [] for a snapshot that predates
    // them, so the timing paths never dereference an absent field. Backfilled regardless of the
    // `smartTiming` flag (exactly like behaviorLog) so toggling the flag never reshapes state; with
    // the flag off they simply stay empty. ON-DEVICE ONLY (G1).
    timingModels: state.timingModels ?? [],
    timingTrials: state.timingTrials ?? [],
    // Streak (D26.4) — backfill for a snapshot that predates the StreakEngine: no counted
    // history yet, so start at 0 with no active day. On-device only, no PII.
    streak: state.streak ?? 0,
    lastActiveDay: state.lastActiveDay ?? null,
    // migrateState only runs on a PRE-EXISTING persisted snapshot (first run uses emptyState
    // directly). A snapshot that recorded a completion keeps it. A snapshot MID-FLOW (the
    // onboarding gate saved a resume step/answers but hasn't completed — K2) must stay INCOMPLETE
    // so it resumes rather than being force-completed. Only a genuine PRE-onboarding snapshot (no
    // completion, no in-progress onboarding markers) is a legacy user — treat them as already
    // onboarded (a nonzero timestamp) so they never see the flow.
    onboardingStep: state.onboardingStep,
    onboardingAnswers: state.onboardingAnswers,
    onboardingCompletedAt:
      state.onboardingCompletedAt ??
      (state.onboardingStep != null || state.onboardingAnswers != null ? undefined : 1),
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

/**
 * De-dupe key for a parked/deferred goal (L1) — normalized title + domain, so the same goal is
 * parked at most once (across conversations, and never as the goal being built right now).
 */
function parkedKey(title: string, domain: string): string {
  return `${title.trim().toLowerCase()}::${domain}`;
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
  /**
   * Non-null when start() found stored data it could not open (Encryption_Design §6, Phase C0).
   * While it is set NOTHING is persisted — the unreadable snapshot has been quarantined and the
   * user is shown the recovery screen instead of a silently empty app. Cleared only by an explicit
   * wipe ({@link resetToFirstRun}).
   */
  private dataRecovery: DataRecovery | null = null;

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
   * Account Inactivity Freeze (J5, LOCAL-FIRST POC): detects a long absence on a lifecycle beat
   * (start / syncTime) and freezes active Journeys through the SAME J3 path (provenance-tagged). Pure
   * and always constructed — it seeds a grace anchor on first sight, so it never freezes a fresh user.
   */
  private readonly inactivity: InactivityEngine;
  /**
   * Future Journey Management: the clock reconciler that STARTS a scheduled Journey once its
   * approved instant has arrived, on the same lifecycle beats as {@link inactivity}. It drives the
   * single idempotent transition through the JourneyEngine, so a long absence lands exactly one
   * activation rather than a burst.
   */
  private readonly futureJourneys: FutureJourneyEngine;
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
  /** True while a repo.save() is in flight; see {@link persist}. */
  private saveRunning = false;
  /** True when state changed since the in-flight save started — one more write is owed. */
  private saveQueued = false;
  /** The running write loop, awaited by {@link flushSaves}. */
  private saveLoop: Promise<void> | null = null;
  /** True for the duration of a wipe, so nothing is written behind {@link Repository.clear}. */
  private wiping = false;

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
    // `buildReminderCopy` is the ONE impure adapter that gives the (i18n-free) scheduler
    // its words at apply time, in the current language + form of address + communication
    // style (D40) — this is the composition root's job, so the engine stays pure.
    this.communicationScheduler = new CommunicationScheduler(
      this.bus,
      getState,
      this.reminderEngine,
      { location, calendar },
      undefined, // clock: the real one (only tests inject a fixed clock)
      buildReminderCopy,
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
    // Account Inactivity Freeze (J5): reuses the JourneyEngine's J3 freeze path (provenance-tagged),
    // so there is no parallel state to keep in sync. Always constructed; inert until a real long gap.
    this.inactivity = new InactivityEngine(this.bus, getState, this.journeyEngine);
    // Future Journey Management: reuses the JourneyEngine's single Future → Active transition, so
    // there is no parallel state. Always constructed; inert until a scheduled Journey comes due.
    this.futureJourneys = new FutureJourneyEngine(this.bus, getState, this.journeyEngine);
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

    // The load result distinguishes "nothing stored yet" from "there IS something stored and we
    // could not open it" (Repository.LoadResult). Conflating them is what used to destroy data:
    // the app started empty and the next change wrote that empty state over the real snapshot.
    const loaded = await this.repo.load();
    if (loaded.kind === 'loaded') {
      this.state = migrateState(loaded.state);
    } else {
      this.state = emptyState();
    }
    if (loaded.kind === 'unreadable') {
      // Engines still start below (the app has to work if the user chooses to start fresh in this
      // same session), but onChanged now refuses to persist and the demo seed is skipped.
      this.dataRecovery = {
        reason: loaded.reason,
        at: loaded.at,
        quarantined: loaded.quarantinedKey != null,
      };
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
    // Abandon (canceled): persist the terminal `abandoned` status + the Steps that were removed,
    // exactly like freeze/resume — the Journey stays in state, it just stops running.
    this.bus.on('JourneyAbandoned', this.onChanged);
    // Future Journey Management (§9): persist the one Future → Active transition (its `status` +
    // `activatedAt`, and any rebased `plannedFor`), exactly like freeze/resume.
    this.bus.on('JourneyActivated', this.onChanged);
    // Dreams (D40): persist a coach-created Dream + any Journey↔Dream link/unlink. These carry
    // id/boolean-only payloads; the Dream title stays private on-device (G1/G2).
    this.bus.on('DreamCreated', this.onChanged);
    this.bus.on('JourneyDreamLinked', this.onChanged);
    this.bus.on('JourneyDreamUnlinked', this.onChanged);
    // Account Inactivity Freeze (J5): persist the recorded cycle. Each swept Journey also emits its
    // own JourneyFrozen (above) which reconciles reminders + clears postpones; these account-level
    // events just persist the accountInactivity marker + the refreshed activity anchor.
    this.bus.on('AccountInactivityFrozen', this.onChanged);
    this.bus.on('AccountInactivityReturned', this.onChanged);
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
    // A frozen/completed/abandoned Journey stops nudging: cancel every pending one-shot on its Steps.
    // A DELETED Journey is handled in the deleteJourney facade (the Journey is gone by the event);
    // an ABANDONED Journey's REMOVED Steps are likewise handled in the abandonJourney facade (they
    // are gone by the event), so this only wipes the surviving Steps' postpone fields.
    this.bus.on('JourneyFrozen', this.onJourneyClearsPostpone);
    this.bus.on('JourneyCompleted', this.onJourneyClearsPostpone);
    this.bus.on('JourneyAbandoned', this.onJourneyClearsPostpone);

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
    // An abandoned (canceled) Journey must never nudge again — same reconcile as a freeze, except
    // there is no resume: the scheduler's positive isRunning gate drops it for good.
    this.bus.on('JourneyAbandoned', this.onReconcile);
    // A started Journey's reminders must BEGIN: its rules were saved with the plan but planned
    // nothing while it was Future (the scheduler gates on isRunning), so re-plan the whole set now.
    this.bus.on('JourneyActivated', this.onReconcile);
    // EVERY new Journey arrives with a reminder, ON (founder, 2026-08-17). Wired to the event rather
    // than to a facade on purpose: `JourneyCreated` is emitted by the ONE construction path in the
    // JourneyEngine, so the wizard, the coach and any future creation route all get it and no caller
    // can forget (Engineering Bible §19 — this belongs to the engine layer, not to a screen).
    this.bus.on('JourneyCreated', this.onJourneyDefaultReminder);

    // start() runs the authoritative day/week rollover once on launch.
    this.missionEngine.start();

    // A FRESH INSTALL OPENS EMPTY (founder decision, Device QA 2026-08-17 B2): the demo data is now
    // dev-only, behind `devSeedDemoData` — a first-run user must never meet Journeys and Steps they
    // did not choose. The rest of the guard is unchanged and still matters for the dev build: seed
    // only on a genuine first run, never after an account deletion (resetToFirstRun clears the repo
    // — so load() reports a first run again — but marks the first-run flag consumed, O1), and never
    // over a store we could not open (an `unreadable` result: the user has data, we just cannot read
    // it yet).
    if (
      featureFlags.devSeedDemoData &&
      loaded.kind === 'first-run' &&
      !(await this.firstRunFlag.isConsumed())
    ) {
      this.seedDemoJourney();
    }

    // Account Inactivity Freeze (J5): run the detector ONCE on launch. On a fresh/legacy install (no
    // activity anchor) this only SEEDS `now` — it never freezes on first sight. On a returning user
    // whose persisted anchor is older than the threshold it freezes their active Journeys here, so the
    // return experience is ready the moment Home mounts.
    this.inactivity.tick(Date.now());
    // Future Journey Management (§9): reconcile the scheduled starts that came due while the app was
    // closed, BEFORE the first snapshot is read — so a Journey whose instant passed is already
    // running when Home mounts (no flicker from Future to Active). Runs AFTER the inactivity sweep on
    // purpose: a freeze detected on this same beat blocks activation on this same beat (§3.3).
    this.futureJourneys.tick(Date.now());
  }

  private readonly onChanged = (): void => {
    this.persist();
    this.notify();
  };

  /**
   * Persist the current state — serialised, coalesced, and blocked during recovery.
   *
   * WHY NOT `void this.repo.save(...)`: that fired a fresh encrypt+write on every domain event with
   * no ordering guarantee, so two writes could interleave and the LAST one to land was undefined
   * (Encryption_Design D7). Here at most one write is ever in flight; anything that happens while it
   * runs sets `saveQueued`, and the follow-up write reads `this.state` at that moment — so the store
   * always converges on the newest state and never on a stale one. The first write still starts
   * synchronously, exactly as before.
   */
  private persist(): void {
    // A quarantined store must not be written to (the Repository refuses as well — this is the
    // caller-side half of the same guard). Nothing is lost that was not already unreachable.
    // Nor is anything written while a wipe is in progress; see resetToFirstRun.
    if (this.dataRecovery || this.wiping) return;
    this.saveQueued = true;
    if (this.saveRunning) return;
    this.saveLoop = this.runSaves();
  }

  /**
   * Resolve once every queued write has landed. The normal path is deliberately fire-and-forget (a
   * save must never block the UI), so this is for the few callers that need the store to be current
   * right now — and for tests that reopen the same store in a fresh core.
   */
  async flushSaves(): Promise<void> {
    await this.saveLoop;
  }

  private async runSaves(): Promise<void> {
    this.saveRunning = true;
    try {
      while (this.saveQueued) {
        this.saveQueued = false;
        try {
          await this.repo.save(this.state);
        } catch {
          // A failed write must never break the running app or stall the queue. The state stays in
          // memory and the next change retries; a refusal (RepositoryLockedError) is expected while
          // the store is quarantined and is deliberately silent here.
        }
      }
    } finally {
      this.saveRunning = false;
    }
  }

  /** Re-plan + re-apply the scheduler-owned notification set (fire-and-forget). */
  private readonly onReconcile = (): void => {
    void this.communicationScheduler.reconcile();
  };

  /**
   * Give every newly created Journey its reminder, ON, at the shared default time (founder,
   * 2026-08-17: "by default I should be receiving notifications, not have it be off"). A plan you are
   * never reminded of is a plan you will not do — so the reminder is part of creating a Journey, not a
   * step a caller has to remember. Turning it off stays ONE tap on the Journey screen; nothing here
   * nags beyond the single daily reminder the user can retime or silence.
   *
   * IDEMPOTENT: a Journey that already has a managed `fixedTime` rule is left alone, so a caller that
   * sets its own time (the wizard's picker) wins and a re-emitted event can never mint a second rule.
   *
   * FUTURE JOURNEYS STAY SILENT: the rule is saved with the plan, but the scheduler's positive
   * `isRunning` gate plans nothing for a `future` (or frozen) Journey — its reminders begin at the
   * `JourneyActivated` reconcile above. This method deliberately does not look at status: the rule
   * belongs to the plan; whether it FIRES is the scheduler's single decision.
   *
   * Fire-and-forget: {@link addReminderRule} persists + reconciles, and a scheduling failure (no
   * permission yet) still leaves the rule saved, ready to be scheduled once permission is granted.
   */
  private readonly onJourneyDefaultReminder = (event: JourneyCreated): void => {
    const journey = event.journey;
    const existing = this.state.reminderRules.some(
      (r) => r.journeyId === journey.id && r.trigger.kind === 'fixedTime',
    );
    if (existing) return;
    // WHEN, derived rather than assumed: the first scheduled Step is the user's own answer to when
    // this is happening, and the account's Active Hours are the fallback. The old fixed 09:00 here
    // disagreed with the wizard's fixed 08:00 and with the user's stated availability alike.
    const { hour, minute } = defaultReminderTimeFor(journey, this.state.schedulingPrefs);
    void this.addReminderRule({
      journeyId: journey.id,
      trigger: {
        kind: 'fixedTime',
        hour,
        minute,
      },
      ...this.defaultReminderCopy(journey),
      enabled: true,
      mode: 'fixed',
    });
  };

  /**
   * The copy BAKED onto a default reminder rule. Only ever a fallback: the scheduler re-resolves the
   * words at every reconcile through the injected {@link buildReminderCopy}, so a language, form of
   * address or communication-style change reaches reminders that are already scheduled. We bake the
   * same builder's answer here (this is the composition root, the one place allowed to know about
   * copy) and fall back to the Journey's own title, so a reminder can never go out blank.
   */
  private defaultReminderCopy(journey: Journey): { title: string; body: string } {
    try {
      const copy = buildReminderCopy({ journeyId: journey.id, journeyTitle: journey.title });
      if (copy) return copy;
    } catch {
      // A copy failure must not stop a Journey from having a reminder at all.
    }
    return { title: journey.title, body: '' };
  }

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

  /** Step Postponement (D37): a frozen/completed/abandoned Journey clears every Step's pending one-shot. */
  private readonly onJourneyClearsPostpone = (
    event: JourneyFrozen | JourneyCompleted | JourneyAbandoned,
  ): void => {
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
   * DEV-ONLY seed ({@link featureFlags.devSeedDemoData}) — NOT part of a real first run, which opens
   * empty (Device QA 2026-08-17 B2). It brings a development device up with a realistic plan so the
   * surfaces have something to show: TWO Dreams, each grouping related Journeys. Home groups the
   * week's Steps by the Dream their Journey serves; the Journeys tab shows the Dream as an eyebrow.
   *
   * Public so a development build (and the tests that need a realistic plan to work on) can ask for
   * it explicitly. `start()` calls it only behind the flag, so no real user ever reaches it.
   */
  seedDemoJourney(): void {
    // A Dream holds no back-reference to its Journeys (Dream Management, D40): the link is
    // authoritative on the Journey side (dreamId = primary), and a Dream's Journeys are derived
    // on read (core/dreams). So the seed simply sets each Journey's dreamId below.
    const dreamFit: Dream = { id: 'dream_fit', title: 'Get fit and strong' };
    const dreamCalm: Dream = { id: 'dream_calm', title: 'Sleep and recover well' };
    this.state.dreams.push(dreamFit, dreamCalm);

    // A couple of the seeded Steps carry a `plannedFor` THIS WEEK, so the adaptive loop's slip
    // detector + `replan`'s reschedule have real scheduled occurrences to move for the demo (a
    // manually-created Journey otherwise has none). Off-flag builds simply ignore these.
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    this.journeyEngine.createJourney({
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

    this.journeyEngine.createJourney({
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

    this.journeyEngine.createJourney({
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

    // Nothing to write back onto the Dreams: each Journey's `dreamId` above IS the relationship, and
    // a Dream's Journeys are derived on read (core/dreams) — the single source of truth (D40).
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
    // Stop writing, and let anything already in flight finish, BEFORE the wipe. A save that landed
    // just after clear() would leave ciphertext with no key behind it — which the next launch would
    // rightly read as unreadable data and show a recovery screen to someone who deliberately
    // deleted their account.
    this.wiping = true;
    await this.flushSaves();
    // Step Postponement (D37): drop every pending one-shot too, so an account wipe leaves no
    // orphaned OS notification scheduled. cancelAll is a safe superset of the per-Step ids.
    await this.reminderEngine.cancelAll();
    await this.repo.clear();
    await this.firstRunFlag.markConsumed();
    this.state = emptyState();
    // The wipe took the quarantined snapshot with it, so there is nothing left to recover and the
    // Repository accepts writes again. A deliberate deletion is NOT a failure state (§6.5 keeps the
    // two markers apart), so the recovery screen must not linger after one.
    this.dataRecovery = null;
    // Keep the adaptive in-memory model consistent with the wiped state (no-op when
    // the loop is off / the engine was never built).
    this.behaviorModel?.hydrate([]);
    this.wiping = false;
    this.notify();
  }

  /**
   * The recovery screen's LAST resort: give up on the data we could not open and start clean
   * (Encryption_Design §6.3). It is the same wipe as an account deletion — including the
   * quarantined snapshot, which is destroyed here and nowhere else — so the screen must confirm it
   * explicitly before calling. No demo Journeys are seeded afterwards: this user is not new.
   */
  async startFreshAfterUnreadableData(): Promise<void> {
    await this.resetToFirstRun();
  }

  /**
   * The unreadable-store state, or null on a normal launch. Read by the root layout's recovery gate
   * (it also rides in the {@link Snapshot}, so a resolved recovery re-renders the app).
   */
  getDataRecovery(): DataRecovery | null {
    return this.dataRecovery;
  }

  /**
   * Ask the store to open again, and adopt the data if it does. Returns whether it worked.
   *
   * This is a real retry, not a reassuring button: the honest case is a keychain that was simply
   * unavailable when the app started (a device still locked), where the very same bytes open
   * perfectly a moment later. A failure changes nothing — the quarantine and the lock stay exactly
   * as they were.
   */
  async retryLoad(): Promise<boolean> {
    if (!this.dataRecovery) return true;
    const result = await this.repo.load();
    if (result.kind === 'unreadable') {
      this.dataRecovery = {
        reason: result.reason,
        at: result.at,
        quarantined: result.quarantinedKey != null,
      };
      this.notify();
      return false;
    }

    this.state = result.kind === 'loaded' ? migrateState(result.state) : emptyState();
    this.dataRecovery = null;
    this.behaviorModel?.hydrate(this.state.behaviorLog ?? []);
    // The engines started against an empty state, so run the normal foreground beat once to bring
    // the clock-driven ones (Missions, inactivity, Future Journeys, reminders) onto the real one.
    this.syncTime();
    this.notify();
    return true;
  }

  // ── Facade ────────────────────────────────────────────────────────────────

  createJourney(input: NewJourneyInput): Journey {
    return this.journeyEngine.createJourney(input);
  }

  /**
   * Create a complete Journey saved for LATER (Future Journey Management, §5) — the wizard's
   * "scheduled"/"manual" start. Delegates to the JourneyEngine, which stores the `future` status +
   * the intended start and emits the same `JourneyCreated` (so it persists + notifies exactly like an
   * immediate Journey). Returns null when the Future list is at its cap (§10) — the UI then offers to
   * start, reschedule, or remove one rather than silently replacing anything.
   */
  createFutureJourney(
    input: NewJourneyInput,
    start: Extract<JourneyStart, { mode: 'scheduled' | 'manual' }>,
  ): Journey | null {
    return this.journeyEngine.createFutureJourney(input, start);
  }

  /**
   * Create a real Journey from a finished coach interview's {@link GoalSpec} — the one-call bridge
   * the live coach's "Build my Journey" CTA calls. Delegates to the {@link ./coach/goalSpecToJourney}
   * helper over this core's JourneyEngine, so it plans + persists + notifies through the SAME
   * `JourneyCreated` path as {@link createJourney}. This is a NORMAL Journey creation — it is NOT
   * gated behind `adaptiveCoach`; the goal specifics stay ON DEVICE (G1). No planning logic here.
   *
   * `start` is the mode chosen at final approval (Future Journey Management, §5). For a SCHEDULED
   * start the Planner is given the intended instant as its clock (`PlanOptions.now`), so it lays
   * `plannedFor` across the REAL intended timeline instead of counting from creation day; a manual
   * start keeps today's clock and is re-anchored by the rebase at {@link startJourneyNow}. Only the
   * Future paths can decline (the cap, §10), which is why the overloads keep the default
   * "start now" call returning a plain Journey for every existing caller.
   */
  createJourneyFromGoalSpec(spec: GoalSpec): Journey;
  createJourneyFromGoalSpec(spec: GoalSpec, start: JourneyStart): Journey | null;
  createJourneyFromGoalSpec(spec: GoalSpec, start: JourneyStart = { mode: 'now' }): Journey | null {
    // Parked/deferred goals (L1): the coach may have detected OTHER goals in the opening the user did
    // NOT choose to build now. Capture them BEFORE delegating, so they persist in the SAME
    // JourneyCreated save. Sensitive-domain goals are filtered out at capture and never parked.
    if (spec.deferredGoals?.length) this.parkDeferredGoals(spec);

    // MATCH the plan to what the user already told us about themselves, and to what they told this
    // Journey. Onboarding asks what tends to help them and what tends to get in their way; the
    // chosen Journey then asks whatever IT declares it needs to pick between its own versions (D62),
    // and those answers outrank the profile because they were given about this Journey, now. Where
    // both are silent, the versions' own ratings break the tie, and failing that the Journey's
    // declared default is used and reported as a default rather than dressed up as a match.
    //
    // A spec that already names an approach (the user picked one of the other ways) is left exactly
    // as it is — the match is a starting point, never an override of a choice the user made.
    const matched: GoalSpec = spec.approach ? spec : this.matchVariant(spec);

    const options = start.mode === 'scheduled' ? { now: start.at } : undefined;
    const journey = createJourneyFromGoalSpec(this.journeyEngine, matched, undefined, options, start);
    // At the Future cap nothing was created — return null untouched (no Dream is minted for a
    // Journey that does not exist).
    if (!journey) return null;
    // Dream Management (D40): the coach OWNS the Dream layer. When the conversation produced a Dream
    // signal, create-or-reuse that Dream and set it as the new Journey's PRIMARY — no user-approval
    // gate. No signal ⇒ the Journey stays UNLINKED (linking is not a hard gate). The Dream text is
    // validated by framework-free domain logic (dreamSignalFromSpec); raw model text never persists.
    const signal = dreamSignalFromSpec(spec);
    if (signal) {
      const dream = this.journeyEngine.createOrReuseDream(signal);
      if (dream) this.journeyEngine.linkJourneyToDream(journey.id, dream.id, { primary: true });
    }
    return journey;
  }

  /**
   * Choose WHICH VERSION of the chosen library Journey to build for this person, and stamp both the
   * content it builds (`approach`) and its provenance (`libraryRef`) onto the spec (D62).
   *
   * The provenance is not bookkeeping: it is what makes a version a rated entity. Without it the end
   * of this Journey produces a verdict that cannot be counted for anything, and the library can only
   * ever compare on completion rate — which is how a learning loop starts recommending whatever is
   * easiest to finish.
   *
   * Only a RECURRING plan can be built from the library today, so that is the only kind of plan
   * allowed to claim provenance from it. The Career section (`learning/library/career`) holds
   * eighteen process Journeys with real Milestone arcs, but nothing routes a conversation to them
   * yet — the plan still comes from the domain expert's own arc. Stamping a `libraryRef` on it
   * anyway would attribute a plan to a Journey whose content was never used, and every verdict that
   * Journey later earned would be evidence about something else.
   */
  private matchVariant(spec: GoalSpec): GoalSpec {
    const shape = journeyShapeFor(spec.processType, spec.cadence);
    const definition = journeyDefinitionsFor(shape, spec.domain)[0];
    if (!definition) return spec;

    const choice = selectVariant(definition, {
      answers: axisAnswersFrom(definition, spec.answers),
      signals: profileSignals(this.getOnboardingCoachSummary()),
      ratings: variantScores(rateLibrary(this.state.journeys), definition.id),
    });
    if (choice.variant.build.kind !== 'recurring') return spec;
    const libraryRef = { definitionId: choice.definitionId, variantId: choice.variantId, version: choice.version };
    return { ...spec, approach: choice.variant.build.approach, libraryRef };
  }

  // ── Future Journeys (Future Journey Management) ─────────────────────────────
  // Thin facades over the JourneyEngine (the only writer) + the pure selectors. A Future Journey is
  // a complete, approved plan that is simply inactive: no Home Steps, no reminders, no progress, and
  // no overdue language — every one of those is already excluded by the `isRunning` gates.

  /**
   * START a Future Journey NOW — the detail screen's "Start Journey" action, and the only path for a
   * manual-start Journey (§9). Rebases every dated Step by the difference between the recorded
   * intention and the real start, so an early start keeps the plan's order, spacing and content.
   * Delegates to the single idempotent transition: a second tap returns null and changes nothing.
   */
  startJourneyNow(journeyId: string): Journey | null {
    return this.journeyEngine.activateJourney(journeyId, Date.now(), { rebase: true });
  }

  /**
   * Move a Future Journey's planned start (§8) — editing NEVER activates it. Pass no `at` to drop the
   * date and make it a manual-start ("start when ready") Journey. Returns null when the id is unknown
   * or the Journey is no longer Future. The engine emits `JourneyUpdated`, which already persists +
   * re-plans reminders.
   */
  rescheduleFutureJourney(journeyId: string, at?: number, timeZone?: string): Journey | null {
    return this.journeyEngine.setJourneyStart(journeyId, at, timeZone);
  }

  /** How full the Future list is + whether the Coach may offer a relevance review (§10). PURE read. */
  getFutureCapacity(): FutureCapacity {
    return futureCapacity(this.state.journeys);
  }

  // ── Parked/deferred goals (L1) ──────────────────────────────────────────────
  // The coach's understanding step can detect MORE than one goal in the opening; the user builds one
  // now and the rest are "parked" so the Journeys "For later" surface can offer them next. Raw title
  // is ON-DEVICE-ONLY (G1); a SENSITIVE-domain goal is NEVER parked (it must never become an
  // activatable Journey that bypasses the coach's sensitive-domain hand-off).

  /**
   * Append a finished spec's on-device {@link GoalSpec.deferredGoals} to {@link AppState.parkedGoals}
   * with fresh ids. IN-MEMORY only (the surrounding JourneyCreated save persists them): sensitive
   * domains are dropped, and each goal is de-duplicated against those already parked AND against the
   * goal being built right now (title+domain), so re-running the same conversation never re-parks.
   */
  private parkDeferredGoals(spec: GoalSpec): void {
    const parked = (this.state.parkedGoals ??= []);
    const seen = new Set<string>(parked.map((g) => parkedKey(g.title, g.domain)));
    seen.add(parkedKey(spec.title, spec.domain)); // never re-park the goal being built now
    for (const g of spec.deferredGoals ?? []) {
      if (isSensitiveDomain(g.domain)) continue; // L1 security: never park a sensitive-domain goal
      const key = parkedKey(g.title, g.domain);
      if (seen.has(key)) continue;
      seen.add(key);
      parked.push({ id: createId(), title: g.title, processType: g.processType, domain: g.domain });
    }
  }

  /**
   * Activate a parked goal (L1) into a real Journey — builds it through the SAME coach path
   * ({@link createJourneyFromGoalSpec} over {@link parkedGoalToSpec}, so it plans + persists +
   * notifies via JourneyCreated), then removes it from the parked list. The removal is written by the
   * build's own save. Returns the new Journey, or null when the id is unknown (a second call with the
   * same id also returns null — no double-activate).
   */
  activateParkedGoal(id: string): Journey | null {
    const parked = this.state.parkedGoals ?? [];
    const index = parked.findIndex((g) => g.id === id);
    if (index < 0) return null;
    // Defense-in-depth (L1): a sensitive-domain goal is filtered at capture and can never be parked,
    // but re-check here so a future capture path can never let one become an activatable Journey that
    // bypasses the coach's sensitive-domain hand-off. Leave it parked (do not activate).
    if (isSensitiveDomain(parked[index].domain)) return null;
    const [goal] = parked.splice(index, 1); // remove first so the JourneyCreated save reflects it
    return this.createJourneyFromGoalSpec(parkedGoalToSpec(goal));
  }

  /** Dismiss a parked goal (L1) without building it. Returns whether one was removed; persists + notifies. */
  removeParkedGoal(id: string): boolean {
    const parked = this.state.parkedGoals ?? [];
    const index = parked.findIndex((g) => g.id === id);
    if (index < 0) return false;
    parked.splice(index, 1);
    this.onChanged();
    return true;
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
   * ABANDON a Journey — the user lets it go (internal status `abandoned`, shown as "canceled"). The
   * Journey is KEPT: only its never-reported Steps are removed, every Step carrying a record survives,
   * and it moves to the history surface. Distinct from {@link deleteJourney}, which still hard-removes
   * everything; this is an additional path, not a replacement.
   *
   * Delegates to the JourneyEngine, which emits {@link JourneyAbandoned}: AppCore persists (onChanged)
   * and re-plans reminders (onReconcile) so it stops nudging for good. Returns the mutated Journey, or
   * null when the id is unknown, the Journey is already completed (completion is FINAL — D41), or it
   * is already abandoned. Terminal: there is no un-abandon.
   */
  abandonJourney(journeyId: string): Journey | null {
    // Step Postponement (D37): cancel every pending one-shot BEFORE the engine splices the
    // never-reported Steps away — those Steps (and their stored OS ids) no longer exist by the time
    // JourneyAbandoned fires, so the ids must be read here (same reason as deleteJourney). The
    // surviving Steps' postpone FIELDS are then wiped by the JourneyAbandoned → onJourneyClearsPostpone
    // hook, exactly like a freeze.
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (journey) {
      for (const step of journey.steps) {
        if (step.postponeNotificationId) void this.reminderEngine.cancel(step.postponeNotificationId);
      }
    }

    const abandoned = this.journeyEngine.abandonJourney(journeyId);
    if (abandoned) void this.closeCircleForCanceledJourney(journeyId);
    return abandoned;
  }

  /**
   * The Support-Circle side of a cancel (D2, founder decision 2026-08-14): tell the people who were
   * supporting this Journey that it stopped, then close/revoke every live invite exactly like the
   * delete path.
   *
   * ORDER MATTERS. `closeJourneyInvites` flips the accepted rows to `closed`, and `listJourneyAllies`
   * hides closed rows — so the members are read FIRST. Reading afterwards would always find nobody
   * and the notice would silently never be sent.
   *
   * Entirely best-effort: fire-and-forget, every step individually swallowed. The cancel is a LOCAL
   * transition that has already committed by the time this runs and must complete offline (PRD §11) —
   * the notice is a consequence of it, never a gate on it. With the pillar off (Null gateway) or
   * signed out, this is inert.
   *
   * What the notice may say is fixed by {@link ./notify/circleNotice}: someone stopped a Journey,
   * never WHICH Journey.
   */
  private async closeCircleForCanceledJourney(journeyId: string): Promise<void> {
    const gateway = getSocialGateway();
    const notice = await this.buildCanceledJourneyNotice(gateway, journeyId);
    await gateway.closeJourneyInvites(journeyId).catch(() => {});
    if (notice) await deliverCircleNotice(notice);
  }

  /** The notice for a just-canceled Journey, or null when it can't be built (offline, pillar off). */
  private async buildCanceledJourneyNotice(
    gateway: SocialGateway,
    journeyId: string,
  ): Promise<CircleNotice | null> {
    if (!gateway.enabled) return null;
    try {
      const [members, owner] = await Promise.all([
        gateway.listJourneyAllies(journeyId),
        gateway.currentProfile(),
      ]);
      return buildJourneyClosedNotice(members, owner);
    } catch {
      // A failed social read costs the Circle a notice, never the user their cancel.
      return null;
    }
  }

  // ── Account Inactivity Freeze (J5, LOCAL-FIRST POC) ─────────────────────────
  // The return experience after the local InactivityEngine froze the account's Journeys for a long
  // absence. Freezing reused the J3 path (provenance-tagged), so these methods only READ the marker
  // and RESUME away-frozen Journeys. NO method auto-resumes; a manually-paused or Future Journey is
  // never touched by the resume path. All are PURE reads except where noted (they persist on write).

  /**
   * The pending inactivity return, grouped by provenance ({@link InactivityReturn}), or null when
   * there is no unresolved freeze cycle. PURE read — safe to call during render. The away-frozen set
   * (freezeReason `account_inactivity`) is the only one offered for resume; manual pauses + Future
   * Journeys are surfaced separately and never in the resume set.
   */
  getInactivityReturn(): InactivityReturn | null {
    const marker = this.state.accountInactivity;
    if (!marker || marker.resolved) return null;
    const frozenJourneyIds: string[] = [];
    const manualFrozenJourneyIds: string[] = [];
    const futureJourneyIds: string[] = [];
    for (const j of this.state.journeys) {
      if (j.status === 'frozen') {
        if (j.freezeReason === 'account_inactivity') frozenJourneyIds.push(j.id);
        else manualFrozenJourneyIds.push(j.id);
      } else if (isFuture(j)) {
        // A Journey saved for later — including one whose scheduled start passed DURING the freeze
        // (activation is blocked while the account is frozen, Inactivity PRD §3.3). Shown for
        // context only; never in the resume set.
        futureJourneyIds.push(j.id);
      }
    }
    return { frozenJourneyIds, futureJourneyIds, manualFrozenJourneyIds };
  }

  /** Whether the return has not yet been auto-opened (drives the one-shot auto-open, mirrors Weekly Review). */
  inactivityReturnNeedsAutoOpen(): boolean {
    const marker = this.state.accountInactivity;
    return marker != null && !marker.resolved && marker.returnOpenedAt == null;
  }

  /**
   * Stamp the return as OPENED so it auto-opens only on the FIRST foreground after the freeze;
   * afterwards the persistent Home CTA is the entry point. Idempotent.
   */
  markInactivityReturnOpened(): void {
    const marker = this.state.accountInactivity;
    if (marker && !marker.resolved && marker.returnOpenedAt == null) {
      marker.returnOpenedAt = Date.now();
      this.onChanged();
    }
  }

  /**
   * Resume ONE away-frozen Journey from the return (J5) — guarded to `freezeReason === 'account_inactivity'`
   * so a manual pause / Future Journey can never be flipped by this path. Delegates to {@link resumeJourney}
   * (clears the provenance, reconciles reminders), then AUTO-RESOLVES the return once no away-frozen Journey
   * remains. Returns the resumed Journey, or null when the id is unknown / not away-frozen.
   */
  resumeInactivityJourney(journeyId: string): Journey | null {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey || journey.freezeReason !== 'account_inactivity') return null;
    const resumed = this.resumeJourney(journeyId);
    if (resumed) {
      this.autoResolveInactivityReturn();
      this.onChanged();
    }
    return resumed;
  }

  /**
   * Keep an away-frozen Journey PAUSED (J5) — the user chose to leave it frozen. It converts to a
   * MANUAL pause (provenance `'manual'`) so it drops out of the resume set and is never auto-resumed,
   * then auto-resolves the return once no away-frozen Journey remains. No-op for an unknown id or a
   * Journey that is not away-frozen.
   */
  keepInactivityJourneyFrozen(journeyId: string): void {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey || journey.status !== 'frozen' || journey.freezeReason !== 'account_inactivity') return;
    journey.freezeReason = 'manual';
    this.autoResolveInactivityReturn();
    this.onChanged();
  }

  /** Explicitly resolve the return (e.g. the user finished with it). Idempotent; persists. */
  resolveInactivityReturn(): void {
    const marker = this.state.accountInactivity;
    if (marker && !marker.resolved) {
      marker.resolved = true;
      this.onChanged();
    }
  }

  /** Mark the return resolved once no away-frozen Journey remains to act on (in-memory; caller persists). */
  private autoResolveInactivityReturn(): void {
    const marker = this.state.accountInactivity;
    if (!marker || marker.resolved) return;
    const anyAwayFrozen = this.state.journeys.some(
      (j) => j.status === 'frozen' && j.freezeReason === 'account_inactivity',
    );
    if (!anyAwayFrozen) marker.resolved = true;
  }

  // ── Dreams (Dream Management, D40 — coach-owned) ────────────────────────────
  // Thin facades over the JourneyEngine (which owns the Journey-side relationship). There is NO
  // user-approval gate (D40); the coach drives creation/linking. Dreams are private on-device data
  // — never added to any social/ProgressSummary/analytics payload (PRD §8, G2).

  /** The user's Dreams (private, on-device). Also surfaced on {@link Snapshot.dreams} for the UI. */
  getDreams(): Dream[] {
    return this.state.dreams;
  }

  /** Every Journey linked to a Dream (primary OR secondary), across all lifecycle states. */
  journeysForDream(dreamId: string): Journey[] {
    return journeysForDream(dreamId, this.state.journeys);
  }

  /**
   * Create a Dream from validated coach output (D40). Returns the Dream, or null when the title is
   * empty after normalization. Persists off {@link DreamCreated}. No user-approval gate.
   */
  createDream(input: NewDreamInput): Dream | null {
    return this.journeyEngine.createDream(input);
  }

  /**
   * Link a Journey to a Dream (D40) — `primary` sets the deterministic primary relationship (demoting
   * any current primary to a secondary), else adds a secondary. Never edits the Journey's Steps or
   * schedule. Returns whether a link was made. Persists off {@link JourneyDreamLinked}.
   */
  linkJourneyToDream(journeyId: string, dreamId: string, opts: { primary: boolean }): boolean {
    return this.journeyEngine.linkJourneyToDream(journeyId, dreamId, opts);
  }

  /**
   * Remove a Journey↔Dream relationship (D40) — never deletes or edits the Journey. Returns whether
   * anything changed. Persists off {@link JourneyDreamUnlinked}.
   */
  unlinkJourneyFromDream(journeyId: string, dreamId: string): boolean {
    return this.journeyEngine.unlinkJourneyFromDream(journeyId, dreamId);
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
  // per-Journey daily weekReviewAt). TWO HALVES, deliberately split: the week-close SUMMARY, the
  // never-empty next week and the 48h approval lifecycle run in PLAIN PRODUCTION (they need no
  // behaviour model); the Step-plan PROPOSAL is the adaptive half and stays behind the adaptive
  // loop, so without a model a review is generated with `proposals: []` and the screen shows its
  // no-changes branch. The proposal, when present, is a forward-only diff the user must approve —
  // never applied silently (D40/D43).

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
   * two: an existing PENDING review is marked `superseded` first (PRD §9). Always builds the
   * summary + next-week plan; the Step-plan proposal only when the behaviour model exists (adaptive
   * loop on) — without it the review carries `proposals: []`.
   */
  private generateWeeklyReview(windowStart: number, windowEnd: number, now: number): void {
    const prev = this.state.weeklyReview;
    if (prev && prev.status === 'pending') prev.status = 'superseded';
    const adaptiveInputs = this.behaviorModel
      ? {
          insight: this.behaviorModel.getInsights(),
          constraintsFor: (journey: Journey) =>
            deriveConstraints(journey, this.state.schedulingPrefs),
        }
      : {};
    this.state.weeklyReview = buildWeeklyReview(
      {
        journeys: this.state.journeys,
        dreams: this.state.dreams,
        reasonLog: this.state.reasonLog ?? [],
        ...adaptiveInputs,
        id: createId('review'),
        windowStart,
        windowEnd,
      },
      now,
    );
  }

  /**
   * The current PENDING Weekly Review the UI should surface (the screen + Home card), or null when
   * none is pending or it has passed the 48-hour retention window. PURE READ — safe to call during
   * render: a proposal past the window reads as null but is only flipped to `expired` by
   * {@link expireStaleWeeklyReview} on the next lifecycle beat (never a state write mid-render).
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

  // ── Completion Celebration (I1) ─────────────────────────────────────────────
  // The big Journey-completion ceremony reuses the Weekly-Review auto-open-next-foreground latch:
  // a Journey completes with a durable completionCard (minted once in JourneyEngine); the ceremony
  // is pending until markCompletionCeremonyShown stamps `ceremonyShownAt`. Only ONE major event
  // shows at a time (PRD §2.2). Deleted Journeys are absent from state, so they never surface.

  /**
   * PURE selector: would checking in `stepId` complete the Journey (the last required Step)?
   * Delegates to the engine — safe to call during render to gate the final confirmation (PRD §2.2).
   */
  willCompleteJourney(journeyId: string, stepId: string): boolean {
    return this.journeyEngine.willCompleteJourney(journeyId, stepId);
  }

  // ── End-of-Journey feedback (the label on the library's training data) ──────

  /**
   * The Journey that should be asked for its verdict now, or null. PURE READ — safe during render.
   *
   * Read at every foreground and after the completion ceremony. The THREE hosts and the reason
   * there are three of them are in {@link ../celebration/journeyFeedback}: asking only the people
   * who finished would make every training label a success and teach the library that everything
   * works.
   */
  pendingJourneyFeedback(now: number = Date.now()): PendingFeedback | null {
    return pendingFeedback(this.state.journeys, this.getReasonLog(), now);
  }

  /**
   * Record the verdict — or the fact that the user declined to give one. Both mark the Journey as
   * ASKED, so no Journey is ever asked twice; declining is an answer, and re-asking would make the
   * question a nag rather than a request.
   *
   * G1: `note` stays on the device. Nothing here transmits anything; the library's outbound record
   * is Stage 3 of its PRD and is gated behind consent that does not exist yet.
   */
  submitJourneyFeedback(
    journeyId: string,
    input: { helped?: Helped; reasonId?: string; note?: string } = {},
  ): boolean {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey || journey.feedback) return false;
    const pending = this.pendingJourneyFeedback();
    journey.feedback = buildJourneyFeedback({
      // The host the question was actually asked from; `quiet` is the honest fallback for a
      // Journey whose state moved on between the ask and the answer.
      host: pending?.journeyId === journeyId ? pending.host : 'quiet',
      ...input,
      now: Date.now(),
    });
    this.onChanged();
    return true;
  }

  /** The durable completion card attached to a Journey, or undefined (unknown / not yet completed). */
  getCompletionCard(journeyId: string): CompletionCard | undefined {
    return this.state.journeys.find((j) => j.id === journeyId)?.completionCard;
  }

  /**
   * The completion card for the REOPEN path (PRD §6, "Share completion"). Returns the durable card
   * when present; for a COMPLETED Journey that somehow lacks one (a legacy record predating the card
   * — normally healed by migration, but guarded here too) it LAZILY mints a minimal card stamped
   * already-shown, so reopening "Share completion" never crashes on a blank card. Idempotent: a second
   * call returns the same card without re-minting. A non-completed Journey is never mutated and yields
   * undefined. Framework-free — no React, mirrors {@link markCompletionCeremonyShown}'s direct mutate.
   */
  getOrBuildCompletionCard(journeyId: string): CompletionCard | undefined {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey) return undefined;
    if (journey.completionCard) return journey.completionCard;
    if (!journey.completedAt) return undefined;
    journey.completionCard = {
      ...buildCompletionCard(journey, journey.completedAt),
      ceremonyShownAt: journey.completedAt,
    };
    this.onChanged();
    return journey.completionCard;
  }

  /**
   * The single completed Journey whose big ceremony has NOT yet been shown — the pending major
   * event to surface on next foreground (PRD §2.2 "show only one at a time"). A completed Journey
   * carries a completionCard; it is pending until {@link markCompletionCeremonyShown} stamps
   * `ceremonyShownAt`. When several are pending, the EARLIEST-completed one wins (id break for
   * determinism). PURE READ — no state write. Deleted Journeys are absent from state, so a Journey
   * deleted before its ceremony opened never surfaces (PRD §8).
   */
  getPendingCompletionCeremony(): Journey | undefined {
    const pending = this.state.journeys.filter(
      (j) => j.status === 'completed' && j.completionCard != null && j.completionCard.ceremonyShownAt == null,
    );
    if (pending.length === 0) return undefined;
    return pending.sort(
      (a, b) =>
        a.completionCard!.completedAt - b.completionCard!.completedAt || a.id.localeCompare(b.id),
    )[0];
  }

  /** Whether a completion ceremony is pending (drives the one-shot auto-open, mirroring Weekly Review). */
  completionCeremonyNeedsAutoOpen(): boolean {
    return this.getPendingCompletionCeremony() != null;
  }

  /**
   * Stamp a Journey's ceremony as SHOWN so the big ceremony auto-opens only on the FIRST foreground
   * after completion; afterwards the completed Journey's "Share completion" action is the persistent
   * entry point (PRD §6). Idempotent — a no-op if the card is absent or already stamped.
   */
  markCompletionCeremonyShown(journeyId: string): void {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (journey?.completionCard && journey.completionCard.ceremonyShownAt == null) {
      journey.completionCard.ceremonyShownAt = Date.now();
      this.onChanged();
    }
  }

  /**
   * APPROVE the pending Weekly Review — apply the proposed plan change (PRD §8 "Approve the complete
   * upcoming plan"). REBASED against current reality and FORWARD-ONLY (D40/D41): the proposal is
   * recomputed from the live state at approval time, so it never creates occurrences on past days
   * and never rewrites an already-reported occurrence; the AdaptivePlanner only ever touches
   * not-done Steps. Application is ATOMIC — every diff is computed first, then all are enacted.
   * Returns whether a pending review was approved.
   *
   * WITHOUT the behaviour model (plain production) the review carries no Step-plan proposal at all,
   * so approving is purely acknowledging the week: the rebase is SKIPPED, not a Step is touched, and
   * the review is still resolved — never left dangling.
   */
  approveWeeklyReview(): boolean {
    const review = this.getPendingWeeklyReview();
    if (!review) return false;
    const now = Date.now();
    if (this.behaviorModel) {
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
   * Whether a Step has any DIRECT dependents (Step Dependencies) — a pure read the report flow uses to
   * decide whether reporting the Step not-done needs the "this also moves the Steps that depend on it"
   * confirmation. False for an unknown Journey/Step. Safe to call during render.
   */
  hasDependentSteps(journeyId: string, stepId: string): boolean {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    const step = journey?.steps.find((s) => s.id === stepId);
    if (!journey || !step) return false;
    return directDependentsOf(step, journey).length > 0;
  }

  /**
   * Defer a predecessor's whole DEPENDENT chain forward by one week (Step Dependencies) — the cascade
   * the report flow runs after the user confirms a predecessor is not done. Delegates to the
   * JourneyEngine (which moves each dependent's `plannedFor` +1 week via the {@link rescheduleStep}
   * seam), then persists + notifies. No-op for an unknown Journey/Step.
   */
  deferDependents(journeyId: string, predecessorStepId: string): void {
    this.journeyEngine.deferDependents(journeyId, predecessorStepId);
    this.onChanged();
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
   * What a Journey means for the STREAK right now — `recommended` while the week still has slack,
   * `binding` once every remaining day must carry a session (Open Work 1.1). The SINGLE entry point
   * for surfaces that want to SHOW the difference the streak rule already applies (D26.4).
   *
   * The rule is unchanged: this reads the very same `isUrgentMiss` predicate the StreakEngine
   * resets on, through the same injected {@link STREAK_CONFIG}, so the badge on a Step row and the
   * behaviour of the streak can never disagree. A missing Journey is reported as `recommended` —
   * the calm side — because a surface must never threaten on the strength of data it doesn't have.
   */
  streakRole(journeyId: string, now: number = Date.now()): StreakRole {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey) return 'recommended';
    return streakRole(journey, now, STREAK_CONFIG);
  }

  /**
   * The week as SEVEN DAYS — the single derivation behind Home's day strip and its per-day list
   * (`core/util/weekByDay`, Week_By_Day_Home_PRD). It is a pure VIEW: a Step that was missed is
   * SHOWN on a later day when the rule allows it, and nothing is ever rescheduled by looking at it.
   *
   * It reads the display superset (`getWeekSteps`), so a finished day shows a check rather than
   * reading as empty, and it injects the SAME {@link STREAK_CONFIG} the streak rule and the badge
   * use — "does this Journey still owe the week sessions" must have exactly one answer in the app.
   */
  weekByDay(now: number = Date.now()): WeekByDay {
    return buildWeekByDay(this.journeyEngine.getWeekSteps(), this.state.journeys, now, STREAK_CONFIG);
  }

  /**
   * The week in three numbers for Home's summary card (`core/util/weekByDay.summariseWeek`): how
   * many Steps were done since the week began, out of everything this week holds.
   *
   * It reads the same display superset the day strip does, so the card and the strip can never
   * disagree about what the week contains.
   */
  weekSummary(now: number = Date.now()): WeekSummary {
    return summariseWeek(this.journeyEngine.getWeekSteps(), now);
  }

  /**
   * The Steps of LATER days that could be done on `dayStart` already — Home's "you could also do
   * today" list. Always available, not a reward for finishing the day: someone with time this
   * evening should not have to complete today before being offered the next thing.
   */
  pullForward(dayStart: number, limit?: number): TodayStep[] {
    return pullForwardCandidates(this.journeyEngine.getWeekSteps(), dayStart, limit);
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

  /**
   * The raw on-device Daily-Reporting log (D36) in append order — the SAME log {@link getStepStatus}
   * and the engines derive from. Presentational callers that arrange Step Dependencies
   * ({@link ../components/journey/journeyView.computeWeekLayout}) read it so their partial-unlock /
   * promote-on-unlock view matches the engine's `locked` flag exactly. On-device only (G1) — the log
   * never leaves the device; this is an in-process read for the UI.
   */
  getReasonLog(): readonly ReasonEntry[] {
    return this.state.reasonLog ?? [];
  }

  /**
   * The Companion Step payload for a Journey (Journey Support Circle, D2) — SYSTEM-GENERATED data
   * only (Step id/title, derived status, report date), used by the social publish path. Returns `[]`
   * for a manual/legacy Journey (Companion-INELIGIBLE), so the sync layer can never publish a
   * user-typed Step title to a Companion Ally — defense in depth alongside the UI + gateway guards.
   */
  getCompanionSteps(journeyId: string): CompanionStepInput[] {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    if (!journey || !isCompanionEligible(journey)) return [];
    return companionStepsFor(journey, this.state.reasonLog ?? []);
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
    // Account Inactivity Freeze (J5): run the detector FIRST, so any Journey newly frozen for a long
    // absence is already `frozen` when the reconcile below cancels its reminders in the same beat.
    this.inactivity.tick(Date.now());
    // Future Journey Management (§9): then start any scheduled Journey whose instant has arrived, so
    // the reconcile below plans its reminders in this same beat. Order matters — a freeze detected
    // just above blocks activation here (Inactivity PRD §3.3).
    this.futureJourneys.tick(Date.now());
    this.missionEngine.refresh();
    // Re-plan reminders on the same lifecycle beat as the Mission rollover, so a
    // day/week change (and any Journey that lapsed) is reflected in what's pending.
    void this.communicationScheduler.reconcile();
    const now = Date.now();
    // Adaptive report→replan real path (loop on only): `tick` the behaviour model FIRST so any Step
    // whose planned occurrence elapsed is flagged as a slip before the weekly beat below reads it.
    if (this.adaptiveEnabled && this.behaviorModel) this.behaviorModel.tick(now);
    // WEEKLY Review — runs in PLAIN PRODUCTION (strategic, at the week boundary — PRD §2/§5). The
    // week-close summary, the never-empty next week and the 48h lifecycle need no behaviour model;
    // only the Step-plan proposal does, so without one the review is generated with an empty
    // proposal list. Expire a stale (>48h) pending proposal before deciding whether to generate a
    // new one, so a week-rollover tick always supersedes cleanly rather than stacking on a draft.
    this.expireStaleWeeklyReview(now);
    this.maybeGenerateWeeklyReview(now);
    // The DAILY tactical auto-apply (D43) is a DIFFERENT mechanism from the weekly proposal and
    // stays STRICTLY behind the adaptive loop — it must never start running in production as a side
    // effect of the weekly beat above. It also runs ONLY while there is no pending weekly proposal:
    // a strategic proposal OWNS the plan for its whole 48h window, so the change the user was asked
    // to approve is never silently applied (incl. via runReview's atRisk bypass) before they decide.
    // Once the review is resolved/expired the daily loop resumes on the next tick.
    if (this.adaptiveEnabled && this.behaviorModel && !this.getPendingWeeklyReview()) {
      for (const journey of this.state.journeys) this.reviewWeek(journey.id);
    }
    this.onChanged();
  }

  /**
   * Request notification permission for on-device reminders. Returns whether granted.
   *
   * A GRANT immediately re-plans the whole set: every rule saved before permission existed (a Journey
   * created during onboarding, or before the user said yes) scheduled nothing at the time, and a rule
   * that was never scheduled is — to the user — no reminder at all (device QA 2026-08-17: no
   * notification had ever arrived).
   */
  async initReminders(): Promise<boolean> {
    const granted = await this.reminderEngine.init();
    if (granted) await this.communicationScheduler.reconcile();
    return granted;
  }

  /**
   * Re-resolve the words of every pending reminder against the CURRENT language, form of
   * address and communication style (D40, Communication_Style_Profile_PRD §10/§11). A plain
   * reconcile: the scheduler tears its notifications down and rebuilds them, asking the copy
   * builder again — so a preference the user just changed reaches reminders that were already
   * scheduled instead of waiting for the next rule edit. Fire-and-forget by design (nothing
   * user-visible depends on it finishing) and never throws, so a caller in a React effect
   * cannot produce an unhandled rejection.
   */
  reconcileNotificationCopy(): void {
    void this.communicationScheduler.reconcile().catch(() => {
      // Best-effort: a scheduling failure just leaves the previous copy pending.
    });
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

  // ── Smart Notification Timing — signal capture (Smart_Notification_Timing_PRD §4) ────────
  // The four hooks that let the app notice WHAT HAPPENED after a reminder. They are the whole
  // observation surface, and every one of them is a hard no-op while `featureFlags.smartTiming` is
  // off: no state is touched, no OS listener is registered, and no notification carries a payload —
  // so a build without the flag behaves exactly as the shipped one does.
  //
  // The two measurements PRD §4 keeps apart are kept apart here too: a foreground records only HOW
  // the app was opened (tap vs organic), while the verdict that can move a learned time needs a
  // real interaction with that Journey. A tap is a response, not proof that the Journey was seen.

  /**
   * Whether the Smart Timing loop may observe or store anything. Single gate, read by every hook
   * below, mirroring how {@link adaptiveEnabled} gates the coach.
   */
  private readonly smartTimingEnabled = featureFlags.smartTiming;

  /**
   * The app came to the foreground. Records the timestamp and, for any trial still inside its
   * response window, HOW we got here (PRD §4 "record tap vs organic foreground separately").
   *
   * A tap always wins over an organic reading of the same window: the OS may bring the app to the
   * foreground first and deliver the tap a beat later, and that is one arrival, not two.
   *
   * Persists without notifying — nothing here is on screen, so re-rendering every subscriber on
   * every foreground would be pure cost.
   */
  noteForeground(input: { at: number; viaTap: boolean }): void {
    if (!this.smartTimingEnabled) return;
    this.state.lastForegroundAt = input.at;
    for (const trial of this.state.timingTrials ?? []) {
      if (trial.outcome !== 'pending') continue;
      if (!withinResponseWindow(effectiveSendAt(trial), input.at)) continue;
      if (input.viaTap || trial.responseKind == null || trial.responseKind === 'none') {
        trial.responseKind = input.viaTap ? 'tap' : 'organic';
      }
    }
    this.persist();
  }

  /**
   * The user opened / viewed / acted on a Journey. PRD §4: doing that within the response window is
   * POSITIVE timing evidence for every pending trial that covered this Journey. The verdict itself
   * is computed by the pure classifier, so this facade holds no §4 logic of its own.
   *
   * Called from the Journey screen on mount. Safe to call for a Journey with no trials — which is
   * every Journey until Smart mode is switched on for it.
   */
  noteJourneyViewed(journeyId: string): void {
    if (!this.smartTimingEnabled) return;
    const at = Date.now();
    let changed = false;
    for (const trial of this.state.timingTrials ?? []) {
      if (trial.outcome !== 'pending') continue;
      if (!trial.journeyIds.includes(journeyId)) continue;
      const outcome = classifyTrial({
        scheduledAt: trial.scheduledAt,
        deliveredAt: trial.deliveredAt,
        journeyInteractionAt: at,
      });
      if (outcome === trial.outcome) continue;
      trial.outcome = outcome;
      changed = true;
    }
    if (changed) this.persist();
  }

  /**
   * Listen for the user TAPPING one of our notifications — the only signal that distinguishes a
   * tap-driven foreground from an organic one. Records the tap itself and hands the opaque
   * attribution ids to the optional `handler` (which is where a future deep-link would live).
   *
   * Returns an unsubscribe the caller MUST run on teardown. With the flag off nothing is registered
   * at all and the returned function is a no-op, so the OS never even knows we would listen.
   */
  onNotificationResponse(handler?: (data: ReminderNotificationData) => void): () => void {
    if (!this.smartTimingEnabled) return () => {};
    const subscription = this.reminderEngine.onNotificationResponse((data) => {
      this.noteForeground({ at: Date.now(), viaTap: true });
      if (data) handler?.(data);
    });
    return () => subscription.remove();
  }

  /**
   * The device's current IANA zone name (e.g. `Europe/Berlin`), or undefined when it cannot be
   * read. PRD §9 requires a time-zone change to invalidate a learned candidate, and only the zone
   * NAME is unambiguous — a UTC offset alone cannot tell travel from DST.
   *
   * Guarded twice over: `Intl` is present on Hermes for our SDK, but a stripped-ICU build would
   * return an empty string rather than throw, and both cases must degrade to "unknown zone" rather
   * than break app start. A zone name is a coarse location proxy, so it is only read while the flag
   * is on and it never leaves the device.
   */
  currentTimezoneName(): string | undefined {
    if (!this.smartTimingEnabled) return undefined;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
      return undefined;
    }
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
   * On-device copy for a postpone one-shot, from the SAME builder every other reminder uses
   * ({@link buildReminderCopy}) — so a postponed Step arrives in the user's language, form of
   * address (D31) and communication style (D40), exactly like the reminder it replaces. It used to
   * build its own `{ journey.title, step.title }` pair, which was the one reminder path in the app
   * that ignored all three.
   *
   * A one-shot is scheduled once and never reconciled, so unlike a rule this copy CANNOT be
   * re-resolved later: a language change after postponing reaches every other reminder and not this
   * one. That is the accepted cost of a fire-once notification, and the reason the builder is called
   * here at schedule time rather than baked earlier.
   *
   * PRIVACY: the Step title is deliberately NOT passed on (Reminders PRD §6 Q3 — no Step names on
   * the lock screen); it used to be the body. The Journey title stays, as it does everywhere else.
   * On-device only — the string never leaves the device (G1).
   */
  private postponeReminderCopy(journeyId: string, stepId: string): { title: string; body: string } {
    const journey = this.state.journeys.find((j) => j.id === journeyId);
    const built = journey
      ? buildReminderCopy({ journeyId, journeyTitle: journey.title })
      : null;
    if (built) return built;
    // No usable Journey title (the builder returns null rather than sending something blank): fall
    // back to the user's own Step text, still never a synthetic English sentence.
    const step = journey?.steps.find((s) => s.id === stepId);
    return { title: journey?.title ?? 'PushApp', body: step?.title ?? '' };
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
      // The list fields are handed out as FRESH arrays, never the live `state` ones. The engines
      // mutate Journeys and Steps IN PLACE, so a snapshot that re-exported the same array reference
      // left every `useMemo([snapshot.journeys])` reader frozen on a stale derivation: reporting a
      // Step done on Home left the Journeys card reading 0% until the screen remounted (Device QA
      // 2026-08-17, A2). A new array identity per snapshot is what makes "recomputed on every
      // change" true. Shallow by design — the entries are still the live domain objects.
      dreams: [...this.state.dreams],
      journeys: [...this.state.journeys],
      parkedGoals: [...(this.state.parkedGoals ?? [])],
      futureCapacity: futureCapacity(this.state.journeys),
      todaySteps: this.journeyEngine.getTodaySteps(),
      weekSteps: this.journeyEngine.getWeekSteps(),
      // RUNNING Journeys only (isRunning): a frozen, completed, or FUTURE Journey is not part of the
      // user's current workload, so none of them inflate the count Home reads.
      activeJourneyCount: this.state.journeys.filter(isRunning).length,
      claimableRewards: this.missionEngine.getClaimableCount(),
      streak: this.state.streak ?? 0,
      onboardingCompleted: this.state.onboardingCompletedAt != null,
      dataRecovery: this.dataRecovery,
    };
  }

  // ── Onboarding (Initial Onboarding Questionnaire, K2) ───────────────────────
  // First-run only: the gate routes into the flow until `onboardingCompletedAt` is set, then never
  // again. Answers + resume position live ON DEVICE (PRD §10) — nothing here is sent to the cloud;
  // generation→Dreams stays the coach's gated job (D40).

  /** The page the flow should resume at (PRD §8), defaulting to the start. */
  getOnboardingStep(): OnboardingStep {
    return this.state.onboardingStep ?? 'language';
  }

  /** The user's on-device onboarding answers (the Coach's opening context), or a fresh empty set. */
  getOnboardingAnswers(): OnboardingAnswers {
    return this.state.onboardingAnswers ?? emptyOnboardingAnswers();
  }

  /**
   * The minimal, named Coach-handoff summary derived from the answers (PRD §9) — the seam the first
   * Coach conversation reads to ask a grounded opening question. Pure/derived; rebuilt on every call
   * so it always reflects the current answers (PRD §10). Returns null when the user never answered.
   */
  getOnboardingCoachSummary(): CoachOnboardingSummary | null {
    return this.state.onboardingAnswers ? toCoachSummary(this.state.onboardingAnswers) : null;
  }

  /**
   * Persist mid-flow progress (PRD §8 "save after every page"): the resume position + the answers so
   * far. Keeps onboarding INCOMPLETE — completion is a separate, explicit step ({@link completeOnboarding}).
   */
  saveOnboardingProgress(step: OnboardingStep, answers: OnboardingAnswers): void {
    this.state.onboardingStep = step;
    this.state.onboardingAnswers = answers;
    this.onChanged();
  }

  /**
   * Mark first-run onboarding COMPLETE (PRD §7). Stamps `onboardingCompletedAt` so the gate never
   * shows the flow again, and stores the final answers as the Coach's opening context. Idempotent —
   * a re-call keeps the original completion timestamp. The caller then opens the first Coach
   * conversation.
   */
  completeOnboarding(answers: OnboardingAnswers): void {
    this.state.onboardingAnswers = answers;
    this.state.onboardingStep = 'completion';
    this.state.onboardingCompletedAt ??= Date.now();
    this.onChanged();
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
