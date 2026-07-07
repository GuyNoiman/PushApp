# CHANGELOG

Status: Living Document

---

# 2026-07-08 — Phases 4–5 close-out: mockups signed off, designs folded into specs

The initial screen-design iteration (~13 mockup rounds, 2026-07-07) is founder-approved.
Folded every finalized visual decision from the mockups into the permanent UX specs so
nothing lives only in artifacts (repo = source of truth). Append-only; no content removed.

## Changed (appended a "Finalized visual design (mockup v13)" section)
- `UX/Home_Screen.md` (headerless forest home, floating stats, greeting bubble, swipe-report cards, DONE watermark / yellow-urgent / red-missed, nav shadow, hub-vs-default nav open question)
- `UX/Journeys_Screen.md` (Home-matching cards, bottom New + Achievements buttons, secondary detail title)
- `UX/Buddy_Screen.md` (headerless, centered buddy, unified edge-to-edge inventory + Select, locked-tab tooltip, **Hatch/Evolve reveal**)
- `UX/Achievements_Screen.md` (warm base, medals 3-up, condition + count, detail sheet)
- `UX/Explore_Screen.md` (draggable carousels — For you / Top creators / Brands — flex-shrink note)
- `UX/Friends_Screen.md` (Cheer rename, A–Z list, neutral 3-dot menu)
- `UX/Inbox_Screen.md` (Friends/Allies/Groups tabs, IG rows, no Ally tag, notifications excluded)
- `UX/Missions_Modal.md` + `UX/Consistency_Reward_Modal.md` (unified centered modal; Missions · Login tabs; per-mission reward/claim states)
- `UX/Journey_Creation_Screen.md` (pencil edit, prev/next labels, tooltip, equal buttons, "Your why" reminder-list, Recommended Starter Step)

## Added
- `UX/Shop_Screen.md` (new — featured pack + daily grid, warm palette)
- `UX/Weekly_Planning_Screen.md` (new — Bible §34.7 / D12)

## Status
- Phases 1–5 complete. Next: **Phase 6 (Engineering)** — blocked on the founder's "Engineering Bible". POC/MVP scope (D4) still to define together.

---

# 2026-07-06 — Founder Decisions (post Repository Review)

Recorded five founder decisions and folded them into the repository. Canonical record: `06_Decisions/Decision_Log.md`.

## Decisions
- Initial positioning: young adults building meaningful habits/goals across different areas of life (positioning, not a vertical).
- AI is part of the MVP, but no core flow depends on it.
- "PushApp" is a working name (branding deferred).
- POC/MVP scope to be defined together later — tracked as a placeholder.
- Object model: Dream → Journey → Phase (optional, sequential) → Step. "Phase" is a working name.

## Changed
- `Product_Bible.md`: §3.3 (2-month default, configurable), new §3.4A (Phases), §11.2 (Home = action-based), §15.1 + §27 (AI-in-MVP principle), §24 + §32 (positioning), §26 (removed resolved questions).
- `Product_Terminology.md` + `Information_Architecture.md`: added the Phase layer.
- `Product_Roadmap_and_Scope.md`: resolved the MVP×AI open question.
- `Open_Questions.md`, `Investor_Questions.md`, `Pitch_Deck.md`: positioning updated.

## Added
- `06_Decisions/Decision_Log.md`, `04_Product/POC_and_MVP_Scope.md`, `Repository_Review_2026-07-06.md`.

---

# 2026-07-06 — Phase 2 Repository Cleanup (Product Update Merge)

Merged the 2026-07-05 Repository Update chain (`10_Product_Updates/`, 9 files) into the permanent docs and retired the folder to `08_Archive/`.

## Method

- Ran a decision-by-decision absorption audit: ~85–90% was already merged in a prior batch. Only genuine gaps were added (no duplication).

## Added (gaps folded into permanent docs)

- Product Bible: persistent per-run Journey history (§5A.5); Buddy customization/species taxonomy, retention framing, surfaces list, adaptive personality, positive voice-lines (§21).
- Product Philosophy: "The Product Should Feel Alive"; "Marketplace shows life paths, not products"; "Journey creation should require less effort over time".
- AI Product Principles: Principle 17 — "Increase Autonomy, Never Create Dependency".
- Pitch Deck: founder/emotional story + whirlpool metaphor.
- Investor Questions: new Q&As (Why Buddy, Why Gamification, Why-not-habit-trackers, works-without-AI, first commercial version, first paying customer, pricing philosophy, success metrics).
- New file: `04_Product/Product_Roadmap_and_Scope.md` (the Vision/POC/MVP/Commercial/Future staging framework — previously only a skeleton in governance docs).
- Open Questions: subsystem-categorized questions (Journey Engine, AI, Buddy, Marketplace, Gamification, Social).

## Changed

- Removed the stale "Updates – 2026-07-05" temporary wrapper from `Information_Architecture.md` (content is now the live doc).
- Converted legacy "Quest" → "Journey" in `Pitch_Deck.md` and `Investor_Questions.md`.

## Flagged (needs founder decision)

- MVP vs AI: the update says the MVP "may already include premium AI"; Product Bible §15.1/§27 says AI is optional / not core MVP. Recorded as an open question in `Product_Roadmap_and_Scope.md`, to resolve during POC/MVP scoping.

---

# 2026-07-06 — Phase 2 Repository Cleanup (Product Bible Consolidation)

Consolidated the multiple Product Bible files into a single canonical document.

## Changed

- Promoted the newest, most complete Bible (Journey-era) to canonical `04_Product/Product_Bible.md`.
- Merged the two former Draft documents into `Product_Bible.md` as §33 (Founder Notes & Draft Hypotheses), preserving the not-yet-approved status of that material and converting legacy "Quest" terminology to "Journey".
- Archived the superseded versions to `08_Archive/` (old Quest-era Bible, intermediate "updated" Bible, and both Draft files) with a provenance `README.md`.
- Removed `Product_Bible_Draft.md` from the reading order in `README.md` and `AI_Context.md` (its content now lives in the Bible).

## Notes

- Nothing was deleted; all superseded content is preserved in `08_Archive/`.
- Supersedes the 2026-07-03 note that "Product_Bible_Draft.md contains evolving thinking" — that staging role now belongs to `Open_Questions.md`.

---

# 2026-07-03 — Batch 1 Foundation Update

Updated the repository after Founder Interview #1 and subsequent product positioning discussion.

## Added

- Expanded Vision with identity, intentional living, support, and real-life success framing.
- Expanded Core Beliefs with identity, help-seeking, human support, and intervention concepts.
- Expanded Product Principles with Intervention over Notifications and Competition as motivation mode.
- Expanded Open Questions with beachhead market, Competition Mode, Intervention Engine, private support, and repository structure questions.
- Expanded Product Bible with sections on Intervention Engine, Competition Mode, and positioning insight.
- Rebuilt Product Bible Draft as a working space for evolving ideas.
- Filled AI Context with a compact orientation for future AI tools.

## Key Decisions

- Repository remains AI-first.
- Prefer fewer, larger documents over many small documents.
- Product_Bible.md contains approved or high-confidence product knowledge.
- Product_Bible_Draft.md contains evolving thinking.
- Competition Mode is not yet approved as core product; it remains a motivation-mode hypothesis.
- Intervention Engine is a strategic direction requiring validation.

## Still Open

- First beachhead market.
- MVP scope.
- Whether Competition belongs in early product.
- How to measure intervention effectiveness.
- How to clearly outperform existing workflows like Calendar + WhatsApp + Notes.
