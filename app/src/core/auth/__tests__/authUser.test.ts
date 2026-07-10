/**
 * toAuthUser tests — the PII boundary (Auth_Backend_Proposal R1). The mapper must
 * expose ONLY id / isAnonymous / providers and must never surface the email, name,
 * or any identity_data that Supabase carries on the raw user.
 */
import { toAuthUser } from '../authUser';

describe('toAuthUser', () => {
  it('returns null for a null user', () => {
    expect(toAuthUser(null)).toBeNull();
  });

  it('marks an anonymous user and defaults providers to ["anonymous"]', () => {
    const u = toAuthUser({ id: 'anon-1', is_anonymous: true } as any);
    expect(u).toEqual({ id: 'anon-1', isAnonymous: true, providers: ['anonymous'] });
  });

  it('strips ALL PII — no email/name leaks even when identity_data carries them', () => {
    const raw = {
      id: 'user-9',
      is_anonymous: false,
      email: 'real.person@example.com',
      phone: '+15551234567',
      user_metadata: { full_name: 'Real Person', avatar_url: 'https://x/y.png' },
      identities: [
        {
          provider: 'apple',
          identity_data: { email: 'real.person@privaterelay.appleid.com', name: 'Real Person' },
        },
        { provider: 'google', identity_data: { email: 'real.person@gmail.com', name: 'Real Person' } },
      ],
    };
    const u = toAuthUser(raw as any)!;
    // Only the whitelisted fields survive.
    expect(u).toEqual({ id: 'user-9', isAnonymous: false, providers: ['apple', 'google'] });
    // Belt-and-suspenders: no PII anywhere in the serialized result.
    const serialized = JSON.stringify(u);
    expect(serialized).not.toContain('example.com');
    expect(serialized).not.toContain('Real Person');
    expect(serialized).not.toContain('appleid.com');
    expect(serialized).not.toContain('+1555');
    expect(u).not.toHaveProperty('email');
    expect(u).not.toHaveProperty('user_metadata');
  });
});
