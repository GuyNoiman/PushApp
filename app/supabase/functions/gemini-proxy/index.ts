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
// THE CAP (founder decision, 2026-08-18): 2 MB of request+response bytes per user by default, and
// NO cap for the founder's own uid(s), listed in the `UNMETERED_UIDS` secret. Unmetered means no
// CEILING — every caller's spend is still recorded, including his. The number itself is
// the `BYTE_CAP_MB` secret so it can be moved per deployment without touching this file.
//
// IT ONLY BITES ONCE `llm_usage` EXISTS. Without that table the usage read returns nothing, spent
// reads as zero, and every request passes — the cap is not "loose", it is absent. Running
// `migrations/0002_llm_usage.sql` is what turns it on. Bytes are an unusual unit for
// model usage — requests and tokens are the conventional ones — but they were what he asked for,
// they are exactly measurable here, and request counts are recorded alongside so the unit can be
// revisited with real numbers rather than guesses.
//
// WHAT IT COSTS, AS OPPOSED TO HOW BIG IT WAS (2026-09-15). Bytes were only ever a proxy for money.
// The thing Google bills is TOKENS, input and output at different rates, and Gemini has been
// returning both counts in `usageMetadata` on every response — which this function read past and
// threw away. It now reads them and records them against an opaque CONVERSATION ID the client mints,
// so "what does one conversation cost" has an answer instead of an estimate. The byte counting stays
// exactly as it was: the lifetime cap is enforced in bytes, and moving the unit and the meaning in
// one change would leave the cap untested. See `migrations/0019_llm_token_accounting.sql` — the
// price per model lives in a TABLE, so a rate change is an UPDATE and not a deploy.
//
// IT MUST BE MEASURED HERE, not on the device. A client that reports its own spend can report zero.
// The device's `conversationBudget` shapes how a conversation behaves as it runs down; this is the
// only place that knows what was actually spent.
//
// PRIVACY (G1): the request body carries the user's own goal text. It is FORWARDED and never
// stored — the usage tables record byte counts, token counts, a request count, an opaque random
// conversation id, and one of two fixed words for its kind. Never content. The conversation id is
// 128 random bits from the client and is REJECTED here unless it is exactly 32 hex characters — a
// field that only accepts hex cannot smuggle a sentence somebody typed. Nothing here writes prompt
// text to a table, a log line, or an error message.
//
// DEPLOY (founder action — needs the Supabase CLI and a login):
//     supabase secrets set GEMINI_API_KEY=…            # the key, server-side only
//     supabase secrets set UNMETERED_UIDS=<your-uid>   # comma-separated; may be left unset
//     supabase secrets set BYTE_CAP_MB=4               # optional; defaults to 2
//     supabase functions deploy gemini-proxy
//
// ORDER MATTERS for the token accounting: apply `migrations/0019_llm_token_accounting.sql` BEFORE
// deploying this file. The other way round, `record_llm_call` does not exist yet, every call falls
// back to the old `record_llm_usage` (so the cap still holds and nothing breaks for the user) and
// those calls are simply missing from the cost table — a hole in the data with no error anywhere to
// explain it.
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

/**
 * The per-user ceiling in request + response bytes (founder decision, 2026-08-18: 2 MB).
 *
 * Read from the `BYTE_CAP_MB` secret so the number can be changed with one command and no code
 * change or review — the moment a second real person is on the app, "how much is he allowed" stops
 * being a constant anyone should have to edit a file to move. Unset, malformed or non-positive falls
 * back to the decided 2 MB: a bad secret must never be read as "no limit".
 *
 *     supabase secrets set BYTE_CAP_MB=4
 *
 * It is a LIFETIME total, not monthly — nothing resets `llm_usage.bytes`.
 */
const capMb = Number(Deno.env.get('BYTE_CAP_MB'));
const BYTE_CAP = (Number.isFinite(capMb) && capMb > 0 ? capMb : 2) * 1024 * 1024;

/** Upstream. Only the model id is taken from the caller, and only from an allowlist. */
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Models this proxy will call. An allowlist rather than a passthrough: the model id lands in the
 * upstream URL, so accepting an arbitrary string would let a caller point this function — and the
 * founder's key — at any path on the host.
 */
const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']);
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * The conversation id, as the client mints it: 32 lowercase hex characters, 128 random bits.
 *
 * The pattern is the privacy control, not a formatting preference. This value is chosen by the
 * caller and stored by us, which is exactly the shape of field that quietly becomes a place to put
 * text. Hex of a fixed length cannot hold a sentence, a name or an email address, so there is
 * nothing to review later — it either matches or it is dropped.
 */
const CONVERSATION_ID_PATTERN = /^[0-9a-f]{32}$/;

/**
 * The two conversations whose costs the founder wants compared: the INTRODUCTION, spent on somebody
 * who has paid nothing, and PLANNING, which builds a Journey. A closed allowlist for the same reason
 * as the model list — a free-text "kind" is a free-text field.
 */
