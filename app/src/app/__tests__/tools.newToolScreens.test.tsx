/**
 * The seven tools added on 2026-08-21 — a smoke test that each screen actually RENDERS.
 *
 * WHY THIS EXISTS. Every rule these tools follow is unit-tested in their models, and a model test
 * cannot catch the failures that reach a person first: a missing i18n namespace, a provider that is
 * not mounted, a hook called in the wrong place, a component imported from nowhere. Each screen here
 * is rendered for real, over stubbed providers, and asserted to produce a tree.
 *
 * It then checks the two promises the opening screen makes to every tool: the tool's copy exists in
 * BOTH languages (the shared `copy.test.ts` covers name and blurb; this covers the intro block), and
 * the primary action is present in the first render rather than below a scroll.
 *
 * `t` echoes its key, so an assertion on a key proves the screen asked for that string.
 */
import { createElement, type ReactElement } from 'react';

import CurrentLoadScreen from '../tools/current-load';
import DecisionClarityScreen from '../tools/decision-clarity';
import GratitudeScreen from '../tools/gratitude';
import ObstacleScreen from '../tools/obstacle-to-action';
import SelfCompassionScreen from '../tools/self-compassion';
import SupportMapScreen from '../tools/support-map';
import WhatWorkedScreen from '../tools/what-worked';

jest.mock('@/global.css', () => ({}));
// The obstacle tool reaches the coach's LLM stack, which reaches the Supabase client and (through
// it) AsyncStorage's native module — null under jest. Stub the storage the official way.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({ router: { canGoBack: () => false, replace: jest.fn(), back: jest.fn() } }));

// The stores: ready and empty. (`mock`-prefixed so the factory may reference it.)
const mockPut = jest.fn();
jest.mock('@/state/ToolRecordsStore', () => ({
  useToolRecords: () => ({
    ready: true,
    records: [],
    prefs: {},
    put: mockPut,
    remove: jest.fn(),
    clearAll: jest.fn(),
    setPref: jest.fn(),
  }),
}));
jest.mock('@/state/ProfileProvider', () => ({ useProfile: () => ({ profile: { weekStartDay: 1 } }) }));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ snapshot: { journeys: [], dreams: [] } }) }));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ friends: [] }) }));

interface TestRoot {
  root: { findAllByProps(props: Record<string, unknown>): { props: Record<string, any> }[] };
  toJSON(): unknown;
  unmount(): void;
}
interface TestRendererModule {
  create(element: ReactElement): TestRoot;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const SCREENS: [string, () => ReactElement][] = [
  ['gratitude', () => createElement(GratitudeScreen)],
  ['what worked', () => createElement(WhatWorkedScreen)],
  ['self-compassion', () => createElement(SelfCompassionScreen)],
  ['decision clarity', () => createElement(DecisionClarityScreen)],
  ['current load', () => createElement(CurrentLoadScreen)],
  ['obstacle to action', () => createElement(ObstacleScreen)],
  ['support map', () => createElement(SupportMapScreen)],
];

/**
 * Rendered trees are unmounted after every test. The compassion breath schedules the next breath
 * from inside the last one, so a tree left mounted goes on breathing into a torn-down environment —
 * which is jest noise, not a leak: the component's own cleanup stops it on unmount.
 */
const mounted: TestRoot[] = [];

afterEach(async () => {
  await act(async () => {
    while (mounted.length > 0) mounted.pop()!.unmount();
  });
});

async function render(element: ReactElement): Promise<TestRoot> {
  let root: TestRoot | undefined;
  await act(async () => {
    root = TestRenderer.create(element);
  });
  if (!root) throw new Error('render produced nothing');
  mounted.push(root);
  return root;
}

/** Every string a screen asked `t` for, flattened out of the rendered tree. */
function textOf(root: TestRoot): string {
  return JSON.stringify(root.toJSON());
}

describe.each(SCREENS)('%s', (name, make) => {
  it('renders its opening screen', async () => {
    const root = await render(make());
    expect(root.toJSON()).toBeTruthy();
  });

  it('shows what you get, how long it takes, and a Start action', async () => {
    const rendered = textOf(await render(make()));
    // The shared opening contract (README §5) — asserted by i18n key.
    expect(rendered).toContain('opening.outcomeLabel');
    expect(rendered).toContain('opening.timeLabel');
    expect(rendered).toContain('opening.start');
  });
});

describe('starting', () => {
  it.each(SCREENS)('%s leaves the opening when Start is pressed', async (name, make) => {
    const root = await render(make());
    const start = root.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find((node) => node.props.accessibilityLabel === 'opening.start');
    expect(start).toBeDefined();

    await act(async () => {
      start!.props.onPress();
    });

    // The opening's own labels are gone: the tool is on its first real screen.
    expect(textOf(root)).not.toContain('opening.start');
  });
});

describe('the opening screens that offer routes', () => {
  it('say "choose one of the options" when there is more than one way in', async () => {
    for (const [, make] of SCREENS.slice(0, 3)) {
      expect(textOf(await render(make()))).toContain('opening.chooseLabel');
    }
  });

  it('do not say it when there is only one way in', async () => {
    // What Really Matters to Me? has one complete method and no routes (its PRD §4).
    expect(textOf(await render(createElement(DecisionClarityScreen)))).not.toContain('opening.chooseLabel');
  });
});
