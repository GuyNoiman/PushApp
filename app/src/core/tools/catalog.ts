/**
 * The Tools catalogue — the single, framework-free description of every tool the Tools tab can show.
 *
 * Configuration before code (Engineering Bible §14): a tool is a ROW HERE, not a branch in a screen.
 * Adding one means adding an entry and its copy; the screen, the search, the categories and the
 * counts all follow from this list without being touched.
 *
 * WHAT EACH FIELD IS FOR, because each one is a decision:
 *  · `route` present ⇒ the tool EXISTS and opens. Absent ⇒ it is on the way and says so. There is no
 *    third state and no "disabled" flag — a tool is reachable or it is not.
 *  · `category` is what the tool does FOR you, not what it is made of. It is what makes the tab a
 *    place with rooms rather than a drawer, and it is the founder's own grouping from his design.
 *  · `minutes` is the fact people actually decide on. A name alone asks someone to be curious;
 *    "2 min" lets them choose.
 *
 * The user-facing name and the one-line description live in the `tools` i18n namespace, keyed by
 * `items.<key>` and `blurbs.<key>`, so this file never holds a translatable string.
 *
 * Pure TypeScript — no React, no navigation, no storage.
 */

/** The five rooms, in the order the founder's design shows them. */
export const TOOL_CATEGORY_IDS = ['know', 'reflect', 'calm', 'focus', 'relate'] as const;
export type ToolCategoryId = (typeof TOOL_CATEGORY_IDS)[number];

export interface ToolDefinition {
  /** Stable id, and the i18n key under `items.` / `blurbs.`. Never shown to a user. */
  key: string;
  category: ToolCategoryId;
  /** Ionicons glyph name. Typed loosely here so the catalogue stays free of the vendor's types. */
  icon: string;
  /** The route it opens. ABSENT ⇒ the tool does not exist yet and the UI must not pretend it does. */
  route?: string;
  /** Roughly how long it takes, in minutes. Absent for anything open-ended. */
  minutes?: number;
}

export const TOOL_CATALOG: readonly ToolDefinition[] = [
  { key: 'questionnaire', category: 'know', icon: 'list-outline', route: '/questionnaire', minutes: 6 },
  { key: 'communication', category: 'relate', icon: 'chatbubbles-outline', route: '/settings/communication-style', minutes: 3 },
  { key: 'lifeWheel', category: 'know', icon: 'pie-chart-outline', route: '/tools/life-wheel', minutes: 8 },
  { key: 'valuesClarity', category: 'know', icon: 'compass-outline', route: '/tools/values', minutes: 5 },
  { key: 'bestYear', category: 'reflect', icon: 'sunny-outline', route: '/tools/best-year', minutes: 15 },
  { key: 'reflection', category: 'reflect', icon: 'create-outline', minutes: 10 },
  { key: 'breathe', category: 'calm', icon: 'leaf-outline', minutes: 2 },
  { key: 'direction', category: 'know', icon: 'navigate-outline', route: '/tools/direction', minutes: 10 },
  { key: 'passionMap', category: 'know', icon: 'sparkles-outline', route: '/tools/passion-map', minutes: 7 },
  { key: 'mirror', category: 'relate', icon: 'people-circle-outline', minutes: 10 },
  { key: 'strengths', category: 'know', icon: 'sparkles-outline', minutes: 8 },
  { key: 'timer', category: 'focus', icon: 'timer-outline', minutes: 25 },
  { key: 'kindness', category: 'relate', icon: 'heart-outline', minutes: 5 },
  { key: 'hardDay', category: 'calm', icon: 'medkit-outline', minutes: 4 },
];

/** Whether a tool can actually be opened. The one definition of "live", used everywhere. */
export function isLive(tool: ToolDefinition): boolean {
  return tool.route !== undefined;
}

/** Look one up by key. `undefined` for an unknown key — a stored key can outlive its tool. */
export function findTool(key: string): ToolDefinition | undefined {
  return TOOL_CATALOG.find((tool) => tool.key === key);
}

/** Every tool in a category, in catalogue order. */
export function toolsInCategory(category: ToolCategoryId): ToolDefinition[] {
  return TOOL_CATALOG.filter((tool) => tool.category === category);
}

/**
 * How many tools a category holds. The count is deliberately the WHOLE category, live and coming
 * together, because that is what the category is: browsing it shows both, each labelled honestly.
 */
export function categoryCount(category: ToolCategoryId): number {
  return toolsInCategory(category).length;
}
