# Push notifications for social activity — implementation plan

**Status:** Approved in principle (founder, 2026-09-16: "הייתי רוצה לקבל נוטיפיקציה על כך"). Plan
written by the architect the same day; **not built**. Stage: MVP.
**Why:** today the only push in the product is the person's own local reminders. If an Ally cheers or
nudges and the app is closed, the person never finds out. For a product built on "you do not have to
walk it alone", that is a broken loop, not a missing extra.

**Reviews required before any code:** security-privacy (the token table, the RPCs, the dispatch
secret, server-side locale / time zone / Active Hours, new processors), store-compliance (APNs, FCM,
App Privacy label, Play Data Safety, permission wording), product-guardian (the event list and the
open questions below), cost-guardian (before the native builds).

---

## What the plan found first

1. **A bug in what exists today.** `app/src/state/SocialProvider.tsx` fires a local notification on
   every realtime cheer while the app runs. It ignores the cheer/nudge switches and Active Hours, is
   hard-coded English with an emoji, and calls `setNotificationHandler`, which REPLACES the handler
   `ReminderEngine.init()` installs — so after the first cheer, hiding the aggregate reminder while the
   app is open stops working. With real push it would also double every cheer. Fix: remove it; one
   handler owns every notification. (Recorded in `Gap_Register.md`.)
2. **Preferences and Active Hours live only on the phone.** A server cannot respect them unless a small
   copy is kept server-side. Reading them out of the `account_state` backup was rejected: 0004 says "we
   never query INTO it".
3. **Server profiles hold only a handle**, so the only name a push could ever show is the handle.
4. **The notification permission is asked by `ReminderEngine.init()`** from the onboarding reminders
   page and from Journey creation. That page's text talks only about reminders and must now also cover
   a friend's cheer.
5. **Account deletion already covers new tables**: `delete-account` calls `admin.deleteUser`, and every
   new table references `auth.users(id) on delete cascade`.
6. **Do not reuse the KPI installation id** (0016): it is deliberately unlinked from any account. Push
   gets its own random id.
7. **The documents currently promise the opposite.** Privacy Policy §3.1 says "We hold no push token
   and we cannot send you anything from a server"; §4 says "No push tokens"; the Privacy Contract says
   the same. All must change before anyone outside the pilot receives a push.
8. **The Notification Center PRD already sets the rules**: opaque ids only, one server event id for
   dedupe, independent in-app and on-phone switches, Active Hours applies, rate limits.
9. **Expo version**: `package.json` pins `expo ^54` / `expo-notifications ~0.32.17` while `app/AGENTS.md`
   points at the v57 docs. Build against what is installed.

---

## The design

**A transactional outbox in Postgres, filled by a trigger, sent by one Edge Function, with a per-minute
cron as the safety net.**

```
cheers INSERT ──trigger──▶ push_outbox row (unique per cheer)   [same transaction as the cheer]
                  └─pg_net kick (after commit, errors swallowed)──▶ Edge Function `social-push`
pg_cron every minute ─▶ kick_social_push(): calls the function only if a due row exists
social-push: claim due rows (SKIP LOCKED) ─▶ decide per recipient (pure policy) ─▶ Expo Push API ─▶ record outcome
```

The database already decides who may cheer whom (`cheers_send_ally` RLS), so a trigger on the
committed row is the one point that cannot be skipped, faked or double-fired by a client. The outbox
gives idempotency and somewhere to hold a cheer that arrives outside Active Hours.

Rejected: the sender's client calling a send function (trusts the sender); a webhook with no outbox
(no dedupe, nowhere to hold, no retry); cron only (up to 60 s delay); pgmq (more machinery than needed);
FCM/APNs directly (two credentials, two error formats — Expo push is free and fits); sending anyway and
letting the phone apply Active Hours (impossible on iOS with the app closed).

**Decision logic** lives in a pure module, `app/src/core/notify/socialPushPolicy.ts`, copied between
markers into the Edge Function with a parity test — the same pattern `mirror-synthesis` uses. SQL only
claims rows and supplies data.

---

## Which events push

