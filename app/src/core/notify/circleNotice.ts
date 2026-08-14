/**
 * circleNotice — the notice the Support Circle gets when a Journey they support ends (founder
 * decision, 2026-08-14: yes, the Circle is told when the owner cancels a Journey).
 *
 * WHAT THIS IS: the pure construction of that notice — who receives it, which catalogued type it
 * is, and the ONE value it interpolates. It builds no copy. Copy is built by
 * {@link ./notificationContent} on the RECEIVING device, so it lands in the reader's own language
 * and form of address (D31) — which is also why an unknown owner name is left EMPTY here rather
 * than filled with an English "Someone": the content service localizes that fallback itself.
 *
 * LOCK-SAFETY, structurally (SECURITY-PRIVACY G1, Journey_Support_Circle_PRD §7): the notice carries
 * a person's display name and NOTHING else. It has no field for a Journey id, title, Step, or reason
 * — not by convention, but because {@link CircleNotice} has nowhere to put one and
 * `NotificationParamsByType['journey_closed']` is `{ name: string }`. So the notice can say that
 * someone stopped a Journey; it can never say WHICH Journey, on a lock screen or anywhere else.
 *
 * TONE: `journey_closed` is marked `neverToned` in the catalogue, so no communication style can ever
 * put a warm or energizing spin on another person's setback. The notice is neutral and factual, and
 * never framed as a failure.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { AllyMember, SocialProfile } from '../social/SocialGateway';
import type { NotificationParamsByType } from './notificationTypes';

/** A ready-to-send Support-Circle notice: a catalogued type, its recipients, and its params. */
export interface CircleNotice {
  type: 'journey_closed';
  /** Profile ids of the ACCEPTED members to notify. Never empty (a notice with nobody isn't built). */
  recipientIds: string[];
  /** The only interpolated value — the owner's display name, or '' when it isn't known. */
  params: NotificationParamsByType['journey_closed'];
}

/**
 * A person's display name: their Buddy name if they set one, else their @handle. Mirrors the same
 * rule the people surfaces use (`components/friends/avatar.ts`), restated here because this module
 * is framework-free core and must not import from `components`.
 */
function ownerDisplayName(owner: SocialProfile | null | undefined): string {
  if (!owner) return '';
  return owner.buddySummary?.name?.trim() || (owner.handle ? `@${owner.handle}` : '');
}

/**
 * Build the notice for a Journey the owner just stopped, or `null` when there is nobody to tell.
 *
 * Only ACCEPTED members are notified: a still-`requested` invite was never answered, so that person
 * never saw the Journey and has nothing to be told about (their invite is simply withdrawn), and a
 * `declined` one said no. Duplicate rows collapse to one recipient.
 */
export function buildJourneyClosedNotice(
  members: readonly AllyMember[],
  owner: SocialProfile | null | undefined,
): CircleNotice | null {
  const recipientIds = [
    ...new Set(
      members.filter((m) => m.status === 'accepted').map((m) => m.profile.id).filter(Boolean),
    ),
  ];
  if (recipientIds.length === 0) return null;
  return { type: 'journey_closed', recipientIds, params: { name: ownerDisplayName(owner) } };
}

/**
 * How a built notice actually reaches the other devices. There is NO delivery path yet — the
 * Support-Circle backend serves no notifications (the nine social types in the catalogue are all
 * dormant), so the registered sink is null and delivering is a no-op that never throws.
 *
 * This is the single seam that changes when that backend lands: register a sink here and every
 * already-wired call site starts delivering, with no change to the callers or to what the notice may
 * contain.
 */
export type CircleNoticeSink = (notice: CircleNotice) => void | Promise<void>;

let sink: CircleNoticeSink | null = null;

/** Register (or clear, with `null`) the delivery sink. */
export function setCircleNoticeSink(next: CircleNoticeSink | null): void {
  sink = next;
}

/**
 * Hand a notice to the registered sink. Best-effort by design: a notice is a CONSEQUENCE of a local
 * action that has already committed, never a gate on it, so a missing or failing sink is swallowed.
 */
export async function deliverCircleNotice(notice: CircleNotice): Promise<void> {
  if (!sink) return;
  try {
    await sink(notice);
  } catch {
    // Intentionally silent — see above.
  }
}
