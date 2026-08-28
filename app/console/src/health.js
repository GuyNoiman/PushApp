/**
 * Turning raw probe results into the cards of §6.3 — pure, so the interesting
 * part is testable without a network.
 *
 * A probe returns `{ ok, at, detail, capacityPct, forecastDays, issues }`. The
 * absence of a probe and a probe that FAILED are different things and get
 * different colours: never-checked is gray, checked-and-down is red.
 */
import { STATE, capacityState, freshnessState, severityState, worst, overallState, DEFAULT_THRESHOLDS } from './status.js';

export function evaluateService(service, probe, nowMs, thresholds = DEFAULT_THRESHOLDS) {
  if (!service.signal || !probe) {
    return {
      ...service,
      state: STATE.GRAY,
      detail: service.blockedBy ?? 'No check is wired for this service.',
      lastCheckAt: null,
      issues: [],
    };
  }
  if (probe.ok === false) {
    return {
      ...service,
      state: STATE.RED,
      detail: probe.detail ?? 'The check ran and failed.',
      lastCheckAt: probe.at ?? null,
      issues: probe.issues ?? [],
    };
  }
  const fresh = freshnessState(probe.at, probe.intervalMs ?? 5 * 60 * 1000, nowMs, thresholds);
  const capacity =
    probe.capacityPct === undefined ? STATE.GREEN : capacityState(probe.capacityPct, probe.forecastDays, thresholds);
  const bySeverity = severityState(probe.issues);
  return {
    ...service,
    state: worst([fresh, capacity, bySeverity]),
    detail: probe.detail ?? '',
    lastCheckAt: probe.at ?? null,
    issues: probe.issues ?? [],
  };
}

export function evaluateAll(services, probes, nowMs, thresholds = DEFAULT_THRESHOLDS) {
  const cards = services.map((s) => evaluateService(s, probes[s.signal], nowMs, thresholds));
  return { cards, overall: overallState(cards.map((c) => c.state)) };
}
