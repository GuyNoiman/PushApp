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
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted;
      if (!granted) {
        const request = await Notifications.requestPermissionsAsync();
        granted = request.granted;
      }
      this.permissionGranted = granted;
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
      return settings.granted;
    } catch {
      return this.permissionGranted;
    }
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
    if (!this.permissionGranted) return null;
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
    if (!this.permissionGranted) return null;
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
    if (!this.permissionGranted) return [];
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

function readNotificationData(raw: unknown): ReminderNotificationData | null {
  if (!raw || typeof raw !== 'object') return null;
  const { ruleId, journeyId, kind } = raw as Record<string, unknown>;
  if (typeof ruleId !== 'string' || typeof journeyId !== 'string') return null;
  if (kind !== 'reminder' && kind !== 'aggregate') return null;
  return { ruleId, journeyId, kind };
}
