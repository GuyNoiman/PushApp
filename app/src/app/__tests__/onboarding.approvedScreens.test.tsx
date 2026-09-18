/**
 * The first run, walked end to end, in both languages — the founder's approved screens
 * (`04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`), which have been SIX since
 * screen 07 was dropped on 2026-09-18: the intro Journey is an ordinary Journey card on Home, not a
 * page of onboarding.
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
 *  - **The pager reads as SIX** on every one of the six, and the language choice has no dots at
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

  it('walks every approved screen in order, from the language choice to the conversation', async () => {
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
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 1, total: 6 }));
    // The secondary is a real route to the account screen, and it is on this screen.
    expect(r.root.findAllByProps({ accessibilityLabel: T('flow.welcome.secondary') }).length).toBeGreaterThan(0);
    await tap(r, T('flow.welcome.primary'));

    // 02 · PURPOSE, with its four bullets. The fourth is the Support Circle, promised on the second
    // screen of the product — if it ever stops being there, this fails rather than quietly shrinking.
    const bullets = i18n.t('flow.purpose.bullets', { ns: 'onboarding', returnObjects: true }) as string[];
    expect(bullets).toHaveLength(4);
    for (const bullet of bullets) expect(textOf(r)).toContain(bullet);
    expect(textOf(r)).toContain(T('flow.purpose.footer'));
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 2, total: 6 }));
    await tap(r, T('flow.purpose.primary'));

    // 03 · PREPARE — the pull quote and the two meta lines.
    expect(textOf(r)).toContain(T('flow.prepare.quote'));
    expect(textOf(r)).toContain(T('flow.prepare.metaPace'));
    expect(textOf(r)).toContain(T('flow.prepare.metaInput'));
    expect(textOf(r)).not.toContain('{{product}}');
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 3, total: 6 }));
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
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 4, total: 6 }));

    // 05 · CONVERSATION lives on /coach. Leaving persists it, so a device closed mid-conversation
    // comes back to the launcher rather than to the top of the flow.
    await tap(r, T('flow.account.unavailableContinue'));
    expect(core.saveOnboardingProgress).toHaveBeenLastCalledWith('conversation', expect.anything());
    expect(mockReplace).toHaveBeenCalledWith('/coach?firstRun=1');
    // Nothing completed onboarding on the way: that happens only once a Journey exists.
    expect(core.completeOnboarding).not.toHaveBeenCalled();
  });

  it('shows the handoff as the LAST screen, and its button goes to Home', async () => {
    // It normally renders from the coach's tail, after the gate has closed. Resuming onto it — the
    // app was closed between the Journey being built and the person seeing it — must still work.
    const core = setApp('handoff');
    const r = await render(createElement(OnboardingScreen));

    // 06 · HANDOFF, and there is no 07: the intro Journey is met on Home (founder, 2026-09-18).
    expect(textOf(r)).toContain(T('flow.handoff.title'));
    expect(textOf(r)).toContain(T('flow.handoff.footer'));
    expect(pagerLabel(r)).toBe(T('flow.pager', { current: 6, total: 6 }));

    await tap(r, T('flow.handoff.primary'));
    expect(mockReplace).toHaveBeenCalledWith('/');
    // Home is behind the first-run gate, so the button completes onboarding on its way — with the
    // intro Journey's content, which is what guarantees the Journey exists before Home is reached.
    // On the real path this already happened at the end of the conversation and the re-call is an
    // idempotent no-op; on a resumed device it is the thing that stops `/` bouncing straight back.
    expect(core.completeOnboarding).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: T('introJourney.title') }),
    );
    // Nothing on this screen is the intro Journey's own page any more.
    const steps = i18n.t('introJourney.steps', { ns: 'onboarding', returnObjects: true }) as {
      title: string;
      description: string;
    }[];
    for (const step of steps) expect(textOf(r)).not.toContain(step.title);
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
  it('counts exactly the screens the first run shows', () => {
    expect(ONBOARDING_PAGER_STEPS).toEqual([
      'welcome',
      'purpose',
      'prepare',
      'account',
      'conversation',
      'handoff',
    ]);
  });
});
