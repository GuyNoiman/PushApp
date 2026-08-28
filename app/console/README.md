# The operations console

An internal website — not a screen in the app (PRD §5). Four tabs, one origin, no
build step and no dependency: `index.html`, one stylesheet, and a handful of ES
modules the browser loads directly. Everything it knows it learned from a `fetch`
against the project's own Supabase.

Built to `04_Product/PRD/Operational_Monitoring_Admin_Console_PRD.md` (Approved,
2026-08-25), stage 3 of
`11_Engineering_Bible/Operational_Monitoring_Implementation_Plan.md`.

## Who is allowed in, and who decides

The database does. Every table has row-level security on, and access is decided
by `has_admin_role()` — a `SECURITY DEFINER` function that reads `admin_members`
and takes the caller from `auth.uid()`. It has no parameter for "who am I", which
is what stops it being a way to ask about somebody else.

That is why a static page holding the anon key is not a hole: the key names the
project, not the caller. A browser with the key and no session reads nothing. This
is what §10's "server-side authorization on every query" means when the server is
the database.

**There is no operator yet.** `admin_members` is empty and no migration fills it —
a file in the repository that named the first owner would be a permanent claim
about a person, greppable forever. The first row is inserted by hand:

```sql
insert into public.admin_members (user_id, roles)
values ('<the auth user id>', array['owner'])
on conflict (user_id) do update set roles = excluded.roles;
```

Until then the console signs in and says the account holds no operator role. That
is the system working.

## Running it

```bash
npm run console:config
```

That writes `console/config.js` from the app's own `.env` — the same two
client-safe values, read from the one place they already live. The file is
gitignored for the reason `.env` is: a value committed twice gets updated once.

Then serve the folder over http (`file://` will not do — ES modules need an
origin):

```bash
npx --yes serve console -l 4321
```

## Deploying it

**Not deployed yet, on purpose.** EAS Hosting's free tier is the intended home —
the same account that already builds the app and already serves the invitation
page, so no new account and no new billing relationship. The open question is
*where*: `eas deploy` publishes one production deployment per project, and the
invitation page is already using it. Pointing the console at the same one would
replace the page testers are given.

So this waits on the founder's answer about a subdomain. When it has one, the
deploy is the same shape as the landing page's:

```bash
npx eas-cli@latest deploy --prod --export-dir console
```

## What each tab can actually answer today

| Tab | State |
|---|---|
| **System health** | Partial, and honest about it. Two of thirteen services have a real check; the rest are **gray**, each with a written reason. The headline number of §6.2 shows no percentage at all, because it needs a count of active installations that nothing reports. |
| **KPIs** | Empty by design. Its data needs a separate product-analytics consent (§11.2) that nobody has been asked for. `kpi_events` accepts rows and the app sends none. |
| **User reports** | Complete. List, filters, triage, notes, the prepared reply, and the audited attachment open. |
| **Versions** | Complete for what is recorded. §9.2's ten statuses and the adoption counts are absent because nothing records them — the page says so rather than labelling a row "Fully released" on a guess. |

## Three decisions worth not undoing by accident

**No search over descriptions.** Every filter is a column comparison. A support
queue with full-text search across what people wrote is a different thing than a
support queue, and once it exists nothing in the interface shows the difference.

**The audit write comes first.** §10 requires a log of attachment opens,
assignments, status changes and notes. Each of those awaits `audit.record()`
*before* acting, and a failed write stops the action. Acting first and logging
after produces exactly the state the requirement exists to prevent. Signing out
is the one deliberate exception — the alternative is a page somebody cannot leave.

**No `innerHTML`.** A report description is text somebody typed into a phone and
this page shows it to the one account that can read every report. `src/dom.js`
offers no way to inject markup, so there is nothing to reach for.

## What is missing and known

- **Multi-factor authentication is supported but not enforced.** The sign-in flow
  answers a TOTP challenge when the account has a factor enrolled; nothing yet
  *requires* one. §10 asks for MFA before production access, so Settings shows this
  as an open gate in red rather than letting it pass quietly.
- **Migration 0010 is not applied.** Operator notes, severity, the two missing
  terminal statuses and the fixed audit-append policy all depend on it.
- **Nothing writes to `app_versions`.** The publish tooling should record what it
  released; today the registry is filled by hand or not at all.