const CONVERSATION_KINDS = new Set(['introduction', 'planning']);
/** Everything else: the Journey-edit coach, the Dream coach, a tool. Counted, never guessed at. */
const UNSPECIFIED_KIND = 'unspecified';

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
  let payload: { model?: string; body?: unknown; conversationId?: unknown; conversationKind?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }
  const model = typeof payload.model === 'string' ? payload.model : DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) return json({ error: 'Unsupported model.' }, 400);
  if (payload.body == null) return json({ error: 'Malformed request.' }, 400);

  // An unrecognised id or kind is DROPPED, never rejected: a build that predates this, or one whose
  // storage failed, must keep working. The call is still recorded — as unattributed, which the
  // console shows by name rather than folding into the averages as if it were a conversation.
  const conversationId =
    typeof payload.conversationId === 'string' && CONVERSATION_ID_PATTERN.test(payload.conversationId)
      ? payload.conversationId
      : null;
  const conversationKind =
    typeof payload.conversationKind === 'string' && CONVERSATION_KINDS.has(payload.conversationKind)
      ? payload.conversationKind
      : UNSPECIFIED_KIND;

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
  // Only the CEILING is waived for an unmetered uid. What was spent is still recorded below —
  // see the note at step 5.
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

  // ── 4b. What the provider says it counted. Read, never inferred. ──
  //
  // `usageMetadata` is on every successful `generateContent` response and we used to skip past it.
  // A count is only taken when it is a finite, non-negative number; anything else — an error
  // response, a body we could not parse, a field that is suddenly a string — leaves both counts
  // NULL. Null is the point: a call that cost nothing and a call whose cost we do not know are
  // different facts, and a dashboard that writes 0 for the second one under-reports spend and looks
  // confident doing it. The row is written either way, so the gap is countable.
  const tokenUsage = readUsage(text);

  // ── 5. Record what was actually spent — for EVERY caller. Counts only, never content. ──
  //
  // This used to skip unmetered uids entirely, and that conflated two different things. Being
  // unmetered means "no ceiling", not "invisible": the founder's own uid is the one whose spend
  // actually reaches his card, so it is the last one that should go uncounted. It also made the
  // whole thing unverifiable — an empty table could equally mean "the proxy was never reached" or
  // "the caller happens to be exempt", which is exactly the ambiguity that cost a debugging round on
  // 2026-08-19. A ledger that skips rows cannot answer the question it exists to answer.
  //
  // Best-effort: a failure to write a counter must never fail a request the user already paid for
  // and whose answer is in hand.
  //
  // TOKENS RIDE ALONG (2026-09-15). `record_llm_call` does both halves in one statement: the same
  // lifetime byte/request counters the cap reads, plus a per-conversation token row. It is one call
  // rather than two so the two ledgers cannot disagree — a second round trip that fails leaves a
  // request counted in one place and not the other.
  //
  // The fallback is for the window where this file is deployed and migration 0019 is not: the RPC
  // does not exist, and without it the byte cap — the thing that actually protects the founder's
  // card — would stop being recorded for as long as nobody noticed. Losing cost detail is
  // acceptable; losing the cap is not. It cannot double-count: a function call that errors is one
  // failed transaction, so nothing it wrote survives to be added twice by the fallback.
  try {
    const { error: recordError } = await admin.rpc('record_llm_call', {
      p_user_id: uid,
      p_bytes: requestBytes + responseBytes,
      p_conversation_id: conversationId,
      p_conversation_kind: conversationKind,
      p_model: model,
      p_input_tokens: tokenUsage.inputTokens,
      p_output_tokens: tokenUsage.outputTokens,
    });
    if (recordError) {
      await admin.rpc('record_llm_usage', { p_user_id: uid, p_bytes: requestBytes + responseBytes });
    }
  } catch {
    // Swallowed deliberately — see above.
    try {
      await admin.rpc('record_llm_usage', { p_user_id: uid, p_bytes: requestBytes + responseBytes });
    } catch {
      // Nothing left to try. A counter is not worth failing a request the user already paid for.
    }
  }

  // Pass the upstream status through so the client's existing error handling still works.
  return new Response(text, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});

/**
 * Pull Gemini's own token counts out of a response body.
 *
 * Returns nulls rather than zeros whenever the counts are not there to be read — see the note at
 * step 4b. Parsing is deliberately total: this runs AFTER the user's answer is in hand, so a
 * surprise in the body must never become an exception that loses them the reply.
 */
function readUsage(body: string): { inputTokens: number | null; outputTokens: number | null } {
  const count = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  try {
    const parsed = JSON.parse(body) as {
      usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown };
    };
    return {
      inputTokens: count(parsed?.usageMetadata?.promptTokenCount),
      outputTokens: count(parsed?.usageMetadata?.candidatesTokenCount),
    };
  } catch {
    return { inputTokens: null, outputTokens: null };
  }
}
