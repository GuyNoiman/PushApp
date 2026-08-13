/**
 * Completion-card PRESENTATION templates (Completion Celebration, I1) — the fixed set of on-brand
 * card variants the user can swipe/browse in the big ceremony, as DATA (Engineering Bible §3,
 * configuration-before-code; PRD §9 "versioned/config-driven completion-card templates"). Pure TS.
 *
 * STRUCTURE ONLY: each variant declares its id, whether it reveals the Journey name, and the id of
 * the `celebration` i18n key that supplies its copy later. No user-facing copy strings live here —
 * they belong in the i18n namespace (a later slice). No sensitive data ever reaches a card variant.
 */

/**
 * The version of this template set. Stamped onto every {@link CompletionCard.templateVersion} so a
 * card minted today can be reconstructed even after the variant list evolves. Bump when the set
 * changes in a way a stored card must be able to reason about.
 */
export const CARD_TEMPLATE_VERSION = 1;

/** One completion-card presentation variant (structural — copy resolves from i18n by {@link copyKeyId}). */
export interface CardTemplateVariant {
  /** Stable id (never reused) — persists the user's chosen variant and keys the i18n copy. */
  id: string;
  /**
   * Whether this variant DISPLAYS the Journey name. Privacy-preserving variants omit it so the card
   * can be shared without revealing what the user is working on (PRD §3, §4 "privacy level").
   */
  revealsJourneyName: boolean;
  /** The `celebration` i18n key id the presentational layer resolves for this variant's copy. */
  copyKeyId: string;
}

/**
 * The fixed variant set. Includes at least one name-revealing and one name-omitting variant so the
 * user can pick their privacy level before sharing (PRD §3). Ids are unique and stable.
 */
export const CARD_TEMPLATE_VARIANTS: CardTemplateVariant[] = [
  { id: 'classic', revealsJourneyName: true, copyKeyId: 'celebration.card.classic' },
  { id: 'milestone', revealsJourneyName: true, copyKeyId: 'celebration.card.milestone' },
  { id: 'private', revealsJourneyName: false, copyKeyId: 'celebration.card.private' },
];

/**
 * The i18n key (WITHIN the `celebration` namespace) for one of a variant's copy fields. `copyKeyId`
 * is namespaced (`celebration.card.<id>`); callers resolve copy via `t('celebration')`, so the
 * namespace prefix is stripped and the field appended — e.g. `card.classic.headline`. This is the
 * SINGLE source of that key so the headline/body lookup can't drift between the card and the share
 * text (both call this; a doubled prefix here would be caught by `cardTemplates` tests).
 */
export function cardCopyKey(variant: CardTemplateVariant, field: 'headline' | 'body'): string {
  return `${variant.copyKeyId.replace(/^celebration\./, '')}.${field}`;
}
