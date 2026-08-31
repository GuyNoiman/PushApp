/**
 * Bootstrap and routing.
 *
 * The tab is in the fragment, never the query string or the path: §10 forbids
 * sensitive content in browser URLs, and a fragment is the one part of a URL a
 * browser does not send to a server. Nothing identifying a report goes in there
 * either — a report is opened by clicking a row, and closing the tab forgets it.
 */
import { Api } from './api.js';
import { createAuditor, ACTIONS } from './audit.js';
import { el, clear } from './dom.js';
import { renderHealth } from './views/health.js';
import { renderKpis } from './views/kpis.js';
import { renderReports } from './views/reports.js';
import { renderVersions } from './views/versions.js';
import { renderSettings } from './views/settings.js';
import { renderUsers } from './views/users.js';

const TABS = [
  { id: 'health', label: 'System health', render: renderHealth },
  { id: 'kpis', label: 'KPIs', render: renderKpis },
  { id: 'reports', label: 'User reports', render: renderReports },
  { id: 'versions', label: 'Versions', render: renderVersions },
  { id: 'users', label: 'Users', render: renderUsers },
  { id: 'settings', label: 'Settings', render: renderSettings },
];

const config = window.PUSHAPP_CONSOLE ?? {};
const signin = document.getElementById('signin');
const signinForm = document.getElementById('signin-form');
const mfaForm = document.getElementById('mfa-form');
const signinError = document.getElementById('signin-error');
const chrome = document.getElementById('chrome');
const view = document.getElementById('view');
const foot = document.getElementById('foot');

let api;
let ctx;
let pendingChallenge = null;

try {
  api = new Api({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey });
} catch (e) {
  signinError.hidden = false;
  signinError.textContent = e.message;
}

if (api) {
  const redirect = api.consumeRedirect();
  if (redirect?.error) showSigninError(new Error(redirect.error));
  else if (!api.signedIn) strandedNotice();

  document.getElementById('google').addEventListener('click', () => api.signInWith('google'));

  if (api.signedIn) start().catch(showSigninError);
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signinError.hidden = true;
    const data = new FormData(signinForm);
    try {
      await api.signIn(String(data.get('email')), String(data.get('password')));
      const mfa = await api.assuranceLevel();
      if (mfa.enrolled && mfa.current !== 'aal2') {
        const factor = mfa.factors[0];
        pendingChallenge = { factorId: factor.id, challenge: await api.challengeMfa(factor.id) };
        signinForm.hidden = true;
        mfaForm.hidden = false;
        return;
      }
      await start();
    } catch (err) {
      showSigninError(err);
    }
  });

  mfaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signinError.hidden = true;
    const code = String(new FormData(mfaForm).get('code'));
    try {
      await api.verifyMfa(pendingChallenge.factorId, pendingChallenge.challenge.id, code);
      await start();
    } catch (err) {
      showSigninError(err);
    }
  });

  document.getElementById('sign-out').addEventListener('click', async () => {
    try {
      await ctx?.audit.record(ACTIONS.SIGN_OUT, null);
    } catch {
      // Signing out must not be blocked by a log line. Every other audited action
      // in this console refuses to proceed without one; this is the exception,
      // because the alternative is a page somebody cannot leave.
    }
    await api.signOut();
    window.location.reload();
  });
}

async function start() {
  const audit = createAuditor(api, () => api.userId);
  let roles = [];
  try {
    const rows = await api.select('admin_members', [['select', 'roles'], ['user_id', `eq.${api.userId}`]]);
    roles = rows?.[0]?.roles ?? [];
  } catch {
    roles = [];
  }
  const mfa = await api.assuranceLevel().catch(() => ({ enrolled: false, factors: [], current: null }));
  ctx = { api, audit, roles, mfa, aal: mfa.current };

  try {
    await audit.record(ACTIONS.SIGN_IN, null);
  } catch {
    // A sign-in by somebody who holds no role cannot append to the audit log —
    // the policy requires membership. That is correct: there is no operator
    // session to log. The page below says as much.
  }

  signin.hidden = true;
  chrome.hidden = false;
  view.hidden = false;
  foot.hidden = false;
  document.getElementById('who-email').textContent = `${api.email ?? ''}${roles.length ? ` · ${roles.join(', ')}` : ' · no operator role'}`;
  document.getElementById('foot-note').textContent =
    'Authorisation is decided in the database by has_admin_role(), reading admin_members. This page cannot grant itself anything.';

  buildTabs();
  window.addEventListener('hashchange', route);
  if (roles.length === 0) {
    clear(view);
    view.append(
      el('section', { class: 'card' }, [
        el('h1', { text: 'This account holds no operator role' }),
        el('p', { text: 'Signing in worked. Reading anything here did not, and will not, until a row exists in admin_members for this account.' }),
        el('p', { class: 'muted', text: 'The first one is inserted by hand, in the SQL editor, by somebody who already has database access. A migration that named the first owner would put a claim about a person in the repository forever.' }),
      ]),
    );
    return;
  }
  route();
}

function buildTabs() {
  const nav = clear(document.getElementById('tabs'));
  for (const t of TABS) {
    nav.append(el('button', { type: 'button', 'data-tab': t.id, text: t.label, onclick: () => { window.location.hash = t.id; } }));
  }
}

function route() {
  const id = (window.location.hash || '#health').slice(1);
  const tab = TABS.find((t) => t.id === id) ?? TABS[0];
  for (const b of document.querySelectorAll('#tabs button')) {
    if (b.dataset.tab === tab.id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  clear(view);
  Promise.resolve(tab.render(view, ctx)).catch((e) => {
    clear(view);
    view.append(el('section', { class: 'card' }, [el('p', { class: 'error', text: e.message })]));
  });
}

function showSigninError(err) {
  signinError.hidden = false;
  signinError.textContent = err?.message ?? String(err);
}

/**
 * A sign-in that left this page and came back with neither a session nor an
 * error. There is one likely cause and it is worth naming: Supabase checks the
 * return address at the CALLBACK and silently substitutes the project's Site URL
 * when it does not match, so the person lands somewhere else entirely.
 */
function strandedNotice() {
  const attempted = api.strandedAttempt();
  if (!attempted) return;
  api.clearAttempt();
  signinError.hidden = false;
  signinError.replaceChildren(
    el('b', { text: 'The sign-in came back without a session.' }),
    el('p', { text: 'Add this exact value under Authentication → URL Configuration → Redirect URLs:' }),
    el('code', { text: attempted }),
  );
}
