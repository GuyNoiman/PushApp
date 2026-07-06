# Home Screen — UX Design

Status: Draft for approval · Phase 4, screen 1 · 2026-07-06

> This is a UX design specification (purpose, hierarchy, flow, states) — not visual
> mockups and not implementation. It builds on `Screen_Bible.md` and the decisions in
> `06_Decisions/Decision_Log.md`.

---

## Purpose

Home is the **decision engine** of PushApp. It exists so that, within a few seconds
of opening the app, the user knows exactly what to do next to move a real-life
Journey forward — and then leaves the app to do it.

Home is **action-based, not Journey-based** (Decision_Log; Bible §11.2): it shows
today's prioritized *actions* generated from the user's active Journeys, not a list
of Journeys. (Managing Journeys as whole units lives in the Journeys tab.)

## Primary User Question

> **"What should I do right now?"**

Nothing on this screen should compete with answering that one question.

## Emotional Goal

"I know exactly what deserves my attention" — clarity and momentum, **never**
overwhelm or guilt. Progress is visible; setbacks are met with support, not shame.

## Primary CTA

**Complete (check in on) the next action.** The single highest-priority Step is the
top card of the Steps feed and is one tap from a Quick Check-in.

## Secondary Actions

- Quick Check-in on any other action (long-press / inline control).
- Help a friend who needs support.
- Claim a ready reward / see reward proximity.
- Jump to the parent Journey for context.
- Start/plan a Journey (prominent only when the user has none due today).

## Information Hierarchy

Home has two zones: a compact top zone (Buddy, status, and action buttons) and the
main Steps feed.

### A. Top zone — Buddy, status & action buttons (≈30% of the screen)

- **Buddy** — small and ambient (much smaller than in the Buddy tab); sets mood, not the focus.
- **Status** — Level, XP progress to next level (reward proximity), and Coins.
- **A cluster of compact icon buttons** (each with a badge when relevant), similar to the
  reference home screens. Each opens its own modal/screen and keeps the Home feed
  uncluttered:
  - **Inbox** — messages (Allies / Friends / Groups).
  - **Missions** — Daily/Weekly Missions modal (progress bars, Claim, milestone reward
    track, Daily/Weekly tabs; ref `UX_References/daily and weekly missions.PNG`). Rewards
    Coins, not XP — the game loop, not real life.
  - **Consistency Reward** — the consistency-reward window (ref `UX_References/consistancy reward.PNG`).
  - **Friends who need help** — opens the list of friends to support (chat / poke / gift);
    the badge shows how many currently need help.

### B. Main feed — the Steps (≈70% of the screen)

One single, prioritized list of the user's Steps for the week, sorted by **soonest
implied deadline first** (overdue at the very top). Frequency-Journey instances live in
this same list — there is no separate weekly strip. The **top card is the most urgent
action** (optionally given light visual emphasis; there is no separate "hero" element —
it is simply the first, most-urgent card).

Each Step card (the **Step name is the primary line**; everything else is secondary):
- A small **Journey icon tile** on the left — a colored icon representing the Step's Journey / category. Kept **compact** so the text keeps enough room.
- **Step name** — primary / prominent.
- **Journey name** (secondary) + **Phase name** (only if the Journey has Phases).
- **Progress bar + "Phase X / Y"** — the bar shows **current-Phase** progress (or the whole Journey if it has no Phases).
- A **report control** on the right (compact) — a rounded-square button: a check for done-type Steps, a **+** for frequency Steps; filled when completed. This is the Step's Check-in.
- No tags are shown (internal data only).

**Completed Steps** for the period move to the **bottom of the feed**, shown **disabled**
(gray background + a green check), so the user sees what they've already done without it
competing with what's left.

**Implied-deadline model for frequency Journeys:** for a Journey needing N per week with
M instances still remaining, spread the M remaining instances across the remaining days
of the week — no two on the same day — so each remaining instance has its own implied
deadline (the last is due the final day, the one before it the day prior, and so on).
Sort the whole list ascending by that implied deadline.

Rationale: real-life Steps own the main feed; the game loop and secondary features
(Missions, Consistency Reward, Inbox, help-a-friend) stay one tap away via buttons, never
competing with the Steps for the main space.

