# Achievements Screen — UX Design

Status: Draft for approval · Phase 4 · 2026-07-06

> Reached from **multiple entry points** (Profile, the Journeys tab's Achievements button,
> completion celebrations, etc.). Builds on `Product_Bible.md` §20.3–20.8.

---

## Purpose

Show the user's earned **trophies** — identity markers that celebrate meaningful milestones
(achievements are identity markers, not currency; global/predefined).

## Structure

- A list of **prizes**, each with its **own trophy**.
- Organized into **tabs by category** (e.g. Personal Journeys · Helping friends ·
  Consistency · Daily/Weekly · etc. — per Product_Bible §20.5).
- Each trophy has **tiers**: **Bronze → Silver → Gold**, **sometimes Diamond** — and
  **sometimes not all tiers exist** for a given trophy.
- **Won** prizes appear **colorful**; **un-won** appear **dimmed / gray**.
- An **"All"** category lists every prize: **achieved ones at the top, the rest below.**

## Trophy card

- Trophy icon (tiered visual: bronze / silver / gold / diamond).
- Name + what it rewards, and progress toward the next tier.
- **Colored if earned; grayed if not.**

## Interaction Flow

Open Achievements (from Profile / Journeys / a completion celebration) → browse the
**category tabs** (or "All") → tap a trophy → detail (tiers earned, progress to next).

## Edge Cases

- Trophies with fewer tiers (no Diamond, etc.) → show only the tiers that exist.
- **"All"** tab sorts **earned-first** (achieved at top, rest below).

## Future Ideas

Seasonal / limited trophies · creator & coach achievement categories (Product_Bible §20.5–20.6).

## Decisions (2026-07-06)

- Trophies grouped by **category tabs**; an **"All"** tab shows **earned-first**.
- Tiers: **Bronze / Silver / Gold**, sometimes **Diamond**; not all trophies have all tiers.
- **Earned = colored; unearned = grayed.**
- Reachable from multiple entry points (Profile, Journeys tab, completion celebrations).

## Finalized visual design (mockup v13 — 2026-07-07)

Founder-approved layout. Reference mockup: https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba

- Rendered on the **app's warm base** (the old purple game background was dropped) so it feels on-brand.
- Prizes read as **medals with ribbons**, laid out **3 per row** with even margins.
- Each prize shows its **unlock condition**. Locked prizes show a **progress count** ("18/30") with the remaining ("12 more") in a **lower visual hierarchy** (muted/smaller) — the old progress bar was dropped in favor of the count.
- Tapping a medal opens a **centered detail sheet** (medal, name, full condition, progress, and the reward) with a **close (X) button**.
- Tabs: **All · Journeys · Social**.
