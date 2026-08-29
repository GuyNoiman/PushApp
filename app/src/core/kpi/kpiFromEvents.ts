/**
 * DomainEvent → KPI event. Pure, so the whole mapping is testable without a bus,
 * a network or a clock.
 *
 * ── WHY THIS IS A SUBSCRIBER AND NOT A CALL IN EACH ENGINE ────────────────
 *
 * The engines already say what happened, on the bus, in a typed vocabulary.
 * Adding `kpi.record(...)` beside each `bus.emit(...)` would be a second place
 * to forget, and would put a measurement concern inside business logic
 * (Engineering Bible §3). Mapping here also means the KPI taxonomy can change
 * without an engine changing at all.
 *
 * ── ONE HONEST DISTINCTION THIS MAPPING KEEPS ────────────────────────────
 *
 * `slipped` is not a report. Every other bucket is something a person chose to
 * say about their day; `slipped` is the slip detector noticing that a planned
 * occurrence elapsed unmet. They are counted under the same event name because
 * they describe the same thing — what happened to a Step — but the difference is
 * written down here and in the taxonomy, because a metric that silently treats
 * a detection as a self-report is a metric that overstates how much people told
 * us.
 *
 * Pure TypeScript — no React, no vendor imports.
 */
import type { DomainEvent, DomainEventType } from '../events/events';
import type { KpiInput } from './KpiGateway';

/**
 * The mapping needs to know one thing the bus does not carry: whether this
 * Journey has ever been reported on before. `journey_first_report` is what makes
 * "Journeys that truly start" computable WITHOUT a journey id ever leaving the
 * device — the device knows which is the first, and sends a differently-named
 * event for it.
 */
export interface KpiJourneyMemory {
  /** Has this Journey already had a genuine report counted? */
  hasReported(journeyId: string): boolean;
  markReported(journeyId: string): void;
  /** Has any Journey ever been created on this installation? */
  hasAnyJourney(): boolean;
  markJourneyCreated(): void;
}

/**
 * The domain events that can produce a KPI event. Exported so the subscriber
 * registers exactly these and nothing else — a list beats `bus.on` for every
 * type in the union, which would run this mapping on every reward, buddy
 * reaction and mission tick for nothing.
 *
 * Adding a name here without adding a case below is harmless (the mapping
 * returns nothing); adding a case without adding the name here is the mistake
 * this constant makes visible, because the case would simply never run.
 */
export const KPI_SOURCE_EVENTS = [
  'JourneyCreated',
  'JourneyCompleted',
  'JourneyAbandoned',
  'StepCheckedIn',
  'StepPartial',
  'StepCancelled',
  'StepPostponed',
  'StepMissed',
] as const satisfies readonly DomainEventType[];

/** A postponement answers a day honestly, but it is not the Journey starting. */
const GENUINE_START_KINDS = new Set(['done', 'partial']);

export function kpiEventsFor(event: DomainEvent, memory: KpiJourneyMemory): KpiInput[] {
  switch (event.type) {
    case 'JourneyCreated': {
      const out: KpiInput[] = [{ name: 'journey_created' }];
      if (!memory.hasAnyJourney()) {
        out.push({ name: 'first_journey_created' });
        memory.markJourneyCreated();
      }
      return out;
    }

    case 'JourneyCompleted':
      // Only a FIRST completion. A re-completion after a reversal is the same
      // Journey finishing once, and counting it twice would inflate the one
      // measure the product most wants to be honest about.
      return event.firstCompletion ? [{ name: 'journey_completed' }] : [];

    case 'JourneyAbandoned':
      return [{ name: 'journey_abandoned' }];

    case 'StepCheckedIn':
      return event.firstCompletion
        ? [{ name: 'step_reported', bucket: 'done' }, ...firstReport(event.journeyId, 'done', memory)]
        : [];

    case 'StepPartial':
      return [{ name: 'step_reported', bucket: 'partial' }, ...firstReport(event.journeyId, 'partial', memory)];

    case 'StepCancelled':
      return [{ name: 'step_reported', bucket: 'couldnt' }];

    case 'StepPostponed':
      return [{ name: 'step_reported', bucket: 'postponed' }];

    case 'StepMissed':
      return [{ name: 'step_reported', bucket: 'slipped' }];

    default:
      return [];
  }
}

function firstReport(journeyId: string, kind: string, memory: KpiJourneyMemory): KpiInput[] {
  if (!GENUINE_START_KINDS.has(kind)) return [];
  if (memory.hasReported(journeyId)) return [];
  memory.markReported(journeyId);
  return [{ name: 'journey_first_report' }];
}

/** The in-memory memory, backed by whatever the caller persists. */
export function createJourneyMemory(initial?: { reported?: string[]; anyJourney?: boolean }): KpiJourneyMemory {
  const reported = new Set(initial?.reported ?? []);
  let anyJourney = initial?.anyJourney ?? false;
  return {
    hasReported: (id) => reported.has(id),
    markReported: (id) => {
      reported.add(id);
    },
    hasAnyJourney: () => anyJourney,
    markJourneyCreated: () => {
      anyJourney = true;
    },
  };
}
