# Missions — Modal (brief)

Status: Draft · Phase 4 · 2026-07-06 · **Intent: a simple window, similar to the references.**

> References: `UX_References/daily and weekly missions.PNG`, `UX_References/daily missions.png`.
> A few visual options can be produced later; for now, keep it simple and reference-like.

---

## Purpose

The **game-loop tasks** (Daily / Weekly Missions) that reward **Coins** — distinct from
real-life Journey Steps.

## Structure (mirrors the references)

- **Daily / Weekly tabs.**
- A **list of missions**, each with a **progress bar** and a **Claim** button (enabled when complete).
- A **milestone reward track** (progress points → chest rewards at thresholds).
- A **refresh timer** ("Refreshes in …").
- Entry: the **Missions button** on Home, with a **badge** when something is claimable.

## Notes

- **Rewards = Coins** (game loop), never XP.
- Examples of missions: help a friend, send a gift, invite a friend, complete N Steps, spin the wheel.

## Decisions (2026-07-06)

- Simple modal, **similar to the references**: Daily/Weekly tabs · progress bars · Claim · reward track · refresh timer.
- A few visual options may be explored later; structure above is settled.

## Finalized visual design (mockup v13 — 2026-07-07)

> Reference mockup: https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba

**Missions and the daily/consistency reward are now unified into one centered, floating modal** (not pinned to the bottom). See also `Consistency_Reward_Modal.md` — the two modals are unified.

- **Two top-level tabs: Missions · Login.** The daily/consistency reward is now labelled **"Login"** (simpler). Tabs are **left-aligned** so the close (X) doesn't overlap them.
- Under **Missions**, there are **Daily / Weekly** sub-tabs, clearly nested under Missions.
- Each mission shows its **reward up-front** in a **fixed right-hand column separated by a vertical divider**. The **progress count** (e.g. "2/3") sits by the progress bar. State is explicit: in-progress → **Claim** (when complete) → greyed **"Claimed ✓"**. **No per-mission icons.**
- The **Login** tab is a **7-day reward rail**: each day is **disabled with a gentle shade**, with a **divider between the day label and its prize**, and the **coin/gem icon beside the amount** (horizontal). The button is a short **"Claim"** (no reward amount repeated). **No phantom 8th-day tile.**
