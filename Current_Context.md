# Current_Context.md

Status: Living handoff — read this right after `AI_Start_Here.md`, then only the docs it points to.
Last updated: **2026-08-24 (continued)** — start at the **"⛳ START HERE — 2026-08-24 (continued)"**
block, which supersedes (but does not replace) the "(late)" block under it.
Prior pointer: **2026-08-24 (late)** — the **"⛳ Previous START HERE — 2026-08-24 (late)"** block
below, and read its first section before merging anything. The overnight block under it is accurate
history of the same session's earlier half. The 2026-08-20 morning block under it is accurate history of the same day's earlier session. The
2026-08-19 blocks under it — night, evening, afternoon and morning — are accurate history of that
day's four sessions, and the 2026-08-18 blocks under those are accurate history of the day before.
Nothing below is deleted; each is superseded only as the starting point.
Prior: **2026-08-13 (SESSION — MVP-ready sweep)** — read the "⭐ HANDOFF SNAPSHOT — 2026-08-13
(SESSION — MVP-ready sweep)" just below (most current and authoritative). It supersedes — but does not
replace — the same-day "⭐ HANDOFF SNAPSHOT — 2026-08-13 (overnight autonomous session)" underneath it,
which is kept in full as accurate history of that earlier batch. Prior top snapshot before that:
2026-08-12 SESSION 2 (kept below as accurate history, superseded only as "most current"). Prior to
that: 2026-08-10 (kept below as accurate
history) — which itself noted: this
[08-10] session finished the i18n rollout, D30 (coach voice), J3
(Freeze/Resume + Journey.status), D31 (form of address), D33 (one week boundary), D34 (unified Own
Profile), and introduced the PRD-per-feature working method. Everything is **COMMITTED** (9 topic
commits) but NOT pushed, on branch `feat/buddy-3d-and-reminders`, **jest 548/548**. The 2026-08-09 and
older snapshots below are kept as accurate history. Prior top snapshot: 2026-08-09.
(mature UI redesign — kept below, superseded as "most current" but still accurate history). Prior
to that: 2026-08-06 (AI-adaptive-coach pivot build: S0–S2 done, SX realigned to 4 new domains, S3
auth in progress). Prior to that: 2026-08-05 (S0–S2 done, SX in progress). Prior to that:
2026-07-20 (Hopper wired into Buddy tab + backend-health probe + dev-URL/keep-alive tooling +
competitive research v2 — merged to `main`; PLUS an in-progress strategy conversation captured in
`04_Product/Strategy_WIP_2026-07/`, all Open Questions). Prior snapshot: 2026-07-14.
**2026-08-03 docs-only addition:** the "🔀 PRODUCT PIVOT — 2026-08-01" notice further below was
added to capture the AI-adaptive-coach repositioning (Decision Log D23) — no code changed,
engineering snapshots below (2026-07-20 and earlier) are untouched.

## How to resume
Read `AI_Start_Here.md` → this file → **the three documents in "START HERE" immediately below** → the
memory index. Then pick up at "▶ NEXT". Do NOT re-read the whole repo.

---

# ⛳ START HERE — 2026-08-24 (continued): three queue items done, and what is left

On `feat/buddy-3d-and-reminders`. `tsc` clean, **jest 2317 / 214 suites**. Detail:
`00_Foundation/CHANGELOG.md` and the Decision Log (D76, E8).

## ▶ WHAT THE FOUNDER ASKED FOR, AND WHAT HAPPENED

He asked for the queue to be run without him. Task 0 first: **the over-the-air update is published**,
to `production` AND to `preview`. That second one matters — the Android build on the partner's phone
is a `preview`-profile build listening to the `preview` channel, which was empty, so the first
publish would have reached the iPhone and nobody else.

Then the queue, in order:

1. **Mirror's confidential synthesis — DONE and DEPLOYED.** `supabase/functions/mirror-synthesis`
   (service role) produces it; migration `0006` adds the per-question outcome column and the nightly
   retention sweep; both are applied to the project. Mirror also has the screen you come back to now.
2. **Coach Context Summaries — DONE**, in the initial version D76 describes: everything except the
   sync, which its own PRD gates behind a security review of the key design. Consent page at the end
   of onboarding, a Settings row, deletion on withdrawal.
3. **Dream authoring — DONE.** My Dreams and each Dream now open a conversation that can reword,
   merge, remove, link and unlink.

Plus one small thing he asked for directly: **the About row names the running update**, so "which
version are you on" has an answer on the device.

## ▶ ADDED AFTER THAT, SAME DAY

**The invite landing page** (see below) and **the career diagnosis, wired (E9)** — the biggest of the
"spec is ready, nobody built it" items. The partner's v1.2 package (2026-08-23) answered the 2026-08-21
letter with the interview→signal mapping, and the 18-of-30 ingest note in the older Open_Work doc is
STALE: all 27 Journeys and 9 families are in the app, and his handoff explicitly asks us NOT to ingest
more until the diagnosis contract is validated in the app.

**Still open on that thread:** "one call per MESSAGE" — the tree asks one question at a time; asking
the remaining ones in a single natural sentence is the next layer. And the labels of the diagnosis
options are OURS (his answers are categories); they were meant to go back to him for correction.

## ▶ WHAT IS LEFT, AND WHY IT STOPPED HERE

- ~~**The invite landing page.**~~ **DONE (2026-08-24):** he chose a free option, so it is on **EAS
  Hosting's free tier**, on the Expo account the app already uses — no new account, no new billing
  relationship. **https://pushapp-invite.expo.app**, one static file at `app/landing/index.html`.
  Redeploy: `npx eas-cli@latest deploy --prod --export-dir landing` from `app/`. When the app is in
  the stores, the two URLs in its `LINKS` object are the only change it needs.
- **The builds for both platforms.** The founder answered on 2026-08-24: **not needed for now.**
  Everything built since build 6 is JavaScript and reaches both phones through `eas update`. A build
  becomes necessary again the moment something NATIVE changes (a new native module, an app.json
  permission, an SDK bump) — that is what moves the runtime-version fingerprint and cuts the update
  off from the installed builds.
- **The Weekly Review contributions conversation** — his, not a build.

## ▶ THE TWO AUDIT FINDINGS ARE STILL TRUE

No monitoring of any kind, and no gradual rollout. He is writing the monitoring task himself with
Codex; the guiding questions for it were given in the session (what we monitor, what must never leave
the device given coach conversations and Mirror's contributors, a random uid or none, consent and the
off switch, free-tier ceiling, store privacy labels, and whether it needs a native build).

---

# ⛳ Previous START HERE — 2026-08-24 (late): everything through Mirror's sending, and the exact queue

On `feat/buddy-3d-and-reminders`, **committed and pushed** through `c4351ad`. `tsc` clean,
**jest 2268 / 207 suites**. Full detail: `00_Foundation/CHANGELOG.md` and the Decision Log (D70–D74, E7).

## ▶ TASK 0 — DO THIS FIRST, BEFORE ANY OTHER WORK

**Publish the over-the-air update.** The founder asked explicitly (2026-08-24) that this be written
into the plan so it cannot be missed again: the builds on his and his partner's phones predate two
full passes of work, and every one of those changes is JavaScript.

```bash
cd /Users/guynoiman/Documents/PushApp/app && npx eas-cli@latest update --branch production --message "<what changed>"
```

Then confirm to him what it carries — the design pass across Home, Journeys and Tools; the account
backup; Mirror's sending; the coach's voice; smart timing — and that opening the app is all either
of them has to do.

**Only after that** does the queue below start, and a new BUILD is what closes it, not what opens it.

## ▶ THE SECOND THING: what is in the builds, and what is not

**iOS build 6 and the Android APK were both cut from `f9698d1`.** Everything after it — the founder's
whole design pass, the account backup, and Mirror's sending — is pushed but **not in any build**.

- Android, installable, no store, no cost:
  `https://expo.dev/accounts/guynoiman/projects/pushapp/builds/539f0ac7-a4a8-4fe7-a0b9-ebb1acc38a8a`
- iOS goes to TestFlight through `eas submit`, which now works non-interactively: `ascAppId` is in
  `app/eas.json`, and the last build used `--auto-submit` successfully.

**Everything since is JavaScript**, so a `eas update --branch production` reaches both phones without
a build. The founder has asked twice about this; offer it before offering a build.

## ▶ THE QUEUE, in the order it was agreed

1. **Mirror's confidential synthesis.** Everything else in the tool is done. The synthesis MUST run
   server-side (an Edge Function on the `gemini-proxy` pattern, service role): if it ran on the
   requester's device, that device would hold the contributors' raw words — the exact thing the RLS
   in `0005_mirror_feedback.sql` exists to prevent. It writes to `mirror_synthesis`, which no client
   can write to. `core/tools/mirror/synthesis.ts` and `synthesisPrompt.ts` already hold the rules.
   **A visible round already works end to end; a confidential one collects answers and returns nothing yet.**
2. **Coach Context Summaries** (`PRD/Coach_Context_Summaries_PRD.md`). The founder cleared the
   blocker: build the initial version with its consent screen, and the legal points go into the
   privacy contract unformulated for now, as agreed.
3. **Dream authoring** (`PRD/Dream_Management_PRD.md`). Its "Open Questions" section says **None** —
   the old status line claiming a design session was needed is stale, and the core is already built
   (a coach conversation that produces a Dream signal creates and links the Dream, D40). Missing:
   starting a Dream conversation FROM My Dreams (that screen is view-only), and rewording/merging.
4. **The invite landing page.** The founder wants a page with a download button for testing that
   ultimately routes to the device's app store. **Hosting is not chosen** — offer free options
   (GitHub Pages needs a public repo or a paid plan; Netlify/Vercel/EAS Hosting free tiers).
5. **Then build both platforms.**

## ▶ WAITING ON THE FOUNDER

- ~~The most personal free text in the backup.~~ **ANSWERED (D75, 2026-08-24):** the raw wording
  stays on the device and our reading of it goes up. Implemented in `core/backup/redactForBackup.ts`.
- **Weekly Review Contributions** — he agreed it is a separate conversation, not a build.
- Mirror's §18 items are CLOSED: he answered them (delivery via the Notification Center, paid
  provider, expiry discussed).

## What landed in this stretch

**The bell** (Notification Center) with its own count beside the mail button, seen-on-render, inline
accept/decline. **The Inbox** realigned to Chats · Groups (locked) · Requests. **Direct messages,
end-to-end encrypted** — X25519 per device, sealed twice, a schema with no column that can hold
plaintext. **The coach speaks in the user's chosen voice**, and the three empty voices were written.
**The account backup** — a lost phone no longer means starting over (D73, and the privacy contract
changed with it). **Smart notification timing is on** (D74). **Mirror sends.** Plus the founder's
design pass across Home, Journeys and Tools.

## Two things the Engineering Bible audit found NOT holding

**No monitoring of any kind** — no crash reporting, no performance signal. **No gradual rollout** —
every update reaches everyone at once. Both are fine at two users and stop being fine at twenty. The
founder has an open question about analytics from 2026-08-23 that this belongs to.

---

# ⛳ Previous START HERE — 2026-08-24: the bell, the Inbox, encrypted messages, and the coach's voice

On `feat/buddy-3d-and-reminders`, committed and pushed. `tsc` clean, **jest 2250 / 206 suites**.
Full detail: `00_Foundation/CHANGELOG.md`.

## What shipped in this cycle

**The Notification Center** — the bell beside the mail button, its own count, a chronological list of
what other PEOPLE did. Seen means a row reached the screen, not that the screen opened.

**The Inbox, realigned to his PRD** — Chats · Groups (visible, locked, "Soon") · Requests. Cheers,
friend requests and Support-Circle invitations left for the bell, so the two counters can never claim
the same object.

**Direct messages, end-to-end encrypted.** X25519 + XSalsa20-Poly1305 per device, keys in the OS
secure store, every message sealed twice so the server holds two sealed boxes and no key. The
migration is applied to the project and has no column that could hold a plaintext body. Its limits
are written in `core/messaging/crypto.ts`: one device per account, no forward secrecy, no key
verification between people.

**The coach speaks in the user's chosen voice** — the Communication Style PRD's Acceptance Criterion
#4, missing since the questionnaire shipped. Three of the four voices were empty stubs; they are
written now, each with the limit its §4 states.

## ▶ Specs that are READY and still NOT built — with the reason, so nobody re-checks

- **Account Inactivity Freeze** — needs the SERVER-authoritative evaluator its PRD specifies. The
  shipped POC is a client-side approximation. Needs a backend job, not an afternoon.
- **Dream Management** — the coach-led Dream authoring conversation. Its PRD says a joint founder
  design session is required, and the open questions are still open.
- **Coach Context Summaries** — approved, but its own §4 makes jurisdiction-specific legal review a
  release gate, and it needs a consent flow the privacy policy does not exist to back yet.
- **Weekly Review Contributions 02** — explicitly "not a build request"; seven open questions.
- **Invite Friend** — the interim share IS shipped (Circle → Invite). Everything beyond it is blocked
  on real authentication, backend linking and a web destination.
- **Smart Notification Timing** — built and DARK behind `EXPO_PUBLIC_SMART_TIMING`. Turning it on
  changes when notifications arrive, which is the founder's call and not an engineering one.
- **Mirror Feedback** — complete except sending; its §18 blockers are four founder decisions.

---

# ⛳ Previous START HERE — 2026-08-23: the privacy contract, seven more tools, eight rooms, two real bugs

On `feat/buddy-3d-and-reminders`, committed and pushed, with `feat/native-media` MERGED IN.
`tsc` clean, **jest 2230 / 204 suites**.

## ▶ THE BUILD, and the one step it still needs

**The over-the-air update is published** (2026-08-23) to the `production` branch for runtime
`df6c2127…` — everything from this session reaches build 3 on the next launch, the duplicate-reminder
sweep included.

**Build 4 is FINISHED on EAS** — iOS, production profile, build number 4, from commit `1e56c62`
(runtime `503102a4…`, the media fingerprint).
`https://expo.dev/accounts/guynoiman/projects/pushapp/builds/e1a428c5-0baf-4a3d-b552-cd7a32ffab62`

**It is not on TestFlight yet, and cannot be sent there without the founder.** `eas submit` refuses
non-interactively because the submit profile has no `ascAppId`, and finding that number needs an
Apple sign-in — which is his and only his. One of:
  · `npx eas-cli@latest submit --platform ios --latest` from `app/`, and answer the Apple prompts; or
  · the "Submit to App Store" button on the build page above.
Once the number is known, put it in `app/eas.json` under `submit.production.ios.ascAppId` and every
later submission is one non-interactive command.

## What is NOT in build 4, and must not be described as if it were

- **The Notification Center's bell.** Its feed engine is built and tested; there is no UI yet.
  `04_Product/PRD/Notification_Center_PRD.md` is approved and is the next thing to build.
- **The Inbox.** `04_Product/PRD/Inbox_Direct_Messaging_PRD.md` arrived on 2026-08-23 and is a large
  feature — end-to-end encryption, message requests, blocking, muting, offline. Only the pure engine
  (`app/src/core/messaging/model.ts`, 25 tests) exists. No surface, no server tables, no crypto.
- **The 3D Buddy.** Validated as a spike in July, not wired to any screen. The founder confirmed on
  2026-08-23 that it is not MVP.
The ordering decision in the block below is UNCHANGED and still first: **publish → merge → build.**
Full detail: `00_Foundation/CHANGELOG.md`, the 2026-08-21 (evening) entry.

## What exists now

**The privacy contract** — `04_Product/Privacy_Contract_With_The_User.md`. Everything the app can
know about a person, built from the code: device-only, our server table by table, third parties,
what others tell us, and what we deliberately do not collect. The legal policy and both store forms
get generated from it.

**Seven more tools**, from the founder's approved PRDs and his light/dark flows: Gratitude Log ·
What Worked for Me? · A Self-Compassion Moment · What Really Matters to Me? · What Am I Carrying
Right Now? · From Obstacle to Action · My Support Map. Thirteen tools are now live in the tab. The
shared opening screen, step frame and one records store mean the fourteenth is cheap.

**The bell's data layer** — a chronological feed of what other PEOPLE did, with read marks. No UI:
the founder is writing the Inbox task and the bell belongs in it.

## The bug that mattered

**Delete account wiped four keys.** The list predated the Tools tab and nothing widened it, so every
tool answer survived a deletion. Fixed, generated from the tool list, and named key-by-key in a test.

## Two findings worth not rediscovering

- **The bell needs no server change.** Cheers have always been stored and readable by the recipient;
  the app only ever listened to the realtime subscription, so a cheer that arrived while the app was
  closed was never seen. Both request timestamps were already in the database, unselected.
- **Gemini's tier is a privacy property, not a billing detail.** The paid tier does not train on
  content and the free tier does. Somebody must confirm the proxy's key belongs to a billing-enabled
  project, or the privacy contract's AI section is false.

## ▶ NEXT, in order

1. **The Notification Center** — `04_Product/PRD/Notification_Center_PRD.md` is approved and ready.
   Its first pass: the Bell with its count, the chronological list over the events that really exist
   (cheer, nudge, friend request, ally invite), viewport-based seen, and inline approve/decline. The
   engine underneath it is already built and tested (`core/social/notifications.ts`).
2. **The ordering decision below** — publish the update, then merge `feat/native-media`, then build.
3. **Wire the diagnosis into the coach.** `careerDiagnosis` now speaks the partner's vocabulary and
   can be driven by signals heard in conversation; `CoachOrchestrator` still never calls it. This is
   the one that turns twenty-seven authored Career Journeys from correct into reachable.
4. **The two empty rooms** — שינוי דפוסים ודחפים and גוף ואנרגיה show "coming soon" and are waiting
   for their first tool.

---

# ⛳ Previous START HERE — 2026-08-21: six tools, a token budget, and one ordering decision

Everything committed and **pushed**, on TWO branches. `tsc` clean, **jest 2014 / 190 suites**.
**The open list is now `04_Product/Open_Work_2026-08-21.md` — read it after this block.**
Full detail: `00_Foundation/CHANGELOG.md`, the 2026-08-21 entry.

## ▶ DECIDE THIS BEFORE MERGING ANYTHING

| Branch | iOS fingerprint | What it holds |
|---|---|---|
| `feat/buddy-3d-and-reminders` | `df6c2127…` — **matches build 3** | Everything from 20–21 August |
| `feat/native-media` | `503102a4…` — **does not match** | `expo-image-picker` + `expo-audio` |

Everything on the first branch reaches the partner's phone over the air **right now**. Merging the
second ends that until a new build, which only the founder can produce. So: **publish the update,
then merge, then cut a build.** Any other order strands two days of work.

## What exists now

**The Tools tab is a place rather than a waiting room** — search, three lenses, five rooms, at most
two recommendations, and every tool carrying a sentence about what it does TO you. Six tools live in
it. Five are complete; **Mirror Feedback is complete except sending an invitation**, which is the one
thing that cannot be built yet.

**A conversation has a budget** in tokens, with calls as a second ceiling. Three zones, and
`narrowing` means one concrete thing: stop offering free text, keep offering cards, which are free.
Nobody is ever told they ran out.

**Every tool answers to one protocol** (`04_Product/Tool_Addition_Protocol.md`): what it teaches us,
the smallest summary that carries it, who may read it with a reason each, and when it goes stale.

## The five decisions this session produced

- **D64** — content is HELD in English; a Hebrew delivery is translated once, late.
- **D65** — the expert supplies rhythm CONSTRAINTS; the coach chooses inside them.
- **D66** — a reflection is FOR THE USER and owes the app nothing.
- **D67 / D68** — a Mirror round runs a week, nudges on day three, extends for a late invitee, and
  holds raw answers a week FROM CLOSURE.
- **D69** — the confidential synthesis runs on the paid Gemini, behind one swappable file.
- **E6** — media capture: decided and built, on its own branch.

## ▶ NEXT, in order

1. **The ordering decision above.**
2. **Wire the diagnosis into the coach** — `careerDiagnosis` is tested and `CoachOrchestrator` never
   calls it. This is what turns twenty-seven authored Career Journeys from correct into reachable,
   and it carries the founder's "fewer closed answers, more of a conversation" with it.
3. **Send the partner letter** (`Partner_Letter_2026-08-21_Tools_And_Next_Package.md`).
4. **The influence contract Values Clarification still owes.**
5. **Strength Evidence**, which two other tools are waiting on.

---

# ⛳ Previous START HERE — 2026-08-21 (overnight): the Tools tab is real, and there is ONE ordering decision

Everything committed and **pushed**, on TWO branches. `tsc` clean, **jest 1976 / 188 suites**.
Full detail: `00_Foundation/CHANGELOG.md`, the 2026-08-21 entry.

## ▶ THE ONE THING TO DECIDE FIRST, before anything else is merged

Two branches exist and the ORDER between them matters:

| Branch | iOS fingerprint | What it holds |
|---|---|---|
| `feat/buddy-3d-and-reminders` | `df6c2127…` — **matches build 3** | Everything from 20–21 August: six tools, the connection work, the token budget, the Career ingest |
| `feat/native-media` | `503102a4…` — **does not match** | `expo-image-picker` + `expo-audio` behind one MediaGateway |

**Everything on the first branch reaches the partner's phone over the air right now. Merging the
second one ends that** until a new build, which only the founder can produce (it needs his Apple
sign-in). So:

1. **Publish the update**, from `app/`, on the first branch:
   `npx expo-updates fingerprint:generate --platform ios` (must still read `df6c2127…`), then
   `npx eas-cli@latest update --branch production --message "<what changed>"`
2. **Then** merge `feat/native-media`.
3. **Then** cut a new build, and the partner reinstalls.

Doing it in any other order strands two days of work behind a build that has not been made.

## What is built

Six tools, and a protocol that governs every one after them
(`04_Product/Tool_Addition_Protocol.md`). **Life Wheel · Values Clarification · My Best Possible Year ·
Direction Statement · Passion Map** are complete, engine and screens. **Mirror Feedback** has its
rules and deliberately no sending — see below.

A conversation now has a token budget with three zones, and `narrowing` means one concrete thing:
stop offering free text, keep offering cards, which cost nothing. Nobody is ever told they ran out.

## ▶ NEXT, in order

1. **The ordering decision above.**
2. **Mirror Feedback setup screens** — the safe half only. Nothing that sends.
3. **The influence contracts** — the founder asked to be reminded at the end of the tool run. Values
   Clarification still owes one; the reflections were answered in advance by D66.
4. **Wire the diagnosis into the orchestrator** — `careerDiagnosis` is a tested engine and
   `CoachOrchestrator` still walks a fixed list and never calls it. This is the one that turns
   twenty-seven authored Career Journeys from correct into reachable.
5. **The two remaining tools** — Strength Evidence and a Weekly reflection. Direction Statement's
   "what I bring" drawer stays empty until the first of them exists, by design.

