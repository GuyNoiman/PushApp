/**
 * notificationContent — the unified notification CONTENT service (D40). Turns a notification type +
 * its params into a localized, gender-aware, tone-ready `{ title, body }`. This is the one place copy
 * for any notification is built, so every trigger (the shipped reminder today; the nine Support-Circle
 * types once their backend lands) reads consistently and honours the same privacy rules.
 *
 * It is PURE and framework-free (CLAUDE.md §6): deterministic, no I/O, no React. It reads copy through
 * the framework-free i18next core (`i18n.t`, never a hook) in the caller's language, applies the user's
 * FORM OF ADDRESS as i18next context (D31), and applies the user's unified COMMUNICATION STYLE
 * (D40, Communication_Style_Profile_PRD) as a toned copy variant, falling back to the base copy when a
 * given type has no toned variant yet.
 *
 * PRIVACY (SECURITY-PRIVACY G1, {@link ./notificationTypes} header): social-type bodies interpolate ONLY
 * a person's display name into a fixed template; they can never carry the owner's private free text,
 * because their param contract ({@link NotificationParamsByType}) exposes no such field. The reminder
 * type may carry the recipient's OWN Journey/Step text (owner-content) — that is their own data on their
 * own device, matching the shipped reminder behaviour.
 */
import i18n from '../../i18n';
import { addressContext, type AddressForm } from '../../i18n/addressForm';
import type { CommunicationProfileId } from '../communication/communicationProfile';
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
 * (D31); `styleId` is the user's unified COMMUNICATION STYLE (D40) — when set, its toned copy variant
 * is preferred, with the base copy as the safe fallback.
 */
export interface NotificationBuildContext {
  addressForm: AddressForm;
  styleId?: CommunicationProfileId;
}

/**
 * TONE SUFFIX (D40, Communication_Style_Profile_PRD §10). Maps the user's communication style to the
 * i18n key suffix that selects its toned variant (e.g. `warm` → `reminder.body_warm`). Adding a style
 * here is a config edit; a type that has no toned variant for the chosen style falls back to its base
 * copy (see {@link tonedKeys}), so a missing variant is always safe — never a raw key.
 */
function toneKeySuffix(styleId: CommunicationProfileId | undefined): string {
  return styleId ? `_${styleId}` : '';
}

/**
 * The ordered key list for one copy slot: the toned variant first, then the base as fallback. i18next
 * uses the first key that resolves, so a type without a toned variant safely degrades to its base copy
 * (PRD §10: every event has all four variants or falls back to the neutral approved variant). When no
 * style is set the two collapse to the same base key — a harmless no-op.
 */
function tonedKeys(baseKey: string, tone: string): [string, string] {
  return [`${baseKey}${tone}`, baseKey];
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
      title: p.journeyTitle?.trim() || i18n.t(tonedKeys('reminder.title', tone), { ns: NS, context }),
      body: p.stepTitle?.trim() || i18n.t(tonedKeys('reminder.body', tone), { ns: NS, context }),
    };
  }

  const spec = NOTIFICATION_TYPES[type];
  const name = (params as { name?: string }).name?.trim() || i18n.t('someone', { ns: NS });
  const options = { ns: NS, context, name };
  return {
    title: i18n.t(tonedKeys(`${spec.keyGroup}.title`, tone), options),
    body: i18n.t(tonedKeys(`${spec.keyGroup}.body`, tone), options),
  };
}
