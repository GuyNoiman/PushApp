# Gap Register — what works, what does not, and how we know

**Status:** The single answer to "what actually works?". Living document — updated at the end of
every day, before the day's release. Opened 2026-09-16 because the founder said this:

> כבר מאוד קשה לי לעקוב אחרי אילו פיצרים באמת עובדים ואילו פערים עדיין קיימים.

**Last updated:** 2026-09-16, end of day — after **update 11** and the console redeploy.
**Code state:** `tsc` clean · 3344 tests / 319 suites green · published as **update 14** to both
channels (9 and 10 were never published — both failed at export, see Traps) · branch
`feat/buddy-3d-and-reminders`, pushed · console redeployed.

---

## Read this first: the six words, and the one that explains everything

Every row below carries exactly one verdict. The categories matter more than the rows.

| | |
|---|---|
| **WORKS** | Somebody used it on a real device and it did what it should. |
| **WORKS ON PAPER** | The code exists and the tests pass. **Nobody has ever seen it run on a phone.** |
| **PARTIAL** | Works on one path and fails on another. The failing path is named. |
| **BROKEN** | A specific, reproducible failure. |
| **MISSING** | Promised somewhere — a design, a document, a screen's own words — and absent. |
| **UNKNOWN** | We could not determine it, and why. |

**Almost everything in this product is WORKS ON PAPER, and that is the honest answer to why it feels
like we are not converging.** A green test suite proves that a function returns what the function
returns. It does not prove a person can do anything. We have 3095 tests and, for most of the
product, no record that a human being has ever completed the thing the tests describe.

That is not a reason to distrust the code — the tests were sampled and they exercise real behaviour,
not tautologies. It is a reason to distrust **our confidence**, which is what actually broke.

---

## The three documents that were lying to us

Found while auditing, and it is the root of the tracking problem rather than a side note:

- `Current_Context.md` stops at **2026-09-14**, and its own pointer chain still tells a reader to
  begin at 2026-09-01.
- `00_Foundation/CHANGELOG.md`'s last entry is decisions-only: "no code changed".
- `04_Product/Backlog.md` says "the single list" and was last updated **2026-09-03**.

Meanwhile the code is **five commits ahead of all three**. Two Backlog rows are stale in the
*flattering* direction — F-02 (the duration conflict) was fixed on 2026-08-25, and D-03 (the dead
Inbox compose) now navigates properly. So the register we were trusting was wrong about what is
broken AND wrong about what is fixed.

**From today this file is the answer to "what works", and it is updated before every release.**

---

## Blockers — a real user hits these on day one

| # | Gap | Verdict | Why it is first |
|---|---|---|---|
| ~~B1~~ | ~~The Terms link goes nowhere.~~ **FIXED 2026-09-16** — deployed and verified live (HTTP 200 at `pushapp-invite.expo.app/terms.html`). | **WORKS** | Was on the mandatory account screen under a sentence saying continuing agrees to it. The page still carries a `{{PRODUCT_NAME}}` placeholder and three blanks awaiting the founder (legal entity, contact address, governing law), and §13-14 still need a lawyer before any store submission. |
| ~~B2~~ | ~~A linked Step cannot be marked done by tapping.~~ **FIXED in update 11**: doing the thing closes the Step (profile saved, Tool opened, friends visited, a Journey built with the coach), through the same check-in a manual Done uses; the row's ⋯ still opens the report sheet. | **WORKS ON PAPER** | Device check is S7b on the test page. **Watch for:** when the last Step closes away from Home, the Journey-completion screen may open on top of that screen. |
| **B3** | **Today's rewritten first run has never run on a phone.** Language → welcome → purpose → prepare → account → introduction → handoff → first Journey. | **WORKS ON PAPER** | Every link in the chain shipped today. This is not a code fix; it is a person with a phone, and it will find things. |

---

## By surface

### First run

