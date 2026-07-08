# Decision Log

Status: Living Document — canonical record of founder-level product decisions.

Each entry records the decision, its framing, and where it is reflected in the repository. Newest first.

---

## 2026-07-08 — POC scope defined (resolves part of D4)

### D13 — POC hypothesis & scope
**Decision:** The POC tests a single hypothesis — **whether the combination of social support (a chosen circle of friends who see + cheer progress) and the evolving Buddy companion (with its coin/shop/missions reward loop) makes people persist and complete their Journeys.** Success = a meaningful share of users keep checking in ~4 weeks and complete/progress a Journey, and credit the friends and/or Buddy for keeping them going.
**In scope:** Journey loop (create → check-in → progress, incl. Starter Step + "why"); evolving Buddy + celebrations; add-friends → Allies see progress → cheer/nudge; coin economy + Shop (Buddy cosmetics); daily/weekly Missions + Login rewards; basic (non-AI) reminders.
**Out (deferred):** AI Intervention Engine, Explore/Marketplace/templates/creators/brands, Achievements wall, Weekly-planning flow, Phases complexity, public/creator Journeys, rich onboarding.
**Guardrails:** shallow economy (one currency = coins, small cosmetic set, few mission types); combined POC can't isolate social-vs-Buddy (accepted; instrument both, isolate via an MVP A/B); vision intact (deferred ≠ cut).
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` §1.

### D14 — MVP delta & roadmap staging (fully resolves D4)
**Decision:** **MVP = POC + (a) Explore + a starter Journey library (browse & adopt), (b) proper onboarding incl. egg→hatch, (c) Journey Phases + full Journey types, (d) light AI = personalized encouragement from the "why" + smarter-timed reminders** (enhancement only; D2 — nothing core depends on AI).
**Deferred to Commercial:** adaptive Intervention Engine (MVP keeps smarter reminders only), weekly-planning flow, AI Buddy-drafts-your-Journey (paid), Achievements wall, Marketplace/creators/brands, broader Ally types.
**Framing:** MVP job = smallest product adoptable solo with value over *months* that shows why PushApp beats "habit tracker + group chat"; differentiation = the POC-proven social+Buddy+reward loop made adoptable (library+onboarding+real Journey types) and lightly personalized.
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` §2–3 (incl. roadmap staging). **D4 now fully resolved.**

### D15 — 4-version release plan + Rich Step Types (vision)
**Decision:** Ranked all remaining work into **four versions** — **V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem** (maps onto the staging framework). V3 = adaptive Intervention Engine, weekly planning, AI Journey-drafting (paid), Achievements, deeper economy, Buddy customization depth, broader Allies, Community Insights, templates, subscription. V4 = full Marketplace/Creator economy, Business Journeys, **Rich Step Types**, Interactive Journey Experiences, Buddy voice/conversations, AI-generated roadmaps, full JITAI Intervention Engine, Competition Mode.
**Added (vision/future):** **Rich Step Types inside a Journey** — Steps become richer/extensible (video · audio · quiz · reflection · meditation · PDF · slides · AI-conversation · in-app exercise …) while the model stays Dream→Journey→Phase→Step and Step stays the unit of progress. Enables courses/coaching/meditation/creator experiences without changing the core. Strong investor-vision material.
**Reflected in:** new `04_Product/Version_Roadmap.md`; `Product_Bible.md` **§35** (Rich Step Types, Stage: Future).

### D16 — Revenue streams consolidated (business model)
**Decision:** Monetization = a **portfolio of 5 complementary streams** (ratios TBD, version-mapped), not one bet; core growth always free: **(1) Virtual economy / Shop** (coins, cosmetics, Buddy items — V1 shallow→V3), **(2) Consumer subscription** Premium/Freemium (AI, analytics, advanced interventions — V3), **(3) Creator marketplace** (paid creator Journeys + platform rev-share — V4), **(4) Business/branded Journeys** (publishing fee · rev-share · placement — **promoted from §33.6 hypothesis to approved** — V4), **(5) Coach/professional tier** (seats; future coach marketplace — V3–V4). Framing: early revenue leans IAP+subscription; marketplaces scale later.
**Reflected in:** `Product_Bible.md` **§23** (rewritten as "Revenue Streams"; §33.6 kept as hypothesis history), `03_Pitch/Pitch_Deck.md` §9, `03_Pitch/Investor_Questions.md` §14, `Version_Roadmap.md`.

### D17 — Grace Tokens
**Decision:** Adopt a **Grace Token** system (spend a token to skip/postpone a Step without breaking the Journey; extends §5A.4, feeds §30). Locked guardrails: **(a) earned only, NEVER purchasable / not in Shop** (protects the mission; explicitly not a revenue stream); **(b) transferable only as a GIFT of support (Ally→friend), NEVER a competition wager**; **(c) user opt-out in general settings** (when off, the GT indicator is hidden from Home; ideally also per-Journey "strict"); **(d) separate resource from Coins.** Balance: **regenerating baseline floor + earned top-ups, small cap (~3)**; running out is not punishment (falls back to the gentle §9.10 miss handling); never offered free on-demand. Each use captures a **brief reason → learning, not judgment →** feeds Buddy + Intervention Engine. **Visual:** a "GT" card at the top of Home next to Coins, no "+" button. **Roadmap:** minimal in V2/MVP, full system in V3.
**Reflected in:** `Product_Bible.md` §36 (+ §5A.4, §23 cross-refs), `UX/Home_Screen.md`, `Version_Roadmap.md`.

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
