/**
 * Bootstrap and routing for the Journey Studio.
 *
 * Three states, in order, and each one is a real answer rather than a spinner:
 * signed out, signed in but not a creator, and a creator. The middle one is the
 * point of the permission check — §13.1 says an open creator platform must not
 * be the first release, so an ordinary account reaching this URL is expected,
 * and it should be told plainly rather than shown an error.
 */
import { Api } from './api.js';
import { el, clear } from './dom.js';
import { renderProfile } from './views/profile.js';
import { renderTemplate } from './views/template.js';
import { renderCreate } from './views/create.js';

const config = window.PUSHAPP_STUDIO ?? {};
const signin = document.getElementById('signin');
const signinError = document.getElementById('signin-error');
const chrome = document.getElementById('chrome');
const studioNav = document.getElementById('studio-nav');
const view = document.getElementById('view');
const themeButton = document.getElementById('theme');

const themes = ['system', 'light', 'dark'];
let theme = localStorage.getItem('pushapp-studio-theme');
if (!themes.includes(theme)) theme = 'system';
applyTheme();
themeButton.addEventListener('click', () => {
  theme = themes[(themes.indexOf(theme) + 1) % themes.length];
  if (theme === 'system') localStorage.removeItem('pushapp-studio-theme');
  else localStorage.setItem('pushapp-studio-theme', theme);
  applyTheme();
});

let api;
let ctx;
let routeGeneration = 0;

function applyTheme() {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  themeButton.textContent = `Theme: ${theme}`;
  themeButton.setAttribute('aria-label', `Theme: ${theme}. Activate to change.`);
}

try {
  api = new Api({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey });
} catch (e) {
  showError(e.message);
}

if (api) {
  const redirect = api.consumeRedirect();
  if (redirect?.error) showError(redirect.error);
  else if (!api.signedIn) strandedNotice();

  document.getElementById('google').addEventListener('click', () => api.signInWith('google'));
  document.getElementById('sign-out').addEventListener('click', async () => {
    await api.signOut();
    window.location.reload();
  });

  if (api.signedIn) start().catch((e) => showError(e.message));
}

async function start() {
  let creator = null;
  try {
    const rows = await api.select('creator_members', [['select', '*'], ['user_id', `eq.${api.userId}`]]);
    creator = rows?.[0] ?? null;
  } catch {
    creator = null;
  }
  ctx = { api, creator };

  signin.hidden = true;
  chrome.hidden = false;
  view.hidden = false;
  document.getElementById('who').textContent = api.email ?? '';

  if (!creator || creator.status !== 'active') {
    clear(view);
    view.append(
      el('section', { class: 'card' }, [
        el('h1', { text: creator ? 'This creator account is suspended' : 'This account is not a creator' }),
        el('p', {
          text: creator
            ? 'Signing in worked. Authoring and publishing are paused for this account.'
            : 'Signing in worked — this is the same account you use in the app. Authoring for the community is a separate permission, and this account does not hold it.',
        }),
        el('p', {
          class: 'muted',
          text:
            'Creator access is granted deliberately: the first creators are invited rather than ' +
            'self-serve. A creator subscription will eventually grant the same capability, and when it ' +
            'does it will be read by the same single check.',
        }),
      ]),
    );
    return;
  }

  studioNav.hidden = false;
  window.addEventListener('hashchange', route);
  route();
}

function route() {
  const generation = ++routeGeneration;
  const hash = (window.location.hash || '').slice(1);
  const [section, id] = hash.split('/');
  const active = section === 'new' ? 'new' : 'journeys';
  for (const link of studioNav.querySelectorAll('[data-route]')) {
    const isActive = link.dataset.route === active;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  clear(view);
  // Each route renders into its own root. If an older async request resolves
  // after navigation, it can update only its now-detached root—not the screen.
  const routeRoot = el('div', { class: 'route-view' });
  view.append(routeRoot);
  const done = (p) =>
    Promise.resolve(p).catch((e) => {
      if (generation !== routeGeneration) return;
      clear(routeRoot);
      routeRoot.append(el('section', { class: 'card' }, [el('p', { class: 'error', text: e.message })]));
    });
  if (section === 'journey' && id) {
    done(renderTemplate(routeRoot, ctx, id, () => { window.location.hash = 'journeys'; }));
  } else if (section === 'new') {
    done(renderCreate(routeRoot, ctx, {
      onCancel: () => { window.location.hash = 'journeys'; },
      onCreated: (templateId) => { window.location.hash = `journey/${templateId}`; },
    }));
  } else {
    done(renderProfile(routeRoot, ctx, {
      onOpen: (templateId) => { window.location.hash = `journey/${templateId}`; },
      onCreate: () => { window.location.hash = 'new'; },
    }));
  }
}

function showError(message) {
  signinError.hidden = false;
  signinError.textContent = message;
}

/**
 * The sign-in left this page and came back with no session and no error.
 *
 * There is exactly one likely cause and it is worth naming rather than
 * shrugging at: Supabase checks `redirect_to` against the project's allow-list
 * at the CALLBACK, and silently substitutes the Site URL when it does not
 * match. So the person is bounced somewhere else entirely — usually
 * `http://localhost:3000`, which is a browser error page — or lands back here
 * with an empty fragment. Neither says what to fix, so this does.
 */
function strandedNotice() {
  const attempted = api.strandedAttempt();
  if (!attempted) return;
  api.clearAttempt();
  signinError.hidden = false;
  signinError.replaceChildren(
    el('b', { text: 'The sign-in came back without a session.' }),
    el('p', {
      text:
        'Supabase only checks the return address after the Google account is chosen, and replaces ' +
        'one it does not recognise with the project’s Site URL — which is why this can end on an ' +
        'unreachable page instead of an error.',
    }),
    el('p', { text: 'Add this exact value under Authentication → URL Configuration → Redirect URLs:' }),
    el('code', { text: attempted }),
  );
}
