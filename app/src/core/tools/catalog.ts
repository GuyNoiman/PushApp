/**
 * The Tools catalogue — the single, framework-free description of every tool the Tools tab can show.
 *
 * Configuration before code (Engineering Bible §14): a tool is a ROW HERE, not a branch in a screen.
 * Adding one means adding an entry and its copy; the screen, the search, the rooms and the counts all
 * follow from this list without being touched.
 *
 * WHAT EACH FIELD IS FOR, because each one is a decision:
 *  · `route` present ⇒ the tool EXISTS and opens. Absent ⇒ it is on the way and says so. There is no
 *    third state and no "disabled" flag — a tool is reachable or it is not.
 *  · `category` is what the tool does FOR you, not what it is made of. It is what makes the tab a
 *    place with rooms rather than a drawer, and the eight rooms are the founder's own (2026-08-23).
 *  · `minutes` is the fact people actually decide on. A name alone asks someone to be curious;
 *    "2 min" lets them choose.
 *
 * THE ROOMS CHANGED ON 2026-08-23, from five to the founder's eight, and the placeholder rows for
 * tools that did not exist were removed at the same time on his instruction. What was removed:
 * `reflection`, `breathe`, `strengths`, `timer`, `kindness`, `hardDay` — six rows with no screen
 * behind them. Two of them (a hard-day tool and an act of kindness) were superseded by A Self-
 * Compassion Moment; the rest are still real intentions and live in their PRDs, which is where an
 * unbuilt tool belongs. Git holds the rows if any of them comes back.
 *
 * The user-facing name and the one-line description live in the `tools` i18n namespace, keyed by
 * `items.<key>` and `blurbs.<key>`, so this file never holds a translatable string.
 *
 * Pure TypeScript — no React, no navigation, no storage.
 */

/**
 * The eight rooms, in the founder's order (2026-08-23). Their names are in the `tools` namespace
 * under `categories.<id>`; the ids here are stable English keys and are never shown to a user.
 */
export const TOOL_CATEGORY_IDS = [
  /** להכיר את עצמי */
  'selfKnowledge',
  /** לבחור כיוון */
  'direction',
  /** לעבור לפעולה */
  'action',
  /** תיעוד והתבוננות */
  'records',
  /** עזרה ברגע הזה */
  'immediate',
  /** שינוי דפוסים ודחפים */
  'patterns',
  /** קשרים ותמיכה */
  'support',
  /** גוף ואנרגיה */
  'body',
] as const;
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
  // ── להכיר את עצמי ────────────────────────────────────────────────────────
  { key: 'questionnaire', category: 'selfKnowledge', icon: 'list-outline', route: '/questionnaire', minutes: 6 },
  { key: 'communication', category: 'selfKnowledge', icon: 'chatbubbles-outline', route: '/settings/communication-style', minutes: 3 },
  { key: 'lifeWheel', category: 'selfKnowledge', icon: 'pie-chart-outline', route: '/tools/life-wheel', minutes: 8 },
  { key: 'passionMap', category: 'selfKnowledge', icon: 'sparkles-outline', route: '/tools/passion-map', minutes: 7 },
  { key: 'currentLoad', category: 'selfKnowledge', icon: 'grid-outline', route: '/tools/current-load', minutes: 8 },
  { key: 'strengthEvidence', category: 'selfKnowledge', icon: 'ribbon-outline', route: '/tools/strength-evidence', minutes: 12 },

  // ── לבחור כיוון ──────────────────────────────────────────────────────────
  { key: 'valuesClarity', category: 'direction', icon: 'compass-outline', route: '/tools/values', minutes: 5 },
  { key: 'bestYear', category: 'direction', icon: 'sunny-outline', route: '/tools/best-year', minutes: 15 },
  { key: 'direction', category: 'direction', icon: 'navigate-outline', route: '/tools/direction', minutes: 10 },
  { key: 'decisionClarity', category: 'direction', icon: 'git-compare-outline', route: '/tools/decision-clarity', minutes: 7 },

  // ── לעבור לפעולה ─────────────────────────────────────────────────────────
  { key: 'obstacle', category: 'action', icon: 'flag-outline', route: '/tools/obstacle-to-action', minutes: 6 },

  // ── תיעוד והתבוננות ──────────────────────────────────────────────────────
  { key: 'gratitude', category: 'records', icon: 'sparkles-outline', route: '/tools/gratitude', minutes: 3 },
  { key: 'whatWorked', category: 'records', icon: 'trending-up-outline', route: '/tools/what-worked', minutes: 4 },

  // ── עזרה ברגע הזה ────────────────────────────────────────────────────────
  { key: 'selfCompassion', category: 'immediate', icon: 'heart-outline', route: '/tools/self-compassion', minutes: 2 },

  // ── קשרים ותמיכה ─────────────────────────────────────────────────────────
  { key: 'mirror', category: 'support', icon: 'people-circle-outline', route: '/tools/mirror', minutes: 10 },
  { key: 'supportMap', category: 'support', icon: 'people-outline', route: '/tools/support-map', minutes: 8 },

  // Two rooms — שינוי דפוסים ודחפים and גוף ואנרגיה — hold nothing yet. They are shown in the tab
  // anyway, labelled "coming soon": a room a person can see is a promise about where this is going.
];

/** Whether a tool can actually be opened. The one definition of "live", used everywhere. */
export function isLive(tool: ToolDefinition): boolean {
  return tool.route !== undefined;
}

/** Look one up by key. `undefined` for an unknown key — a stored key can outlive its tool. */
export function findTool(key: string): ToolDefinition | undefined {
  return TOOL_CATALOG.find((tool) => tool.key === key);
}

/** Every tool in a room, in catalogue order. */
export function toolsInCategory(category: ToolCategoryId): ToolDefinition[] {
  return TOOL_CATALOG.filter((tool) => tool.category === category);
}

/**
 * How many tools a room holds. The count is deliberately the WHOLE room, live and coming together,
 * because that is what the room is: browsing it shows both, each labelled honestly.
 */
export function categoryCount(category: ToolCategoryId): number {
  return toolsInCategory(category).length;
}

/**
 * The rooms that actually hold something.
 *
 * The tab draws ALL eight and labels the empty ones "coming soon" (founder, 2026-08-23), so this is
 * not what the room rail reads. It stays for the places that need real content — search, counts and
 * anything that would otherwise offer somebody a door into an empty room.
 */
export function occupiedCategories(): ToolCategoryId[] {
  return TOOL_CATEGORY_IDS.filter((id) => categoryCount(id) > 0);
}
