# Session Handoff — 2026-08-17/18

Status: **Authoritative handoff for this session.** Written because session memory is filling. Anyone
picking this up should read this file after `AI_Start_Here.md` → `Current_Context.md`.

Two things happened this session: the app ran on a **real device for the first time**, and the founder
articulated **the product's core architecture** in a way that reframes most of what is still unbuilt.
The second matters more than the first.

---

# PART 1 — THE ARCHITECTURE (the most important section)

The founder's own framing, 2026-08-17/18. This is not a feature. In his words: **"This is the essence
of the app. This is its uniqueness."**

## The purpose, stated as three sentences

> We need to know the user well enough to send **few** notifications, but ones that actually move them
> to action.
> We need to know them well enough to build a plan that genuinely fits them.
> We need to know them well enough to speak in a language that makes them comfortable.

**This inverts the usual metric.** The system is judged on **action per interruption** — never on
engagement, retention, or send volume. Sending *less* while achieving *more* must be a win by
construction. A learning loop that maximises completion will drift toward recommending easy Journeys;
that is engagement optimisation wearing a growth costume, and it is forbidden (CLAUDE.md §3.4).

## Layer 1 — the user profile

Not a thin matching vector. It must know:
- **how to address** the user,
- **what motivates** them,
- **what makes them abandon** plans.

The third is the one we half-collect today (the reason log) and never use.

## Layer 2 — the Journey library

**Several Journeys per goal or Dream, not one.** This is the point most easily missed: without variants
there is nothing to compare, and **without comparison there is no learning**. Today the app produces one
fixed arc per domain, which makes it not merely generic but **structurally incapable of learning**.

Quality is measured from:
- how many users **persisted**,
- **to what stage** they persisted (a drop-off curve, not a binary),
- how many **finished**,
- and **end-of-Journey feedback from the user** — did it help, and a rating.

**That feedback is the label on the training data.** Without it we have outcomes but no ground truth:
we can see someone stopped in week 3, but not whether the Journey was bad or life intervened. It does
not exist in the product today.

## Layer 3 — the matching layer

A Journey good for one kind of person may be bad for another. The founder's own example is the shape to
design for:

> "Journey A is very good for task-oriented people with at least 6 hours a week, but not good for people
> with fewer hours."

So a Journey's fitness is **conditional on user attributes**, and the system must **discover those
conditions from outcomes** rather than have an author declare them.

## Future layer — marketplace

Coaches upload workshops that **enrich the expert agents' knowledge**. Not to be specced now, but
nothing built now may make it harder — notably, template provenance and licensing should be modelled
from the start rather than retrofitted.

## The data boundary (founder decision, "I am in favour of working like Spotify")

- **The plan library is our data.** Not client data at all. Storing it centrally is fine.
- **Progress and personal details never leave the device.**
- **A defined structure of coarse, non-sensitive parameters may leave**, to learn and improve, encrypted.

Spotify was the reference deliberately: their collaborative filtering is server-side and listening
history does leave the device. The asymmetry to hold on to — **their leaked data is a listening history;
ours would be what someone is trying to change about their life.** That is why our allowlist is stricter,
not looser.

## Where this is written up
- `04_Product/PRD/Plan_Library_and_Learning_PRD.md` — the architecture PRD. Decision Log **D52**.
- `05_Research/User_Matching_Parameters_Research_2026-08-17.md` — which parameters to match on.

**Both were still being widened to this three-layer framing when the session ended. Verify they contain
Layers 1–3, the end-of-Journey feedback label, and the marketplace constraint before treating them as
complete.**

---

# PART 2 — THE FINDING THAT MATTERS MOST

**The founder's verdict on the app as it stands: "So far the plan that was built for me didn't help me
at all."**

He asked for *drink a protein shake daily*. He received Steps about walking at a comfortable pace,
stretching, and eating meals at regular times.

**Cause, confirmed in code:** `app/src/core/learning/experts/BodyImageExpert.ts` holds a hardcoded
`STEP_TITLES` table — four Milestones × three Steps, written in advance. The goal routed to the
body-image expert, which emitted its fixed arc. The user's actual request never reached the content.

The experts are not purely templates — they do run an interview, assess feasibility, and decide whether
Milestones help. But **they select from a closed menu; they never author.** Answers change *how many*
and *how intense*, never *what*.

The partner's own QA rule says: *if you can swap the user's name and the Journey barely changes, it is
too generic.* **Our code does not "barely" change — it is identical for every user in a domain.**

**The partner's content is NOT wired.** `src/core/coach/experts/` does not exist; the real experts live
in `src/core/learning/experts/` and are ours. `10_Partner_Coaching_Content/` is reference only.

