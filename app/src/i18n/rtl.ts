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

/**
 * The `textAlign` that means "the start of the line" in the active direction.
 *
 * React Native already mirrors an EXPLICIT 'left'/'right' whenever the node's
 * resolved layout direction is RTL, so 'left' reads as start and 'right' as end.
 * Two consequences, both learned the hard way on a real device:
 *   · `isRTL() ? 'right' : 'left'` flips TWICE and lands back on the wrong side.
 *   · Leaving `textAlign` unset is not neutral either — iOS then falls back to
 *     *natural* alignment, which resolves against the app BUNDLE's localization
 *     (English, since we ship no Hebrew bundle localization) and pins every line
 *     to the left even after the layout has flipped. That was the single cause
 *     behind "the Settings tab didn't become RTL".
 * So: always set an alignment, and use this constant to mean "start".
 */
export const START_TEXT_ALIGN = 'left' as const;

/**
 * The base writing direction for the active layout. Setting it pins the bidi
 * paragraph level, which is what keeps a MIXED string in reading order: Hebrew
 * copy with a Latin word inside it ("איך תרצו ש-PushApp ידבר אליכם?") reorders
 * into nonsense at an LTR paragraph level.
 */
export function writingDirection(): 'rtl' | 'ltr' {
  return isRTL() ? 'rtl' : 'ltr';
}

/** FIRST STRONG ISOLATE … POP DIRECTIONAL ISOLATE (Unicode bidi). */
const FSI = '⁨';
const PDI = '⁩';

/**
 * Isolate a run of text so the surrounding paragraph cannot reorder it — and it
 * cannot reorder the paragraph. Use it for anything whose script may differ from
 * the UI language (a Latin `@username` inside Hebrew) and for numeric
 * expressions whose parts must stay in their own order ("25 / 100", "10:30"):
 * without an isolate the neutral separator adopts the RTL paragraph level and
 * the two numbers swap places. Isolating never REORDERS the run, it only stops
 * it leaking — which is why it is the right tool here rather than a manual flip.
 */
export function isolate(value: string | number): string {
  return `${FSI}${value}${PDI}`;
}
