/**
 * SupabaseSocialGateway — Support Circle (D2) mapping tests.
 *
 * The Supabase SDK is replaced by a controllable chainable mock (mirrors the auth-gateway
 * suites) so the boundary is testable off-device. These assert the CLIENT-SIDE mapping only —
 * bundle ↔ visibility, invite/respond/companion payload shapes, and DTO reshaping. The real
 * ACCESS enforcement lives in Postgres RLS + the SECURITY DEFINER RPCs (app/supabase/schema.sql);
 * the authorization matrix (non-accepted / non-friend / wrong-journey ⇒ zero rows) is validated
 * by the SQL design and needs a live-DB integration pass to exercise end-to-end.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// One shared chainable builder; every chain method returns it, and it is thenable so
// `await client.from(...).update(...).eq(...)` resolves to the configured result. `result`
// is a closed-over let, so __setResult updates what pending awaits resolve to.
jest.mock('../supabaseClient', () => {
  let result: { data: unknown; error: unknown } = { data: null, error: null };
  const builder: Record<string, unknown> = {};
  for (const m of ['upsert', 'update', 'insert', 'delete', 'select', 'eq', 'in']) {
    builder[m] = jest.fn(() => builder);
  }
  builder.then = (resolve: (r: unknown) => void) => resolve(result);
  const supabase = {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'me' } } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => builder),
    rpc: jest.fn(() => ({ then: (resolve: (r: unknown) => void) => resolve(result) })),
    __builder: builder,
    __setResult: (r: { data: unknown; error: unknown }) => { result = r; },
  };
  return { supabase };
});

import { SupabaseSocialGateway } from '../SupabaseSocialGateway';
import { NullSocialGateway } from '../SocialGateway';
import { supabase } from '../supabaseClient';

const mock = supabase as unknown as {
  from: jest.Mock;
  rpc: jest.Mock;
  __builder: Record<string, jest.Mock>;
  __setResult: (r: { data: unknown; error: unknown }) => void;
};

beforeEach(() => {
  jest.clearAllMocks();
  mock.__setResult({ data: null, error: null });
});

describe('inviteAlly — bundle ↔ visibility mapping (D2)', () => {
  it('maps Companion to visibility "full" in a requested-state upsert', async () => {
    await new SupabaseSocialGateway().inviteAlly('j1', 'ally-1', 'companion');
    expect(mock.from).toHaveBeenCalledWith('journey_allies');
    expect(mock.__builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        journey_id: 'j1',
        owner_id: 'me',
        ally_id: 'ally-1',
        visibility: 'full',
        status: 'requested',
        decided_at: null,
        closed_at: null,
      }),
      { onConflict: 'journey_id,owner_id,ally_id' },
    );
  });

  it('maps Encourager to visibility "progress"', async () => {
    await new SupabaseSocialGateway().inviteAlly('j1', 'ally-1', 'encourager');
    expect(mock.__builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'progress', status: 'requested' }),
      expect.anything(),
    );
  });
});

describe('respondToAllyInvite', () => {
  it('accepts by moving the row to "accepted", guarded on the requested state', async () => {
    await new SupabaseSocialGateway().respondToAllyInvite('j1', 'owner-1', true);
    expect(mock.__builder.update).toHaveBeenCalledWith({ status: 'accepted' });
    expect(mock.__builder.eq).toHaveBeenCalledWith('status', 'requested'); // stale-request guard
    expect(mock.__builder.eq).toHaveBeenCalledWith('ally_id', 'me');
  });

  it('declines by moving the row to "declined"', async () => {
    await new SupabaseSocialGateway().respondToAllyInvite('j1', 'owner-1', false);
    expect(mock.__builder.update).toHaveBeenCalledWith({ status: 'declined' });
  });
});

describe('removeAlly / cancelInvite', () => {
  it('removeAlly closes the row (revokes access, keeps history)', async () => {
    await new SupabaseSocialGateway().removeAlly('j1', 'ally-1');
    expect(mock.__builder.update).toHaveBeenCalledWith({ status: 'closed' });
  });

  it('cancelInvite cancels a still-requested invite', async () => {
    await new SupabaseSocialGateway().cancelInvite('j1', 'ally-1');
    expect(mock.__builder.update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mock.__builder.eq).toHaveBeenCalledWith('status', 'requested');
  });
});

describe('publishCompanionSteps', () => {
  it('replaces the Journey rows (delete-then-insert) and maps the report date to ISO', async () => {
    const at = 1_700_000_000_000;
    await new SupabaseSocialGateway().publishCompanionSteps('j1', [
      { stepId: 's1', title: 'Lace up', status: 'completed', reportedAt: at },
      { stepId: 's2', title: 'Jog', status: 'unreported', reportedAt: null },
    ]);
    expect(mock.from).toHaveBeenCalledWith('companion_steps');
    expect(mock.__builder.delete).toHaveBeenCalled();
    expect(mock.__builder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ step_id: 's1', title: 'Lace up', status: 'completed', reported_at: new Date(at).toISOString() }),
      expect.objectContaining({ step_id: 's2', title: 'Jog', status: 'unreported', reported_at: null }),
    ]);
  });

  it('with no steps clears the Journey without inserting', async () => {
    await new SupabaseSocialGateway().publishCompanionSteps('j1', []);
    expect(mock.__builder.delete).toHaveBeenCalled();
    expect(mock.__builder.insert).not.toHaveBeenCalled();
  });
});

describe('companionSteps (definer RPC reshape)', () => {
  it('calls ally_journey_steps with owner+journey and maps rows to DTOs', async () => {
    const updatedIso = '2026-08-12T00:00:00.000Z';
    mock.__setResult({
      data: [
        { step_id: 's1', title: 'Lace up', status: 'completed', reported_at: updatedIso, updated_at: updatedIso },
      ],
      error: null,
    });
    const rows = await new SupabaseSocialGateway().companionSteps('owner-1', 'j1');
    expect(mock.rpc).toHaveBeenCalledWith('ally_journey_steps', { p_owner: 'owner-1', p_journey: 'j1' });
    expect(rows).toEqual([
      {
        stepId: 's1',
        title: 'Lace up',
        status: 'completed',
        reportedAt: new Date(updatedIso).getTime(),
        updatedAt: new Date(updatedIso).getTime(),
      },
    ]);
  });
});

describe('incomingAllyInvites (recipient view)', () => {
  it('maps visibility "full" back to the Companion bundle', async () => {
    mock.__setResult({
      data: [
        {
          journey_id: 'j1',
          visibility: 'full',
          status: 'requested',
          owner: { id: 'owner-1', handle: 'sam', buddy_summary: {} },
        },
      ],
      error: null,
    });
    const invites = await new SupabaseSocialGateway().incomingAllyInvites();
    expect(invites).toEqual([
      {
        owner: { id: 'owner-1', handle: 'sam', buddySummary: {} },
        journeyId: 'j1',
        bundle: 'companion',
        status: 'requested',
      },
    ]);
  });
});

describe('sendCheer — cheer vs nudge kind', () => {
  it('persists a nudge as a distinct kind (an honest reach-out to a quiet friend)', async () => {
    await new SupabaseSocialGateway().sendCheer('friend-1', 'j1', 'nudge');
    expect(mock.from).toHaveBeenCalledWith('cheers');
    expect(mock.__builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ from_id: 'me', to_id: 'friend-1', journey_id: 'j1', kind: 'nudge' }),
    );
  });

  it('persists a cheer as kind "cheer"', async () => {
    await new SupabaseSocialGateway().sendCheer('friend-1', 'j1', 'cheer');
    expect(mock.__builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'cheer' }),
    );
  });
});

describe('NullSocialGateway parity (D2 methods are inert no-ops)', () => {
  it('the new Support Circle methods resolve without a backend', async () => {
    await expect(NullSocialGateway.inviteAlly('j1', 'a1', 'companion')).resolves.toBeUndefined();
    await expect(NullSocialGateway.respondToAllyInvite('j1', 'o1', true)).resolves.toBeUndefined();
    await expect(NullSocialGateway.cancelInvite('j1', 'a1')).resolves.toBeUndefined();
    await expect(NullSocialGateway.removeAlly('j1', 'a1')).resolves.toBeUndefined();
    await expect(NullSocialGateway.changeAllyBundle('j1', 'a1', 'encourager')).resolves.toBeUndefined();
    await expect(NullSocialGateway.listJourneyAllies('j1')).resolves.toEqual([]);
    await expect(NullSocialGateway.incomingAllyInvites()).resolves.toEqual([]);
    await expect(NullSocialGateway.closeJourneyInvites('j1')).resolves.toBeUndefined();
    await expect(NullSocialGateway.publishCompanionSteps('j1', [])).resolves.toBeUndefined();
    await expect(NullSocialGateway.companionSteps('o1', 'j1')).resolves.toEqual([]);
    await expect(NullSocialGateway.myCompanionJourneyIds()).resolves.toEqual([]);
  });
});
