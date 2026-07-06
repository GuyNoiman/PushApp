# Profile Screen — UX Design

Status: Draft — **overall layout not yet settled** · Phase 4, screen 7 · 2026-07-06

> UX specification. Builds on `Information_Architecture.md` (Profile), `Product_Bible.md` §21.2–21.4.

---

## Purpose

Profile is the user's **account & record** area — distinct from Buddy (the game identity).
It is intentionally a more utilitarian, "less inviting" screen: a **hub of sections**.

## Status note

The overall layout is **not finalized**. For now it stays a **sectioned hub**. Sections
(areas) include: **Profile · Settings · Payment/Subscription · Contact us · Achievements**
(+ others as needed). To be revisited.

## Profile — personal info fields

- **Username.**
- **Motto** — optional.
- **Areas of interest / important locations** — choose **Home**, **Office**, and up to
  **three more** areas of interest, via **map integration + search by address**. (Feeds
  context-aware / location interventions.)
- **Ideal communication time** — the user's preferred time(s) for the app to reach them.
- **Communication style** — **automatic**: set and adjusted by our learning algorithm, not
  chosen by the user (displayed, system-managed).
- **Age.**
- **Gender.**
- **Form of address** (grammatical gender / לשון פנייה) — only in languages/countries where
  relevant (e.g. gendered languages such as Hebrew).

## Settings — permissions

- **Allow notifications — mandatory** (core to the intervention model).
- **Allow location access — recommended** (enables location-aware interventions).
- **Allow calendar access — recommended** (enables timing-aware interventions).

## Achievements

Reachable from here (and from other places — e.g. the Journeys tab). See
`Achievements_Screen.md`.

## Interaction Flow

Open Profile → choose a section (Profile info · Settings · Payment · Contact · Achievements).

## Open / Not settled

- The overall Profile layout, and which sections live here vs. elsewhere — to revisit.

## Decisions (2026-07-06)

- Profile is a **utilitarian sectioned hub** (layout tentative).
- **Profile fields:** username · motto (optional) · areas of interest (Home/Office + up to
  3, via map + address search) · ideal communication time · communication style (automatic,
  algorithmic) · age · gender · form of address (gendered languages only).
- **Settings permissions:** notifications (mandatory) · location (recommended) · calendar (recommended).
- **Achievements** reachable here (own screen).
