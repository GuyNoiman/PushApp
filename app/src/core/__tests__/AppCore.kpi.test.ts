/**
 * The KPI stream, from a domain event to a recorded metric.
 *
 * The unit tests in `core/kpi` prove the mapping and the contract. This proves
 * the SUBSCRIPTION — that the events an engine emits actually reach the gateway,
 * which is the part a refactor breaks silently: every mapping test would still
 * pass with nothing subscribed at all.
 */
import { AppCore } from '../AppCore';
import type { KpiGateway, KpiInput } from '../kpi';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function recorder(): { gateway: KpiGateway; sent: KpiInput[] } {
  const sent: KpiInput[] = [];
  return { gateway: { enabled: true, record: (i) => void sent.push(i) }, sent };
}

/** The minimum a Journey needs to travel the bus — other subscribers read its Steps. */
const journeyStub = (id: string) => ({ id, title: id, steps: [], status: 'active' }) as never;

async function core(): Promise<AppCore> {
  const c = new AppCore();
  await c.start();
  return c;
}

describe('the KPI subscription', () => {
  it('records nothing at all until a gateway is set', async () => {
    // The default is inert, which is the state under jest, on web and on any
    // build with no backend — so no other test has to know this exists.
    const c = await core();
    expect(() => c.bus.emit({ type: 'JourneyAbandoned', journey: journeyStub('j1') })).not.toThrow();
  });

  it('records a created Journey, and marks the first one separately', async () => {
    const c = await core();
    const { gateway, sent } = recorder();
    c.setKpiGateway(gateway);

    c.bus.emit({ type: 'JourneyCreated', journey: journeyStub('j1') });
    expect(sent.map((e) => e.name)).toEqual(['journey_created', 'first_journey_created']);

    sent.length = 0;
    c.bus.emit({ type: 'JourneyCreated', journey: journeyStub('j2') });
    expect(sent.map((e) => e.name)).toEqual(['journey_created']);
  });

  it('records a Step report with its bucket', async () => {
    const c = await core();
    const { gateway, sent } = recorder();
    c.setKpiGateway(gateway);

    c.bus.emit({ type: 'StepPartial', journeyId: 'j1', stepId: 's1' });
    expect(sent).toContainEqual({ name: 'step_reported', bucket: 'partial' });
  });

  it('records a Journey starting for real, once, on its first genuine report', async () => {
    const c = await core();
    const { gateway, sent } = recorder();
    c.setKpiGateway(gateway);

    c.bus.emit({ type: 'StepCheckedIn', journeyId: 'j1', step: {} as never, checkIn: {} as never, firstCompletion: true });
    expect(sent.map((e) => e.name)).toContain('journey_first_report');

    sent.length = 0;
    c.bus.emit({ type: 'StepCheckedIn', journeyId: 'j1', step: {} as never, checkIn: {} as never, firstCompletion: true });
    expect(sent.map((e) => e.name)).not.toContain('journey_first_report');
  });

  it('stays silent for every event with no KPI meaning', async () => {
    const c = await core();
    const { gateway, sent } = recorder();
    c.setKpiGateway(gateway);

    c.bus.emit({ type: 'BuddyEvolved' } as never);
    c.bus.emit({ type: 'RewardGranted' } as never);
    expect(sent).toEqual([]);
  });

  it('records onboarding completion once, however many times it is called', async () => {
    const c = await core();
    const { gateway, sent } = recorder();
    c.setKpiGateway(gateway);

    c.completeOnboarding({} as never);
    c.completeOnboarding({} as never);
    expect(sent.filter((e) => e.name === 'onboarding_completed')).toHaveLength(1);
  });
});

describe('outcome evidence', () => {
  it('records an ending even though nobody is ever asked a question about it', async () => {
    const c = await core();
    const written: unknown[] = [];
    c.setOutcomeGateway({ enabled: true, record: async (e) => { written.push(e); return 'row-1'; }, answer: async () => true });

    c.bus.emit({
      type: 'JourneyCompleted',
      journey: { ...(journeyStub('j1') as object), completedAt: Date.now() } as never,
      firstCompletion: true,
    });
    await Promise.resolve();
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({ ending: 'completed', satisfaction: null });
  });

  it('records one row for a Journey that completes twice after a reversal', async () => {
    const c = await core();
    const written: unknown[] = [];
    c.setOutcomeGateway({ enabled: true, record: async (e) => { written.push(e); return 'row-1'; }, answer: async () => true });

    const journey = journeyStub('j1');
    c.bus.emit({ type: 'JourneyCompleted', journey, firstCompletion: true });
    c.bus.emit({ type: 'JourneyCompleted', journey, firstCompletion: false });
    await Promise.resolve();
    expect(written).toHaveLength(1);
  });

  it('records an abandonment as its own outcome, not as an absence', async () => {
    const c = await core();
    const written: { ending?: string }[] = [];
    c.setOutcomeGateway({ enabled: true, record: async (e) => { written.push(e); return 'row-1'; }, answer: async () => true });

    c.bus.emit({ type: 'JourneyAbandoned', journey: journeyStub('j1') });
    await Promise.resolve();
    expect(written[0]?.ending).toBe('abandoned');
  });
});

describe('the question an ending leaves behind', () => {
  const gateway = (written: unknown[], answered: unknown[]) => ({
    enabled: true,
    record: async (e: unknown) => { written.push(e); return 'row-1'; },
    answer: async (id: string, felt: unknown) => { answered.push({ id, felt }); return true; },
  });

  it('latches a pending ask after an ending, and clears it when answered', async () => {
    const c = await core();
    const written: unknown[] = []; const answered: { id: string; felt: unknown }[] = [];
    c.setOutcomeGateway(gateway(written, answered) as never);

    c.bus.emit({ type: 'JourneyAbandoned', journey: journeyStub('j1') });
    await Promise.resolve(); await Promise.resolve();
    expect(c.getPendingOutcomeAsk()).toMatchObject({ id: 'row-1', ending: 'abandoned' });

    await c.answerOutcomeAsk({ mismatch: ['c_time_fit'] });
    expect(c.getPendingOutcomeAsk()).toBeNull();
    expect(answered[0].felt).toMatchObject({ mismatch: ['c_time_fit'] });
  });

  it('writes NOTHING when the question is skipped', async () => {
    // A skipped survey leaves the felt half null, and null means "not asked".
    // Writing zeros would turn a decision not to answer into a bad review.
    const c = await core();
    const written: unknown[] = []; const answered: unknown[] = [];
    c.setOutcomeGateway(gateway(written, answered) as never);

    c.bus.emit({ type: 'JourneyAbandoned', journey: journeyStub('j1') });
    await Promise.resolve(); await Promise.resolve();
    await c.answerOutcomeAsk(null);

    expect(answered).toEqual([]);
    expect(c.getPendingOutcomeAsk()).toBeNull();
  });

  it('holds one question at a time, so two endings do not stack two surveys', async () => {
    const c = await core();
    const written: unknown[] = []; const answered: unknown[] = [];
    c.setOutcomeGateway(gateway(written, answered) as never);

    c.bus.emit({ type: 'JourneyAbandoned', journey: journeyStub('j1') });
    c.bus.emit({ type: 'JourneyAbandoned', journey: journeyStub('j2') });
    await Promise.resolve(); await Promise.resolve();
    expect(c.getPendingOutcomeAsk()).not.toBeNull();
    await c.answerOutcomeAsk(null);
    expect(c.getPendingOutcomeAsk()).toBeNull();
  });
});
