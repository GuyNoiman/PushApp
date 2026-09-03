# Archive

This folder preserves **superseded backup versions** of repository documents.

Nothing here is authoritative. These files are kept only so that no historical
product knowledge is ever lost. For current, canonical knowledge, always use the
live documents outside this folder.

---

## Contents

### Product_Bible_quest-era_2026-07.md
An older version of the Product Bible that used the legacy term **"Quest"**
(before it was renamed to **"Journey"**). Recovered from git history
(`04_Product/Product_Bible.md` @ HEAD) during the 2026-07-06 repository cleanup.
Fully superseded by the current `04_Product/Product_Bible.md`.

### Product_Bible_updated_2026-07-03.md
An intermediate "Recovery Version" of the Product Bible (dated 2026-07-03).
Every section it contains is already present — and expanded — in the current
`04_Product/Product_Bible.md`. Kept as a backup only.

### Product_Bible_Draft_2026-07-03.md
The former Draft document (a staging area for unvalidated hypotheses):
Founder Interview #1, the Intervention Engine deep-dive, Competition Mode, the
competitive-advantage hypothesis, and a research backlog. Its unique product
reasoning was migrated into `04_Product/Product_Bible.md` §33 (Founder Notes &
Draft Hypotheses); its repository and research notes live in
`Repository_Conventions.md`, `Open_Questions.md`, and `05_Research/`.

### Product_Bible_Draft_updated_2026-07-03.md
A short list of business-model hypotheses (freemium, creator economy, business
Journeys, virtual economy, AI coach, GTM, beachhead). Migrated into
`04_Product/Product_Bible.md` §33.6. Kept as a backup only.

### 10_Product_Updates/ (folder)
The 2026-07-05 "Repository Update" chain (9 files) — a staging document written to
be merged into the permanent docs. During the 2026-07-06 cleanup, an absorption
audit confirmed ~85–90% was already merged; the remaining genuine gaps were folded
into the permanent docs, so the chain is now fully absorbed and retired here.
Where each part went:
- IA (Updates, Updates2) → `00_Foundation/Information_Architecture.md` + Product Bible.
- Buddy (Update3) → Product Bible §21.
- Principles/Philosophy/Appendices (Updates4, 7, 8, 9) → `Product_Principles.md`, `Product_Philosophy.md`, `AI_Product_Principles.md`, Product Bible.
- Pitch/Investor (Updates5, 6) → `Pitch_Deck.md`, `Investor_Questions.md`.
- Roadmap framework (Updates7) → new `04_Product/Product_Roadmap_and_Scope.md`.
- Categorized open questions (Updates6) → `00_Foundation/Open_Questions.md`.

### Competitive_Analysis_stub_2026-07.md
A short framework stub (competitor list + evaluation dimensions). Fully superseded by the live `05_Research/Competitive_Landscape.md`.

### Roadmap_Research_stub_2026-07.md
The former `04_Product/Roadmap/Research.md` — a TODO skeleton of research areas. Its topic list was merged into `05_Research/Research.md`; cited evidence lives in `05_Research/Research_Foundation.md`.

### Glossary_stub_2026-07.md
The former `Glossary.md` — a near-empty terminology stub overlapping `Product_Terminology.md`. Its list of not-yet-defined terms was preserved in `Product_Terminology.md` ("Terms Still To Define").

### Batch_1_Update_Summary.md
A transient process summary from the 2026-07-03 Batch 1 update. Historical only.

---

## Provenance note (2026-07-06)

During Phase 2 (Repository Cleanup), four Product Bible variants existed at once:
`Product_Bible.md` (deleted, Quest-era), `Product_Bible(3).md` (newest & most
complete), and `Product_Bible_updated.md`. The newest and most complete version
was promoted to the canonical `04_Product/Product_Bible.md`; the two older
full-Bible versions were moved here.

### Partner_Onboarding_Spec_and_Flow_2026-08-26.md · Partner_Onboarding_Spec_v2_2026-08-27.md · Partner_Onboarding_Spec_v3_2026-08-30.md · Partner_Onboarding_Corrections_2026-09-02.md
Four successive descriptions of first-run onboarding and the coach's behaviour, written between
26 August and 2 September 2026. They are archived together because the problem they caused was
collective: with four of them live, the founder and the partner were working from different ones,
and a correction arrived for behaviour that had already changed.

Everything still true in them was folded into `04_Product/Onboarding_And_Coach_Spec.md` on
2026-09-03 (D96) — the flow, the phases and their budgets, the invisible-routing rule, the capacity
precedence, the localisation audit, the starting-point summary, the failure cases and the reference
transcript. The five character precisions from the corrections file live in
`app/src/core/coach/coachCharacter.ts`, which that spec generates its §3 from.

Kept for their reasoning and for the record of how the design arrived. Nothing in them needs reading
in order to work from the current spec.

### Onboarding_Coach_Led_UX_PRD_2026-08-31.md
The screen-level UX specification for coach-led onboarding: the shell, each screen's job and copy,
the conversation states, light/dark, RTL, accessibility, edge cases and acceptance criteria. Folded
into `04_Product/Onboarding_And_Coach_Spec.md` §5 on 2026-09-03 (D96), unchanged except that its
"Screen A2 — Personal information review" was dropped (that page left the first run the same day)
and its opening two sections were dropped as duplicates of the spec's own.

Kept because it is the record of the design at the moment it was approved. The live version is §5 of
the spec.
