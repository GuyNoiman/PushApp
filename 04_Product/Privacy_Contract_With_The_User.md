# The Privacy Contract With The User

Status: **DRAFT v0.1 — 2026-08-21.** Deliberately NOT legal wording. Owner: security-privacy, with
the founder on every item in §6. Stage: **MVP** (this must be settled before the first store
submission; several rows below are already live in the product).

> **What this document is.** One list of everything PushApp can know about a person: what it is, why
> we hold it, where it physically lives, who may read it, and when it disappears. The eventual legal
> Privacy Policy, the Apple privacy label and the Google Play Data Safety form are all **generated
> from this list**, never written independently of it. If a capability is not on this list, it does
> not ship.

Sources this was built from, not duplicated here: `11_Engineering_Bible/Encryption_Design.md`
(on-device data at rest), `11_Engineering_Bible/Social_Backend_Proposal.md` (the sharing whitelist),
`11_Engineering_Bible/Auth_Backend_Proposal.md`, `04_Product/Tool_Addition_Protocol.md` (§2.2, the
influence contract every tool must declare), and
`04_Product/PRD/Tools_Documentation/Mirror_Feedback_PRD.md` §11.

---

## 0. The promise, in the words a user would read

Draft copy for the consent screen and the top of the policy. Plain, short, true.

> PushApp holds the most personal thing you have: what you are trying to change about yourself, and
> why. So the rule is simple.
>
> Your Journeys and your history are kept in your account, so that losing your phone does not mean
> losing years of your life. We can reach them the way any service can reach what you store with it,
> and we do not read them, mine them or sell them.
>
> Some things never leave your phone at all — your answers in the tools, and the things you write in
> them. And your messages to another person are encrypted end to end: we could not read those even
> if we wanted to.
>
> When something does have to leave the phone, it leaves as little as possible, only for a reason you
> chose, and only to the people you named. A friend you invite sees your progress, not your words.
>
> Nothing you tell us is used to build a profile that follows you around. There is no advertising
> here, no tracking, and nothing sold.
>
> You can delete everything, and it means everything.

### The five principles under it

1. **Local before cloud.** The sensitive layer is device-only by design, not by policy.
2. **Minimise at every boundary.** What crosses a boundary is a summary, never the raw text, and it
   passes a whitelist that a person can open and read.
3. **Named consent per item — between PEOPLE.** Not one blanket permission at install. One Journey,
   one Ally, one visibility bundle at a time.

   **Founder decision, 2026-08-23:** this does NOT mean narrating what leaves the device at the
   moment of use. We do not tell a person mid-flow what is about to be sent to a model, and we do
   not ask them to approve it each time. The promise is made once, at sign-up, and it is a promise
   about substance rather than ceremony: raw text somebody wrote is not handed on, and neither is
   sensitive content. Keeping it is the engineering's job — the outbound requests carry the minimum
   and the tests assert it — not the user's, which is why it is not their decision to make again
   every time.
4. **Everything expires.** A finding about a person is a snapshot of a season. Every stored insight
   carries a staleness rule (Tool Addition Protocol §2.2 question 4).
5. **Deletion is real.** Delete account removes the local blob and the server rows, and propagates to
   anything derived from them.

---

## 1. What we hold today

### THE 2026-08-24 CHANGE, and it is the largest one in this document

The founder decided (D73) that a lost phone must not mean starting over, and chose the model the
large apps use: **the account's own state — Dreams, Journeys, Steps, history, Buddy and the CLOSED
classification of every miss — is stored on the server and restored by signing in.**

**And then he drew the line inside it (D75, 2026-08-24):** *the raw wording stays on the device; our
reading of it goes up.* So what does NOT travel is the person's own words — the `why` behind a
Journey, the note somebody writes when a day went wrong, the note at the end of a Journey, and the
coach's raw behavioural log. What travels beside them is the closed `reasonId` that classifies the
same event, which is the reading rather than the words. A new phone keeps the whole picture of a
life; the sentences stay where they were written. `core/backup/redactForBackup.ts` is where that is
enforced, and a test asserts it field by field.

