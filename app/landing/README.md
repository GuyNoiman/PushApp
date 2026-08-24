# The invitation landing page

One static file, `index.html`, with no build step, no framework, no trackers and no external
requests. Somebody is handed a link and has to end up with the app on their phone; that is the whole
job.

## Where it is hosted

**EAS Hosting**, on the free tier of the Expo account the app already uses (founder, 2026-08-24:
"a free option at this stage"). It was chosen over Netlify/Vercel for one reason that outranks
features: it needs no new account, no new login and no new billing relationship — it is the account
that already builds the app. GitHub Pages was ruled out because it would need this repository to be
public or a paid plan.

Deploy from `app/`:

```bash
npx eas-cli@latest deploy --prod --export-dir landing
```

The command prints the URL. A redeploy of the same project keeps it.

## What to change, and when

`LINKS` at the top of the script — two URLs, one per platform. Today they point at TestFlight and at
the Android build's install page. **When the app is in the stores, those two lines are the only
change this page needs.**

## What it does not do

No token redemption. `Invite_Friend_Acquisition_PRD` §2.2 wants a server-issued opaque token, and
there is no server for it yet — so the page reads a `?code=` from the link and shows it prominently,
which is the PRD's own iOS baseline (§2.1.4) rather than a stand-in for it. Nothing is sent anywhere;
the code is displayed and that is all.
