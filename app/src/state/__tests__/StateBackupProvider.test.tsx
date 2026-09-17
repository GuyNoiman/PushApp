/**
 * StateBackupProvider — restore per account, no write before the restore, no anonymous backups.
 *
 * THE DEFECTS (found 2026-09-17, `04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md`):
 *  · the restore check ran once per app life, and that once was spent on the anonymous session opened
 *    at launch — a later Apple or Google sign-in was never checked, so a new phone never restored;
 *  · a backup write could land before the check and replace the account's real backup;
 *  · anonymous accounts were backed up to rows no reinstall could ever reach again.
 *
 * The gateway, the core and the session are fakes; the restore and debounce rules are the real ones.
 */
import { createElement, type ReactElement } from 'react';

import type { StateBackup } from '@/core/backup';

type FakeUser = { id: string; isAnonymous: boolean; providers: string[] };

const mockGateway = {
  enabled: true,
  fetch: jest.fn<Promise<StateBackup | null>, [string?]>(async () => null),
  save: jest.fn<Promise<number>, [string, number, string?, string?]>(async () => Date.now()),
  clear: jest.fn(async () => undefined),
};

let mockUser: FakeUser | null = null;
let mockJourneys: unknown[] = [];
const mockListeners = new Set<() => void>();
const mockCore = {
  getSnapshot: () => ({ journeys: mockJourneys }),
  backupStateJson: () => JSON.stringify({ journeys: mockJourneys }),
  restoreFromBackup: jest.fn(async (_json: string) => true),
  subscribe: (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
};

jest.mock('@/core/backup', () => ({
  ...jest.requireActual('@/core/backup/backupPolicy'),
  getStateBackupGateway: () => mockGateway,
}));
jest.mock('@/state/AppProvider', () => ({ useApp: () => ({ core: mockCore, ready: true }) }));
jest.mock('@/state/AuthProvider', () => ({ useAuth: () => ({ user: mockUser }) }));

import { StateBackupProvider, useStateBackup, type StateBackupControls } from '../StateBackupProvider';

interface TestRoot {
  update(e: ReactElement): void;
  unmount(): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: { create(e: ReactElement): TestRoot; act(cb: () => void | Promise<void>): Promise<void> } =
  require('react-test-renderer');
const { act } = TestRenderer;

const anonymous: FakeUser = { id: 'anon-1', isAnonymous: true, providers: ['anonymous'] };
const apple: FakeUser = { id: 'apple-1', isAnonymous: false, providers: ['apple'] };
const google: FakeUser = { id: 'google-1', isAnonymous: false, providers: ['google'] };

let controls!: StateBackupControls;
function Probe() {
  controls = useStateBackup();
  return null;
}
const tree = () => createElement(StateBackupProvider, null, createElement(Probe));

let root: TestRoot | undefined;
async function mountAs(user: FakeUser | null) {
  mockUser = user;
  await act(async () => {
    root = TestRenderer.create(tree());
  });
}
async function becomes(user: FakeUser | null) {
  mockUser = user;
  await act(async () => root!.update(tree()));
}
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}
function change() {
  for (const listener of mockListeners) listener();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockGateway.fetch.mockImplementation(async () => null);
  mockGateway.save.mockImplementation(async () => Date.now());
  mockJourneys = [];
  mockListeners.clear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  jest.useRealTimers();
});

