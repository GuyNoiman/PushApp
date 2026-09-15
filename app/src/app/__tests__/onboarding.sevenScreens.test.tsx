/**
 * The first run, walked end to end, in both languages — the founder's seven approved screens
 * (`04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`).
 *
 * ── WHY THIS TEST USES THE REAL TRANSLATIONS ───────────────────────────────────────────────────
 *
 * Every other test in this folder stubs `t` to echo its key, which is right for testing navigation
 * and wrong for testing COPY: a key that echoes proves nothing about whether a Hebrew string
 * exists, and a first run half-translated is a first run that fails in the one language most of its
 * users read. So this file loads the real i18next instance and walks the flow twice, once per
 * language, asserting each screen by the words the founder approved.
 *
 * It also pins the two things that are easy to break silently:
 *  - **The pager reads as SEVEN** on every one of the seven, and the language choice has no dots at
 *    all — it precedes them (founder, 2026-09-15).
 *  - **`⟨PRODUCT⟩` is interpolated**, never rendered raw. The name is being replaced (D107); a
 *    literal `{{product}}` on the welcome screen is what a missed interpolation looks like.
 *
 * What it does NOT cover, because a renderer cannot: RTL mirroring and the light/dark pass, which
 * are device/preview checks.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/global.css', () => ({}));

import { createElement, type ReactElement } from 'react';

import i18n, { changeLanguage } from '@/i18n';
import { ONBOARDING_PAGER_STEPS } from '@/core/onboarding/questions';
import { HandoffPage } from '@/components/onboarding/FirstRunTail';
import OnboardingScreen from '../onboarding';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: (path: string) => mockReplace(path) },
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/state/LanguagePreference', () => ({
  useLanguagePreference: () => ({ language: 'en', setLanguage: jest.fn(), pendingRestart: false }),
}));
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => ({ profile: null }) }));
// A build that can sign nobody in — the only path that leaves the mandatory account screen without
// a session (see AccountStep). It is what lets one render walk all seven without a live backend.
jest.mock('@/state/AuthProvider', () => ({
  useAuth: () => ({
    enabled: false,
    status: 'anonymous',
    error: null,
    signInWithApple: jest.fn(),
    signInWithGoogle: jest.fn(),
  }),
}));
jest.mock('@/core/auth/nativeIdentity', () => ({
  isAppleSignInAvailable: async () => false,
  isGoogleSignInAvailable: () => false,
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

/** `t` bound to the onboarding namespace, outside React. */
const T = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'onboarding', ...opts }) as string;

function setApp(step: string) {
  const core = {
    getOnboardingStep: () => step,
    getOnboardingAnswers: () => ({ selections: {}, freeText: {}, skipped: [] }),
    saveOnboardingProgress: jest.fn(),
    completeOnboarding: jest.fn(),
    initReminders: jest.fn(async () => {}),
  };
  mockApp.current = { core };
  return core;
}

async function render(element: ReactElement): Promise<TestRoot> {
  let r: TestRoot | undefined;
  await act(async () => {
    r = TestRenderer.create(element);
  });
  if (!r) throw new Error('render failed');
  return r;
}

/** Tap something by its accessibility label, then let a deferred navigation run. */
async function tap(r: TestRoot, label: string) {
  const hits = r.root.findAllByProps({ accessibilityLabel: label });
  if (hits.length === 0) throw new Error(`nothing labelled "${label}" is on screen`);
  await act(async () => {
    hits[0].props.onPress();
  });
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

/** Every string rendered on the current screen, flattened. */
function textOf(r: TestRoot): string {
  const walk = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join(' ');
    if (node && typeof node === 'object' && 'children' in (node as Record<string, unknown>)) {
      return walk((node as { children: unknown }).children);
    }
    return '';
  };
  return walk(r.toJSON());
}

/** The pager's own label ("Screen 3 of 7"), or null when the screen carries no dots. */
function pagerLabel(r: TestRoot): string | null {
  const hit = r.root.findAllByProps({ accessibilityRole: 'progressbar' })[0];
  return hit ? (hit.props.accessibilityLabel as string) : null;
}

beforeEach(() => {
  mockReplace.mockClear();
});

