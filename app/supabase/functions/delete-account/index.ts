// delete-account — Supabase Edge Function (Deno) for O1 account deletion.
//
// NOT DEPLOYED YET. This file lives in the repo so the deletion path is complete
// and reviewable, but a complete REMOTE delete only works once it is deployed:
//
//     supabase functions deploy delete-account
//
// Deploying (and the SUPABASE_SERVICE_ROLE_KEY it relies on) is a founder action,
// deferred to pre-release. Until then the client's `supabase.functions.invoke(
// 'delete-account')` will fail, and useAccountActions correctly REFUSES to wipe
// local data — so no account is left half-deleted.
//
// WHY SERVICE ROLE: a signed-in client cannot delete `auth.users` (or the
// profiles / cheers / entitlements rows that only the owner-or-nobody RLS
// policies expose). Removing the `auth.users` row as service_role cascades every
// dependent `public.*` row via their ON DELETE CASCADE foreign keys, so this one
// call is a COMPLETE server-side erasure.
//
// SECURITY: we authenticate the CALLER with their own JWT (the anon client bound
// to the request's Authorization header) and delete ONLY that verified uid. The
// service-role client is used solely for the privileged delete — never to trust a
// user-supplied id.
//
// This is Deno/Edge runtime code (URL imports, `Deno.env`), intentionally OUTSIDE
// the app's TypeScript/ESLint program (see app/tsconfig.json + eslint.config.js).

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Server is not configured for account deletion.' }, 500);
  }

  // 1) Verify the CALLER from their own JWT — we only ever delete the authed uid.
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }
  const uid = userData.user.id;

  // 2) Delete the auth.users row with service_role — cascades every public.* row.
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) {
    return json({ error: deleteError.message }, 500);
  }

  return json({ ok: true }, 200);
});
