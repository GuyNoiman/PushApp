# PRD — Account Deletion & Data Export

Status: **Backfill PRD** — documents an ALREADY-SHIPPED feature retroactively; captured 2026-08-13.
Not a forward spec.
Stage: **MVP (release gate)** (task O1).
Owner: founder + AI product team.
Related Decision Log: **D29** (item 5 — account deletion / data export is a non-negotiable App Store / Play
compliance gate, IN the MVP), **D28** (single-user Supabase auth for the POC — the backend this deletion
runs against).
Related code: `app/src/state/useAccountActions.ts`, `app/src/components/settings/DeleteAccountSheet.tsx`,
`app/src/core/auth/AuthGateway.ts` + `SupabaseAuthGateway.ts`, `app/src/core/AppCore.ts`
(`exportStateJson` / `resetToFirstRun`), `app/src/state/accountExport.ts`,
`app/supabase/functions/delete-account/index.ts` (Edge Function, **not deployed**).

---

## 1. Purpose

Apple and Google both require that an app which creates an account lets the user **export their data** and
**permanently delete their account** from inside the app. This is a hard release gate (D29), not a
growth feature — but it must be correct, because a half-deleted account or a leaked export is both a
compliance failure and a trust failure. The shipped design is deliberately conservative: export is
local-only and cleaned up immediately, and delete **refuses** to touch local data until the remote erasure
is confirmed, so a failed attempt is always fully recoverable.

## 2. Current shipped behavior

`useAccountActions` is the single orchestrator that sequences the moving parts; it holds no business logic
itself — AppCore owns the state wipe and export serialization, the `AuthGateway` owns the remote delete
(Engineering Bible §19).

### 2.1 Data export

`exportData()`:

1. Builds a JSON export via `core.exportStateJson({ appVersion, exportedAt, uid, handle })` — `uid` is only
   included when a real (non-anonymous) identity exists.
2. Merges the private profile blob (form of address, country, birth date, week start, communication style)
   read from `AsyncStorage` (`PROFILE_KEY`) via `mergeProfileIntoExport`, so the user's own copy includes
   **everything on device**.
3. Writes it to a temp file in the **cache** dir (`pushapp-export.json`), overwriting any stale export from
   an interrupted earlier attempt.
4. Hands it to the OS share sheet via `expo-sharing` (`Sharing.shareAsync`, `application/json`). Resolves
   `false` when the share sheet is unavailable (nothing to share with).
5. In a `finally`, **always deletes the temp file** — the plaintext export never lingers in the cache, even
   if sharing throws.

### 2.2 Account deletion

`DeleteAccountSheet` is the destructive confirmation UI: the danger button stays **locked** behind an
explicit affirmative gesture (the user must tick "I understand" before it unlocks), cannot be dismissed
mid-delete, resets its transient state on close, and turns a failure into a translated human message
(`errorOffline` vs. `errorGeneric`). It is i18n + RTL aware.

`deleteAccount()` enforces a **remote-first** order:

1. If a backend is `enabled`, it first checks `checkBackendHealth()`; if not `reachable` it throws
   `BackendUnreachableError` and **touches nothing local** (retry works once back online). Then it calls
   `deleteRemote()` (`AuthGateway.deleteAccount`), which **throws on any failure** — so a server error stops
   the flow with local data intact.
2. Only after the remote is confirmed gone (or there is no backend) does it wipe local, in order:
   `Notifications.cancelAllScheduledNotificationsAsync()` → `signOut()` → `core.resetToFirstRun()` →
   `AsyncStorage.multiRemove(ACCOUNT_STORAGE_KEYS)`. This leaves a clean first-run state.

`SupabaseAuthGateway.deleteAccount()` invokes the `delete-account` Edge Function and throws on error. The
`NullAuthGateway` version is an inert no-op (no backend ⇒ nothing remote to delete ⇒ the local wipe proceeds).

### 2.3 The Edge Function (server-side erasure)

`supabase/functions/delete-account/index.ts` (Deno) authenticates the **caller** from their own JWT and
deletes **only** that verified uid, using the service-role client solely for the privileged delete
(`auth.admin.deleteUser`), which cascades every dependent `public.*` row via `ON DELETE CASCADE`. It is a
complete server-side erasure — **when deployed.** It is intentionally outside the app's TS/ESLint program
(URL imports, `Deno.env`).

## 3. Decisions already made

- **D29 (item 5):** account deletion + data export are required for a public release and treated as a
  release gate (not needed for founder-only device testing).
- **Safety model (adopted):** export is local-only and immediately cleaned up; delete is remote-first and
  refuses the local wipe until the remote erasure is confirmed, so a failed attempt is recoverable.
- **D28:** the current backend is single-user POC auth; the deletion path is built against it.

## 4. Open questions & edge cases NOT yet handled — RELEASE-GATE GAPS

1. **The Edge Function is NOT deployed.** The file header states it plainly: until
   `supabase functions deploy delete-account` is run (and the `SUPABASE_SERVICE_ROLE_KEY` is set — a founder
   action deferred to pre-release), `functions.invoke('delete-account')` **fails**, and `deleteAccount`
   correctly refuses to wipe local data. So on a real backend today, **delete cannot complete** — it throws
   and the account stays. This is the primary blocker before any public release.
2. **No hosted Google Play account-deletion URL.** Google Play requires a **web-accessible** deletion request
   URL (usable without installing the app) in the Play listing. Nothing in the repo provides a hosted
   deletion page/endpoint; this is an unshipped compliance artifact, separate from the in-app path.
3. **Export is not a store requirement the same way, but its scope is unverified end-to-end.** The export
   merges the core state blob + the profile blob, but there is no test/QA confirmation that it captures
   **every** on-device store (e.g. language preference, theme, any other `AsyncStorage` keys outside
   `PROFILE_KEY` and the core blob). Confirm the export is genuinely complete before claiming "export all
   your data."
4. **Partial-wipe risk if the local sequence fails mid-way.** After a confirmed remote delete, the local wipe
   runs four steps in sequence with no transaction; if `resetToFirstRun()` or `multiRemove` throws after
   `signOut()`, the user is signed out of a deleted account but with residual local data. There is no retry
   for the local-wipe half (the recoverable path only covers the remote half). Worth a hardening pass.
5. **Anonymous / no-backend delete.** With `NullAuthGateway` (or an anonymous user), delete skips the remote
   step entirely and just wipes local — correct for POC, but means "delete account" on a device with no real
   identity is effectively a local reset. Confirm the UI copy doesn't over-promise a server erasure that
   isn't happening.
6. **Backups / replicas / AI processors.** The Edge Function cascades `public.*` rows, but there is no
   documented retention/deletion contract for Supabase backups, any future synced replica, or a cloud AI
   processor (currently none holds this data — the coach runs on-device). Flagged N/A until such a processor
   exists, consistent with D35 §12.7, but must be revisited before any cloud AI or sync lands.
7. **Export contains plaintext personal data.** The shared JSON is plaintext (the on-disk blob is encrypted,
   but the export is decrypted for the user). It is cleaned from cache immediately, but once handed to the OS
   share sheet it leaves PushApp's control (goes to whatever app the user picks). This is inherent to "export
   my data" but should be acknowledged in privacy copy.

## 5. Out of scope / deferred

- Deploying the Edge Function + provisioning the service-role key (pre-release founder action).
- A hosted Google Play deletion-request URL / web deletion page.
- General multi-user auth (the deletion path currently rides D28 single-user POC auth).
- A retention/deletion contract for backups, replicas, and any future cloud AI processor (backend-gated).
- Hardening the local-wipe half against a mid-sequence failure (§4.4).
