# Journey Creation Screen ("Build your own") — UX Design

Status: Draft for approval · Phase 4, screen 4 · 2026-07-06

> UX specification. Builds on `Product_Bible.md` §5 (Journey Creation, Definition vs
> Configuration) and the Explore screen (the "Build your own" entry).

---

## Purpose

Where a user builds their own Journey when nothing existing fits. It must feel simple
("complexity belongs to the system, not the user"): a short wizard, minimal required
input, sensible defaults everywhere.

## Two tiers

- **Free — manual wizard.** The user fills a short step-by-step form themselves.
- **Paid — Buddy-built proposal + conversation.** Buddy **generates a complete draft
  Journey** (from what the user typed + what it already knows — schedule, past behavior,
  preferred times/locations), then the user and Buddy **refine it together in
  conversation.** Same underlying Journey object; Buddy pre-fills the wizard fields and
  adjusts them via chat. *(Fits D2: the free manual form works without AI; the AI draft +
  conversation is the paid enhancement.)*

## Primary User Question

> **"How do I turn what I want into a real, structured Journey — quickly?"**

## Primary CTA

**Create the Journey.** Only **Name + Duration/rhythm** are required; everything else has
defaults and can be added later.

## The Wizard (progress indicator: "Step X of N")

1. **Name & goal** — the Journey name / goal. A **"Show me similar"** button surfaces
   matching existing Journeys (adopt instead of build). *[required]*
1b. **Your why (identity & motivation)** — a few short questions connecting the Journey to
   the user's deeper motivation and identity; answers are **saved** and later power
   *personal* encouragement (Bible §34.4). Prompts: why start · what will keep you going ·
   how you'll feel if you succeed · what change you want in yourself · what to remember when
   it's hard. *[optional but encouraged]*
2. **Duration & rhythm** — duration (default ~2 months, configurable) + how progress is
   measured (frequency, e.g. 2×/week; or completion; etc.). *[required]*
3. **Plan — Steps (optional; Phases optional)** — see the Steps mechanism below. The
   **first Step is a Starter Step** (Bible §34.3): a ≤2-minute action, with inline
   guidance ("The first step should be very small — something you can complete in up to 2
   minutes. The goal is to help you start, not finish the whole Journey.") and examples
   ("Put on workout clothes", "Open LinkedIn and save one job", "Clear one small surface").
   Each Step also has a short **title** and a longer **description** (Bible §34.1). *[optional]*
4. **Reminders & context** — preferred **time**, **day(s)**, **location** for nudges.
   (Paid: Buddy suggests from what it knows.) *[optional]*
5. **Privacy & support** — **Private** or **Public** (Public = the Journey is shared to
   others / the Marketplace and the user becomes its **creator**); and whether to add
   **support** (Allies / Support Circle). *[default: private, no support]*
6. **Summary & create** — review everything, set **Start time** (**default "Now"**; can be
   changed — a future date makes it a **Future Journey**), then **Create**. *[required]*

## The Steps mechanism (Step 3)

Steps are **optional** — how they work depends on how the Journey was defined:

- **Frequency Journey (no custom plan):** Steps are implicit. E.g. "2 workouts a week" → a
  single repeating Step "Workout" that appears twice weekly, identical every week until the
  Journey ends. Nothing to build.
- **Custom plan:** the user builds an explicit list of Steps (up to ~**40**). Each Step:
  - has a **name** (e.g. "Leg workout"),
  - has a **repeat count** (e.g. ×4),
  - is added with **"+"** (create the next Step, e.g. "Chest workout", set its count, …),
  - can be **duplicated**, and each Step can **differ** from the others.
- Steps may optionally be grouped into sequential **Phases**.

## Interaction Flow

Explore → **Build your own** → wizard (Free) *or* Buddy's draft → conversational edits
(Paid) → **Summary** → **Create** → the new Journey appears in the **Journeys** tab (or as
a **Future Journey** if the start date is in the future).

## Empty / Default States

- Free: a fresh wizard — only Name is empty-required; sensible defaults elsewhere.
- Paid: opens on **Buddy's proposed draft**, not a blank form.

## Edge Cases

- **Public** Journey → the user becomes a creator (others can adopt it; ties to
  Marketplace / creator rules — future).
- **Future start date** → created as a Future Journey.
- **Step cap (~40) reached** → block adding more / suggest simplifying.
- **Abandon mid-wizard** → offer to save a draft (optional / future).

## Future Ideas

Buddy predicting obstacles before they happen (the later stages of the "Journey creation
should require less effort over time" philosophy) · richer AI drafting · importing a coach's plan.

## Decisions (2026-07-07 — Atomic Habits additions, Bible §34)

- **Starter Step** (§34.3): the first Step is a ≤2-minute action, with author guidance + examples.
- **Identity & motivation questions** (§34.4) added near the start; answers saved for personal encouragement.
- **Step title + description** (§34.1): each Step has a short title and a longer description (description hidden on the card; opened via three-dot "More Info").
- **No dedicated Habit Stacking** (§34.2): calendar/location triggers in "Reminders & context" cover it.
- **Weekly planning** (§34.7) is a separate owed screen, not part of this wizard.

## Decisions (2026-07-06)

- Two tiers: **free = manual wizard**; **paid = Buddy-built proposal refined in conversation**.
- Wizard order (Start folded into Summary): Name → Duration/rhythm → Plan (Steps/Phases,
  optional) → Reminders (optional) → Privacy & support → Summary & create.
- **Minimum to create = Name + Duration/rhythm.**
- **Steps optional:** frequency → one implicit repeating Step; custom → up to ~40 named
  Steps, each with a repeat count, added via "+", duplicable, all can differ.
- **Public = shared / creator.**

## Finalized visual design (mockup v13 — 2026-07-07)

> Reference mockup: https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba

- Each **editable value row** uses a **pencil edit affordance** (not a chevron), with clean spacing between the value and the control.
- The **previous/next step names** are shown beside the **Back / Next** buttons. **Back is disabled on step 1.** **Back and Next are equal size.**
- Tapping a **top step-progress bar** shows a **tooltip** with that step's title. The tooltip renders **below** the bars so it isn't hidden by the screen title.
- The **Step description** field lives on the **Name** stage.
- **"Your why" screen:** the first two questions are **normal answer boxes**; the third ("What to remember when it's hard") is a **list** — a **short text input (max 50 chars) + Add** button. Each saved line appears **below as a grey chip with an X to delete**, and the input **clears** after Add. The Back/Next buttons are pinned at the bottom.
- The **Starter Step** is shown as **"Recommended"** (optional) on the plan/step-creation stage, with the guidance that a ≤2-minute first step raises completion odds.
