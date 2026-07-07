# Consistency Reward — Modal (brief)

Status: Draft · Phase 4 · 2026-07-06 · **Intent: very similar to the reference.**

> Reference: `UX_References/consistancy reward.PNG` (a "Daily login gifts" style reward calendar).

---

## Purpose

A light reward that reinforces **consistency** — showing up and checking in over time.

## Structure (mirrors the reference)

- A **grid of day cards** (Day 1 … N), each showing its reward (Coins / cosmetics / items).
- **Claimed** days show a **green check**; the **next** day unlocks on a **timer** ("Unlocks in …").
- A **highlighted milestone** day (e.g. Day 7) with a bigger reward.
- A **progress counter** ("You've collected X of N").
- Optional **tier tabs** (like Recruit / Veteran / Hero / Legend in the reference) as reward tracks — optional / later.

## Notes

- **Rewards are Coins / cosmetics, not XP** (XP is reserved for real growth).
- **Philosophy guard:** this should reward genuine **consistency (check-ins / showing up for Journeys)**, not mere app-logins — to stay aligned with growth-over-engagement. Keep it a gentle reinforcement, not a pressure loop.
- Entry: the **Consistency Reward button** on Home (badge when a reward is ready).

## Decisions (2026-07-06)

- Build **very similar to the reference**: day-grid calendar, claimed = check, next on timer, milestone day, "collected X of N".
- Rewards = Coins / cosmetics; tie to consistency, not raw logins.

## Finalized visual design (mockup v13 — 2026-07-07)

> Reference mockup: https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba

**The daily/consistency reward and Missions are now unified into one centered, floating modal** (not pinned to the bottom). See also `Missions_Modal.md` — the two modals are unified.

- **Two top-level tabs: Missions · Login.** The daily/consistency reward is now labelled **"Login"** (simpler). Tabs are **left-aligned** so the close (X) doesn't overlap them.
- Under **Missions**, there are **Daily / Weekly** sub-tabs, clearly nested under Missions.
- Each mission shows its **reward up-front** in a **fixed right-hand column separated by a vertical divider**. The **progress count** (e.g. "2/3") sits by the progress bar. State is explicit: in-progress → **Claim** (when complete) → greyed **"Claimed ✓"**. **No per-mission icons.**
- The **Login** tab is a **7-day reward rail**: each day is **disabled with a gentle shade**, with a **divider between the day label and its prize**, and the **coin/gem icon beside the amount** (horizontal). The button is a short **"Claim"** (no reward amount repeated). **No phantom 8th-day tile.**
