/**
 * useServerConnection — the one place a screen learns that this device holds NO session, and the one
 * way it asks for one again.
 *
 * WHY IT IS TESTED THIS CAREFULLY. This is the fix for a failure that hid for days: no device could
 * get an anonymous session, everything that needed one failed, and nothing on screen ever said so.
 * The two ways to reintroduce that bug are (a) reporting "disconnected" on a build that simply has
 * no backend, which would put a permanent false alarm in front of every offline user, and (b) a
 * retry button that does not actually retry. Both are pinned below.
 */
import { createElement, type ReactElement } from 'react';

import { useServerConnection, type ServerConnection } from '../useServerConnection';

const mockAuth: { current: Record<string, unknown> } = { current: {} };
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => mockAuth.current }));

// react-test-renderer ships no types; type just the surface used here.
interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(cb: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

function render(): { result: { current: ServerConnection }; unmount: () => void } {
  const result: { current: ServerConnection } = { current: undefined as unknown as ServerConnection };
  function Probe() {
    result.current = useServerConnection();
    return null;
  }
  let renderer!: { unmount(): void };
  void act(() => {
    renderer = TestRenderer.create(createElement(Probe));
  });
  return { result, unmount: () => void act(() => renderer.unmount()) };
}

describe('useServerConnection', () => {
  it('reports disconnected when the build HAS a backend and there is no session', () => {
    mockAuth.current = { enabled: true, status: 'signedOut', ensureSession: jest.fn() };
    const { result, unmount } = render();
    expect(result.current.disconnected).toBe(true);
    unmount();
  });

  it('is NOT disconnected on a build with no backend at all', () => {
    // A local-only build is not broken, it is local. Claiming otherwise would put a false alarm in
    // front of every user of a build that works exactly as designed.
    mockAuth.current = { enabled: false, status: 'signedOut', ensureSession: jest.fn() };
    const { result, unmount } = render();
    expect(result.current.disconnected).toBe(false);
    unmount();
  });

  it('is NOT disconnected while the session is still being bootstrapped', () => {
    // 'loading' is the normal cold start. Warning during it would make the line flash on every launch.
    mockAuth.current = { enabled: true, status: 'loading', ensureSession: jest.fn() };
    const { result, unmount } = render();
    expect(result.current.disconnected).toBe(false);
    unmount();
  });

  it('is NOT disconnected once a session exists, anonymous or signed in', () => {
    for (const status of ['anonymous', 'authenticated']) {
      mockAuth.current = { enabled: true, status, ensureSession: jest.fn() };
      const { result, unmount } = render();
      expect(result.current.disconnected).toBe(false);
      unmount();
    }
  });

  it('retry really asks for a session again, and reports while it is working', async () => {
    let release: () => void = () => {};
    const ensureSession = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    mockAuth.current = { enabled: true, status: 'signedOut', ensureSession };
    const { result, unmount } = render();

    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.retry();
    });
    expect(ensureSession).toHaveBeenCalledTimes(1);
    expect(result.current.retrying).toBe(true);

    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.retrying).toBe(false);
    unmount();
  });
});
