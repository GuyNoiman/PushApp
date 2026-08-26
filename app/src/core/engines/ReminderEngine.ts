/**
 * ReminderEngine — on-device local notifications for POC reminders (time/day),
 * no push server. This is the ONLY core file that imports expo-notifications, so
 * the rest of core stays pure and provider-agnostic. All calls are guarded so a
 * denied permission or an unsupported platform never crashes the app.
 */
import type { EventBus } from '../events/EventBus';
import { NullCalendarGateway, type CalendarGateway } from '../calendar/CalendarGateway';
import { NullLocationGateway, type LocationGateway } from '../location/LocationGateway';
import type { ReminderRule, ReminderTrigger } from '../types/domain';
import * as Notifications from 'expo-notifications';

/**
 * The OPAQUE payload attached to a scheduled notification so a tap can be attributed back to what
 * sent it (Smart Notification Timing, PRD §4). IDS ONLY — deliberately no title, no body, no Step
 * or Journey name: a notification payload is readable by anything that can read the notification,
 * so nothing that would identify the user's goals may go in it. The receiver resolves the ids
 * against on-device state.
 */
export interface ReminderNotificationData {
  /** The reminder rule that produced this send. */
  ruleId: string;
  /** The Journey the send belongs to. */
  journeyId: string;
  /** What kind of send this is — one Journey's reminder, or a multi-Journey adaptive aggregate. */
  kind: 'reminder' | 'aggregate';
}

/**
 * Whether an incoming notification is an adaptive AGGREGATE, read from the opaque payload we
 * attached at schedule time. Defensive by design: anything scheduled before the payload existed,
 * or by anyone else, reads as `false` and is shown normally.
 */
function isAggregateNotification(notification: { request?: { content?: { data?: unknown } } }): boolean {
  const data = notification?.request?.content?.data;
  return !!data && typeof data === 'object' && (data as { kind?: unknown }).kind === 'aggregate';
}

export interface DailyReminderInput {
  title: string;
  body: string;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
  /** Optional attribution ids (see {@link ReminderNotificationData}); omitted ⇒ no payload at all. */
  data?: ReminderNotificationData;
}

/** Optional gateways for the DORMANT calendar/location trigger kinds. */
export interface ReminderGateways {
  location?: LocationGateway;
  calendar?: CalendarGateway;
}

/** A registered listener, mirroring expo's `EventSubscription`. Call {@link remove} to unsubscribe. */
export interface ReminderSubscription {
  remove: () => void;
}

export class ReminderEngine {
  private permissionGranted = false;
  /**
   * Whether the OS has been asked about permission AT ALL in this app run. The engine is rebuilt on
   * every cold start, so `permissionGranted` starts `false` even for a user who granted permission
   * months ago — and before this flag existed, a launch where nothing happened to call
   * {@link init}/{@link refreshPermission} scheduled NOTHING, silently, for the whole session (device
   * QA 2026-08-17: no notification ever arrived). Now the first schedule attempt reads the OS once —
   * WITHOUT prompting — so a granted permission is honoured whatever route the user took into the app.
   */
  private permissionChecked = false;
  private readonly location: LocationGateway;
  private readonly calendar: CalendarGateway;

  /**
   * Intervention seam: bus reserved so a future InterventionEngine can react to
   * events (e.g. StepMissed) to decide when/how to nudge — deferred. Optional and
   * stored only; current behavior is unchanged and nothing is subscribed yet.
   *
   * The calendar/location gateways are the DORMANT trigger seams (both Null by
   * default). They are used ONLY to schedule on-device notifications; per red-line
   * R2 they never send data off-device. A Null/disabled gateway makes those trigger
   * kinds a graceful no-op (returns no ids).
   */
  constructor(
    private readonly bus?: EventBus,
    gateways: ReminderGateways = {},
  ) {
    this.location = gateways.location ?? NullLocationGateway;
    this.calendar = gateways.calendar ?? NullCalendarGateway;
  }

  /** Ask for notification permission once. Safe to call repeatedly. */
  async init(): Promise<boolean> {
    try {
      // Configure how notifications present — lazily, only when the user opts in,
      // so expo-notifications isn't pulled into cold start for everyone.
      Notifications.setNotificationHandler({
        // This runs ONLY while the app is in the foreground, which makes it the exact place for
        // "if the app is already foregrounded, suppress it" (Smart_Notification_Timing_PRD §3).
        // An AGGREGATE is a nudge to come back — telling somebody who is already here to come back
        // is the app talking to itself. A per-Journey reminder is left alone: a person set that
        // time on purpose, and silencing it here would be a hidden schedule change (PRD §2).
        handleNotification: async (notification) => {
          const suppressed = isAggregateNotification(notification);
          return {
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: !suppressed,
            shouldShowList: !suppressed,
          };
        },
      });
      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted;
      if (!granted) {
        const request = await Notifications.requestPermissionsAsync();
        granted = request.granted;
      }
      this.permissionGranted = granted;
      this.permissionChecked = true;
      return granted;
    } catch {
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Whether OS notification permission was granted at the last {@link init}/{@link refreshPermission}
   * check (cached). Journey Reminder Management (D40) reads this to show the "disabled by permission"
   * state. Starts false until a check runs, so a surface that needs an accurate reading should call
   * {@link refreshPermission} first.
   */
  hasPermission(): boolean {
    return this.permissionGranted;
  }

  /**
   * Re-read the current OS notification permission WITHOUT prompting, update the cache, and return
   * it. Distinct from {@link init}, which may show the permission request. Never throws — on failure
   * the previously-cached value is returned unchanged.
   */
  async refreshPermission(): Promise<boolean> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      this.permissionGranted = settings.granted;
      this.permissionChecked = true;
      return settings.granted;
    } catch {
      return this.permissionGranted;
    }
  }