| Event | Push | Stage | Why |
|---|---|---|---|
| Cheer | Yes | 1 | A human did it for you. The loop the founder asked for. |
| Nudge | Yes, gentle text | 1 | Same — **but not** when that Journey's latest status is `paused`: a nudge on a lock screen against a chosen break is pressure. Still in the bell. |
| Friend request, Support Circle invite, Mirror invite | Yes | 2 | Human requests waiting for an answer. |
| Journey paused / resumed | **Never** | — | News, not something done for you. |
| Ally declined / removed / permission changed | **Never** | — | A rejection must not appear on a lock screen. |
| A friend completed a Journey | Not now | Future | Needs its own product decision. |
| Direct messages | Separate plan | — | End-to-end encrypted; the body would never be in a push. |
| Anything the app writes on its own (inactivity, streaks, digests) | **Never** | — | The bell's one rule applies to push. |

**Batching (Stage 1b):** per recipient across devices. The first event in 10 minutes sends now; later
ones inside the window combine into one push when it ends ("2 people cheered you on"); the same person
counts once. One collapse id, so a newer push replaces an older undismissed one. **At most 6 social
pushes a day.** Dropped as `seen_in_app` if the person opened the app since.

---

## Token lifecycle

- **No new permission prompt.** Reuse the existing moment; the onboarding ask copy must mention a
  friend's cheer. Android 13+: create the `social` channel before requesting the token.
- **Registration** when permission is granted, a session exists and a social profile exists. Expo push
  token; a separate random push installation id plus a per-installation secret in SecureStore (the
  server stores only its SHA-256). RPC `register_push_device(installation_id, secret, token, platform,
  locale, time_zone)`.
- **Storage** (migration `0020_social_push.sql`, mirrored in `schema.sql`): `push_devices`, one row per
  device, RLS on with **no client policies**, not in realtime; token shape enforced by regex.
- **Refresh** on foreground when token, locale, time zone or permission changed, or every 7 days;
  permission revoked → unregister. Devices unseen for 90 days are purged.
- **Sign-out** calls `unregister_push_device(installation_id, secret)` BEFORE the session ends; if
  offline, a pending flag retries on the next launch — the secret makes it work without a session, which
  closes "signed out offline, the old account keeps pushing to this phone".
- **Account deletion**: server side cascades; the client clears the push id, secret and hash.

---

## The send path

- `push_preferences` — cheer/nudge push switches, `show_actor` (default false), Active Hours as three
  7-element arrays. No jsonb, no free text.
- `push_outbox` — recipient, actor, `kind in ('cheer','nudge')`, `source_id` → `cheers(id)`,
  `not_before`, status, a closed drop-reason list, attempts. **`unique (kind, source_id)`.**
- Functions all new names, each dropped by exact signature before creation (the 0019 overload trap):
  `enqueue_cheer_push()` trigger (wraps the pg_net kick in `exception when others then null` — **a push
  failure must never fail a cheer**), `claim_social_push` (SKIP LOCKED), typed settle functions,
  `kick_social_push` on pg_cron.
- Edge Function `social-push`: constant-time secret check, `--no-verify-jwt` because the caller is the
  database; batches of 100 to Expo with an access token and enhanced push security on. No title, no
  sound, `data: { v: 1, t: 'social' }` with no ids. `DeviceNotRegistered` forgets the token; errors
  before Expo accepted retry up to 3 times; **anything ambiguous is marked failed, never retried — a
  missed push is preferred to a duplicate, because the bell still has the cheer.** Logs carry counts
  and reason codes only.

Four layers against a double notification: the unique constraint, SKIP LOCKED, stuck rows fail rather
than retry, and the collapse id on the phone plus removing the local cheer notification.

---

## Respecting the person

- **Active Hours: hold, don't drop.** A cheer at 23:00 is still meant for the person the next morning;
  it goes out as one push when the window opens, after re-checking "opened the app since", the Ally
  still being an Ally, and the daily cap. Older than 24 h at that point → dropped, still in the bell.
- **Settings › Notifications**: Cheers and Nudges gain "Also on my lock screen", disabled when the
  in-app switch is off. **Trap:** `isSettingOn` treats a missing field as ON — right for the push
  switches, wrong for showing names, which needs its own reader defaulting to false.
- **Frozen accounts**: cheers push, nudges do not (support vs re-engagement) — product-guardian decides.

## What may appear on a lock screen

- **Default for everyone:** "Someone cheered you on." / "Someone is thinking of you." / "2 people
  cheered you on." — en and he, no emoji, no em-dash, never toned by communication style.