describe.each(['he', 'en'] as const)('the first run in %s', (lang) => {
  beforeEach(async () => {
    await act(async () => {
      await changeLanguage(lang);
    });
  });

  it('walks all seven approved screens in order, from the language choice to the conversation', async () => {
    const core = setApp('language');
    const r = await render(createElement(OnboardingScreen));

    // STEP ZERO — the language, before anything is said in one. No pager: it is the door, not the
    // first room, and the pack's seven screens have to keep reading as seven.
    expect(textOf(r)).toContain(T('language.title'));
    expect(pagerLabel(r)).toBeNull();
    await tap(r, T('language.continue'));

    // 01 · WELCOME. The product is named through one interpolation, never rendered raw.
    expect(textOf(r)).toContain(T('flow.welcome.kicker'));
    expect(textOf(r)).toContain(T('flow.welcome.titleAccent'));
    expect(textOf(r)).not.toContain('{{product}}');
    expect(textOf(r)).toContain('PushApp');
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 1, total: 7 }));
    // The secondary is a real route to the account screen, and it is on this screen.
    expect(r.root.findAllByProps({ accessibilityLabel: T('flow.welcome.secondary') }).length).toBeGreaterThan(0);
    await tap(r, T('flow.welcome.primary'));

    // 02 · PURPOSE, with its four bullets. The fourth is the Support Circle, promised on the second
    // screen of the product — if it ever stops being there, this fails rather than quietly shrinking.
    const bullets = i18n.t('flow.purpose.bullets', { ns: 'onboarding', returnObjects: true }) as string[];
    expect(bullets).toHaveLength(4);
    for (const bullet of bullets) expect(textOf(r)).toContain(bullet);
    expect(textOf(r)).toContain(T('flow.purpose.footer'));
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 2, total: 7 }));
    await tap(r, T('flow.purpose.primary'));

    // 03 · PREPARE — the pull quote and the two meta lines.
    expect(textOf(r)).toContain(T('flow.prepare.quote'));
    expect(textOf(r)).toContain(T('flow.prepare.metaPace'));
    expect(textOf(r)).toContain(T('flow.prepare.metaInput'));
    expect(textOf(r)).not.toContain('{{product}}');
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 3, total: 7 }));
    await tap(r, T('flow.prepare.primary'));

    // 04 · ACCOUNT — mandatory (D104). It persisted the step and did NOT navigate anywhere.
    expect(core.saveOnboardingProgress).toHaveBeenCalledWith('account', expect.anything());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(textOf(r)).toContain(T('flow.account.title'));
    // The legal line reassembles into exactly the approved sentence, with both links present.
    const legal =
      T('flow.account.legalPrefix') +
      T('flow.account.legalTerms') +
      T('flow.account.legalAnd') +
      T('flow.account.legalPrivacy') +
      T('flow.account.legalSuffix');
    // Whitespace-insensitive: `textOf` joins sibling nodes with a space, and the five pieces render
    // as one contiguous sentence on screen.
    const squash = (text: string) => text.replace(/\s+/g, '');
    expect(squash(textOf(r))).toContain(squash(legal));
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 4, total: 7 }));

    // 05 · CONVERSATION lives on /coach. Leaving persists it, so a device closed mid-conversation
    // comes back to the launcher rather than to the top of the flow.
    await tap(r, T('flow.account.unavailableContinue'));
    expect(core.saveOnboardingProgress).toHaveBeenLastCalledWith('conversation', expect.anything());
    expect(mockReplace).toHaveBeenCalledWith('/coach?firstRun=1');
    // Nothing completed onboarding on the way: that happens only once a Journey exists.
    expect(core.completeOnboarding).not.toHaveBeenCalled();
  });

  it('shows the handoff and the first Journey as screens 6 and 7, then lands in the app', async () => {
    // Both normally render from the coach's tail, after the gate has closed. Resuming onto one — the
    // app was closed between the Journey being built and the person seeing it — must still work.
    setApp('handoff');
    const r = await render(createElement(OnboardingScreen));

    // 06 · HANDOFF.
    expect(textOf(r)).toContain(T('flow.handoff.title'));
    expect(textOf(r)).toContain(T('flow.handoff.footer'));
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 6, total: 7 }));
    await tap(r, T('flow.handoff.primary'));

    // 07 · FIRST JOURNEY — the intro Journey, rendered from the very keys the Journey is built from,
    // so this screen cannot promise a Step that does not exist.
    const steps = i18n.t('introJourney.steps', { ns: 'onboarding', returnObjects: true }) as {
      title: string;
      description: string;
    }[];
    expect(textOf(r)).toContain(T('introJourney.title'));
    for (const step of steps) expect(textOf(r)).toContain(step.title);
    // The count in the body line is the REAL number of Steps, not a number written into the copy.
    expect(textOf(r)).toContain(T('flow.firstJourney.body', { steps: steps.length }));
    expect(textOf(r)).toContain(T('flow.firstJourney.cardCount', { current: 1, total: steps.length }));
    expect(textOf(r)).not.toContain('{{product}}');
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 7, total: 7 }));

    await tap(r, T('flow.firstJourney.primary'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('greets a person the conversation never named with a finished sentence', async () => {
    // The approved kicker is "It's good to know you, ⟨name⟩", and today the first run captures no
    // name at all — the profile page left the flow and the introduction does not ask. A blank, a
    // dangling comma, or the word "undefined" would each be worse than not using the name.
    const withName = await render(createElement(HandoffPage, { name: 'Dana', onContinue: jest.fn() }));
    expect(textOf(withName)).toContain(T('flow.handoff.kicker', { name: 'Dana' }));

    for (const missing of [undefined, '', '   '] as const) {
      const without = await render(createElement(HandoffPage, { name: missing, onContinue: jest.fn() }));
      expect(textOf(without)).toContain(T('flow.handoff.kickerNoName'));
      expect(textOf(without)).not.toContain('undefined');
      expect(textOf(without)).not.toContain('{{name}}');
    }
  });
});

describe('the pager and the sequence cannot drift apart', () => {
  it('counts exactly the seven approved screens', () => {
    expect(ONBOARDING_PAGER_STEPS).toEqual([
      'welcome',
      'purpose',
      'prepare',
      'account',
      'conversation',
      'handoff',
      'firstJourney',
    ]);
  });
});
