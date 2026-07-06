# Journeys Screen — UX Design

Status: Draft for approval · Phase 4, screen 2 · 2026-07-06

> UX specification (purpose, hierarchy, flow, states) — not visual mockups. Builds on
> `Screen_Bible.md`, `Information_Architecture.md`, and the decisions in `06_Decisions/Decision_Log.md`.

---

## Purpose

The Journeys tab is where the user sees and manages their personal-growth **Journeys
as whole units** — the *"what am I working toward"* view. It complements Home:

- **Home** answers "what do I do **right now**?" (step-centric).
- **Journeys** answers "what am I **working toward**, and how is each Journey going?" (journey-centric).

Tapping a Journey opens its **dedicated detail screen**.

## Primary User Question

> **"What am I working toward — and how is each Journey going?"**

## Primary CTA

Open a Journey to see and manage its full plan. (Secondary: start/add a new Journey → Explore.)

## Information Hierarchy — the list view

Top of screen: title + a button into the relevant (Journey-related) part of the
**Achievements** window.

1. **Active Journeys** — a vertical list of Journey cards. Running Journeys first, then
   **Paused** Journeys at the bottom of this section, shown **dimmed** with a **pause
   indicator** and a one-tap **Resume**.
   Each card shows:
   - **Journey name** (primary).
   - **Progress bar + "Phase X / Y"** — the bar shows **current-Phase** progress (or the
     whole Journey if it has no Phases); the counter shows which Phase of how many.
   - **Expected end date.**
   - **Support Circle** — small Ally avatars (if any).
   - No tags, and **no Steps** — Steps are a higher-resolution detail shown inside the
     Journey detail screen, not on the list card.

2. **Future Journeys** — Journeys saved to start later. Each shows a **calendar
   indicator**, or simply the **start date** if one was defined (otherwise a "not
   scheduled / start manually" state).

3. **Completed Journeys** — an additional list at the **bottom of the screen**, giving the
   user their growth history. (Journey-completion achievements are also reachable via the
   Achievements button at the top.)

## Journey Detail Screen (opens on tap)

Everything about one Journey, in one place:

- **Plan — Phases → Steps:** completed, current, and upcoming Steps grouped by Phase
  (Phases optional/sequential), with progress.
- **Metadata:** when it started; when it should end (expected completion).
- **Support group (Support Circle):** the Allies supporting this Journey.
- **Settings:**
  - Privacy (Private / Progress-only / Ally — full support).
  - Preferred interaction **location or time**.
  - Notifications / reminders.
- **Flexibility policy (rules):** max misses, pause allowed, restart conditions, grace period.
- **If the user is NOT the owner** (Journey adopted from someone else / a creator):
  source parameters — who it came from, how many people adopted/recommended it, rating,
  and which fields are **editable vs locked** (creator-controlled).
- **Actions:** Check in · Pause (if allowed) · Edit (if editable) · Adapt / Restart ·
  Leave / Archive · Thank Allies.

## Interaction Flow

1. Open Journeys tab → **Achievements** button at top → **Active** (running, then paused/dimmed) → **Future** → **Completed** list at the bottom.
2. Tap a Journey → its **detail screen**.
3. In detail: review the Phase/Step plan, adjust settings, manage support, or act.
4. Back → list.

## Empty States

- **No active Journeys:** an encouraging prompt to start the first one (→ Explore/creation), with Buddy.
- **No future Journeys:** a subtle "plan something for later" hint (not a blocking empty state).

## Edge Cases

- **Adopted (non-owned) Journey:** locked fields are read-only; source metadata is shown.
- **Journey needs adaptation** (rules no longer met): non-judgmental prompt to adapt / restart / pause — never "failed."
- **Paused Journey:** appears dimmed at the bottom of the Active section, with a pause indicator and one-tap Resume.

## Future Ideas

Journey analytics · Journey comparison · AI adaptation timeline · alternative paths (from `Screen_Bible.md`).

## Decisions (2026-07-06)

- **Paused** Journeys appear dimmed at the bottom of the Active section, with a pause indicator and one-tap **Resume**.
- **Completed** Journeys appear as an additional list at the bottom of the screen.
- **Achievements button** opens the Journey-related part of Achievements.
- **Journey cards show no Steps** — Steps are a higher-resolution detail, shown only in the Journey detail screen.
