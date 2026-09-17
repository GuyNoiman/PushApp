/**
 * accountEntryStatus — "is the account I just signed into new or existing?" (plan 2026-09-17, Stage 0).
 *
 * Not wired to a screen yet; Stage 2 decides the account choice from it. What is pinned now is the
 * one property that decision depends on: a failure to ASK never reads as "a new account".
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockMaybeSingle = jest.fn();
const mockRpc = jest.fn((_name: string) => ({ maybeSingle: () => mockMaybeSingle() }));
jest.mock('../../social/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    rpc: (name: string) => mockRpc(name),
  },
}));

import { AuthNotAvailableError, NullAuthGateway } from '../AuthGateway';
import { SupabaseAuthGateway } from '../SupabaseAuthGateway';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SupabaseAuthGateway.accountEntryStatus', () => {
  it('calls the RPC and maps its row', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { created_now: false, has_backup: true, onboarding_complete: true },
      error: null,
    });
    await expect(new SupabaseAuthGateway().accountEntryStatus()).resolves.toEqual({
      createdNow: false,
      hasBackup: true,
      onboardingComplete: true,
    });
    expect(mockRpc).toHaveBeenCalledWith('account_entry_status');
  });

  it('reads a null column as false', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { created_now: true, has_backup: null, onboarding_complete: null },
      error: null,
    });
    await expect(new SupabaseAuthGateway().accountEntryStatus()).resolves.toEqual({
      createdNow: true,
      hasBackup: false,
      onboardingComplete: false,
    });
  });

  it('throws on a server error, rather than answering "new"', async () => {
    const err = new Error('function does not exist');
    mockMaybeSingle.mockResolvedValue({ data: null, error: err });
    await expect(new SupabaseAuthGateway().accountEntryStatus()).rejects.toBe(err);
  });

  it('throws when the server saw no session (no row)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(new SupabaseAuthGateway().accountEntryStatus()).rejects.toThrow('not signed in');
  });
});

describe('NullAuthGateway.accountEntryStatus', () => {
  it('says plainly that it is not available', async () => {
    await expect(NullAuthGateway.accountEntryStatus()).rejects.toBeInstanceOf(AuthNotAvailableError);
  });
});
