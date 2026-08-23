/**
 * The rooms' colours: every room has one, every tool inherits its room's, and no two rooms that hold
 * tools wear the same accent.
 */
import { TOOL_CATALOG, TOOL_CATEGORY_IDS, toolsInCategory } from '../catalog';
import { everyRoomHasPalette, paletteOfRoom, paletteOfTool, ROOM_PALETTE } from '../rooms';

describe('every room', () => {
  it('has a palette — a room added without one fails here', () => {
    expect(everyRoomHasPalette()).toBe(true);
    expect(Object.keys(ROOM_PALETTE).sort()).toEqual([...TOOL_CATEGORY_IDS].sort());
  });

  it('pairs its accent with the matching tint', () => {
    for (const id of TOOL_CATEGORY_IDS) {
      const { accent, tint } = paletteOfRoom(id);
      expect(tint).toBe(`${accent}Tint`);
    }
  });

  it('wears an accent no other room wears', () => {
    // Colour is wayfinding: two rooms sharing a hue is two rooms a person cannot tell apart. Since
    // the founder chose the eighth hue (clay, 2026-08-23) this holds for all eight, including the
    // two that are still empty and shown as "coming soon".
    const accents = TOOL_CATEGORY_IDS.map((id) => paletteOfRoom(id).accent);
    expect(new Set(accents).size).toBe(accents.length);
  });
});

describe('every tool', () => {
  it('wears its room’s colour, never one of its own', () => {
    for (const tool of TOOL_CATALOG) {
      expect(paletteOfTool(tool.key)).toEqual(paletteOfRoom(tool.category));
    }
  });

  it('in the same room wears the same colour', () => {
    for (const id of TOOL_CATEGORY_IDS) {
      const palettes = toolsInCategory(id).map((tool) => paletteOfTool(tool.key).accent);
      expect(new Set(palettes).size).toBeLessThanOrEqual(1);
    }
  });

  it('falls back to the app accent for a key the catalogue no longer knows', () => {
    expect(paletteOfTool('a-tool-from-an-older-build')).toEqual({ accent: 'teal', tint: 'tealTint' });
  });
});
