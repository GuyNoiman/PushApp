# PRD — Notification Content Service

Status: **Backfill PRD** — documents an ALREADY-SHIPPED feature retroactively; captured 2026-08-13.
Not a forward spec.
Stage: **MVP** (infrastructure slice of the unified notification service).
Owner: founder + AI product team.
Related Decision Log: **D40** (build a unified notification service as infrastructure now, with per-type
templated phrasing that will later be tone-driven; add ALL NINE Support-Circle notification types even if
not all fire yet), **D31** (gender-aware form of address applied to copy via i18next context), and the
`Communication_Style_Profile_PRD.md` (the tone layer this seam is built for).
Related code: `app/src/core/notify/notificationContent.ts`, `app/src/core/notify/notificationTypes.ts`
(commit 30ea92f), `app/src/i18n/addressForm.ts`, `app/src/core/communication/communicationProfile.ts`,
`app/src/i18n/resources/{en,he}/notify.json`.

---

## 1. Purpose

Every notification PushApp sends — the shipped per-Journey reminder today, and the nine Support-Circle
notices once their backend lands — should read consistently, respect the user's language and grammatical
form of address, be safe on a lock screen, and be **ready** to take on the user's communication tone without
each trigger re-implementing copy. This PRD documents the **content layer** of the unified notification
service (D40): the catalogue of notification types and the one pure function that turns a type + params into
a localized `{ title, body }`. It is deliberately infrastructure-first — the catalogue is complete before the
triggers exist, so wiring a future trigger is a one-line call, not a new type.

## 2. Current shipped behavior

### 2.1 The type catalogue (`notificationTypes.ts`)

`NotificationType` is the source of truth: **ten** kinds total — the one live `reminder` plus **nine
Support-Circle types** defined but dormant until the Support Circle backend wires them:
`ally_request`, `ally_accepted`, `ally_declined`, `ally_permission_changed`, `ally_removed`,
`journey_frozen`, `journey_resumed`, `journey_completed`, `journey_closed`.

Each type carries static metadata (`NOTIFICATION_TYPES`): a stable `id`, an i18n `keyGroup` (title/body keys
are `${keyGroup}.title` / `${keyGroup}.body` in the `notify` namespace), its interpolation `params`, and a
**privacy classification**:

- `lock-safe` — the body is a fixed template that interpolates **only a person's display name**; all nine
  social types are lock-safe.
- `owner-content` — the body may carry the recipient's **own** Journey/Step text, because it fires on the
  owner's own device about their own content (the `reminder` type).

The compile-time `NotificationParamsByType` enforces this: social types accept only `{ name }`; `reminder`
accepts optional `{ journeyTitle?, stepTitle? }`. There is no field through which a social notice could carry
the owner's private free text.

### 2.2 The content builder (`notificationContent.ts`)

`buildNotificationContent(type, params, ctx)` is **pure and framework-free** (deterministic, no I/O, no
React). It reads copy through the framework-free i18next core (`i18n.t`, never a hook), and:

- applies the user's **form of address** as i18next context (D31 — `addressContext`);
- applies the user's **communication style** (D40) as a tone suffix: `toneKeySuffix` maps a style id to a key
  suffix (e.g. `warm` → `reminder.body_warm`), and `tonedKeys` returns `[tonedKey, baseKey]` so i18next uses
  the toned variant when it exists and **safely falls back to the base copy** when it doesn't — a missing
  variant is never a raw key;
- for `reminder` (owner-content), passes through the recipient's own `journeyTitle` / `stepTitle` when
  present, falling back to a gentle localized nudge so a reminder is never blank;
- for social types, interpolates only the trimmed display `name`, degrading a missing/blank name to a
  localized generic ("someone") rather than leaking a `{{name}}` placeholder onto the lock screen.

## 3. Decisions already made

- **D40:** unified notification service built as infrastructure now; per-type templated phrasing that will
  become tone-driven; **all nine** Support-Circle types defined up front even though only `reminder` fires.
- **D31:** copy is gender-aware via i18next context (form of address).
- **Privacy (G1 + store rules):** social bodies are lock-safe fixed templates carrying only a display name;
  the param contract makes leaking owner free text structurally impossible.

## 4. Open questions & edge cases NOT yet handled

1. **`buildNotificationContent` is built but not wired to a delivery path.** It produces `{ title, body }`,
   but there is **no push backend** and the nine social types have no trigger that calls it. Only the shipped
   per-Journey reminder actually delivers, and it is scheduled through the existing on-device notification
   path — confirm whether that path already routes through `buildNotificationContent` or still builds its own
   copy (the content service exists ahead of full adoption). The social types are **dormant**: defined,
   typed, and translated, but nothing fires them.
2. **Deferred CommunicationScheduler → buildNotificationContent routing.** The intended wiring — the
   scheduler resolving copy through this service for every send — is not complete. Until it is, this service
   is a ready seam rather than the single live copy path for all notifications.
3. **Tone variants are largely unwritten.** The tone mechanism (suffix + fallback) ships, but whether the
   `notify` namespace actually contains `_<style>` variants for each type is unverified. In practice most
   types will fall back to base copy until the Communication Style work authors the variants — correct by
   design, but means "tone-driven notifications" is not yet visible to users.
4. **No delivery-time re-resolution of language / form of address.** Copy is built at call time in the
   user's current language and form of address. A scheduled reminder built now but delivered later (after the
   user changes language) has not been re-resolved — worth confirming whether reminders build copy at
   schedule time or fire time.
5. **iOS 64-local-notification cap interaction.** The content service says nothing about scheduling limits;
   the cap lives in the (separate) scheduler (D21). Once social types fire, the volume/cap interaction across
   all ten types needs its own pass.
6. **Privacy re-check when social types go live.** The lock-safe classification is enforced today only
   because no social trigger exists. When they wire in, security-privacy must confirm each trigger passes
   only `{ name }` and never routes owner content through a social type — the type system helps, but the
   trigger call sites are the real risk surface.

## 5. Out of scope / deferred

- A push backend and the delivery mechanism for the nine social types (Support Circle backend slice).
- Full CommunicationScheduler → `buildNotificationContent` routing for every notification (§4.2).
- Authoring the per-style tone variants in the `notify` namespace (Communication Style work).
- Scheduling/cap orchestration across all types (owned by the scheduler / D21).
