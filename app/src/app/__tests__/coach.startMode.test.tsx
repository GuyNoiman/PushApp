/**
 * Coach — the START MODE offered at final approval (Future Journey Management, §5).
 *
 * The coach path is the OTHER place a Journey is approved, so it asks the same question as the
 * wizard — but as ordinary option cards inside the conversation ({@link CoachOptions}), never as a
 * modal on top of it. This renders the REAL coach screen over a stubbed orchestrator to pin:
 *
 *  · the choice appears the moment there is a plan to approve, with "Start now" preselected, so the
 *    Build CTA is still one tap for the common case and the flag-off behaviour is unchanged;
 *  · each mode reaches `createJourneyFromGoalSpec` with the right {@link JourneyStart};
 *  · picking a card only RECORDS the choice — the Build CTA is still what creates the Journey;
 *  · at the Future cap the two "for later" cards are disabled and explain why, with no error.
 *
 * `t` is stubbed to echo its key; theme, safe-area and the live orchestrator are stubbed so the
 * screen renders without a network call or a provider tree.
 */
// `makeCoachLlm` now reaches the shared Supabase client (to authenticate the coach against our
// key-holding proxy instead of shipping the API key in the bundle), which pulls in AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import CoachScreen from '../coach';
import { FUTURE_JOURNEY_POLICY } from '@/core/config/futureJourneys';
import { startInstantInDays } from '@/core/journeys/futureJourneys';
import type { GoalSpec } from '@/core/coach/interviewPlaybook';
import type { JourneyStart } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}|${JSON.stringify(opts)}` : k),
    i18n: { language: 'en' },
  }),
}));
jest.mock('@/i18n/useAddressedTranslation', () => ({
  useAddressedTranslation: () => ({
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
// The start-mode choice belongs to the LIVE path (the one that actually builds a Journey).
jest.mock('@/core/config/featureFlags', () => ({ featureFlags: { liveCoach: true } }));

const goalSpec = { title: 'Run 5km', domain: 'general' } as unknown as GoalSpec;
jest.mock('@/components/coach/useLiveCoach', () => ({
  useLiveCoach: () => ({
    items: [],
    question: undefined,
    status: 'idle',
    goalSpec,
    handoff: false,
    awaitingOpening: false,
    sendOpening: jest.fn(),
    selectSingle: jest.fn(),
    selectMulti: jest.fn(),
    answerOther: jest.fn(),
  }),
}));

const mockApp: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AppProvider', () => ({ useApp: () => mockApp.current }));

// react-test-renderer ships no types; type just the surface used here.
interface TestInstance {
  findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[];
}
interface TestRoot {
  root: TestInstance;
  toJSON(): unknown;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const json = (r: TestRoot) => JSON.stringify(r.toJSON());
const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });

function setApp(capReached = false) {
  const core = {
    createJourneyFromGoalSpec: jest.fn((_spec: GoalSpec, _start: JourneyStart) => ({
      id: 'j1',
      title: 'Run 5km',
    })),
  };
  mockApp.current = {
    core,
    snapshot: { journeys: [], dreams: [], futureCapacity: { capReached } },
  };
  return core;
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(CoachScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

/** Tap an option card / CTA by its accessibility label (the composite comes first). */
async function tap(r: TestRoot, label: string) {
  await act(async () => {
    byLabel(r, label)[0].props.onPress();
  });
}

describe('Coach — choosing when the approved Journey begins (§5)', () => {
  it('offers the three modes as option cards once there is a plan, defaulting to Start now', async () => {
    const core = setApp();
    const r = await render();

    const shown = json(r);
    expect(shown).toContain('start.prompt');
    expect(shown).toContain('start.now');
    expect(shown).toContain('start.scheduled');
    expect(shown).toContain('start.manual');
    // No date block until "Pick a date" is chosen, and nothing is built by merely showing the cards.
    expect(shown).not.toContain('start.datePrompt');
    expect(core.createJourneyFromGoalSpec).not.toHaveBeenCalled();

    await tap(r, 'build');
    expect(core.createJourneyFromGoalSpec).toHaveBeenCalledWith(goalSpec, { mode: 'now' });
  });

  it('builds a manual-start Future Journey when "Start when I\'m ready" is chosen', async () => {
    const core = setApp();
    const r = await render();

    await tap(r, 'start.manual');
    // Choosing only records the choice — the Build CTA is still what creates the Journey.
    expect(core.createJourneyFromGoalSpec).not.toHaveBeenCalled();

    await tap(r, 'build');
    expect(core.createJourneyFromGoalSpec).toHaveBeenCalledWith(goalSpec, { mode: 'manual' });
  });

  it('reveals the day presets for "Pick a date" and builds a scheduled Future Journey', async () => {
    const core = setApp();
    const r = await render();

    await tap(r, 'start.scheduled');
    expect(json(r)).toContain('start.datePrompt');
    expect(json(r)).toContain('start.presets.week');

    await tap(r, 'start.presets.month');
    await tap(r, 'build');

    const start = core.createJourneyFromGoalSpec.mock.calls[0][1];
    if (start.mode !== 'scheduled') throw new Error(`expected a scheduled start, got ${start.mode}`);
    expect(start.at).toBe(startInstantInDays(30, Date.now()));
    expect(typeof start.timeZone).toBe('string');
  });

  it('at the cap: the two future cards are disabled and say why, and Start now still builds', async () => {
    const core = setApp(true);
    const r = await render();

    const shown = json(r);
    expect(shown).toContain(`start.full|{\\"max\\":${FUTURE_JOURNEY_POLICY.max}}`);
    expect(byLabel(r, 'start.scheduled')[0].props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(byLabel(r, 'start.now')[0].props.accessibilityState).toMatchObject({ disabled: false });

    // A disabled card is inert: no selection, no date block, no error.
    await tap(r, 'start.scheduled');
    expect(json(r)).not.toContain('start.datePrompt');

    await tap(r, 'build');
    expect(core.createJourneyFromGoalSpec).toHaveBeenCalledWith(goalSpec, { mode: 'now' });
  });
});
