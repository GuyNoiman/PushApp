# Auth Backend Proposal — Sign in with Apple + Google

Status: **Approved-in-principle by the founder (2026-07-10)** — becomes Engineering Decision **E3** once P1–P2 land.
Prepared from a four-specialist review (architect · security-privacy · store-compliance · cost-guardian).

**Founder decisions (2026-07-10):**
- **Build the free foundation now** (P1–P2 + R2 secure-store) at $0, zero behavior change; the ~$99/yr Apple account + native Apple/Google + dev build (P3+) come as a later, separately-approved step.
- **Do NOT collect the user's real name** from Apple/Google — identity is the handle + Buddy; email stays quarantined in `auth.users`.
- Build path when P3 lands: local Xcode (recommended, $0). Privacy Policy / calendar-scope decisions deferred to their phases.

> Founder requirements driving this: real users need real accounts + a user-management backend,
> and **each user's private data must never be exposed to any other user.** Chosen auth =
> **Apple + Google sign-in** (passwordless, per the 2026-07-10 decision).

---

## 1. Approach (recommended)

**Supabase Auth via native ID-token exchange, behind a vendor-isolated `AuthGateway`.**
- **Apple:** `expo-apple-authentication` → native sheet → `identityToken` → `supabase.auth.signInWithIdToken({provider:'apple', token, nonce})`. Required on iOS and satisfies Apple's rule that offering Google obliges offering Sign in with Apple.
- **Google:** `@react-native-google-signin/google-signin` → `idToken` → the same `signInWithIdToken` shape (symmetric, tiny gateway). Fallback: Expo AuthSession (browser+PKCE) if the native module is painful.
- **No email/password, no SMTP** (keeps cost at $0 and matches the existing E2 decision).
- Reuses the existing Supabase client + session persistence and the `auth.users` table the social schema already references (`profiles.id → auth.users(id)`), so **no schema migration is needed for basic auth**.

## 2. Architecture — extends the existing pattern, no new lock-in

- New `app/src/core/auth/` mirroring `app/src/core/social/`: `AuthGateway.ts` (pure-TS interface + `NullAuthGateway`), `SupabaseAuthGateway.ts` (the ONLY file importing the vendor SDKs; reuses the existing Supabase singleton), `index.ts` (`getAuthGateway()` factory keyed on a new `featureFlags.auth`).
- New `app/src/state/AuthProvider.tsx` (React bridge, same discipline as `SocialProvider`), composed **outside** `SocialProvider` in `_layout.tsx`.
- `SocialProvider` relinquishes its self-initiated anonymous sign-in; `AuthProvider` owns session bootstrap; social reacts to `onAuthChange`.
- New `app/src/app/sign-in.tsx` (POC): Apple + Google buttons, equal prominence, Apple's official button styling.
- **Soft-gate:** local pillars (Journeys, Buddy, Coins — all offline-first) keep working anonymously; sign-in unlocks durable/social identity. We never block core behavior behind login (Bible §8, "local before cloud").

## 3. Anonymous → real-account linking (preserves all data)

