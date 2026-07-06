# Current_Context.md

Status: Living handoff — read this right after `AI_Start_Here.md`, then only the docs it points to.
Last updated: 2026-07-07

## How to resume
Read `AI_Start_Here.md` → this file → the memory index. Then pick up at "Next steps". Do NOT re-read the whole repo. The design mockups live as **artifacts** (URLs below), not in the repo; fold locked decisions into the `UX/*.md` docs as they settle.

## Where we are
Phases 1–4 (Learn, Cleanup, Review, UX specs) are complete. **Phase 5 (Design System)** foundations are locked in `04_Product/Design_System.md`. We are now in the **UI-mockup iteration**: turning each screen spec into a high-fidelity mockup, refining with the founder, one screen at a time. Home is the most iterated; a full gallery of all screens exists at initial→v2 fidelity.

## Artifacts (mockups — external, not in repo)
- Home (standalone, v5): https://claude.ai/code/artifact/fcdd30a7-ffa7-4641-a923-368fb6188421
- All screens gallery (v2): https://claude.ai/code/artifact/0ecc3744-3f28-49df-8d28-df47448f7e12
- Source HTML in scratchpad: `home_mockup.html`, `all_screens.html` (session scratchpad — may not persist; rebuild from Design_System + UX specs if gone).

## Locked design system (see `04_Product/Design_System.md`)
- Direction: **A playful game-world (primary) + B calm wellness (secondary)** — "cozy but clean".
- Base **#FAFAF8** (neutral); cards #FFF; ink #2E2E2C. Accents by meaning: **coral** primary/CTA · **teal** brand/nav/growth-progress · **blue** XP · **purple** social/Cheer · **gold** coins · **pink** consistency. Danger = soft coral-red. Status colors gentle.
- Type: **Baloo 2** (display) + **Inter** (body). Radii 8–16, button 48, spacing 4–32.
- Buttons: coral primary with **dark ink label** (white was unreadable). Icon buttons tinted per area. Nav: compact, icon-only, **active icon takes the tab's color**.
- "Concentrate the game-juice (gloss/depth/3D/collectible cards) in reward/identity surfaces (Buddy, Achievements, Missions, celebrations); keep work surfaces (Steps, Journeys, Inbox) clean/calm."
- Founder prefers **seeing visual examples** for any design question (memory: pushapp-design-show-examples). Artifacts (not the inline `visualize` widget) are needed for depth/shadows/gradients; the artifact sandbox blocks web fonts (use `ui-rounded` fallback for Baloo 2) and icon CDNs (use inline SVG).

## Home — locked so far (in `UX/Home_Screen.md`)
Global header (Level+XP left, Coins right) → "Hello, [name]" → Buddy centered, flanked by 4 area buttons (Inbox+Missions left, Consistency+Friends right), stage name only → draggable cream "Week's steps" panel with **right-side scroller** → step cards (compact **Journey icon tile** + name + Journey·Phase + thin progress bar + rounded-square **report control**: check / "+"; completed dimmed at bottom) → compact icon-only teal nav. Buddy now rendered as a 3D-look glossy creature (CSS approximation; real art later).

## DESIGN REFINEMENTS BACKLOG (pending — from 2026-07-07 feedback; execute next session)
New references added to `04_Product/UX/UX_References/`: `achivements.PNG`, `inventory.PNG`, `mission + sign in.PNG`, plus an Explore Netflix/Spotify-scroll ref and an Achievements "medals + condition window" ref the founder mentioned — consult these.

**Home**
- Make the 4 area buttons **3D/graphic**, not plain line icons — more interesting artwork.
- **Report control** (right of step card): make a bit smaller. **Journey icon tile** (left): currently too big — produce **another option** for showing it (smaller / different treatment).
- STILL OWED: show the **"Journeys inside Home" option** — the two-view hub (a top toggle **This week · Journeys**) that frees the nav slot for an **Inbox** tab. Founder asked for this 3×; build it as a visible option.

**Journeys** — good now, except the **Achievements button** must look **interesting/inviting** (like the Home buttons — 3D/graphic, not a flat icon).

