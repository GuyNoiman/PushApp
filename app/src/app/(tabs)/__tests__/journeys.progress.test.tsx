/**
 * Journeys — progress after a Step is reported done (Device QA 2026-08-17, A2).
 *
 * On device the founder swiped a Step to done on Home and the Journeys card still read 0%. This
 * drives the WHOLE path with a real AppCore behind the real screen — report → engine → snapshot →
 * the screen's memo → the rendered percentage — because that is where it broke: `checkInStep`
 * mutates the Step IN PLACE, and `getSnapshot()` used to hand back the very same `journeys` array
 * every time, so the screen's `useMemo([snapshot.journeys])` saw an unchanged dependency and kept
 * rendering the cards it had built before the report. Nothing was wrong with the math or the write;
 * the card was simply never rebuilt.
 *
 * Everything below the screen is real. Only the platform edges (storage, notifications, theme,
 * safe-area, i18n) are stubbed.
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
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
  }),
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => new Proxy({}, { get: () => '#111' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { createElement, type ReactElement } from 'react';

import JourneysScreen from '../journeys';
import { AppCore } from '@/core/AppCore';
import type { AppState } from '@/core/types/domain';
import type { Repository } from '@/core/persistence/Repository';

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

// react-test-renderer ships no types; type just the surface used here.
interface TestRoot {
  toJSON(): unknown;
  update(element: ReactElement): void;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
/** The card's percentage label as it appears in the tree (the number and its "%" are two nodes).
 *  Matched exactly so the bar's own `"height":"100%"` can never be mistaken for a percentage. */
const pctLabel = (pct: number) => `["${pct}","%"]`;

function inMemoryRepo(): Repository {
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

/** A started core holding exactly ONE Journey: 8 Steps, none done (the demo seed is cleared). */
async function coreWithEightSteps(): Promise<{ core: AppCore; journeyId: string; stepIds: string[] }> {
  const core = new AppCore(inMemoryRepo());
  await core.start();
  for (const seeded of core.getSnapshot().journeys) core.deleteJourney(seeded.id);

  const journey = core.createJourney({
    title: 'Drink a protein shake',
    why: ['because'],
    durationDays: 30,
    rhythm: 'daily',
    steps: Array.from({ length: 8 }, (_, i) => ({
      title: `Shake ${i + 1}`,
      isStarterStep: i === 0,
      cadence: 'daily' as const,
    })),
  });
  return { core, journeyId: journey.id, stepIds: journey.steps.map((s) => s.id) };
}

/** Hand the screen the CURRENT snapshot, exactly as AppProvider does after a domain event. */
function publish(core: AppCore) {
  mockApp.current = { core, snapshot: core.getSnapshot() };
}

describe('Journeys card — a reported Step moves the percentage', () => {
  it('reads 12–13%, not 0%, once one of eight Steps is done', async () => {
    const { core, journeyId, stepIds } = await coreWithEightSteps();
    publish(core);

    let r: TestRoot | undefined;
    await act(async () => {
      r = TestRenderer.create(createElement(JourneysScreen));
    });
    expect(json(r!)).toContain(pctLabel(0)); // nothing done yet

    // The user reports one Step done (the same facade call Home's swipe makes) and the provider
    // publishes the new snapshot; the already-mounted screen re-renders.
    await act(async () => {
      core.checkInStep(journeyId, stepIds[0]);
      publish(core);
      r!.update(createElement(JourneysScreen));
    });

    const shown = json(r!);
    expect(shown).toContain(pctLabel(13)); // 1 of 8, rounded
    expect(shown).not.toContain(pctLabel(0));
  });

  it('keeps counting up as more Steps are reported', async () => {
    const { core, journeyId, stepIds } = await coreWithEightSteps();
    publish(core);

    let r: TestRoot | undefined;
    await act(async () => {
      r = TestRenderer.create(createElement(JourneysScreen));
    });

    for (const stepId of stepIds.slice(0, 4)) {
      await act(async () => {
        core.checkInStep(journeyId, stepId);
        publish(core);
        r!.update(createElement(JourneysScreen));
      });
    }

    expect(json(r!)).toContain(pctLabel(50)); // 4 of 8
  });
});

describe('Snapshot — the read-model the screens memoize on', () => {
  it('hands out a FRESH journeys array after an in-place Step report', async () => {
    // The engines mutate Journeys and Steps in place. If the snapshot re-exported the same array,
    // every `useMemo([snapshot.journeys])` reader would keep its stale derivation — which is exactly
    // how a done Step left the card at 0%.
    const { core, journeyId, stepIds } = await coreWithEightSteps();
    const before = core.getSnapshot();

    core.checkInStep(journeyId, stepIds[0]);
    const after = core.getSnapshot();

    expect(after.journeys).not.toBe(before.journeys);
    expect(after.journeys[0].steps.filter((s) => s.done)).toHaveLength(1);
  });
});
