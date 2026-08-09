/**
 * SupabaseAuthGateway.deleteAccount (O1) — the remote account-deletion path.
 *
 * Covers:
 *   • invokes the `delete-account` Edge Function (the service-role erasure), and
 *   • propagates any error by THROWING, so the orchestrator refuses the local wipe.
 *
 * The Supabase SDK is replaced by a controllable mock client so the boundary is
 * testable off-device (mirrors SupabaseAuthGateway.singleUser.test.ts).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../social/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInAnonymously: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { SupabaseAuthGateway } from '../SupabaseAuthGateway';
import { supabase } from '../../social/supabaseClient';

const mockFunctions = (supabase as unknown as { functions: { invoke: jest.Mock } }).functions;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SupabaseAuthGateway.deleteAccount', () => {
  it('invokes the delete-account Edge Function and resolves on success', async () => {
    mockFunctions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await expect(new SupabaseAuthGateway().deleteAccount()).resolves.toBeUndefined();
    expect(mockFunctions.invoke).toHaveBeenCalledWith('delete-account');
  });

  it('throws when the function returns an error (so the local wipe is refused)', async () => {
    const err = new Error('Edge function failed');
    mockFunctions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(new SupabaseAuthGateway().deleteAccount()).rejects.toBe(err);
  });
});
