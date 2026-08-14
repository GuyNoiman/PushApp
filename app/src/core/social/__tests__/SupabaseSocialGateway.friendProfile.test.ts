/**
 * SupabaseSocialGateway — Friend Profile mapping tests (Friend_Profile_PRD.md).
 *
 * Same idea as the Support Circle suite: the Supabase SDK is replaced by a controllable chainable
 * mock so the boundary is testable off-device, and these assert the CLIENT-SIDE mapping only. The
 * real access enforcement lives in Postgres RLS + the SECURITY DEFINER RPCs.
 *
 * The builder here is per-`from()` rather than one shared object, because this surface fires
 * PARALLEL reads of the same table (one per relationship direction) that must be able to resolve
 * to DIFFERENT rows. Each call records its table and its chained ops, and the test supplies a
 * resolver that answers per call.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The recorded shape is spelled inline rather than through a named type: Babel's jest.mock hoist
// check rejects ANY out-of-scope identifier in this factory, type declarations included.
jest.mock('../supabaseClient', () => {
  const calls: { table: string; ops: { m: string; args: unknown[] }[] }[] = [];
  let resolver: (call: { table: string; ops: { m: string; args: unknown[] }[] }) => {
    data: unknown;
    error: unknown;
  } = () => ({ data: null, error: null });

  const makeBuilder = (table: string) => {
    const call = { table, ops: [] as { m: string; args: unknown[] }[] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const m of ['upsert', 'update', 'insert', 'delete', 'select', 'eq', 'in', 'maybeSingle', 'single']) {
      builder[m] = jest.fn((...args: unknown[]) => {
        call.ops.push({ m, args });
        return builder;
      });
    }
    // Thenable so `await client.from(...).select(...).eq(...)` resolves through the resolver.
    builder.then = (resolve: (r: unknown) => void) => resolve(resolver(call));
    return builder;
  };

  const supabase = {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'me' } } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn((table: string) => makeBuilder(table)),
    rpc: jest.fn((name: string) => ({
      then: (resolve: (r: unknown) => void) => resolve(resolver({ table: `rpc:${name}`, ops: [] })),
    })),
    __calls: calls,
    __setResolver: (
      fn: (call: { table: string; ops: { m: string; args: unknown[] }[] }) => { data: unknown; error: unknown },
    ) => { resolver = fn; },
    __reset: () => {
      calls.length = 0;
      resolver = () => ({ data: null, error: null });
    },
  };
  return { supabase };
});

import { SupabaseSocialGateway } from '../SupabaseSocialGateway';
import { NotFriendsError, NullSocialGateway } from '../SocialGateway';
import { supabase } from '../supabaseClient';

interface Op { m: string; args: unknown[] }
interface Call { table: string; ops: Op[] }

const mock = supabase as unknown as {
  from: jest.Mock;
  rpc: jest.Mock;
  __calls: Call[];
  __setResolver: (fn: (call: Call) => { data: unknown; error: unknown }) => void;
  __reset: () => void;
};

/** The value a call filtered `column` on, or undefined. */
function eqOf(call: Call, column: string): unknown {
  return call.ops.find((o) => o.m === 'eq' && o.args[0] === column)?.args[1];
}
function callsTo(table: string): Call[] {
  return mock.__calls.filter((c) => c.table === table);
}
function ranOp(call: Call, m: string): boolean {
  return call.ops.some((o) => o.m === m);
}

const FRIEND_PROFILE_ROW = { id: 'friend-1', handle: 'sam', buddy_summary: { name: 'Pip' } };