## What is waiting on somebody else

- **The partner:** the brief asking for the ANSWERS to his diagnosis questions
  (`04_Product/Partner_Brief_2026-08-20_Diagnosis_Questions.md`), and confirmation of the
  `INTERVIEW_STAGE_GAP` split.
- **The founder, for Mirror Feedback:** the four blocking decisions in the PRD's §18 — raw-response
  backup expiry, the redaction provider and region, the moderation process, and Inbox + push
  invitation delivery. None of them is an engineering call.

---

# ⛳ Previous START HERE — 2026-08-20 (evening): the silence is fixed, and the cause was real

Committed on `feat/buddy-3d-and-reminders`, **jest 1767 / 178 suites**, `tsc` clean. The open list is
still `04_Product/Open_Work_2026-08-20.md` — read it after this block; several items on it are now
marked DONE with their evidence. Detail: `00_Foundation/CHANGELOG.md`, the "2026-08-20 (evening)"
entry.

### The one thing that must not be rediscovered the hard way
**Anonymous sign-ins were genuinely disabled on the Supabase project, and are now on.** It was
confirmed by calling the endpoint, not by reading a toggle: a real sign-up request returned
`422 anonymous_provider_disabled`, the founder saved the setting again, and the identical request
returned `200` with a session. That single switch is the whole explanation for the coach that
invented a Journey, the Delete account that refused, and a Support Circle that did nothing. **Verify a
provider by calling it. The toggle had been believed on for days.**

### What was built
The app now SAYS when there is no server. One hook (`hooks/useServerConnection.ts`) answers "is there
a session" for Home, the Coach and Settings, and owns the retry. The Coach no longer starts an
interview it cannot finish: `CoachOrchestrator.understand()` used to swallow a failed understanding
call and hand back an empty list, which is the exact line that turned the partner's question into the
title of a Journey. A model that ANSWERS with nothing usable still falls back; a call that never
reached a model raises `CoachUnavailableError` and the screen says so. A Step also got its hairline
frame back, because without one it did not read as something you could drag.

### Two environment facts that cost time today
- `npm run dev` publishes the packager under a `.local` mDNS name that iOS often cannot resolve, so a
  saved Expo Go entry hangs with no error. Use `REACT_NATIVE_PACKAGER_HOSTNAME=<LAN IP>` and check the
  manifest's `launchAsset.url`.
- `Unimplemented component: ViewManagerAdapter_ExpoLinearGradient` means the device's binary predates
  the dependency (installed 2026-08-19 15:21). Not a code bug, and deliberately not worked around —
  see Open Work §3.2.

### ▶ NEXT
The founder rejected all four Tools-tab directions and is bringing a designed screen of his own.
**Do not restyle Tools until it arrives.** The largest gap in the product is unchanged: nothing routes
a real conversation to the eighteen Career Journeys, because the experts do not diagnose.

---

# ⛳ Previous START HERE — 2026-08-20: the redesign is on every tab, and the partner found three real bugs

Everything committed and pushed on `feat/buddy-3d-and-reminders`, **jest 1750 / 175 suites**, `tsc`
clean, working tree clean. **The open list is now `04_Product/Open_Work_2026-08-20.md` — read it after
this block.** Full detail of what changed: `00_Foundation/CHANGELOG.md`, the 2026-08-20 entry. Design
rules: `04_Product/Design_System.md` §0.

### The two things that must not be rediscovered the hard way

**1. The first over-the-air update is PUBLISHED (2026-08-20).** Everything built after build 3 —
the whole redesign, the Hebrew onboarding fix, the name-leak fix, the account-deletion fix, Tools —
went out on the `production` branch as update group `8ba787c1-50ab-4bea-9a9f-82586cf1587c`, at
runtime version `df6c2127…`, which is exactly what build 3 carries. The partner receives it on his
next launch (the check never holds the splash — it applies on the following launch, by design).

**Publishing again is one command from `app/`:**
`npx eas-cli@latest update --branch production --message "<what changed>"`
Verify the fingerprint FIRST with `npx expo-updates fingerprint:generate --platform ios` — if the
hash is no longer `df6c2127…`, the update cannot reach the build the partner is holding, and the
answer is a new build rather than a publish.

**2. The fingerprint rule.** The build carries iOS runtime fingerprint
`df6c2127bbd3be3766774e3f008f4ae5158306cd`. Updates only reach a binary whose fingerprint MATCHES, so
a native dependency, any `app.json` edit, or an SDK bump cuts his phone off from every update we
publish. All TypeScript, components, copy, colours, code-drawn artwork and runtime-loaded fonts are
free. `expo-blur` and `expo-linear-gradient` went in BEFORE the build precisely so the redesign would
never need one.

### What happened today
Three bugs, all found by a second person using the app: the coach greeted **every** user by the
founder's name; Hebrew onboarding ran left-to-right because a release build could not relaunch itself
after the language flip; and Delete account refused on behalf of an account that did not exist. All
three are fixed, each with a test that would have caught it. A fourth thing came out of the third:
his device almost certainly had **no Supabase session at all**, which is now the top item on the
founder's list (Open_Work §2.2) because it also explains the strange Journey he ended up with.

The redesign reached every tab, the Inbox moved to a button in Home's status strip, and the freed slot
became **Tools** — where the onboarding questionnaire can now be taken again.

### The single biggest gap in the product
Nothing routes a real conversation to the eighteen Career Journeys. Choosing a family needs the Career
expert to DIAGNOSE which of the six a goal is, and the experts do not diagnose. The letter drafted for
the partner asks him for exactly that, because it is domain work rather than engineering.

---

# ⛳ Previous START HERE — 2026-08-19 (night): the build went out

Everything committed and pushed on `feat/buddy-3d-and-reminders`, **jest 1722 / 170 suites**, `tsc`
clean. The blocks under this one are the same day's earlier sessions and stay accurate. Detail:
`00_Foundation/CHANGELOG.md`, the "2026-08-19 (night)" entry; design rules in
`04_Product/Design_System.md` §0.

**The partner build is submitted, and App Store Connect now HAS the app.** EAS created the record
during `--auto-submit`: **ASC App ID `6803091892`**, so TestFlight lives at
`https://appstoreconnect.apple.com/apps/6803091892/testflight/ios`. The submission
(`870529c6-908c-4019-b94e-8212f1ce73e4`) finished successfully with **version 1.0.0, build 3**, whose
runtime version is the fingerprint below.

**Why the partner still has no invitation, and it is not a bug on our side.** Being in Users and
Access is not being a tester: an internal tester has to be added to a TestFlight INTERNAL GROUP inside
the app, and Apple only sends the mail at that moment. A tester who shows **"No Builds Available"** is
almost always a person whose App Store Connect USER invitation was never accepted — Apple will not
expose a build to an account that does not exist yet.

**Export compliance is already handled and needs no action:** `app.json` declares
`ITSAppUsesNonExemptEncryption: false` (correct for an app that uses only HTTPS and the system
keychain), so the build's metadata reads "App Uses Non-Exempt Encryption: No" and TestFlight never
asks. Verified on build 3.

**The Developer Program License Agreement is still unaccepted**, and only the Account Holder can do
it, at `https://developer.apple.com/account`. It blocks new submissions and app updates.

**Original note:** The founder ran it himself (the interactive Apple sign-in is his
and nobody else's), generated the certificate, the profile and an App Store Connect API key, and
`--auto-submit` delivered it. Build 2 is the partner build.

### THE RULE THAT GOVERNS EVERY CHANGE FROM HERE
The build carries iOS runtime fingerprint `df6c2127bbd3be3766774e3f008f4ae5158306cd`. Updates only
reach a binary whose fingerprint MATCHES, so **anything that changes the native project — a native
dependency, any `app.json` edit, an SDK bump — cuts the partner's phone off from our updates.** Not
native, and therefore free: all TypeScript, every component, i18n copy, colours, artwork drawn in
code, and fonts (loaded at runtime from JS assets — verified: adding two font families left the
fingerprint untouched). `expo-blur` and `expo-linear-gradient` were added BEFORE the build precisely
so the redesign would never need one.

### Where the redesign stands
Built from the founder's two mockups plus his correction to them (*"it still feels heavy, I want it to
breathe"*). Done: the display voice (**Fraunces** in English, **Frank Ruhl Libre** in Hebrew, resolved
per language, with the line-height rule that keeps both occupying the same box), the lightness pass on
the day's Steps, the week's summary card over a code-drawn dusk, the Journeys carousel, the people
carousel, and a quieter coach card. All of it works in BOTH themes and was checked in both.

**Not yet done from those mockups:** the profile photo beside the greeting, the top status strip's own
treatment, and the immersive full-bleed variant of the people section. The founder said his mockups are
*not final* — treat them as direction, not specification, and expect the lightness rule to keep pruning
them.

### Waiting on the founder
- **App Store Connect: accept the updated Apple Developer Program License Agreement** (the yellow
  banner). Without it, submissions and new apps are blocked.
- Add the partner (`liamsh1979@gmail.com`, already in the team as Marketing, which is a valid internal
  tester role) to the TestFlight internal group once the build finishes processing — that is the moment
  his invitation email is actually sent.
- Answer TestFlight's export-compliance question (the app uses only HTTPS and the system keychain).
- Read and send `04_Product/Partner_Letter_2026-08-19_Library_Ingest.md`.
- §1.5 of the open list (Home's scroll-to-top) still needs a device check only he can do.

### The gap to close next, in code
Nothing routes a conversation to the eighteen Career Journeys: the expert has to diagnose which of the
six families a goal is, and it does not diagnose. The letter asks the partner for exactly that.

---

# ⛳ Previous START HERE — 2026-08-19 (evening): the library is in, Home is a week

Everything committed and pushed on `feat/buddy-3d-and-reminders`, **jest 1693 / 167 suites**, `tsc`
clean. The two blocks under this one cover the same day's morning and afternoon and are still
accurate. Full detail: `00_Foundation/CHANGELOG.md`, the "2026-08-19 (evening)" entry.

**Three topics, one commit each:** the library model can hold a Journey with its own Milestone arc ·
the partner's eighteen Career Journeys, translated into it · Home is seven days.

### THE RULE THAT NOW GOVERNS EVERY CHANGE — read this before touching app.json or a dependency

**The partner build carries iOS runtime fingerprint `df6c2127bbd3be3766774e3f008f4ae5158306cd`**
(computed from this tree with `npx expo-updates fingerprint:generate --platform ios`). The runtime
version policy is `fingerprint`, so an over-the-air update only reaches a binary whose fingerprint
MATCHES. Anything that changes the native project changes that hash, and the moment it changes, every
`eas update` we publish stops reaching the build the partner is running.

**Native = a new dependency with native code, any `app.json` change (plugins, `infoPlist`,
entitlements, icons, splash, permissions), an SDK bump.** Not native, and therefore free to ship over
the air: all TypeScript, every component, i18n copy, colours, artwork files, and fonts (they are
loaded at runtime from JS-required assets, not embedded).

So the Home redesign ships to the partner with no reinstall — as long as nobody edits `app.json` on
the way. `expo-blur` and `expo-linear-gradient` were added BEFORE the build precisely so the design
would not need one. If a native change genuinely becomes necessary, it means a new build, and the
partner has to install it: that is a decision to raise, never a side effect.

### The one thing that must not be lost between sessions
**Superseded the same evening: the founder ran it himself and IT WENT OUT.** The autonomous attempt
had stopped at `Distribution Certificate is not validated for non-interactive builds`, because signing
needs an interactive Apple sign-in with his own Apple ID and its 2FA code. He ran
`npx eas-cli@latest build --platform ios --profile production --auto-submit`, generated the
distribution certificate, the provisioning profile and an App Store Connect API key, and the build
was submitted (submission `870529c6-908c-4019-b94e-8212f1ce73e4`). **Build number 2 is the partner
build.**

### Waiting on the founder
1. **Run the build himself**, from `app/`:
   `npx eas-cli@latest build --platform ios --profile production --auto-submit`
   It will ask to sign in to Apple and to generate a Distribution Certificate — say yes.
2. **App Store Connect: the app record for `com.guynoiman.pushapp` still does not exist.** Without it
   `--auto-submit` has nowhere to deliver.
3. Confirm Supabase's Apple provider saved (toggle on, `com.guynoiman.pushapp` in Client IDs, secret
   EMPTY, "Allow users without an email" OFF) and that new sign-ups are enabled. Google is done.
4. **The partner's invitation email.** He reports it never arrived. The likeliest reason is that a
   TestFlight INTERNAL-tester invite is not sent until a build exists — so it resolves itself with
   step 1. Otherwise: the spam folder, an address that is not his Apple ID, or an invitation older
   than seven days (Users and Access → his row → Resend Invitation).
5. **Read `04_Product/Partner_Letter_2026-08-19_Library_Ingest.md` and send it.** He asked for the
   three-Journeys-per-family decision to be agreed with the partner rather than announced, and the
   letter's real ask is the diagnosis (§5.2) — the piece that would make the eighteen Journeys
   reachable.
6. Optional: `BYTE_CAP_MB=4` for the partner; verify a row lands in `llm_usage` after using the Coach.

### The gap to close next, in code
**Nothing routes a conversation to the Career Journeys.** Choosing a family needs the Career expert
to diagnose which of the six a goal is (unclear target / missing proof / no access), and the experts
do not diagnose — each returns one fixed arc. The content is validated, translated and unreachable
until that lands, and `AppCore.matchVariant` deliberately refuses to stamp provenance from a Journey
whose content was not the one built.

### Known limits carried into the partner build
- Moving from an anonymous identity to a real one does not migrate what the server holds under the
  anonymous uid, so the partner signs in on FIRST launch.
- The shared image travels without the personal caption (share-sheet limitation).
- iPad is supported but the app is still portrait-only.
- The week-by-day spec has no open clauses left: §6 was answered by the founder the same evening —
  a Step travels because it was `recommended` and not yet `required` — and the code now reads
  `streakRole` directly.

---

# ⛳ Previous START HERE — 2026-08-19 (later, same day): the partner build is fully loaded

Everything committed and pushed on `feat/buddy-3d-and-reminders`, **jest 1631 / 161 suites**, `tsc` clean.
The block under this one covers the morning of the same day and is still accurate; this is what came after
it. Full detail: `00_Foundation/CHANGELOG.md`, the "2026-08-19 (later)" entry.

**Seven commits:** the completed-Step card's own ground (§1.4, option D1) · the completion card shares as
an IMAGE and saves to the photo library (§1.3) · the week's first day picked from a list instead of by
cycling · `delete-account` deployed and the proxy cap moved to a `BYTE_CAP_MB` secret · every caller
recorded in `llm_usage`, exempt ones included · a store-signed `production` profile with an environment on
every profile · `expo-updates`, iPad support, and the four public values loaded into an EAS environment
that was **completely empty**.

### The one thing to know about sequencing from here
**All native work for the partner build is IN.** From that build onward, anything that is not native
reaches the device over the air (`expo-updates`, fingerprint runtime version) with no reinstall. So a new
native dependency from here costs another build — check before adding one.

### Waiting on the founder (nothing in code depends on these)
- **App Store Connect: the app record for `com.guynoiman.pushapp` does not exist yet.** Without it there
  is nowhere to submit a build.
- Confirm Supabase's Apple provider saved: toggle on, `com.guynoiman.pushapp` in **Client IDs**, secret
  field EMPTY (not needed for native sign-in), "Allow users without an email" OFF. Google is already done.
- Confirm new-user sign-ups are enabled.
- The partner (`liamsh1979@gmail.com`, his Apple address) is invited to the team; add him to the internal
  test group once a build is up.
- Optional: set `BYTE_CAP_MB=4` if the partner should get 4 MB (the cap is a LIFETIME total, not monthly).
- Optional verification: talk to the Coach, then check a row landed in `llm_usage`.

### Approved and NOT yet built
1. **The partner's Journey library** — `07_Assets/Partner_Packages/Career_v0.6_2026-08-19/`: 18
   Journeys linked to Career across six goal families. He did not invent a model field; he held the link
   as `libraryMeta.linkedExpertIds` at authoring level until we decide how to implement it. This is a
   translation into `app/src/core/learning/library/`, not a copy, and it is content only — it blocks no build.
2. **The week-by-day view on Home** — approved in full, replacing BOTH "Today's focus" and "This week".
   Spec: `04_Product/PRD/Week_By_Day_Home_PRD.md`.

### Known limits carried into the partner build
- Moving from an anonymous identity to a real one does not migrate what the server holds under the
  anonymous uid, so the partner is told to sign in on FIRST launch.
- The shared image travels without the personal caption (share-sheet limitation).
- iPad is supported but the app is still portrait-only.

---

# ⛳ Previous START HERE — 2026-08-19 (autonomous session): three of the open list are built

Read `04_Product/Open_Work_2026-08-19.md` — it is still the open list, and this block only records what
came off it. Branch `feat/buddy-3d-and-reminders`, everything committed and pushed, **jest 1610 / 159
suites**, `tsc` clean.

**Done, one commit each:** §1.1 the streak badge (the rule was already right — what was missing was
showing it), §1.2 Postpone absorbing Reschedule, §2.2 real Apple/Google sign-in. Full detail in
`00_Foundation/CHANGELOG.md`'s 2026-08-19 entry.

### The one thing that must not be lost between sessions
**Every native change has to land before the SINGLE build that goes to the partner.** Sign-in has already
added two native dependencies. §1.3 (sharing the completion card as an image) needs one more, and that is
the founder's open decision — if it is taken after the build, the fix costs another build.

### Still open on that list
- **§1.3 — blocked on the founder.** A faithful capture of the completion card needs a native
  view-capture dependency; nothing installed can do it, and the card is Ionicons glyphs + theme tokens +
  custom fonts, so re-authoring it as SVG would be a fidelity gamble and a duplicated design. The whole
  seam for it already exists and is unchanged (`core/share/`): one gateway file replaces the Null one and
  no caller moves.
- **§1.4 and the binding badge's wording** — options were rendered for him; awaiting his pick.
- **§1.5** — a device check only he can do.

---

# ⛳ Previous START HERE — D62 is built (2026-08-18, later session)

The block below this one is still accurate about what shipped earlier the same day; this is what changed
after it, and it is the better starting point for anything touching the plan path.

**A Journey now declares what its own versions differ on, and the engine knows what none of it means.**
The matcher used to hold a table mapping an onboarding answer to one of three approaches. That table
could hold exactly one kind of difference, and the founder's ruling (D62) is that there is no such thing:
one Journey's versions differ on certainty, another's on available time, another's on urgency. So the
axes, their questions, and which profile answers place a user on them all live in the Journey's own
content (`app/src/core/learning/library/definitions.ts`). **Adding a new kind of difference is content.**

**The variant question is asked after the Journey is chosen, and only when it can change the answer.**
Not asked if onboarding already answered it; not asked if the surviving versions no longer differ. It is
appended to the interview after the expert's questions and the horizon question, which is the first
moment the Journey is known.

**Every variant holds a rating, and it also feeds its Journey's.** That needed provenance, which did not
exist: `Journey.libraryRef` is now stamped when a plan is built, so the end-of-Journey verdict built last
session can finally be counted for the version that produced it. A Journey we cannot attribute is
ignored, never credited to the default.

**Onboarding is nine questions now (v2).** Q7 starting mode · Q8 how much structure helps · Q9 how much
challenge is wanted now — approved alongside D62, both languages, and they already change a plan on their
own.

### What is still NOT built on this path, and must not be read as done
- **A library Journey for a PROCESS goal.** Missing CONTENT, not a missing decision — the founder threw
  out the "replace the expert's arc or shape movement through it" framing on 2026-08-18: **a set of
  Milestones IS a Journey**, several Journeys exist per goal, and a variant never changes Milestones. A
  different arc is a different Journey; an expert's hardcoded arc is Journey #1. The work is authoring
  process Journeys and having the expert select from them. Nothing is substituted today, and a test
  pins that.
- **The "two other ways" surface — decided AWAY, not missing (D63).** The founder's ruling on reviewing
  this build: at this stage the user is not asked to choose a plan. The app asks the Journey's guiding
  question and picks the version itself, without showing the alternatives. Do not build a chooser.
- **Any outbound learning.** Every rating is an on-device aggregate over the user's own Journeys.

Full detail: `00_Foundation/CHANGELOG.md` (2026-08-18, later) · `06_Decisions/Decision_Log.md` D62 ·
`04_Product/PRD/Plan_Library_and_Learning_PRD.md` §6.5–§6.7.

---

# ⛳ Previous START HERE — the 2026-08-18 build session (read this block, then the three docs below it)

The architecture described further down was **built, in its first slice**. What changed, and what the
next session must know before touching the plan path:

**1. A plan now has a SHAPE (D54), and this is the fix for "the plan didn't help me at all".**
A `recurring` goal — the shake, the pillowcases, reading, shaving — gets **no Milestone arc**: two setup
Steps carrying the user's own sentence, then that sentence repeated on every active day. A `process` goal
keeps the arc. Four of the founder's five real goals are the first kind, and the app previously knew only
the second. `app/src/core/learning/library/` is the new home; `JourneyShape` lives in `learning/types.ts`.

**2. The onboarding answers reach the plan for the first time.** `getOnboardingCoachSummary()` was called
by nothing. Two users who answered differently received identical plans. `library/matchApproach.ts` now
maps a stated obstacle onto the approach designed for it.

**3. The end-of-Journey label exists (D57/D58)** — asked at completion, cancellation AND quiet death, as
a request, never by notification. Without it the library can only compare on completion rate, which is
how a learning loop starts recommending whatever is easiest to finish.

**Read `00_Foundation/CHANGELOG.md`'s 2026-08-18 build-session entry** for the full list, including the
six device-QA defects closed and the reminder-time fix (D59).

### What is NOT built, and must not be mistaken for done
- **The translation cache (D55).** Templates are authored in English and keep their `{ACTION}` slot so
  the frame can be translated once per language and cached — the ORDER is in place, the cache is not.
  Until it exists, a Hebrew user sees English Step titles.
- **The "two other ways" surface and the process-shape variants (D56).** The three recurring approaches
  and the matcher exist; nothing yet lets the user switch, and a `process` goal still gets the expert's
  hardcoded arc. The founder's one process goal (*confidence to approach strangers*) is still generic.
- **The per-topic questionnaires** the founder approved (what makes me abandon · what motivates me ·
  journeys and tools tried before), modelled on the communication-style quiz.

### One caution for whoever picks this up
`Step.cadence` is stored and read only as a reminder heuristic — **nothing in the app generates repeat
occurrences from it**. A recurring Journey works today because the Planner MATERIALIZES one Step per
active day. That is deliberate and it fits the existing model, but it means a 56-day daily Journey is 54
Step rows, and progress reads "12 of 54". A true recurring-Step model with an occurrence log is the
cleaner design and would touch every surface; it is a decision, not an oversight.

