# Decision Log

Status: Living Document — canonical record of founder-level product decisions.

Each entry records the decision, its framing, and where it is reflected in the repository. Newest first.

---

## 2026-07-07 — Batch 2 (Atomic Habits behavioral additions)

Founder-approved, inspired by *Atomic Habits*. Full detail in `Product_Bible.md` §34.
All respect **D2** (no core flow depends on AI).

- **D6 — Step description + "More Info".** Each Step has a short title **and** a longer
  description; the description is hidden by default and opened from the Step card's
  three-dot menu ("More Info"). → Bible §34.1, `UX/Home_Screen.md`, `UX/Journey_Creation_Screen.md`.
- **D7 — No dedicated Habit Stacking (for now).** Calendar- and location-based triggers
  cover the need; no separate "attach to an existing habit" flow. → Bible §34.2, §30.
- **D8 — Starter Step.** The first Step of a Journey is a ≤2-minute action, with author
  guidance + examples. → Bible §34.3, `UX/Journey_Creation_Screen.md`.
- **D9 — Identity & motivation questions at Journey start.** Saved answers power
  *personal* (not generic) encouragement. → Bible §34.4, `UX/Journey_Creation_Screen.md`.
- **D10 — Immediate positive feedback on completion.** Several elegant (not childish)
  celebration variations. → Bible §34.5, `Design_System.md` §7, `UX/Home_Screen.md`.
- **D11 — Flexible, non-punishing streaks.** Recovery-oriented; return-with-one-small-step
  copy. → Bible §34.6, §9.10.
- **D12 — Weekly planning confirmation flow.** Start-of-week review/approve/edit/move plan;
  a new **Weekly Planning** screen is owed. → Bible §34.7, `Open_Questions.md`.

---

## 2026-07-06 — Batch 1 (following the pre-Series-A Repository Review)

### D1 — Initial Positioning
**Decision:** For the initial product, PushApp is positioned for *young adults who want to build and maintain meaningful habits and personal goals across different areas of life.*
**Framing:** This is **positioning, not a vertical**. Do not restructure the product around a single domain (fitness, coaching, education, etc.). The long-term vision remains a general personal-growth platform.
**Deferred:** Specific go-to-market segments and channels → a dedicated Go-To-Market document (later).
**Reflected in:** `Product_Bible.md` §32 (+ §24), `Open_Questions.md` (Beachhead Market), `Investor_Questions.md` Q3, `Pitch_Deck.md`.

### D2 — AI in the MVP
**Decision:** AI **is part of the MVP**, but the MVP must **not depend on AI** in order to provide value. AI enhances the experience, personalizes the product, and improves guidance; every core user flow must remain functional if AI is temporarily unavailable.
**Reflected in:** `Product_Bible.md` §15.1 and §27, `Product_Roadmap_and_Scope.md`.

### D3 — Product Name
**Decision:** "PushApp" is a **working name**. Branding will be revisited later and must not influence current product or engineering decisions. No further action for now.
**Reflected in:** this log only.

### D4 — POC / MVP Definition
**Decision:** To be defined **together, later** — not authored independently. Tracked as a missing document.
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` (placeholder).

### D5 — Object Model: the Phase layer
**Decision:** The object hierarchy is **Dream → Journey → Phase (optional) → Step.** A Phase is an optional, sequential grouping of Steps. "Phase" is a **working name** (not finalized; candidates: Phase, Chapter, Part).
**Reflected in:** `Product_Bible.md` §3.4A, `Product_Terminology.md` (Phase), `Information_Architecture.md`.

### Also reflected (previously-confirmed decisions the review flagged)
- **Home screen is action-based** (not Journey-based) — `Product_Bible.md` §11.2.
- **Maximum Journey duration** defaults to **~2 months, configurable** — `Product_Bible.md` §3.3.
