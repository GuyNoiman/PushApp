# Full status report — every issue raised, and where it stands

Status: **Living report — last refreshed 2026-08-18, late session.** Compiled at the founder's request because the earlier
in-chat table covered only the issues raised in that conversation and omitted the findings from his
own device walkthrough on 2026-08-17.

Sources merged here: `04_Product/Device_QA_2026-08-17.md` (the walkthrough — A1–A7 / B1–B3 / C1),
`04_Product/Session_Handoff_2026-08-17_18.md` PART 4–5, and the 2026-08-18 build session.

**How to read the status column.** *Fixed* means the code changed and a test or a direct code read
confirms it. *Fixed, needs your eyes* means the code changed but nobody has seen it on a device.
*Open* means nothing has been done. *Changed differently* means it was addressed in a way that does
**not** match what you asked for — read those rows first; they are the ones most likely to surprise you.

---

## 1. From your device walkthrough (2026-08-17)

| # | What you found | Status |
|---|---|---|
| **A1** | "Milestone N of M" showed different numbers on different screens — a Milestone you never approved | **Fixed.** One shared derivation; a test asserts both screens agree on one fixture. |
| **A2** | Progress read 0% after a Step was reported done | **Fixed.** The cause was a mutated array re-exported by identity, so nothing recomputed. |
| **A3** | The keyboard covered the field being typed into | **Fixed**, one shared approach across eight screens. |
| **A4** | A Journey for "drink a protein shake daily" produced generic wellness Steps | **Fixed 2026-08-18** — the deepest fix in this report. Your words are the plan now. |
| **A5** | One daily action produced many Steps you never asked for | **Closed.** The Steps are your own action now, and you confirmed that a repeated action repeating its name is right as long as the essence holds. The one-Step-per-active-day model stays; §4 is kept as background, not as an open question. |
| **A6** | Odd visual state on a completed Step after swiping | **Fixed, needs your eyes.** Completed cards were reworked to keep their identity and width. No screenshot was ever attached, so nobody can confirm it is the same thing you saw. |
| **A7** | "Couldn't load your Support Circle" on a fresh install | **Fixed.** The retry line is shown only to a user who has a profile — nothing had failed, there was simply nothing to load yet. The load still runs and still records a genuine failure. |
| **B1** | Sign-in opened the Coach; you decided it should land on Home | **Done.** |
| **B2** | A fresh install already had Journeys and Steps you never created | **Done.** The demo seed is off in every real build, so a new install is empty. **But** what is already stored on YOUR device stays until you delete it — per-Journey delete is on the Journey detail screen. |
| **B3** | The ⋯ menu on Journey detail was in the wrong place; you said move it next to Edit | **Changed differently — please confirm.** The ⋯ was **removed entirely** rather than relocated: Pause/Resume, Share, Cancel and Delete are now four visible full-width buttons at the end of the list. The recorded reasoning was that hiding two actions on a screen whose whole job is managing a Journey is the wrong kind of quiet. **That is not what you asked for.** If you still want a ⋯ next to Edit, say so. |
| **C1** | Birth date should be a picker, not typed | **Open — but NOT waiting on you.** You asked why it needed your approval; it did not. It will be built from existing primitives, with no new native dependency. |

---

## 2. From the 2026-08-18 conversation

| What you raised | Status |
|---|---|
| The plan doesn't fit what I asked for | **Fixed.** A plan has a shape; a repeated goal gets your own words, repeated, and no Milestone arc. |
| Three different definitions of "total steps" | **Fixed.** One shared count — a Journey can no longer read 80% on screen and print a different number on its completion card. |
| Double-flipped right-to-left inputs | **Fixed** (inbox, friends — the last two). |
| Reminder copy ignoring language and style | **Fixed.** It goes through the same builder as every other reminder, and stops putting the Step title on the lock screen. |
| "See past reasons" built but unreachable | **Fixed.** Offered from the reason sheet, and only once there is history to look at. |
| Orphan components | **Fixed.** Six deleted, one revived. |
| Tests that fail at night | **Fixed, and proved** — pinning the clock to 23:55 makes four postpone tests fail outright. |
| Wizard 08:00 vs engine 09:00 | **Fixed.** The time comes from the plan, then from your Active Hours. |
| Onboarding answers collected and never used | **Fixed.** They choose the approach; two users who answer differently get different plans. |
| No feedback at the end of a Journey | **Built.** Three hosts: completion, cancellation, quiet death. |
| Plan content in English for a Hebrew user | **Fixed.** The translation cache (D55) ships Hebrew and English; the frame is translated and your own words are inserted after, never through the translator. |
| "Two other ways" + variants for a process goal | **Split.** The "two other ways" screen is **decided away (D63, 2026-08-18 later)** — you ruled that a guiding question picks the version and the alternatives are not shown. Variants for a PROCESS goal: your one process goal is still generic, but this is **no longer a decision waiting on you** — your own rule settles it (a set of Milestones IS a Journey; a variant never changes Milestones), so a different arc is simply another Journey in the library. What is left is authoring those Journeys. |
| Separate questionnaires (abandonment, motivation, prior experience) | **Open.** |
| The coach assumed every Journey is two months | **Fixed.** It now asks, with "no fixed end" as a real answer rather than a polite way of saying eight weeks. |
| The Gemini key was inlined into the app bundle | **Fixed in code, awaiting your deploy.** It lives in a Supabase Edge Function with a 2 MB per-user cap and no cap for you. Four commands in `app/supabase/functions/gemini-proxy/DEPLOY.md`. |
| The reporting button at the bottom of the Journey screen | **Removed.** Home is where the day's work is reported; this screen manages the Journey. Swiping a Step row still reports it. |

---

## 3. Previously-open defects, re-checked

**Closed on 2026-08-18:** the three definitions of total steps · the last double-flipped inputs ·
`AppCore.postponeReminderCopy()` · the two clock-dependent suites · the orphan components.

**~~Blocked on one decision from you:~~ NO LONGER BLOCKED (2026-08-18, later).** This paragraph asked
whether the library's authored arcs replace the expert's or shape movement through the expert's arc.
The founder rejected the question rather than answering it, and he was right to: by his own rule a set
of Milestones IS a Journey, so an arc that differs is a different **Journey**, never a variant. The
expert's hardcoded arc is Journey #1 for its goals. What remains is content — authoring several process
Journeys per goal and having the expert select from the library — plus ingesting the partner's content
under our terminology and language rules first.

**Still open:** Home's scroll-to-top is unverified on device · an Ally sees a paused Journey **silently
vanish** instead of a status (needs a privacy decision — `Open_Questions_For_Founder.md` §3.1).

**Release gates** (not bugs — they block a public build): no privacy policy · **the Gemini key is
inlined into the client bundle** (being fixed now) · authenticated encryption designed, not implemented ·
no recovery tool for quarantined data · `delete-account` written but never deployed · Support Circle
authorization never tested against the live database with two real accounts.

---

## 4. The one item here that is a decision, not a bug

**A5, stated honestly.** A recurring Journey works today because the Planner creates **one Step per
active day** — a 56-day daily Journey is about 54 Step rows, and progress reads "12 of 54".
`Step.cadence` was stored but nothing ever generated repeats from it, so this was the only way to make
a daily goal actually recur without rebuilding the model.

The cleaner design is ONE recurring Step with a log of occurrences. It reads far better ("12 days in a
row" instead of "12 of 54") but it touches every surface in the app: progress, status, reminders, the
weekly review, and what an Ally sees. **This is your call, not an oversight.**
