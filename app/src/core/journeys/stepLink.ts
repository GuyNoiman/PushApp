/**
 * stepLink — the ONE reading of {@link Step.appLink}: "does this Step name a screen inside the app,
 * and is that name safe to hand to the router?"
 *
 * WHY IT IS A FILE AND NOT AN `if`. The rule arrived with the "Getting to know PushApp" Journey and
 * lived inside Home's `openStep`, which meant every OTHER surface that shows the same Step — the
 * Journey detail screen first among them — silently didn't have it. A rule written three times is a
 * rule that will be right in two places after the next change, so the reading lives here and the
 * surfaces call it.
 *
 * WHY IT VALIDATES. A Step's `appLink` is documented as "an INTERNAL expo-router path and nothing
 * else: never an external URL, never a deep link from outside" ({@link Step.appLink}), and today the
 * only writer is {@link INTRO_JOURNEY_LINKS}, which we control. But Steps are also authored by the
 * library and, one day, by the coach — so the guarantee is enforced here rather than assumed. A
 * value that is not an in-app path is treated as NO link at all: the Step falls back to behaving
 * like every other Step, which is always a safe place to land.
 *
 * Pure, framework-free (Engineering Bible §19) — it decides WHAT the destination is; `useStepLink`
 * is the only thing that goes there.
 */

/** The Step-shaped input this needs — deliberately structural, so callers can pass a Step, a
 *  {@link TodayStep}'s `step`, or anything else that carries the field. */
export interface StepWithLink {
  appLink?: string;
}

/**
 * The in-app destination this Step names, or `undefined` when it names none — which is the ordinary
 * case and never an error (the intro Journey's links are POSITIONAL, so a Step past the end of the
 * list is deliberately linkless).
 *
 * Accepted: an absolute in-app path (`/settings/profile`, `/tools`). Rejected, as if absent:
 *  - anything with a scheme (`https://…`, `mailto:`, `javascript:`) — an external destination
 *    reached from a Step row is a thing this product does not do;
 *  - a protocol-relative `//host` — an absolute URL wearing a path's clothes;
 *  - a relative path, which resolves against whichever screen happened to be on top and so means a
 *    different place from Home than from the Journey detail screen;
 *  - a backslash, which some routers and hosts fold into `/`.
 */
export function stepLinkOf(step: StepWithLink | undefined): string | undefined {
  const link = step?.appLink?.trim();
  if (!link) return undefined;
  if (!link.startsWith('/')) return undefined;
  if (link.startsWith('//')) return undefined;
  if (link.includes('\\')) return undefined;
  return link;
}

/** Whether a plain tap on this Step should GO somewhere instead of asking how it went. */
export function stepOpensScreen(step: StepWithLink | undefined): boolean {
  return stepLinkOf(step) !== undefined;
}
