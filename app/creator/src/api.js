/**
 * Supabase over `fetch` — REST, and the OAuth redirect flow the app's own
 * sign-in uses.
 *
 * ── WHY THIS FILE OVERLAPS `console/src/api.js` ──
 * Both talk to the same PostgREST, and about eighty lines of the plumbing are
 * the same shape. They are separate anyway, because each site is deployed as a
 * self-contained folder — a shared module outside the folder is simply not
 * served — and because the two differ where it matters: the operations console
 * signs in with a password into `sessionStorage` under an eight-hour cap, and
 * this one completes an OAuth redirect and keeps a session the way a product
 * surface does. If a third site appears, this is the moment to extract the
 * plumbing and accept a copy step or a bundler with it.
 *
 * ── SIGNING IN IS THE APP'S OWN SIGN-IN ──
 * The app authenticates with Apple and Google through Supabase (`signInWithIdToken`
 * against a native identity). A browser cannot do that exchange, so the web
 * equivalent is Supabase's `/auth/v1/authorize` redirect — the SAME provider,
 * the SAME Supabase project, and therefore the SAME account and user id. A
 * creator signs in here with the identity they already use in the app.
 *
 * Apple is not offered yet: Sign in with Apple on the web needs a Services ID
 * and a return URL configured separately from the native one. The button is
 * absent rather than broken, which is what the app's own sign-in screen does
 * with a provider the build cannot run.
 */

const SESSION_KEY = 'pushapp.studio.session';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class Api {
  constructor({ url, anonKey }) {
    if (!url || !anonKey) throw new Error('The studio is not configured. See creator/README.md.');
    this.url = url.replace(/\/+$/, '');
    this.anonKey = anonKey;
    this.session = readSession();
  }

  get signedIn() {
    return Boolean(this.session?.access_token);
  }

  get userId() {
    return this.session?.user?.id ?? null;
  }

  get email() {
    return this.session?.user?.email ?? null;
  }

  /**
   * Send the browser to the provider. `redirect_to` must be listed in the
   * Supabase project's redirect allow-list, or the provider returns here with an
   * error instead of a session — which is a configuration step, not a code one.
   */
  signInWith(provider) {
    const redirect = `${window.location.origin}${window.location.pathname}`;
    window.location.assign(
      `${this.url}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirect)}`,
    );
  }

  /**
   * Supabase returns the tokens in the URL FRAGMENT. A fragment is the one part
   * of a URL a browser never sends to a server, which is why the tokens are
   * there and not in the query string — and why this clears it from the address
   * bar the moment it has read it, so a session does not survive in history.
   */
  consumeRedirect() {
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const error = params.get('error_description') || params.get('error');
    const accessToken = params.get('access_token');
    if (!error && !accessToken) return null;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (error) return { error };
    this.setSession({
      access_token: accessToken,
      refresh_token: params.get('refresh_token'),
      expires_at: Number(params.get('expires_at')) || null,
      user: { id: subjectOf(accessToken), email: emailOf(accessToken) },
    });
    return { ok: true };
  }

  async refresh() {
    const token = this.session?.refresh_token;
    if (!token) throw new ApiError('No session', 401);
    const res = await this.raw('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: token }),
    });
    this.setSession(res);
    return res;
  }

  async signOut() {
    try {
      await this.raw('/auth/v1/logout', { method: 'POST', auth: true, body: '{}' });
    } catch {
      // Ending the session locally must not depend on the network.
    }
    this.setSession(null);
  }

  setSession(session) {
    this.session = session;
    try {
      if (!session) localStorage.removeItem(SESSION_KEY);
      else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // A browser refusing storage leaves the session in memory for this tab.
    }
  }

  // ── data ────────────────────────────────────────────────────────────────
  select(table, params = [], { single = false } = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.rest(`/rest/v1/${table}${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: single ? { Accept: 'application/vnd.pgrst.object+json' } : undefined,
    });
  }

  insert(table, row) {
    return this.rest(`/rest/v1/${table}`, {
      method: 'POST',
      body: JSON.stringify(row),
      headers: { Prefer: 'return=representation' },
    });
  }

  update(table, params, patch) {
    const qs = new URLSearchParams(params).toString();
    return this.rest(`/rest/v1/${table}?${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      headers: { Prefer: 'return=representation' },
    });
  }

  rpc(fn, args = {}) {
    return this.rest(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
  }

  async rest(path, init) {
    try {
      return await this.raw(path, { ...init, auth: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && this.session?.refresh_token) {
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
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Reading a claim out of the token is not trusting it — every query is checked again by RLS. */
export function claims(accessToken) {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

const subjectOf = (t) => claims(t)?.sub ?? null;
const emailOf = (t) => claims(t)?.email ?? null;