The one honest cost: the `why` has no derived counterpart yet, so a restored device shows a Journey
without the sentence behind it until such a reading exists. It is reachable by
that account and no other (row-level security), it is not read, mined or sold, and it is not
end-to-end encrypted: we hold it the way Instagram holds what you post there.

What did NOT move: **direct messages stay end-to-end encrypted** (they are another person's words as
well as yours), and **the Tools' raw answers stay on the device** — the Tool Addition Protocol's
standing rule, unchanged.

The rows below marked "on the device" were written before that decision. They are marked, and the
table is corrected underneath.

### Group A — on the device, never sent anywhere

Persisted as one encrypted JSON blob through `EncryptedLocalRepository`, plus the profile blob noted
below.

| Data | Why we hold it | Who may read it | Expiry |
|---|---|---|---|
| Dreams, Journeys, Milestones, Steps and their titles | The product itself | The app, and the account's own backup row (D73) | Until deleted |
| The raw wording a person writes — the `why`, the miss note, the end-of-Journey note, the behaviour log | Their own reflection | ON DEVICE ONLY. Excluded from the backup by `redactForBackup` (D75) | Until deleted |
| The user's **"why"** | Motivation, coach framing | On-device only — NOT in the backup (D75) | Until deleted |
| `reasonLog` (Miss Recovery) | Adapts the plan after a miss | The closed `reasonId` is in the backup; the free-text `note` is on-device only (D75) | Rolling window, to define |
| `behaviorLog` (raw behavioural records) | The adaptive coach's signal | On-device only — never in the backup (D75) | Rolling window, to define |
| `onboardingAnswers` | Shapes the first plan | On-device engines | Until re-answered |
| Timing evidence store | Smart notification timing | On-device engines | Rolling window |
| Buddy stage, XP, Coins, streak, Grace Tokens | Progression | On device; a coarse summary may go out as `buddy_summary` | Until deleted |
| **Tool raw answers** (Life Wheel, Values Clarification, My Best Possible Year, Direction Statement, Passion Map, reflections) | The tool's own result | On device only. Raw answers never leave, by standing rule (Tool Protocol §2.3) | Per tool's staleness rule |
| Tool derived summaries | The influence contract: what the app learns | Only the readers each tool names, one by one, with a reason | Per tool's staleness rule |
| Reminder schedule and local notification content | Reminders | The OS notification scheduler, on device | Until changed |
| **What the coach remembers** (`coachMemory`): the versioned consent, plus a few bounded lines per Dream and per Journey — the outcome, constraints, obstacle categories, assumptions | So the coach stops asking what it was already told (Coach_Context_Summaries_PRD) | **In the account backup (D77, 2026-08-25)** — it is the coach's READING, and the founder's rule is that the reading may travel while the raw material may not. The one verbatim field inside it (`reasons`, a copy of the Journey's `why`) is emptied on the way out by `redactForBackup`, exactly like `why` itself. Protected on the server by row-level security and the promise not to read it — D73's guarantee, not end-to-end encryption. Relevant lines are also sent to the AI provider during an active coach request | Deleted with its Dream/Journey, on withdrawal of consent, and with the account |
| Private profile blob (`pushapp.profile`): **country, birth date, form of address, communication style** | Language, tone, week boundary | On device | Until changed |

> **Known gap, must be fixed or disclosed:** the profile blob is stored in **plaintext** today and is
> outside the encryption envelope. Proposed as Phase C5 in `Encryption_Design.md` §12.2. It contains a
> **birth date**, which is the most identifying field in the app.

### Group B — on our server (Supabase), tied to an account

| Table | Fields | Who can read it | Notes |
|---|---|---|---|
| auth user | user id; email only if the user chose Google or Apple sign-in (Apple may supply a private relay address) | The account owner; our service role | Anonymous sign-in is the default path, so a user can exist with no identifier at all |
| `profiles` | id, handle, `buddy_summary` | The owner, and people in their Support Circle | The handle is user-chosen and public inside the app |
| `friendships` | requester, addressee, status | The two people involved | Consent lifecycle, nothing visible before `accepted` |
| `journey_allies` | owner, ally, journey, visibility bundle, status | The two people involved | `encourager` sees a masked title, progress and streak; `companion` also sees system-generated Step names. A manually typed Journey never offers `companion` |
| `companion_steps` | system-generated Step names and derived statuses | The owner and accepted Companions | Only for coach-created Journeys |
| `progress_snapshots` | coarse progress summary | The owner and accepted Allies | Never the "why", the reflections, or step detail |
| `cheers` | from, to, journey, kind | The two people involved | |
| `entitlements` | tier | The owner, read-only | Written server-side only; carries no PII |
| `account_state` | the whole app state as JSON (D73, 2026-08-24) | The owner, and nobody else — RLS allows exactly one row per account | The backup that survives a lost phone. Readable by the service; not end-to-end encrypted, and the promise about it is the one in §0: not read, not mined, not sold |
| `conversations`, `messages` | who talked to whom and when; the bodies as SEALED BOXES | Participants; the server cannot read a body | End-to-end encrypted (E7). No column can hold plaintext |

### Group C — sent to a third party

| Recipient | What is sent | Guardrails in place | What must still be contracted |
|---|---|---|---|
| **The AI coach provider (Gemini, PAID tier — confirmed by the founder, 2026-08-23: a paid key was purchased for this project)** | The conversation, the goal text, derived summaries | `RedactingLlmClient` strips obvious PII (emails, phone numbers) on the true outbound request; the raw on-device signal is never logged. The tier is the guarantee: Google's terms do not train on paid-tier content, and the free tier does — which is why D69 put this on the paid model | Retention window, region and subprocessors still to be written down for the policy |
| **The Mirror confidential-synthesis provider** | Contributors' answers about the user, for redaction and synthesis | Two-response support threshold, leakage check, no raw answer ever returned to the requester | Provider, region and retention are an **open blocker** (Mirror PRD §18) |
| **Apple / Google sign-in** | Whatever the user authorises at the system sheet | Optional path; anonymous is the default | Standard |
| **Expo / EAS (updates and builds)** | App binary and over-the-air updates. Delivery involves the device's IP address in the vendor's logs | No user content is sent | Disclose as infrastructure |
| **Apple App Store / Google Play** | Purchase and subscription records if billing ships | None yet, billing not built | Disclose when billing lands |

### Group D — what other people tell us about the user

Mirror Feedback is the only place a **third party's** words enter the product, and it creates two
subjects at once: the user being described, and the contributor doing the describing. Its own rules
live in the PRD §11 and are summarised here because they belong in the policy:

- The requester can never reach confidential raw answers through the UI, an API, export, logs,
  notifications, support tools, coach context or an error fallback.
- Contributor identity is stored separately from response content.
- Proposed retention: confidential raw content is deleted no later than **seven days after synthesis
  or round closure**. Only the de-identified synthesis survives.
- Withdrawal is honoured before synthesis, and recomputes or hides the synthesis during the retention
  window.
- Reported abuse evidence is segregated, and staff access requires audited break-glass authorisation.
- Contributors get their own, separately truthful consent text. Visible mode and confidential mode
  are different promises and must never share one wording.

### Group E — what we deliberately do not collect

This list is as important as the others, and belongs in the policy verbatim.

- **No analytics or crash SDK.** No Sentry, Amplitude, PostHog, Mixpanel or equivalent in the app.
- **No advertising identifier, no cross-app tracking, no ads.** App Tracking Transparency is
  therefore not triggered.
- **No push tokens.** Reminders are local notifications scheduled on the device.
- **No location.** The gateway exists as an inert seam with a mock behind it; background geofencing
  is deferred.
- **No calendar access.** Same, a seam only.
- **No contacts.** Friends are found by a user-typed handle.
- **No microphone, camera or photo library** on the shipping branch. See §2.
- **Nothing is sold or shared for anyone else's marketing.**

---

## 2. Capabilities that are coming, and what each one adds to this contract

Nothing here ships until its row is filled in and consented.

| Capability | Stage | New data | New permission | New disclosure |
|---|---|---|---|---|
| Media capture (`expo-image-picker`, `expo-audio`, branch `feat/native-media`) | MVP | Photos and voice notes attached to reflections | Camera, microphone, photo library, each with a purpose string | Where the file is stored, whether it is encrypted, whether it ever leaves |
| Saving or sharing a completion card | MVP | Writes an image the user chose to share | Photo library add | The card is generated on device |
| Push notifications for Mirror invitations and Inbox requests | MVP, blocked | A device push token, held server-side | Notifications | Token is an identifier, and changes this contract |
| Mirror contributor flow for non-users (web) | Future | A contributor with no account | None | A second privacy notice for a person who never installed the app |
| Location-aware reminders | Future | Coarse or precise location | Location, foreground first | Retention and precision must be stated |
| Calendar-aware planning | Future | Event titles and times | Calendar | Read-only, and titles must stay on device |
| Subscriptions | Commercial | Purchase records | None | Store billing, receipts, restore |
| Cloud sync and multi-device | Commercial | The whole local blob leaves the device | None | This is the largest single change to the promise in §0 and needs its own consent moment |

---

### The coach's memory, and what a user is actually agreeing to (2026-08-24)

Written down here because it is a consent, and a consent is agreement to *words*:

- The coach keeps **a few short lines** per Dream and per Journey — never the conversation, never a
  transcript, never a profile of the person, never a diagnosis.
- What may be kept is **bounded in code** (`core/coach/context/bounds.ts`), not by instruction: every
  line is truncated and every list is capped on the way in.
- It is written only from something the person **said** or a change they **approved**. Behaviour may
  shape a suggestion today; it never becomes memory.
- **The sentences a person writes stay on this phone; what the coach understood from them is kept
  with the account** (D77). So a new phone finds the coach still knowing them. What the server holds
  is protected by access control and our promise, not by encryption we could not break — the same
  trade D73 made for everything else in the account, and the consent text does not imply otherwise.
- Saying no costs nothing else, and is **never asked again** — only a material change to what we keep
  reopens the question, which is what the consent's version field is for.
- Turning it off **deletes** what was kept, rather than only stopping the next write.

Still to be formulated by whoever writes the legal text (the founder's instruction, 2026-08-24: build
it, and leave the legal wording for later): the jurisdiction-specific consent clauses, the AI
provider's no-training/retention terms as a disclosed sub-processor, and the export/correction
wording. None of them changes what the code does; all of them have to match it.

## 3. Sensitive categories that need extra care

1. **Goals about the body, food, mood or sleep** are health-adjacent, and in the EU reading they can
   be special-category data. The safest framing: we do not ask for health data, the user may volunteer
   it inside a free-text goal, and it stays in Group A.
2. **Addiction and relationships** are handled by handing off rather than planning
   (`sensitiveDomains.ts`). A goal in these domains is not parked and never becomes a Journey. The
   policy should say plainly that the app is not a clinical tool and does not diagnose.
3. **Birth date** identifies a person more than anything else we store, and it is currently in the
   plaintext blob. Fix, or stop asking for a full date and ask for a year or an age band.
4. **Free text is unbounded.** A person can type anything into a goal, a reason or a reflection.
   Every boundary must assume the worst-case content, which is exactly why redaction sits on the
   outbound LLM path and why the social layer sends summaries and not text.
5. **Data about someone who is not the user** (Mirror contributors, an Ally's own activity) cannot be
   deleted by the user as if it were theirs, and cannot be exported to them either.

---

## 4. The clauses the legal policy will have to contain

A checklist for whoever writes the real thing.

**The policy itself**
- Who the controller is: legal entity, country, contact address, a support email that a human reads.
- The categories of data, mapped one to one onto §1 above.
- The purpose of each category, in the user's language, not "to improve our services".
- The legal basis per purpose (contract, consent, legitimate interest) and which ones are consent.
- The list of processors and subprocessors by name: the backend host, the AI providers, the build and
  update service, the store platforms.
- International transfers and the region each processor runs in.
- The retention table (§5).
- Rights: access, correction, erasure, portability, objection, withdrawal of consent, complaint to a
  supervisory authority.
- Children: the minimum age, how it is checked, what happens if a younger user is found.
- Security: encryption at rest on device, encryption in transit, row-level security on every table.
- **An AI section**: which features call a model, what is sent, what is stripped first, that outputs
  are not advice, and that the provider does not train on the content.
- Automated decisions: the coach adapts a plan from behaviour. Say so, and say it is never a decision
  with a legal or similarly significant effect.
- How changes to the policy are announced.

**Store artefacts, separate from the policy**
- Apple Privacy Nutrition Label, per data type, with linkage and tracking answered from §1 and §Group E.
- Google Play Data Safety form, including the "is it encrypted in transit" and "can users request
  deletion" answers.
- A **publicly reachable account-deletion page** with instructions, which Apple requires in addition
  to the in-app path.
- Permission purpose strings for every capability in §2, written in the product's voice.
- A privacy policy URL live before the first submission.

---

## 5. Retention, proposed

| Data | Kept for | On deletion of the account |
|---|---|---|
| The local encrypted blob | Until the user deletes it | Wiped from the device, key destroyed |
| Profile blob | Until changed or deleted | Wiped |
| Server rows (`profiles`, `friendships`, `journey_allies`, `companion_steps`, `progress_snapshots`, `cheers`, `entitlements`) | Life of the account | Deleted, and the counterpart's view of a shared Journey collapses |
| Coach conversation content at the provider | Zero or short retention, to be contracted | Deletion propagation must be part of the contract |
| Mirror confidential raw answers | Seven days from synthesis or closure, proposed | Deleted; the de-identified synthesis is the user's and goes with the account |
| Mirror abuse evidence | Segregated, documented maximum | Retained under the abuse exception, and this must be said out loud |
| Tool derived summaries | Each tool's staleness rule | Deleted |
| Behavioural logs | A rolling window, still to be chosen | Deleted |

---

## 6. Decisions only the founder can make

1. **The controller.** Which legal entity publishes the app, in which country. Everything above hangs
   on this and nothing else can be finalised without it.
2. **The minimum age**, and whether to keep asking for a full birth date at all.
3. **The four Mirror blockers** still open in the PRD §18: raw-response backup expiry, the redaction
   provider and its region, the moderation process, and invitation delivery.
4. ~~**The AI terms.**~~ **SETTLED (2026-08-23).** The project runs on a PAID Gemini key, bought by
   the founder, and the paid tier's terms do not use content for training. This is the answer; it is
   recorded here so it stops being asked. What is still worth writing into the eventual policy is the
   provider's retention window and region — a detail of wording, not an open decision.
5. **The support contact** that goes in the policy and in the stores.
6. **The rolling window for behavioural logs.** How long the coach may remember a life minute by
   minute is a product decision, not an engineering one.

---

## 7. What has to be true in the product before submission

- [ ] The profile blob is encrypted, or the birth date stops being collected in full (§1 Group A gap).
- [ ] A consent moment exists for the coach, in the user's words, before the first message leaves.
- [ ] Separate contributor consent copy for Mirror's two modes.
- [ ] The in-app Delete account path is verified end to end, including the server rows.
- [ ] A public account-deletion page exists.
- [ ] A data export path, or a documented decision that there is none yet and why.
- [ ] Purpose strings written for every permission in §2 that ships.
- [ ] This document reviewed by security-privacy and store-compliance, then converted to legal wording.

---

*This is v0.1 and deliberately unfinished in the places where the answer is not ours to invent. Add
to it, do not replace it, and log any product decision it produces in `06_Decisions/Decision_Log.md`.*