  /**
   * The permission answer to schedule against, reading the OS ONCE per app run if nobody has asked
   * yet. Never prompts (that stays {@link init}'s job, in context) and never re-reads once an answer
   * is known — so this cannot turn into a per-notification OS call. Exists so a reminder the user
   * configured in an earlier session still schedules after a restart; see {@link permissionChecked}.
   */
  private async ensurePermission(): Promise<boolean> {
    if (this.permissionGranted || this.permissionChecked) return this.permissionGranted;
    return this.refreshPermission();
  }

  /**
   * Listen for the user INTERACTING with one of our notifications (a tap) — the only way to tell a
   * tap-driven foreground from an organic one (Smart Notification Timing, PRD §4). The callback
   * receives the opaque {@link ReminderNotificationData} we attached at schedule time, or `null`
   * when the notification carried none (anything scheduled before this existed, or with the flag
   * off) — so a caller never has to guess at an untyped payload.
   *
   * Guarded like every other call here: if the SDK cannot register a listener, this returns a
   * subscription whose `remove` is a no-op rather than throwing at app start. Callers MUST call
   * `remove()` on teardown.
   */
  onNotificationResponse(
    callback: (data: ReminderNotificationData | null) => void,
  ): ReminderSubscription {
    try {
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        callback(readNotificationData(response?.notification?.request?.content?.data));
      });
      return { remove: () => subscription.remove() };
    } catch {
      return { remove: () => {} };
    }
  }

  /** Schedule a simple repeating daily reminder. Returns the id, or null if unavailable. */
  async scheduleDailyReminder(input: DailyReminderInput): Promise<string | null> {
    if (!(await this.ensurePermission())) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: input.title,
          body: input.body,
          ...(input.data ? { data: toNotificationPayload(input.data) } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: input.hour,
          minute: input.minute,
        },
      });
    } catch {
      return null;
    }
  }

  /**
   * Schedule a ONE-SHOT reminder that fires once at a specific instant — the per-occurrence
   * postpone reminder (Step Postponement, D37). Uses the DATE trigger of the installed
   * expo-notifications (Expo 54 / expo-notifications ~0.32.17):
   * ({@link Notifications.SchedulableTriggerInputTypes.DATE}). Returns the OS id to store on the
   * Step, or `null` when it can't be scheduled: permission not granted, or the target is already
   * in the past (a postpone still succeeds — it just fires no notification). Never throws.
   */
  async scheduleOneShot(input: { title: string; body: string; at: number }): Promise<string | null> {
    if (!(await this.ensurePermission())) return null;
    if (input.at <= Date.now()) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        content: { title: input.title, body: input.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: input.at,
        },
      });
    } catch {
      return null;
    }
  }

  /**
   * Schedule every OS notification a rule needs, returning the ids to store on the
   * rule (`ReminderRule.scheduledNotificationIds`). Behavior by trigger kind:
   *  - `fixedTime` with no weekdays → one DAILY notification (reuses
   *    scheduleDailyReminder);
   *  - `fixedTime` with weekdays → one WEEKLY notification per weekday, returning
   *    all ids;
   *  - `calendar` / `location` → resolved via the (dormant) gateway; returns `[]`
   *    when the gateway is Null/disabled — a graceful no-op.
   * Returns `[]` (schedules nothing) if the rule is disabled or permission is
   * missing. Never throws — a failure to schedule one id just drops that id.
   *
   * `data` is the OPTIONAL opaque attribution payload (ids only) the caller wants on the resulting
   * notifications; omitted ⇒ the content is exactly what shipped before.
   */
  async scheduleRule(rule: ReminderRule, data?: ReminderNotificationData): Promise<string[]> {
    if (!rule.enabled) return [];
    const t = rule.trigger;
    switch (t.kind) {
      case 'fixedTime':
        return this.scheduleFixedTime(rule, t, data);
      case 'location': {
        if (!this.location.enabled) return [];
        const id = await this.location.watchPlace({ id: rule.id, transition: t.transition ?? 'enter' });
        return id ? [id] : [];
      }
      case 'calendar': {
        if (!this.calendar.enabled) return [];
        const id = await this.calendar.watchEvents({ id: rule.id, minutesBefore: t.minutesBefore ?? 0 });
        return id ? [id] : [];
      }
    }
  }

  /**
   * Schedule a fixedTime trigger: a plain daily when no weekdays are given, else
   * one WEEKLY notification per chosen weekday. `weekdays` are in JS
   * `Date.getDay()` convention (0=Sunday … 6=Saturday); expo-notifications wants
   * 1..7 with 1=Sunday, so we map `weekday = jsDay + 1`.
   */
  private async scheduleFixedTime(
    rule: ReminderRule,
    t: Extract<ReminderTrigger, { kind: 'fixedTime' }>,
    data?: ReminderNotificationData,
  ): Promise<string[]> {
    const days = t.weekdays ?? [];
    if (days.length === 0) {
      const id = await this.scheduleDailyReminder({
        title: rule.title,
        body: rule.body,
        hour: t.hour,
        minute: t.minute,
        ...(data ? { data } : {}),
      });
      return id ? [id] : [];
    }
    if (!(await this.ensurePermission())) return [];
    const ids: string[] = [];
    for (const jsDay of days) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: rule.title,
            body: rule.body,
            ...(data ? { data: toNotificationPayload(data) } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: jsDay + 1, // JS 0=Sun → expo 1=Sun
            hour: t.hour,
            minute: t.minute,
          },
        });
        ids.push(id);
      } catch {
        // Skip a weekday that failed to schedule rather than aborting the rest.
      }
    }
    return ids;
  }

  /**
   * Cancel every REPEATING notification the app has pending, whoever scheduled it.
   *
   * WHY THIS EXISTS (bug, founder's phone, 2026-08-23: three identical reminders at once). The
   * CommunicationScheduler tears down before it rebuilds, but it tracked the ids it owned IN
   * MEMORY — so after a cold start it knew about nothing, cancelled nothing, and scheduled the same
   * daily reminder again. Every launch added another copy of the same notification, and the OS
   * delivered them all. The ids are gone; the notifications are not, so nothing that reads our own
   * bookkeeping can clean them up. The OS is the only place that still knows.
   *
   * WHAT IT DOES NOT TOUCH: one-shot DATE notifications. Those are the per-occurrence postpone
   * reminders (D37), each scheduled deliberately for one instant, and they are not the scheduler's
   * to cancel. Only repeating triggers — the daily and weekly sends this app plans from rules — are
   * swept.
   *
   * Returns how many were cancelled (for the log/test); never throws.
   */
  async cancelRepeating(): Promise<number> {
    try {
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      let cancelled = 0;
      for (const request of pending ?? []) {
        if (!isRepeatingTrigger((request as { trigger?: unknown })?.trigger)) continue;
        const id = (request as { identifier?: unknown })?.identifier;
        if (typeof id !== 'string') continue;
        await this.cancel(id);
        cancelled += 1;
      }
      return cancelled;
    } catch {
      return 0;
    }
  }

  /** Cancel every OS notification a rule scheduled (its stored ids). */
  async cancelRule(rule: ReminderRule): Promise<void> {
    for (const id of rule.scheduledNotificationIds) {
      await this.cancel(id);
    }
  }

  /** Cancel a previously scheduled reminder. */
  async cancel(reminderId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(reminderId);
    } catch {
      // ignore — cancelling a missing reminder is not an error worth surfacing
    }
  }

  /** Cancel every scheduled reminder. */
  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // ignore
    }
  }
}

