/**
 * useSupportCircleImpact — the REAL Support-Circle consequence of canceling one Journey (Journey
 * Abandonment PRD §8.4.4): how many people currently see it, and how many invitations are still
 * waiting for an answer and will be withdrawn.
 *
 * Honesty first, like `loadUnfriendImpact` behind the remove-friend sheet: the numbers come from an
 * actual `listJourneyAllies` read, and there is exactly ONE way to say "I don't know" — `null`. It
 * is returned while the read is in flight, when the read fails (offline, server error), and when the
 * social pillar is off. A caller renders NOTHING for `null`; a fabricated or silently-zeroed count
 * in front of a destructive action is the one outcome this hook exists to prevent.
 *
 * Deliberately DIFFERENT from the remove-friend sheet in what it may block: there the counts gate
 * the destructive button, because the impact IS the subject. Canceling a Journey is a purely local
 * transition that must complete offline (PRD §11), and the Circle effect is a consequence of it — so
 * a failed read costs the user a sentence, never the action.
 *
 * `enabled` scopes the read to the moment it is needed (the confirmation being open), so opening a
 * Journey never talks to the network on its own.
 */
import { useEffect, useState } from 'react';

import { useSocial } from '@/state/SocialProvider';

export interface SupportCircleImpact {
  /** People who have ACCEPTED and see this Journey today; they stop seeing it after the cancel. */
  accepted: number;
  /** Invitations still awaiting an answer; the cancel withdraws them (`closeJourneyInvites`). */
  pending: number;
}

/**
 * @param journeyId the Journey the confirmation is about; a missing id reads nothing.
 * @param enabled read only while this is true (the sheet is open).
 * @returns the real counts, or `null` whenever they are unknown — loading, failed, or pillar off.
 */
export function useSupportCircleImpact(
  journeyId: string | undefined,
  enabled: boolean,
): SupportCircleImpact | null {
  const social = useSocial();
  // Depend on the STABLE pieces of the context, never on the context object: its value is rebuilt on
  // every provider render, so an effect keyed on it would refire (and re-fetch) endlessly.
  const { enabled: socialEnabled, listJourneyAllies } = social;
  const [impact, setImpact] = useState<SupportCircleImpact | null>(null);

  useEffect(() => {
    // Every start is from "unknown", so a previous Journey's counts can never linger under a new one.
    setImpact(null);
    if (!enabled || !socialEnabled || !journeyId) return;

    let alive = true;
    void listJourneyAllies(journeyId)
      .then((members) => {
        if (!alive) return;
        setImpact({
          accepted: members.filter((m) => m.status === 'accepted').length,
          pending: members.filter((m) => m.status === 'requested').length,
        });
      })
      // Offline or refused: stay silent. The provider already surfaced the error, and the cancel
      // itself is local and must not be held up by it.
      .catch(() => {
        if (alive) setImpact(null);
      });

    return () => {
      alive = false;
    };
  }, [enabled, socialEnabled, journeyId, listJourneyAllies]);

  return impact;
}
