/**
 * Journey detail — a Step that NAMES a screen opens it from here too.
 *
 * The behaviour shipped on Home only, so the identical Step of the "Getting to know PushApp"
 * Journey went nowhere when it was reached the obvious way: open the Journey, tap the Step. This
 * pins the fix on THIS surface — the linked row navigates, and an ordinary row is left exactly as
 * it was (read-only here; reporting lives on Home).
 *
 * `t` is stubbed to echo its key; theme, safe-area and the heavier child cards are stubbed so the
 * screen renders without their providers — same setup as the other detail tests.
 */
import { createElement, type ReactElement } from 'react';

import JourneyDetailScreen from '../[id]';
import type { Journey, Step } from '@/core/types/domain';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock('@/global.css', () => ({}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'j1' }),
  useRouter: () => ({
    push: (href: string) => mockPush(href),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
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
jest.mock('@/components/journey/JourneyReminderCard', () => ({ JourneyReminderCard: () => null }));
jest.mock('@/components/journey/JourneySupportCircle', () => ({ JourneySupportCircle: () => null }));
jest.mock('@/components/journey/JourneyDreamLink', () => ({ JourneyDreamLink: () => null }));
jest.mock('@/components/celebration/FinalStepConfirmSheet', () => ({
  FinalStepConfirmSheet: () => null,
}));
jest.mock('@/state/SocialProvider', () => ({
  useSocial: () => ({ enabled: false, closeJourneyInvites: jest.fn(async () => {}) }),
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

const byLabel = (r: TestRoot, label: string) =>
  r.root.findAllByProps({ accessibilityLabel: label });
/** The stubbed `t()` output for the row's "open this Step" label. */
const openLabel = (title: string) => `detail.openStepA11y|${JSON.stringify({ title })}`;

/** `plannedFor` is today on every Step, and the Journey starts today, so the week pager opens on
 *  the week that holds them all — otherwise it lands on the LAST week and shows one Step. */
const NOW = Date.now();

function step(id: string, title: string, over: Partial<Step> = {}): Step {
  return {
    id,
    title,
    isStarterStep: false,
    cadence: 'once',
    done: false,
    plannedFor: NOW,
    ...over,
  };
}

/** The intro Journey as the engine stores it: two linked Steps and one ordinary one. */
function introJourney(): Journey {
  return {
    id: 'j1',
    title: 'Getting to know PushApp',
    why: [],
    durationDays: 14,
    rhythm: 'few-times-week',
    steps: [
      step('s1', 'Tell us who you are', { appLink: '/settings/profile' }),
      step('s2', 'Set your Active Hours', { appLink: '/settings/active-hours' }),
      step('s3', 'Look around the Tools'),
    ],
    createdAt: NOW,
  };
}

function setApp(j: Journey) {
  const core = {
    getReasonLog: () => [],
    noteJourneyViewed: jest.fn(),
    getStepStatus: () => 'unreported',
    willCompleteJourney: () => false,
    startJourneyNow: jest.fn(() => j),
    abandonJourney: jest.fn(() => j),
    deleteJourney: jest.fn(() => true),
    freezeJourney: jest.fn(() => j),
    resumeJourney: jest.fn(() => j),
    checkInStep: jest.fn(),
    linkJourneyToDream: jest.fn(),
  };
  mockApp.current = { core, snapshot: { journeys: [j], dreams: [] } };
  return core;
}

async function render(): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(createElement(JourneyDetailScreen));
  });
  if (!r) throw new Error('render failed');
  return r;
}

beforeEach(() => mockPush.mockReset());

describe('Journey detail — a Step that names a screen opens it', () => {
  it('takes a tap on a linked Step to that screen', async () => {
    setApp(introJourney());
    const r = await render();

    const row = byLabel(r, openLabel('Tell us who you are'));
    expect(row).not.toHaveLength(0);
    await act(async () => {
      row[0].props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith('/settings/profile');
  });

  it('sends each linked Step to its OWN screen, not the first one', async () => {
    setApp(introJourney());
    const r = await render();

    await act(async () => {
      byLabel(r, openLabel('Set your Active Hours'))[0].props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith('/settings/active-hours');
  });

  it('leaves a Step with no link exactly as it was — nothing to tap, and nowhere to go', async () => {
    setApp(introJourney());
    const r = await render();

    // Still listed, still readable — it simply does not promise a tap this screen cannot answer.
    expect(JSON.stringify(r.toJSON())).toContain('Look around the Tools');
    expect(byLabel(r, openLabel('Look around the Tools'))).toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('never hands the router a destination outside the app', async () => {
    setApp({
      ...introJourney(),
      steps: [step('s1', 'Off to the web', { appLink: 'https://example.com' })],
    });
    const r = await render();

    // Not tappable at all: an external link is read as NO link, so the row stays an ordinary row.
    expect(byLabel(r, openLabel('Off to the web'))).toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
