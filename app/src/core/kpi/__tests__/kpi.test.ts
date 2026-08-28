/**
 * The KPI stream.
 *
 * The tests that matter are not the happy paths — they are the ones that fail
 * when somebody widens the contract. `kpi_events` has no free-text column and no
 * identifier of a person, a Journey or a Step, and this suite is what keeps a
 * future convenience from putting one there.
 */
import { buildKpiEvent, withOnceGuard, NullKpiGateway, type KpiGateway, type KpiInput, type OnceStore } from '../KpiGateway';
import { createJourneyMemory, kpiEventsFor } from '../kpiFromEvents';
import { KPIS, KPI_EVENTS, NOT_YET_COMPUTABLE, TAXONOMY_VERSION, isAllowedBucket, isKnownEvent } from '../taxonomy';
import type { DomainEvent } from '../../events/events';

const ctx = { installId: 'install-1', appVersion: '1.0.0', platform: 'ios' as const, channel: 'production' };

describe('the outbound contract', () => {
  it('carries exactly eight fields and no ninth', () => {
    const event = buildKpiEvent({ name: 'journey_created' }, ctx)!;
    expect(Object.keys(event).sort()).toEqual([
      'appVersion', 'bucket', 'channel', 'installId', 'name', 'platform', 'taxonomyVersion', 'value',
    ]);
  });

  it('rebuilds the event rather than passing the input through', () => {
    // A field a future call site adds must not survive. This is the same
    // guarantee `beforeSend` gives the crash stream.
    const smuggled = {
      name: 'journey_created',
      journeyTitle: 'Quitting smoking',
      userId: 'user-9',
      note: 'because my father died',
    } as unknown as KpiInput;
    const event = buildKpiEvent(smuggled, ctx)!;
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('Quitting smoking');
    expect(serialized).not.toContain('user-9');
    expect(serialized).not.toContain('father');
  });

  it('refuses an event name that is not in the taxonomy', () => {
    expect(buildKpiEvent({ name: 'something_someone_invented' }, ctx)).toBeNull();
    expect(isKnownEvent('something_someone_invented')).toBe(false);
  });

  it('refuses a bucket the event does not declare', () => {
    expect(buildKpiEvent({ name: 'step_reported', bucket: 'brilliant' }, ctx)).toBeNull();
    expect(buildKpiEvent({ name: 'journey_created', bucket: 'done' }, ctx)).toBeNull();
    expect(isAllowedBucket('step_reported', 'done')).toBe(true);
  });

  it('refuses to send without an installation id, rather than sending an anonymous row', () => {
    expect(buildKpiEvent({ name: 'journey_created' }, { ...ctx, installId: '' })).toBeNull();
  });

  it('drops a non-finite value instead of sending NaN', () => {
    expect(buildKpiEvent({ name: 'journey_created', value: Number.NaN }, ctx)!.value).toBeNull();
    expect(buildKpiEvent({ name: 'journey_created', value: 3 }, ctx)!.value).toBe(3);
  });

  it('stamps the taxonomy version on every event, so a definition change is traceable', () => {
    expect(buildKpiEvent({ name: 'journey_created' }, ctx)!.taxonomyVersion).toBe(TAXONOMY_VERSION);
  });
});

describe('once per installation', () => {
  const store = (): OnceStore => {
    const seen = new Set<string>();
    return { has: (n) => seen.has(n), remember: (n) => void seen.add(n) };
  };

  it('sends a first-open event once and never again', () => {
    const sent: KpiInput[] = [];
    const inner: KpiGateway = { enabled: true, record: (i) => void sent.push(i) };
    const guarded = withOnceGuard(inner, store());
    guarded.record({ name: 'app_first_open' });
    guarded.record({ name: 'app_first_open' });
    expect(sent).toHaveLength(1);
  });

  it('does not restrict a repeatable event', () => {
    const sent: KpiInput[] = [];
    const guarded = withOnceGuard({ enabled: true, record: (i) => void sent.push(i) }, store());
    guarded.record({ name: 'journey_created' });
    guarded.record({ name: 'journey_created' });
    expect(sent).toHaveLength(2);
  });
});

