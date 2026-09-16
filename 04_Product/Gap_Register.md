# Gap Register — what works, what does not, and how we know

**Status:** The single answer to "what actually works?". Living document — updated at the end of
every day, before the day's release. Opened 2026-09-16 because the founder said this:

> כבר מאוד קשה לי לעקוב אחרי אילו פיצרים באמת עובדים ואילו פערים עדיין קיימים.

**Last updated:** 2026-09-16, after update 8 and the landing deploy that closed B1.
**Code state:** `tsc` clean · 3095 tests / 294 suites green · published as **update 8** to both
channels · branch `feat/buddy-3d-and-reminders`, pushed.

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
| **B2** | **A linked Step cannot be marked done by tapping.** The tap is spent navigating, so the report sheet is unreachable; only the swipe reaches it, and the swipe is invisible on device. | **BROKEN** | 3 of the intro Journey's 3 Steps are linked. So a brand-new account's **entire** first Journey cannot be completed by any visible means. Founder has chosen the fix: the action itself closes the Step. |
| **B3** | **Today's rewritten first run has never run on a phone.** Language → welcome → purpose → prepare → account → introduction → handoff → first Journey. | **WORKS ON PAPER** | Every link in the chain shipped today. This is not a code fix; it is a person with a phone, and it will find things. |

---

## By surface

### First run

| Feature | Verdict | Detail |
|---|---|---|
| The seven screens + language step | **WORKS ON PAPER** | The test is genuinely behavioural: real i18next, both languages, real buttons, real copy, pager 1..7. No device pass. |
| Mandatory account (D104) | **PARTIAL** | A build that can sign nobody in (web, Expo Go, jest) shows an escape that advances with **no session**. Deliberate — it would otherwise trap somebody forever — but "everyone has a real account" is therefore not absolute. |
| Terms link | **WORKS** | Deployed and verified live on 2026-09-16. Still carries the name placeholder and three blanks awaiting the founder. |
| Per-screen analytics | **MISSING** | Only `onboarding_completed` exists. We just shipped the riskiest onboarding change to date — an account wall — with **no way to see whether it costs us signups.** |
| Intro Journey content | **PARTIAL** | Three Steps; the approved design has four. The missing one is the friends area. |

### The coach

| Feature | Verdict | Detail |
|---|---|---|
| The introduction (Portrait conversation) | **WORKS ON PAPER** | Shipped today. Strong tests: proves it never touches a DomainExpert, never enters diagnosis, builds no Journey. **No real Gemini call through the real proxy on a real phone has ever produced a multi-turn conversation in this shape.** |
| The understanding check + rebuild-on-correction | **WORKS ON PAPER** | Tested as behaviour, including that "I want to clarify" genuinely re-reads rather than acknowledges. |
| Journey-building conversation | **WORKS ON PAPER** | Unchanged today by design, and guarded by a regression test. |
| Offline refusal | **WORKS ON PAPER** | A session-less coach says so rather than inventing a Journey from raw text. Pinned by a test written after that regression bit us once. |
| Cost measured server-side | **WORKS ON PAPER, UNDEPLOYED** | Migration 0019 written and unapplied; console card undeployed. **We still cannot answer "what does a conversation cost".** |
| Persisted conversation budget | **WORKS ON PAPER** | Shipped today. |

### Journeys, Steps, Home

| Feature | Verdict | Detail |
|---|---|---|
| Journey creation wizard | **WORKS ON PAPER** | Duration correctly capped at 60 days. |
| Step reporting, ordinary Steps | **WORKS ON PAPER** | The sheet and its postpone path are tested. |
| Step reporting, linked Steps | **BROKEN** | B2. |
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
| Sign-in (Apple, Google) | **UNKNOWN** | One real backend error was hit and fixed on 2026-09-07 — the only evidence anybody has ever attempted it. **No record of a successful end-to-end sign-in with either provider.** Needs the founder's own Apple ID. |
| Local reminders firing | **WORKS ON PAPER** | Scheduler tested. **No evidence a notification has ever fired and been seen on a phone** — the classic thing that passes unit tests and dies on OS permissions. |
| Active Hours default 09:00–21:00 | **WORKS ON PAPER** | New accounts only; installed phones keep what they have. |
| Data export | **WORKS ON PAPER** | Good defensive pattern — it caught a real privacy bug once (Tool data surviving a "delete"). No device pass on the share sheet. |
| Account deletion | **WORKS ON PAPER** | No record of a real account ever deleted against the live backend. |
| Tools (14 screens) | **UNKNOWN** | Each has a tested model. **No evidence any of the 14 has been opened on a device**, and nothing records which are finished rather than a generic arc. |
| Dreams | **WORKS ON PAPER** | |
| Buddy | **MISSING BY DESIGN** | Archived under D45 — the coach, not an avatar, is the MVP's centre. The engine still produces XP and levels. **Confirm this is still intended**, because a staged-Future decision quietly becomes "why doesn't the Buddy do anything". |
| Encryption recovery | **MISSING** | Device-key only. Unreadable data has no recovery tool; "start fresh" destroys the copy. |
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
