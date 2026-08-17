/**
 * Journey creation wizard — the START MODE chosen at final approval (Future Journey Management, §5).
 *
 * Renders the REAL wizard over a mock AppCore (react-test-renderer) and walks it to the Summary
 * stage, where the question belongs — the moment the plan is approved. It pins:
 *
 *  · the DEFAULT is "Start now", so a user who never touches the row gets exactly today's behaviour:
 *    the unchanged `createJourney`, no Future facade, no start fields;
 *  · "Pick a date" creates a Future Journey with a real scheduled instant (a whole day ahead, at the
 *    policy hour) plus its time-zone context;
 *  · "Start when I'm ready" creates a Future Journey with NO date at all;
 *  · the date is chosen without any native picker: presets, then one day at a time either way;
 *  · at the Future cap the two "for later" chips are DISABLED with a calm explanation — never an
 *    error, never a silent failure, and "Start now" still works.
 *
 * `t` is stubbed to echo its key; theme and safe-area are stubbed so the wizard renders without them.
 */
import { createElement, type ReactElement } from 'react';

import NewJourneyScreen from '../new';
import { FUTURE_JOURNEY_POLICY } from '@/core/config/futureJourneys';
import type { NewJourneyInput } from '@/core/engines/JourneyEngine';
import { startInstantInDays } from '@/core/journeys/futureJourneys';
import type { JourneyStart } from '@/core/types/domain';

/** The two "for later" start modes — the only ones `createFutureJourney` ever receives. */
type FutureStart = Extract<JourneyStart, { mode: 'scheduled' | 'manual' }>;

// ── Mocks ──────────────────────────────────────────────────────────────────
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

const DAY = 24 * 60 * 60 * 1000;

function setApp(capReached = false) {
  const core = {
    createJourney: jest.fn((_input: NewJourneyInput) => ({ id: 'j_now', title: 'Run 5km' })),
    createFutureJourney: jest.fn((_input: NewJourneyInput, _start: FutureStart) => ({
      id: 'j_later',
      title: 'Run 5km',
    })),
    initReminders: jest.fn(async () => {}),
    setJourneyReminderFixed: jest.fn(async () => {}),
    // The wizard pre-selects its reminder slot from the account's Active Hours; an account with no
    // preference set is the default this fixture models.
    getSchedulingPrefs: jest.fn(() => ({ preferredDays: [], dayPart: 'either' as const })),
  };
  mockApp.current = {
    core,
    snapshot: { journeys: [], dreams: [], futureCapacity: { capReached } },
  };
  return core;
}

/** Render the wizard, name the Journey, and page through to the Summary stage. */
async function renderToSummary(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(NewJourneyScreen));
  });
  if (!r) throw new Error('render failed');

  // Stage 1 — Name. Open the row, type, then advance through the remaining stages.
  await act(async () => {
    byLabel(r!, 'new.name.editA11y|{"label":"new.name.label"}')[0].props.onPress();
  });
  await act(async () => {
    r!.root.findAllByProps({ placeholder: 'new.name.placeholder' })[0].props.onChangeText('Run 5km');
  });
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      byLabel(r!, 'next|{"ns":"common"}')[0].props.onPress();
    });
  }
  return r;
}

/** Narrow a recorded start to the scheduled mode, so its instant can be asserted. */
function scheduledStart(start: FutureStart): Extract<FutureStart, { mode: 'scheduled' }> {
  if (start.mode !== 'scheduled') throw new Error(`expected a scheduled start, got ${start.mode}`);
  return start;
}

/**
 * One ChoiceChips chip by its label. `findAllByProps` returns the composite AND the host node for the
 * same Pressable, so the first is taken.
 */
function chip(r: TestRoot, label: string) {
  return byLabel(r, label)[0];
}

