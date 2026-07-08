/**
 * Shop catalog — the small set of Buddy cosmetics the user spends Coins on, as
 * DATA (Engineering Bible §3 configuration-before-code). Tuning prices or adding
 * a cosmetic happens here, never inside engine logic. Pure TS — no UI imports.
 *
 * POC guardrail (POC_and_MVP_Scope §1.5): a SHALLOW economy — one currency
 * (Coins; no gems) and a handful of cosmetics. Enough to make the Buddy loop feel
 * alive, not a full game economy. With no art assets yet, a cosmetic is an emoji
 * accessory (worn on the Buddy) or a colour tint (behind the Buddy).
 */

/** How a cosmetic shows on the Buddy: an emoji worn on it, or a background tint. */
export type CosmeticKind = 'accessory' | 'tint';

export interface ShopItem {
  id: string;
  name: string;
  /** Price in Coins. */
  price: number;
  kind: CosmeticKind;
  /** Emoji for an `accessory`; a hex colour for a `tint`. */
  value: string;
}

/** The full cosmetic catalog. Small on purpose (POC guardrail). */
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat_top', name: 'Top Hat', price: 30, kind: 'accessory', value: '🎩' },
  { id: 'scarf', name: 'Cozy Scarf', price: 25, kind: 'accessory', value: '🧣' },
  { id: 'crown', name: 'Golden Crown', price: 60, kind: 'accessory', value: '👑' },
  { id: 'shades', name: 'Cool Shades', price: 20, kind: 'accessory', value: '🕶️' },
  { id: 'tint_cream', name: 'Warm Glow', price: 15, kind: 'tint', value: '#F6E4C1' },
  { id: 'tint_teal', name: 'Teal Haze', price: 15, kind: 'tint', value: '#BFE3DD' },
];

/** Look up a cosmetic by id — used by presentational Buddy surfaces. */
export function resolveCosmetic(id: string | null | undefined): ShopItem | undefined {
  if (!id) return undefined;
  return SHOP_ITEMS.find((item) => item.id === id);
}