**The fix is Layer 2, not a patch to the experts.** Patching the templates now builds something the
library will replace. The PRD's "Stage 0" — a library of authored variants with no outbound data at all
— fixes this **with no backend, no privacy change and no consent required**, and is the single highest-
value next piece of work.

---

# PART 3 — FIRST REAL-DEVICE RUN

## Setup completed
- Apple Developer account live. **Team ID `8GRPJ6352N`, Individual.**
- App identity set: name **PushApp**, slug `pushapp`, scheme `pushapp`, bundle id
  **`com.guynoiman.pushapp`** (deliberately founder-named, not product-named, so a rename does not
  strand it). Free to change until the first App Store submission.
- EAS project `guynoiman/pushapp`, id `4505f207-aaec-48fc-95f7-039d72c1ec29`. `eas.json` has four
  profiles including a simulator one.
- Env vars pushed to the EAS `development` environment via a script that never printed a value:
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (plaintext — the anon key is public by
  design), `EXPO_PUBLIC_GEMINI_API_KEY` (sensitive), `EXPO_PUBLIC_ADAPTIVE_COACH`.
- **Encryption export declaration: answered "no non-exempt encryption"** (`ITSAppUsesNonExemptEncryption:
  false` in `app.json`). Chosen to avoid committing to annual US self-classification reports for what is
  most likely ancillary cryptography. **Reversible, and must be properly determined before submission.**
- Build ran, installed, Developer Mode enabled, app launched against Metro.

## Build-size finding
The first archive was **258 MB**. Source was only ~52 MB compressed, so the likely cause is that
`node_modules` was uploaded — the EAS root (`app/`) is not the git root, so there was no ignore file to
obey. `app/.easignore` now exists. **Watch the next build's reported size: ~2–3 MB confirms it; ~130 MB
means something else is still being pulled in.**

Separately, per the founder's rule that *nothing Future should take up space*, **261 files moved to
`12_Future_Assets/`** (git mv, zero deletions): the 63 MB of 3D creature assets, the Buddy and Shop
screens and components, the species registry, the archived screens, and the ingest tools. Five
dependencies removed (`@react-three/fiber`, `three`, `@types/three`, `expo-gl`, `upng-js`). App source
went 69 MB → 5.2 MB.

## Networking gotcha, for next time
An **iPhone Personal Hotspot does not work** for this: the host phone's own traffic goes out over
cellular, so it cannot reach its own clients. A hotspot from a *third* device is fine. A tunnel profile
(`pushapp-device-tunnel`) is configured for awkward networks. The Mac's LAN IP changes per network —
prefer pull-to-refresh in the dev client over typing a URL.

---

# PART 4 — DEFECTS FOUND AND FIXED

All verified green at session end: **`tsc` clean · `eslint` 0 errors · `jest` 1502 passing / 145 suites**
(from 969 at session start).

## Live bugs found while building something else

1. **The encryption key was very likely derived from `Math.random()`.** `randomBytesHex` silently fell
   back when no CSPRNG was present, and no polyfill was installed. Node's real CSPRNG under jest hid it
   completely. Now sourced from `expo-crypto`; the weak fallback was **deleted, not improved** — it
   throws instead, because silently degrading cryptographic randomness is worse than failing loudly.

2. **An unreadable local store was indistinguishable from a first run**, so a decrypt failure started the
   app empty and the next save **overwrote the still-intact ciphertext**. `Repository.load()` now returns
   a typed result; unreadable data is quarantined byte-for-byte and saves are locked. Restoring the old
   behaviour fails 13 of the 22 new tests.

3. **Account deletion raced its own in-flight save**, leaving ciphertext with no key. Hidden by (2) until
   (2) was fixed.

4. **Frozen and completed Journeys were still published to Allies.**

5. **A paused Journey's Steps still appeared on Home and in weekly planning** — every "is it running"
   gate was written as a negation. All now one positive predicate.

6. **"Milestone N of M" had two sources.** Home read real `journey.milestones`; the Journeys tab computed
   `min(4, totalSteps)` and labelled it "Milestone". The founder's reaction was the diagnosis: *"I never
   saw or approved any Milestone."* Now one shared `core/util/milestones.ts`, with a test asserting both
   screens agree on the same fixture.

7. **Progress read 0% after a Step was completed.** Not rounding — `checkInStep` mutates in place and
   `getSnapshot()` re-exported the same array reference, so memos never recomputed. Also affected My
   Dreams and the return screen.

