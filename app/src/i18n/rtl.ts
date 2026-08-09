/**
 * rtl — direction helpers for right-to-left languages (Hebrew today; Arabic,
 * Persian, Urdu when they land). `I18nManager.isRTL` is the single source of the
 * *currently applied* direction (React Native persists it natively across
 * launches); `isRTLLocale` answers the direction a language *wants* so callers
 * can detect a flip before forcing it.
 */
import { I18nManager } from 'react-native';

/** Base codes whose scripts read right-to-left. */
const RTL_LANGUAGES: readonly string[] = ['he', 'ar', 'fa', 'ur'];

/** Does this language read right-to-left? (independent of what's applied) */
export function isRTLLocale(code: string): boolean {
  return RTL_LANGUAGES.includes(code);
}

/** Is the app *currently* laid out right-to-left? */
export function isRTL(): boolean {
  return I18nManager.isRTL;
}

/**
 * The "forward" chevron for the active direction: a forward affordance points
 * left under RTL, so return the mirrored glyph rather than mirroring at render.
 */
export function chevronName(): 'chevron-forward' | 'chevron-back' {
  return isRTL() ? 'chevron-back' : 'chevron-forward';
}

/**
 * Flip a horizontal translate for the active direction — a positive `x` (move
 * right / "forward" in LTR) becomes leftward under RTL so animations read the
 * same way in both directions.
 */
export function directionalTranslateX(x: number): number {
  return isRTL() ? -x : x;
}