| Feature | Verdict | Detail |
|---|---|---|
| The seven screens + language step | **WORKS ON PAPER** | The test is genuinely behavioural: real i18next, both languages, real buttons, real copy, pager 1..7. No device pass. |
| Mandatory account (D104) | **PARTIAL** | A build that can sign nobody in (web, Expo Go, jest) shows an escape that advances with **no session**. Deliberate — it would otherwise trap somebody forever — but "everyone has a real account" is therefore not absolute. |
| Terms link | **WORKS** | Deployed and verified live on 2026-09-16. Still carries the name placeholder and three blanks awaiting the founder. |
| Per-screen analytics | **WORKS ON PAPER** | Update 11: every step records once per install; the console's KPI tab shows the funnel with the loss between steps. Events wait until the anonymous session exists, so the first screen is not lost. |
| Sign-in measurement | **WORKS ON PAPER** | Update 11: attempted / succeeded / cancelled / failed per provider, failure by a closed reason from the error's type. **From here, whether sign-in works is visible in the console instead of unknown.** |
| Analytics consent | **BROKEN — blocks the pilot** | security-privacy review, 2026-09-16. The app sends KPI events from every build with no consent, while **our published Privacy Policy says there is no analytics** (§1, §4) and the Privacy Contract says "no tracking". The events ARE linkable to a signed-in account in practice (timestamp join between `sign_in_succeeded` and `auth.identities`; the database owner bypasses RLS). EU needs opt-in for storing the device id; UK (from 5 Feb 2026) and probably Israel accept notice + opt-out — lawyer to confirm. **Recommended: opt-in asked once on the welcome screen, events held in memory until the answer, a Settings switch to withdraw.** Founder decision pending. |
| Privacy Policy accuracy | **BROKEN** | Same review. Beyond analytics: §3.3 says anonymous use needs no identifier (every install has an id and an anonymous user; also contradicts D104 and the Terms); Supabase is missing as a processor; no retention rows for `kpi_events`/`runtime_installs`, and `runtime_installs` is never deleted; account deletion does not remove either table's rows although §7 says it deletes "your rows". Exact replacement wording is in the review. |
| `kpi_events` can be written by anyone | **PARTIAL** | Insert policy is `with check (true)` with unconstrained text columns and anonymous sign-in on, so anyone holding the public key can write fake rows. Low severity (the console never renders raw HTML), but funnel numbers can be forged. |
| Intro Journey content | **WORKS ON PAPER** | Update 11: the approved four Steps, verbatim in both languages. Active Hours moved into Personal Details. The old three-Step Journey on the test phones still finishes. The Settings tab also still has its own Active Hours row (not removed; founder said where they belong, not to remove the row). |

### The coach

| Feature | Verdict | Detail |
|---|---|---|
| The introduction (Portrait conversation) | **WORKS ON PAPER** | Shipped today. Strong tests: proves it never touches a DomainExpert, never enters diagnosis, builds no Journey. **No real Gemini call through the real proxy on a real phone has ever produced a multi-turn conversation in this shape.** |
| Coach states a false limitation | **SHIPPED, update 13** | Every composing prompt states the coach speaks English and Hebrew and forbids invented limits; writing in, or asking for, the other language switches the conversation (refines D101). **Still open:** after a switch the answer cards stay in the app language. |
| Closed cards after a non-goal first message | **SHIPPED, update 13** | First no-goal message: answered, goal re-invited in free text. Only a second in a row shows the habit-or-process card. **Open for product:** that card inside the INTRODUCTION is a planning question. |
| The introduction on a real phone | **WORKS, with flaws — partner, 2026-09-17** | First device evidence: the partner ran the introduction in English and in Hebrew. The English conversation read as largely correct (founder: needs wording and tone rules, to come). **Promoted from WORKS ON PAPER.** |
| One language per coach turn | **SHIPPED, update 14** | Copy feeding a turn is resolved in the conversation language; a composed turn in the wrong or mixed language is dropped for the ready-made line (no extra call). Option cards stay in the app language. Needs a re-run of the partner's flow: Android, app in English, conversation in Hebrew. **Known fallback:** a Hebrew turn quoting 4+ English words in a row falls back to the ready-made line. |
| Introduction screen header | **SHIPPED, update 14** | "Your coach · Introduction" / "המאמן שלך · שיחת היכרות" per design §5; planning keeps "New plan". |
| The understanding check + rebuild-on-correction | **WORKS ON PAPER** | Tested as behaviour, including that "I want to clarify" genuinely re-reads rather than acknowledges. |
| Journey-building conversation | **PARTIAL** | Stage 1 shipped in update 12: opens by quoting the Portrait's want and does not re-ask the four questions it answers. Still re-routes an explorer through job-search diagnosis (Stage 2). |
| Career routing to authored Journeys | **PARTIAL** | Only the job-search diagnosis tree runs. 12 of 27 career Journeys (the "find a direction", "two options", "fit test" and "return after rejection" families) are unreachable, so someone who wants out of their field but does not know what next gets the generic arc. The partner already authored the missing routing rule and its copy. Plan Stage 2. |
| Offline refusal | **WORKS ON PAPER** | A session-less coach says so rather than inventing a Journey from raw text. Pinned by a test written after that regression bit us once. |
| Cost measured server-side | **WORKS ON PAPER, UNDEPLOYED** | Migration 0019 written and unapplied; console card undeployed. **We still cannot answer "what does a conversation cost".** |
| Persisted conversation budget | **WORKS ON PAPER** | Shipped today. |

