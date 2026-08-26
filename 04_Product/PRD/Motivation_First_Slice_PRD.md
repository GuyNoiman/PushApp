# PRD — Motivation, the first slice

Status: **Approved scope for build (2026-08-26).** This document does not replace
`Future/Personalized_Motivation_Engine_PRD.md` — that one keeps the whole vision, and nothing in it
is cut. This is the first slice of it: the part that can be built today with **no backend, no new
permission, no metered model and no cost**, and it answers the open questions of §11/§12 *for this
slice only*. Every question it does not answer stays open in the Future PRD, marked below.
Stage: **POC / MVP.**
Owner: founder + AI product team.
Related: `Future/Personalized_Motivation_Engine_PRD.md` (the vision), `Communication_Style_Profile_PRD.md`
(how it is phrased), `Smart_Notification_Timing_PRD.md` (when the app talks at all),
`Week_By_Day_Home_PRD.md` (where it appears).

---

## 1. Why a slice, and why this one

The full engine in the Future PRD needs things that do not exist yet: a central catalog service, a
cross-user ranking model, a licensing pipeline for quotations, and an evidence review for health
statements. Waiting for all of that means the app says nothing motivating at all, while the thing
that actually makes motivation land — **truthful, specific, and about this person** — needs none of
it. Every fact this slice speaks is already on the device.

So the slice is drawn along one line: **say only what the app already knows for certain, only where
the person is already looking.** No push, no quotations, no health, no money.

## 2. What it is

One card on Home, at most once a day, that reconnects the person to what they are doing — grounded
in a real number from their own Journeys — with a **Helpful / Not helpful** response underneath.

It is not a feed, not a streak-saver, and not a nudge. Silence is a valid outcome and is the normal
outcome on most days.

## 3. The answers this slice commits to

Numbering follows the Future PRD's open questions. **OPEN** means the question is answered only for
this slice and stays open for the full engine.

### Product (§11)

1. **Stage / first surface:** POC. **In-app only. No motivational push, at all.** The app's
   notification budget is already spent on reminders and the aggregate; adding a second voice to the
   lock screen before the first one has been lived with would be the app talking more, not better.
2. **Content families:** authored templates + computed progress statements, where the computation
   uses **only facts the app itself recorded** — Steps done, days moving, a Journey's own progress.
   Quotations are OUT (licensing unresolved, §12 of the Future PRD). Health statements are OUT
   (evidence review unresolved). Money/consumption statements are OUT (they need a baseline the user
   enters and can edit, which is its own feature).
3. **Baseline inspection:** not needed yet, because every number here is one the app counted rather
   than one it estimated. The card's optional door opens the Journey the number came from, which is
   where the same number is shown in full. **OPEN** for estimated metrics.
4. **A metric belongs to a Journey** in this slice, and a Journey may produce several. Dream-level
   metrics are **OPEN**.
5. **Eligible moments:** four, and no others — sustained progress, a return after a missed Step, an
   approaching Milestone, and a quiet stretch with a Journey still running. A moment makes a person
   *eligible*, never *due*.
6. **Feedback placement:** in the card. Notification actions do not apply — there is no motivational
   notification. **OPEN** for the push surface.
7. **One binary signal.** Dismissing the card is NOT a dislike; it is "not now" and is recorded as
   nothing. A reasoned dislike ("wrong moment" vs "wrong tone") is **OPEN** — asking a second
   question about a message somebody just said was unhelpful is asking them to work for us.
8. **Style controls phrasing only.** The catalog stores a MEANING; the words are resolved through the
   same `_<styleId>` layer the notifications use (D84). Feedback therefore attaches to the meaning,
   not to one of its four wordings — otherwise every item would need four times the evidence to
   learn anything.
9. **Cooldowns:** at most one card a day; an item is not repeated within 21 days; a theme is not
   repeated within 7 days; a disliked item never returns for that person.
10. **"Motivate me now":** **OPEN / deferred.** An on-demand button is the fastest way to turn this
    into a slot machine, and it is the one surface where repetition is guaranteed.
11. **Health statements:** none in this slice.
12. **Quotations:** none in this slice.
13. **The door is optional and omitted by default.** An item offers one only when a genuinely useful
    destination exists, and the card never adds one to earn a tap.
14. **First user-invoked surface:** none. The Home card is the only surface.

### Architecture (§12)

1. **The catalog is bundled in the app** for this slice — Option A of the Future PRD, chosen with
   its stated weakness understood. What makes it tolerable *here* and nowhere later: the catalog is
   JavaScript, so a correction reaches both phones through `eas update` without a store release; and
   with no cross-user ranking there is nothing that must update centrally. **Option D remains the
   recommendation** the moment ranking crosses users.
2. **Two pure functions behind one facade**: eligibility (what may be said now) and selection (what
   is said). Both framework-free, both unit-testable with an injected clock.
3. **OPEN** — no domain expert authors motivation in this slice.
4. The Coach is not involved. **OPEN.**
5. **No Dream text, ever.** The engine reads structured facts and ids only. Nothing it stores can be
   read back as a sentence somebody wrote.
6. **No backend.** Feedback is on-device, inside `AppState`, which is what puts it in the export and
   in the account wipe without a line of extra code. Cross-user ranking is **OPEN**.
7. **No model at runtime**, so no metered cost and nothing to observe. This is what let this slice
   jump the queue ahead of calendar/location.
8. **Personal scores only.** Global/language/style score combination is **OPEN**.
9. **Exploration** is "an item nobody has answered about yet outranks one that has been shown",
   which is enough to give new content a chance without a bandit algorithm. **OPEN** for the real one.
10. Costs are bounded at zero by construction.

## 4. Content contract

Each catalog item is data, never code:

| Field | Meaning |
|---|---|
| `id` | stable; the feedback key, and the i18n key group |
| `version` | bumped when the MEANING changes, which resets its feedback |
| `family` | `progress` (carries a number) or `encouragement` (carries none) |
| `theme` | for the 7-day theme cooldown |
| `trigger` | which of the four moments makes it eligible |
| `requires` | the facts the sentence needs, so it can never be sent with a hole in it |
| `door` | optional destination, or none |

A sentence that needs a number it does not have is not eligible. That is the whole truth mechanism:
the item cannot be *selected* without its facts, so it can never be *shown* with an invented one.

## 5. Privacy

- Feedback records an item id, its version, and a verdict. Nothing else.
- No Journey title, no Step title, no Dream text, no free text enters the feedback store.
- It lives in `AppState` on the device, so account export carries it and account deletion removes it.
- Nothing leaves the device, because there is nowhere for it to go.

## 6. Acceptance criteria

1. At most one motivation card is shown per local day.
2. An item is never shown without every fact its sentence needs.
3. A "Not helpful" item never returns for that person.
4. An item is not repeated within 21 days, nor its theme within 7.
5. The card is phrased in the user's communication style and form of address, in both languages.
6. Dismissing the card records nothing.
7. No motivational notification is ever sent by this slice.
8. Feedback contains no user-authored text.

## 7. Out of scope for this slice (all of it stays in the Future PRD)

Push delivery · quotations · health statements · money and consumption metrics · Coach-authored
motivation · cross-user ranking · "motivate me now" · reasoned dislike · Dream-level metrics ·
domain-expert content packs · a catalog service.
