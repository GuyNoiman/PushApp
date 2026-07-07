# Shop Screen — UX Design

Status: Draft for approval · Phase 4 · 2026-07-07 (from mockup iteration v13)

> UX specification (purpose, hierarchy, flow, states) — not visual mockups and not
> implementation. Builds on `Screen_Bible.md`, the Buddy screen, and the decisions in
> `06_Decisions/Decision_Log.md`. **First pass — pending more founder references.**

---

## Purpose

The Shop is where the user spends earned currency (and, optionally, real money) on
**cosmetics** for their Buddy and world. It powers the game loop's reward economy — a place
to *look forward to* — without ever gating real-life progress behind purchases.

It is a **new screen**, opened from the **Shop button in the top-right of the Buddy screen**.

Modeled on a game-shop reference, but rendered in PushApp's **warm palette** (cream / teal
accents — **not** the reference's deep blue).

## Primary User Question

> **"What can I get for what I've earned?"**

## Primary CTA

**Buy an item.** Each item card is one tap from a purchase confirmation, priced in **coins**
(or real money for the Featured pack).

## Currency

- **Coins** are the single currency for now. **Gems were dropped** for this pass.
- The header carries a **coin pill** (current balance) alongside the level meter.
- Real-money purchases exist only for the Featured pack and (optionally) a Coins category.

## Information Hierarchy

Top-to-bottom: **structured header → Featured pack → Daily shop → category sub-tabs**.

### A. Header (structured)

- **Level meter** (progress within the current level).
- **Coin pill** — current coin balance, right-aligned.

### B. Featured pack card

A single prominent "value" card:
- A **value badge** (e.g. **"300%"**) signalling bonus value vs. buying items separately.
- **Pack contents** shown as small **item chips** (a preview of what's included).
- A **real-money price**.
- A **"one-time"** label — this offer can be bought once.

### C. Daily shop

- A section header with a **refresh countdown timer** ("Refreshes in HH:MM:SS") — stock
  rotates daily, creating a reason to return.
- A **grid of item cards**, each showing:
  - **Item name**
  - **Image** (the cosmetic)
  - A **discount badge** where applicable (e.g. **"20% off"**)
  - **Price in coins**
  - A **"Purchases left: N"** limit (per-item purchase cap)

### D. Category sub-tabs (scrollable)

Horizontally scrollable sub-tabs: **Featured · Cosmetics · Coins · Offers**.

The **Cosmetics** category mirrors the Buddy inventory's own categories:
**Character · Clothing · Items · Location · Furniture.**

## Interaction Flow

1. Buddy screen → tap **Shop** (top-right) → Shop opens on the **Featured** tab.
2. Browse the Featured pack, Daily shop grid, or switch category sub-tabs.
3. Tap an item → **purchase confirmation** (shows price, remaining balance).
4. Confirm → coins deducted (or real-money flow for the Featured pack) → item added to the
   Buddy inventory → light celebration → **"Purchases left"** decrements.
5. Daily shop **refreshes** on its timer, offering new stock.

## Empty States

- **Daily shop sold out / all limits reached:** show the refresh countdown and a gentle
  "Come back when the shop refreshes" — never a dead grid.
- **Insufficient coins:** the item stays visible; the confirmation nudges toward earning
  more (via real-life Steps / Missions), never shaming — and optionally toward the Coins
  category.
- **Featured pack already bought:** the card shows a "claimed / one-time" state.

## Edge Cases

- **Purchase limit reached** on an item → its buy control disables with "Purchases left: 0".
- **Timer at zero** → the Daily shop grid refreshes in place; no manual reload needed.
- **Real-money purchase failure / cancel** → return to the Featured card unchanged.
- **Cosmetic already owned** → hidden or shown as owned; never re-sold accidentally.

## Future Ideas

- Seasonal / event shops; themed bundles; limited-time cosmetics.
- Personalized daily stock (surface items matching the user's Buddy and taste).
- Earn-vs-buy balance tuning; possible reintroduction of a second currency (gems).
- Gifting cosmetics to friends.

## Decisions (2026-07-07 — mockup v13)

- Shop is a **new screen**, entered from the **Buddy screen top-right Shop button**.
- **Coins are the only currency; gems dropped** for now.
- **Structured header** = level meter + coin pill.
- **Featured pack** = value badge (e.g. 300%) + content chips + real-money price + one-time.
- **Daily shop** = refresh countdown + grid; each item has name, image, discount badge,
  coin price, and a **"Purchases left: N"** cap.
- **Scrollable category sub-tabs:** Featured · Cosmetics · Coins · Offers.
- **Cosmetic categories mirror the Buddy inventory:** Character · Clothing · Items ·
  Location · Furniture.
- **Warm palette**, not the reference's deep blue.
- **First pass** — layout to be refined against additional founder references.