### Journeys, Steps, Home

| Feature | Verdict | Detail |
|---|---|---|
| Journey creation wizard | **WORKS ON PAPER** | Duration correctly capped at 60 days. |
| Step reporting, ordinary Steps | **WORKS ON PAPER** | The sheet and its postpone path are tested. |
| Step reporting, linked Steps | **WORKS ON PAPER** | B2 fixed in update 11. |
| The five Journey types | **MISSING** | `Rhythm` has three values. Avoidance is deferred (D99); critical-compliance and hybrid have no model at all. **A Journey whose success is "don't do X" cannot be expressed.** |
| Home's popup priority | **PARTIAL** | The pieces are tested; the "only one major popup per app-open, in the right order" behaviour across all three is not, and depends on real foreground transitions. |
| Step deep links | **WORKS ON PAPER** | Shipped today, from Home and Journey detail. Guarded by a test that checks the real route tree. |

### People — Allies and the Support Circle

| Feature | Verdict | Detail |
|---|---|---|
| In-app activity feed | **WORKS ON PAPER** | Only human-caused events; no fabricated nudges. |
| **Push for a cheer or a nudge** | **MISSING, PLANNED** | The only push in the product is your own reminders. **If an Ally cheers you and the app is closed, you never find out.** Founder decided 2026-09-16 that it ships. Plan: `04_Product/Push_Notifications_Plan_2026-09-16.md`. It needs NEW NATIVE BUILDS (not an over-the-air update), Firebase and APNs credentials only the founder can create, and a Privacy Policy change, because the policy today promises we hold no push token. |
| Remove / block / report a friend | **MISSING** | No gateway methods exist. |
| The in-app cheer notification that exists today | **BROKEN** | Found 2026-09-16 while planning push. `SocialProvider.tsx` fires a local notification on every realtime cheer while the app runs, and it ignores the cheer and nudge switches and Active Hours, is hard-coded English with an emoji, and calls `setNotificationHandler`, which REPLACES the handler `ReminderEngine.init()` installed. So after the first cheer, the rule that hides the aggregate reminder while the app is open stops working. Fixed as step 6 of the push plan, by one handler that owns every notification. |

### Everything else

