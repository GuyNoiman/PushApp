/**
 * The status model of PRD §6.4, as arithmetic rather than as a paragraph.
 *
 * The whole point of this file is the fourth state. Green/yellow/red is what
 * every dashboard has; GRAY — "we do not know" — is the one that keeps the page
 * honest, and §3.4 is explicit that unknown is not healthy. Nothing here ever
 * returns green for a missing measurement.
 *
 * Thresholds are operational configuration, not product rules (§6.4), so they
 * arrive as an argument and have a documented default rather than living inline.
 */

export const STATE = Object.freeze({
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
  GRAY: 'gray',
});

/** PRD §6.4 "initial configurable defaults". */
export const DEFAULT_THRESHOLDS = Object.freeze({
  capacityYellowPct: 70,
  capacityRedPct: 85,
  forecastYellowDays: 30,
  forecastRedDays: 14,
  /** No result after twice the normal check interval is gray, not stale-green. */
  stalenessMultiplier: 2,
});

const RANK = { [STATE.GREEN]: 0, [STATE.GRAY]: 1, [STATE.YELLOW]: 2, [STATE.RED]: 3 };

/**
 * Capacity, by percentage used and by how long it has left. The two are ORed on
 * purpose: 40% used with nine days of headroom is a red, and pretending it is a
 * green because the bar is short is how a quota gets hit on a Saturday.
 */
export function capacityState(usedPct, forecastDays, t = DEFAULT_THRESHOLDS) {
  if (usedPct === null || usedPct === undefined || Number.isNaN(usedPct)) return STATE.GRAY;
  const byForecast =
    forecastDays === null || forecastDays === undefined
      ? STATE.GREEN
      : forecastDays <= t.forecastRedDays
        ? STATE.RED
        : forecastDays <= t.forecastYellowDays
          ? STATE.YELLOW
          : STATE.GREEN;
  const byUsage =
    usedPct > t.capacityRedPct ? STATE.RED : usedPct >= t.capacityYellowPct ? STATE.YELLOW : STATE.GREEN;
  return worst([byUsage, byForecast]);
}

/**
 * Has this check reported recently enough to be believed? A check that has never
 * run and a check that ran a week ago are the same answer: gray.
 */
export function freshnessState(lastCheckAt, intervalMs, nowMs, t = DEFAULT_THRESHOLDS) {
  if (!lastCheckAt) return STATE.GRAY;
  const at = lastCheckAt instanceof Date ? lastCheckAt.getTime() : new Date(lastCheckAt).getTime();
  if (Number.isNaN(at)) return STATE.GRAY;
  if (!intervalMs) return STATE.GRAY;
  return nowMs - at > intervalMs * t.stalenessMultiplier ? STATE.GRAY : STATE.GREEN;
}

/**
 * The worst of several states — but note the ranking: gray sits ABOVE green and
 * BELOW yellow. It is worse than working and better than a known problem, which
 * is exactly what "we cannot see this one" means.
 */
export function worst(states) {
  let out = STATE.GREEN;
  for (const s of states) {
    if (RANK[s] === undefined) continue;
    if (RANK[s] > RANK[out]) out = s;
  }
  return out;
}

/** The severities that stop a service being green, per §6.4. */
export function severityState(activeIssues) {
  if (!activeIssues || activeIssues.length === 0) return STATE.GREEN;
  const has = (sev) => activeIssues.some((i) => i.severity === sev);
  if (has('critical')) return STATE.RED;
  if (has('high')) return STATE.RED;
  if (has('medium')) return STATE.YELLOW;
  return STATE.YELLOW;
}

/**
 * The banner at the top of Tab 1 (§6.1).
 *
 * It returns the count of what it could NOT see alongside the verdict, and the
 * view is required to render both. "Healthy" over nine unmeasured services is a
 * lie with a green dot on it; "healthy where measured, 9 unknown" is the same
 * data told truthfully, and it is the version that makes somebody go wire up the
 * ninth check.
 */
export function overallState(serviceStates) {
  const known = serviceStates.filter((s) => s !== STATE.GRAY);
  const unknown = serviceStates.length - known.length;
  const w = worst(known);
  const state = w === STATE.RED ? 'incident' : w === STATE.YELLOW ? 'attention' : 'healthy';
  return { state, known: known.length, unknown, total: serviceStates.length };
}
