/**
 * Changing your username, and the failure that looked like success.
 *
 * The partner reported "I still cannot change my username" after two fixes had
 * already shipped for it. The reason was not the field, the button or the
 * canonical form — it was that `upsertProfile` threw a raw Postgres unique
 * violation, the provider swallowed it into state nobody read, and the screen
 * had already set the new name locally BEFORE asking the server. Every attempt
 * looked like it worked and reverted on the next launch.
 *
 * These tests pin the gateway half: a taken name must arrive as something a
 * screen can act on, and every other failure must still surface rather than be
 * flattened into it.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
import { HandleTakenError } from '../SocialGateway';
import { supabase } from '../supabaseClient';

interface Op { m: string; args: unknown[] }
interface Call { table: string; ops: Op[] }

const mock = supabase as unknown as {
  __calls: Call[];
  __setResolver: (fn: (call: Call) => { data: unknown; error: unknown }) => void;
  __reset: () => void;
};

describe('upsertProfile', () => {
  beforeEach(() => mock.__reset());

  it('translates a unique violation into something a screen can act on', async () => {
    mock.__setResolver(() => ({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_handle_key"' },
    }));
    const gateway = new SupabaseSocialGateway();
    await expect(gateway.upsertProfile('Taken', {})).rejects.toBeInstanceOf(HandleTakenError);
  });

  it('does not leak the Postgres message to whoever renders the failure', async () => {
    mock.__setResolver(() => ({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_handle_key"' },
    }));
    const gateway = new SupabaseSocialGateway();
    await gateway.upsertProfile('Taken', {}).catch((e: Error) => {
      expect(e.message).not.toContain('constraint');
      expect(e.message).not.toContain('duplicate key');
      expect((e as HandleTakenError).handle).toBe('taken');
    });
    expect.hasAssertions();
  });

  it('still throws every other failure rather than calling them all "taken"', async () => {
    mock.__setResolver(() => ({ data: null, error: { code: '42501', message: 'permission denied' } }));
    const gateway = new SupabaseSocialGateway();
    await expect(gateway.upsertProfile('anything', {})).rejects.not.toBeInstanceOf(HandleTakenError);
  });

  it('stores the canonical form, so the name saved is the name searched for', async () => {
    mock.__setResolver(() => ({ data: { id: 'me', handle: 'dana', buddy_summary: {} }, error: null }));
    const gateway = new SupabaseSocialGateway();
    const profile = await gateway.upsertProfile('@DANA', {});
    expect(profile.handle).toBe('dana');
    const upsert = mock.__calls.find((c) => c.table === 'profiles')?.ops.find((o) => o.m === 'upsert');
    expect((upsert?.args[0] as { handle: string }).handle).toBe('dana');
  });

  it('refuses without a session rather than writing somebody else’s row', async () => {
    const gateway = new SupabaseSocialGateway();
    const authed = supabase as unknown as { auth: { getUser: jest.Mock } };
    authed.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(gateway.upsertProfile('dana', {})).rejects.toThrow('Not signed in.');
  });
});