describe('mapping domain events', () => {
  const journey = { id: 'j1' } as never;

  it('counts the first Journey separately, so activation has a numerator', () => {
    const memory = createJourneyMemory();
    const first = kpiEventsFor({ type: 'JourneyCreated', journey } as DomainEvent, memory);
    expect(first.map((e) => e.name)).toEqual(['journey_created', 'first_journey_created']);
    const second = kpiEventsFor({ type: 'JourneyCreated', journey } as DomainEvent, memory);
    expect(second.map((e) => e.name)).toEqual(['journey_created']);
  });

  it('emits a first-report event once per Journey — which is how the ratio works without a journey id', () => {
    const memory = createJourneyMemory();
    const a = kpiEventsFor({ type: 'StepCheckedIn', journeyId: 'j1', firstCompletion: true } as DomainEvent, memory);
    expect(a.map((e) => e.name)).toContain('journey_first_report');
    const b = kpiEventsFor({ type: 'StepCheckedIn', journeyId: 'j1', firstCompletion: true } as DomainEvent, memory);
    expect(b.map((e) => e.name)).not.toContain('journey_first_report');
    const other = kpiEventsFor({ type: 'StepPartial', journeyId: 'j2' } as DomainEvent, memory);
    expect(other.map((e) => e.name)).toContain('journey_first_report');
  });

  it('does not treat a postponement as the Journey starting', () => {
    const memory = createJourneyMemory();
    const out = kpiEventsFor({ type: 'StepPostponed', journeyId: 'j1', stepId: 's1' } as DomainEvent, memory);
    expect(out.map((e) => e.name)).toEqual(['step_reported']);
    expect(out[0].bucket).toBe('postponed');
  });

  it('counts a completion once, not again after a reversal', () => {
    const memory = createJourneyMemory();
    expect(kpiEventsFor({ type: 'JourneyCompleted', journey, firstCompletion: true } as DomainEvent, memory)).toHaveLength(1);
    expect(kpiEventsFor({ type: 'JourneyCompleted', journey, firstCompletion: false } as DomainEvent, memory)).toHaveLength(0);
  });

  it('keeps a detected slip and a self-reported day in the same event under different buckets', () => {
    const memory = createJourneyMemory();
    const slipped = kpiEventsFor({ type: 'StepMissed', journeyId: 'j1', stepId: 's1' } as DomainEvent, memory);
    expect(slipped[0]).toEqual({ name: 'step_reported', bucket: 'slipped' });
    const couldnt = kpiEventsFor({ type: 'StepCancelled', journeyId: 'j1', stepId: 's1' } as DomainEvent, memory);
    expect(couldnt[0].bucket).toBe('couldnt');
  });

  it('ignores every event that is not in the taxonomy', () => {
    const memory = createJourneyMemory();
    expect(kpiEventsFor({ type: 'BuddyEvolved' } as DomainEvent, memory)).toEqual([]);
    expect(kpiEventsFor({ type: 'ItemPurchased' } as DomainEvent, memory)).toEqual([]);
  });

  it('never produces an event the contract would refuse', () => {
    const memory = createJourneyMemory();
    const events: DomainEvent[] = [
      { type: 'JourneyCreated', journey } as DomainEvent,
      { type: 'JourneyCompleted', journey, firstCompletion: true } as DomainEvent,
      { type: 'JourneyAbandoned', journey } as DomainEvent,
      { type: 'StepCheckedIn', journeyId: 'j1', firstCompletion: true } as DomainEvent,
      { type: 'StepPartial', journeyId: 'j1', stepId: 's1' } as DomainEvent,
      { type: 'StepCancelled', journeyId: 'j1', stepId: 's1' } as DomainEvent,
      { type: 'StepPostponed', journeyId: 'j1', stepId: 's1' } as DomainEvent,
      { type: 'StepMissed', journeyId: 'j1', stepId: 's1' } as DomainEvent,
    ];
    for (const e of events) {
      for (const input of kpiEventsFor(e, memory)) {
        expect(buildKpiEvent(input, ctx)).not.toBeNull();
      }
    }
  });
});

describe('the definitions', () => {
  it('gives every KPI a numerator, a denominator and its exclusions in words', () => {
    for (const kpi of KPIS) {
      expect(kpi.title.length).toBeGreaterThan(20);
      expect(kpi.exclusions.length).toBeGreaterThan(20);
      expect(isKnownEvent(kpi.numerator.event)).toBe(true);
      expect(isKnownEvent(kpi.denominator.event)).toBe(true);
    }
  });

  it('marks version 0 provisional, because the founder has not confirmed the formulas', () => {
    expect(KPIS.every((k) => k.provisional)).toBe(true);
  });

  it('never names a forbidden objective as a KPI', () => {
    // PRD §7.5. Time in app, sessions, DAU/MAU, streak length and notification
    // volume are not success. A test rather than a comment, so adding one fails.
    const forbidden = ['time_in_app', 'session', 'dau', 'mau', 'streak', 'notification_open', 'retention'];
    for (const kpi of KPIS) {
      for (const word of forbidden) expect(kpi.id).not.toContain(word);
    }
    for (const event of KPI_EVENTS) {
      for (const word of ['session', 'time_in_app', 'dau']) expect(event.name).not.toContain(word);
    }
  });

  it('states what it cannot yet compute rather than leaving a silent hole', () => {
    expect(NOT_YET_COMPUTABLE.length).toBeGreaterThan(0);
    for (const item of NOT_YET_COMPUTABLE) expect(item.blockedBy.length).toBeGreaterThan(30);
  });

  it('has no free-text field anywhere in an event', () => {
    const event = buildKpiEvent({ name: 'step_reported', bucket: 'done' }, ctx)!;
    for (const [key, value] of Object.entries(event)) {
      if (key === 'name' || key === 'bucket' || key === 'appVersion' || key === 'channel') continue;
      expect(typeof value === 'string' && value.length > 40).toBe(false);
    }
  });
});

describe('the default gateway', () => {
  it('accepts everything and sends nothing when there is no backend', () => {
    expect(NullKpiGateway.enabled).toBe(false);
    expect(() => NullKpiGateway.record({ name: 'journey_created' })).not.toThrow();
  });
});
