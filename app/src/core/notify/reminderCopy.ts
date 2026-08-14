/**
 * reminderCopy — the ONE impure adapter that turns a Journey into reminder copy in the user's current
 * language, form of address (D31) and COMMUNICATION STYLE (D40, Communication_Style_Profile_PRD AC#4).
 *
 * WHY A SEPARATE FILE: the scheduler that plans reminders is a pure, i18n-free timing algorithm and must
 * stay that way (Engineering Bible §19). So it never builds copy itself — it is handed a
 * {@link ReminderCopyBuilder} and asks it at reconcile time, falling back to the copy baked onto the
 * rule when the builder returns `null`. Resolving here (not at rule-creation time) is what PRD §10/§11
 * ask for: copy is resolved at send/reconciliation time, so a language, form-of-address or style change
 * applies to reminders that were already scheduled.
 *
 * The exported TYPE is a shared contract: it is the seam both this build and the queued Smart
 * Notification Timing build plug into, so the scheduler's signature is agreed in exactly one place.
 *
 * PRIVACY: this deliberately does NOT pass `stepTitle` to the content service (PRD §6 Q3: do not expose
 * Step names on the lock screen). The Journey title stays — it is the user's own data on their own
 * device and it is what the shipped reminder already showed. Net effect: strictly less exposed than
 * today, because the Step title stops reaching the lock screen.
 *
 * Impure only in that it reads the two currently-applied module preferences and the active i18n
 * language; given those, it is deterministic. No I/O, no React, no vendor SDKs.
 */
import { getCommunicationProfile } from '../communication/communicationProfile';
import { getAddressForm } from '../../i18n/addressForm';
import { buildNotificationContent } from './notificationContent';

/**
 * Build the copy for one Journey's reminder, or `null` when it cannot be built (no usable Journey
 * title) so the caller keeps whatever copy it already has rather than sending something blank.
 *
 * `journeyId` is part of the contract even though the default builder does not need it: it is what a
 * per-Journey copy override (Smart Notification Timing) resolves on.
 */
export type ReminderCopyBuilder = (
  input: { journeyId: string; journeyTitle: string },
) => { title: string; body: string } | null;

/**
 * The real builder: current style + form of address + language, applied to the shared content service.
 * This is the notification content service's first live caller.
 */
export const buildReminderCopy: ReminderCopyBuilder = ({ journeyTitle }) => {
  const title = journeyTitle?.trim();
  // No Journey title → nothing to personalise; the caller falls back to its baked copy.
  if (!title) return null;

  return buildNotificationContent(
    'reminder',
    { journeyTitle: title },
    { addressForm: getAddressForm(), styleId: getCommunicationProfile() },
  );
};