The app already mints a per-device anonymous user. On real sign-in we call **`linkIdentity`** to attach the Apple/Google identity to the **same `auth.uid()`** — so the profile, friendships, allies, and snapshots stay owned; **no data migration, no orphaning**. Local offline data is untouched (it isn't keyed to the server uid). Collision case (same identity already on another account) is resolved server-side, never by copying rows across uids.

## 4. Privacy red-lines — MUST be true before any real user data is stored

- **R1 — No PII in world-readable tables.** `profiles` is readable by every authenticated user, so **name/email must never be written to `public.*`** — they stay only in Supabase-managed `auth.users`. `buddy_summary` stays cosmetic (keys whitelisted to `{name,stage,level}`, where `name` is the *Buddy's* pet name, not the person's).
- **R2 — Sessions in `expo-secure-store`, not `AsyncStorage`.** Today the session sits in plaintext AsyncStorage — fine for throwaway anonymous users, **not** for a real person's long-lived refresh token. Move to the OS keychain/keystore. *(This hardening can be done now, independent of the rest.)*
- **Service-role key server-only** — never in the app bundle or any `EXPO_PUBLIC_*` var (verified true today; keep it true).
- **Sign-out** must revoke the refresh token server-side + tear down the realtime `cheers` channel.
- **No friend-discovery by email/phone/contacts** — keep handle-exact-match only (avoids PII enumeration).
- The DB-layer RLS model is already sound and unchanged by OAuth (`auth.uid()` is `auth.uid()` regardless of how the session was born).

## 5. Store-compliance — required before TestFlight/submission

- Apple Developer Program membership (see cost); explicit `ios.bundleIdentifier`; App ID with "Sign in with Apple" capability.
- Sign in with Apple at equal prominence to Google, official Apple button, name+email only, private-relay (`@privaterelay.appleid.com`) accepted, name captured on first auth only.
- **In-app account deletion (mandatory, Apple-tested):** real delete + cascade across social tables + Apple token-revocation API; plus a **public web deletion page** (also needed for Google Play).
- **Privacy Policy URL + Support URL** (net-new — need founder/legal); **App Privacy nutrition label** (name/email; add Location/Calendar when those land); app-target `PrivacyInfo.xcprivacy`.
- ATT **not** required (no cross-app tracking). Google Play (~$25 one-time) only when Android ships.

## 6. Cost (cost-guardian)

| Item | Trigger | Cost | Free alternative |
|---|---|---|---|
| **Apple Developer Program** | Sign in with Apple + real device build + TestFlight/store | **~$99/yr (~₪370)** | none — the one unavoidable cost |
| Google sign-in / OAuth | project + client id | **$0** | — |
| Supabase (real accounts) | already free tier | **$0** to ~50k MAU | Pro (~$25/mo) only at Commercial scale |
| EAS cloud build | dev build off Expo Go | free-tier minutes | **local Xcode build = $0** (recommended) |

**Only real spend to ship iOS auth: the ~$99/yr Apple account.** Everything else $0 at MVP scale.

## 7. Build/runtime change

Native Apple/Google modules don't run in **Expo Go** → we move to a **dev build** (recommend **local Xcode** on the founder's Mac, $0). The QR-in-Expo-Go loop ends for auth, but Metro still hot-reloads JS over-the-air; only native-module changes need a rebuild.

## 8. Phasing (each phase independently reviewable)

- **P1 — Gateway skeleton** (`AuthGateway` + `NullAuthGateway` + factory + `featureFlags.auth`). Pure TS. **$0, zero behavior change** (still anonymous).
- **P2 — AuthProvider + session ownership** (move anon bootstrap out of SocialProvider). **$0, zero behavior change.** *(R2 secure-store hardening fits here.)*
- **P3 — Dev build stand-up** (app.json config, `npx expo install` native modules, first dev client, Apple/Google configured in Supabase + consoles). **Needs the Apple account.**
- **P4 — Apple sign-in** (+ link-from-anonymous, sign-out).
- **P5 — Google sign-in** (symmetric).
- **P6 — Hardening** (secure-store finalized, collision fallback, error surfaces, security review).
- **P7 — Compliance & docs** (account deletion + web page, privacy policy, nutrition label, E3 decision entry, sign-in copy).

**P1–P2 (and R2) can start immediately at $0 with no user-visible change.** P3+ is gated on the Apple-account approval.

## 9. Open decisions for the founder

1. **Approve the ~$99/yr Apple Developer Program** — gates P3+ (native build, Apple/Google, TestFlight). *(Cost warned in Hebrew per CLAUDE.md §3.10.)*
2. **Collect the real name from Apple/Google?** — security-privacy recommends **no** (identity = handle + Buddy; the legal name is pure liability). Email stays quarantined in `auth.users` regardless.
3. **Build path:** local Xcode ($0, recommended) vs EAS cloud (free-tier minutes).
4. **Privacy Policy / Terms** content + hosting (needs founder/legal — net-new; required before submission, not before P1–P2).
5. *(Later, for the calendar feature)* on-device calendar (`expo-calendar`, no OAuth verification) vs Google Calendar API (~10-day Google sensitive-scope verification). Deferred to that phase.
