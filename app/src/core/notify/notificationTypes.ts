/**
 * notificationTypes — the SOURCE OF TRUTH for every kind of notification PushApp can send, and the
 * static metadata each carries (config-before-code: the catalogue lives here, never hard-coded in an
 * engine or screen). This is the infrastructure layer of the unified notification service (D40): it
 * names the types and classifies their copy; {@link ./notificationContent} turns a type + params into
 * a localized, tone-ready `{ title, body }`.
 *
 * We define ALL NINE Support-Circle notification types now — even the ones that do not fire yet (the
 * Support Circle backend is a separate, gated slice) — so the catalogue is complete and wiring a
 * trigger later is a one-line call, not a new type. The one live type today is `reminder`.
 *
 * PRIVACY (SECURITY-PRIVACY G1 + store rules, Journey_Support_Circle_PRD §7): a notification body that
 * reaches the lock screen must never leak private free text — a Journey title, a Step title, a report
 * or reason note, or another person's private content. Each type is classified:
 *   - `lock-safe`   — the body is a FIXED template that interpolates only a person's display name; it
 *                     never carries the owner's private content. All nine social types are lock-safe.
 *   - `owner-content` — the body may contain the recipient's OWN Journey/Step text, because it fires on
 *                     the owner's own device about their own content (the shipped reminder behaviour).
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */

/**
 * Every notification kind. Nine Support-Circle types (Journey_Support_Circle_PRD §7) plus `reminder`
 * (the shipped per-Journey nudge). More types are coming (D40) — add them here first.
 */
export type NotificationType =
  | 'reminder'
  | 'ally_request'
  | 'ally_accepted'
  | 'ally_declined'
  | 'ally_permission_changed'
  | 'ally_removed'
  | 'journey_frozen'
  | 'journey_resumed'
  | 'journey_completed'
  | 'journey_closed';

/** How a type's body must be treated on the lock screen (see file header). */
export type NotificationPrivacy = 'lock-safe' | 'owner-content';

/**
 * The params each type interpolates into its copy, keyed by type — the compile-time contract for a
 * `buildNotificationContent` call. The social types carry ONLY a person's display `name` (never the
 * owner's private content); `reminder` carries the owner's own — optional — Journey/Step text.
 */
export interface NotificationParamsByType {
  reminder: { journeyTitle?: string; stepTitle?: string };
  ally_request: { name: string };
  ally_accepted: { name: string };
  ally_declined: { name: string };
  ally_permission_changed: { name: string };
  ally_removed: { name: string };
  journey_frozen: { name: string };
  journey_resumed: { name: string };
  journey_completed: { name: string };
  journey_closed: { name: string };
}

/** Static metadata for one notification type. */
export interface NotificationTypeSpec {
  /** Stable id (matches the {@link NotificationType} union member). */
  readonly id: NotificationType;
  /**
   * The i18n key group within the `notify` namespace. The title/body keys are `${keyGroup}.title`
   * and `${keyGroup}.body` (a future tone layer may append a suffix — see notificationContent).
   */
  readonly keyGroup: string;
  /** The interpolation param names this type's copy expects (documentation + runtime guard). */
  readonly params: readonly string[];
  /** Lock-screen classification for the body (see {@link NotificationPrivacy}). */
  readonly privacy: NotificationPrivacy;
}

/** The interpolation params every social (Support-Circle) type shares: a person's display name only. */
const SOCIAL_PARAMS = ['name'] as const;

/**
 * The notification catalogue, keyed by type. Only `reminder` fires today; the nine social types are
 * defined but dormant until the Support Circle backend wires them (D40). Edit copy in the `notify`
 * i18n namespace, never here — this file holds only the stable structure.
 */
export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeSpec> = {
  reminder: { id: 'reminder', keyGroup: 'reminder', params: [], privacy: 'owner-content' },
  ally_request: { id: 'ally_request', keyGroup: 'allyRequest', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
  ally_accepted: { id: 'ally_accepted', keyGroup: 'allyAccepted', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
  ally_declined: { id: 'ally_declined', keyGroup: 'allyDeclined', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
  ally_permission_changed: {
    id: 'ally_permission_changed',
    keyGroup: 'allyPermissionChanged',
    params: SOCIAL_PARAMS,
    privacy: 'lock-safe',
  },
  ally_removed: { id: 'ally_removed', keyGroup: 'allyRemoved', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
  journey_frozen: { id: 'journey_frozen', keyGroup: 'journeyFrozen', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
  journey_resumed: { id: 'journey_resumed', keyGroup: 'journeyResumed', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
  journey_completed: {
    id: 'journey_completed',
    keyGroup: 'journeyCompleted',
    params: SOCIAL_PARAMS,
    privacy: 'lock-safe',
  },
  journey_closed: { id: 'journey_closed', keyGroup: 'journeyClosed', params: SOCIAL_PARAMS, privacy: 'lock-safe' },
};

/** All notification type ids, in catalogue order. */
export const NOTIFICATION_TYPE_IDS = Object.keys(NOTIFICATION_TYPES) as NotificationType[];