- **Never:** a Journey title, a Dream, a Step, a note, any id, a handle when the switch is off. Push text
  passes through Expo, Apple and Google — three processors. **Journey titles are not offered as an
  option at all**: a title about addiction on a lock screen is exactly the harm to avoid, and the server
  function has no access to titles by design.
- **Stage 2:** "Show who it's from", default off → "@dana cheered you on."
- **Pilot allowlist**: until the Privacy Policy is updated and published, only pilot accounts may
  register (`push_pilot`, dropped in Stage 1b).

## Store compliance

- **iOS:** APNs key via EAS and the `aps-environment` entitlement → **a new native build; an
  over-the-air update cannot deliver this.** Guideline 4.5.4 satisfied by generic text and no marketing.
- **Android:** FCM V1 — a Firebase project, `google-services.json`, the service-account key in EAS →
  new build. Channel before token on Android 13+. Play Data Safety: device or other IDs.
- **Documents to update before release:** Privacy Policy §3.1, §3.2, §3.3 (Expo, APNs, FCM as
  processors), §4, §5, §6, §9; the Privacy Contract; possibly the Terms (best-effort delivery); the
  delete-account page.

## Cost

| Active users | Function calls / month | Worst case (6/day cap) | Cost |
|---|---|---|---|
| 10 | ~3.5k | ~4.7k | $0 |
| 100 | ~9k | ~21k | $0 |
| 1,000 | ~63k | ~183k | $0 |

Supabase free tier allows 500k calls a month; Expo push, FCM (no-card Spark plan) and APNs are free.
**The only item touching a paid quota is EAS Build** — two new native builds and later rebuilds.
Consult cost-guardian first; the free alternative is building locally on the Mac.

---

## Stages

**1a · Pilot proof — founder and partner only (a cheer reaches a closed phone).**
1. Paper gate: security-privacy, product-guardian, cost-guardian.
2. **Founder setup (all free):** Firebase project, FCM V1 to EAS, APNs key via EAS, Expo enhanced push
   security and access token.
3. Migration 0020 (pilot form) and its static test.
4. Edge Function with generic text, no preferences yet.
5. Client registration and unregistration.
6. One notification handler; remove the local cheer notification; tap routes to the bell.
7. **New EAS builds for both phones**, then the device matrix.

**1b · Everyone.** The policy (Active Hours hold, batching, cap, stale drop, seen-in-app, Ally still
valid, paused nudge, frozen account); preferences table and sync; the settings switch; the onboarding
copy; the documents; migration 0021 drops the pilot allowlist.

**2.** Receipts and dead-token pruning; friend request, Support Circle and Mirror invites; "Show who
it's from".

**3 · Commercial.** Sender-side rate limit (F6); per-device Active Hours; an optional in-context
permission ask.

---

## Open questions, each with a recommended default

1. **Founder:** may a friend's handle ever appear on a lock screen? *Only if the person turns it on;
   default off.*
2. **Founder / product-guardian:** a cheer outside Active Hours — *hold and send one quiet push when the
   window opens.*
3. **product-guardian:** no nudge push on a paused Journey or to a frozen account; cheers still push.
   *Yes to both.*
4. **product-guardian:** a second in-context permission ask on accepting a first Ally? *Not now.*
5. **product-guardian:** sound? *Silent by default; the OS channel lets the person turn it on.*
6. **security-privacy:** commit `google-services.json`, or inject it through EAS environment files?

## Device test matrix (two real phones, new builds)

Fresh install creates a device row; iPhone swiped away → banner within ~10 s, generic text, tap opens
the bell; Android killed with the screen off for 15 minutes → arrives; background → exactly one; app
open → no banner, bell updates; three cheers in 30 s → one push; outside Active Hours → nothing until
the window; permission revoked → row gone; sign out → nothing arrives; sign out offline then reconnect
→ nothing; sign out of A into B on the same phone → only B's cheers; delete account → rows gone;
language switch → text follows; OS "hide previews" → body hidden.

## Related

- `04_Product/Gap_Register.md` · `04_Product/PRD/Notification_Center_PRD.md` ·
  `04_Product/Privacy_Policy.md` · `04_Product/Privacy_Contract_With_The_User.md` ·
  `app/src/core/engines/ReminderEngine.ts` · `app/src/state/SocialProvider.tsx`
