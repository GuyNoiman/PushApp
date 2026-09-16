/**
 * Sign-in is COUNTED where it happens (founder, 2026-09-16).
 *
 * The mapping itself is pinned in `core/auth/__tests__/signInKpi.test.ts`. This pins the wiring: that
 * every press produces an attempt, that each outcome lands under the provider pressed, and that an
 * error's message reaches NEITHER the KPI stream NOR the screen. Until 2026-09-16 the screen was given
 * the message and showed it (Google's DEVELOPER_ERROR line, on the partner's Android); what the screen
 * gets now is a provider and a word from a closed set.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createElement, type ReactElement } from 'react';

import { AuthNotAvailableError, AuthTokenRejectedError } from '@/core/auth/AuthGateway';
import { SignInCancelledError } from '@/core/auth/nativeIdentity';
import { appKpi } from '@/core/kpi/appKpi';
import type { KpiInput } from '@/core/kpi/KpiGateway';
import { AuthProvider, useAuth } from '../AuthProvider';

const user = { id: 'uid-1', isAnonymous: false, providers: ['apple'] };
const mockGateway = {
  enabled: true,
  ensureSession: jest.fn(async () => ({ id: 'anon', isAnonymous: true, providers: ['anonymous'] })),
  getCurrentUser: jest.fn(async () => null),
  onAuthChange: jest.fn(() => () => undefined),
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(async () => undefined),
  deleteAccount: jest.fn(async () => undefined),
};
jest.mock('@/core/auth', () => ({ getAuthGateway: () => mockGateway }));
jest.mock('@/core/social/backendHealth', () => ({ checkBackendHealth: async () => 'reachable' }));

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): unknown;
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

const sent: KpiInput[] = [];
appKpi.attach({ enabled: true, record: (input) => void sent.push(input) });

let auth: ReturnType<typeof useAuth> | null = null;
function Probe() {
  auth = useAuth();
  return null;
}

let mounted: { unmount(): void } | null = null;
async function mount() {
  await act(async () => {
    mounted = TestRenderer.create(createElement(AuthProvider, null, createElement(Probe))) as { unmount(): void };
  });
}

afterEach(async () => {
  await act(async () => mounted?.unmount());
  mounted = null;
});

const SECRET = 'apple: Passed nonce and nonce in id_token should either both exist or not. guy@example.com';

beforeEach(() => {
  sent.length = 0;
});

describe('every sign-in press is counted, by provider and outcome', () => {
  it('a success', async () => {
    mockGateway.signInWithApple.mockResolvedValueOnce(user);
    await mount();
    await act(async () => auth!.signInWithApple());
    expect(sent).toEqual([
      { name: 'sign_in_attempted', bucket: 'apple' },
      { name: 'sign_in_succeeded', bucket: 'apple' },
    ]);
  });

  it('a cancel, which is not a failure', async () => {
    mockGateway.signInWithGoogle.mockRejectedValueOnce(new SignInCancelledError());
    await mount();
    await act(async () => auth!.signInWithGoogle());
    expect(sent).toEqual([
      { name: 'sign_in_attempted', bucket: 'google' },
      { name: 'sign_in_cancelled', bucket: 'google' },
    ]);
    expect(auth!.signInFailure).toBeNull();
  });

  it.each([
    ['a server refusal', new AuthTokenRejectedError(SECRET), 'apple:rejected', 'failed'],
    ['an unavailable provider', new AuthNotAvailableError(SECRET), 'apple:unavailable', 'unavailable'],
    ['anything else', new Error(SECRET), 'apple:error', 'failed'],
  ])('%s, under its reason and never its message', async (_label, error, bucket, notice) => {
    mockGateway.signInWithApple.mockRejectedValueOnce(error);
    await mount();
    await act(async () => auth!.signInWithApple());
    expect(sent).toEqual([
      { name: 'sign_in_attempted', bucket: 'apple' },
      { name: 'sign_in_failed', bucket },
    ]);
    // The screen is told which sentence to say, never the message; the stream never carries it either.
    expect(auth!.signInFailure).toEqual({ provider: 'apple', notice });
    expect(JSON.stringify(auth)).not.toContain('nonce');
    expect(JSON.stringify(auth)).not.toContain('example.com');
    expect(JSON.stringify(sent)).not.toContain('nonce');
    expect(JSON.stringify(sent)).not.toContain('example.com');
  });
});