/** The default happy path: accepted friendship, one profile, one shared Journey each way. */
function acceptedFriendResolver(call: Call): { data: unknown; error: unknown } {
  if (call.table === 'friendships') {
    // The friend sent the request: only the (friend → me) orientation has a row.
    const accepted = eqOf(call, 'requester_id') === 'friend-1';
    return { data: accepted ? { status: 'accepted' } : null, error: null };
  }
  if (call.table === 'profiles') {
    // `.in()` ⇒ the owner-profile lookup inside allyProgress; `.eq('id')` ⇒ the friend's profile.
    if (ranOp(call, 'in')) return { data: [FRIEND_PROFILE_ROW], error: null };
    return { data: FRIEND_PROFILE_ROW, error: null };
  }
  if (call.table === 'journey_allies') {
    const rows =
      eqOf(call, 'owner_id') === 'me'
        ? [
            { journey_id: 'mine-1', owner_id: 'me', ally_id: 'friend-1', status: 'accepted', visibility: 'progress', decided_at: '2026-08-01T00:00:00.000Z' },
            { journey_id: 'mine-2', owner_id: 'me', ally_id: 'friend-1', status: 'requested', visibility: 'progress', decided_at: null },
          ]
        : [
            { journey_id: 'theirs-1', owner_id: 'friend-1', ally_id: 'me', status: 'accepted', visibility: 'full', decided_at: '2026-08-02T00:00:00.000Z' },
          ];
    return { data: rows, error: null };
  }
  if (call.table === 'rpc:ally_snapshots') {
    return {
      data: [
        { owner_id: 'friend-1', journey_id: 'theirs-1', title: 'Run 5km', progress: 0.4, streak: 3, updated_at: '2026-08-12T00:00:00.000Z', visibility: 'full' },
        { owner_id: 'someone-else', journey_id: 'other-1', title: null, progress: 0.1, streak: 0, updated_at: '2026-08-12T00:00:00.000Z', visibility: 'progress' },
      ],
      error: null,
    };
  }
  return { data: null, error: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  mock.__reset();
});

describe('friendProfile — the friendship gate', () => {
  it('throws NotFriendsError when the friendship is still pending', async () => {
    mock.__setResolver((call) =>
      call.table === 'friendships' ? { data: { status: 'pending' }, error: null } : { data: null, error: null },
    );
    await expect(new SupabaseSocialGateway().friendProfile('friend-1')).rejects.toBeInstanceOf(NotFriendsError);
    // Nothing about the person may be read before the friendship is mutual.
    expect(mock.from).not.toHaveBeenCalledWith('profiles');
    expect(mock.from).not.toHaveBeenCalledWith('journey_allies');
  });

  it('throws NotFriendsError when there is no friendship row at all', async () => {
    mock.__setResolver(() => ({ data: null, error: null }));
    await expect(new SupabaseSocialGateway().friendProfile('friend-1')).rejects.toBeInstanceOf(NotFriendsError);
  });

  it('accepts the friendship in either orientation', async () => {
    mock.__setResolver(acceptedFriendResolver);
    await expect(new SupabaseSocialGateway().friendProfile('friend-1')).resolves.toBeDefined();
  });

  it('treats a deleted account (friendship row, no profile) as not connected', async () => {
    mock.__setResolver((call) =>
      call.table === 'profiles' ? { data: null, error: null } : acceptedFriendResolver(call),
    );
    await expect(new SupabaseSocialGateway().friendProfile('friend-1')).rejects.toBeInstanceOf(NotFriendsError);
  });

  it('surfaces a transport failure as itself — offline is not "not connected"', async () => {
    mock.__setResolver((call) =>
      call.table === 'friendships' ? { data: null, error: new Error('network down') } : { data: null, error: null },
    );
    await expect(new SupabaseSocialGateway().friendProfile('friend-1')).rejects.not.toBeInstanceOf(NotFriendsError);
  });
});

describe('friendProfile — the composed view', () => {
  it('returns identity, the two-way relationship counts, and only this friend’s Journeys', async () => {
    mock.__setResolver(acceptedFriendResolver);
    const view = await new SupabaseSocialGateway().friendProfile('friend-1');
    expect(view.profile).toEqual({ id: 'friend-1', handle: 'sam', buddySummary: { name: 'Pip' } });
    // 'mine-2' is still `requested`, so it is not a relationship yet.
    expect(view.relationship).toEqual({ theySupportMe: 1, iSupportThem: 1, total: 2, lifecycle: null });
    expect(view.sharedActive.map((p) => p.journeyId)).toEqual(['theirs-1']);
    expect(typeof view.fetchedAt).toBe('number');
  });

  it('reads BOTH directions of journey_allies with two plain scoped queries', async () => {
    mock.__setResolver(acceptedFriendResolver);
    await new SupabaseSocialGateway().friendProfile('friend-1');
    const pairs = callsTo('journey_allies').map((c) => [eqOf(c, 'owner_id'), eqOf(c, 'ally_id')]);
    expect(pairs).toEqual(expect.arrayContaining([['me', 'friend-1'], ['friend-1', 'me']]));
  });

  it('asks the profiles table for cosmetic identity columns only (PRD §4.1)', async () => {
    mock.__setResolver(acceptedFriendResolver);
    await new SupabaseSocialGateway().friendProfile('friend-1');
    const byId = callsTo('profiles').find((c) => eqOf(c, 'id') === 'friend-1');
    expect(byId?.ops.find((o) => o.m === 'select')?.args[0]).toBe('id, handle, buddy_summary');
  });
});

