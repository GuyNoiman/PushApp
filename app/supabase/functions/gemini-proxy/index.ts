// gemini-proxy — Supabase Edge Function (Deno). The Gemini API key lives HERE and nowhere else.
//
// WHY THIS EXISTS. The key used to be read from `EXPO_PUBLIC_GEMINI_API_KEY`, which Metro inlines
// into the JavaScript bundle at build time. Anything in the bundle ships to every device that
// installs the app and can be extracted from it — obfuscation only buys minutes. The founder
// intends to hand a build to a partner, and asked how to hide the key so nobody but him can see it.
// The honest answer is that a secret cannot be hidden inside software running on someone else's
// device; the only real fix is that it never goes there. So:
//
//     app  ──(Supabase session JWT)──▶  this function  ──(the key)──▶  Gemini
//
// The app never holds the key. Whoever extracts the bundle gets a URL and their own session token,
// which is exactly what they already had.
//
// WHAT ELSE THIS BUYS, and it is not a side benefit. Knowing WHO is calling makes a spend cap
// possible for the first time. Today, a leaked key has no ceiling at all: it bills the founder's
// card until he notices. Here every request is attributed to a verified uid and metered.
//
// THE CAP (founder decision, 2026-08-18): 2 MB of request+response bytes per user, and NO cap for
// the founder's own uid(s), listed in the `UNMETERED_UIDS` secret. Bytes are an unusual unit for
// model usage — requests and tokens are the conventional ones — but they were what he asked for,
// they are exactly measurable here, and request counts are recorded alongside so the unit can be
// revisited with real numbers rather than guesses.
//
// PRIVACY (G1): the request body carries the user's own goal text. It is FORWARDED and never
// stored — the usage table records byte counts and a request count, never content. Nothing here
// writes prompt text to a table, a log line, or an error message.
//
// DEPLOY (founder action — needs the Supabase CLI and a login):
//     supabase secrets set GEMINI_API_KEY=…            # the key, server-side only
//     supabase secrets set UNMETERED_UIDS=<your-uid>   # comma-separated; may be left unset
//     supabase functions deploy gemini-proxy
//
// Deno/Edge runtime (URL imports, `Deno.env`), intentionally OUTSIDE the app's TypeScript/ESLint
// program — same as `delete-account` next door.

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** The per-user ceiling: 2 MB of request + response bytes (founder decision, 2026-08-18). */
const BYTE_CAP = 2 * 1024 * 1024;

/** Upstream. Only the model id is taken from the caller, and only from an allowlist. */
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Models this proxy will call. An allowlist rather than a passthrough: the model id lands in the
 * upstream URL, so accepting an arbitrary string would let a caller point this function — and the
 * founder's key — at any path on the host.
 */
const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']);
const DEFAULT_MODEL = 'gemini-2.5-flash';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  // A missing key must FAIL, never fall through to an unauthenticated upstream call.
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !geminiKey) {
    return json({ error: 'Server is not configured.' }, 500);
  }

  // ── 1. Who is calling? Verified from their own JWT — never from the request body. ──
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Not signed in.' }, 401);

  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const uid = userData?.user?.id;
  if (userError || !uid) return json({ error: 'Not signed in.' }, 401);

  // ── 2. Read the request. Only a model id and the upstream body cross this boundary. ──
  let payload: { model?: string; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }
  const model = typeof payload.model === 'string' ? payload.model : DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) return json({ error: 'Unsupported model.' }, 400);
  if (payload.body == null) return json({ error: 'Malformed request.' }, 400);

  const outbound = JSON.stringify(payload.body);
  const requestBytes = new TextEncoder().encode(outbound).length;

  // ── 3. The cap, checked BEFORE spending anything. ──
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const unmetered = (Deno.env.get('UNMETERED_UIDS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const metered = !unmetered.includes(uid);

  let usedBytes = 0;
  if (metered) {
    const { data: usage } = await admin
      .from('llm_usage')
      .select('bytes')
      .eq('user_id', uid)
      .maybeSingle();
    usedBytes = usage?.bytes ?? 0;
    // The reply names the cap and what is spent, so a blocked caller can be told something true
    // rather than a bare failure. No content, no other user's numbers.
    if (usedBytes + requestBytes > BYTE_CAP) {
      return json({ error: 'quota_exceeded', usedBytes, capBytes: BYTE_CAP }, 429);
    }
  }

  // ── 4. Forward. The key is attached HERE, in a header — never a URL, which would put it in
  //       redirects and request logs upstream. ──
  let upstream: Response;
  try {
    upstream = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: outbound,
    });
  } catch {
    // Deliberately opaque: an upstream error message can echo the request back, and the request
    // contains the user's own words.
    return json({ error: 'Upstream unavailable.' }, 502);
  }

  const text = await upstream.text();
  const responseBytes = new TextEncoder().encode(text).length;

  // ── 5. Meter what was actually spent. Counts only — never content. ──
  if (metered) {
    await admin.rpc('record_llm_usage', {
      p_user_id: uid,
      p_bytes: requestBytes + responseBytes,
    });
  }

  // Pass the upstream status through so the client's existing error handling still works.
  return new Response(text, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