/**
 * Narrow the untyped `content.data` an OS notification carries back to OUR payload, or `null` if it
 * is anything else. Defensive on purpose: the payload survives app updates on the OS side, so a
 * notification scheduled by an older build (no payload) or a foreign shape must read as "no
 * attribution" rather than crash the listener or produce a half-built object.
 */
/**
 * The exact record we put on a notification. Written out field by field rather than spread, so the
 * three opaque ids are the ONLY thing that can ever reach the payload even if the type grows later.
 */
function toNotificationPayload(data: ReminderNotificationData): Record<string, unknown> {
  return { ruleId: data.ruleId, journeyId: data.journeyId, kind: data.kind };
}

/**
 * Whether a pending notification's trigger REPEATS.
 *
 * The shape differs by platform and by SDK version — Android reports a typed trigger
 * (`type: 'daily' | 'weekly'`), iOS reports a calendar trigger carrying `repeats: true` — so both
 * are recognised, and anything unrecognised is treated as NOT repeating. Erring that way is
 * deliberate: the cost of missing one is a duplicate that the next sweep catches, and the cost of
 * guessing wrong the other way is silently cancelling somebody's one-shot reminder.
 */
export function isRepeatingTrigger(trigger: unknown): boolean {
  if (!trigger || typeof trigger !== 'object') return false;
  const t = trigger as { type?: unknown; repeats?: unknown };
  if (t.repeats === true) return true;
  return t.type === 'daily' || t.type === 'weekly';
}

function readNotificationData(raw: unknown): ReminderNotificationData | null {
  if (!raw || typeof raw !== 'object') return null;
  const { ruleId, journeyId, kind } = raw as Record<string, unknown>;
  if (typeof ruleId !== 'string' || typeof journeyId !== 'string') return null;
  if (kind !== 'reminder' && kind !== 'aggregate') return null;
  return { ruleId, journeyId, kind };
}
