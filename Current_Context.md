# Current_Context.md

Status: Living handoff — read this right after `AI_Start_Here.md`, then only the docs it points to.
Last updated: 2026-07-08 (engineering sprint)

## How to resume
Read `AI_Start_Here.md` → this file → the memory index. Then pick up at "Next steps". Do NOT re-read the whole repo.

## ⭐ HANDOFF SNAPSHOT — 2026-07-08 (ENGINEERING — read this first)
**Phase 6 (Engineering): all FOUR local POC pillars are BUILT.** The founder asked the team to
run autonomously through everything doable without him; done up to the one gate that needs him
(the social backend). The investor-deck task (older "NEXT") remains **deferred**, not cancelled.

- **New team role: Cost Guardian** (`.claude/agents/cost-guardian.md` + CLAUDE.md §4/§5 and rule
  §3.10) — warns in Hebrew before any action that could cost money or approach a paid quota.
- **Stack (E1):** **Expo (React Native) + TypeScript**, engine-based (`11_Engineering_Bible/Engineering_Decisions.md`
  §E1; CLAUDE.md §6). App in `app/` (Expo SDK 57). Pure-TS core under `app/src/core/`; business logic
  ONLY in engines (verified: no react/expo import in `src/core`).
- **Built pillars (each: implemented → code-reviewed → fixed → verified → committed):**
  0. **Scaffold** — EventBus, `AppCore` composition root, offline `Repository`/`LocalRepository`,
     config-before-code, action-based **Home** (seeds a demo "Run 5km" Journey).
  1. **Journey creation** — `journey/new` modal wizard (title·why·duration/rhythm·Steps·Starter Step),
     in-context local reminders.
  2. **Buddy** — Buddy tab: `BuddyScene`, reactions + `EvolveReveal`; focus-gated `useBuddyMoments`.
  3. **Coins + Shop** — `ShopEngine` + `config/shopItems`, `shop` modal, equipped cosmetic on the Buddy.
  4. **Missions + Login** — `MissionEngine` (injected clock), `missions` modal, Coins-only single
     reward path, foreground rollover with auto-claim (no forfeited Coins).
  - Engines: `Journey / Reward / Buddy / Reminder / Shop / Mission`. **Tests: jest 35/35; `tsc`=0;
    web export ok.** Nav = Home + Buddy tabs; Journey/Shop/Missions are modals.
- **Cost so far: 0₪.** All local. Apple Developer account only later for TestFlight/store.
- **⚠️ Env constraint:** `api.expo.dev` is blocked from THIS container (403). Here use `EXPO_OFFLINE=1`
  for `expo install`/`expo start`. **Founder tests on his own machine:** `git pull` → `cd app &&
  npm install && npx expo start` → scan QR with **Expo Go** (same WiFi). `app/README.md` has the guide.
  Fresh clone: run `npx expo start` once before `tsc` (regenerates the gitignored `expo-env.d.ts`).
