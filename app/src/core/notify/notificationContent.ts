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

/**
 * How many Journey titles an aggregate may NAME before the rest become a count. Three is what fits
 * a lock-screen banner without being cut mid-word; past that, "and 2 more" says the same thing and
 * stays readable. Config, not a magic number in the sentence.
 */
const MAX_NAMED_JOURNEYS = 3;

/**
 * Join an aggregate's Journey titles into one localized fragment, naming at most
 * {@link MAX_NAMED_JOURNEYS} and summarizing the remainder as a count. Blank titles are dropped
 * rather than rendered as an empty slot in the list.
 */
function joinJourneyTitles(titles: readonly string[]): string {
  const named = titles.map((t) => t.trim()).filter(Boolean);
  const head = named.slice(0, MAX_NAMED_JOURNEYS);
  const rest = named.length - head.length;
  const list = head.join(i18n.t('listSeparator', { ns: NS }));
  return rest > 0 ? i18n.t('andMore', { ns: NS, list, rest }) : list;
}

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
 * copy (see {@link tonedKeys}), so a missing variant is always safe — never a raw key. A type the
 * catalogue marks `neverToned` opts out of styling completely.
 */
function toneKeySuffix(type: NotificationType, styleId: CommunicationProfileId | undefined): string {
  // A never-toned type (see NotificationTypeSpec.neverToned) ignores the style entirely, so no
  // toned variant can ever be selected for it — even if one is added to the i18n file by mistake.
  if (NOTIFICATION_TYPES[type].neverToned) return '';
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
 * - `reminder` is owner-content: the recipient's own Journey title is INTERPOLATED INTO the toned copy
 *   (`reminder.titleFor`), never returned raw. A raw passthrough silently defeats toning: every real
 *   reminder carries a Journey title, so returning it verbatim would short-circuit the style variant
 *   100% of the time and the user's chosen style would change nothing they can see (PRD AC#4). With no
 *   Journey title we fall back to the toned generic nudge, so a reminder is never blank.
 * - The `stepTitle` passthrough for the body is kept for back-compat with the shipped reminder; the
 *   {@link ./reminderCopy} adapter deliberately does not pass one (Step names stay off the lock screen).
 * - Social types interpolate only the person's display `name`; a missing/blank name degrades to a
 *   localized generic ("someone") rather than leaking a raw `{{name}}` placeholder onto the lock screen.
 */
export function buildNotificationContent<T extends NotificationType>(
  type: T,
  params: NotificationParamsByType[T],
  ctx: NotificationBuildContext,
): NotificationContent {
  const context = addressContext(ctx.addressForm);
  const tone = toneKeySuffix(type, ctx.styleId);

  if (type === 'reminder') {
    const p = params as NotificationParamsByType['reminder'];
    const journeyTitle = p.journeyTitle?.trim();
    return {
      title: journeyTitle
        ? i18n.t(tonedKeys('reminder.titleFor', tone), { ns: NS, context, journeyTitle })
        : i18n.t(tonedKeys('reminder.title', tone), { ns: NS, context }),
      body: p.stepTitle?.trim() || i18n.t(tonedKeys('reminder.body', tone), { ns: NS, context }),
    };
  }

  if (type === 'aggregate') {
    const p = params as NotificationParamsByType['aggregate'];
    const journeys = joinJourneyTitles(p.journeyTitles);
    const options = {
      ns: NS,
      context,
      journeys,
      journeyCount: p.journeyCount,
      pendingStepCount: p.pendingStepCount,
    };
    // ONE Journey reads as a sentence about that Journey; several read as a list. They are separate
    // keys rather than a plural form because the two sentences differ in more than a number, and
    // because stacking i18next's plural suffix on top of the tone suffix AND the form-of-address
    // context would multiply this block into dozens of keys nobody would keep in step.
    const group = p.journeyCount <= 1 ? 'aggregate.one' : 'aggregate.many';
    return {
      title: i18n.t(tonedKeys(`${group}.title`, tone), options),
      body: i18n.t(tonedKeys(`${group}.body`, tone), options),
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
