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
