/**
 * The low-frequency ADAPTIVE AGGREGATE — one send that speaks for several Journeys.
 *
 * Built to `Smart_Notification_Timing_PRD` §3, with the founder's decisions of 2026-08-26:
 * **an aggregate REPLACES the smart reminders of the day it covers**, a reminder somebody set by
 * hand always fires at the time they set it, and two windows count as separate when at least three
 * hours sit between them.
 *
 * ── WHY REPLACING IS THE WHOLE POINT ───────────────────────────────────────────────────────────
 *
 * An aggregate that arrived BESIDE the per-Journey reminders would add a notification rather than
 * remove three. Somebody with three Journeys would get four interruptions instead of three, and the
 * feature meant to make the app quieter would have made it louder. So the smart rules a slot covers
 * produce nothing of their own — the aggregate is the send.
 *
 * ── AND WHY A FIXED REMINDER IS UNTOUCHABLE ────────────────────────────────────────────────────
 *
 * Because a person set it. The founder, 2026-08-26: *if somebody set a fixed reminder, it appears at
 * the time they set.* Cancelling it to keep a count tidy would be the app overruling an explicit
 * instruction, which is the one thing this scheduler may never do. Fixed rules are not in this
 * module's input at all, so it cannot.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DECIDE ───────────────────────────────────────────────────────
 *
 * Whether anything is actually pending at send time. That is a runtime fact, not a planning one:
 * this module places the slots, and the send is suppressed later when there is nothing to say (§3).
 *
 * Pure TypeScript — no React, no clock read, no vendor imports, no i18n. The words are built by the
 * caller's {@link ./aggregateCopy AggregateCopyBuilder}.
 */

/** Two windows are separate when at least this many minutes sit between them (founder, 2026-08-26). */
export const SEPARATE_WINDOW_GAP_MINUTES = 3 * 60;

/** The most aggregates one local day may carry, ever (PRD §3). */
export const MAX_AGGREGATES_PER_DAY = 2;

/** One smart rule, reduced to what placing a slot needs. */
export interface AggregateInput {
  ruleId: string;
  journeyId: string;
  journeyTitle: string;
  /** Where this Journey's reminder wants to land, already clamped into the user's window. */
  hour: number;
  minute: number;
  /** JS weekday (0=Sun … 6=Sat), or undefined for every day. */
  weekday?: number;
}

/** One planned aggregate: when it fires, and which Journeys it speaks for. */
export interface AggregateSlot {
  hour: number;
  minute: number;
  weekday?: number;
  /** The rules this slot REPLACES — they must not also be scheduled on their own. */
  ruleIds: string[];
  journeys: { journeyId: string; journeyTitle: string }[];
}

const minutesOf = (input: { hour: number; minute: number }) => input.hour * 60 + input.minute;

/**
 * Group the day's smart reminders into at most two sends.
 *
 * The grouping rule is the PRD's own: one aggregate by default, and a second ONLY when the inputs
 * genuinely sit in two different parts of the day. Everything within three hours of the earliest
 * belongs to the first slot; a second slot opens only if something is left, and everything after it
 * joins that one. There is no third — a person with reminders spread across five hours gets two
 * sends, not five.
 *
 * The slot fires at the EARLIEST time in its group. Later would mean holding somebody's earliest
 * Journey until a later one is due, which is the app deciding their morning is less important than
 * its own tidiness.
 */
export function planAggregatesForDay(inputs: readonly AggregateInput[]): AggregateSlot[] {
  if (inputs.length === 0) return [];

  const sorted = [...inputs].sort((a, b) => minutesOf(a) - minutesOf(b));
  const groups: AggregateInput[][] = [[sorted[0]]];

  for (const input of sorted.slice(1)) {
    const current = groups[groups.length - 1];
    const gap = minutesOf(input) - minutesOf(current[0]);
    if (gap < SEPARATE_WINDOW_GAP_MINUTES || groups.length >= MAX_AGGREGATES_PER_DAY) {
      current.push(input);
    } else {
      groups.push([input]);
    }
  }

  return groups.map((group) => ({
    hour: group[0].hour,
    minute: group[0].minute,
    ...(group[0].weekday !== undefined ? { weekday: group[0].weekday } : {}),
    ruleIds: [...new Set(group.map((g) => g.ruleId))],
    // De-duplicated by Journey: two rules for one Journey are one line in the message, not two.
    journeys: dedupeJourneys(group),
  }));
}

function dedupeJourneys(group: readonly AggregateInput[]): { journeyId: string; journeyTitle: string }[] {
  const seen = new Set<string>();
  const out: { journeyId: string; journeyTitle: string }[] = [];
  for (const item of group) {
    if (seen.has(item.journeyId)) continue;
    seen.add(item.journeyId);
    out.push({ journeyId: item.journeyId, journeyTitle: item.journeyTitle });
  }
  return out;
}
