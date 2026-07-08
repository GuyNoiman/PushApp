# CHANGELOG

Status: Living Document

---

# 2026-07-08 — Phase 6: four local POC pillars built (autonomous run)

The founder asked the team to run autonomously through everything doable without him. Built all
four **local** POC pillars end-to-end — each implemented → adversarially code-reviewed → fixed →
verified → committed on branch `claude/project-continuity-cost-oversight-1ctfso`. Everything stays
**$0** and offline; the one pillar needing a backend (social) is a proposal awaiting approval.

## Pillars (app/, Expo + TS, engine-based)
- **1 · Journey creation** — `journey/new` modal wizard (title · why · duration/rhythm · Steps ·
  Starter Step); in-context local reminders; wired to `JourneyEngine`.
- **2 · Buddy** — Buddy tab (`BuddyScene`), warm reactions + `EvolveReveal`; focus-gated
  `useBuddyMoments` hook (fixed a cross-tab double-celebration). Replaced the deferred Explore tab.
- **3 · Coins + Shop** — `ShopEngine` + `config/shopItems` (6 cosmetics), `shop` modal, equipped
  cosmetic renders on the Buddy; hardened state migration.
- **4 · Missions + Login** — `MissionEngine` (injected clock), `missions` modal, Coins-only single
  reward path (`RewardGranted → BuddyEngine`), pure reads + foreground rollover that auto-claims
  earned-but-unclaimed Coins (non-punishing).

Engines now: Journey · Reward · Buddy · Reminder · Shop · Mission. **jest 35/35, `tsc`=0, web export ok.**

## Awaiting founder (gate)
- `11_Engineering_Bible/Social_Backend_Proposal.md` — the social/Allies pillar needs a backend
  (Supabase free tier, $0); decision-ready, **nothing provisioned** (§3.10). Becomes E2 on approval.

## Next
- Founder tests the 4 pillars in Expo Go (`app/README.md`) and reviews the social proposal.
  Device smoke-tests owed (native tabs, modals, rollover-across-midnight, persistence). Then visual
  polish toward the mockups, and TestFlight when wanted.

---

# 2026-07-08 — Phase 6 begins: Cost Guardian + POC stack + Expo app scaffold

Started engineering. Added a cost-oversight team role, chose the POC stack, and scaffolded the app.

## Team
- New sub-agent **cost-guardian** (`.claude/agents/cost-guardian.md`): warns in Hebrew before any
  action that could incur a real charge or approach a paid quota. Wired into CLAUDE.md §4 (team),
  §5 (triggers), and new constitutional rule §3.10.

## Decisions (Engineering_Decisions E1)
- **E1 — POC stack.** Expo (React Native) + TypeScript, engine-based architecture; offline-first,
  local notifications; cloud backend (Supabase free tier) deferred to the social pillar. Chosen for
  $0 instant iOS testing (Expo Go, no Mac/Apple account), future web reuse, and Bible alignment.
  Alternatives (native Swift, Flutter, PWA) rejected — see `11_Engineering_Bible/Engineering_Decisions.md`.

## Added / Changed
- New: `11_Engineering_Bible/Engineering_Decisions.md` (E-log); the `app/` Expo project — pure-TS
  engines + event bus + config + offline `Repository`/`LocalRepository` + `AppCore`, and an
  action-based **Home** screen (seeded demo Journey; check-in → engines → Buddy reacts). `tsc` clean.
- `CLAUDE.md` §6 (Stack: TBD → Expo/TS engines); `06_Decisions/Decision_Log.md` (E1 pointer);
  `.gitignore` (node_modules/.expo/dist/native/env excluded so deps never bloat history).

## Next
- Founder feedback on Home (test via Expo Go on his machine). Then build POC pillars in order:
  Journey-creation flow → Buddy evolve UI → Coins/Shop → Missions+Login → social/Allies (Supabase
  free tier enters here, behind the abstraction; cost-guardian reviews first).

---

# 2026-07-08 — Product & business strategy locked (POC/MVP, roadmap, revenue, Grace Tokens)

Jointly defined the build & business strategy after design sign-off.

## Decisions (Decision_Log D13–D17)
- **D13/D14 — POC + MVP + roadmap.** POC tests social + Buddy + reward-loop → persistence; lean MVP = POC + Explore/library + onboarding(egg→hatch) + Phases/full types + light-AI encouragement/reminders; rest → Commercial. (`POC_and_MVP_Scope.md`, resolves D4.)
- **D15 — 5-version roadmap + Rich Step Types.** All remaining work ranked V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem · V5 Future/Optional (`Version_Roadmap.md` + `Version_Roadmap.pdf`). New vision idea **Rich Step Types** (Bible §35).
- **D16 — Revenue streams.** Bible §23 rewritten as a 5-stream portfolio (Shop/coins · subscription · creator marketplace · business/branded Journeys · coach tier); mirrored in Pitch_Deck §9 + Investor_Questions §14.
- **D17 — Grace Tokens.** New flexibility mechanic (Bible §36, + §5A.4/§23 cross-refs, Home spec): earned-only/never-buyable · gift-not-wager · opt-out · regenerating floor; GT card added to Home mockup (v14).

## Added / Changed
- New: `04_Product/Version_Roadmap.md`, `04_Product/Version_Roadmap.pdf`.
- Bible: rewrote §23; added §35, §36; cross-refs in §5A.4.
- Pitch: `Pitch_Deck.md` §9, `Investor_Questions.md` §14 updated.
- `POC_and_MVP_Scope.md` fully written; `UX/Home_Screen.md` GT indicator; `Decision_Log.md` D13–D17; `Current_Context.md`.

## Next
- Build the **investor presentation / pitch deck**. Then Phase 6 (Engineering) — still blocked on the Engineering Bible.

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
