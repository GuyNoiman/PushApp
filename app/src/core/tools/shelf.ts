/**
 * shelf — the pure arithmetic behind the Tools tab: what you used lately, what you kept, and what
 * the tab should put in front of you right now.
 *
 * All of it is ON-DEVICE-ONLY (G1). Which tools a person opens is a picture of what they are
 * struggling with, and it never leaves the phone: no sync, no analytics, no DomainEvent.
 *
 * Pure TypeScript — no React, no storage, no clock reads of its own (every function that needs the
 * time takes it as an argument, so the tests are not about what hour it is).
 */
import { TOOL_CATALOG, findTool, isLive, type ToolDefinition } from './catalog';

/** When each tool was last opened, keyed by tool key. Epoch millis. */
export type ToolUsage = Readonly<Record<string, number>>;

/** Record an opening. Returns a NEW map — the caller owns persistence. */
export function recordUse(usage: ToolUsage, key: string, now: number): ToolUsage {
  return { ...usage, [key]: now };
}

/**
 * The tools opened most recently, newest first.
 *
 * Keys for tools that no longer exist are skipped rather than dropped from storage: a tool can be
 * renamed or pulled temporarily, and quietly deleting somebody's history because a build changed is
 * worse than carrying a few dead keys.
 */
export function recentlyUsed(usage: ToolUsage, limit = 3): ToolDefinition[] {
  return Object.entries(usage)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => findTool(key))
    .filter((tool): tool is ToolDefinition => tool !== undefined)
    .slice(0, limit);
}

/** The saved tools, in CATALOGUE order — a shelf, not a pile in the order things were starred. */
export function savedTools(saved: readonly string[]): ToolDefinition[] {
  const set = new Set(saved);
  return TOOL_CATALOG.filter((tool) => set.has(tool.key));
}

/** Toggle a tool's saved state. Returns a NEW list. */
export function toggleSaved(saved: readonly string[], key: string): string[] {
  return saved.includes(key) ? saved.filter((k) => k !== key) : [...saved, key];
}

/**
 * Search by NAME, over labels the caller has already resolved into the user's language.
 *
 * The labels come in rather than being looked up here so this stays free of i18n — and so a search
 * in Hebrew matches the Hebrew name rather than the English key behind it.
 */
export function searchTools(
  query: string,
  labelFor: (tool: ToolDefinition) => string,
): ToolDefinition[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) return [...TOOL_CATALOG];
  return TOOL_CATALOG.filter((tool) => labelFor(tool).toLocaleLowerCase().includes(needle));
}

/**
 * What to put in front of someone right now — at most two, live tools only.
 *
 * THE RULE IS READABLE ON PURPOSE, and it is not a model: prefer something they have NOT opened
 * before, and among those the shortest, because the tool most likely to be tried is the one that
 * asks least. A tool they used in the last day is not recommended again — a recommendation that
 * repeats what you just did is noise.
 *
 * It deliberately never recommends a tool that does not exist yet. A page that recommends something
 * unbuildable is a page that lies.
 */
export function recommended(usage: ToolUsage, now: number, limit = 2): ToolDefinition[] {
  const DAY = 24 * 60 * 60 * 1000;
  return TOOL_CATALOG.filter(isLive)
    .filter((tool) => {
      const last = usage[tool.key];
      return last === undefined || now - last > DAY;
    })
    .sort((a, b) => {
      const unused = (t: ToolDefinition) => (usage[t.key] === undefined ? 0 : 1);
      if (unused(a) !== unused(b)) return unused(a) - unused(b);
      return (a.minutes ?? 999) - (b.minutes ?? 999);
    })
    .slice(0, limit);
}

/**
 * How long ago, as the coarse buckets a person actually reads: minutes, then hours, then days. The
 * caller turns the bucket into words, so this stays free of i18n and of plural rules.
 */
export type Ago = { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number };

export function ago(then: number, now: number): Ago {
  const ms = Math.max(0, now - then);
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return { unit: 'now', value: 0 };
  if (minutes < 60) return { unit: 'minutes', value: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hours', value: hours };
  return { unit: 'days', value: Math.floor(hours / 24) };
}