## Interaction Flow

1. Open app → Home shows the prioritized Steps list (the top card is the most urgent action).
2. Tap the hero (or long-press any card) → **Quick Check-in sheet** appropriate to
   that Journey's reporting type (checkbox / number / module / within-limit / etc.).
3. Confirm → brief, warm micro-celebration (Buddy reacts; XP/streak update) → the
   list re-orders to the next action.
4. If nothing is due → Home shows a "return to life" state (below), not an empty list.

Home should feel *lighter* after each check-in, reinforcing completion.

## Empty States

- **New user, no Journeys yet:** hero becomes an invitation — "Let's start your first
  Journey" (→ Explore/creation) with a short Buddy introduction. Encouraging, never empty-feeling.
- **Has Journeys, nothing due today:** a celebratory "You're clear for today" with
  gentle options — help a friend, plan ahead, or simply rest. This is a *feature*
  (return to life), not a dead end.
- **No friends yet:** the "friends who need help" area becomes a soft invite prompt.

## Edge Cases

- **Overdue / at-risk Steps:** stronger visual state and priority, but **non-judgmental
  copy** ("still time to catch this"), never "you failed."
- **Missed report:** offer a low-friction "what happened?" (came up / forgot / tired /
  no longer interested / other) rather than assuming failure (Bible §9.10).
- **Paused Journey:** its Steps do not appear on Home.
- **Too many actions:** cap the visible list, surface only the top priorities with a
  "N more" affordance — protect the one-screen-one-job clarity.
- **Critical-compliance Journey** (e.g. medication): surfaced more prominently and
  with a calmer, less playful tone.
- **AI unavailable / offline:** prioritization falls back to deterministic rules
  (urgency, due date, weekly-commitment risk). Home remains fully functional without
  AI (Decision_Log D2). AI only *improves* ordering; it is never required.

## How this respects the decided principles

- **Action-based Home** (D-Home) — the whole screen is the model.
- **AI optional in MVP** (D2) — rule-based prioritization is the baseline; AI enhances.
- **No shame / progress over perfection** — urgency without guilt; supportive recovery.
- **Growth before engagement** — success = the user leaves to act; the "all clear"
  state actively sends them back to life.
- **Buddy is the experience** — Buddy is present in the header and reacts to check-ins.

## Future Ideas

- Adaptive, AI-personalized ordering and Buddy-generated priorities.
- Context-aware surfacing (time of day, location/geofence, calendar gaps).
- OS home-screen widget mirroring the next action.
- Dynamic, personalized Home layout per user.

## Decisions & open questions

Resolved (2026-07-06):
- **Buddy ≈30% of the screen** (small/ambient); the Steps feed takes ~70%.
- **Steps** = one prioritized list sorted by soonest implied deadline; no separate weekly strip.
- Each **Step card**: **Step name primary**; Journey name + Phase name secondary; a **progress bar + "Phase X / Y"** (current-Phase progress); no tags.
- **Completed Steps** move to the bottom of the feed, shown disabled (gray + green check).

**Visual layout (from the Phase 5 mockups):**
- A **global app header** carries Level + XP (left) and Coins (right); the **"Hello, [name]"** greeting sits just below it.
- Buddy is centered with the four area buttons **flanking it** (Inbox + Missions on the left, Consistency + Friends on the right); Buddy shows its **stage name**, not a redundant level.
- The Steps live in a **draggable "Week's steps" panel** (warm cream background) with a **right-side scroller**.
- Each Step card carries a compact **Journey icon tile** and a compact rounded-square **report control** (kept small so the text has room).
- Bottom **nav is compact, icon-only** (Home · Journeys · Explore · Friends · Buddy); the active tab is tinted teal.
- Secondary features are **icon buttons** in the top zone: **Inbox, Missions, Consistency
  Reward, Friends-who-need-help** — each opens its own modal/screen.
- No separate "hero" — the top card of the Steps feed is the priority.

Still open:
- Visual fine-tuning (Phase 5/6): Buddy arrangement within its 30% band; button placement.