**Journey detail** — much better. The **title (Journey name) should read as secondary** — visually distinct from tab-name titles like "Explore" (which are top-level). De-emphasize it.

**Explore** — currently boring; make it lively:
- Show sections are **horizontally scrollable** (Netflix/Spotify style — peeking cards, side-drag) — ref added.
- Add a **carousel of recommended creators**, with a **different card shape** (e.g. circle avatar + username + #journeys created + cumulative likes/uses).
- Add a similar **businesses** carousel, possibly another shape.
- Goal: varied, non-boring layout.

**Journey creation (wizard)**
- Fix messy spacing between the selected value and the arrow; consider a **different edit affordance** than a chevron.
- Replace "Next + list of next steps" with just the **next step and previous step labels beside the Back/Next buttons**; and on tapping the top step-bars, show a **tooltip** with that step's title.

**Friends** — the 3 actions currently span the whole card. Instead use a **three-dots button** that opens a menu with the 3 actions (Cheer / Gift / Message). Remove the "Cheer · Gift · Message" caption at the bottom.

**Buddy**
- Move **buddy name + stage/level to the top**.
- Shop appears twice — keep only the **top-corner Shop**; tapping it opens a **Shop screen (not built yet)**. Add a **Customize** button near Shop (future: real character design).
- The tabs under Buddy need a **container/bounding** (their labels currently blend into the page bg). Tab types should be: **Character (דמות) · Clothing · Items · Location · Furniture**.

**Achievements**
- Background must **match the app** (current purple game bg is off). Make it read like **prizes/medals** (ref added).
- Add the **unlock condition** per prize (e.g. "invite 50 friends"). Founder added a ref of a **detail window on tapping a trophy** but is open to other mechanisms — **give a few options** for showing prize info + conditions.

**Inbox** — good that conversations aren't cards, but the **Allies/Friends/Groups tabs disappeared — bring them back** (as tabs above the IG-style list).

**Missions + Daily/Consistency reward (modals)**
- The **modal should float centered**, not be pinned to the bottom.
- A ref shows **missions together with the daily reward** — consider **merging Missions + Consistency reward into one modal**.

## Two general deliberations (my recommendation — prototype as options)
1. **Per-tab tint + colored active nav icon** — do it *lightly*: neutral page bg + active nav icon in the tab's color (already added) + a subtle colored wash only at the top of each tab. Avoid full per-tab backgrounds (rainbow risk).
2. **Journeys into Home + Inbox as a tab** — recommend a **Home two-view hub** (toggle: This week · Journeys) to free the slot for an **Inbox** tab (nav: Home · Explore · Friends · Buddy · Inbox). Elevates messaging (core to the support thesis) without overloading Home. Build it as an option to view.

## Carried-over open items
- Report-control word (icon-only vs Log/Report/Done) — leaning icon-only.
- Open question: should **Buddy greet "Hello, Guy"**?
- Middle-layer name kept as **Phase**.
- POC/MVP scope still to define together (`04_Product/POC_and_MVP_Scope.md` placeholder).
- Missing docs from the review: object model, onboarding flow, Intervention Engine MVP spec, metrics, privacy.

## Next steps (fresh session)
1. Work the **Design Refinements Backlog** above, screen by screen, rebuilding the gallery artifact in the locked language (start with the two owed items: Home area-buttons as 3D graphics + the **Home two-view hub / Inbox-tab** option, and a smaller Journey-icon-tile option).
2. Build the **Shop screen** (new) and a Journey-detail deeper pass (founder has more notes).
3. Fold locked screen decisions into each `UX/*.md`.
4. Phase 6 (Engineering) remains blocked on an **Engineering Bible**. Git: still uncommitted — offer to commit.

## Read next
- `04_Product/Design_System.md` · `04_Product/UX/*.md` (esp. `Home_Screen.md`) · `04_Product/UX/UX_References/`
- `06_Decisions/Decision_Log.md` · `00_Foundation/CHANGELOG.md`
- `Repository_Workflow.md` (how to work here)