- **Device smoke-tests still owed** (can't run here — no device): native-tabs render/switch;
  Journey modal present/dismiss; cross-tab Buddy reveal; Missions daily/weekly rollover across a real
  midnight on foreground; AsyncStorage persistence across restart.
- **🚦 GATE — social/Allies pillar needs the founder.** It's the only POC pillar needing a backend.
  A decision-ready **proposal awaits approval**: `11_Engineering_Bible/Social_Backend_Proposal.md`
  (Supabase free tier = $0; `SocialGateway` abstraction; nothing provisioned per §3.10). On approval
  it becomes E2 and gets built behind a feature flag.
- **NEXT:** (1) founder opens the app in Expo Go and gives feedback on the 4 pillars; (2) founder
  reviews the social backend proposal → approve/adjust so the social pillar can be built; (3) address
  device smoke-test findings; (4) later: visual polish toward the mockups, then TestFlight when wanted.

---

## HANDOFF SNAPSHOT — 2026-07-08 (product & business strategy)
**Phases 1–5 complete; product + business strategy locked.** Sessions 2026-07-07/08 delivered:
- **Design:** all finalized screen decisions folded into `UX/*.md` + new `Shop_Screen.md`/`Weekly_Planning_Screen.md`; committed (86187eb). Latest mockup = **v14** (GT card) — link under Artifacts. Mockup is a *reference*; `UX/*.md` are the source of truth.
- **POC / MVP / roadmap** (`POC_and_MVP_Scope.md`, D13/D14): POC = does **social + Buddy + reward-loop** drive persistence; **lean MVP** = POC + Explore/library + onboarding(egg→hatch) + Phases/full types + light-AI encouragement/reminders.
- **5-version roadmap** (`Version_Roadmap.md` + **`.pdf`**, D15): V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem · V5 Future/Optional. Table artifact 9cdeb986.
- **Rich Step Types** vision (Bible §35, D15) — V4/Future, investor material.
- **Revenue model** (Bible §23 rewritten, D16): 5-stream portfolio — Shop/coins · consumer subscription · creator marketplace · business/branded Journeys · coach tier; mirrored in `03_Pitch/`.
- **Grace Tokens** (Bible §36, D17): earned-only/never-buyable · gift-not-wager · opt-out · regenerating floor; GT card in Home mockup v14.
- Decisions **D1–D17** are canonical in `06_Decisions/Decision_Log.md`.

**▶ NEXT: build the investor PRESENTATION / pitch deck** (founder's next request; start from `03_Pitch/Pitch_Deck.md` + `Investor_Questions.md`, Vision, POC/MVP, Version_Roadmap, revenue §23, Rich Step Types §35). After that, Phase 6 (Engineering) is still blocked on the **Engineering Bible** (empty `11_Engineering_Bible/` folder exists).

*(The dated per-round mockup-refinement logs below (v3–v12) are historical process notes — superseded by the folded specs + git history; kept for provenance, not needed to continue.)*

## Specs folded in — DONE 2026-07-08
The initial screen design is **signed off**. All finalized v13 decisions are now folded into the repo (no longer artifact-only): each `UX/*.md` got an appended **"Finalized visual design (mockup v13 — 2026-07-08)"** section (append-only, nothing lost), and two new specs were created: **`UX/Shop_Screen.md`** and **`UX/Weekly_Planning_Screen.md`**. The artifact is now a *reference*, not the source of truth — the `UX/*.md` docs are canonical. Phases 1–5 complete; design commit landed (86187eb). **POC + MVP + roadmap staging now DEFINED together** (2026-07-08) in `04_Product/POC_and_MVP_Scope.md` (D13/D14 — D4 fully resolved): POC tests social+Buddy+reward-loop → persistence; MVP = POC + Explore/library + onboarding(egg→hatch) + Phases/full-types + light-AI encouragement/reminders; rest → Commercial. **4-version release plan** now drafted in `04_Product/Version_Roadmap.md` (V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem — all remaining work ranked; D15). New vision idea captured: **Rich Step Types** (Bible §35, Stage: Future — video/audio/quiz/reflection/etc. Steps; investor-vision material). **Revenue streams consolidated** (D16): Bible §23 rewritten as a 5-stream portfolio (Shop/coins · consumer subscription · creator marketplace · business/branded Journeys [promoted from §33.6 hypothesis] · coach/pro tier), version-mapped; mirrored in Pitch_Deck §9 + Investor_Questions §14. 5-version roadmap table also exported to **`04_Product/Version_Roadmap.pdf`** (generated via headless Chrome from `scratchpad/version_table.html`; artifact https://claude.ai/code/artifact/9cdeb986-c3c7-48fe-80ef-8af16eb50bc8). **Next per the work plan: Phase 6 (Engineering)** — note an empty-ish `11_Engineering_Bible/` folder exists; still BLOCKED on the founder providing the Engineering Bible content. Uncommitted since the 86187eb design commit: POC/MVP scope, Version_Roadmap(.md/.pdf), Bible §23+§35, Pitch updates, Decision_Log D13–D16 — offer to commit.

## Where we are
Phases 1–4 (Learn, Cleanup, Review, UX specs) are complete. **Phase 5 (Design System)** foundations are locked in `04_Product/Design_System.md`. We are in the **UI-mockup iteration**. Latest = **`all_screens_v3.html`** (full round, 2026-07-07): every screen reworked per the backlog + two new screens (Shop, Weekly Planning). Three decisions await the founder (see "STATUS OF THE v3 ROUND"). Separately, the **Atomic Habits product spec (§34)** is now in the repo. **Next priority: fold the v3 visual decisions into the per-screen `UX/*.md` docs** — they currently live mostly in the artifact only.

## Artifacts (mockups — external, not in repo)
- **All screens — LATEST (2026-07-08, adds Grace Tokens "GT" card in Home header):** https://claude.ai/code/artifact/bfa84846-91c3-42c2-bded-035ab93f2d08 — source `all_screens_v14.html` (== v13b + a purple "GT" card top-of-Home next to Coins, no "+"; one-line fit verified via isolated header screenshot). Use THIS link.
- Version roadmap TABLE (5 versions incl. Grace Tokens): https://claude.ai/code/artifact/9cdeb986-c3c7-48fe-80ef-8af16eb50bc8 · PDF `04_Product/Version_Roadmap.pdf` (5 pp; regen via headless Chrome from `scratchpad/version_table.html`).
- All screens — prior (v13b, pre-Grace-Tokens):** https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba — source: `all_screens_v13b.html`. **Fixed the real bug:** Explore `.hs` carousels were being flex-compressed (their `overflow-x:auto` collapsed `min-height` to 0, so in the content-heavy Explore the flex column shrank them, clipping the creator-card text below the buddy). Fix = **`flex-shrink:0` on `.hs`**. Also creator buddy 40px. Verified with a full-content Explore replica screenshot. Use THIS link.
- Explore-only replica (proof the creators card renders): https://claude.ai/code/artifact/ff3f33e9-c038-444e-847f-56ee3cabcc17
- NOTE: republishing to the SAME artifact URL repeatedly caused a stale-cache render for the founder — always publish to a NEW path/URL when he needs to see a change.
- Old rolling URL (63dba7b5, may be cached): https://claude.ai/code/artifact/63dba7b5-a2c9-4393-9484-fa5ad2139070
- All screens — full round v3 (2026-07-07): https://claude.ai/code/artifact/20702d07-e09f-485e-8476-57625fcf848e
- Home refinements v3 (options: hub, 3D buttons, tile A/B/C): https://claude.ai/code/artifact/0ce95016-42e3-400d-86c8-08b40db5b71c
- Home (standalone, v5): https://claude.ai/code/artifact/fcdd30a7-ffa7-4641-a923-368fb6188421
- All screens gallery (v2, superseded): https://claude.ai/code/artifact/0ecc3744-3f28-49df-8d28-df47448f7e12
- Source HTML in scratchpad: `all_screens_v3.html` (newest), `home_refinements.html`, `all_screens.html`, `home_mockup.html` (session scratchpad — may not persist; rebuild from Design_System + UX specs if gone).

## Locked design system (see `04_Product/Design_System.md`)
- Direction: **A playful game-world (primary) + B calm wellness (secondary)** — "cozy but clean".
- Base **#FAFAF8** (neutral); cards #FFF; ink #2E2E2C. Accents by meaning: **coral** primary/CTA · **teal** brand/nav/growth-progress · **blue** XP · **purple** social/Cheer · **gold** coins · **pink** consistency. Danger = soft coral-red. Status colors gentle.
- Type: **Baloo 2** (display) + **Inter** (body). Radii 8–16, button 48, spacing 4–32.
- Buttons: coral primary with **dark ink label** (white was unreadable). Icon buttons tinted per area. Nav: compact, icon-only, **active icon takes the tab's color**.
- "Concentrate the game-juice (gloss/depth/3D/collectible cards) in reward/identity surfaces (Buddy, Achievements, Missions, celebrations); keep work surfaces (Steps, Journeys, Inbox) clean/calm."
- Founder prefers **seeing visual examples** for any design question (memory: pushapp-design-show-examples). Artifacts (not the inline `visualize` widget) are needed for depth/shadows/gradients; the artifact sandbox blocks web fonts (use `ui-rounded` fallback for Baloo 2) and icon CDNs (use inline SVG).

## Home — locked so far (in `UX/Home_Screen.md`)
Global header (Level+XP left, Coins right) → "Hello, [name]" → Buddy centered, flanked by 4 area buttons (Inbox+Missions left, Consistency+Friends right), stage name only → draggable cream "Week's steps" panel with **right-side scroller** → step cards (compact **Journey icon tile** + name + Journey·Phase + thin progress bar + rounded-square **report control**: check / "+"; completed dimmed at bottom) → compact icon-only teal nav. Buddy now rendered as a 3D-look glossy creature (CSS approximation; real art later).

## PRODUCT SPEC — Atomic Habits additions (DONE 2026-07-07, in repo)
Founder gave 7 behavioral-design notes (Atomic Habits). Saved as **Bible §34** (§34.1–34.7), **Decision_Log Batch 2 (D6–D12)**, and woven into `UX/Journey_Creation_Screen.md` + `UX/Home_Screen.md`: D6 Step title+description (hidden → 3-dot "More Info") · D7 no dedicated Habit Stacking (calendar/location triggers) · D8 Starter Step (≤2min) · D9 identity/motivation Qs → personal encouragement · D10 immediate elegant celebration (variations) · D11 flexible non-punishing streaks · D12 weekly planning confirmation flow (**new Weekly Planning screen owed**).

## STATUS OF THE v3 ROUND (2026-07-07)
**Confirmed by founder:** Step-card icon = **Option C** (inline mini-icon) · area buttons **3D, icon-only (NO text)** · report control 32px. **Regressions fixed in v3:** right-side **scroller** restored · original flat **coin chip** restored.
**Applied in `all_screens_v3.html`:** Home (This week + Journeys-hub toggle, 3D buttons, scroller, Option-C, 3-dot menu) · Journeys (3D Achievements emblem) · Journey detail (name as secondary w/ eyebrow) · Explore (horizontal-scroll rows + creators carousel + brands carousel) · Journey creation (pencil edit affordance, prev/next names on buttons, step-bar tooltip, Starter Step, Your-why identity Qs) · Friends (3-dot action menu, caption removed) · Buddy (name/level top, single Shop top-right, Customize btn, bounded 5-tab container: Character·Clothing·Items·Location·Furniture) · **Shop screen (NEW)** · Achievements (warm base, medals+conditions — 2 options: inline + detail sheet) · Inbox (Allies/Friends/Groups tabs back) · Missions+reward (**one centered floating modal**, merged w/ Missions·Daily tabs) · **Weekly Planning screen (NEW)**.
**Awaiting founder's call:** (a) the **Home hub + Inbox-as-nav-tab** — shown as an option, not locked; (b) **merging** the two reward modals vs keeping separate; (c) which Achievements condition treatment (inline / detail sheet / both).

## v12 REFINEMENTS (founder feedback on v11, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v12)
Note: "Your why" was rebuilt with fresh `.qblk`/`.ansbox` classes (the old `.qwrap{flex:1}`/`.abig{flex:1}` caused the overlap); button footer is now transparent (no bar). DONE = `.donebg` watermark behind `.m` (which is z-index:1).
**Home:** "Ends today" badge should sit **half-in/half-out** of the card top (a touch higher). The green **"DONE" must be a background watermark** (text can overlap it) — currently it's an inline stamp that pushed the Journey name to wrap.
**Explore Top creators:** add the **creator username** and a **registrations count** (total sign-ups across their content — counts each registration, not unique people).
**Your why (still broken):** the **buttons got a background/footer bar that shouldn't be there**; the **questions overlap** — structure must be Q → answer box → Q → answer box → Q3 → the special input box, cleanly stacked. Rebuild simply.
Rest looks good for this stage.

## v11 REFINEMENTS (founder feedback on v10, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v11)
**Urgent card:** founder OK with the "Ends today" tag as a **floating badge on the top-right corner** (slightly overlapping the top edge) — name stays one line.
**Your why:** the **buttons jumped up** — they must **stay pinned at the bottom** (their place). The **first two questions disappeared** — bring them back. Too much gap between the input and the entered answers — the **char-limit (0/50) indicator should move** (inline, not its own line taking space).
**Explore "For you":** the **icon takes too big a share** of the card — the name is the most important, then duration, then #steps; the icon is just decoration (later replaced by a **user-uploaded image** when the Journey is made public). Slim the image area, let text dominate; show duration + steps.
**Top creators:** show that **creator's own buddy + level** (not a generic avatar). **Businesses:** keep the **logo** (as done).

## v10 REFINEMENTS (founder feedback on v9, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v10)
Note: urgent-card tag put back INLINE (margin-left:auto) for height-consistency with other cards — founder may still want its own row; watch for feedback. Home/Buddy now share the forest bg + floating level/coins (no header bar).
**Home + Buddy — remove the header bar.** The **level object + coins object** keep the same positions but **float** (not inside a header). **Coins object height = level-bar height** (shrink it). The whole page **background = the forest** (from Buddy tab), continuing behind the floating level/coins — **lighten it a touch** so buttons/objects stay prominent. **"Hello Guy" becomes a speech bubble above the buddy, centered** (as if the buddy says it). Add a **shadow separating Weeks-steps from the buddy area**, and **more shadow under the nav** (make nav pop).
**Urgent (yellow) card:** still can't fit all text; "Ends today" takes too much height; line-spacing differs from other cards. At the current enlarged size, make everything fit and **look consistent with the other cards**.
**Explore:** text/images **still overflow the cards** — actually make them fit.
**Your why:** revert my change. First two questions were good (answer boxes — can shrink slightly). Only the **last question**: short answer input + **Add** button, **max 50 chars**; on Add the sentence appears **below with grey bg + an X to delete**, and the input **clears** for the next. Page scrolls.

## v9 REFINEMENTS (founder feedback on v8, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v9)
**Header:** remove **"Lv 13"** (level already in the circle) → bar can be narrower. Remove the **yellow border**. **Add the + back to the coin** pill.
**Weeks steps:** "Ends today" tag + resize good, but keep the **same top/bottom padding as before** (text currently overflows the card). For **completed** steps, replace the ✓ wash with a **"DONE" stamp** like the Journeys tab.
**Explore:** text/images **still overflow cards** — enlarge cards a bit or shrink images so they fit. **Top creators** needs a **different icon** (not the same star as "For you").
**Your why:** not good — content **hides behind the buttons** (buttons should be a pinned **navbar**, content scrolls above). The reminders field needs a **short-text input + Add**: on Add, the sentence becomes a **grey chip** and the input **clears** for the next.
**Buddy:** straight corners good. The **forest bg must fill all free space** up to the inventory (kill the dead strip); **center the buddy** in that area. The unlock **tooltip should point at the locked tab**, not just straight down. (Loved the hatched egg!)
**Home:** make the **Weeks-steps panel full-width with straight corners**, same as the inventory.

## v8 REFINEMENTS (founder feedback on v7, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v8) + new refs
New screen added: **hatch/evolve reveal**. New pattern: **locked-tab "coming soon"** tooltip. Still owed to spec: **Buddy_Screen.md** (hatch reveal, locked-until-level, forest scene, Select), **Shop_Screen.md**, **Weekly_Planning_Screen.md** — all still artifact-only.
Refs provided: (1) a **level meter** — gold-framed bar with the level circle overlapping the left, "3,450/5,000 XP" inside, and a "Level 71" dark segment on the right; (2) a **Mythic character reveal** ("Glacidrake") — dark bg + radial burst + rarity tag + name + creature w/ stars + COLLECT button + "Open Store" — ref for the **buddy hatch/evolve reveal** AND the **"coming soon" locked-ability** style; (3) a **coins pill** (gold star-coin + amount in a framed pill).
**Header:** **drop gems** for now. **Connect the XP bar to the level circle** as one unit (per ref 1): count goes **inside the bar on one line**, and it should read **"EXP"** not "XP". Restyle **coins** per ref 3 (framed gold star-coin pill).
**Weeks steps:** keep yellow bg + "Ends today" but give the **tag its own row** (card height may grow). Keep the **✓ background wash but remove the ✕** (missed card: no mark) — or use a **"DONE" stamp** like the Journeys page.
**Journey buttons:** good. ✓
**Explore:** good now — just **verify images/text stay inside the card borders**.
**New Journey wizard:** disabled Back is good but it's **smaller than Next — make them equal size**.
**Plan the steps:** the **"Optional" tag reads as applying to the whole section — remove it** (keep the Recommended tag on the starter card).
**Your why:** "What to remember when it's hard" should be a **list of short answers** (one or more motivation sentences) that get prompted when needed — not a single box.
**Buddy:** inventory great — make its **top corners square** (flat, not rounded). Put the **avatar in the middle** with a **3D forest background** behind it.
**New — Buddy hatch/evolve reveal screen** (per ref 2): rarity tag + name + creature w/ burst + COLLECT.
**New — "Coming soon" locked ability:** lock a specific **inventory tab** with a tooltip like **"Unlocks at level 20"** (proper game phrasing).

## v7 REFINEMENTS (founder feedback on v6, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v7)
Note: the black-blob bug was `.cardmark` svg missing `fill:none` (rendered filled). Explore "destroyed" look was the `.hs` negative-margin bleed clipping under `overflow` — removed it; Explore reverted to the V3 three-carousel form (For you jtiles · Top creators round · From brands wide) with vertical scroll + horizontal drag.
**Header:** visually **join the XP bar to the level circle** (one unit). Put the **340/500 count ABOVE** the bar. Bar can be **shorter**, count text **smaller**. Try to put **coins + gems on one horizontal line** (not stacked) if width allows; if not, keep stacked or drop gems for now.
**Journeys:** the bottom buttons' **frame is too prominent**; the **+ create button reads badly** (plus swallowed by the gradient) — fix.
**Weeks steps:** the green card has a **black blob** in the bg (bug — the ✓ renders filled) — must be a clean ✓/✕ or nothing. Rename **"Reported" → "Completed"** (more positive). Add a **yellow background** state for a step whose window is about to pass (urgent). The **line at the top of the panel** (drag handle) looks unnecessary — remove.
**Explore:** still looks broken — **restore the V3 version** (the one I praised). Needs: normal **vertical scroll** + **horizontal drag** in carousels; enough **left margin**; keep **varied card shapes**; **headers must not hide the carousel**.
**Friends:** replace the word **"help" → "cheer"** (section title + the Help button → Cheer). Friends listed under "Needs your cheer" should **also appear in "Your friends"** (sorted **A–Z**) for now.
**Buddy:** inventory box **still not full width** — drop its rounded corners and **stretch it edge-to-edge**.
**Login modal:** delete the **8th-day tile ("+21")** that isn't in the week. Add a **divider between the day number and the reward**; put the coin/gem **icon beside the amount (horizontal), not above** (smaller icon + font).
Rest looks good.

## v6 REFINEMENTS (founder feedback on v5, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v6)
**Home header:** use the **horizontal XP bar** (not the ring around the level). "Level 12" appears **twice** — remove one. The **340/500 count must sit adjacent to the XP** bar.
**Weeks steps:** button + background wash are great, but the ✓/✕ **watermark isn't legible** — either make it clearly a ✓/✕ in the background or remove it entirely.
**Journeys:** the New button should be **icon-only**, and put **both buttons (New + Achievements) in a bottom row** across the width.
**Explore:** regressed — "looks terrible" vs a few versions ago (content overflows/clips). Fix layout (make it **scroll vertically**, clean spacing).
**New Journey:** on step 1, **Back** is irrelevant → hide or **disable** it. **Plan the steps:** remove the example line. **Your why:** correct now! — but **add the Back button**; the primary button shows **"Skip" when all fields empty**, else "Next".
**Buddy:** inventory can use the **full screen width**; apply the **same header fix** here.
**Shop:** much better. ✓
**Achievements:** drop the **yellow background** on the count; when showing 18/30, "**12 more**" must be **lower hierarchy** (muted/smaller) — same in the detail sheet.
**Modal:** tab **text alignment** still off. Rename **"Daily reward" → "Login"** (simpler). The claim button should just say **"Claim"** (don't repeat the reward amount).

## v5 REFINEMENTS (founder feedback on v4, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v5)
**Home header:** keep the gem/diamond. **Remove one XP meter** (has both a ring around the level + a horizontal bar — keep only one). **Remove the username.** **Stack gems above/below coins** (vertical) to free width — header felt cramped.
**Week's steps:** remove the "swipe to report" caption. Remove the confusing left-edge **swipe arrow** on the first card. The ✓/✕ must live **in the card background** and **NOT replace the 3-dot** (keep the 3-dot on every card; show done/miss as a background wash + mark). Slightly **reduce the step/Journey-name font**.
**Journeys tab:** cards still don't match Home cards — put the **icon inline in the title row** (like Option C), not a centered left tile.
**Explore:** a section was dropped — **bring back the creators carousel** (round cards). Ensure enough **left margin** on the first card of each row (initial state looked flush-left).
**New Journey entry:** the **create entry/button is missing** — add it (Explore "Build your own" and/or a + on Journeys). **Remove "Show me similar"** for now → move to a future-ideas list. Edit affordance + tooltip now good. ✓
**Starter step:** replace the two tags with a single **"Recommended"** tag; reword as a recommendation: *"Adding a small ≤2-min first step raises the chance of finishing."*
**Your why:** wrong execution — the **question should NOT be boxed**; only the **answer** gets a box (bigger, filling the screen). The **colors are off** (purple) — use on-brand neutral.
**Buddy tab:** header must be **identical to Home** header. Shop + Customize buttons **stacked vertically** and in the **same button style as the others** (3D). Inventory takes **too much height** — shrink it, add an **internal scroller**, and add a **"Select" button** at the bottom that applies the choice. Framing good. ✓
**Shop:** recolor to the **app's palette** (warm, not deep blue).
**Achievements:** better now. ✓
**Missions/reward modal:** the **"Daily reward" tab is hidden under the X** — fix overlap. The **Claim↔reward layout** is poor — give the reward a **fixed column separated by a vertical divider**; and **move the progress indicator (2/3)** elsewhere (near the bar, not stacked under the reward).
Still to tune: Shop (more refs coming) · Explore per-type info depth · Weekly planning interaction.

## v4 REFINEMENTS (founder feedback on v3, 2026-07-07 — APPLIED in `all_screens_v4.html`)
A new game **Shop reference** was provided (structured header w/ level badge + resource pills w/ icons; "Chapter Pack" featured offer w/ 600%-value badge; "Daily Shop" grid w/ discount badges, gem prices, "Purchases left", refresh timer; bottom sub-tabs). Tune Shop toward it; more refs coming.

**Global header** — I wrongly stripped the coin (+rope) icon; bring back a proper **coin icon** closer to the refs. Make the **level badge + whole header** prettier and more structured (reference-style resource pills w/ icons).

**Home Step cards** — the 3-dot + the check(V) control together are too wide. **Keep only the 3-dot**; expose reporting via **long-press (= 3-dot)** OR **Tinder-style swipe-right**. After reporting: **done → the whole card turns green** with the V woven into the card bg; **not-done → whole card turns red with an X**. (No separate report button.)

**Journeys tab** — use the **same smaller-icon card** design (Option C / small tile), not the big 36px tile.

**Journey detail** — title now good. ✓

**Explore** — good direction. Show the *important* info per type: friends-recommend → Journey name + which friend; business → business **logo + business name + Journey name**; for-you → **duration / frequency** etc. (deepen later). **Remove the "drag" word** from the "For you" row — make all rows like the two bottom carousels (no drag label).

**New Journey**
- **Tooltip hides behind the title** — fix stacking/position.
- Step names above the buttons — excellent. ✓
- **Starter Step is OPTIONAL, not mandatory**, and belongs in the **step-creation stage**. Move the **Step description** field to a different stage (e.g. where the title/name is first defined).
- **"Your why"** is great — **use full screen height**: enlarge the question cards, format as **question → answer bubble → question → answer bubble …**

**Friends**
- **Enlarge the 3-dot button** (barely visible) — circle it so it reads as a button.
- The opened menu: **drop the colors**; do it like big apps (deciding text-only vs icon-only — match convention).

**Buddy**
- **Header disappeared — bring it back.**
- Customize + Shop buttons should be **icon-only (no text)** — like the inventory tab names (also no text).
- Find a **different location** for the buddy **name + stage name**.
- Inventory items should be **smaller** (there will be many) + **scroll/drag**; the whole inventory needs a **single unified frame** (not separate-looking parts).

**Shop** — first pass toward the new reference (see above).

**Achievements**
- **No right margin** currently; want **3 prizes per row** — reduce card width.
- **Drop the progress bar**, replace with a **count** (e.g. "4/10 · 3 more").
- Detail sheet enlargement liked, but **add a close button.**

**Inbox** — great now. Tab order → **Friends (default), then Allies, then Groups.** **Remove the "Ally" tag** by Noa. **"Noa sent a gift" is a notification, not a message** — don't show it as a conversation.

**Missions + Daily reward modal**
- Make clear that **Daily/Weekly live UNDER "Missions"** (hierarchy unclear now).
- Show **each mission's reward before it's completed**.
- **No per-mission icon.**
- Add states: mission **done-but-unclaimed** (indicator), and **claimed** (grey + "Claimed" ✓).
- **Daily reward:** short button text; day-1 green **less prominent**, day-7 red **not prominent** — all days **disabled** with gentle shade variations; **show each day's reward** (check refs).

**Weekly planning** — good; refine later. ✓

## DESIGN REFINEMENTS BACKLOG (original 2026-07-07 feedback — mostly addressed in v3 above; kept for reference)
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
1. **Build the investor PRESENTATION / pitch deck** — the founder's next task. Inputs: `03_Pitch/Pitch_Deck.md` + `Investor_Questions.md` (current), `01_Vision/Vision.md`, `POC_and_MVP_Scope.md`, `Version_Roadmap.md` (+ PDF), revenue Bible §23, Rich Step Types §35, the mockup v14 (visuals). Clarify format/audience/length with founder first. Founder likes seeing visuals — consider an artifact deck.
2. Open design calls still un-locked (carry if they come up): Home hub + Inbox-tab nav option; whether GT appears on the Buddy header too (currently Home only).
3. Phase 6 (Engineering) remains blocked on the **Engineering Bible** (empty `11_Engineering_Bible/` folder exists — populate together or await founder content).
4. Git: work through D17 committed as of 2026-07-08 (see CHANGELOG). Keep committing per batch.

## Read next
- `04_Product/Design_System.md` · `04_Product/UX/*.md` (esp. `Home_Screen.md`) · `04_Product/UX/UX_References/`
- `06_Decisions/Decision_Log.md` · `00_Foundation/CHANGELOG.md`
- `Repository_Workflow.md` (how to work here)