| Feature | Verdict | Detail |
|---|---|---|
| Google sign-in on Android | **WORKS — partner, 2026-09-17** | After the founder created the Android OAuth client (project 872942140221, package `com.guynoiman.pushapp`, EAS keystore SHA-1), the partner passed the mandatory account step and ran the introduction. **When the app moves to Google Play, Play App Signing's SHA-1 must be added the same way.** |
| Sign-in error shown to the person | **SHIPPED, update 12** | A human sentence with Try again replaces the raw library text on both sign-in screens; DEVELOPER_ERROR is detected by status code and sent to Sentry by name. |
| Language direction on first run | **SHIPPED, update 12** | Causes: Android reports Hebrew as `iw` (unrecognised), and `_layout.tsx` re-allowed RTL at every launch, so English stayed mirrored even after a restart. Both fixed; the first-run language step restarts without a dialog and resumes on welcome. Needs a device check on a Hebrew Android phone. |
| No way past a failing provider | **OPEN QUESTION** | D104 makes the account mandatory, and the only escape is for builds where no provider exists at all. A provider that exists but fails (a config error, an outage) leaves the person with no way forward. Founder to decide whether a failure should ever allow continuing. |
| Sign-in with Apple | **UNKNOWN** | One real backend error was hit and fixed on 2026-09-07. No record yet of a successful Apple sign-in end to end; the founder's own device test (S1) will settle it, and it now shows in the console's sign-in card. |
| Local reminders firing | **WORKS ON PAPER** | Scheduler tested. **No evidence a notification has ever fired and been seen on a phone** — the classic thing that passes unit tests and dies on OS permissions. |
| Active Hours default 09:00–21:00 | **WORKS ON PAPER** | New accounts only; installed phones keep what they have. |
| **Account restore on a new device** | **BROKEN — confirmed on the live project, 2026-09-17** | Read-only check: `account_state` has **0 rows**, so no account has ever been backed up; 0 triggers on `auth.users`; 2 real users (one with no `profiles` row), 24 anonymous users. The backup check was spent on the anonymous launch session, the gateway cached that anonymous id, and backups need a `profiles` row nothing created. The promise in the Privacy Policy that an account survives a lost phone has never been true. Fix built (Stage 0, migration 0020 unapplied); plan: `04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md`. |
| **Sign out leaks into the next account** | **BROKEN — found 2026-09-17** | Settings › Sign out ends the session but leaves every local record; if a different account then signs in, the previous person's Journeys are kept and backed up into that account. Plan Stage 1. |
| Switching test users | **PLANNED** | Founder request: username-only accounts during development, a Create/Sign-in screen before onboarding, Apple/Google distinguishing new from existing. Temporary username path behind a server switch; code removed before any store submission. |
| Data export | **WORKS ON PAPER** | Good defensive pattern — it caught a real privacy bug once (Tool data surviving a "delete"). No device pass on the share sheet. |
| Account deletion | **WORKS ON PAPER** | No record of a real account ever deleted against the live backend. |
| Tools (14 screens) | **UNKNOWN** | Each has a tested model. **No evidence any of the 14 has been opened on a device**, and nothing records which are finished rather than a generic arc. |
| Dreams | **WORKS ON PAPER** | |
| Buddy | **MISSING BY DESIGN** | Archived under D45 — the coach, not an avatar, is the MVP's centre. The engine still produces XP and levels. **Confirm this is still intended**, because a staged-Future decision quietly becomes "why doesn't the Buddy do anything". |
| Encryption recovery | **MISSING** | Device-key only. Unreadable data has no recovery tool; "start fresh" destroys the copy. |
| Tester tools (temporary) | **TEMPORARY — REMOVE BEFORE REAL USERS** | Founder's request, 2026-09-17, to judge whether the introduction builds a good Portrait. Hidden unlock: tapping Settings › About 7 times in quick succession turns tester tools on (7 more turns them off), with a short notice; one local AsyncStorage key (`pushapp.testerTools`), cleared by an account wipe. When on, a "Tester tools" section at the bottom of Settings opens "Portrait (tester view)": every Portrait field as stored (`value`, `confidence`, `source`, `updatedAt`), `portraitHandoffUsedAt`, and the raw object as selectable JSON (no clipboard package is installed, so there is no copy button). **A deliberate exception to D111**, which keeps the Portrait out of the UI; an ordinary pilot user never sees it. Removal steps are in the header of `app/src/state/TesterTools.ts`. |
| Voice input | **MISSING** | Approved screen 3 says "אפשר לכתוב או לדבר בקול". Founder has deferred it past MVP — **so the screen currently promises something we have decided not to ship.** |

### What we cannot see

Only Journey and Step events, plus `onboarding_completed`, reach the console. **Not** instrumented:
sign-in success or failure · per-onboarding-screen progression · coach conversation completed
versus abandoned · every social action. Which is to say: the surfaces we most need to watch this
week are exactly the ones we are blind to.

---

## The week, if the goal is real users

**Honest answer: not ready for strangers; ready for a small, warned pilot.** A store submission is
not this week — no Play Console, no legal entity, no support email, Sentry never verified against a
real device payload.

Three things stand between here and a pilot, and only one of them is a code fix:

1. ~~**B1**, the Terms deploy.~~ **Done today.**
2. **B2**, a linked Step that can be reported. A day, the way the founder chose it.
3. **B3**, one real device through the whole new first run, written down. Not a test — a person with
   a phone. **This is the one that takes the time and the one that will find things.**

### How we work from here

**A release at the end of every day**, even when one thing went in. The cadence is what restores
control, not the size of the drop.

**Three sentences a day:** what went in · what was verified on a device · what is still not working.

**And no more single gaps surfaced mid-day** unless one blocks the founder. Everything lands in this
file, and he reads it once a day.

---

## Related

- `04_Product/Onboarding_Completion_Plan_2026-09-15.md` — the sequencing this register measures.
- `06_Decisions/Decision_Log.md` — D99 through D111.
- `04_Product/Backlog.md` — **stale since 2026-09-03**; reconcile or retire it.

---

## Traps found today — so nobody falls in twice

- **Jest green is not "it bundles".** Updates 9 and 10 failed at `expo export` with "Unable to resolve
  module ./journeys/linkedStepClosing" while all 3189 tests passed: watchman's file map was stale (it had
  been warning "Recrawled this watch" all day) and did not know a new file existed. Fix: `watchman
  watch-del` + `watch-project` on the repo, clear the Metro cache. The publish tool still advanced its
  counter on each failed attempt, which is why the phones jump from 8 to 11.
- **A console change does nothing until the console is redeployed** — done today for the funnel cards.

