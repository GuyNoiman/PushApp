/**
 * motivation/select — which card, if any, may be shown right now.
 *
 * The default answer is NOTHING, and on most days that is the answer. A moment makes somebody
 * ELIGIBLE, never DUE (PRD §3 Q5) — this engine has no quota to fill, and every rule below can only
 * subtract.
 *
 * Four gates, in order:
 *  1. **One card a day.** If today already had one, that same card comes back unchanged (so it does
 *     not vanish under somebody's thumb the instant it is recorded as shown), unless they have
 *     already answered or dismissed it — after which today is over.
 *  2. **The moment.** Only the four triggers of PRD §3 Q5 open anything at all.
 *  3. **The facts.** An item whose sentence needs a number the app does not have is not eligible.
 *     This is the truth mechanism: it cannot be selected without its facts, so it can never be shown
 *     with an invented one.
 *  4. **Cooldowns and the person's own verdicts.** A disliked item never returns for them; an item
 *     is not repeated within 21 days, nor its theme within 7.
 *
 * Ranking is deliberately not an algorithm: an item nobody has answered about yet outranks one that
 * has been shown, then the least-recently-shown wins, then id order. That is enough exploration to
 * give new content a chance, and it is honest about being a placeholder for the confidence-aware
 * ranking the Future PRD describes.
 *
 * Pure — the clock is passed in, nothing is written.
 */
import { MOTIVATION_CATALOG, motivationItem } from './catalog';
import type {
  MotivationFacts,
  MotivationItem,
  MotivationLogEntry,
  MotivationSelection,
  MotivationTrigger,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** An item is not repeated within this window (PRD §3 Q9). */
export const ITEM_COOLDOWN_DAYS = 21;
/** Nor is its theme, so two ways of saying one thing do not stack. */
export const THEME_COOLDOWN_DAYS = 7;
/** How much of the log is worth keeping — enough to honour the longest cooldown several times over. */
export const MOTIVATION_LOG_LIMIT = 60;

/** Local calendar day key (YYYY-MM-DD), so "once a day" means the user's day, not 24 hours. */
export function motivationDayKey(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Which of the four moments are open right now. A moment can be open without any item being
 * eligible for it, and several can be open at once.
 */
export function activeTriggers(facts: MotivationFacts): MotivationTrigger[] {
  const open: MotivationTrigger[] = [];
  if (facts.streakDays >= 3 || facts.stepsDoneThisWeek >= 3) open.push('sustained');
  if (facts.returnedAfterMiss) open.push('returned');
  if (facts.stepsToMilestone !== undefined && facts.stepsToMilestone <= 2) open.push('milestone');
  if (
    facts.runningJourneys > 0 &&
    facts.daysSinceLastDone !== undefined &&
    facts.daysSinceLastDone >= 2
  ) {
    open.push('quiet');
  }
  return open;
}

/** Whether every fact this item's sentence needs is actually known, and worth saying. */
export function hasRequiredFacts(item: MotivationItem, facts: MotivationFacts): boolean {
  return item.requires.every((key) => {
    const value = facts[key];
    if (value === undefined || value === null) return false;
    // A count of zero is a known fact and a pointless sentence: "you have done 0 Steps" is not
    // motivation, it is a scoreboard. A title, being text, only has to be present.
    return typeof value === 'number' ? value > 0 : String(value).trim().length > 0;
  });
}

/**
 * Choose the card for this moment, or `null` for silence.
 *
 * `log` is the on-device history, newest-last; `now` is the clock.
 */
export function selectMotivation(
  facts: MotivationFacts,
  log: readonly MotivationLogEntry[],
  now: number,
): MotivationSelection | null {
  const today = motivationDayKey(now);
  const todays = log.filter((e) => motivationDayKey(e.at) === today);
  if (todays.length > 0) {
    const latest = todays[todays.length - 1];
    // Answered or waved away: today is over, and asking again would be the app not listening.
    if (latest.verdict) return null;
    const item = motivationItem(latest.itemId);
    // The item was retired between being shown and being read; silence beats a stale sentence.
    if (!item || !hasRequiredFacts(item, facts)) return null;
    return { item, facts, alreadyShownToday: true };
  }

  const triggers = new Set(activeTriggers(facts));
  if (triggers.size === 0) return null;

  const disliked = new Set(
    log.filter((e) => e.verdict === 'notHelpful').map((e) => `${e.itemId}@${e.version}`),
  );
  const itemCutoff = now - ITEM_COOLDOWN_DAYS * DAY_MS;
  const themeCutoff = now - THEME_COOLDOWN_DAYS * DAY_MS;
  const recentItems = new Set(log.filter((e) => e.at >= itemCutoff).map((e) => e.itemId));
  const recentThemes = new Set(log.filter((e) => e.at >= themeCutoff).map((e) => e.theme));

  const eligible = MOTIVATION_CATALOG.filter(
    (item) =>
      triggers.has(item.trigger) &&
      hasRequiredFacts(item, facts) &&
      !disliked.has(`${item.id}@${item.version}`) &&
      !recentItems.has(item.id) &&
      !recentThemes.has(item.theme),
  );
  if (eligible.length === 0) return null;

  const lastShownAt = new Map<string, number>();
  for (const entry of log) lastShownAt.set(entry.itemId, Math.max(lastShownAt.get(entry.itemId) ?? 0, entry.at));

  const ranked = [...eligible].sort((a, b) => {
    const seenA = lastShownAt.get(a.id) ?? 0;
    const seenB = lastShownAt.get(b.id) ?? 0;
    if (seenA !== seenB) return seenA - seenB; // never shown (0) first, then longest ago
    return a.id < b.id ? -1 : 1;
  });

  return { item: ranked[0], facts, alreadyShownToday: false };
}

/** Append an entry and trim the log to its bound. Pure — returns the new log. */
export function appendMotivationLog(
  log: readonly MotivationLogEntry[],
  entry: MotivationLogEntry,
): MotivationLogEntry[] {
  return [...log, entry].slice(-MOTIVATION_LOG_LIMIT);
}
