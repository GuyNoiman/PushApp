/**
 * slots — how a Journey Library template becomes a Step in the user's OWN words.
 *
 * THE DEFECT THIS EXISTS TO FIX: the user asked to *drink a protein shake daily* and received Steps
 * about walking at a comfortable pace and eating meals at regular times. Their words were used to
 * pick a DOMAIN and then thrown away; every Step after that came from a table written in advance.
 * The partner's own QA rule is that if you can swap the user's name and the Journey barely changes
 * it is too generic — ours was identical for every user in a domain.
 *
 * THE FIX, in one sentence: the library supplies the SCAFFOLD, the user supplies the CONTENT.
 * A template is a sentence with a hole in it (`Get everything {ACTION} needs`), and the hole is
 * filled with what the user actually said. Two people with the same domain and the same approach
 * get genuinely different Steps, deterministically, with no model call and no cost.
 *
 * TRANSLATION ORDER MATTERS, and it is the reason a template is stored with the slot still in it:
 * templates are authored in English (the experts' language — founder decision 2026-08-18) and
 * translated ONCE per language, cached; the user's own words are inserted AFTER that and are never
 * translated. Someone writing in Hebrew keeps their Hebrew inside an English-authored, Hebrew-
 * rendered frame. Filling first and translating after would put the user's words through a
 * translator — which is exactly how "שייק חלבון" becomes "protein shake" and stops being theirs.
 *
 * SECURITY-PRIVACY G1: a filled title contains the user's raw goal text. It is ON-DEVICE-ONLY —
 * same invariant as `GoalInput.title` itself. Only the template ID (never the filled string) may
 * ever cross into an event, a summary or any sync path.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports.
 */

/** The slot vocabulary. Deliberately tiny: one hole, filled with what the user asked for. */
export const ACTION_SLOT = '{ACTION}' as const;

/** The values a template's slots are filled from. */
export interface TemplateSlots {
  /**
   * The user's goal in their own words, VERBATIM and in whatever language they wrote it — the
   * Journey title. Never translated, never normalized, never title-cased: the whole point is that
   * the user recognises their own sentence.
   */
  action: string;
}

/**
 * Fill a template's slots. Every occurrence of {@link ACTION_SLOT} is replaced; a template with no
 * slot comes back unchanged (some support Steps are genuinely generic and that is fine).
 *
 * An EMPTY action is treated as no action rather than blanking the sentence: the template is
 * returned with its slot intact so the defect is visible in QA instead of shipping a Step that
 * reads "Get everything  needs". A Journey cannot be created without a title, so this is a
 * belt-and-braces path, not an expected one.
 */
export function fillSlots(template: string, slots: TemplateSlots): string {
  const action = slots.action.trim();
  if (!action) return template;
  return template.split(ACTION_SLOT).join(action);
}