describe('Journey wizard — the start mode at final approval (§5)', () => {
  it('defaults to Start now: doing nothing behaves exactly as it always has', async () => {
    const core = setApp();
    const r = await renderToSummary();

    expect(json(r)).toContain('new.start.label');
    await act(async () => {
      byLabel(r, 'new.createA11y')[0].props.onPress();
    });

    expect(core.createJourney).toHaveBeenCalledTimes(1);
    expect(core.createFutureJourney).not.toHaveBeenCalled();
    // The immediate path passes no start fields at all — the engine decides `active` from `now`.
    expect(core.createJourney.mock.calls[0][0]).toMatchObject({ title: 'Run 5km', createdVia: 'manual' });
  });

  it('"Start when I\'m ready" creates a Future Journey with no date', async () => {
    const core = setApp();
    const r = await renderToSummary();

    await act(async () => {
      chip(r, 'new.start.manual').props.onPress();
    });
    expect(json(r)).toContain('new.start.manualHint');

    await act(async () => {
      byLabel(r, 'new.createA11y')[0].props.onPress();
    });

    expect(core.createJourney).not.toHaveBeenCalled();
    expect(core.createFutureJourney).toHaveBeenCalledTimes(1);
    expect(core.createFutureJourney.mock.calls[0][1]).toEqual({ mode: 'manual' });
  });

  it('"Pick a date" creates a Future Journey scheduled a whole day ahead, with its zone context', async () => {
    const core = setApp();
    const r = await renderToSummary();

    await act(async () => {
      chip(r, 'new.start.scheduled').props.onPress();
    });
    await act(async () => {
      byLabel(r, 'new.createA11y')[0].props.onPress();
    });

    const start = scheduledStart(core.createFutureJourney.mock.calls[0][1]);
    // The default preset, resolved through the same pure helper the screen uses.
    const expected = startInstantInDays(FUTURE_JOURNEY_POLICY.startPresetDays[0], Date.now());
    expect(start.at).toBe(expected);
    expect(start.at).toBeGreaterThan(Date.now());
    expect(new Date(start.at).getHours()).toBe(FUTURE_JOURNEY_POLICY.defaultStartHour);
    expect(typeof start.timeZone).toBe('string');
  });

  it('picks the date with presets and one-day nudges — no native picker involved', async () => {
    const core = setApp();
    const r = await renderToSummary();

    await act(async () => {
      chip(r, 'new.start.scheduled').props.onPress();
    });
    // A preset, then one day later: the offsets compose.
    await act(async () => {
      chip(r, 'new.start.presets.month').props.onPress();
    });
    await act(async () => {
      byLabel(r, 'new.start.laterA11y')[0].props.onPress();
    });
    await act(async () => {
      byLabel(r, 'new.createA11y')[0].props.onPress();
    });

    const start = scheduledStart(core.createFutureJourney.mock.calls[0][1]);
    expect(start.at).toBe(startInstantInDays(31, Date.now()));
    expect(start.at - Date.now()).toBeGreaterThan(29 * DAY);
  });

  it('never nudges the start before tomorrow', async () => {
    const core = setApp();
    const r = await renderToSummary();

    await act(async () => {
      chip(r, 'new.start.scheduled').props.onPress();
    });
    // Down from the 7-day preset, well past the floor.
    for (let i = 0; i < 20; i++) {
      const earlier = byLabel(r, 'new.start.earlierA11y')[0];
      if (earlier.props.disabled) break;
      await act(async () => {
        earlier.props.onPress();
      });
    }
    await act(async () => {
      byLabel(r, 'new.createA11y')[0].props.onPress();
    });

    const start = scheduledStart(core.createFutureJourney.mock.calls[0][1]);
    expect(start.at).toBe(startInstantInDays(FUTURE_JOURNEY_POLICY.minScheduleDays, Date.now()));
  });

  it('at the cap: the two future chips are disabled with a calm line, and Start now still works', async () => {
    const core = setApp(true);
    const r = await renderToSummary();

    const shown = json(r);
    expect(shown).toContain('new.start.full');
    expect(chip(r, 'new.start.scheduled').props.accessibilityState).toMatchObject({ disabled: true });
    expect(chip(r, 'new.start.manual').props.accessibilityState).toMatchObject({ disabled: true });
    expect(chip(r, 'new.start.now').props.accessibilityState).toMatchObject({ disabled: false });

    // Tapping a disabled chip changes nothing — no selection, no date block, no error.
    await act(async () => {
      chip(r, 'new.start.scheduled').props.onPress();
    });
    expect(json(r)).not.toContain('new.start.presets');

    await act(async () => {
      byLabel(r, 'new.createA11y')[0].props.onPress();
    });
    expect(core.createJourney).toHaveBeenCalledTimes(1);
    expect(core.createFutureJourney).not.toHaveBeenCalled();
  });
});
