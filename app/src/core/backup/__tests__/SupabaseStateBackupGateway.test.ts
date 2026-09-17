/**
 * SupabaseStateBackupGateway — which account a backup call reaches.
 *
 * THE BUG (found 2026-09-17): the gateway cached the first user id it saw. The first call belongs to
 * the anonymous session the app opens at launch, so after a real sign-in every fetch read the
 * anonymous account's row and every save was refused by RLS and swallowed. These pin the fix: the id
 * is read from the session on every call, and a call made for one account is refused when the
 * session already holds another.
 */
const mockGetSession = jest.fn();
const mockUpsert = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn((_column: string, _value: string) => ({ maybeSingle: mockMaybeSingle }));

jest.mock('../../social/supabaseClient', () => ({
  supabase: {
    // Called through, not referenced: the factory runs before the mocks above are initialised.
    auth: { getSession: () => mockGetSession() },
    from: () => ({
      upsert: (row: unknown) => mockUpsert(row),
      select: () => ({ eq: (column: string, value: string) => mockEq(column, value) }),
    }),
  },
}));

import { StateBackupAccountChangedError } from '../StateBackupGateway';
import { SupabaseStateBackupGateway } from '../SupabaseStateBackupGateway';

function sessionFor(id: string | null) {
  mockGetSession.mockResolvedValue({ data: { session: id ? { user: { id } } : null } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
});

describe('the account a call reaches', () => {
  it('saves under the CURRENT account after the session changes, not the first one it saw', async () => {
    const gateway = new SupabaseStateBackupGateway();

    sessionFor('anonymous-at-launch');
    await gateway.fetch();
    expect(mockEq).toHaveBeenLastCalledWith('user_id', 'anonymous-at-launch');

    sessionFor('apple-account');
    await gateway.save('{"journeys":[]}', 1);
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'apple-account' }));

    await gateway.fetch();
    expect(mockEq).toHaveBeenLastCalledWith('user_id', 'apple-account');
  });

  it('refuses a save meant for one account while the session holds another', async () => {
    sessionFor('next-account');
    await expect(
      new SupabaseStateBackupGateway().save('{"journeys":[]}', 1, undefined, 'account-that-left'),
    ).rejects.toBeInstanceOf(StateBackupAccountChangedError);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('refuses a fetch meant for one account while the session holds another', async () => {
    sessionFor('next-account');
    await expect(new SupabaseStateBackupGateway().fetch('account-that-left')).rejects.toBeInstanceOf(
      StateBackupAccountChangedError,
    );
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('writes when the expected account is the one signed in', async () => {
    sessionFor('apple-account');
    await new SupabaseStateBackupGateway().save('{"journeys":[]}', 1, undefined, 'apple-account');
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'apple-account' }));
  });

  it('throws with no session rather than writing anywhere', async () => {
    sessionFor(null);
    await expect(new SupabaseStateBackupGateway().save('{}', 1)).rejects.toThrow('not signed in');
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
