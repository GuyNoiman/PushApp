# Accounts: restore that works, sign-out that is safe, and temporary username accounts

**Status:** Planned 2026-09-17 by the architect. Stages 0–1 in build (permanent fixes, no decision
needed). Stage 2 screens to be rendered for the founder. Stage 3 temporary, needs security-privacy
review before deploy. Stage 4 needs the founder's Portrait choice.

**Founder's request (2026-09-17):** no passwords during development; a username alone signs in; a
"Create a new account / Sign in" screen before onboarding; Apple and Google unchanged but with a real
distinction between an existing account and a new one (by email/identity); an unknown username gets
"this username does not exist".

## Found while planning — these affect every account, not only test ones

1. **Restoring an account on a fresh device does not work today.** `StateBackupProvider` checks for a
   backup once per app life, and that one check is spent on the ANONYMOUS session created at launch;
   a later Apple/Google sign-in is never checked. (Confirmed: `restoreChecked` ref.)
2. **`SupabaseStateBackupGateway.requireUid()` caches the first user id it sees** — the anonymous one —
   so after a real sign-in, fetch reads the wrong row and save is refused by RLS and swallowed.
   (Confirmed.)
3. **Backups need a `profiles` row nothing creates.** `account_state.user_id` references `profiles`,
   whose `handle` is NOT NULL, and no code creates the row at sign-in since the profile page left the
   first run. Unless a hand-made trigger exists, every backup save for a new account fails silently.
4. **A write can land before the restore** and overwrite the account's real backup with an empty device.
5. **Settings › Sign out only ends the session.** Local data stays; if another account then signs in,
   the previous person's Journeys are kept and backed up INTO the other account. A cross-account leak.
6. Conversation budget/trace key prefixes and the messaging device key survive account deletion.
7. Single-user env builds re-sign-in after sign-out and must disable switching.

## Design

**Order:** language → **account choice** (no pager dot) → Create: welcome → purpose → prepare → account
(create) → conversation… | Sign in: sign-in screen → existence check → wipe device, restore → Home (or
resume onboarding where that account stopped). Welcome's "I already have an account" goes to sign-in.

**New vs existing (Apple/Google):** checked right after `signInWithIdToken` through an RPC
`account_entry_status()` → created_now / has_backup / onboarding_complete.

| Chosen | Account | Result |
|---|---|---|
| Sign in | complete | wipe local → restore → Home |
| Sign in | incomplete | wipe local → restore → resume onboarding |
| Sign in | none | delete the just-created auth user, sign out, "No account found for this Apple ID / Google account. Create a new one." |
| Create | none | continue to the conversation |
| Create | exists | "An account already exists" + Sign in instead |

**Username accounts (temporary):** Edge Function `dev-username-auth` creates users with a synthetic
`dev-<uuid>@dev.pushapp.invalid` email and `app_metadata.dev_account = true`, and signs in by minting a
session server-side (`generateLink` + `verifyOtp`, no email sent). No secret on the client. Usernames in
a PRIVATE table `dev_accounts` — never `profiles.handle`, which every signed-in session can read. Rules:
lowercase, `^[a-z0-9][a-z0-9-]{2,23}$`, unique. Can only ever reach users it created, never a real
Apple/Google account.

**Containment:** server switch closed by default (`dev_settings.username_login` AND secret
`DEV_USERNAME_LOGIN=on`); the UI shows nothing unless the server says on; rate limits (10 sign-ins per 15
min per hashed IP, 100 failures/day, 10 creates/day, 30 dev accounts max); purge SQL; **code removed
before any store submission** (App Review 2.3.1, hidden features). Turning the switch off does not end
sessions already minted — turn off AND purge.

**Switch account (sign-out):** flush backup → suspend writes → cancel notifications → reset to first
run → wipe all account keys except language and theme (including Personal Details, tester flag,
budget/trace prefixes, KPI once-keys; REPLACE the KPI install id) → sign out → fresh anonymous session →
resume at account choice.

**Portrait in the backup — the founder's choice:**
- *Option 1 (his 2026-08-24 rule):* the reading travels (domain, stage, bottleneck, supportNeed,
  readiness), the free text stays on the phone. After a switch there is no "coach remembers me" opening,
  because the handoff needs `primaryWant`.
- *Option 2:* the whole Portrait travels — recommended ONLY for dev username accounts. Purging dev
  accounts deletes every full-text Portrait on the server.
- *Architect's recommendation:* both — Option 2 for dev accounts, Option 1 as the rule for real ones.
  Personal Details (name) are not in the backup either, so a restored account is not greeted by name.

## Stages
- **0 · Backup and restore work (permanent).** Live-project checks first (triggers on `auth.users`,
  users without `profiles`, `account_state` count, anonymous sign-ins on). Migration: profiles trigger
  with generated handle + backfill, `account_entry_status()`. Gateway reads the user id every call;
  restore check per user id; no writes before restore; no anonymous backups; deletion wipes prefixes.
- **1 · Safe sign-out (permanent).** `switchAccount()` as above, with a key-classification test that
  fails when a new `pushapp.` key is neither wiped nor kept.
- **2 · Choice and sign-in screens (permanent).** ux-designer renders them first; `decideAccountEntry`.
- **3 · Username accounts (temporary).** Verify `generateLink`+`verifyOtp` on the real project; security
  review; deploy with the switch off.
- **4 · Portrait in the backup.** Per the founder's choice.

**Cost:** Supabase free tier throughout. Each new dev account gets its own LLM allowance — cost-guardian
before Stage 3 is switched on.
