/**
 * ReminderEngine — on-device local notifications for POC reminders (time/day),
 * no push server. This is the ONLY core file that imports expo-notifications, so
 * the rest of core stays pure and provider-agnostic. All calls are guarded so a
 * denied permission or an unsupported platform never crashes the app.
 */
import * as Notifications from 'expo-notifications';

export interface DailyReminderInput {
  title: string;
  body: string;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
}

export class ReminderEngine {
  private permissionGranted = false;

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

  /** Schedule a simple repeating daily reminder. Returns the id, or null if unavailable. */
  async scheduleDailyReminder(input: DailyReminderInput): Promise<string | null> {
    if (!this.permissionGranted) return null;
    try {
      return await Notifications.scheduleNotificationAsync({
        content: { title: input.title, body: input.body },
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
