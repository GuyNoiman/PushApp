/**
 * notificationContent — the unified notification CONTENT service (D40). Turns a notification type +
 * its params into a localized, gender-aware, tone-ready `{ title, body }`. This is the one place copy
 * for any notification is built, so every trigger (the shipped reminder today; the nine Support-Circle
 * types once their backend lands) reads consistently and honours the same privacy rules.
 *
 * It is PURE and framework-free (CLAUDE.md §6): deterministic, no I/O, no React. It reads copy through
 * the framework-free i18next core (`i18n.t`, never a hook) in the caller's language, applies the user's
 * FORM OF ADDRESS as i18next context (D31), and threads a TONE SEAM for the future unified communication
 * style (D40) — accepted now, a no-op today.
 *
 * PRIVACY (SECURITY-PRIVACY G1, {@link ./notificationTypes} header): social-type bodies interpolate ONLY
 * a person's display name into a fixed template; they can never carry the owner's private free text,
 * because their param contract ({@link NotificationParamsByType}) exposes no such field. The reminder
 * type may carry the recipient's OWN Journey/Step text (owner-content) — that is their own data on their
 * own device, matching the shipped reminder behaviour.
 */
import i18n from '../../i18n';
import { addressContext, type AddressForm } from '../../i18n/addressForm';
import type { CommunicationStyleId } from '../coach/communicationStyles';
import { NOTIFICATION_TYPES, type NotificationParamsByType, type NotificationType } from './notificationTypes';

/** The i18n namespace all notification copy lives in. */
const NS = 'notify';

/** A built notification's user-facing strings. */
export interface NotificationContent {
  title: string;
  body: string;
}

/**
 * The resolution context for building copy. `addressForm` is the user's grammatical form of address
 * (D31); `styleId` is the future communication tone (D40) — accepted now, not yet applied.
 */
export interface NotificationBuildContext {
  addressForm: AddressForm;
  styleId?: CommunicationStyleId;
}

/**
 * TONE SEAM (D40). The unified communication style will one day select toned phrasing; this maps a
 * style to an i18n key suffix. No toned variants exist yet, so EVERY style resolves to the base copy.
 * When the tone layer lands, add cases here (e.g. `case 'spark': return '_spark'`) and the matching
 * variant keys to the `notify` namespace. Keeping the seam here means the future slice touches copy,
 * not control flow.
 */
function toneKeySuffix(styleId: CommunicationStyleId | undefined): string {
  switch (styleId) {
    default:
      return '';
  }
}

/**
 * Build the `{ title, body }` for a notification. Deterministic and framework-free.
 *
 * - Resolves the type's i18n keys in the active language, applying the form-of-address context (D31).
 * - `reminder` is owner-content: it passes through the recipient's own Journey/Step text when present,
 *   falling back to a gentle localized nudge when absent (so a reminder is never blank).
 * - Social types interpolate only the person's display `name`; a missing/blank name degrades to a
 *   localized generic ("someone") rather than leaking a raw `{{name}}` placeholder onto the lock screen.
 */
export function buildNotificationContent<T extends NotificationType>(
  type: T,
  params: NotificationParamsByType[T],
  ctx: NotificationBuildContext,
): NotificationContent {
  const context = addressContext(ctx.addressForm);
  const tone = toneKeySuffix(ctx.styleId);

  if (type === 'reminder') {
    const p = params as NotificationParamsByType['reminder'];
    return {
      title: p.journeyTitle?.trim() || i18n.t(`reminder.title${tone}`, { ns: NS, context }),
      body: p.stepTitle?.trim() || i18n.t(`reminder.body${tone}`, { ns: NS, context }),
    };
  }

  const spec = NOTIFICATION_TYPES[type];
  const name = (params as { name?: string }).name?.trim() || i18n.t('someone', { ns: NS });
  const options = { ns: NS, context, name };
  return {
    title: i18n.t(`${spec.keyGroup}.title${tone}`, options),
    body: i18n.t(`${spec.keyGroup}.body${tone}`, options),
  };
}
