/**
 * toAuthUser — the PII boundary mapper. Converts a Supabase user into our
 * vendor-free AuthUser, deliberately reading ONLY id / is_anonymous / linked
 * provider names. It NEVER touches `email`, `user_metadata`, or
 * `identities[].identity_data` (where the name/email live), so PII cannot leak
 * into app state or any downstream `public.*` write (Auth_Backend_Proposal R1).
 *
 * `import type` only — no vendor runtime import, so this stays pure-TS testable.
 */
import type { User } from '@supabase/supabase-js';

import type { AuthUser } from './AuthGateway';

export function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const isAnonymous = user.is_anonymous ?? false;
  // Derive linked providers from Supabase's identities; fall back to 'anonymous'.
  const providers = (user.identities ?? [])
    .map((i) => i.provider)
    .filter((p): p is string => Boolean(p));
  return {
    id: user.id,
    isAnonymous,
    providers: providers.length > 0 ? providers : isAnonymous ? ['anonymous'] : [],
  };
}
