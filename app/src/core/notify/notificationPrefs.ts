/**
 * notificationPrefs — which kinds of thing the user has agreed to hear about, and the one honest
 * distinction between them.
 *
 * ── WHAT COULD BE CONTROLLED, AND WHAT COULD NOT ──────────────────────────────────────────────
 *
 * There are two places a notification can appear, and this app can only reach one of them from a
 * server: nowhere. Every reminder is a LOCAL notification scheduled on the device, and we hold no
 * push token at all — so:
 *
 *  - **Reminders** can appear outside the app, on the lock screen. They are the only thing that can.
 *  - **Everything a person does for you** — a cheer, a nudge, a request, an invitation, a Journey
 *    somebody paused — reaches this app only when it next asks the server. It appears in the
 *    activity bell and it cannot, today, appear anywhere else.
 *
 * So a per-type "also outside the app" switch would be a control over something that cannot happen
 * for six of the seven kinds. The screen says that instead of drawing a dead switch — the same rule
 * that removed a decorative microphone and a disabled Circle field the same week.
 *
 * ── AND WHY THESE PREFERENCES EXISTED WITHOUT DOING ANYTHING ──────────────────────────────────
 *
 * `CommunicationPrefs` has been in the model, persisted, migrated and exported since the social
 * pillar landed, and until 2026-08-28 **nothing read it and no screen wrote it.** A stored
 * preference that changes nothing is worse than an absent one: it looks like a promise. This module
 * is what makes it true.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports.
 */
import type { NotificationKind } from '../social/notifications';
import type { CommunicationPrefs } from '../types/domain';

/**
 * One switch a person can see, in the words they would use, mapped to the bell kinds it governs.
 * `reminders` is separate because it is the only one that leaves the app.
 */
export type NotificationSettingId =
  | 'reminders'
  | 'cheers'
  | 'nudges'
  | 'requests'
  | 'journeyStatus'
  | 'mirrorInvites';

/** Everything a setting needs to be rendered and read, as data rather than a switch statement. */
export interface NotificationSetting {
  id: NotificationSettingId;
  /** The preference field it reads and writes. */
  key: keyof CommunicationPrefs;
  /** The bell kinds it silences. Empty for reminders, which never reach the bell. */
  kinds: readonly NotificationKind[];
  /**
   * Whether turning this on can put anything on the lock screen. True only for reminders — see the
   * file header. The screen says so plainly rather than offering a switch that cannot work.
   */
  canLeaveTheApp: boolean;
}

/** The switches, in the order the screen shows them. Config, not code. */
export const NOTIFICATION_SETTINGS: readonly NotificationSetting[] = [
  { id: 'reminders', key: 'remindersEnabled', kinds: [], canLeaveTheApp: true },
  { id: 'cheers', key: 'socialCheerEnabled', kinds: ['cheer'], canLeaveTheApp: false },
  { id: 'nudges', key: 'socialNudgeEnabled', kinds: ['nudge'], canLeaveTheApp: false },
  {
    id: 'requests',
    key: 'socialRequestsEnabled',
    kinds: ['friendRequest', 'allyInvite'],
    canLeaveTheApp: false,
  },
  {
    id: 'journeyStatus',
    key: 'journeyStatusEnabled',
    kinds: ['journeyPaused', 'journeyResumed'],
    canLeaveTheApp: false,
  },
  { id: 'mirrorInvites', key: 'mirrorInvitesEnabled', kinds: ['mirrorInvite'], canLeaveTheApp: false },
];

/**
 * Whether a preference is on. ABSENT COUNTS AS ON, deliberately: the three newest fields are
 * optional so an existing account loads without them, and a person who has never expressed a
 * preference should keep getting what the app already gave them.
 */
export function isSettingOn(prefs: CommunicationPrefs | undefined, key: keyof CommunicationPrefs): boolean {
  const value = prefs?.[key];
  return value === undefined ? true : value === true;
}

/** Whether a bell notification of this kind may be shown. Unknown kinds are shown, never hidden. */
export function isKindEnabled(kind: NotificationKind, prefs: CommunicationPrefs | undefined): boolean {
  const setting = NOTIFICATION_SETTINGS.find((s) => s.kinds.includes(kind));
  return setting ? isSettingOn(prefs, setting.key) : true;
}