describe('unfriendImpact', () => {
  it('counts live Ally relationships per direction and pending invites', async () => {
    mock.__setResolver(acceptedFriendResolver);
    await expect(new SupabaseSocialGateway().unfriendImpact('friend-1')).resolves.toEqual({
      journeysTheySupportForMe: 1,
      journeysISupportForThem: 1,
      pendingInvites: 1,
    });
  });
});

describe('removeFriend — friendships only, the cascade does the rest', () => {
  it('deletes both orientations of the friendship and NEVER touches journey_allies', async () => {
    mock.__setResolver(() => ({ data: null, error: null }));
    await new SupabaseSocialGateway().removeFriend('friend-1');
    expect(mock.from).toHaveBeenCalledWith('friendships');
    // The `cascade_unfriend()` trigger removes every Ally row server-side, both ways. A client-side
    // delete here could only reach half of them.
    expect(mock.from).not.toHaveBeenCalledWith('journey_allies');
    const deletes = callsTo('friendships').filter((c) => ranOp(c, 'delete'));
    expect(deletes).toHaveLength(2);
    expect(deletes.map((c) => [eqOf(c, 'requester_id'), eqOf(c, 'addressee_id')])).toEqual(
      expect.arrayContaining([['me', 'friend-1'], ['friend-1', 'me']]),
    );
  });

  it('rejects when the server refuses the delete', async () => {
    mock.__setResolver(() => ({ data: null, error: new Error('denied') }));
    await expect(new SupabaseSocialGateway().removeFriend('friend-1')).rejects.toThrow('denied');
  });
});

describe('removeAlly — never-regress: removing one Ally can never remove the friendship', () => {
  it('closes the journey_allies row and NEVER touches friendships (PRD §4.5)', async () => {
    mock.__setResolver(() => ({ data: null, error: null }));
    await new SupabaseSocialGateway().removeAlly('j1', 'friend-1');
    expect(mock.from).toHaveBeenCalledWith('journey_allies');
    // The exact inverse of removeFriend: the per-Journey path is the ONLY one that touches
    // journey_allies, and the friendship path is the ONLY one that touches friendships.
    expect(mock.from).not.toHaveBeenCalledWith('friendships');
    const call = callsTo('journey_allies')[0];
    expect(ranOp(call, 'update')).toBe(true);
    expect(eqOf(call, 'journey_id')).toBe('j1');
    expect(eqOf(call, 'ally_id')).toBe('friend-1');
  });
});

describe('withdrawProgress — stop publishing without breaking the Support Circle (PRD §4.3)', () => {
  it('deletes only this owner’s snapshot for the Journey, leaving journey_allies intact', async () => {
    mock.__setResolver(() => ({ data: null, error: null }));
    await new SupabaseSocialGateway().withdrawProgress('j1');
    expect(mock.from).toHaveBeenCalledWith('progress_snapshots');
    expect(mock.from).not.toHaveBeenCalledWith('journey_allies');
    const call = callsTo('progress_snapshots')[0];
    expect(ranOp(call, 'delete')).toBe(true);
    expect(eqOf(call, 'owner_id')).toBe('me');
    expect(eqOf(call, 'journey_id')).toBe('j1');
  });
});

describe('NullSocialGateway parity (friend-profile methods)', () => {
  it('REJECTS the two reads rather than inventing an empty profile or a 0 impact count', async () => {
    await expect(NullSocialGateway.friendProfile('friend-1')).rejects.toThrow('Social pillar is disabled');
    await expect(NullSocialGateway.unfriendImpact('friend-1')).rejects.toThrow('Social pillar is disabled');
  });

  it('keeps the destructive write and the withdrawal inert', async () => {
    await expect(NullSocialGateway.removeFriend('friend-1')).resolves.toBeUndefined();
    await expect(NullSocialGateway.withdrawProgress('j1')).resolves.toBeUndefined();
  });
});