---

# ⛳ Previous START HERE — read these three before anything else (2026-08-18, earlier)

The 2026-08-17/18 session did two things: it put the app on a **real device for the first time**, and the
founder articulated **the product's core architecture**. The second reframes most of what is still
unbuilt, so the snapshots further down this file are accurate history but no longer the best starting
point.

**1. `04_Product/Session_Handoff_2026-08-17_18.md` — read this first, in full.**
The architecture in the founder's own words, every defect found and fixed, the first-device build setup,
and everything still open. It was written to stand alone when session memory ran out.

**2. `04_Product/PRD/Plan_Library_and_Learning_PRD.md` — the architecture itself (Decision Log D52).**
Three layers: a user profile that knows how to address someone, what motivates them and **what makes them
abandon**; a **Journey library with several Journeys per goal** (without variants there is nothing to
compare, and without comparison there is no learning); and a matching layer that discovers from outcomes
which Journey suits whom. Stages 0–2 need no backend, no privacy policy and no consent.
Companion research: `05_Research/User_Matching_Parameters_Research_2026-08-17.md`.

**3. `04_Product/Open_Questions_For_Founder.md` — every pending founder decision, in one place.**
Ordered so the ones that actually block code sit at the top.

### The single most important fact to carry into the next session
The founder's verdict on the app as it stands: **"So far the plan that was built for me didn't help me at
all."** He asked for *drink a protein shake daily* and got Steps about walking and stretching, because
`BodyImageExpert` holds a hardcoded table of four Milestones × three Steps. The domain experts run an
interview and assess feasibility, but they **select from a closed menu and never author** — answers change
*how many* and *how intense*, never *what*. The partner's own QA rule (swap the user's name and see if the
Journey changes) is one our code fails absolutely: it is identical for every user in a domain.

**Stage 0 of the library PRD fixes this, today, with no backend and no privacy change.** It is the highest-
value work available.

### Two traps recorded there, worth knowing before designing anything
- **Survivorship.** The completion ceremony only meets people who finished. Collect feedback only there and
  every training label comes from a success — the library learns that everything works, invisibly. The
  feedback moment needs three hosts: completion, cancellation, and quiet death.
- **The objective.** "Few notifications that actually move someone to action" inverts the usual metric:
  judge on **action per interruption**, never engagement or send volume. The loop is allowed to *discover*
  that nagging works and is **forbidden from acting on it**.

### One process lesson, and it matters
Decision Log **D24** phrased an *agent's safety recommendation* as a **founder ruling**, and it went
unchallenged for weeks — shaping priorities and nearly shaping a letter to an external partner. The
founder rescinded it on 2026-08-18. An audit of the whole Decision Log for the same failure mode was in
progress at session end; **check its result before treating any un-sourced "decision" as approved.**

---

## ⭐ HANDOFF SNAPSHOT — 2026-08-13 (SESSION — MVP-ready sweep — supersedes the same-day "overnight autonomous session" snapshot below as "most current"; that snapshot and everything under it is kept in full as accurate history)

**Branch `feat/buddy-3d-and-reminders`. Continuation of the same day's overnight batch. Each item this
session: built → adversarially reviewed (code-reviewer + security-privacy where it touched data) →
findings fixed → green. Final state: `tsc` clean · `eslint` 0 · `jest` 969/969 (up from 916/916 at the
start of this session). Everything is COMMITTED by topic (one commit per completed item) but NOT
pushed — nothing is pushed without the founder's ask.**

### Commits this session (newest first)
`ff8a046` Q1 gendered form-of-address · `eb1a8d5` copy polish · `fbff0dc` coach dead-CTA wired ·
`d77a185` H1 data-realness · `1210206` K1 onboarding notif step · `cbb187c` docs (Step Dependencies PRD +
D45 Buddy→Future) · `0762422` Step Dependencies feature · `689a835` setAllies removal + L1 read-only —
plus the earlier overnight batch already recorded in the snapshot below (`a9c0c48`/`23dd121`/`9a68ec8`).

### Shipped this session
1. **`setAllies` removed** — the dead write path that bypassed the Companion coach-Journeys-only gate
   (flagged LOW/latent in the overnight D2 hardening below); no caller reached it, now gone outright
   rather than left as a guarded footgun. **L1 parked-goals surface made read-only** — the founder wants
   a coach-in-context entry point for activating a parked goal later, not a standalone action surface
   yet; the "activate" affordance was pulled pending that design.
2. **Step Dependencies — full feature** (linear, single-predecessor + single-dependent, chains ≤3,
   within-Milestone, coach-authored). A waiting-deck UI (approved mockup `04_Product/UX/
   Step_Dependency_Cards.html`); **fail-open** so a broken/unmet dependency never produces a dead-end;
   the adaptive engine never auto-drops a dependency Step; a `deferDependents` cascade so deferring a
   predecessor correctly defers what waits on it. Reviewed and fixed (a fan-out edge case, a
   defer-stranding bug, and an honesty pass on the waiting-deck copy — it must not imply the dependent
   Step is broken/blocked forever). PRD: `04_Product/PRD/Step_Dependencies_PRD.md`. **Follow-up, not yet
   built:** the coach does not yet PROPOSE a dependency during a live conversation — that authoring
   decision-logic is a coach-design task, tracked below in ▶ NEXT.
3. **Buddy re-staged to Future — Decision Log D45.** Confirmed **not** MVP; the coach (meta-agent) stays
   the MVP's central user-facing entity. The full Buddy vision is preserved, not deleted, annotated
   across `AI_Product_Principles.md` Principle 9, `09_Product_Philosophy/Product_Terminology.md`, and
   `04_Product/Version_Roadmap.md` / `POC_and_MVP_Scope.md`. (Full reasoning already in D45 — see the
   Decision Log; nothing further needed here.)
4. **K1 first-run onboarding — CLOSED.** Was already ~85% built (language-first → Personal Info → six
   questions → Coach handoff, K2). This session added the missing piece: a soft notification-permission
   pre-prompt step, placed after the questionnaire and before the Coach hand-off. Onboarding is now
   complete for MVP purposes.
5. **H1 data-realness sweep (this pass).** Replaced fabricated sample people (`sampleSocial`) on
   Home/Circle/Inbox with real empty states; removed the fake `SAMPLE_COMPLETED` demo Journey; wired
   "Nudge" as a real, distinct `CheerKind` (was silently reusing `sendCheer` with no dedicated meaning).
   The scripted coach's "Build this Journey" dead CTA now routes to the real manual creation wizard
   instead of doing nothing.
6. **Copy polish** (content-writer pass) across this session's new/changed user-facing strings — human
   phrasing, no em-dashes, en+he parity maintained.
7. **Q1 gender-aware form-of-address (D31) — extended.** Beyond the earlier foundation (mechanism +
   coach + Home greeting), this session converted the Coach screen, the Miss-Recovery caring copy,
   Settings/Profile, and the onboarding self-description step to the gendered `_feminine`/`_masculine`
   i18next-context forms (Hebrew), with the neutral base kept as the universal fallback for languages
   (and users) that don't need it.

