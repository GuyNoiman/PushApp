/**
 * The rooms' colours — one accent per room, and the reason a tool's opening screen is the colour it
 * is.
 *
 * THE RULE (the founder's shared UX rules, README §5.1, and his 2026-08-23 instruction that each
 * room carries its own colour): colour says WHICH ROOM you are in. It never says how well you did,
 * whether something is finished, urgent, correct or wrong. A green tool is not a passed tool, an
 * amber one is not a warning and a coral one is not a danger.
 *
 * WHY IT MOVED OUT OF THE TOOL AND INTO THE ROOM. Until today each tool named its own family, which
 * meant two tools in the same room could drift apart and a tool moved between rooms kept the old
 * colour. A room is the thing a person navigates; the colour belongs to it, and every tool inside
 * inherits it. Adding a tool now involves no colour decision at all.
 *
 * WHY THEME ROLES RATHER THAN HEX. `constants/theme.ts` authors light and dark separately (dark is
 * authored, never a mechanical inversion). This module names the ROLE; the theme picks the colour.
 * That is also why it holds no vendor import: an engine or a test can ask which accent a room wears
 * without pulling the UI in.
 *
 * Pure TypeScript — no React, no theme import, no i18n.
 */
import { TOOL_CATEGORY_IDS, findTool, type ToolCategoryId } from './catalog';

export interface RoomPalette {
  /** The strong tone: headings, the Start action, a selected border. */
  accent: 'gold' | 'blue' | 'teal' | 'success' | 'coral' | 'pink' | 'purple' | 'clay';
  /** The quiet fill behind selected chips, tracks and result cards. */
  tint:
    | 'goldTint'
    | 'blueTint'
    | 'tealTint'
    | 'successTint'
    | 'coralTint'
    | 'pinkTint'
    | 'purpleTint'
    | 'clayTint';
}

/**
 * Six of these eight come straight from the founder's own colour table. The other two he chose on
 * 2026-08-23 from rendered swatches: `patterns` takes the palette's one unused hue, and `body` takes
 * `clay` — a new token, added because eight rooms needed eight distinct hues and the palette had
 * seven. Both rooms are empty today; the colour is decided so the first tool that lands in either
 * one does not arrive with a colour question attached.
 */
export const ROOM_PALETTE: Readonly<Record<ToolCategoryId, RoomPalette>> = {
  /** להכיר את עצמי — warm amber, explicitly not a warning. */
  selfKnowledge: { accent: 'gold', tint: 'goldTint' },
  /** לבחור כיוון — calm blue, and deliberately no green/red sides in a decision. */
  direction: { accent: 'blue', tint: 'blueTint' },
  /** לעבור לפעולה — teal, the app's forward tone. */
  action: { accent: 'teal', tint: 'tealTint' },
  /** תיעוד והתבוננות — green, as evidence rather than as completion. */
  records: { accent: 'success', tint: 'successTint' },
  /** עזרה ברגע הזה — soft coral, explicitly not danger. */
  immediate: { accent: 'coral', tint: 'coralTint' },
  /** שינוי דפוסים ודחפים — rose. Empty room; the colour is provisional. */
  patterns: { accent: 'pink', tint: 'pinkTint' },
  /** קשרים ותמיכה — purple, the social tone. */
  support: { accent: 'purple', tint: 'purpleTint' },
  /** גוף ואנרגיה — clay, a warm red-brown that is neither the coral of care nor a warning. */
  body: { accent: 'clay', tint: 'clayTint' },
};

/** The palette a room wears. */
export function paletteOfRoom(room: ToolCategoryId): RoomPalette {
  return ROOM_PALETTE[room];
}

/**
 * The palette a TOOL wears — its room's. Falls back to the app accent for a key the catalogue does
 * not know, which is what a stored key from an older build looks like.
 */
export function paletteOfTool(toolKey: string): RoomPalette {
  const tool = findTool(toolKey);
  return tool ? ROOM_PALETTE[tool.category] : { accent: 'teal', tint: 'tealTint' };
}

/** Every room has a palette — asserted here so a new room cannot be added without one. */
export function everyRoomHasPalette(): boolean {
  return TOOL_CATEGORY_IDS.every((id) => ROOM_PALETTE[id] !== undefined);
}
