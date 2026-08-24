/**
 * Consent: affirmative, versioned, and never nagged for twice.
 *
 * ── WHY "DECLINED" IS A FINAL ANSWER ───────────────────────────────────────────────────────────
 *
 * PRD §8 is explicit: declining must not reduce unrelated functionality, apply pressure, or trigger
 * repeated prompts. So a decline is RECORDED, and {@link needsAsking} returns false for it forever
 * after. The one thing that reopens the question is a material change to what we would keep — which
 * is exactly what {@link ../types COACH_MEMORY_CONSENT_VERSION} moving means, and exactly why the
 * version is stored beside the answer instead of being assumed.
 *
 * ── AND WHY WITHDRAWAL IS NOT THE SAME AS DECLINING ────────────────────────────────────────────
 *
 * They end in the same place — no memory — but they are different facts about a person, and the one
 * that matters operationally is that a withdrawal has summaries to DELETE behind it. Collapsing them
 * into a single boolean would lose that, and the deletion is the whole point of the promise.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import { COACH_MEMORY_CONSENT_VERSION, type CoachMemoryConsent } from './types';

/** May the coach keep anything at all right now? */
export function consentActive(consent: CoachMemoryConsent | undefined): boolean {
  return consent?.state === 'granted' && consent.version === COACH_MEMORY_CONSENT_VERSION;
}

/**
 * Should we ASK?
 *
 * Never asked ⇒ yes. Granted under wording that has since changed materially ⇒ yes, because that
 * grant was to different words. Declined or withdrawn ⇒ no, whatever the version says: somebody who
 * said no does not get asked again by a version bump they never saw.
 */
export function needsAsking(consent: CoachMemoryConsent | undefined): boolean {
  if (!consent) return true;
  return consent.state === 'granted' && consent.version !== COACH_MEMORY_CONSENT_VERSION;
}

/** Record an answer, stamped with the wording and language it was given against. */
export function recordConsent(
  state: CoachMemoryConsent['state'],
  locale: string,
  at: number,
): CoachMemoryConsent {
  return { state, version: COACH_MEMORY_CONSENT_VERSION, locale, at };
}
