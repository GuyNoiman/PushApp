# Week-by-day view on Home — PRD

Status: **Approved in full by the founder, 2026-08-19 (later session). NOT built.** This file is the
specification he approved in conversation, moved into the repo so it cannot be lost between sessions.
Every point is decided: the one clause that was open in §6 was answered by the founder the same
evening and is recorded there with his own wording.

Stage: **POC / MVP.** Replaces existing Home surfaces — it adds no new pillar.
Related: `Done/Daily_Step_Reporting_PRD.md` (how a Step is reported), `Done/Week_Boundary_Preference_PRD.md`
(D33 — where the week starts), `06_Decisions/Decision_Log.md` D26.4 (the streak rule),
`04_Product/UX/Home_Screen.md` (the screen this changes).

---

## 1. What it replaces

**Both** of Home's current Step sections go away and this takes their place:

- **"Today's focus"** (`TodayFocusCard` stack — the next pending Step of each active Journey), and
- **"This week"** (`WeekDreamGroup` — the rest of the week's Steps grouped by Dream).

Everything else on Home is untouched: the status strip, the greeting, the Coach card, the Weekly
Review card, the "I adjusted your week" card, the inactivity return, and Give support.

## 2. Why

Today the same week is told twice in two different shapes, and neither answers the question a person
actually opens the app with: *what does my week look like, and what is on today?* A day strip answers
it in one glance, and it makes a quiet promise the current layout cannot: the days that are empty are
**visibly** empty, so the week reads as a real week rather than as an undifferentiated pile.

## 3. The strip

- **Seven pills, one per day of the current week**, in the user's own week order (D33 — the week does
  not start on a fixed day; it starts where `util/week` says it does).
- **The letter only.** Hebrew: one letter (א–ש). English: three letters (Sun–Sat). **No dates.**
- **No scrolling and no other week.** Only the current week — the engine does not build next week yet,
  so offering it would show an empty week that is not true.
- **Under the letter, one mark:**
  - **a dot** — the day has open Steps;
  - **a check** — every Step of that day is done;
  - **nothing** — the day has no Steps at all, and the pill itself is dimmed.
- **The check occupies exactly the dot's position and box**, so the strip does not jump when a day
  completes.
- **The strip opens on today**, and the selected pill is **filled turquoise**.

## 4. Inside a day

- **A flat list.** Not grouped by Dream — **the Dream's name sits on the card itself**.
- Card behaviour (report menu, swipe, done state, the streak badge) is unchanged from today's cards.

## 5. "You could also do today"

- **Always shown at the end of every day** — not only when the day is finished. A person who has time
  now should not have to complete the day first to be offered the next thing.
- Contents: **future Steps that could be pulled forward**.
- Form: a **dashed border**, **no colour bar on the side**, and **each one says which day it belongs
  to**.
- **Doing one marks it done.** On its ORIGINAL day it then appears as done, noting the day it actually
  happened. **The original day simply has one Step fewer — the engine does not refill it.**

## 6. A missed Step and the day boundary

A Step that was not done moves to the next day **only if BOTH hold:**

- **(a)** it was only **`recommended`** and not yet **`required`** — i.e. `streakRole` says the week
  still had slack, so missing it cost the streak nothing. This is the founder's own wording
  (2026-08-19): *"the intention was that the Step was recommended and not yet required, and so if it
  was not done that day it simply moved to the next day."* The condition is `streakRole` itself, not
  a paraphrase of it (`core/util/urgency.ts`), so the badge on the card and the movement of the card
  can never say different things; and
- **(b)** the target day does not already carry a Step of that same Journey.

If either fails, the Step is **marked "not done" and stays on its own day**. It does not travel
forward. In particular a **binding** Step that was missed stays put: the streak rule has already
reacted to it, and letting it reappear tomorrow as if nothing had happened would hide the one miss
the app is honest about.

> **The founder's example, which is the test case:** three workouts a week; today already has a
> workout; therefore yesterday's workout does **not** jump onto today.

> **Resolved 2026-08-19 (evening).** This section previously carried an OPEN question about what
> "the Journey still has room in the week" meant. The founder answered it in the words quoted above,
> and the code follows that answer: a Journey that has already met its weekly target is
> `recommended`, so its missed Step travels; a Journey with no slack left is `binding`, so its missed
> Step stays.

## 7. Edge cases (the standard checklist)

- **Empty / first run** — no Journeys: every pill is dim, the day shows the existing calm empty state.
- **A closed (past) week** — unchanged: past days are read-only (D35.3), so their cards are inert.
- **A past day in the CURRENT week** — selectable and readable; its Steps show what happened.
- **RTL** — the strip is laid out in the week's own order, which reverses with the writing direction;
  the selected pill and its mark must not drift out of the box in either direction.
- **Frozen / Future / abandoned Journeys** contribute nothing, exactly as `getWeekSteps` already
  gates them.
- **Accessibility** — each pill announces the day, whether it is selected, and its state (open Steps /
  all done / empty). The dot and the check are never the only signal.

## 8. What this does NOT do

- It does not change the streak rule (D26.4), the plan, or any engine scheduling.
- It does not add next week, month view, or dates.
- It does not regroup by Dream — that grouping moves onto the card as a line of text.
