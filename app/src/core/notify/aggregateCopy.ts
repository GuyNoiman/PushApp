/**
 * aggregateCopy — the words of a low-frequency ADAPTIVE AGGREGATE notification
 * (Smart_Notification_Timing_PRD §3): one send that summarizes the pending Steps across several
 * Journeys and opens Home / Today's Focus.
 *
 * WHY THE TYPE AND THE BUILDER LIVE APART FROM THE SCHEDULER: the CommunicationScheduler is a pure,
 * i18n-free timing algorithm and must stay that way (Engineering Bible §19), so it is HANDED its
 * copy rather than building it — exactly like {@link ./reminderCopy ReminderCopyBuilder}. The
 * composition root injects the real builder below; with none injected the scheduler plans no
 * aggregate at all and every smart rule keeps firing on its own, which is precisely the behaviour
 * that shipped before this feature existed.
 *
 * PRIVACY: mirrors the reminder builder — the aggregate is described by COUNTS and Journey titles
 * the user wrote themselves, never Step titles (PRD §6 Q3: no Step names on the lock screen).
 *
 * Impure only in that it reads the two currently-applied module preferences and the active i18n
 * language; given those, it is deterministic. No I/O, no React, no vendor SDKs.
 */
import { getCommunicationProfile } from '../communication/communicationProfile';
import { getAddressForm } from '../../i18n/addressForm';
import { buildNotificationContent } from './notificationContent';

/** What an aggregate covers: how many Journeys, and how many actionable pending Steps in total. */
export interface AggregateCopyInput {
  /** The Journeys included in this send, in plan order. */
  journeys: { journeyId: string; journeyTitle: string }[];
  /** Total actionable pending Steps across those Journeys — a count, never a title. */
  pendingStepCount: number;
}

/**
 * Build the copy for one adaptive aggregate, or `null` when it cannot be built — in which case the
 * caller sends nothing rather than something blank.
 */
export type AggregateCopyBuilder = (
  input: AggregateCopyInput,
) => { title: string; body: string } | null;

/**
 * The real builder: current style + form of address + language, applied to the shared content
 * service.
 *
 * Returns `null` — meaning "send nothing" — when the aggregate would have no Journey to name. An
 * aggregate with an empty list is not a quieter notification, it is a meaningless one, and unlike a
 * per-Journey reminder there is no baked copy behind it to fall back to.
 */
export const buildAggregateCopy: AggregateCopyBuilder = ({ journeys, pendingStepCount }) => {
  const titles = journeys.map((j) => j.journeyTitle?.trim()).filter((t): t is string => !!t);
  if (titles.length === 0) return null;

  return buildNotificationContent(
    'aggregate',
    { journeyTitles: titles, journeyCount: titles.length, pendingStepCount },
    { addressForm: getAddressForm(), styleId: getCommunicationProfile() },
  );
};
