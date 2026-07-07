# Weekly Planning Screen — UX Design

Status: Draft for approval · Phase 4 · 2026-07-07 (from mockup iteration v13)

> UX specification (purpose, hierarchy, flow, states) — not visual mockups and not
> implementation. Implements `Product_Bible.md` §34.7 and `06_Decisions/Decision_Log.md`
> **D12**. **First pass — interaction to be refined.**

---

## Purpose

At the **start of each week**, the user reviews and approves their planned Steps for the
upcoming week, so they don't have to decide day-by-day. This **reduces in-the-moment
decision fatigue** and creates a **soft commitment**: the user begins the week with a clear
plan and a sense of control (Bible §34.7).

It is a **new screen**, surfaced start-of-week — from **Home** or on **opening the app
early in the week**.

## Primary User Question

> **"Does my plan for this week feel doable — and do I want to commit to it?"**

## Emotional Goal

Clarity and calm ownership — "I've already decided, so I don't have to keep deciding."
Planning now is framed as a relief, never a chore or a judgment.

## Primary CTA

**Approve week.** One tap accepts the planned Steps as-is. **Edit plan** is the equal-weight
secondary action for anyone who wants to adjust first.

## Information Hierarchy

Top-to-bottom: **your why → Steps grouped by day → primary actions**.

### A. "Your why" (pinned at top)

The user's **personal motivation line** (their identity & motivation from Bible §34.4)
pinned at the top of the screen — grounding the week's plan in *why it matters* before
showing the *what*.

### B. Planned Steps, grouped by day

- The upcoming week's planned Steps, **grouped by day**.
- Each **Step is draggable** to move it between days.
- The user can **replace / swap** a Step for a different one.

### C. Primary actions

- **Approve week** — accept the plan (soft commitment for the week ahead).
- **Edit plan** — enter adjustment mode (drag, swap, replace).

## Copy

Guiding, low-pressure prompts (Bible §34.7):

- "This is your plan for the upcoming week. Does it feel doable?"
- "Would you like to approve the week or make adjustments?"
- "It's easier to plan now than to decide again every day."

## Interaction Flow

1. Start of week → surfaced from **Home** (or on opening the app early in the week).
2. User reads their **why**, then scans planned Steps grouped by day.
3. Optionally **drag** Steps between days and/or **replace/swap** Steps.
4. **Approve week** → the plan is committed for the week; Steps flow into Home's
   prioritized feed via the implied-deadline model. *(Or continue editing.)*

## Empty States

- **Nothing planned yet:** invite the user to add or generate Steps rather than showing a
  blank week — never a dead end.
- **Already approved this week:** show a calm confirmed state ("You're set for this week")
  with an option to revisit/adjust.

## Edge Cases

- **User skips planning:** the week still runs on defaults; the screen is a *soft*
  commitment, not a gate. It can be re-surfaced gently later.
- **Mid-week changes:** approving is not a lock — plans can still shift as life happens
  (no shame for changing).
- **Overloaded week:** if too many Steps land on one day, nudge toward spreading them,
  supportively ("this day looks heavy — want to move something?").

## Future Ideas

- Buddy-proposed weekly plan (AI drafts the week; user reviews) — paid enhancement, in the
  spirit of "planning should require less effort over time."
- Adaptive suggestions based on past weeks (which days actually worked).
- End-of-week reflection paired with next-week planning.

## Decisions (2026-07-07 — mockup v13; Bible §34.7, Decision_Log D12)

- **New Weekly Planning screen**, surfaced start-of-week from Home / early app open.
- **"Your why"** (personal motivation, §34.4) pinned at the top.
- Planned Steps **grouped by day**; each Step **draggable** between days; **replace/swap**
  supported.
- Equal-weight primary actions: **Approve week** and **Edit plan**.
- Soft commitment — approving is not a lock; no shame for changing plans.
- **First pass** — interaction to be refined.