8. **Swiping LEFT marked a Step done.** The gesture library reports *which way the row moved*, not which
   panel appeared; the code read it as the panel. Incidentally proved the founder's device was **not in
   real RTL** despite a Hebrew UI — the flag needs a restart.

9. **Reminders never fired, for three independent reasons:** the coach path never created a reminder rule
   at all; permission was only requested in two places; and the permission cache reset to `false` on every
   cold start, so a user who had granted permission months earlier had **nothing scheduled, silently**.

10. **RTL root cause.** RN only applies its alignment swap when `textAlign` is set explicitly; `ThemedText`
    set none, so iOS fell back to the app bundle's localization (English) and pinned every unstyled string
    left. One component fix resolved all four of the founder's reports. A second, opposite bug fell out:
    eight places written as `isRTL() ? 'right' : 'left'` **double-flip**, because RN mirrors an explicit
    value itself.

## Features completed this session
Friend Profile + remove friend · Future Journey Management (core + UI; you can now create one) · Journey
cancellation end to end · Communication style finally reaching notification copy · the Weekly Review
actually running in production (it was gated behind a flag that is off in every build) · four orphaned
routes archived · nine PRDs moved to `Done/`.

## Device-QA fixes landed
Keyboard no longer covers focused fields (one shared approach, eight screens) · landing on Home instead of
the Coach · **clean first run** (demo seed behind `devSeedDemoData`) · Journey-detail actions as visible
buttons · level meter doubled · "Give support" hidden until there is a connection · tab tap scrolls to top ·
Circle empty state rewritten with an SVG illustration · Inbox "New message" is a real, honest button ·
completed cards keep their identity and their width · **reminders on by default**, created at
`JourneyCreated` so no path can forget.

---

# PART 5 — STILL OPEN

## Product decisions blocking work
1. **What counts as "the plan worked"?** The objective function becomes the product.
2. Which domains participate in learning at v1 (recommend `career` + `general` only).
3. Opt-in or opt-out for the learning record (recommend opt-in, default off — with its real cost: much
   slower corpus growth).
4. The k-anonymity threshold (recommend 25).
5. Wizard offers 8:00, engine default is 9:00 — one of them should move.
6. Existing Journeys get no reminder; a backfill is a founder call.
7. `expo-updates` — needed for automatic restart on language change to work **in production**; without it
   the restart works only in dev builds. New dependency, so it needs approval.
8. The four extension/re-plan questions in `Step_Postponement_02_PRD.md` §14.
9. The seven questions in `Weekly_Review_Contributions_02_PRD.md` §14.
10. Ally status visibility to friends — needs a security-privacy pass, and today a paused Journey
    **silently vanishes** from an Ally's view rather than showing a status.

## Known defects not yet fixed
- **Three different definitions of "total steps"** — the engine and the completion card exclude dropped
  Steps; `journeyView` counts them. A Journey can read 80% on screen while producing a completion card.
  Same class as the Milestone bug; fix the same way.
- `friends.tsx`, `inbox.tsx` and possibly `settings/language.tsx` still have the **double-flipped**
  `isRTL() ? 'right' : 'left'` pattern on inputs. Replace with `START_TEXT_ALIGN`.
- Five components are imported nowhere and carry RTL defects — decide delete vs revive before fixing.
- `AppCore.postponeReminderCopy()` is still hardcoded English feeding `scheduleOneShot` directly.
- Two AppCore suites use the real clock and flake near midnight — inject a clock.
- Home's scroll-to-top is unverified on device.

## Release gates
Privacy policy (does not exist) · **the Gemini key is inlined into the client bundle** and needs a server
proxy with a per-user quota and hard spend cap before any public build · authenticated encryption
(designed in `11_Engineering_Bible/Encryption_Design.md`, not implemented) · a recovery tool for
quarantined data · deploy the `delete-account` Edge Function and host a Play deletion URL · Support Circle
live-DB authorization QA with a second account.

## Partner
- v1.1 package imported to `10_Partner_Coaching_Content/` with a deletion manifest; terminology aligned in
  two passes (164 edits, then 4 — they had internalised the rules).
- **v1.3 reviewed but NOT imported.** Findings in the scratchpad. Terminology collapsed from 164 edits to
  4. Six validation defects block loading the JSON as-is, and **two of them are ours**: `cadence` creates
  no recurrence at all (a `cadence: daily` Step is a one-shot checkbox — it fires once and never again),
  and `sessionsPerWeek` is computed by the Planner and thrown away.
- The reply letter is drafted at `04_Product/Partner_Reply_Terminology_2026-08-13.md` and **not sent**. It
  is being rewritten to cover the architecture, what does not work today, and how we will know it works.
