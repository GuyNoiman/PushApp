/**
 * The whole vendor surface: `fetch` against Supabase's REST and auth endpoints.
 *
 * There is no SDK here, and no CDN script tag — the same property that makes the
 * invitation page trustworthy. Every request this page makes goes to one origin,
 * the project's own, and a reader can confirm that by reading this file.
 *
 * ── WHY THE ANON KEY IN A STATIC PAGE IS NOT THE HOLE IT LOOKS LIKE ──
 * The key identifies the project, not the caller. Every table in migration 0008
 * has RLS on, and authorisation is decided by `has_admin_role()` reading
 * `admin_members` inside Postgres — a SECURITY DEFINER function that takes the
 * caller from `auth.uid()` and has no parameter for "who am I". A browser holding
 * this key and no session can read nothing. That is what §10's "server-side
 * authorization on every query" means when the server is the database.
 *
 * ── SESSIONS ──
 * §10 asks for short-lived sessions. The tokens live in `sessionStorage`, so they
 * die with the tab and never touch `localStorage`; the refresh token is used to
 * extend an ACTIVE session and an absolute cap ends it regardless. Signing out
 * revokes server-side rather than only forgetting locally.
 */

const SESSION_KEY = 'pushapp.console.session';
/** Set when a sign-in leaves this page, cleared when one returns with a session. */
const ATTEMPT_KEY = 'pushapp.console.signin-attempt';
/** After this long, sign in again — no matter how busy the tab has been. */
const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class Api {
  constructor({ url, anonKey }) {
    if (!url || !anonKey) throw new Error('The console is not configured. See console/README.md.');
    this.url = url.replace(/\/+$/, '');
    this.anonKey = anonKey;
    this.session = readSession();
  }

  get signedIn() {
    return Boolean(this.session?.access_token) && !this.sessionExpired();
  }

  get userId() {
    return this.session?.user?.id ?? null;
  }

  get email() {
    return this.session?.user?.email ?? null;
  }

  sessionExpired() {
    const s = this.session;
    if (!s) return true;
    return Date.now() > (s.started_at ?? 0) + ABSOLUTE_SESSION_MS;
  }

  // ── auth ────────────────────────────────────────────────────────────────

  /**
   * Sign in with the same identity the app uses.
   *
   * This console shipped with a password field and nothing else, which was wrong
   * for the only accounts that exist: everybody signs into the app with Apple or
   * Google, so nobody HAS a password, and the first operator to open this was
   * asked for one that could not exist. The password path is kept — a dedicated
   * operations account with a real password is a reasonable thing to want — but
   * it is no longer the only door.
   *
   * `redirect_to` must be in the project's redirect allow-list. Supabase checks
   * it at the CALLBACK, not here, and silently substitutes the Site URL when it
   * does not match; see the studio's client for the whole trap.
   */
  signInWith(provider) {
    const path = window.location.pathname === '/' ? '' : window.location.pathname;
    const redirect = `${window.location.origin}${path}`;
    try {
      sessionStorage.setItem(ATTEMPT_KEY, redirect);
    } catch {
      // Losing the breadcrumb loses the diagnosis, not the sign-in.
    }
    window.location.assign(
      `${this.url}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirect)}`,
    );
  }

  /** Tokens come back in the URL fragment — the one part a browser never sends to a server. */
  consumeRedirect() {
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const error = params.get('error_description') || params.get('error');
    const accessToken = params.get('access_token');
    if (!error && !accessToken) return null;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    try {
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch {
      // Nothing to clear.
    }
    if (error) return { error };
    const claims = decodeClaims(accessToken);
    this.setSession({
      access_token: accessToken,
      refresh_token: params.get('refresh_token'),
      started_at: Date.now(),
      user: { id: claims?.sub ?? null, email: claims?.email ?? null },
    });
    return { ok: true };
  }

  /** A sign-in that left and came back with nothing — see the studio's notice for why this exists. */
  strandedAttempt() {
    try {
      return sessionStorage.getItem(ATTEMPT_KEY);
    } catch {
      return null;
    }
  }

  clearAttempt() {
    try {
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch {
      // Nothing to clear.
    }
  }

  async signIn(email, password) {
    const res = await this.raw(`/auth/v1/token?grant_type=password`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setSession({ ...res, started_at: Date.now() });
    return res;
  }

  /**
   * Multi-factor (§10: MFA before production access). Supabase reports the
   * assurance level the session HAS and the one its factors REQUIRE; when they
   * differ, the session is real but must not be treated as production access
   * until the challenge is answered.
   */
  async assuranceLevel() {
    try {
      const factors = await this.raw('/auth/v1/factors', { method: 'GET', auth: true });
      const verified = (factors?.totp ?? factors?.all ?? []).filter?.((f) => f.status === 'verified') ?? [];
      const claimed = this.session?.user?.aal ?? decodeAal(this.session?.access_token);
      return { enrolled: verified.length > 0, factors: verified, current: claimed };
    } catch {
      return { enrolled: false, factors: [], current: decodeAal(this.session?.access_token) };
    }
  }

  async challengeMfa(factorId) {
    return this.raw(`/auth/v1/factors/${factorId}/challenge`, { method: 'POST', auth: true, body: '{}' });
  }

  async verifyMfa(factorId, challengeId, code) {
    const res = await this.raw(`/auth/v1/factors/${factorId}/verify`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ challenge_id: challengeId, code }),
    });
    this.setSession({ ...this.session, ...res });
    return res;
  }

  async refresh() {
    const token = this.session?.refresh_token;
    if (!token) throw new ApiError('No session', 401);
    const res = await this.raw(`/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: token }),
    });
    this.setSession({ ...res, started_at: this.session?.started_at ?? Date.now() });
    return res;
  }

  async signOut() {
    try {
      await this.raw('/auth/v1/logout', { method: 'POST', auth: true, body: '{}' });
    } catch {
      // A revocation that fails still ends the session locally; it must not trap
      // somebody in a signed-in page because the network blinked.
    }
    this.setSession(null);
  }

  setSession(session) {
    this.session = session;
    if (!session) sessionStorage.removeItem(SESSION_KEY);
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  // ── data ────────────────────────────────────────────────────────────────
  async select(table, params = [], { single = false } = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.rest(`/rest/v1/${table}${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: single ? { Accept: 'application/vnd.pgrst.object+json' } : undefined,
    });
  }

  async insert(table, row) {
    return this.rest(`/rest/v1/${table}`, {
      method: 'POST',
      body: JSON.stringify(row),
      headers: { Prefer: 'return=representation' },
    });
  }

  async update(table, params, patch) {
    const qs = new URLSearchParams(params).toString();
    return this.rest(`/rest/v1/${table}?${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      headers: { Prefer: 'return=representation' },
    });
  }

  async rpc(fn, args = {}) {
    return this.rest(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
  }

  async signedUrl(bucket, path, expiresIn = 60) {
    return this.rest(`/storage/v1/object/sign/${bucket}/${path}`, {
      method: 'POST',
      body: JSON.stringify({ expiresIn }),
    });
  }

  // ── plumbing ────────────────────────────────────────────────────────────
  /** One retry, and only on a 401: an expired access token is the ordinary case. */
  async rest(path, init) {
    try {
      return await this.raw(path, { ...init, auth: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && this.session?.refresh_token && !this.sessionExpired()) {
        await this.refresh();
        return this.raw(path, { ...init, auth: true });
      }
      throw e;
    }
  }

  async raw(path, { method = 'GET', body, headers = {}, auth = false } = {}) {
    const res = await fetch(`${this.url}${path}`, {
      method,
      headers: {
        apikey: this.anonKey,
        'Content-Type': 'application/json',
        ...(auth && this.session?.access_token ? { Authorization: `Bearer ${this.session.access_token}` } : {}),
        ...headers,
      },
      body,
    });
    const text = await res.text();
    const parsed = text ? safeJson(text) : null;
    if (!res.ok) {
      throw new ApiError(parsed?.msg || parsed?.message || parsed?.error_description || res.statusText, res.status, parsed);
    }
    return parsed;
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Claims inside the access token. Reading one is not trusting it — every query is checked by RLS. */
export function decodeClaims(accessToken) {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** The assurance level is a claim inside the access token; reading it is not trusting it. */
export function decodeAal(accessToken) {
  return decodeClaims(accessToken)?.aal ?? null;
}
