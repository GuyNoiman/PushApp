/**
 * The last rung: a DIAGNOSED goal is built from the partner's authored arc, not from the generic one.
 *
 * The library has held twenty-seven Career Journeys with real Milestone arcs since 2026-08-20, and
 * every career conversation still produced the same four generic Milestones — because the matcher
 * took `journeyDefinitionsFor(shape, domain)[0]` and the builder had no path from an authored arc to
 * a plan. Both are here now, and this is what proves the person actually receives the content:
 * the Steps on their Journey are the partner's words.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notif'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

import { AppCore } from '../AppCore';
import type { GoalSpec } from '../coach/interviewPlaybook';
import { CAREER_JOURNEYS } from '../learning/library/career';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

function memRepo(): Repository {
  let saved: AppState | null = null;
  return {
    async load() {
      return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
    },
    async save(state: AppState) {
      saved = state;
    },
    async clear() {
      saved = null;
    },
  };
}

const consumedFlag: FirstRunFlag = {
  async isConsumed() {
    return true;
  },
  async markConsumed() {},
};

function spec(over: Partial<GoalSpec> = {}): GoalSpec {
  return {
    title: 'find a new job',
    domain: 'career',
    processType: 'process',
    isHabit: false,
    milestones: [],
    failureRisks: [],
    timing: {},
    answers: {},
    ...over,
  };
}

async function core() {
  const c = new AppCore(memRepo(), consumedFlag);
  await c.start();
  return c;
}

describe('a diagnosed career goal', () => {
  it('builds the authored Journey of the family the diagnosis named', async () => {
    const c = await core();

    const journey = c.createJourneyFromGoalSpec(
      spec({ diagnosis: { subtype: 'LAND_ROLE', bottleneck: 'DIRECTION_GAP' } }),
    );

    expect(journey).not.toBeNull();
    // Provenance: which Journey and which of its versions produced this plan (D62).
    expect(journey!.libraryRef?.definitionId).toContain('career.jobTarget');
    // And the CONTENT is the partner's, not the generic career arc.
    const authored = CAREER_JOURNEYS.find((d) => d.id === journey!.libraryRef!.definitionId)!;
    const arc = authored.variants[0].build;
    if (arc.kind !== 'process') throw new Error('expected a process arc');
    const authoredTitles = arc.arc.steps.map((s) => s.title);
    for (const step of journey!.steps) expect(authoredTitles).toContain(step.title);
    expect(journey!.steps.length).toBeGreaterThan(0);
  });

  it('gives the generic arc to a career goal that was NOT diagnosed', async () => {
    const c = await core();

    const journey = c.createJourneyFromGoalSpec(spec());

    expect(journey).not.toBeNull();
    // No family was named, so nothing from the library was chosen for it.
    expect(journey!.libraryRef).toBeUndefined();
  });

  it('gives the generic arc when the diagnosis names a family nobody has authored', async () => {
    const c = await core();

    const journey = c.createJourneyFromGoalSpec(
      spec({ diagnosis: { subtype: 'LAND_ROLE', bottleneck: 'A_GAP_WITH_NO_CONTENT' } }),
    );

    // Refusing to substitute the nearest family is the point: treating the wrong bottleneck on
    // purpose is worse than the generic plan.
    expect(journey).not.toBeNull();
    expect(journey!.libraryRef).toBeUndefined();
  });
});
