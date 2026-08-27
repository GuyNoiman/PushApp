/**
 * The Settings identity row — a SUGGESTION is never rendered as the account's name.
 *
 * ── THE DEVICE REPORT (2026-08-27) ─────────────────────────────────────────────────────────────
 *
 * Settings showed `@quiet-otter-9019`. My Profile, in the same app, showed `kind-fox-6226`. Neither
 * existed on the server, so the partner searching for either found nothing — correctly. Three
 * screens each generated their own random name and rendered it under "this is how friends find
 * you", so the person believed they had a handle when nothing about them existed.
 *
 * The rule these tests hold: with no saved handle, the row says there is none. A name somebody has
 * not chosen is not their name.
 */
import { createElement, type ReactElement } from 'react';

import { ProfileIdentity } from '../ProfileIdentity';

jest.mock('@/global.css', () => ({}));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#111' }) }));
jest.mock('i18next', () => ({ __esModule: true, default: { language: 'en' } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/i18n/useAddressedTranslation', () => ({
  useAddressedTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('@/core/profile/simulatedUser', () => ({
  getSimulatedUser: () => ({ signedIn: false, name: null, email: null }),
}));

const mockSocial: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/SocialProvider', () => ({ useSocial: () => mockSocial.current }));

interface Node { props: Record<string, any> }
interface TestRoot { root: { findAllByProps(p: Record<string, unknown>): Node[] }; toJSON(): any }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void): void } = require('react-test-renderer');

function render(handle: string | null) {
  mockSocial.current = {
    profile: handle ? { id: 'u1', handle, buddySummary: {} } : null,
    setHandle: jest.fn(),
  };
  let root!: TestRoot;
  TestRenderer.act(() => {
    root = TestRenderer.create(createElement(ProfileIdentity));
  });
  return root;
}

/** Every string rendered anywhere in the tree. */
const textOf = (root: TestRoot) => JSON.stringify(root.toJSON());

describe('the identity row never invents a username', () => {
  it('shows the saved handle when there is one', () => {
    expect(textOf(render('liam'))).toContain('@liam');
  });

  it('says there is NONE rather than showing a generated one', () => {
    const shown = textOf(render(null));
    expect(shown).toContain('profile.usernameNotSet');
    // The generator makes `adjective-animal-####`. Nothing of that shape may reach the screen.
    expect(shown).not.toMatch(/@[a-z]+-[a-z]+-\d{4}/);
  });

  it('is STABLE across screens — two renders with nothing saved agree', () => {
    // The old code generated per screen and per mount, which is exactly how one app showed two
    // different names for one person.
    expect(textOf(render(null))).toBe(textOf(render(null)));
  });
});