describe('the restore check belongs to an account, not to the app launch', () => {
  it('runs for the real account that signs in after the anonymous launch session', async () => {
    await mountAs(anonymous);
    expect(mockGateway.fetch).not.toHaveBeenCalled();

    await becomes(apple);
    expect(mockGateway.fetch).toHaveBeenCalledTimes(1);
    expect(mockGateway.fetch).toHaveBeenCalledWith('apple-1');
  });

  it('restores the new account onto an empty device', async () => {
    mockGateway.fetch.mockResolvedValue({ state: '{"journeys":[1]}', schemaVersion: 1, updatedAt: 1 });
    await mountAs(anonymous);
    await becomes(apple);
    expect(mockCore.restoreFromBackup).toHaveBeenCalledWith('{"journeys":[1]}');
  });

  it('runs again when one real account is replaced by another', async () => {
    await mountAs(apple);
    await becomes(google);
    expect(mockGateway.fetch.mock.calls.map((call) => call[0])).toEqual(['apple-1', 'google-1']);
  });

  it('does not run again for the same account on a token refresh', async () => {
    await mountAs(apple);
    await becomes({ ...apple });
    expect(mockGateway.fetch).toHaveBeenCalledTimes(1);
  });

  it('restoreNow runs the check again on request', async () => {
    await mountAs(apple);
    await act(async () => {
      await controls.restoreNow();
    });
    expect(mockGateway.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('nothing is written before the restore check has finished', () => {
  it('holds every write while the server has not answered, then writes for that account', async () => {
    const answer = deferred<StateBackup | null>();
    mockGateway.fetch.mockImplementation(() => answer.promise);
    mockJourneys = [{ id: 'j1' }];
    await mountAs(apple);

    change();
    await advance(10 * 60_000); // well past the debounce AND the max age
    expect(mockGateway.save).not.toHaveBeenCalled();

    await act(async () => {
      answer.resolve({ state: '{"journeys":[]}', schemaVersion: 1, updatedAt: 1 });
    });
    expect(mockCore.restoreFromBackup).not.toHaveBeenCalled(); // this device has its own Journeys

    change();
    await advance(60_000);
    expect(mockGateway.save).toHaveBeenCalled();
    expect(mockGateway.save.mock.calls[0][3]).toBe('apple-1');
  });

  it('keeps writes off after a failed check, and retries the check later', async () => {
    mockGateway.fetch.mockRejectedValueOnce(new Error('offline'));
    await mountAs(apple);

    change();
    await advance(30_000);
    expect(mockGateway.save).not.toHaveBeenCalled();

    await advance(60_000);
    expect(mockGateway.fetch).toHaveBeenCalledTimes(2);
    change();
    await advance(30_000);
    expect(mockGateway.save).toHaveBeenCalled();
  });

  it('does not restore into a device whose sign-out began while the server was answering', async () => {
    const answer = deferred<StateBackup | null>();
    mockGateway.fetch.mockImplementation(() => answer.promise);
    await mountAs(apple);

    controls.suspendWrites();
    await act(async () => {
      answer.resolve({ state: '{"journeys":[1]}', schemaVersion: 1, updatedAt: 1 });
    });
    expect(mockCore.restoreFromBackup).not.toHaveBeenCalled();
  });
});

describe('anonymous accounts are never backed up', () => {
  it('neither fetches nor writes, however much changes', async () => {
    mockJourneys = [{ id: 'j1' }];
    await mountAs(anonymous);
    change();
    await advance(10 * 60_000);
    expect(mockGateway.fetch).not.toHaveBeenCalled();
    expect(mockGateway.save).not.toHaveBeenCalled();
    await expect(controls.flushNow()).resolves.toBe('nothingToBackUp');
  });
});

describe('the controls sign-out uses', () => {
  it('flushNow writes at once for a checked account', async () => {
    await mountAs(apple);
    let outcome: string | undefined;
    await act(async () => {
      outcome = await controls.flushNow();
    });
    expect(outcome).toBe('saved');
    expect(mockGateway.save).toHaveBeenCalledWith(expect.any(String), 1, undefined, 'apple-1');
  });

  it('flushNow reports a refused write as failed', async () => {
    await mountAs(apple);
    mockGateway.save.mockRejectedValueOnce(new Error('offline'));
    let outcome: string | undefined;
    await act(async () => {
      outcome = await controls.flushNow();
    });
    expect(outcome).toBe('failed');
  });

  it('suspendWrites stops writes for the account signed in', async () => {
    await mountAs(apple);
    controls.suspendWrites();
    change();
    await advance(10 * 60_000);
    expect(mockGateway.save).not.toHaveBeenCalled();
    await expect(controls.flushNow()).resolves.toBe('failed');
  });

  it('the suspension ends with that account: the next one gets its own check and its own writes', async () => {
    await mountAs(apple);
    controls.suspendWrites();
    await becomes(anonymous);
    await becomes(google);
    expect(mockGateway.fetch).toHaveBeenLastCalledWith('google-1');
    change();
    await advance(60_000);
    expect(mockGateway.save).toHaveBeenCalledWith(expect.any(String), 1, undefined, 'google-1');
  });
});
