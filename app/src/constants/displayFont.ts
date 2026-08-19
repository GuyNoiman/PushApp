/**
 * displayFont — WHICH display face this app is speaking in right now, per language.
 *
 * THE DECISION (founder, 2026-08-19): *"I have no problem with different fonts for English and
 * Hebrew. The English display is the one that matters most to me, and I do not want it to suffer
 * because of what Hebrew supports. Split them, and pick the best of each."*
 *
 * So there is no compromise face here. English gets **Fraunces** — a warm old-style serif with real
 * character that holds up from a 16px card title to a 30px statement. Hebrew gets **Frank Ruhl
 * Libre**, the Hebrew serif, whose letterforms were drawn as Hebrew rather than derived from a Latin
 * design. Neither is bent to accommodate the other, which is the whole point of splitting them.
 *
 * WHY IT IS RESOLVED AT RENDER AND NOT AT IMPORT: the app can change language at runtime, and a
 * family captured in a module constant would keep the previous language's face until the next
 * reload. Reading it per render costs nothing and cannot go stale.
 *
 * WEIGHTS DO NOT TRANSLATE ACROSS FACES — Fraunces runs visually heavier than Frank Ruhl Libre at
 * the same nominal weight, so the pairs below are matched by APPEARANCE, not by number: Fraunces 500
 * sits beside Frank Ruhl 500, and the emphatic step is Fraunces 600 beside Frank Ruhl 700.
 *
 * Pure TS apart from the framework-free i18next instance — no React, no clock reads.
 */
// The i18next SINGLETON, not our own `@/i18n` module. Importing the module would pull the whole
// resource bundle and its `react-i18next` wiring into every component that renders a heading —
// which is both unnecessary at this level and enough to break any test that stubs `react-i18next`.
// The singleton is the same object our i18n module configures, so the language read here is the
// applied one either way.
import i18next from 'i18next';

/** The two weights the display voice uses: its normal one, and the emphatic one. */
export type DisplayWeight = 'regular' | 'strong';

const HEBREW = {
  regular: 'FrankRuhlLibre_500Medium',
  strong: 'FrankRuhlLibre_700Bold',
} as const;

const LATIN = {
  regular: 'Fraunces_500Medium',
  strong: 'Fraunces_600SemiBold',
} as const;

/** True when the app is currently speaking a language written in Hebrew script. */
function isHebrew(): boolean {
  return (i18next.language ?? '').toLowerCase().startsWith('he');
}

/**
 * The display family for the ACTIVE language. Every heading, card title and statement resolves
 * through here, so adding a third script means adding a row above and nothing else.
 */
export function displayFont(weight: DisplayWeight = 'regular'): string {
  return (isHebrew() ? HEBREW : LATIN)[weight];
}

/**
 * Optical correction for the display face in use — applied to FONT SIZE ONLY, never to line height.
 *
 * Two different faces at the same px look like two different sizes: Fraunces has a large x-height
 * and reads bigger than Frank Ruhl Libre, so Hebrew is given back the presence the Latin face takes
 * for free. That is the optical half.
 *
 * THE LAYOUT HALF IS THE RULE THIS FUNCTION EXISTS TO PROTECT (founder, 2026-08-19): *"since the
 * font differs between the languages, make sure they occupy the same space on screen — sometimes
 * that means one size for one and another size for the other."* Optical parity must never turn into
 * layout drift, so every display role declares an EXPLICIT `lineHeight` that does not go through
 * this multiplier. A line of a heading is then exactly as tall in Hebrew as in English, every card
 * below it starts at the same y, and a screenshot of the two languages can be laid on top of each
 * other. Scale the size; never the box.
 */
export function displayScale(): number {
  return isHebrew() ? 1.06 : 1;
}
