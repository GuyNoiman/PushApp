/**
 * The Social, Messaging and Mirror gateways — which account a call acts as.
 *
 * THE BUG (found 2026-09-17, the same one `SupabaseStateBackupGateway` had): each of them cached the
 * first user id it saw. The first call belongs to the anonymous session the app opens at launch, so
 * after a real sign-in or a switch of account they kept acting as the account that was gone: friend
 * requests sent from it, this phone's messaging key published onto its profile, Mirror rounds opened
 * in its name. A restart after a switch does not cover the first sign-in after launch, so each
 * gateway has to read the id from the session on every call. These pin that, one gateway at a time.
 */
const mockGetSession = jest.fn();
/** Every chain call, in order, as `[method, args]`. */
const mockCalls: [string, unknown[]][] = [];

jest.mock('@/core/social/supabaseClient', () => {
  // One chainable builder: every method records itself and returns the builder, and awaiting it
  // resolves to an empty success.
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'or', 'order']) {
    builder[method] = (...args: unknown[]) => {
      mockCalls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (r: unknown) => void) => resolve({ data: [], error: null });
  return {
    supabase: {
      auth: {
        // Called through, not referenced: the factory runs before the mocks above are initialised.
        getSession: () => mockGetSession(),
        // The old code asked `getUser` once and kept the answer; it reports the same account as the
        // session so this suite fails on that code for the right reason (a stale id, not a missing one).
        getUser: async () => {
          const result = await mockGetSession();
          return { data: { user: result?.data.session?.user ?? null } };
        },
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: (table: string) => {
        mockCalls.push(['from', [table]]);
        return builder;
      },
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { SupabaseMessagingGateway } from '@/core/messaging/SupabaseMessagingGateway';
import { SupabaseSocialGateway } from '@/core/social/SupabaseSocialGateway';
import { SupabaseMirrorGateway } from '@/core/tools/mirror/SupabaseMirrorGateway';

function sessionFor(id: string | null) {
  mockGetSession.mockResolvedValue({ data: { session: id ? { user: { id } } : null } });
}

/** The arguments of the last call to `method`. */
function lastArgs(method: string): unknown[] | undefined {
  return [...mockCalls].reverse().find(([m]) => m === method)?.[1];
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockCalls.length = 0;
});

describe('SupabaseSocialGateway', () => {
  it('sends a friend request as the CURRENT account after the session changes', async () => {
    const gateway = new SupabaseSocialGateway();

    sessionFor('anonymous-at-launch');
    await gateway.requestFriend('friend');
    expect(lastArgs('insert')?.[0]).toEqual({ requester_id: 'anonymous-at-launch', addressee_id: 'friend' });

    sessionFor('apple-account');
    await gateway.requestFriend('friend');
    expect(lastArgs('insert')?.[0]).toEqual({ requester_id: 'apple-account', addressee_id: 'friend' });
  });

  it('refuses with no session rather than acting as the last account', async () => {
    const gateway = new SupabaseSocialGateway();
    sessionFor('apple-account');
    await gateway.requestFriend('friend');
    sessionFor(null);
    await expect(gateway.requestFriend('friend')).rejects.toThrow('Not signed in.');
  });
});

describe('SupabaseMessagingGateway', () => {
  it('publishes this device key onto the CURRENT account after the session changes', async () => {
    const gateway = new SupabaseMessagingGateway();

    sessionFor('anonymous-at-launch');
    await gateway.publishPublicKey('key-1');
    expect(lastArgs('eq')).toEqual(['id', 'anonymous-at-launch']);

    sessionFor('next-account');
    await gateway.publishPublicKey('key-2');
    expect(lastArgs('eq')).toEqual(['id', 'next-account']);
  });

  it('refuses with no session rather than acting as the last account', async () => {
    const gateway = new SupabaseMessagingGateway();
    sessionFor('apple-account');
    await gateway.publishPublicKey('key-1');
    sessionFor(null);
    await expect(gateway.publishPublicKey('key-2')).rejects.toThrow('not signed in');
  });
});

describe('SupabaseMirrorGateway', () => {
  it('lists rounds for the CURRENT account after the session changes', async () => {
    const gateway = new SupabaseMirrorGateway();

    sessionFor('anonymous-at-launch');
    await gateway.myRounds();
    expect(lastArgs('eq')).toEqual(['owner_id', 'anonymous-at-launch']);

    sessionFor('next-account');
    await gateway.myRounds();
    expect(lastArgs('eq')).toEqual(['owner_id', 'next-account']);
  });

  it('refuses with no session rather than acting as the last account', async () => {
    const gateway = new SupabaseMirrorGateway();
    sessionFor('apple-account');
    await gateway.myRounds();
    sessionFor(null);
    await expect(gateway.myRounds()).rejects.toThrow('not signed in');
  });
});
