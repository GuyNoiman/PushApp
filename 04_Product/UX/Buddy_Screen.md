# Buddy Screen — UX Design

Status: Draft for approval · Phase 4, screen 6 · 2026-07-06

> UX specification. Builds on `Screen_Bible.md` (BUDDY), `Information_Architecture.md`
> (Buddy), `Product_Bible.md` §21 (Buddy).

---

## Purpose

Buddy is the **emotional center** of PushApp — *"how is my companion growing?"* This is
Buddy's dedicated home, where the user sees, grows, and customizes their companion.
Emotional goal: attachment, identity, ownership.

## Primary User Question

> **"How is my companion growing — and how do I make it mine?"**

## Primary CTA

Customize / Shop for Buddy. (Secondary: browse evolution, inventory.)

## Information Hierarchy

- **Buddy fills almost the entire screen** (the "stage"), shown in its current stage and
  equipped cosmetics, with animations. **Buddy is the object; every feature is a button on
  the screen** (overlaid / around Buddy) — e.g. **Shop · Inventory · Customize**. Compact, badged.
- **Status:** Level badge + XP bar; Coins.
- **Evolution stage name** is shown (e.g. Egg → Hatchling → Baby → Child → …):
  - Tapping the stage name → reveals the **next stage's name, locked** (a teaser of what's coming).
  - Previous stages show **how Buddy looked at each earlier stage** (a browsable growth timeline).

## Evolution / Stages

- Buddy **starts as an egg** and grows through **named stages tied to Level** (egg,
  hatchling, baby, child, …).
- The stage timeline is browsable: **past** stages (with their past appearance) · **current**
  stage · **next** stage (locked teaser).

## Store (opens as its own screen / modal)

Category tabs: **Clothes · Pet · Background · Frame** (+ special / seasonal). Purchased with
Coins (and possibly premium currency). Ref: `UX_References/store with tabs according to category.png`.

## Customization & Inventory

- **Customize:** equip owned cosmetics; the Buddy preview updates live.
- **Inventory:** items the user owns.

## Interaction Flow

Open Buddy tab → Buddy shown large → tap the **stage name** (browse evolution) · **Shop**
(buy) · **Customize** (equip) · **Inventory**.

## Empty / Early States

- At the very start, Buddy is an **egg** (pre-hatch); customization is minimal until it
  hatches (ties to the future egg-onboarding flow).

## MVP scope

- **v1:** Buddy display + **evolution stages** + Level/XP + customization + **store (categories)**.
- Possibly a **small number** of species, animations, and voices in v1 (tentative).
- **AI conversation with Buddy = future** (not surfaced here yet).

## Edge Cases

- Locked **next stage**: shown as a teaser, not obtainable early.
- Species / animation / voice availability gated by tier and ownership.

## Future Ideas

Egg-onboarding flow · richer animations · voice · **AI conversation** ("talk to Buddy") ·
more species · personality adaptation.

## Decisions (2026-07-06)

- Buddy **fills almost the whole screen**; all features are **buttons on the screen** (Shop, Inventory, Customize, …).
- Buddy **starts as an egg** and grows through **named, Level-tied stages**; the current
  stage name is shown; tapping it reveals the **locked next stage**; previous stages show past appearance.
- **Show evolution.**
- **Store categories:** Clothes · Pet · Background · Frame · etc.
- v1 may include a **few** species / animations / voices; **AI conversation stays future**.