### Non-code this session
- **Partner coaching content v1.0 evaluated** — verdict: strong, adopt-with-conditions. Only the wrapper
  file was actually sent; it references (but doesn't include) the worked Journeys and calibration cases.
  A message was sent back to the partner requesting: the referenced files; the operational referral
  triggers written inline for the 3 sensitive domains (not just described); a Body-Image eating
  daily-adherence mechanic; and a decision on unifying with the earlier v0.7 version. **Awaiting the
  partner's files** — nothing to do here until they arrive.
- **Invite feature scoped, not yet spec'd.** The founder wants a share/download-link invite that creates
  a friend request automatically on install (a deferred deep link). Confirmed feasible: needs a deferred
  deep-link service (e.g. Branch — a paid dependency, cost-guardian territory) or a manual invite-code
  fallback; Android has Play Install Referrer built in, iOS needs a service or the manual code path.
  **No PRD exists yet** — this is new scope, not started. Also gated in part on real sign-in (E1/Apple),
  since an invite needs a real identity to attach the friend request to.

### Repo docs touched this session
`04_Product/MVP_Task_List.md` (K1 → Done; H1/D3 rows updated with what's now real vs. still open; N1
clarified — reachable MVP screens are now fully translated, the DomainExpert catalogs are the one
remaining dormant/liveCoach-gated gap; Q1 → extended-surfaces note); `00_Foundation/CHANGELOG.md`
(new entry for this session); this file.

### ▶ NEXT (read this before starting new work)
1. **Needs a design session with the founder (MVP-blocking):** the **P1 friend profile page** (still
   doesn't exist — see the D-section rows below); the **coach-authoring decision logic** — specifically
   the coach PROPOSING a Dream (F1, still deferred) and the coach PROPOSING a Step dependency (new,
   from this session's Step Dependencies build) inside a live conversation. Both are conversation-design
   work, not implementation — good candidates for the next joint session.
2. **Apple-gated (founder action, unchanged):** the Apple Developer account still unblocks — real
   sign-in (E1), real device notifications, a native build, the G1 on-device design sign-off, and
   RTL/gendered visual QA of every new screen (including this session's Step Dependencies waiting deck
   and the extended Q1 surfaces). Also still pending, independent of Apple: deploy the `delete-account`
   Edge Function + host a Google Play deletion URL (O1 release gate); the D2 Support-Circle live-DB
   authorization QA with a 2nd account.
3. **Spec track (good use of Apple-blocked time):** write the **Invite** PRD (deferred-deep-link —
   cost-flag Branch vs. a manual invite-code fallback before choosing); close the "Approved-but-not-Ready"
   PRDs to execution precision — `Coach_Context_Summaries_PRD.md`, `Future_Journey_Management_PRD.md`,
   `Smart_Notification_Timing_PRD.md`, and a Friend Profile PRD (doesn't exist yet — needed before P1
   can be built).
4. **Tracked follow-ups (not urgent, don't lose them):** coach-authoring for both dependencies and
   Dreams (item 1 above); the DomainExpert catalog i18n gap, deferred to live-coach GA (still English —
   dormant/liveCoach-gated, non-issue while the experts stay gated, same reasoning as the N1 row below);
   an optional Decision Log entry once the on-call/safety-floor design lands from the v1.0 partner
   content eval; await the partner's v1.0 content files (see "Non-code" above).
5. **Working-tree discipline (KEEP THIS NOTE — still true):** Codex works this repo in parallel and only
   ADDS untracked PRD drafts / edits its own docs (`.codex/`, root `AGENTS.md`,
   `04_Product/PRD/README.md`, `05_Research/*`, new `Future/` PRDs including a Creator-platform draft).
   **Never `git add -A`** — stage explicit paths. Only this side (Claude Code) develops code.

**Git status:** everything above is committed by topic this session, on branch
`feat/buddy-3d-and-reminders`, **not pushed** — the founder has not asked for a push.
**The buildable-without-founder-input MVP queue is now essentially drained** — nearly everything
remaining in `04_Product/MVP_Task_List.md` needs either a founder design session (item 1 above) or the
Apple account (item 2 above). The next session should start with the spec track (item 3) or wait for
one of those two gates to clear.

## ⭐ HANDOFF SNAPSHOT — 2026-08-13 (overnight autonomous session — supersedes the 2026-08-12 SESSION 2 snapshot below as "most current"; that snapshot and everything under it is kept as accurate history)

**Branch `feat/buddy-3d-and-reminders`. Founder pre-authorized autonomous execution overnight. Five
items shipped — each: built → adversarially reviewed (code-reviewer + security-privacy) → findings
fixed → green. Final state: `tsc` clean · `eslint` 0 · `jest` 916/916 (up from 852/852 the previous
session). Everything is COMMITTED tonight by topic (one commit per completed item) but NOT pushed —
nothing is pushed without the founder's ask.**

### Shipped this session
1. **I1 Completion Celebration** — already logged in full as Decision Log **D42** +
   `PRD/Completion_Celebration_PRD.md` §0 (see the 2026-08-12 SESSION 2 snapshot below for the full
   build narrative). Included in tonight's commit set; no new doc content needed beyond this
   confirmation.
2. **C1 Weekly Review — CLOSED.** Discovered **already built** inside the D40 work: a real
   week-boundary trigger (`weekGate`), a real `weekly-review.tsx` screen, forward-only apply, and
   `adaptiveEnabled`-gated (so it stays dormant in plain production). Tonight only **closed the gap**
   with 4 coverage tests (flag-off inert, empty-week, 48h expiry, late-approval rebase).
   **Wording correction:** `MVP_Task_List.md`'s C1 row said the plan applies "automatically" — that
   was the founder's original 2026-08-07 framing; the ratified PRD and shipped code apply the proposed
   plan only **on explicit user approval** within the 48h window, never silently. See Decision Log
   **D43** for the two-layer split (strategic weekly proposal vs. tactical per-occurrence recovery +
   immediate user edits) — a pending weekly proposal owns the plan for its 48h window, but a silent
   daily/automatic apply never happens.
3. **J5 Account Inactivity Freeze — LOCAL-FIRST POC built.** A pure `InactivityEngine` reusing the
   existing J3 frozen path via a new `Journey.freezeReason` provenance field; a 21-day threshold
   (`config/inactivityPolicy.ts`); a lazy foreground-evaluated tick; a return flow (`return.tsx`) with
   Talk-to-coach / Choose-Journeys-to-resume / Not-now — **never auto-resumes**. Review fixed a HIGH
   bug (freeze re-armed across cycles) and a MEDIUM (a zero-frozen cycle left an undismissable CTA).
   **Server-authoritative enforcement (at-the-mark freeze while the app is closed, authoritative
   server time, multi-device consistency, Ally lifecycle notices) is DEFERRED** — needs the backend.
4. **L1 Parked (deferred) goals — built.** Coach-detected extra goals (`GoalSpec.deferredGoals`) now
   persist to `AppState.parkedGoals`, shown on the Journeys "For later"/Future tab, activatable into a
   real Journey (reuses `createJourneyFromGoalSpec`) or dismissable. **Sensitive-domain goals
   (addiction/relationships) are filtered at capture AND guarded again at activation** (shared
   `core/coach/sensitiveDomains.ts` — a deliberate double-gate).
5. **F1 Dream creation — INITIAL surfacing cut only.** My Journeys → My Dreams nav entry; a read-only
   "Part of your Dream" card on the Journey detail screen; a link-approval card for UNLINKED Journeys
   (reuses the tested `linkJourneyToDream`). **The coach Dream-authoring conversation itself is
   explicitly DEFERRED** to a joint design session — open questions remain.
6. **D2 Journey Support Circle — hardened (and a stale task-list line corrected).**
   `MVP_Task_List.md`'s D2 row said "no screen calls it — a user cannot currently propose/name an Ally
   in-app," but the real Support Circle (consent gate, propose/accept UX, the Companion bundle) was
   **already built** in the D40 work (commit `b3a9ff5`) — that row was simply stale and is now
   corrected. Tonight's real work was **hardening**: hid the invite CTA on completed/frozen Journeys,
   distinguished an offline-load-failure state from a genuinely-empty Support Circle, and added the
   missing UI tests. Live-DB authorization-matrix verification (2nd account) remains a **founder
   action** — the Supabase migration was applied by the founder this session.

All four non-I1/non-C1 items (J5, L1, F1, D2) are recorded together with full reasoning + deferrals in
Decision Log **D44**; C1's two-layer split + wording correction is Decision Log **D43**.

### Backfill PRDs (written earlier this session, before the overnight batch)
Five retroactive PRDs for already-shipped features that had no PRD, grounded in the actual code, now
indexed in `04_Product/PRD/README.md` → "Backfill": `Journey_Lifecycle_Management`, `Streak_Mechanism`,
`Account_Deletion_and_Data_Export`, `Notification_Content_Service`, `i18n_Localization_and_RTL`. Real
gaps they surfaced, worth carrying into the ▶ NEXT queue:
- The **streak reset is dormant in plain production** — it depends on `StepMissed`, which today is
  only emitted under `adaptiveCoach` (long-known limitation, B2, re-confirmed by the backfill).
- The **`abandoned` Journey status is defined but never written** — `deleteJourney` hard-removes
  instead of marking abandoned.
- The **`delete-account` Edge Function is undeployed**, and there is **no hosted Google Play deletion
  URL** — both are O1 release gates, unchanged from prior snapshots, re-confirmed.
- **`buildNotificationContent` is not on any delivery path yet** (built infrastructure, D40, no caller).
- **i18n engine/config DATA strings are still English** (MissionEngine titles, `shopItems` names,
  sample data — known, H1) and **RTL is still device-unverified**.

### ▶ NEXT / founder-decision queue for tomorrow
1. **D2:** retire the dead `setAllies` path (it bypasses the Companion coach-Journeys-only gate — LOW
   latent risk, no caller today) or add a guard; run the **live-DB authorization-matrix QA** (2nd
   account); close the D2 lifecycle-gating design questions.
2. **C1:** the wording is now reconciled in `MVP_Task_List.md` + Decision Log D43 — nothing further
   needed unless the founder wants a different apply model.
3. **F1:** design the **coach Dream-authoring conversation** (+ the remaining F1 open questions in
   `Dream_Management_PRD.md`).
4. **L1:** confirm the user-facing label, a cap on parked goals, and whether "activate" means
   direct-build vs. re-running the coach interview.
5. **J5:** plan the **server-authoritative version** for when the backend lands; confirm the Home
   auto-open priority across ceremony / weekly review / inactivity-return (ceremony wins over review
   per D42 — inactivity-return still needs its place in that ordering; one major modal per foreground).
6. **Founder release-gate actions (unchanged, re-flagged by the Backfill audit):** deploy the
   `delete-account` Edge Function + host a Google Play deletion URL (O1); on-device QA (RTL,
   notifications, the new return/ceremony/parked-goals/Dream surfaces) once the Apple account lands;
   the Support Circle live-DB QA (item 1 above).
7. **Partner coaching package (v0.7):** feedback already sent; the on-call flow + expert calibration +
   safety-floor work is tracked there, not in this repo's task list.

**Open decision resolved today:** Buddy/avatar is now formally staged **Future** (not MVP) — Decision
Log **D45**. The coach (meta-agent) is the MVP's central user-facing entity; there is no avatar/Buddy
in the current app. The full Buddy vision is preserved, annotated (not deleted) in
`AI_Product_Principles.md` Principle 9, `09_Product_Philosophy/Product_Terminology.md` and
`Product_Philosophy.md`, and `04_Product/Version_Roadmap.md` / `POC_and_MVP_Scope.md`.

**Git status:** everything above is committed by topic tonight, on branch
`feat/buddy-3d-and-reminders`, **not pushed** — the founder has not asked for a push.

## ⭐ HANDOFF SNAPSHOT — 2026-08-12 (SESSION 2 — most current; supersedes the 2026-08-12 session-1 snapshot below)

**Branch `feat/buddy-3d-and-reminders`. Built the top Ready task — Completion Celebration (I1) — end to end:
implemented in 6 slices, adversarially reviewed (code-reviewer + security-privacy), findings fixed. Green:
tsc clean · eslint 0 · jest 852/852. UNCOMMITTED (working tree) — the founder has not asked for a commit.**

### Built this session (I1, Decision Log D42; PRD §0)
- **Small celebration:** the existing Step confetti now rolls 1 of 3 comparable-intensity variants, is
  suppressed on a Journey-completing Done, has a **reduced-motion** guard (new `use-reduced-motion` hook —
  none existed before), and a **Settings toggle** (`CelebrationPreference`, small-celebrations only; the big
  ceremony can't be disabled).
- **Big ceremony:** a dedicated modal route `app/src/app/completion.tsx`. The card is minted ONCE at the
  first authoritative `completed` transition in `JourneyEngine.checkInStep` (idempotent, latched like
  `completionRewarded`). Auto-open mirrors the Weekly-Review latch (`getPendingCompletionCeremony` /
  `completionCeremonyNeedsAutoOpen` / `markCompletionCeremonyShown` + `migrateState` marks legacy completions
  already-shown). **Priority: ceremony wins over Weekly Review** (`COMPLETION_CEREMONY_WINS`, one flippable
  point; "one major event per foreground" via per-foreground latches reset on `AppState` active).
- **Completion card:** safe-fields-only (`core/celebration/completionCard.ts` + `cardTemplates.ts`; title
  snapshot + step/day counts, NO reports/why/Dream/Ally), swipeable name-revealing + name-omitting variants,
  a **privacy preview before share**, transient caption never persisted, reopenable **Share completion** on a
  completed Journey. Share/save behind a `CardShareGateway` seam (`NullCardShareGateway` degrades to
  `expo-sharing` text share on web/Expo Go; native `react-native-view-shot` NOT installed — lights up on the
  native build). Card is exported + wiped with the account (O1/GDPR verified).
- **Gentle final-Step confirmation** (D41 finality): one shared gate (`hooks/useFinalStepConfirm.ts` +
  `FinalStepConfirmSheet`) wired into all three completion paths (Home swipe, ⋯ report, Journey-detail
  check-in). Copy (gendered, en+he): "על ידי ביצוע הצעד הזה אתה מסיים את ה-Journey. לאשר?".
- **Review fixes:** a HIGH i18n bug (doubled `card.` prefix → card rendered raw keys; now a single tested
  `cardCopyKey` seam + regression test) and a MEDIUM Weekly-Review auto-open suppression bug. Privacy model
  judged sound.

### ▶ NEXT
1. **Founder on-device visual pass** of the ceremony / card / final-Step confirmation (RTL both address
   forms) — impractical to drive fully in web (needs completing a multi-week Journey). Then **move
   `Completion_Celebration_PRD.md` → `Done/`** (its status header already notes shipped vs deferred).
2. **Offer a commit** — I1 is uncommitted; commit by topic when the founder wants (nothing is pushed).
3. **Deferred follow-ups now tracked in `MVP_Task_List.md`:** **I1-a** in-app Ally completion/thanks message
   (needs the notify/message backend), **I1-b** device-verified image export (needs the native build).
4. **Open Low (founder's call):** default card variant reveals the Journey name — consider defaulting to a
   name-omitting variant for privacy on sensitive Journeys (privacy-review L1).
5. Remaining Ready/queue unchanged from session-1 snapshot below (Account_Inactivity_Freeze ready; the
   approved-but-not-Ready PRDs; the Support Circle migration + live-coach hardening still founder/Apple-gated).

## ⭐ HANDOFF SNAPSHOT — 2026-08-12 (session 1 — supersedes the 2026-08-10 snapshot below)

**Branch `feat/buddy-3d-and-reminders`. A large feature-build session: the entire "Ready" PRD queue was
implemented — each feature adversarially reviewed (code-reviewer, + security-privacy where it touched
data/social) and its findings fixed. Everything is COMMITTED (topic commits) but NOT pushed. Green
throughout: `tsc` clean · `eslint` 0 errors · `jest` 806/806.**

### Built + committed this session (each: implemented → reviewed → fixed → green)
Commits, newest first: `8313fc7` Communication Style · `d67c9a6` Onboarding · `b38a917` Dream screens ·
`b3a9ff5` Support Circle · `30ea92f` notification service · `b1dd07b` Dream fixes · `9a3b213` Dream
foundation · `f64975d` Weekly Review · `f198097` completion-final (D41) · `abaa209` PRD→Ready (D40) ·
`67209ea` docs D35–D40 + Sync Manifest · `b2d4008` Reminder Off/Fixed · `969cd43` Active Hours. (Earlier
on the branch: Daily Step Reporting, Step Postponement.)
- **Daily Step Reporting** (D35/D36) · **Step Postponement** (D37) · **Journey completion is FINAL** (D41 —
  `reverseReport` refuses on a completed Journey; resolves the contradiction with the celebration model).
- **Account Active Hours** (per-day windows, **clamp-not-disable**) · **Journey Reminder Off/Fixed**.
- **Weekly Review** (D40 — week-close proposal, never-empty next week, forward-only apply, 48h; deterministic,
  `adaptiveEnabled`-gated so production is dormant).
- **Dream Management** (D40 — coach-owned primary + secondary Dreams; engine foundation + My Dreams / Dream
  detail **view-only** screens).
- **Notification content service** (D40 — 9 Support-Circle types + reminder; tone-ready seam; lock-safe).
- **Support Circle / D2** (D40 — consent gate, Companion = **coach-Journeys-only** system-generated Step
  progress, removed-friend security fix; **needs the Supabase migration applied — see ▶ NEXT**).
- **Onboarding questionnaire** (K2 — first-run gate, language-first, Personal Info, 6 questions, coach-summary seam).
- **Communication Style profile** (D40 — 4 styles, 6-comparison quiz, notification tone seam) + fixed a
  **pre-existing O1/GDPR gap**: `pushapp.profile` is now in the data export AND erased on account deletion.
- **Docs:** Decision Log **D35–D41**; the whole PRD queue moved to Ready; `11_Engineering_Bible/Sync_Manifest.md`;
  `04_Product/PRD/Personal_Growth_Style_Assessment_Form.md` (reference — the extracted Tally research form).

### Git / working-tree discipline (IMPORTANT next session)
- Commits are local on the branch; **NOT pushed** (founder's call).
- **Codex works this repo in parallel** — it only ADDS new untracked PRD drafts and edits its own docs
  (`.codex/`, root `AGENTS.md`, `04_Product/PRD/README.md`, `Miss_Recovery_PRD.md`, new PRDs). **Never
  `git add -A`** — stage explicit paths (`git add app/src` for code; named doc files for docs). **Only this
  side develops code and moves PRDs to `Done/`.** Flow: Codex writes an initial PRD → we ground-in-code,
  close questions, edit, build, commit (PRD-per-feature; see `04_Product/PRD/README.md`).

### ▶ NEXT
1. **Completion_Celebration** (`04_Product/PRD/Completion_Celebration_PRD.md` — **Ready, not started**): I1 —
   small confetti on a Step check-in + a shareable achievement card on Journey/Milestone completion (D32).
   Top ready task.
2. **Founder actions:** apply `app/supabase/migrations/0001_journey_support_circle.sql` in Supabase → SQL
   Editor (⚠ backfills existing shares to `requested` = least-access) to make Support Circle live; then a
   live-DB QA pass on the RLS/trigger authorization matrix. On-device QA (RTL, real notifications,
   freeze/resume) waits for the Apple Developer account.
3. **Approved-but-not-Ready PRDs** (need a close-the-questions pass before build): `Coach_Context_Summaries`,
   `Friend_Profile`, `Future_Journey_Management`, `Smart_Notification_Timing`.
4. **Deferred wiring slices:** route `CommunicationScheduler` → `buildNotificationContent` (resolve-at-reconcile)
   so style + form-of-address reach real notifications; wire `getOnboardingCoachSummary()` +
   `profileToCoachStyle()` into the live coach (liveCoach-gated); content-writer copy pass (notification
   variants + all new placeholder copy) + ux-designer visual pass.

## ⭐ HANDOFF SNAPSHOT — 2026-08-10 (supersedes the 2026-08-09 snapshots below; kept as accurate history)

**Branch `feat/buddy-3d-and-reminders`. Everything this session is COMMITTED (9 topic commits) but NOT
pushed** (the founder never asked to push). The tree is clean except files that are NOT ours (the
founder's Codex setup): `.codex/`, a root `AGENTS.md`, a Codex-modified `04_Product/Miss_Recovery_PRD.md`,
and the founder-authored PRD drafts still untracked in `04_Product/PRD/` (Friend_Profile,
Journey_Support_Circle, Daily_Step_Reporting, Step_Postponement, Weekly_Review, + `Future/`). Green
throughout: **tsc clean · eslint 0 errors · jest 548/548 across 59 suites**.

### Built + committed this session (on top of the 2026-08-09 work below)
- **i18n finished** for the secondary screens (14 namespaces at parity); **Coins hidden** (B1); Settings
  **Notifications reads real permission state** + **About shows the real version** (E2).
- **D30 — the coach meta-agent is the SOLE user-facing voice** (`CoachOrchestrator.metaVoiced`); the 4
  domain experts are internal tools needing no user-facing translation.
- **J3 — Freeze/Resume a Journey** + the authoritative **`Journey.status`** field (drives the tabs).
- **D31 — gender-aware "form of address" (לשון פנייה)** i18n mechanism (i18next context; default neutral).
- **D33 — ONE authoritative week boundary** (`core/util/week.ts`) — a configurable, country-derived
  week-start day consumed by Missions/Streak/Week-pager; consolidated the old 3 conflicting week models.
- **D34 — unified Own Profile** (`state/ProfileProvider.tsx` — folds in form-of-address + week-start +
  country + display name + birth date) + a **My Profile screen** (`app/settings/profile.tsx`) + an
  all-countries picker. Own-vs-friend privacy boundary: private fields never enter a friend payload.

### NEW working method — PRD-per-feature (founder, 2026-08-10)
Every feature/change gets an orderly PRD in **`04_Product/PRD/`** (`README.md` documents the method).
Flow: the founder points to a file → the AI reads it → asks questions → surfaces problems + edge cases
FROM THE CODE → edits the PRD if we decide → then develops. **Implemented PRDs move to
`04_Product/PRD/Done/`** (currently: Week_Boundary_Preference, Own_Profile). Decisions are logged in
`06_Decisions/Decision_Log.md` (D29–D34). Open PRDs remaining in the folder: Weekly_Review (blocked — 11
`§13` questions; many answerable from the existing `reviewWeek`/`AdaptivePlanner` engine),
Friend_Profile (P1), Journey_Support_Circle (D2), Daily_Step_Reporting, Step_Postponement.

**▶ NEXT:** continue the PRD queue — the founder points to the next `04_Product/PRD/` file (a good pick:
Friend_Profile P1, or close Weekly_Review's blocking questions). Apple Developer account expected
~2026-08-10 → then device-test everything built (real RTL, notifications, Freeze/Resume, form-of-address,
Own Profile). Deferred phases to pick up: Own Profile **photo** (Phase 2) + auth-provider seeding (E1);
week-boundary IANA/multi-device (backend-gated). Nothing is pushed — offer a push when the founder wants.

## ⭐ HANDOFF SNAPSHOT — 2026-08-09 (SESSION 2 / continuation — supersedes the session-1 snapshot just below as "most current")

**Continued the same day on branch `feat/buddy-3d-and-reminders`; everything remains UNCOMMITTED (working
tree only), as the founder authorized autonomous execution and has not asked for a commit.** Final state:
`tsc` clean · `eslint` 0 errors · **`jest` 533/533 across 56 suites** (from 515/55 at the start of this
session). The founder's directive this session: move faster toward a shippable MVP-with-value this week;
execute everything doable WITHOUT his input, leave anything needing spec/design for a joint go-through, and
he'll have the Apple account ~2026-08-10 to test on-device.

### Built + verified this session (all green)
1. **i18n screen translation — Batch D + Batch 2 (finishes the secondary screens).** New namespaces
   `circle` · `inbox` · `explore` · `buddy` · `shop` · `missions` · `achievements` (en+he, all at parity →
   **14 namespaces**). Reason copy moved out of `core/config/reasons.ts` into the `journey` ns
   (`reason.prompt`/`reason.list.*`) behind framework-free helpers (`reasonLabel`/`reasonCaringCopy`/
   `reasonPrompt`). Migrated screens: Inbox, Circle (`friends.tsx`), Explore, Buddy (+ `BuddyScene`/
   `BuddyInventory`/`EvolveReveal`), Shop, Missions, Achievements. Web-verified Hebrew on the on-tab ones.
   **Still English by design (engine/config/dev-sample DATA, not screen chrome):** MissionEngine mission
   titles, `shopItems` cosmetic names, `sampleAchievements`/`sampleSocial` — a later config-i18n / H1 pass.
2. **Coach hierarchy fix — the META-AGENT is the sole user-facing voice (Decision Log D30).** Was: an expert
   question's prompt was surfaced VERBATIM to the user. Now `CoachOrchestrator.metaVoiced` re-voices every
   expert question from the meta-agent's own `interview.<intent>` `coachContent` template (user's language,
   **deterministic — no added LLM call**). Experts are pure internal tools now; only the prompt is
   re-authored (options/answer-matching untouched). Founder direction: the 4 domain experts need NO
   user-facing translation — they talk only to the meta-agent, which speaks the user's language. (Expert
   Hebrew content = **not needed**, folded into the future expert spec.)
3. **`Journey.status` field (founder-requested) — the authoritative tab/lifecycle source of truth.**
   `JourneyStatus = active | frozen | completed | abandoned` (`core/types/domain.ts`). `resolveJourneyStatus`
   + `bucketOf` (`journeyView.ts`) bucket the Journeys tabs by it, with backward-compat derivation for
   pre-field Journeys. `JourneyEngine` sets it explicitly (create→active, finish→completed).
4. **J3 — Freeze / Resume a Journey (DONE & web-verified).** `JourneyEngine.freezeJourney`/`resumeJourney` +
   `JourneyFrozen`/`JourneyResumed` events + `AppCore` wiring (persist + reminder reconcile).
   `CommunicationScheduler` skips frozen Journeys (no reminders while paused). UI: Pause/Resume button + a
   "Paused" banner on `journey/[id]` (check-in CTA hidden while paused) + a "Paused" pill on the Journeys
   card. Hebrew copy + engine/scheduler/journeyView tests.
5. **B1 (partial) — Coins HIDDEN in the initial version (D29).** `TopStatusBar` no longer takes/renders
   Coins (engine still accrues `buddy.coins`; Shop archived = no sink). Web-verified: Home top strip now
   shows level + streak only. **Still open in B1: the breadth-based leveling reframe (needs design).**

### ▶ NEXT — the ORDERLY WORK PLAN toward "MVP with value this week"
The confident-without-founder-input well is now largely drained; the rest needs the founder's spec/design.
Two tracks:

**A. Still executable without the founder (do these next, autonomously):**
- **H1 data-realness sweep** (mostly mechanical): About `v0.1` label, decide `sampleSocial`/`sampleContent`
  fallbacks (keep vs empty-state), Journeys "Future" tab sample, Inbox Groups empty tab. Small, low-risk.
- **E2 Settings finish (partial):** Notifications row should read REAL permission state (not static "On");
  About row real version. (Apple sign-in stays "Coming soon" — blocked.)
- (Note: the `RestartPrompt` showing English + Hebrew together is INTENTIONAL — a bilingual banner,
  each block pinned to its own script direction, because mid-direction-flip the layout is half-applied.
  Not a translation gap; leave as-is.)

**B. Needs the founder (the joint go-through queue — spec/design/decide, roughly in MVP-value order):**
1. **P1 friend profile page** (new screen — layout/design). D29 says minimal: name + active Journeys +
   progress + cheer.
2. **J4 reminder management** for an existing Journey (where it lives + what's editable).
3. **L1 deferred-goals ("parked goals") surface** (where + how to activate).
4. **I1 completion celebration** (Step-done vs Journey-complete moments — design).
5. **F1 Dream creation** + coach-suggested Dream-linking approval (flow design).
6. **D2 Ally propose/accept UX** on a Journey (screen design).
7. **C1 Week-Review screen** (move the replan trigger to week boundaries + a review screen — design).
8. **B1 breadth-leveling reframe** + **B3 achievements engine** + **B4 Missions "small change"** (all need
   scope/spec).
9. **K1 onboarding** + **E1 real Google sign-in** — gated on the Apple account (~08-10) + design.
10. **G1 design sign-off** — founder review pass across every screen (light + dark), on-device once Apple lands.

**Not doing (founder decision):** translating the 4 domain experts (internal tools; D30).

## ⭐ HANDOFF SNAPSHOT — 2026-08-09 (session 1 end — superseded by the SESSION 2 snapshot above; kept as accurate history)

**This session defined the concrete initial-version (MVP) scope with the founder (Decision Log
D29, `04_Product/MVP_Task_List.md`) and began building it, on branch `feat/buddy-3d-and-reminders`.
Everything below is UNCOMMITTED (working tree only) — nothing has been committed or pushed this
session; the founder authorized autonomous execution.** Verified this session: `tsc` clean,
`eslint` 0 errors (101 pre-existing style warnings, unrelated), **jest 499/499 passing across 52
suites** (grew from 468 at session start).

> **⏩ SESSION-END ADDENDUM (authoritative — the session continued well past the mid-session record
> below). Final state at hand-off: `tsc` clean, `eslint` 0 errors, `jest` 515/515 across 55 suites.
> ALL UNCOMMITTED. Work done AFTER the "Built this session" list below:**
> - **J2 — delete/abandon a Journey: DONE & verified in the web preview** (was "in progress" below).
>   `JourneyEngine.deleteJourney` + `AppCore.deleteJourney` (`JourneyDeleted` event → persist +
>   reminder reconcile) + a destructive "Delete journey" button and confirm Modal on `journey/[id].tsx`.
> - **i18n SCREEN TRANSLATION advanced from "partial" to the CORE surfaces, all green** (Batches A, B,
>   C-UI, C-Lang-1). Now translated + RTL-hardened: Settings, Home + all home components (incl.
>   `SwipeableStepRow` RTL gesture), Journeys tab, `journey/[id]`, the `journey/new` wizard, all
>   `journey/*` components, `journeyView` helper, and the Coach UI chrome. **The coach now CONVERSES
>   IN HEBREW for the general path** (interviewPlaybook + meta questions + GeneralExpert via a
>   `coachContent` namespace + a Gemini locale directive; domain/kind enums stay English). **7
>   namespaces at en/he parity** (`src/i18n/__tests__/parity.test.ts`). RTL is still code-level only —
>   device-verify `SwipeableStepRow` swipe direction, chevrons, accent edges, coach bubble tails.
> - **New founder design change — Journey detail Steps → WEEKLY PAGER (DONE, verified).** "Steps by
>   week" with ‹ › arrows, "Week X of Y", one week's Steps at a time; empty weeks show a gentle note.
>   Grouping via `stepsByWeek` in `journeyView.ts` (`plannedFor` when all Steps are scheduled, else an
>   even spread by order; totalWeeks from `durationDays`). The "Phase X of Y" card above it was kept.
> - **i18n STILL NOT DONE (next session, in small 5–6-file batches):** Inbox, Circle (`friends.tsx`),
>   Explore + `core/config/reasons.ts` (Batch D — FAILED twice on infra flakiness, retry it first);
>   then Buddy/Shop/Missions/Achievements; then the 4 domain experts' Hebrew content
>   (Addiction/Relationships/BodyImage/Career, "C-Lang-2"); then a final device RTL sweep. Untranslated
>   screens show English (no crash).
> - **Infra note:** mid-session the background-subagent layer went flaky (4 consecutive failures —
>   stream stalls + "connection closed mid-response"), then RECOVERED. Root cause: transient API/
>   streaming instability on long (10–13 min) agent runs, aggravated by a very long main-session
>   context. Mitigation for next session: a FRESH, lean context + keep each i18n batch small/short.
> - **After i18n, the founder's plan is:** proceed with **J3 (Freeze/Resume) · J4 (reminder mgmt) ·
>   L1 (deferred goals) · P1 (friend profile)** — all confirmed IN (D29) — up to the point where the
>   founder reviews each screen; then go screen-by-screen with him to spec the remaining screens.

### Scope decisions (see `06_Decisions/Decision_Log.md` D29 for full reasoning)
`04_Product/MVP_Task_List.md` was created this session — the granular initial-version checklist (21
tracked items, IDs A–P). Confirmed **IN** the base version: edit a Journey (coach-led via a pencil
button), delete/abandon a Journey (J2), first-run onboarding + notification-permission ask (K1),
multi-language i18n with Hebrew + RTL (N), account deletion/export (O1). Resolved open questions:
Coins hidden in MVP (kept accruing in the engine, no Shop sink); the manual Journey wizard kept as
a coach-first fallback; a minimal friend profile page IN (P1); messaging + Channels/Groups deferred
post-MVP; Journey Freeze/Resume IN (J3); reminder management for existing Journeys IN (J4); a
deferred-goals ("parked goals") surface IN, minimal (L1).

### Built this session
1. **i18n infrastructure (task N1, PARTIAL).** Added `i18next` + `react-i18next` +
   `expo-localization` (all free, no cost gate). New: `app/src/state/LanguagePreference.tsx`
   (persists `pushapp.languagePreference`; device-locale default, English fallback); a searchable,
   alphabetical language picker at `app/src/app/settings/language.tsx`; `app/src/i18n/` (`index.ts`
   with namespaces `common`/`settings`/`home`/`journeys`/`journey`, `rtl.ts` helpers, English + Hebrew
   resource files under `resources/`); `RestartPrompt` component for direction flips (Expo Go has no
   auto-reload). The Settings screen is fully translated.
   **Remaining gap — screen migration is PARTIAL:** Home, `TopStatusBar`, `journey/[id].tsx`, and tab
   labels are translated; `journeys.tsx`, `journey/new.tsx`, and most home/journey components + Coach
   + secondary tabs are **NOT yet migrated** (they show English; nothing crashes). Full **RTL layout**
   is code-level only — **NOT device-verified** (`forceRTL` is a no-op on web, so the web preview
   cannot confirm it).
2. **J1 — coach-led Journey editing (DONE).** A pencil button on the Journey screen opens the coach
   in edit mode; it proposes a validated structured diff; the user approves; `AppCore.updateJourney`
   applies it immediately (Step ids, check-in history, and XP are preserved). Gated on
   `featureFlags.liveCoach`; blocked on completed Journeys. New `JourneyUpdated` event. New files:
   `app/src/core/coach/journeyEdit.ts`, `app/src/core/coach/JourneyEditOrchestrator.ts`,
   `app/src/components/coach/useJourneyEditCoach.ts`, `app/src/components/coach/CoachEditProposalCard.tsx`,
   `app/src/components/coach/EditCoachScreen.tsx`.
3. **O1 — account deletion + data export (built, not deployed).** Settings gained a "Your data"
   section: **Export** (`expo-sharing`, writes to cache then deletes the temp file) and a destructive
   **Delete** (confirmation sheet; remote-first, refuses when offline; post-delete the app returns to
   a clean first-run via a persisted `firstRunFlag` seed-guard so the demo data does not re-seed after
   deletion). New: `AuthGateway.deleteAccount` + the Supabase implementation, `AppCore.exportStateJson`
   + `AppCore.resetToFirstRun`, `app/src/components/settings/DeleteAccountSheet.tsx`,
   `app/src/state/useAccountActions.ts`. **An Edge Function is WRITTEN but NOT deployed**
   (`app/supabase/functions/delete-account/index.ts`) — deploying it, plus hosting a Google Play
   public account-deletion URL, are founder pre-release actions, not yet done.
4. **B2 — real StreakEngine (DONE).** Replaces the hard-coded streak placeholder with a day-count
   that increments once per new check-in day and resets to 0 only on an **URGENT** missed Step
   (config-driven "no slack" urgency logic in `app/src/core/util/urgency.ts` +
   `app/src/core/config/streak.ts`, engine at `app/src/core/engines/StreakEngine.ts`).
   **Known limitation:** the reset depends on the `StepMissed` event, which today is only emitted
   when the `adaptiveCoach` flag is on — the reset behavior works correctly on the founder's device,
   but in general the streak would only increment (never reset) until the miss-producer runs
   un-gated. Flagged as an explicit follow-up, not a silent gap.
5. **Two founder-requested design fixes (verified in the web preview).** The Home top-bar
   level/XP meter shrunk to ~¼ its former width; the "This week" Dream rail now connects
   node-centres only (no visual overshoot past the end dots) and is hidden entirely when a Dream
   group has only a single Step. Also fixed a spurious `RestartPrompt` that incorrectly showed on the
   language screen at app boot — it now only appears after a deliberate language change.

### Still open / next
- **Finish the i18n screen-migration in controlled batches** — an earlier attempt to do it as one
  large single pass stalled; do it in smaller chunks: `journeys.tsx`, `journey/new.tsx`, the
  home/journey components, then Coach (and make the coach converse in the user's language), then the
  secondary tabs, then a full RTL layout sweep (`SwipeableStepRow` is the highest-risk component), a
  global `RestartPrompt` surface, and localizing the username-validation strings.
- **Remaining MVP tasks** (see `04_Product/MVP_Task_List.md` for the full table): J2 delete Journey
  (in progress), J3 freeze/resume, J4 reminder management, L1 deferred-goals surface, P1 friend
  profile, B1 breadth-based leveling + Coins-hide, B3 achievements, B4 Missions small change, C1
  Week-Review screen, D2 Ally UX, E1 real Google sign-in, E2 finish Settings, F1 Dream creation, K1
  onboarding, G1 design sign-off, H1 frozen-data sweep (streak now done), I1 completion celebration.
- **Apple dev-build track** stays blocked on the Apple Developer Program account (purchased
  2026-08-08; account details expected ~2026-08-10) — gates real device notifications, a native dev
  build, and real Apple/native-Google sign-in.

**▶ NEXT:** continue the i18n screen-migration in small batches (see above), then pick up the next
MVP task from `04_Product/MVP_Task_List.md` per the founder's priority — J2 (delete/abandon a
Journey) is already in progress. Nothing this session has been committed; consider committing by
completed topic (i18n infra, J1 coach-led editing, O1 account deletion/export, B2 StreakEngine, the
two design fixes) once the founder wants a checkpoint.

## ⭐ HANDOFF SNAPSHOT — 2026-08-07 (MATURE UI REDESIGN — supersedes 2026-08-06, superseded above by the 2026-08-09 snapshot; kept as accurate history)

**A full mature-redesign of the app UI shipped this session** on branch
`feat/buddy-3d-and-reminders` (commit `138ad4a` + this docs commit). It is **NOT behind a
flag** — it replaces the old playful/gamified UI. The founder drove it live over many
iterative rounds; `tsc` + `eslint` are clean throughout. Verified by web screenshots (light +
dark) at 460×920 — see the design decisions below.

### What changed (the direction)
The founder repositioned the app's *look* from the playful gamified companion to a **mature,
calm, technical, elegant "adaptive coach"** language: "no longer a game — convey calm,
motivation, seriousness, technology, progress." External design tools (Stitch, UX Pilot,
Figma Make) were evaluated and **rejected**; we built from our own `04_Product/UX/
coach_mvp_mockup.html` direction. Refs archived under `04_Product/UX/UX_References/stitch/`
and `.../figma_make/`.

### Design system (`app/src/constants/theme.ts`)
- **Mature palette**, light + dark: warm-neutral ground, **ONE deep-turquoise accent**
  (`teal`/`tint`) for progress AND action, **amber (`gold`) reserved for urgency only**
  (streak / most-urgent). Legacy accents kept as keys but muted. Dark was lifted OFF pure
  black (founder: "too black").
- **Typography: Inter only** (display + body by weight); **Baloo 2 dropped** (too playful).
  `FontFamily.heading*` now resolve to Inter; `Inter_700Bold` added to `FontAssets`.
- **Both themes are real now**: `use-color-scheme(.web)` follow the device;
  `app/_layout.tsx` branches `NavThemes` by scheme. (Founder wants BOTH kept + a switch;
  an in-app theme toggle is a TODO — currently follows the OS.)

### Navigation & screens (all under `app/src/app/(tabs)/` + `app/src/components/<area>/`)
5-tab bar (bar on the LIFTED surface): **Home · Journeys · Circle · Inbox · Settings.**
- **Home** (`index.tsx` + `components/home/*`): top strip (level + XP bar, coins, streak —
  icons only); a **coach hero card** ("Talk to your coach" → `/coach`); **"Today's focus"**
  = next pending Step of each active Journey (multi-card, time-of-day urgency colour);
  **"This week"** = remaining Steps **grouped by Dream** as separated cards on a rail;
  **"Give support"** people board with **two tabs** (Needs-support / Deserve-praise) showing
  the *reason*; **confetti** on check-in; a **⋯ report menu** (Done/Partial/Couldn't/Postpone/
  Reschedule, reusing the old `journey/*` sheets).
- **Journeys** (`(tabs)/journeys.tsx`): promoted from modal to a TAB; Active/Completed/Future;
  **Dream name eyebrow** on each card; "Create journey" (→ `/journey/new`). The old
  `app/src/app/journeys.tsx` modal was deleted (route collision).
- **Coach** (`(tabs)/coach.tsx` + `components/coach/*`): **now WIRED to the live LLM** (real
  `CoachOrchestrator` → Gemini) behind `featureFlags.liveCoach` — ON only when
  `EXPO_PUBLIC_GEMINI_API_KEY` is in the git-ignored `.env.local` (**founder-device-only**); no key ⇒
  the unchanged scripted prototype (zero regression). Privacy on the seam: `RedactingLlmClient`
  (redactForCloud on outbound) + `SafetyLayer` guard + **addiction/relationships STOP-and-handoff**
  in `useLiveCoach`; on completion `AppCore.createJourneyFromGoalSpec` builds a real Journey. No
  persona name on-screen; off the tab bar, opened from Home. **Security-privacy reviewed 2026-08-07:
  safe on the founder's OWN device for GENERAL goals only** (his own capped PAID key; the first
  triage call is unredacted-for-content, so avoid real sensitive disclosures while testing).
- **Simulated Google sign-in (dev-only):** `core/profile/simulatedUser.ts` reads
  `EXPO_PUBLIC_SIM_USER_NAME/EMAIL` (git-ignored) → Home greets by name + Settings shows name/email
  ("Connected · Simulated"). Never sent to the LLM. `TODO(auth)` = real OAuth.
- **Circle** (`(tabs)/friends.tsx`): single Support-Circle friends list + Invite/Add. The
  editable identity/username **moved OUT to Settings**.
- **Inbox** (`(tabs)/inbox.tsx`): Friends · Allies · Groups · Requested tabs + search +
  "New message" compose + avatars.
- **Settings** (`(tabs)/settings.tsx` + `components/settings/*`, NEW): **Profile** with an
  **auto-generated editable `@username`** (`core/social/username.ts` — generate + uniqueness
  validation; persists via `social.setHandle`, inert in guest/POC); **Account** with
  "Sign in with Apple / Google" (**Coming soon**); Notifications/Appearance/About rows.

### Archived (kept in code, off the bar) — `04_Product/UX/Archived_Screens.md`
Buddy tab, Shop, the Explore **marketplace** rows (`SHOW_MARKETPLACE=false`), the Coach
tab (now a Home entry), and — still reachable for now — the step-by-step **creation wizard**
(to be replaced by coach-driven creation). Explore/Buddy/Coach routes are `href:null`.

### Demo data
`AppCore.seedDemoJourney` now seeds **2 Dreams** ("Get fit and strong", "Sleep and recover
well") + **3 linked Journeys** so Dream grouping/eyebrows are visible. `src/dev/sampleSocial.ts`
feeds sample friends/inbox when real social is empty. **Caveat:** the seed only runs on FIRST
run — to see it on an existing device/browser you must clear storage / use Incognito.

### Open / founder decisions (▶ NEXT)
1. **Real sign-in (Apple/Google)** to supply a real display name (replaces the "there"
   greeting placeholder). Needs the **~$99/yr Apple Developer Program** + a native dev build
   (Expo Go can't do native Apple/Google). NOT built — awaiting founder go-ahead on the cost.
2. **Coach → live LLM: DONE for founder-device testing** (behind `liveCoach`, see above). **HARD
   prerequisites before ANY real (non-founder) user** — none built yet, do not ship the live coach
   without them: (a) a **server-side key proxy** (never ship an `EXPO_PUBLIC_` provider key — it's
   extractable from the bundle); (b) the **bilingual crisis-detection SAFETY FLOOR** + a
   consent/disclaimer surface before free-text reaches the cloud (the first `triage` call is
   unredacted-for-content); (c) **engine-level** sensitive-domain containment (today the stop lives
   in `useLiveCoach`, not `CoachOrchestrator` — a future caller could bypass it; also add `body_image`);
   (d) **clinical review** gating Addiction/Relationships. `redactForCloud` currently strips only
   emails/phones (not names/health) — minimisation, not anonymisation.
3. **Device notifications on the physical phone** (founder's next target): `ReminderEngine` +
   `expo-notifications` are BUILT (local notifications) but need a permission-ask wired + a **dev
   build** (Expo Go notification limits on SDK 54). **The founder PURCHASED the Apple Developer
   Program on 2026-08-08** — account details pending (up to ~2026-08-10). NOTE clarified for him: an
   App-Store *review* is NOT needed to test notifications — a dev build (EAS Build / the membership he
   bought) installs on his device directly; store review is only for public release. **Prep offered
   (do while waiting):** bundle id (e.g. `com.guynoiman.pushapp`), `app.json` notifications + iOS
   permission strings, `eas.json`, the in-app permission ask, icon/splash. iOS Simulator can demo
   notifications for free first.

### Done this session (was open, now shipped — all committed + pushed to origin)
- **Live coach → Gemini: VERIFIED WORKING on the founder's device.** `EXPO_PUBLIC_GEMINI_API_KEY` was
  copied from the existing `GEMINI_API_KEY` into the git-ignored `.env.local` (value never exposed);
  after a Metro restart `liveCoach` is on and the real interview runs (personalised opening + Gemini
  classification + closed-option chips). The HARD prerequisites in item 2 above still gate any real
  user. To DISABLE: remove that line + restart Metro.
- **Adaptive report→replan loop wired to the UI** behind `adaptiveCoachDev` (`EXPO_PUBLIC_ADAPTIVE_COACH=1`
  is in `.env.local`) — `AppCore.reviewWeek` + "I adjusted your week" card + `/dev-adaptive` demo panel.
- **iPhone-Messages swipe** on Step rows (right = Done+confetti, left = Postpone / Let go).
- **In-app Light/Dark/System toggle** (Settings › Appearance, persisted) — VERIFIED.
- **Simulated Google sign-in** (name "Guy" + email in Settings, `EXPO_PUBLIC_SIM_USER_*`) — VERIFIED.
- **Coach entry route fix** — moved `coach.tsx` out of `(tabs)` to a root Stack route (an `href:null`
  tab route is not navigable via `router.push`).

### New founder DIRECTIONS to log/design (his ideas, this session — not yet built)
1. **Weekly-review model (APPROVED direction):** move the adaptive replan trigger OFF every user
   report and ONTO a **week close/open "Week Review"**: analyse the past week → build next week's plan
   → present it to the user → apply per last week's performance (automatic), while a user can still
   proactively edit a Journey (effective immediately). Cleaner two-layer split: tactical per-occurrence
   recovery + user edits (immediate) vs strategic weekly review. Small re-trigger change (replan already
   "reshapes the week") + a new Week-Review screen. Log in `06_Decisions/Decision_Log.md`.
2. **Peer-matching (Open Question — Future/Commercial, privacy-gated):** let a user connect with a
   STRANGER on the same journey / similar struggle (e.g. two people both on "approach people at
   parties"). Strong vision-fit (the people pillar / North Star) BUT privacy-heavy: opt-in per journey,
   pseudonymous (username, no PII), match on the COARSE goal tag only (raw disclosures stay on-device,
   G1), moderation/report/block, and EXTRA caution or exclusion for sensitive domains (addiction /
   mental-health / loneliness) until safety + clinical review. Needs the social backend + security-
   privacy + store-compliance before building. Log as a Future-Vision Open Question.

**▶ NEXT:** (a) prep the Apple **dev-build** infra so we can build the moment the account is active,
then wire the notification permission ask + demo on the iOS Simulator; (b) implement the **Week-Review**
model (move the replan trigger to week boundaries + a review screen); (c) log both new directions in
the Decision Log. The live-coach hard prerequisites (item 2) gate any non-founder use. Old snapshots
below are accurate ENGINEERING history but predate the 2026-08-07 redesign.

## ⭐ HANDOFF SNAPSHOT — 2026-08-06 (session end — supersedes the 2026-08-05 snapshot below as "most current")

**Status:** the AI-adaptive-coach pivot is deep in build. **DONE & GREEN** (449 jest tests across
41 suites, `tsc` clean, ALL of it behind the `adaptiveCoach` feature flag
(`app/src/core/config/featureFlags.ts`), which is **OFF in production**):
- **S0** — foundations: `EncryptedLocalRepository` + the privacy `deriveOutreachInsight` boundary.
- **S1** — the adaptive engine: `Planner`, `BehaviorModelEngine`, `AdaptivePlanner`
  (`replan`/`applyReplan`), proven by a 4-persona headless simulation.
- **S2** — the conversational coach.
- **SX** — four domain experts (realigned this session — see below).

### The coach model
A **META-AGENT** (voice **"Steady"**: professional, warm, accepting, non-judgmental, plan-oriented,
explicitly **NOT a therapist**) takes the user's free-text goal, makes **ONE "understanding" LLM
call** that detects **MULTIPLE goals** (each tagged with `kind: recurring | process` and a
`domain`), **reflects them back** to the user and **FOCUSES one** (the rest are deferred on-device,
not lost), then **routes to a DOMAIN EXPERT** — one of:
**Addiction · Relationships & Loneliness · Body Image (nutrition+fitness) · Career**
— whose **own interview** asks closed-option **chips + an "Other"** field, one question at a time
(some questions are multi-select), then runs a **feasibility/reality-check**, then produces a
**FREQUENCY-BASED weekly plan** ("≈N×/week, flexible days" — **no fixed calendar dates** unless the
user explicitly names specific days).
**Object model:** Dream → Journey → Milestone → Step (a Dream groups related Journeys).
**Philosophy: framework-not-content** — the coach is not a nutritionist, not a trainer, not a
matchmaker, not a therapist; it structures and adapts, it does not supply expert domain content.
**Communication styles:** 4 named styles exist in `app/src/core/coach/communicationStyles.ts` —
`steady` is fully populated (the only one used today); `direct` / `gentle` / `spark` are empty
stubs reserved for later personalization work.

### How to test the coach right now
```
npm --prefix app run coach                                          # interactive
COACH_SCRIPT=src/core/coach/sample.script.txt npm run coach          # scripted, from app/
```
Runs against **PAID Gemini** (the founder enabled billing, capped at **~$10/mo**; model
`gemini-2.5-flash`). API key lives in the **git-ignored** `app/.env.local` as `GEMINI_API_KEY`.
**Personal-POC caveat:** an on-device app build would need this key exposed as an
`EXPO_PUBLIC_…` var (client-bundled) — fine for the founder's own personal testing device, but
**not** how a real multi-user release would ship a secret key; revisit before any wider release.

### S3 auth — in progress
Single-user Supabase sign-in + UID verification is built (`app/src/core/auth/` —
`AuthGateway.ts`, `SupabaseAuthGateway.ts`, `authUser.ts`, `singleUser.ts`). **To activate:** the
founder must (1) set a password on the Supabase user `guynoiman3@gmail.com`
(UID `d87033dc-254d-4b95-92ba-10c8ba62a87f`), and (2) add
`EXPO_PUBLIC_SINGLE_USER_EMAIL` / `EXPO_PUBLIC_SINGLE_USER_PASSWORD` / `EXPO_PUBLIC_SINGLE_USER_UID`
to `app/.env.local`. The Supabase project itself is live.

### Design/UX decisions (this session)
Full comprehensive brief: **`04_Product/UX/App_and_Screens_Design_Brief.md`** — the founder is
getting a **second, external-AI design proposal** before we wire any screens; treat the brief as
the current direction, not yet final. Colleague-facing companion doc:
**`04_Product/Domain_Expert_Authoring_Guide.md`** (how a non-engineer teammate authors a new
domain expert's interview + knowledge). Headline decisions:
- **Reuse the EXISTING app design** (minimal visual change) rather than a redesign.
- **REMOVE the avatar/Buddy tab and the Shop tab.**
- **Home priority order:** weekly tasks (including an **URGENT / "today's-focus"** block) → a
  central, inviting **Coach CTA** → **Friends** (3 who need help + 3 who deserve encouragement) →
  **My Journeys**.
- **Streak** = a prominent day-count; **breaks only if an URGENT task is missed** (not any miss).
- **Levels are KEPT**, but reframed to reward **BREADTH** — running multiple parallel Journeys, up
  to a cap — rather than depth/grind in one Journey.
- **Urgent** is computed, not authored: a task becomes urgent when
  `remaining-days-in-week == remaining-required-sessions` (i.e., the user is out of slack this
  week).
- **Dream = coach-suggested, user-approved.** The coach SUGGESTS linking related Journeys into a
  Dream; the user must APPROVE the link. "My Journeys" is grouped by Dream once approved.
- **Journey editing is primarily conversational** — through the coach — plus a simple
  **Freeze/Resume** button for pausing a Journey without deleting it.
- **Step reporting is small and emotional/visual**, not a form: happy-face **Done** / sad-face
  **Couldn't** / **Partial** / **Postpone**.
- **The entire coach conversation runs fully on the phone** (not a web/desktop-only surface).
- **People/support layer is first-class in the brief** — Ally, Support Circle, reciprocal friends,
  and goal/Dream Communities are all specified there, not deferred as an afterthought.

### Next steps, in order
1. Founder returns with the **second design proposal** → team decides direction → wire the coach
   conversation fully on-phone + rebuild Home + My Journeys on the (mostly) existing design,
   removing the avatar/Buddy and Shop tabs.
2. Wire the **report → adaptive-edit loop** to a real, built Journey so a user visibly sees the
   plan respond to a miss/report, not just in the headless simulation.
3. Finish **S3** (auth/backend activation per above), then **S4** (social / Ally / Support Circle /
   Communities) + the Dream-linking (coach-suggests/user-approves) flow.
4. **S6** hardening/compliance, then **S7** launch.

### Open follow-ups (still pending — explicit next tasks, not silent gaps)
- Reconcile the `Phase` → `Milestone` rename across the remaining docs/code that still say "Phase"
  (deliberately deferred at pivot time, D23; still not done).
- Harden device crypto: move to authenticated encryption + a secure RNG.
- A completed-Journey should not derive `atRisk` in the behavior model (nit, not yet fixed).
- Wire `redactForCloud` on the outbound LLM path before any real user's disclosures could reach it.
- **The SAFETY FLOOR is not yet built:** bilingual (Hebrew/English) inbound crisis-detection +
  escalation, disclaimers/consent, and hardening `SafetyLayer` + substance-use gating. Per this
  session's decisions, the two most sensitive domains — **Addiction** and
  **Relationships & Loneliness** — must stay **flag/dev-only** until the safety floor lands **and**
  a clinical review has happened. Do not let these reach a real user before then.

### Working method
One status-tracked task list (stages **S0–S7 + follow-ups**) lives in the harness Task tool for
this build and does **NOT** persist to the repo automatically — **this Current_Context snapshot is
the durable record.** A resuming session should rebuild its working task list from this snapshot
(cross-reference `06_Decisions/Decision_Log.md` **D23** and the `pushapp-*` memory index entries,
especially `pushapp-ai-coach-pivot`, `pushapp-working-method`, and `buddy-3d-pipeline`).

### Key files/dirs
- `app/src/core/learning/` — the adaptive engine (`Planner`, `AdaptivePlanner`,
  `BehaviorModelEngine`, `DomainExpert.ts`) + `app/src/core/learning/experts/` (the 4 domain
  experts + `registry.ts` + `expertKit.ts`).
- `app/src/core/coach/` — `CoachOrchestrator.ts`, `coachPrompts.ts`, `communicationStyles.ts`,
  `interviewPlaybook.ts`, `goalSpecToJourney.ts`, `devHarness.ts`, `SafetyLayer.ts`,
  `disclosureParser.ts`.
- `app/src/core/insights/` — the derived-insight / `deriveOutreachInsight` boundary.
- `app/src/core/persistence/EncryptedLocalRepository.ts`.
- `app/src/core/auth/` — single-user Supabase auth (S3).
- `04_Product/UX/App_and_Screens_Design_Brief.md`, `04_Product/Domain_Expert_Authoring_Guide.md`,
  `04_Product/Strategy_WIP_2026-07/*` (still open-question strategy material, unchanged this
  session).

**▶ NEXT:** see "Next steps, in order" above — item (1) (founder's second design proposal) is the
current blocker before screen-wiring can start.

---

## ⭐ HANDOFF SNAPSHOT — 2026-08-05 (PIVOT BUILD: S0–S2 done, SX in progress — superseded above by the 2026-08-06 snapshot; kept as accurate history)
**Everything below lives on branch `feat/buddy-3d-and-reminders` (not yet merged to `main`), and is
built entirely behind the off-by-default `adaptiveCoach` feature flag
(`app/src/core/config/featureFlags.ts`) — the existing engine (Journey/Reward/Buddy/Shop/Mission/
Reminder/Auth/Social/Entitlement) is untouched when the flag is off.** Follows the founder's working
method — one status-tracked S0–S7 task list, sequential, build-each-component-then-integrate (full
method: `04_Product/Build_Plan_and_Method.md`). **Cross-reference: `06_Decisions/Decision_Log.md`
D23** (the pivot decision this whole build implements) and `11_Engineering_Bible/
Engineering_Decisions.md` **§E5** (the hub-and-loop architecture).

- **S0 — done.** Foundation docs-only groundwork: the pivot recorded (D23); **Milestone** adopted as
  the canonical mid-layer term; the **hub-and-loop architecture** designed (§E5) +
  `Build_Plan_and_Method.md` written; an **encrypted local store** (AES + `expo-secure-store`, with
  migration + key rotation); privacy types plus the **`deriveOutreachInsight` boundary** (raw
  disclosures never leave the device; only a derived, enum/bucket insight may cross it) + guard tests
  + a `NullInsightGateway`.
- **S1 — done, PROVEN.** The adaptive engine itself: **Planner** (goal → Journey), a **DomainExpert**
  seam + `GeneralExpert` (the domain-agnostic default), **BehaviorModelEngine** (on-device raw
  behavior log + a slip detector — the first producer of `StepMissed`), **AdaptivePlanner**
  (`replan` + `applyReplan`), a **CoachNarrator** seam, and — the proof point — a **headless
  simulation running 4 personas** that demonstrates the closed loop actually adapts:
  compress/shrink/shed/at-risk responses, weekend-concentration detection, and early-warning
  behavior. Wired into `AppCore` behind the flag.
- **S2 — done, testable.** The conversational coach: a **Gemini client** behind an `LlmClient` seam
  (`gemini-2.5-flash`, API key in a git-ignored env file — no cost risk taken silently), an editable
  **interview playbook** + coach prompts, a **Coach Orchestrator** (the playbook controls *what* to
  ask; the LLM handles phrasing/parsing, not decision logic), a hardened disclosure parser, a
  **SafetyLayer**, `GoalSpec` → Journey conversion, and an interactive dev harness
  (`npm --prefix app run coach`) to converse → build → report/non-report → adapt, live, from the
  terminal.
- **SX — in progress.** Four first-cut `DomainExpert`s (recovery, self-confidence, nutrition, sport)
  + a registry, built to validate the expert-partition seam from S1. Per-domain knowledge bases and a
  safety/clinical review are the next phase before any of these could be real — SX is explicitly
  **not** part of the S0–S7 spine (Future Vision add-ons per D23; see `Build_Plan_and_Method.md`).
- **Test suite:** grew from 177 → 338 tests, all green; `tsc` clean throughout.
- **Open follow-ups logged (each an explicit next task, not a silent gap — per the working method's
  rule 3):** wire outbound redaction before real users touch this; harden device crypto (move to
  authenticated encryption + a secure RNG); a completed-Journey `atRisk` nit in the behavior model;
  reconcile the `Phase`→`Milestone` rename across remaining docs/code (D23 flagged this as
  deliberately deferred, not forgotten); a safety/clinical review gating the sensitive SX domains
  before they get real knowledge bases.

**▶ NEXT:** continue the SX per-domain knowledge-base + safety-review track, or resume the S0–S7
spine — founder's call. Read `04_Product/Build_Plan_and_Method.md` for the full stage table and
status method before picking either up.

## 🔀 PRODUCT PIVOT — 2026-08-01 (read this before the snapshots below)
**PushApp is repositioning from a gamified-companion app to an AI adaptive coach.** Full record:
`06_Decisions/Decision_Log.md` **D23**. Mission is **unchanged** ("become who you choose to be" —
`09_Product_Philosophy/Product_Philosophy.md`); only the *mechanism* changes. Key points: continue
the **same repo/codebase** (evolution, not a rewrite — the engine architecture already fits);
**mature progression, not childish gamification** (points/levels/Missions kept; Buddy stays but
**evolves per level** instead of dress-up cosmetics); the moat is the **closed feedback loop**
(behavior → insight → re-plan → nudge → behavior), not any single AI feature; a **domain-agnostic**
engine with **general habits/goals** as the current build target (sharp-vs-general positioning is
an **Open Question**, deliberately deferred); domain-expert modules (sports, certs, nutrition, …)
are **Future Vision**, added later; privacy = **local-first split** (raw disclosures on-device
only, a minimal derived insight model may sync for outreach timing).

**Everything below this notice (all HANDOFF SNAPSHOTS, engineering state, open founder decisions)
remains accurate as engineering/process history** — the code, branches, and mechanics described did
happen and mostly still stand. What's superseded is the *positioning framing* they inherited from
the old gamified-companion direction (see superseded-notes added 2026-08-03 to
`09_Product_Philosophy/Product_Philosophy.md`, `04_Product/Product_Bible.md` §21.5/§15.1, and
`00_Foundation/Information_Architecture.md`). **Terminology, the engineering/architecture docs, and
the working-method are NOT yet updated for the pivot** — that is a separate follow-up task (S0.2).

## ⭐ HANDOFF SNAPSHOT — 2026-07-20 (STRATEGY THINKING + MERGE-TO-MAIN + HOPPER IN BUDDY TAB — read this first)

**Two kinds of work this session: (a) code that shipped and merged, (b) a strategy conversation that
is explicitly still in progress.**

**(a) Code — done, committed, and `main` fast-forwarded to it** (six topic commits + a merge; the
panel-position fix from an earlier branch is now on `main` as well):
- **3D Hopper wired into the Buddy tab** — `BuddyScene` renders `<BuddyView transparent>`; added an
  additive `transparent` prop to the registry-driven renderer (opaque default preserved for the
  spike). **Verified on device** (iPhone/Expo Go — EXGL logs + founder confirmation). Web can't
  verify (GLB loader is native-only). Home still uses the 2D avatar, by request.
- **`fix(social)` backend health probe** — `app/src/core/social/backendHealth.ts` probes
  `/auth/v1/health` once at startup; on failure (or 5xx) calls `stopAutoRefresh()` and degrades the
  social/auth pillars quietly instead of the red "Network request failed" banner. Root cause was a
  **deleted Free-tier Supabase project** (DNS NXDOMAIN); the founder later restored it. A 4xx counts
  as healthy, a 5xx does not (learned from a Cloudflare 521 during restore).
- **`chore(dev)` dev tooling** — `npm run dev` pins Metro to the Mac's Bonjour hostname
  (`exp://<LocalHostName>.local:8081`) so the Expo Go "Recently opened" entry survives DHCP IP
  changes (the recurring `Network request failed` on device). Plus `tools/supabase_keepalive.sh` +
  `tools/install_keepalive.sh` + a launchd plist: a weekly $0 keep-alive so the Free-tier Supabase
  project never idles out again. (Keep-alive installs a copy under `~/Library/Application Support`
  because macOS TCC blocks launchd from reading/executing under `~/Documents`.)
- **`docs(research)` competitive research v2** — `05_Research/PushApp_Competitive_Research_v2_2026-07`
  (.docx + .pdf): 15 competitors, official App-Store screenshots, per-competitor AI-implementation
  tables, the original 8 comparison tables carried over, a "what died and why" chapter, NLP evidence
  + claim-risk section. Hebrew RTL.
- **`feat(ui)` resource-bar polish** + **`assets(buddy)` Hopper v3** (founder's ingest output).

**(b) Strategy — STILL THINKING, nothing approved.** Captured in
**`04_Product/Strategy_WIP_2026-07/`** (README.md + three standalone HTML visuals for a future
deck). Headlines, all **Open Questions**:
- **Finch is the real benchmark** and is dangerously close at the feature layer; the defensible trio
  is creator-marketplace-as-network + no-punishment real-life accountability + long-horizon
  transformation. Finch has **no marketplace** and **won't** add real-life verification.
- **"Ignition, not Maintenance"** — candidate reframe: serve the *stuck / pre-contemplation* user
  (avoidance → first action), the stage every incumbent ignores. Upstream of the current mission.
- **AI is cheap if architected right** (Haiku + prompt caching ≈ ¢/conversation; Level-1-first,
  behind paid tier, safety guardrails; you do NOT train a model — it's prompt + content + Wysa-style
  scripting).
- **Miss-recovery flow** (founder's design): closed list → closed list → AI only at "Other", which
  does empathy **+** structured classification; most reason→lever decisions are **rules, not AI**.
- **Categories: founder chose Option B** (dedicated palette). Build `src/core/config/categories.ts`
  + optional `Journey.categoryId`. Not yet built.

▶ **Resume from `04_Product/Strategy_WIP_2026-07/README.md` §7 (Open Questions).**

## ⭐ HANDOFF SNAPSHOT — 2026-07-14 (BUDDY 3D REGISTRY + REMINDERS/SCHEDULER + UI POLISH — read this first)
**Everything in this snapshot lives on branch `feat/buddy-3d-and-reminders`, NOT yet merged to
`main`.** Five commits this session: `943c732`, `ec69977`, `69d8616`, `d9e5866`, `75f0a36`.

**3D Buddy / creatures — from spike to a real registry-driven module:**
- Adopted the founder's **PUSh Creature SDK v1.0** (`app/assets/buddies/_sdk/` — README, docs,
  shared assets, templates, validation). Built `app/tools/ingest_creature.py`: a **hybrid** ingest
  pipeline that accepts either an embedded-GLB package or an external-`materials.json` package and
  produces small **modular per-species packages** plus a generated registry
  (`app/src/core/buddies/registry.generated.ts`). `app/src/components/buddy3d/BuddyView.tsx` remains
  the **only** place `three`/`expo-gl` may be imported (per the eslint-enforced boundary from the
  2026-07-13 spike). The `/buddy3d-spike` route now flips through species for visual QA.
- **17 species ingested** (`app/assets/buddies/<species>/`, ~1–2.4MB each — boulder, chroma, dozer,
  dragon, glow, heart, hoarder, hopper, horse, jumper, magnet, mist, nimbus, shell, shy, storm,
  thorn), replacing the old throwaway `hopper_v1`/`hopper_v2` spike assets (kept on disk for
  provenance, no longer wired).
- **RN texture-render fix (commit `d9e5866`):** external (non-embedded) textures were rendering
  blank on-device — root cause: **r3f-native's `TextureLoader` uploads no pixels on RN/expo-gl**.
  Fixed by a **pure-JS PNG decode → `THREE.DataTexture`** path (using `upng-js`), bypassing the
  loader entirely. `BuddyView` now applies `map`/`normalMap`/`emissiveMap` this way. Ingested the
  **detailed v3 Hopper** (painted albedo + normal maps + a glowing face) using this pipeline.
  **This still NEEDS on-device confirmation** (paint accuracy, `flipY`, texture tuning) — not yet
  verified live like v2 was. Hopper's geometry is still **21.6MB** (unoptimized) — a **low-poly
  regen has been requested from the founder**; spec update lives in
  `app/assets/buddies/_sdk/docs/EXPORT_SPEC_v3_detailed.md`.
- **Still pending / not done this session:** wiring `BuddyView` into the actual Buddy tab behind
  `featureFlags.buddy3d` (the tab still shows the 2D SVG egg/`BuddyAvatar` — D18's interim Ember);
  closing the fidelity gap vs. the founder's reference sheet; the shared face-expression system (8
  expressions are captured in the assets but not yet driven by app state/events).

**Reminders / Journey model — object-model decision + new engine + scheduler:**
- **Journey model confirmed with the founder:** a Journey holds a **FINITE set of Steps**, each
  completed **once** (triggers a per-Step celebration via a `StepCheckedIn` event), and the Journey
  **completes when its LAST Step is done**. This is the model now implemented (commit `ec69977`).
  Recurring "weekly copies" of Steps (via the Weekly-Planning flow, D12/Bible §34.7) are explicitly
  a **LATER task** — not dropped, just sequenced after the finite-Step model lands solid.
- **Reminder engine core** (commit `ec69977`): `ReminderRule` + `ReminderEngine.scheduleRule`, plus
  `NullLocationGateway`/`NullCalendarGateway` (vendor-isolated, behind feature flags, dormant —
  consistent with the reserved-seam pattern from E4/`Module_Architecture.md`).
- **Communication Scheduler** (commit `75f0a36`, `app/src/core/engines/CommunicationScheduler.ts`):
  aggregates all active-Journey reminders into one schedule and applies `SchedulingPrefs`
  (`preferredDays` as a **hard filter**; an allowed time-window with morning/evening clamping);
  enforces the **iOS 64-local-notification cap** (`app/src/core/config/schedulerLimits.ts`) and
  emits a `SchedulerCapped` event when reminders had to be dropped to stay under it, rather than
  silently over-scheduling or crashing.
- **Calendar/location integration is seams-only** (Null gateways, on-device-only design, background
  geofencing explicitly **deferred**) — this is a **new privacy red-line, logged as R3** (see
  `06_Decisions/Decision_Log.md` D21) to avoid colliding with the existing R1/R2 auth-session
  red-lines already defined in `11_Engineering_Bible/Auth_Backend_Proposal.md`.
- **Onboarding is now framed as a MISSION-based flow**: create a Journey / open the Shop / enable
  notifications / take a personality quiz → each grants XP → the egg hatches once enough XP is
  earned. The personality quiz **must pass a security-privacy review before it stores anything**
  — it targets the already-reserved `ProfileGateway` seam from E4 (`app/src/core/profile/`), so no
  new PII surface should be opened without that review.

**UI polish pass (commit `69d8616`):**
- Home: the dynamic bottom sheet now has a bounded height so it no longer covers the Buddy; more
  compact tab bar; the internal list now scrolls independently.
- "My Journeys" area tile added (Missions tile moved right to make room); shows a done/total count;
  each Step row gained a **⋯ menu** and a **Reschedule modal**.
- Resource bar: coin display is now a coin-stack, a GT shield icon was added, level+XP unified into
  one frame.
- A completed Step now **stays visible** in its list (rendered green, no more "DONE" watermark
  covering it) and triggers a check-in celebration.
- Buddy tab: inventory panel reflushed; Buddy name/stage now render below the meter (not overlapping).
- "My Journeys" screen is now tabbed; Explore gained search + a clear button; the journey-creation
  wizard now uses `KeyboardAvoidingView`; the Missions modal background is transparent (matches the
  floating-modal pattern used elsewhere).

**Open founder decisions (▶ NEXT):**
1. Founder to approve the UI designs **on-device** (this session's polish pass hasn't been
   device-verified yet, unlike prior fidelity passes).
2. Two design-reference artifacts await founder review: the primary-CTA "quests" reference, and the
   4-area-tile reference (a redesign-proposal artifact exists but is not yet an approved direction).
3. Decide whether onboarding is **mandatory or skippable**.
4. Get the **low-poly Hopper v3 regen** from the founder (current geometry too heavy at 21.6MB ×
   17 species).
5. Once the above land: wire the validated 3D renderer into the actual Buddy tab behind
   `featureFlags.buddy3d`.

**Also logged this session:** `06_Decisions/Decision_Log.md` D20 (notification-permission ask
folded into onboarding), D21 (notification/communication-management mechanism + optional opt-in
location/calendar reminder rules, background geofencing deferred, privacy red-line R3), D22 (keep
the "Phase" display name — no rename).

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-13 (3D BUDDY RENDERING — read this first)
**Real-time 3D Buddy rendering is VALIDATED on the founder's iPhone.** The founder is producing
detailed **3D character GLBs** (roster "PUSh Characters v1.0": 13 core + 6 reward species, each with
3 mastery levels + a unified robot-screen face, 8 expressions). Decision (2026-07-13): **real-time 3D**
(not 2D), stack = **expo-gl + three@0.180 + @react-three/fiber@9 (native)**, **SDK 54, runs in Expo Go
(no dev build)**, procedural animation (GLBs aren't rigged). Species model = **Both** (species that also
evolves through mastery). This SUPERSEDES the interim-SVG-Buddy plan (D18/Ember) and the earlier 2D
BuddyAvatar for the Buddy tab (2D avatar stays elsewhere).

**🔑 THE handoff doc: `11_Engineering_Bible/Buddy_3D_Spike_Findings.md` — READ IT FIRST for 3D work.**
It captures every hard-won expo-gl/RN gotcha (they each caused a failure): navigator.userAgent shim
(imported first), NO `gl.setSize`/setPixelRatio (corner bug), NO shadows/PMREM-IBL/EffectComposer-bloom
(render targets break on expo-gl), recompute missing vertex normals (else pure black), **EMBEDDED glTF
textures DON'T decode on RN → load SEPARATE textures via `TextureLoader().loadAsync(require('...png'))`
passing the MODULE not a URI**, normalize model + fixed camera, Y-up. Do NOT re-learn these.

- **Working reference (committed, `087e870`):** `app/src/app/buddy3d-spike.tsx` (+ `.polyfills.ts`,
  `app/metro.config.js`) — throwaway route `/buddy3d-spike`, NOT wired into tabs; renders the detailed
  textured **Hopper v2** GLB at **60 FPS** with the real face. This is the blueprint for the real module.
- **Assets:** `app/assets/buddies/hopper_v1/` (procedural placeholder, superseded) and
  `app/assets/buddies/hopper_v2/` (detailed textured, renders — commit `5e1622b`). **🚨 v2 is ~40MB
  (21MB embedded GLB + 4.5MB baseColor PNGs) — NOT viable × 19 chars (~760MB).** Backup: the founder's
  `~/Downloads/PUSh_Hopper_v2_Runtime_Package.zip`.
- **▶ NEXT (3D):** (1) get a **compressed v3 Hopper** — hand the founder the spec update: **separate +
  compressed textures (KTX2/Basis or ≤1K), NOT embedded** (fixes size AND the RN decode issue); keep the
  rest of the v2 spec. (2) Promote the spike → the real module: `app/src/core/buddies/` (species registry
  from JSON contracts, generic; cosmetics registry split from characters; expressions; animation policy;
  mastery mapping) + `app/src/components/buddy3d/` (ONLY place `three` may import — eslint-enforce), a
  `BuddyRenderer` interface, behind `featureFlags.buddy3d`, Buddy-tab-only (one GL context, dispose on
  unmount), 2D `BuddyAvatar` elsewhere. (3) Real SVG face + 8 expressions on `face_screen` (bus-driven).
  (4) Wearables at `anchors.json`, mastery from `mastery.json`, procedural idle+teleport-jump animations.
  (5) Then all 19 characters. See `Buddy_3D_Spike_Findings.md` §NEXT.
- **Also committed this session (design + backend, all on `main`):** full v14 fidelity pass + 5 older
  screens; Home reworked to spec (frozen top + draggable panel + swipe-to-report); auth foundation P1-P2
  (E3/D19); account-tier/entitlement mechanism; modularity seams + `Module_Architecture.md` (E4).
- **Still open (founder-owned):** ~$99/yr Apple account for P3 native sign-in; deferred data wirings
  (user name, Grace Tokens, Consistency screen, per-weekday scheduling); the pending small bug batch
  (Explore search/keyboard, Explore Journey tap, Buddy locked-tab tooltip, Inbox compose).

## ⭐ HANDOFF SNAPSHOT — 2026-07-12 (module architecture doc + reserved seams)
**An architecture audit confirmed PushApp is modularity-adherent** (framework-free engines over
an event bus, vendor-isolated `*Gateway` boundaries with `Null*` fallbacks, config-before-code,
offline-first Repository, no business logic in UI). New canonical doc:
**`11_Engineering_Bible/Module_Architecture.md`** — the full module map (Journey · Reward · Buddy
· Shop · Mission · Reminder · Auth · Social · Entitlement, all BUILT) plus four FUTURE domains
now given **reserved seams** (boundary only, no feature logic, per CLAUDE.md §3 "vision never
shrinks"): User-Model/Profiling, Intervention/Communication, Interests (each a `*Gateway` +
`Null*` + off feature flag), and a fourth, Close-Circle-deeper, listed but with no seam yet.
Landed in commit `746c685` — also 4 small behavior-preserving tidy-ups (progress-math selector
moved into `JourneyEngine`, Shop catalog access centralized in `AppCore`, `EntitlementEngine`
construction moved into `AppCore`). `tsc` 0, jest 87/87, eslint clean, zero user-visible change.
Decision record: `Engineering_Decisions.md` §E4. **Before any of the three reserved domains gets
real logic, it must go through security-privacy (RLS + data-minimization) and, if it changes data
collection, store-compliance (App Privacy label) — per CLAUDE.md §5.**

**Open items carried forward, unchanged by this session:**
- **Buddy art direction** — still unresolved (founder rejected the 4 creature concepts; interim
  Ember stands in per D18).
- **Buddy inventory interior** depth question — awaiting founder's call.
- **P3+ native auth (paid)** — awaiting founder go-ahead on the ~$99/yr Apple Developer Program
  (see the 2026-07-10 snapshot below for full detail).
- **Deferred data-model wiring** (Grace Tokens, Consistency screen, weekday scheduling,
  profile/name, Social gift/message, Shop real-money data model, inventory categories) — unchanged.

**▶ NEXT (resume here):** (1) pick up the still-open founder decisions above (Buddy art
direction; Buddy inventory interior; the ~$99/yr Apple Developer Program approval for P3+ native
auth); (2) the deferred data-model items can be wired as their owning pillars land; (3) once
several land, re-run `Design_Fidelity_Audit.md`. `Module_Architecture.md` itself needs no further
work until a reserved domain is actually scheduled for implementation.

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-10, later this day (auth foundation P1–P2 landed)
**Real-accounts auth work started.** `11_Engineering_Bible/Auth_Backend_Proposal.md` (a four-specialist
synthesis: architect · security-privacy · store-compliance · cost-guardian) was approved-in-principle
by the founder, then the free half of it was built and committed.

**Founder decisions (D19, `06_Decisions/Decision_Log.md`):**
1. **Auth method = Sign in with Apple + Google**, passwordless (no email/password, no SMTP).
2. **Do NOT collect the user's real name** — identity stays handle + Buddy; email is quarantined in
   Supabase's `auth.users`, never written to `public.*`.
3. **Build the free foundation (P1–P2) first**, at $0 with zero user-visible behavior change. The
   ~$99/yr Apple Developer Program + native Apple/Google + dev build (P3+) is a **later, separately-
   approved step** (CLAUDE.md §3.10) — the only unavoidable cost; everything else stays $0 at MVP scale.

**Landed (commit `2af2468`):** a vendor-isolated `AuthGateway` (`app/src/core/auth/`: interface +
`AuthUser` + `NullAuthGateway` + `SupabaseAuthGateway` + factory + pure `toAuthUser`), a new
`AuthProvider` that now owns anonymous session bootstrap (moved out of `SocialProvider`, which reacts
to the auth uid instead), `featureFlags.auth`, and **R2 hardening**: Supabase session storage moved
from plaintext AsyncStorage to `expo-secure-store` on native (byte-safe UTF-8 chunking + generation-
based atomic writes; web keeps AsyncStorage). **Zero user-visible change — app still boots anonymous.**
Apple/Google methods are declared but throw `AuthNotAvailableError` until the native P3+ dev build.
`tsc` 0, jest 55/55, code-reviewed (findings fixed: a cheers realtime bind race, byte-vs-char
chunking, non-atomic writes). Full decision record: `Engineering_Decisions.md` §E3.

**Open items / decisions the founder still owns (carried, unchanged from the prior snapshot below):**
- **Buddy art direction** — still unresolved (founder rejected the 4 creature concepts).
- **Buddy inventory interior** depth question — awaiting his call.
- **Deferred data-model wiring** — Grace Tokens not in `AppState`, no Consistency screen/route, no
  per-weekday Step scheduling, no user profile/name, Friends Gift/Message have no `SocialGateway`
  methods, Shop real-money data model, inventory Items/Location/Furniture categories. (Unchanged by
  today's auth work — auth deliberately does not touch these.)
- **New: P3+ native auth (paid)** — awaiting founder go-ahead on the ~$99/yr Apple Developer Program
  before Apple/Google sign-in can actually be tapped by a user, and before a dev build replaces the
  Expo Go loop for auth testing. See `Auth_Backend_Proposal.md` §8 for the full phase list (P3–P7).

**▶ NEXT (resume here):** (1) founder decides whether/when to approve the ~$99/yr Apple Developer
Program to unblock P3 (native dev build stand-up) → P4 (Apple sign-in) → P5 (Google sign-in) → P6
(hardening) → P7 (account deletion + privacy policy + store compliance); (2) meanwhile, the design/
data-model open items below are independent and can proceed in parallel — resolve Buddy art direction,
decide Buddy inventory interior, wire deferred data-model items as their pillars land; (3) once several
land, re-run `Design_Fidelity_Audit.md`.

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-10, earlier this day (v14 design-fidelity pass)
**The v14 mockup-fidelity build is DONE.** Building on the prior 2026-07-10 snapshot below (5-tab nav +
Explore/Inbox/Journeys cluster shipped), this session did the **fidelity pass** the prior snapshot's
"▶ NEXT" called for — ten commits, all on `main`, `tsc` clean throughout:

1. `dbb3e55` **Weekly planning** screen (new `/weekly-planning` modal, mockup screen-18) — the one
   remaining screen from the v14 set that had no route yet.
2. `ab74e5f` **Home rebuild** + two new shared primitives: `ResourceBar` (floating level+XP / GT / coins
   strip) and `GlossyTile` (3D squircle button). Home is now ResourceBar + "Hello" speech bubble +
   centered Buddy flanked by 4 GlossyTile area buttons + a cream Week's-steps panel. `StepCard` upgraded
   (icon tile, Journey·Phase line, progress bar, states). `journeyGlyph()` shared via `journeyView.ts`.
   (mockup screen-01)
3. `2f811f5` **Buddy rebuild**: ResourceBar + `BuddyScene` (Customize/Shop GlossyTiles) + new
   `BuddyInventory` (5 category tabs, item grid, Select). (screen-10)
4. `f61288c` **5-icon bottom nav** (Ionicons, per-tab active accents, Inbox unread dot) in
   `app-tabs.tsx` / `app-tabs.web.tsx`; fixed a web-harness bug where the tab strip overlaid the top
   ~140px of every screen. Documented in `Screen_Bible.md`.
5. `6638569` Added eslint + `eslint-config-expo` dev tooling (+ `eslint.config.js`).
6. `4533ee0` **Buddy refinement** per founder feedback: scene now full-bleed edge-to-edge with
   ResourceBar floating over it; inventory is one unified framed sheet (grabber, rounded top, hairline +
   upward shadow).
7. `a5df8b4` **Shop fidelity** (structured header, glossy coin pill, Featured/Cosmetics/Coins/Offers
   sub-tabs, glossy item cards with price chips). (screen-11)
8. `6373bac` **Friends fidelity** (new `FriendRow` + `FriendActionMenu`; Needs-your-cheer + A-Z
   Your-friends; Cheer CTA; 3-dot menu). (screen-09 — closes the fidelity gap already logged as
   "FIXED 2026-07-10" in `Design_Fidelity_Audit.md` §09.)
9. `a91038e` **Missions + Login fidelity** (floating modal, gold-underline tabs, Daily/Weekly pill
   switch, three mission states, 7-day login rail). (screen-16/17)
10. `90a3591` **Journey-creation wizard fidelity** (Name/description, duration/rhythm with fixed
    tooltip, Plan-the-steps, Your-why). (screens 05-08)

All screens were screenshot-verified against their mockups (~440-480px web width). **The full v14
screen set now has a first-pass native implementation** — this closes the "fidelity pass" item that
was the top of the prior snapshot's NEXT list. `Design_Fidelity_Audit.md` (2026-07-09) is now
**partially superseded**: it was written before this pass and still describes the *pre-fidelity* flat/
gray state for most screens (only §09 Friends was marked fixed at the time). It has not been re-run
post-fixes — treat its per-screen P0/P1 tables as historical unless a screen is reconfirmed broken.

**Open items / decisions the founder still owns:**
- **Buddy art direction** — still unresolved; founder rejected the 4 creature concepts (`07_Assets/Buddy_Creature_Concepts.html`); needs a new direction before final Buddy art.
- **Buddy inventory interior** — open question posed to the founder: go deeper on inventory tiles/states/labels, or leave the current framing. Awaiting his call.
- **Deferred data-model wiring** (screens use documented placeholders/TODOs until these land): Grace
  Tokens not in `AppState` (Home/ResourceBar shows a placeholder); no Consistency screen/route (Home
  button is a no-op TODO); no per-weekday Step scheduling (Weekly planning groups via a placeholder
  hash); no user profile/name (Home greeting falls back to "friend"); Friends Gift/Message have no
  `SocialGateway` methods (disabled placeholders — same known gap the audit already noted for §09);
  Shop real-money packs / daily rotation / purchase caps have no data model (Featured/Coins/Offers tabs
  show honest "coming soon"); inventory Items/Location/Furniture categories have no data model (locked
  tiles).

**Operational notes:**
- Known harness artifact: headless-Chrome web screenshots clip the right edge below ~440px on ALL
  screens (native RN renders correctly on device); verify web at ≥440-460px.
- The Expo dev server crashed several times under 4 concurrent verification agents hammering it (port
  churn from repeated restarts); code was unaffected. If running many agents that screenshot, expect to
  restart `npx expo start` and consider serializing screenshot-heavy verification.

**▶ NEXT (resume here):** (1) restart the dev server + hand the founder a fresh QR, and have him review
the fidelity pass on-device; (2) resolve the **Buddy art direction** with the founder (blocks final Buddy
art everywhere); (3) decide the **Buddy inventory interior** open question; (4) wire the deferred
data-model items above as their owning pillars land (Grace Tokens, Consistency screen, weekday
scheduling, profile/name, Social gift/message, Shop real-money data model, inventory categories); (5) once
several of the above land, re-run a `Design_Fidelity_Audit.md` pass to confirm no regressions and retire
its now-stale per-screen tables.

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-10, earliest this day (5-tab nav + Journeys cluster)
**The app RUNS on the founder's iPhone (Expo Go), and we're mid-way through building the full v14
mockup design.** POC is code-complete (5 pillars, on `main`, GitHub `GuyNoiman/PushApp`). Now doing a
screen-by-screen design build to match the mockups.

**📱 Runs on device — Expo SDK 54.** The founder's Expo Go supports **exactly SDK 54** (confirmed
on-device: Settings→App Info→Supported SDK 54). App was downgraded 57→56→54 to match. **To run:**
`cd app && npx expo start` (server on LAN **192.168.0.123:8081**); the founder scans a QR with the
iPhone **Camera** app (Expo Go's "manual URL" is gone in his version) → "Open in Expo Go". Make a QR:
`node -e "require('qrcode').toFile('/tmp/q.png','exp://192.168.0.123:8081',{width:640,margin:3},()=>{})"`
then `open /tmp/q.png`. Web build also works (`web.output:"single"`) — screenshot routes via headless
Chrome at `http://localhost:8081/<route>` to visually verify.

**🎨 FULL-DESIGN BUILD — progress (all verified tsc-clean + web-screenshot vs mockup, committed per chunk):**
- ✅ **Foundation** — Baloo 2 + Inter fonts loaded; **glossy SVG Buddy** (`BuddyAvatar`, stage-aware,
  egg for L1 → hatches with level); **5-tab nav** (Home · Explore · Friends · Buddy · Inbox). Friends
  moved from modal → tab; Explore/Inbox were stubs.
- ✅ **Explore** tab (discovery carousels — For you / Top creators / From brands; sample content).
- ✅ **Inbox** tab (IG-style list wired to real friend-requests + cheers via `useSocial`).
- ✅ **Journeys cluster** — `journeys.tsx` (list, real journeys), `journey/[id].tsx` (detail),
  `achievements.tsx` (+ detail sheet; sample achievement data). Home has a "Journeys" entry. *(Committed
  with this handoff.)*
- ⏭️ **NOT DONE:** **Weekly planning** screen (mockup screen-18); and the **fidelity pass** on existing
  screens (Home, Buddy scene, Shop, Friends, Missions/Login modals, Journey-creation wizard) to match
  each mockup exactly (spacing, depth, game-juice). Also still deferred: illustrated Buddy art direction
  (founder rejected the 4 creature concepts — see `07_Assets/Buddy_Creature_Concepts.html`; needs a new
  direction), and per the audit, deeper game-juice.

**🗂️ DESIGN TARGETS ARE NOW IN THE REPO:** `04_Product/UX/UX_References/mockups_v14/` — screen-01..18.png
+ `mockup_v14.html`. Mapping: 01 Home · 02 Journeys · 03 Journey detail · 04 Explore · 05–08 Creation
(Name/rhythm/Plan/Your-why) · 09 Friends · 10 Buddy · 11 Shop · 12 Hatch reveal · 13 Achievements ·
14 Achievement detail · 15 Inbox · 16 Missions · 17 Login · 18 Weekly planning. The gap punch-list:
`04_Product/UX/Design_Fidelity_Audit.md`.

**🔑 State a new session needs:**
- **Social pillar** (E2, Supabase, anonymous auth): keys live in **gitignored `app/.env`** — they
  PERSIST on this Mac (not in git). On a fresh clone they must be recreated (URL + publishable key from
  the founder's Supabase). Social is behind `featureFlags.social` (auto-on when env present).
- **Permissions:** this Mac has a permissive "YOLO" config in `.claude/settings.local.json`
  (acceptEdits + broad allow-list + dangerous-op deny-list). Machine-local, not committed.
- **Build method:** delegate each screen to an implementer/ux-designer agent with the mockup image +
  audit as spec; agent verifies `tsc --noEmit` + a headless-Chrome web screenshot of the route vs the
  mockup; then commit per chunk. `qrcode` npm pkg was in a session scratchpad — reinstall if needed.

**▶ NEXT (resume here):** (1) restart the dev server + hand the founder a fresh QR; (2) build the
**Weekly planning** screen (screen-18); (3) do the **fidelity pass** on the existing screens vs mockups;
(4) resolve the Buddy art direction with the founder. Task list: #5 (new screens) nearly done, #6
(fidelity pass) pending.

*(Older snapshots below remain accurate for their eras — 2026-07-09 = POC complete + social + Expo Go
blocker; 2026-07-08 = the 4 local pillars in detail.)*

## ⭐ HANDOFF SNAPSHOT — 2026-07-09 (read this first)
**The POC is now CODE-COMPLETE — all 5 pillars.** The 4 local pillars (below, 2026-07-08 snapshot)
plus the **social / Allies pillar** are built, reviewed, and on `main` (GitHub live at `GuyNoiman/PushApp`).

- **Social pillar (E2):** Supabase Free tier, **anonymous auth** (no email/SMTP, $0). Schema + RLS in
  `app/supabase/schema.sql` (security-privacy reviewed — visibility masking enforced server-side).
  `app/src/core/social/` (`SocialGateway` + `SupabaseSocialGateway`, vendor-isolated), `SocialProvider`,
  `app/src/app/friends.tsx`, behind `featureFlags.social`. Keys in gitignored `app/.env` (verified live).
  Decision logged: `11_Engineering_Bible/Engineering_Decisions.md` E2.
- **Investor decks delivered:** `03_Pitch/PushApp_Deck_A_Investor.pptx` (revised) + `_Deck_B_Keynote.pptx`
  (Steve-Jobs style) + PDFs. Use the app's v14 screens.
- **Team = 13 agents** (`.claude/agents/`) + `CLAUDE.md` constitution + `cost-guardian`. Multi-device
  (desktop + mobile via GitHub) confirmed working.

**🚧 BLOCKER — can't run on the iPhone yet (needs founder at the computer):** the app was scaffolded on
**Expo SDK 57** (npm `latest`), which is newer than the App Store Expo Go supports. Downgraded to **SDK 56**
(commit `0749a33`) — **still** shows "incompatible", so the founder's Expo Go tops out at **≤ SDK 55**.
**TOMORROW (needs founder to re-test on device):** downgrade one more to **SDK 55** (repeat the `expo install`
+ verify flow), or make a **dev build** (Xcode local / $99 Apple acct). The **web build works** now
(`web.output: "single"`), so the app is runnable — just not in Expo Go yet.

**🎨 Design fidelity audit done → `04_Product/UX/Design_Fidelity_Audit.md`.** BIG finding: `app/src/constants/theme.ts`
is still the **stock Expo gray/black/white** — the Design-System palette + Baloo 2/Inter fonts + coral CTA
were **never encoded**, so every screen renders gray. That one file is tomorrow's #1 design task (then game-juice
on reward surfaces per §; and a scope call on 7+ missing mockup screens — Journeys list, Journey detail, Explore,
Achievements, Inbox, Weekly planning). Terminology fidelity is excellent.

**🐣 Buddy creature concepts (founder to pick a direction):** 4 cute glossy 3D-style creatures — Ember (coral),
Lumi (teal), Nimbo (periwinkle), Sprig (leaf) — artifact: https://claude.ai/code/artifact/1608abae-1c82-45e6-89a7-4faa0bef7ea7
(source `scratchpad/creature_concepts.html`). New species, not human/animal.

**▶ NEXT (tomorrow, from this point):** (1) get it on the iPhone — SDK 55 downgrade or dev build (founder present);
(2) encode the Design System into `theme.ts` + fonts + coral CTA (audit #1); (3) founder picks a creature direction.
Dev servers were stopped for the night; restart with `cd app && npx expo start` (LAN 192.168.0.123, port 8081).

*(The 2026-07-08 engineering snapshot below covers the 4 local pillars in detail — still accurate for those.)*

## ⭐ HANDOFF SNAPSHOT — 2026-07-08 (ENGINEERING — superseded header; pillar detail still valid)
**Phase 6 (Engineering): all FOUR local POC pillars are BUILT.** The founder asked the team to
run autonomously through everything doable without him; done up to the one gate that needs him
(the social backend). The investor-deck task (older "NEXT") remains **deferred**, not cancelled.

- **New team role: Cost Guardian** (`.claude/agents/cost-guardian.md` + CLAUDE.md §4/§5 and rule
  §3.10) — warns in Hebrew before any action that could cost money or approach a paid quota.
- **Stack (E1):** **Expo (React Native) + TypeScript**, engine-based (`11_Engineering_Bible/Engineering_Decisions.md`
  §E1; CLAUDE.md §6). App in `app/` (Expo SDK 57). Pure-TS core under `app/src/core/`; business logic
  ONLY in engines (verified: no react/expo import in `src/core`).
- **Built pillars (each: implemented → code-reviewed → fixed → verified → committed):**
  0. **Scaffold** — EventBus, `AppCore` composition root, offline `Repository`/`LocalRepository`,
     config-before-code, action-based **Home** (seeds a demo "Run 5km" Journey).
  1. **Journey creation** — `journey/new` modal wizard (title·why·duration/rhythm·Steps·Starter Step),
     in-context local reminders.
  2. **Buddy** — Buddy tab: `BuddyScene`, reactions + `EvolveReveal`; focus-gated `useBuddyMoments`.
  3. **Coins + Shop** — `ShopEngine` + `config/shopItems`, `shop` modal, equipped cosmetic on the Buddy.
  4. **Missions + Login** — `MissionEngine` (injected clock), `missions` modal, Coins-only single
     reward path, foreground rollover with auto-claim (no forfeited Coins).
  - Engines: `Journey / Reward / Buddy / Reminder / Shop / Mission`. **Tests: jest 35/35; `tsc`=0;
    web export ok.** Nav = Home + Buddy tabs; Journey/Shop/Missions are modals.
- **Cost so far: 0₪.** All local. Apple Developer account only later for TestFlight/store.
- **⚠️ Env constraint:** `api.expo.dev` is blocked from THIS container (403). Here use `EXPO_OFFLINE=1`
  for `expo install`/`expo start`. **Founder tests on his own machine:** `git pull` → `cd app &&
  npm install && npx expo start` → scan QR with **Expo Go** (same WiFi). `app/README.md` has the guide.
  Fresh clone: run `npx expo start` once before `tsc` (regenerates the gitignored `expo-env.d.ts`).
- **Device smoke-tests still owed** (can't run here — no device): native-tabs render/switch;
  Journey modal present/dismiss; cross-tab Buddy reveal; Missions daily/weekly rollover across a real
  midnight on foreground; AsyncStorage persistence across restart.
- **🚦 GATE — social/Allies pillar needs the founder.** It's the only POC pillar needing a backend.
  A decision-ready **proposal awaits approval**: `11_Engineering_Bible/Social_Backend_Proposal.md`
  (Supabase free tier = $0; `SocialGateway` abstraction; nothing provisioned per §3.10). On approval
  it becomes E2 and gets built behind a feature flag.
- **NEXT:** (1) founder opens the app in Expo Go and gives feedback on the 4 pillars; (2) founder
  reviews the social backend proposal → approve/adjust so the social pillar can be built; (3) address
  device smoke-test findings; (4) later: visual polish toward the mockups, then TestFlight when wanted.

---

## HANDOFF SNAPSHOT — 2026-07-08 (product & business strategy)
**Phases 1–5 complete; product + business strategy locked.** Sessions 2026-07-07/08 delivered:
- **Design:** all finalized screen decisions folded into `UX/*.md` + new `Shop_Screen.md`/`Weekly_Planning_Screen.md`; committed (86187eb). Latest mockup = **v14** (GT card) — link under Artifacts. Mockup is a *reference*; `UX/*.md` are the source of truth.
- **POC / MVP / roadmap** (`POC_and_MVP_Scope.md`, D13/D14): POC = does **social + Buddy + reward-loop** drive persistence; **lean MVP** = POC + Explore/library + onboarding(egg→hatch) + Phases/full types + light-AI encouragement/reminders.
- **5-version roadmap** (`Version_Roadmap.md` + **`.pdf`**, D15): V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem · V5 Future/Optional. Table artifact 9cdeb986.
- **Rich Step Types** vision (Bible §35, D15) — V4/Future, investor material.
- **Revenue model** (Bible §23 rewritten, D16): 5-stream portfolio — Shop/coins · consumer subscription · creator marketplace · business/branded Journeys · coach tier; mirrored in `03_Pitch/`.
- **Grace Tokens** (Bible §36, D17): earned-only/never-buyable · gift-not-wager · opt-out · regenerating floor; GT card in Home mockup v14.
- Decisions **D1–D17** are canonical in `06_Decisions/Decision_Log.md`.

**▶ NEXT: build the investor PRESENTATION / pitch deck** (founder's next request; start from `03_Pitch/Pitch_Deck.md` + `Investor_Questions.md`, Vision, POC/MVP, Version_Roadmap, revenue §23, Rich Step Types §35). After that, Phase 6 (Engineering) is still blocked on the **Engineering Bible** (empty `11_Engineering_Bible/` folder exists).

*(The dated per-round mockup-refinement logs below (v3–v12) are historical process notes — superseded by the folded specs + git history; kept for provenance, not needed to continue.)*

## Specs folded in — DONE 2026-07-08
The initial screen design is **signed off**. All finalized v13 decisions are now folded into the repo (no longer artifact-only): each `UX/*.md` got an appended **"Finalized visual design (mockup v13 — 2026-07-08)"** section (append-only, nothing lost), and two new specs were created: **`UX/Shop_Screen.md`** and **`UX/Weekly_Planning_Screen.md`**. The artifact is now a *reference*, not the source of truth — the `UX/*.md` docs are canonical. Phases 1–5 complete; design commit landed (86187eb). **POC + MVP + roadmap staging now DEFINED together** (2026-07-08) in `04_Product/POC_and_MVP_Scope.md` (D13/D14 — D4 fully resolved): POC tests social+Buddy+reward-loop → persistence; MVP = POC + Explore/library + onboarding(egg→hatch) + Phases/full-types + light-AI encouragement/reminders; rest → Commercial. **4-version release plan** now drafted in `04_Product/Version_Roadmap.md` (V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem — all remaining work ranked; D15). New vision idea captured: **Rich Step Types** (Bible §35, Stage: Future — video/audio/quiz/reflection/etc. Steps; investor-vision material). **Revenue streams consolidated** (D16): Bible §23 rewritten as a 5-stream portfolio (Shop/coins · consumer subscription · creator marketplace · business/branded Journeys [promoted from §33.6 hypothesis] · coach/pro tier), version-mapped; mirrored in Pitch_Deck §9 + Investor_Questions §14. 5-version roadmap table also exported to **`04_Product/Version_Roadmap.pdf`** (generated via headless Chrome from `scratchpad/version_table.html`; artifact https://claude.ai/code/artifact/9cdeb986-c3c7-48fe-80ef-8af16eb50bc8). **Next per the work plan: Phase 6 (Engineering)** — note an empty-ish `11_Engineering_Bible/` folder exists; still BLOCKED on the founder providing the Engineering Bible content. Uncommitted since the 86187eb design commit: POC/MVP scope, Version_Roadmap(.md/.pdf), Bible §23+§35, Pitch updates, Decision_Log D13–D16 — offer to commit.

## Where we are
Phases 1–4 (Learn, Cleanup, Review, UX specs) are complete. **Phase 5 (Design System)** foundations are locked in `04_Product/Design_System.md`. We are in the **UI-mockup iteration**. Latest = **`all_screens_v3.html`** (full round, 2026-07-07): every screen reworked per the backlog + two new screens (Shop, Weekly Planning). Three decisions await the founder (see "STATUS OF THE v3 ROUND"). Separately, the **Atomic Habits product spec (§34)** is now in the repo. **Next priority: fold the v3 visual decisions into the per-screen `UX/*.md` docs** — they currently live mostly in the artifact only.

## Artifacts (mockups — external, not in repo)
- **All screens — LATEST (2026-07-08, adds Grace Tokens "GT" card in Home header):** https://claude.ai/code/artifact/bfa84846-91c3-42c2-bded-035ab93f2d08 — source `all_screens_v14.html` (== v13b + a purple "GT" card top-of-Home next to Coins, no "+"; one-line fit verified via isolated header screenshot). Use THIS link.
- Version roadmap TABLE (5 versions incl. Grace Tokens): https://claude.ai/code/artifact/9cdeb986-c3c7-48fe-80ef-8af16eb50bc8 · PDF `04_Product/Version_Roadmap.pdf` (5 pp; regen via headless Chrome from `scratchpad/version_table.html`).
- All screens — prior (v13b, pre-Grace-Tokens):** https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba — source: `all_screens_v13b.html`. **Fixed the real bug:** Explore `.hs` carousels were being flex-compressed (their `overflow-x:auto` collapsed `min-height` to 0, so in the content-heavy Explore the flex column shrank them, clipping the creator-card text below the buddy). Fix = **`flex-shrink:0` on `.hs`**. Also creator buddy 40px. Verified with a full-content Explore replica screenshot. Use THIS link.
- Explore-only replica (proof the creators card renders): https://claude.ai/code/artifact/ff3f33e9-c038-444e-847f-56ee3cabcc17
- NOTE: republishing to the SAME artifact URL repeatedly caused a stale-cache render for the founder — always publish to a NEW path/URL when he needs to see a change.
- Old rolling URL (63dba7b5, may be cached): https://claude.ai/code/artifact/63dba7b5-a2c9-4393-9484-fa5ad2139070
- All screens — full round v3 (2026-07-07): https://claude.ai/code/artifact/20702d07-e09f-485e-8476-57625fcf848e
- Home refinements v3 (options: hub, 3D buttons, tile A/B/C): https://claude.ai/code/artifact/0ce95016-42e3-400d-86c8-08b40db5b71c
- Home (standalone, v5): https://claude.ai/code/artifact/fcdd30a7-ffa7-4641-a923-368fb6188421
- All screens gallery (v2, superseded): https://claude.ai/code/artifact/0ecc3744-3f28-49df-8d28-df47448f7e12
- Source HTML in scratchpad: `all_screens_v3.html` (newest), `home_refinements.html`, `all_screens.html`, `home_mockup.html` (session scratchpad — may not persist; rebuild from Design_System + UX specs if gone).

## Locked design system (see `04_Product/Design_System.md`)
- Direction: **A playful game-world (primary) + B calm wellness (secondary)** — "cozy but clean".
- Base **#FAFAF8** (neutral); cards #FFF; ink #2E2E2C. Accents by meaning: **coral** primary/CTA · **teal** brand/nav/growth-progress · **blue** XP · **purple** social/Cheer · **gold** coins · **pink** consistency. Danger = soft coral-red. Status colors gentle.
- Type: **Baloo 2** (display) + **Inter** (body). Radii 8–16, button 48, spacing 4–32.
- Buttons: coral primary with **dark ink label** (white was unreadable). Icon buttons tinted per area. Nav: compact, icon-only, **active icon takes the tab's color**.
- "Concentrate the game-juice (gloss/depth/3D/collectible cards) in reward/identity surfaces (Buddy, Achievements, Missions, celebrations); keep work surfaces (Steps, Journeys, Inbox) clean/calm."
- Founder prefers **seeing visual examples** for any design question (memory: pushapp-design-show-examples). Artifacts (not the inline `visualize` widget) are needed for depth/shadows/gradients; the artifact sandbox blocks web fonts (use `ui-rounded` fallback for Baloo 2) and icon CDNs (use inline SVG).

## Home — locked so far (in `UX/Home_Screen.md`)
Global header (Level+XP left, Coins right) → "Hello, [name]" → Buddy centered, flanked by 4 area buttons (Inbox+Missions left, Consistency+Friends right), stage name only → draggable cream "Week's steps" panel with **right-side scroller** → step cards (compact **Journey icon tile** + name + Journey·Phase + thin progress bar + rounded-square **report control**: check / "+"; completed dimmed at bottom) → compact icon-only teal nav. Buddy now rendered as a 3D-look glossy creature (CSS approximation; real art later).

## PRODUCT SPEC — Atomic Habits additions (DONE 2026-07-07, in repo)
Founder gave 7 behavioral-design notes (Atomic Habits). Saved as **Bible §34** (§34.1–34.7), **Decision_Log Batch 2 (D6–D12)**, and woven into `UX/Journey_Creation_Screen.md` + `UX/Home_Screen.md`: D6 Step title+description (hidden → 3-dot "More Info") · D7 no dedicated Habit Stacking (calendar/location triggers) · D8 Starter Step (≤2min) · D9 identity/motivation Qs → personal encouragement · D10 immediate elegant celebration (variations) · D11 flexible non-punishing streaks · D12 weekly planning confirmation flow (**new Weekly Planning screen owed**).

## STATUS OF THE v3 ROUND (2026-07-07)
**Confirmed by founder:** Step-card icon = **Option C** (inline mini-icon) · area buttons **3D, icon-only (NO text)** · report control 32px. **Regressions fixed in v3:** right-side **scroller** restored · original flat **coin chip** restored.
**Applied in `all_screens_v3.html`:** Home (This week + Journeys-hub toggle, 3D buttons, scroller, Option-C, 3-dot menu) · Journeys (3D Achievements emblem) · Journey detail (name as secondary w/ eyebrow) · Explore (horizontal-scroll rows + creators carousel + brands carousel) · Journey creation (pencil edit affordance, prev/next names on buttons, step-bar tooltip, Starter Step, Your-why identity Qs) · Friends (3-dot action menu, caption removed) · Buddy (name/level top, single Shop top-right, Customize btn, bounded 5-tab container: Character·Clothing·Items·Location·Furniture) · **Shop screen (NEW)** · Achievements (warm base, medals+conditions — 2 options: inline + detail sheet) · Inbox (Allies/Friends/Groups tabs back) · Missions+reward (**one centered floating modal**, merged w/ Missions·Daily tabs) · **Weekly Planning screen (NEW)**.
**Awaiting founder's call:** (a) the **Home hub + Inbox-as-nav-tab** — shown as an option, not locked; (b) **merging** the two reward modals vs keeping separate; (c) which Achievements condition treatment (inline / detail sheet / both).

## v12 REFINEMENTS (founder feedback on v11, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v12)
Note: "Your why" was rebuilt with fresh `.qblk`/`.ansbox` classes (the old `.qwrap{flex:1}`/`.abig{flex:1}` caused the overlap); button footer is now transparent (no bar). DONE = `.donebg` watermark behind `.m` (which is z-index:1).
**Home:** "Ends today" badge should sit **half-in/half-out** of the card top (a touch higher). The green **"DONE" must be a background watermark** (text can overlap it) — currently it's an inline stamp that pushed the Journey name to wrap.
**Explore Top creators:** add the **creator username** and a **registrations count** (total sign-ups across their content — counts each registration, not unique people).
**Your why (still broken):** the **buttons got a background/footer bar that shouldn't be there**; the **questions overlap** — structure must be Q → answer box → Q → answer box → Q3 → the special input box, cleanly stacked. Rebuild simply.
Rest looks good for this stage.

## v11 REFINEMENTS (founder feedback on v10, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v11)
**Urgent card:** founder OK with the "Ends today" tag as a **floating badge on the top-right corner** (slightly overlapping the top edge) — name stays one line.
**Your why:** the **buttons jumped up** — they must **stay pinned at the bottom** (their place). The **first two questions disappeared** — bring them back. Too much gap between the input and the entered answers — the **char-limit (0/50) indicator should move** (inline, not its own line taking space).
**Explore "For you":** the **icon takes too big a share** of the card — the name is the most important, then duration, then #steps; the icon is just decoration (later replaced by a **user-uploaded image** when the Journey is made public). Slim the image area, let text dominate; show duration + steps.
**Top creators:** show that **creator's own buddy + level** (not a generic avatar). **Businesses:** keep the **logo** (as done).

## v10 REFINEMENTS (founder feedback on v9, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v10)
Note: urgent-card tag put back INLINE (margin-left:auto) for height-consistency with other cards — founder may still want its own row; watch for feedback. Home/Buddy now share the forest bg + floating level/coins (no header bar).
**Home + Buddy — remove the header bar.** The **level object + coins object** keep the same positions but **float** (not inside a header). **Coins object height = level-bar height** (shrink it). The whole page **background = the forest** (from Buddy tab), continuing behind the floating level/coins — **lighten it a touch** so buttons/objects stay prominent. **"Hello Guy" becomes a speech bubble above the buddy, centered** (as if the buddy says it). Add a **shadow separating Weeks-steps from the buddy area**, and **more shadow under the nav** (make nav pop).
**Urgent (yellow) card:** still can't fit all text; "Ends today" takes too much height; line-spacing differs from other cards. At the current enlarged size, make everything fit and **look consistent with the other cards**.
**Explore:** text/images **still overflow the cards** — actually make them fit.
**Your why:** revert my change. First two questions were good (answer boxes — can shrink slightly). Only the **last question**: short answer input + **Add** button, **max 50 chars**; on Add the sentence appears **below with grey bg + an X to delete**, and the input **clears** for the next. Page scrolls.

## v9 REFINEMENTS (founder feedback on v8, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v9)
**Header:** remove **"Lv 13"** (level already in the circle) → bar can be narrower. Remove the **yellow border**. **Add the + back to the coin** pill.
**Weeks steps:** "Ends today" tag + resize good, but keep the **same top/bottom padding as before** (text currently overflows the card). For **completed** steps, replace the ✓ wash with a **"DONE" stamp** like the Journeys tab.
**Explore:** text/images **still overflow cards** — enlarge cards a bit or shrink images so they fit. **Top creators** needs a **different icon** (not the same star as "For you").
**Your why:** not good — content **hides behind the buttons** (buttons should be a pinned **navbar**, content scrolls above). The reminders field needs a **short-text input + Add**: on Add, the sentence becomes a **grey chip** and the input **clears** for the next.
**Buddy:** straight corners good. The **forest bg must fill all free space** up to the inventory (kill the dead strip); **center the buddy** in that area. The unlock **tooltip should point at the locked tab**, not just straight down. (Loved the hatched egg!)
**Home:** make the **Weeks-steps panel full-width with straight corners**, same as the inventory.

## v8 REFINEMENTS (founder feedback on v7, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v8) + new refs
New screen added: **hatch/evolve reveal**. New pattern: **locked-tab "coming soon"** tooltip. Still owed to spec: **Buddy_Screen.md** (hatch reveal, locked-until-level, forest scene, Select), **Shop_Screen.md**, **Weekly_Planning_Screen.md** — all still artifact-only.
Refs provided: (1) a **level meter** — gold-framed bar with the level circle overlapping the left, "3,450/5,000 XP" inside, and a "Level 71" dark segment on the right; (2) a **Mythic character reveal** ("Glacidrake") — dark bg + radial burst + rarity tag + name + creature w/ stars + COLLECT button + "Open Store" — ref for the **buddy hatch/evolve reveal** AND the **"coming soon" locked-ability** style; (3) a **coins pill** (gold star-coin + amount in a framed pill).
**Header:** **drop gems** for now. **Connect the XP bar to the level circle** as one unit (per ref 1): count goes **inside the bar on one line**, and it should read **"EXP"** not "XP". Restyle **coins** per ref 3 (framed gold star-coin pill).
**Weeks steps:** keep yellow bg + "Ends today" but give the **tag its own row** (card height may grow). Keep the **✓ background wash but remove the ✕** (missed card: no mark) — or use a **"DONE" stamp** like the Journeys page.
**Journey buttons:** good. ✓
**Explore:** good now — just **verify images/text stay inside the card borders**.
**New Journey wizard:** disabled Back is good but it's **smaller than Next — make them equal size**.
**Plan the steps:** the **"Optional" tag reads as applying to the whole section — remove it** (keep the Recommended tag on the starter card).
**Your why:** "What to remember when it's hard" should be a **list of short answers** (one or more motivation sentences) that get prompted when needed — not a single box.
**Buddy:** inventory great — make its **top corners square** (flat, not rounded). Put the **avatar in the middle** with a **3D forest background** behind it.
**New — Buddy hatch/evolve reveal screen** (per ref 2): rarity tag + name + creature w/ burst + COLLECT.
**New — "Coming soon" locked ability:** lock a specific **inventory tab** with a tooltip like **"Unlocks at level 20"** (proper game phrasing).

## v7 REFINEMENTS (founder feedback on v6, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v7)
Note: the black-blob bug was `.cardmark` svg missing `fill:none` (rendered filled). Explore "destroyed" look was the `.hs` negative-margin bleed clipping under `overflow` — removed it; Explore reverted to the V3 three-carousel form (For you jtiles · Top creators round · From brands wide) with vertical scroll + horizontal drag.
**Header:** visually **join the XP bar to the level circle** (one unit). Put the **340/500 count ABOVE** the bar. Bar can be **shorter**, count text **smaller**. Try to put **coins + gems on one horizontal line** (not stacked) if width allows; if not, keep stacked or drop gems for now.
**Journeys:** the bottom buttons' **frame is too prominent**; the **+ create button reads badly** (plus swallowed by the gradient) — fix.
**Weeks steps:** the green card has a **black blob** in the bg (bug — the ✓ renders filled) — must be a clean ✓/✕ or nothing. Rename **"Reported" → "Completed"** (more positive). Add a **yellow background** state for a step whose window is about to pass (urgent). The **line at the top of the panel** (drag handle) looks unnecessary — remove.
**Explore:** still looks broken — **restore the V3 version** (the one I praised). Needs: normal **vertical scroll** + **horizontal drag** in carousels; enough **left margin**; keep **varied card shapes**; **headers must not hide the carousel**.
**Friends:** replace the word **"help" → "cheer"** (section title + the Help button → Cheer). Friends listed under "Needs your cheer" should **also appear in "Your friends"** (sorted **A–Z**) for now.
**Buddy:** inventory box **still not full width** — drop its rounded corners and **stretch it edge-to-edge**.
**Login modal:** delete the **8th-day tile ("+21")** that isn't in the week. Add a **divider between the day number and the reward**; put the coin/gem **icon beside the amount (horizontal), not above** (smaller icon + font).
Rest looks good.

## v6 REFINEMENTS (founder feedback on v5, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v6)
**Home header:** use the **horizontal XP bar** (not the ring around the level). "Level 12" appears **twice** — remove one. The **340/500 count must sit adjacent to the XP** bar.
**Weeks steps:** button + background wash are great, but the ✓/✕ **watermark isn't legible** — either make it clearly a ✓/✕ in the background or remove it entirely.
**Journeys:** the New button should be **icon-only**, and put **both buttons (New + Achievements) in a bottom row** across the width.
**Explore:** regressed — "looks terrible" vs a few versions ago (content overflows/clips). Fix layout (make it **scroll vertically**, clean spacing).
**New Journey:** on step 1, **Back** is irrelevant → hide or **disable** it. **Plan the steps:** remove the example line. **Your why:** correct now! — but **add the Back button**; the primary button shows **"Skip" when all fields empty**, else "Next".
**Buddy:** inventory can use the **full screen width**; apply the **same header fix** here.
**Shop:** much better. ✓
**Achievements:** drop the **yellow background** on the count; when showing 18/30, "**12 more**" must be **lower hierarchy** (muted/smaller) — same in the detail sheet.
**Modal:** tab **text alignment** still off. Rename **"Daily reward" → "Login"** (simpler). The claim button should just say **"Claim"** (don't repeat the reward amount).

## v5 REFINEMENTS (founder feedback on v4, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v5)
**Home header:** keep the gem/diamond. **Remove one XP meter** (has both a ring around the level + a horizontal bar — keep only one). **Remove the username.** **Stack gems above/below coins** (vertical) to free width — header felt cramped.
**Week's steps:** remove the "swipe to report" caption. Remove the confusing left-edge **swipe arrow** on the first card. The ✓/✕ must live **in the card background** and **NOT replace the 3-dot** (keep the 3-dot on every card; show done/miss as a background wash + mark). Slightly **reduce the step/Journey-name font**.
**Journeys tab:** cards still don't match Home cards — put the **icon inline in the title row** (like Option C), not a centered left tile.
**Explore:** a section was dropped — **bring back the creators carousel** (round cards). Ensure enough **left margin** on the first card of each row (initial state looked flush-left).
**New Journey entry:** the **create entry/button is missing** — add it (Explore "Build your own" and/or a + on Journeys). **Remove "Show me similar"** for now → move to a future-ideas list. Edit affordance + tooltip now good. ✓
**Starter step:** replace the two tags with a single **"Recommended"** tag; reword as a recommendation: *"Adding a small ≤2-min first step raises the chance of finishing."*
**Your why:** wrong execution — the **question should NOT be boxed**; only the **answer** gets a box (bigger, filling the screen). The **colors are off** (purple) — use on-brand neutral.
**Buddy tab:** header must be **identical to Home** header. Shop + Customize buttons **stacked vertically** and in the **same button style as the others** (3D). Inventory takes **too much height** — shrink it, add an **internal scroller**, and add a **"Select" button** at the bottom that applies the choice. Framing good. ✓
**Shop:** recolor to the **app's palette** (warm, not deep blue).
**Achievements:** better now. ✓
**Missions/reward modal:** the **"Daily reward" tab is hidden under the X** — fix overlap. The **Claim↔reward layout** is poor — give the reward a **fixed column separated by a vertical divider**; and **move the progress indicator (2/3)** elsewhere (near the bar, not stacked under the reward).
Still to tune: Shop (more refs coming) · Explore per-type info depth · Weekly planning interaction.

## v4 REFINEMENTS (founder feedback on v3, 2026-07-07 — APPLIED in `all_screens_v4.html`)
A new game **Shop reference** was provided (structured header w/ level badge + resource pills w/ icons; "Chapter Pack" featured offer w/ 600%-value badge; "Daily Shop" grid w/ discount badges, gem prices, "Purchases left", refresh timer; bottom sub-tabs). Tune Shop toward it; more refs coming.

**Global header** — I wrongly stripped the coin (+rope) icon; bring back a proper **coin icon** closer to the refs. Make the **level badge + whole header** prettier and more structured (reference-style resource pills w/ icons).

**Home Step cards** — the 3-dot + the check(V) control together are too wide. **Keep only the 3-dot**; expose reporting via **long-press (= 3-dot)** OR **Tinder-style swipe-right**. After reporting: **done → the whole card turns green** with the V woven into the card bg; **not-done → whole card turns red with an X**. (No separate report button.)

**Journeys tab** — use the **same smaller-icon card** design (Option C / small tile), not the big 36px tile.

**Journey detail** — title now good. ✓

**Explore** — good direction. Show the *important* info per type: friends-recommend → Journey name + which friend; business → business **logo + business name + Journey name**; for-you → **duration / frequency** etc. (deepen later). **Remove the "drag" word** from the "For you" row — make all rows like the two bottom carousels (no drag label).

**New Journey**
- **Tooltip hides behind the title** — fix stacking/position.
- Step names above the buttons — excellent. ✓
- **Starter Step is OPTIONAL, not mandatory**, and belongs in the **step-creation stage**. Move the **Step description** field to a different stage (e.g. where the title/name is first defined).
- **"Your why"** is great — **use full screen height**: enlarge the question cards, format as **question → answer bubble → question → answer bubble …**

**Friends**
- **Enlarge the 3-dot button** (barely visible) — circle it so it reads as a button.
- The opened menu: **drop the colors**; do it like big apps (deciding text-only vs icon-only — match convention).

**Buddy**
- **Header disappeared — bring it back.**
- Customize + Shop buttons should be **icon-only (no text)** — like the inventory tab names (also no text).
- Find a **different location** for the buddy **name + stage name**.
- Inventory items should be **smaller** (there will be many) + **scroll/drag**; the whole inventory needs a **single unified frame** (not separate-looking parts).

**Shop** — first pass toward the new reference (see above).

**Achievements**
- **No right margin** currently; want **3 prizes per row** — reduce card width.
- **Drop the progress bar**, replace with a **count** (e.g. "4/10 · 3 more").
- Detail sheet enlargement liked, but **add a close button.**

**Inbox** — great now. Tab order → **Friends (default), then Allies, then Groups.** **Remove the "Ally" tag** by Noa. **"Noa sent a gift" is a notification, not a message** — don't show it as a conversation.

**Missions + Daily reward modal**
- Make clear that **Daily/Weekly live UNDER "Missions"** (hierarchy unclear now).
- Show **each mission's reward before it's completed**.
- **No per-mission icon.**
- Add states: mission **done-but-unclaimed** (indicator), and **claimed** (grey + "Claimed" ✓).
- **Daily reward:** short button text; day-1 green **less prominent**, day-7 red **not prominent** — all days **disabled** with gentle shade variations; **show each day's reward** (check refs).

**Weekly planning** — good; refine later. ✓

## DESIGN REFINEMENTS BACKLOG (original 2026-07-07 feedback — mostly addressed in v3 above; kept for reference)
New references added to `04_Product/UX/UX_References/`: `achivements.PNG`, `inventory.PNG`, `mission + sign in.PNG`, plus an Explore Netflix/Spotify-scroll ref and an Achievements "medals + condition window" ref the founder mentioned — consult these.

**Home**
- Make the 4 area buttons **3D/graphic**, not plain line icons — more interesting artwork.
- **Report control** (right of step card): make a bit smaller. **Journey icon tile** (left): currently too big — produce **another option** for showing it (smaller / different treatment).
- STILL OWED: show the **"Journeys inside Home" option** — the two-view hub (a top toggle **This week · Journeys**) that frees the nav slot for an **Inbox** tab. Founder asked for this 3×; build it as a visible option.

**Journeys** — good now, except the **Achievements button** must look **interesting/inviting** (like the Home buttons — 3D/graphic, not a flat icon).

**Journey detail** — much better. The **title (Journey name) should read as secondary** — visually distinct from tab-name titles like "Explore" (which are top-level). De-emphasize it.

**Explore** — currently boring; make it lively:
- Show sections are **horizontally scrollable** (Netflix/Spotify style — peeking cards, side-drag) — ref added.
- Add a **carousel of recommended creators**, with a **different card shape** (e.g. circle avatar + username + #journeys created + cumulative likes/uses).
- Add a similar **businesses** carousel, possibly another shape.
- Goal: varied, non-boring layout.

**Journey creation (wizard)**
- Fix messy spacing between the selected value and the arrow; consider a **different edit affordance** than a chevron.
- Replace "Next + list of next steps" with just the **next step and previous step labels beside the Back/Next buttons**; and on tapping the top step-bars, show a **tooltip** with that step's title.

**Friends** — the 3 actions currently span the whole card. Instead use a **three-dots button** that opens a menu with the 3 actions (Cheer / Gift / Message). Remove the "Cheer · Gift · Message" caption at the bottom.

**Buddy**
- Move **buddy name + stage/level to the top**.
- Shop appears twice — keep only the **top-corner Shop**; tapping it opens a **Shop screen (not built yet)**. Add a **Customize** button near Shop (future: real character design).
- The tabs under Buddy need a **container/bounding** (their labels currently blend into the page bg). Tab types should be: **Character (דמות) · Clothing · Items · Location · Furniture**.

**Achievements**
- Background must **match the app** (current purple game bg is off). Make it read like **prizes/medals** (ref added).
- Add the **unlock condition** per prize (e.g. "invite 50 friends"). Founder added a ref of a **detail window on tapping a trophy** but is open to other mechanisms — **give a few options** for showing prize info + conditions.

**Inbox** — good that conversations aren't cards, but the **Allies/Friends/Groups tabs disappeared — bring them back** (as tabs above the IG-style list).

**Missions + Daily/Consistency reward (modals)**
- The **modal should float centered**, not be pinned to the bottom.
- A ref shows **missions together with the daily reward** — consider **merging Missions + Consistency reward into one modal**.

## Two general deliberations (my recommendation — prototype as options)
1. **Per-tab tint + colored active nav icon** — do it *lightly*: neutral page bg + active nav icon in the tab's color (already added) + a subtle colored wash only at the top of each tab. Avoid full per-tab backgrounds (rainbow risk).
2. **Journeys into Home + Inbox as a tab** — recommend a **Home two-view hub** (toggle: This week · Journeys) to free the slot for an **Inbox** tab (nav: Home · Explore · Friends · Buddy · Inbox). Elevates messaging (core to the support thesis) without overloading Home. Build it as an option to view.

## Carried-over open items
- Report-control word (icon-only vs Log/Report/Done) — leaning icon-only.
- Open question: should **Buddy greet "Hello, Guy"**?
- Middle-layer name kept as **Phase**.
- POC/MVP scope still to define together (`04_Product/POC_and_MVP_Scope.md` placeholder).
- Missing docs from the review: object model, onboarding flow, Intervention Engine MVP spec, metrics, privacy.

## Next steps (fresh session)
1. **Build the investor PRESENTATION / pitch deck** — the founder's next task. Inputs: `03_Pitch/Pitch_Deck.md` + `Investor_Questions.md` (current), `01_Vision/Vision.md`, `POC_and_MVP_Scope.md`, `Version_Roadmap.md` (+ PDF), revenue Bible §23, Rich Step Types §35, the mockup v14 (visuals). Clarify format/audience/length with founder first. Founder likes seeing visuals — consider an artifact deck.
2. Open design calls still un-locked (carry if they come up): Home hub + Inbox-tab nav option; whether GT appears on the Buddy header too (currently Home only).
3. Phase 6 (Engineering) remains blocked on the **Engineering Bible** (empty `11_Engineering_Bible/` folder exists — populate together or await founder content).
4. Git: work through D17 committed as of 2026-07-08 (see CHANGELOG). Keep committing per batch.

## Read next
- `04_Product/Design_System.md` · `04_Product/UX/*.md` (esp. `Home_Screen.md`) · `04_Product/UX/UX_References/`
- `06_Decisions/Decision_Log.md` · `00_Foundation/CHANGELOG.md`
- `Repository_Workflow.md` (how to work here)
