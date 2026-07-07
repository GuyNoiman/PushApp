# Explore Screen — UX Design

Status: Draft for approval · Phase 4, screen 3 · 2026-07-06

> UX specification. Builds on `Screen_Bible.md`, `Information_Architecture.md`, `Product_Bible.md` §5 / §7.

---

## Purpose

Explore is discovery-first: it answers *"what could I become next?"* and is where users
find and start new Journeys. Emotional goal: curiosity, possibility, hope.

## Primary User Question

> **"What could I become next?"**

## Primary CTA

Adopt / start a Journey from the feed. (Secondary: **Search** · **Build your own**.)

## Information Hierarchy

Main body = a scrollable discovery **feed** of category sections:

- **Most recommended** — highest-quality Journeys.
- **Recommended for you** — personalized (AI-enhanced; falls back to popularity / curation without AI).
- **Friends chose** — Journeys friends started or completed.
- **Newest.**
- (Later, as data / the market mature: Trending · Popular creators · Business · Seasonal.)

**Feed (Journey) card:** name + short descriptor; light metadata (e.g. estimated duration,
adopters / rating, creator). Inviting, not data-heavy.

**Bottom of the screen — two persistent entries:**

- **Search** — tap → a simple text field; as the user types natural language, the **whole
  screen swaps** to show results ranked **most-similar first**. From a result they can adopt
  it; if nothing fits → **Build your own**.
- **Build your own** — opens a **separate Creation screen** (designed next).

## Interaction Flow

1. Open Explore → browse the feed.
2. Tap a Journey → preview / detail → **Start** (creates the user's own instance).
3. Or **Search** → type → results swap in (most similar first) → adopt.
4. Or **Build your own** → Creation screen.

## Empty / Cold-start States

- Before recommendation / trending data exists: show **Most recommended (curated) + Friends
  chose + Newest**; personalization and Trending switch on later.
- **No friends** → hide "Friends chose."
- **Search with no match** → offer **Build your own**.

## Edge Cases

- Adopting a locked / creator Journey → the user gets an editable instance only where the
  creator allows (ties to the Journey detail screen).
- Duplicate of a Journey the user already has → offer to open the existing one instead.

## Future Ideas

AI roadmap generation · Dream exploration · full Marketplace · coach recommendations.

## Decisions (2026-07-06)

- **Feed-first** with categories: Most recommended · Recommended for you · Friends chose · Newest.
- **Search** + **Build your own** as bottom entries; search swaps the screen to most-similar results.
- **Build your own** opens a **separate Creation screen** (designed next).

## Finalized visual design (mockup v13 — 2026-07-07)

Founder-approved layout. Reference mockup: https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba

- **Search field at the top** — placeholder **"What do you want to achieve?"**
- Content is a set of **horizontally-draggable carousels** (Netflix / Spotify style — cards peek at the edge). Each row uses a **distinct card shape** so the row type reads at a glance:
  - **For you** — Journey tiles, **text-first**: a slim top image band (currently a decorative icon; becomes the **creator's uploaded image** when a Journey is made public), then the body leads with the **Journey name**, then **duration**, then **# steps**.
  - **Top creators** — vertical cards showing the **creator's own buddy + level badge**, their **@username**, a **registrations count** ("42k joined" — counts each sign-up to their content, not unique people), and a journeys count.
  - **From brands** — wide cards: **logo + brand name + Journey name**.
- A **"Build your own"** entry (also reachable from the Journeys tab).
- **Implementation note:** the carousels must be **`flex-shrink:0`** so a content-heavy Explore **scrolls** vertically rather than flex-compressing the rows (a real bug we hit and fixed).
