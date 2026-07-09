# Design-Fidelity Audit — coded app vs. intended design

Status: Draft · 2026-07-09 · author: ux-designer

> A screen-by-screen comparison of the **coded app** (`app/src/…`) against the **Design System**
> (`04_Product/Design_System.md`), the **per-screen UX specs** (`04_Product/UX/*.md`), and the
> **finalized v14 mockups** (deck screens 01–18). Audit only — no code was changed.
> Deviations are ranked by visual impact: **P0** (breaks the brand at a glance), **P1** (clearly
> off-design), **P2** (polish). File + concrete change is given for each.

---

## Top fixes for tomorrow (the 5 that matter most)

1. **The design-system palette is not encoded at all.** `app/src/constants/theme.ts` is still the
   stock Expo starter (`text #000`, `background #fff`, gray `#F0F0F3`/`#E0E1E6`). None of coral, teal,
   blue, purple, gold, pink, the cream base `#FAFAF8`, or ink `#2E2E2C` exist. **Every screen is
   rendered in black/white/gray.** This single file is the root cause of ~70% of the gaps below.
   → Rewrite `theme.ts` with the locked palette (§2 Design System) as named role tokens, then thread
   them through the components. Highest leverage change in the whole app.

2. **The primary CTA is black, not coral.** Every "primary" button (Home create, Journey wizard
   Next/Create, missions/shop/friends actions) uses `theme.text` (black) or a hardcoded teal
   `#0E8177`. The spec's signature **coral CTA with dark-ink label** appears nowhere. This is the most
   recognizable brand element and it is absent on every screen.
   → Add `coral` tokens; make PrimaryButton coral (`#FF8A5B`) with ink label `#2E2E2C`.

3. **No brand typography.** Baloo 2 (display) and Inter (body) are not loaded. Text falls back to
   system fonts; `themed-text.tsx` has no display face and the wrong scale (title 48 / subtitle 32 vs.
   spec display 26 / h1 20). The "warm, rounded, friendly" character the whole direction rests on is
   missing.
   → Load Baloo 2 + Inter (`expo-font` / `@expo-google-fonts`); apply Baloo 2 to display/headings and
   correct the type scale in `themed-text.tsx`.

4. **Zero game-juice on the reward/identity surfaces.** The mockups' 3D glossy buddy, 3D area buttons,
   forest-gradient scene, gold coin chips, and the Shop's featured pack are all rendered as **flat gray
   emoji + gray pills**. The Buddy is a 🥚/emoji at `fontSize:128`, not the illustrated creature. The
   one surface that does earn juice per spec (EvolveReveal) is the only place that got any — and it's
   close. Everywhere else the "delight where it celebrates" rule is unmet.
   → Prioritize Buddy scene (gradient bg, illustrated creature, 3D buttons) + Shop featured pack + gold
   currency chips.

5. **Whole screens are missing.** The mockups define 18 screens; the app ships **2 tabs (Home, Buddy)**
   plus 4 pushed screens (missions, shop, friends, journey/new). **Journeys list, Journey detail,
   Explore, Achievements, Inbox, Weekly planning, and the Login-modal styling** either don't exist or
   are folded into Friends. The 5-tab bottom nav in every mockup (Home · Journeys · Explore · Friends ·
   Buddy) is a 2-tab native tab bar.
   → Confirm POC scope with founder; the deck implies far more surface than the POC build. Flag which
   are intentionally deferred vs. missing.

---

## Cross-cutting findings (affect every screen)

| # | Finding | Severity | File | What to change |
|---|---------|----------|------|----------------|
| C1 | Palette absent — stock Expo neutrals only | **P0** | `constants/theme.ts` | Encode the locked palette (base `#FAFAF8`, ink `#2E2E2C`, secondary `#6E6E69`, border `#ECECE8`, coral/teal/blue/purple/gold/pink tint·main·strong). Keep role names (coral=CTA, teal=brand/nav/growth, blue=XP, purple=social, gold=coins). |
| C2 | Coral CTA missing everywhere | **P0** | all screens | Introduce a shared coral primary button (dark-ink label per §6 — white-on-coral is unreadable). |
| C3 | Brand fonts not loaded (Baloo 2 / Inter) | **P0** | `_layout.tsx`, `themed-text.tsx` | Load both; Baloo 2 for display/headings/Buddy/celebration, Inter for body. |
| C4 | Type scale wrong | **P1** | `themed-text.tsx` | Spec: display 26 / h1 20 / h2 16 / body 15 / caption 12. Code has title 48 / subtitle 32 / default 16 / small 14. Rescale. |
| C5 | Radii off-spec | **P1** | all | Spec: cards 16, buttons 14, inputs 12, icon buttons 10, chips 8. Code reuses `Spacing` values (16/24/32) and 24–28px "pill" radii as buttons. Define radius tokens. |
| C6 | `#FAFAF8` base never used; screens are pure white | **P1** | `theme.ts` | Screen background should be warm near-white, cards `#FFFFFF`. Currently background=`#fff`, "cards"=gray `#F0F0F3`. Inverted from spec (cards should be lighter/white than base). |
| C7 | Dark mode defined but design is light-only | **P2** | `theme.ts` | Design System defines no dark theme. The `Colors.dark` (black bg) will produce an off-brand experience if ever triggered. Decide: drop dark, or design it. |
| C8 | Coin currency is the 🪙 emoji, not the gold star-coin | **P1** | Buddy/Shop/Missions | Mockups use a gold framed star-coin chip. Replace emoji with a gold pill + coin icon; gold `#F0B429`. |
| C9 | Bottom nav is 2 tabs, teal active state absent | **P1** | `app-tabs.tsx`, `_layout.tsx` | Mockups show 5 icon-only tabs with a **teal** active tint; code has Home·Buddy only, active tint = `theme.text` (black). |

---

## Per-screen audit

### 01 · Home  (mockup 01 · `Home_Screen.md` · `app/(tabs)/index.tsx`, `BuddyCard`, `StepCard`)

The single largest gap between deck and build. The mockup is a headerless **forest-scene** home: a
level meter + GT card + gold coin pill on one top line, a speech-bubble greeting above a glossy 3D
buddy, four **3D icon-only area buttons** flanking it (Missions/gold, Consistency/pink, Friends/purple,
Achievements/teal), then a **cream "Week's steps" panel** of colour-washed step cards. The code is a
plain white scroll: text greeting, a flat gray `BuddyCard`, two text pill buttons ("🎯 Missions",
"🤝 Friends") + a black "+" circle, then flat gray step cards with a bordered "Check in" button.

| Deviation | Sev | Fix |
|---|---|---|
| No forest background / scene; plain white screen | **P0** | Add the shared scene gradient behind Home (spec: "whole screen sits on the forest background, lightened"). |
| Four 3D area buttons → replaced by 2 text pill buttons; no Consistency, no Achievements | **P0** | Build the 4 rounded 3D icon buttons (gold/pink/purple/teal) with corner badges. |
| Buddy is a large gray `BuddyCard` with emoji face, not the ambient glossy creature | **P0** | Use the illustrated buddy; shrink to ~30% ambient per spec; move status into floating level meter. |
| Greeting is plain text "What will you do now?" not the "Hello, [name]" speech bubble | **P1** | Speech-bubble above buddy; copy "Hello, {name}". |
| Step cards flat gray; no Journey icon tile, no progress bar, no state washes (green DONE / red missed / yellow "Ends today") | **P1** | Add mini Journey-icon, phase progress bar, and the three colour-wash states from spec. |
| CTA/check-in: bordered black "Check in" button vs. spec swipe/long-press + coral accents | **P1** | Recolor; consider the swipe interaction later. |
| Level meter (blue XP), gold coin pill, GT card all absent | **P1** | Add the floating meter (blue `#378ADD` XP) + gold coin pill + GT card (no "+"). |
| Section copy "This week's Steps" ok; "N to go" vs mockup "Ends today" badge | **P2** | Minor. |
| Terminology OK — "Steps", "Journey", "Buddy", "Missions" used correctly | ✓ | — |

### 02 · Journeys list  (mockup 02 · `Journeys_Screen.md`)

**Missing entirely.** No `journeys` route exists. Mockup shows Active/Future/Completed sections, green-
outlined active cards with teal progress bars, a coral "+" and gold trophy button, and the 5-tab nav.
→ Build screen or confirm deferred. This is a core tab in every mockup nav.

### 03 · Journey detail  (mockup 03)

**Missing entirely.** Mockup: phase card + teal progress, "Supporters" (Noa/Omer avatars), Privacy=
"Allies", Reminders, and a **coral "Check in"** CTA. No route exists. → Build or confirm deferred.

### 04 · Explore  (mockup 04 · `Explore_Screen.md`)

**Missing entirely.** Mockup: search field, "For you" carousel, "Top creators" with buddy avatars +
blue "Lv" badges + purple join counts, "From brands". No route. → Build or confirm deferred.

### 05–08 · Journey creation wizard  (mockups 05–08 · `Journey_Creation_Screen.md` · `journey/new.tsx`, `ChoiceChips`)

Closest structural match in the app — the 6-stage wizard (Name → Why → Duration → Steps → Reminders →
Summary) is all there and the copy is on-spec. But it is rendered entirely in black/white/gray.

| Deviation | Sev | Fix |
|---|---|---|
| Next/Create button = black (`theme.text`), mockup = **coral** | **P0** | Coral primary with ink label. |
| Progress bars filled black, mockup = **teal** segments | **P1** | Teal `#2E9BA6`. |
| Back button label teal in mockup ("Back" in teal); code = plain black text | **P2** | Teal secondary label. |
| Wizard shows step count "Step 1 of 6"; mockup header "New Journey  1/7" with tooltip on active seg | **P2** | Cosmetic; code has 6 stages vs mockup 7 (mockup splits differently). Non-blocking. |
| `ChoiceChips` selected = black fill; mockup selection = teal | **P1** | Selected chip → teal; radius 8 (chips) not 32. |
| Inputs use `Spacing.three`(16) radius; spec inputs = 12 | **P2** | Input radius token. |
| "Recommended" starter callout is a gray pill; mockup = **green** wash card with star | **P1** | Green success wash + star icon. |
| Edit-affordance (teal pencil icon-button) in mockups 05/06 absent | **P2** | Add teal icon-button. |
| Terminology OK — "Journey", "Starter Step", "Your why" | ✓ | — |

### 09 · Friends  (mockup 09 · `Friends_Screen.md` · `friends.tsx`)

The code screen conflates Friends with the full social/Allies management flow (handle setup, add
friend, share Journey, visibility chips). The mockup is much simpler: "Needs your cheer" section, a
friend list with coloured avatars + "Lv" badges, a **coral "Cheer"** button, a 3-dot action menu
(Cheer / Gift / Message), and a purple "+ Invite" button.

| Deviation | Sev | Fix |
|---|---|---|
| No coloured avatar circles or level badges | **P1** | Add per-friend avatar (purple/teal/coral/gold tints) + "Lv N". |
| "Cheer" action = teal `#0E8177` (hardcoded, wrong teal); mockup = **coral** | **P1** | Coral for the cheer CTA; social accent = purple `#7F77DD`. |
| No "Needs your cheer" prioritized section | **P1** | Add the top prioritized cheer section. |
| No 3-dot Cheer/Gift/Message menu | **P2** | Add popover menu. |
| "+ Invite" purple button absent | **P2** | Add. |
| All social accents rendered as one hardcoded teal, not purple | **P1** | Switch social surfaces to purple per §2. |
| Terminology OK — "Support Circle", "Ally", "Cheer" used | ✓ | — |

### 10 · Buddy  (mockup 10 · `Buddy_Screen.md` · `buddy.tsx`, `BuddyScene`)

Layout skeleton is right (centered buddy, level meter top-left, coin pill + shop top-right, name/stage
pill under buddy, inventory panel intent) but visually flat. The mockup's whole appeal — glossy 3D
creature on a forest gradient, 3D customize/shop buttons, the edge-to-edge inventory panel with 5 icon
tabs + item grid + teal "Select" — is not built.

| Deviation | Sev | Fix |
|---|---|---|
| No forest gradient scene; flat gray `backgroundElement` | **P0** | Add forest gradient background (green→cream). |
| Buddy = emoji at fontSize 128, not the illustrated glossy creature | **P0** | Real buddy illustration with stage variants + equipped cosmetics. |
| Customize (sparkle) + Shop (bag) buttons: code has a text "🛍️ Shop" pill only, no 3D buttons, no Customize | **P1** | Two 3D icon buttons top-right. |
| **Inventory panel entirely missing** (5 tabs, item grid, Select button) | **P1** | Build the edge-to-edge square-top inventory panel. |
| Level meter uses black fill for level circle + XP bar; XP should be **blue** | **P1** | Blue `#378ADD`; level circle blue-strong. |
| Coin pill gray, should be gold framed | **P1** | Gold chip. |
| Stage-name tap → locked next-stage teaser: not implemented | **P2** | Add teaser interaction. |

### 11 · Shop  (mockup 11 · `Shop_Screen.md` · `shop.tsx`)

Code is a minimal cosmetic grid (buy/equip) — explicitly a POC subset. Mockup is a full store:
Featured/Cosmetics/Coins category tabs, a green **"Sprout Starter Pack"** featured banner with 300%
value flag + real-money price, a "Daily shop" countdown, and 3D item tiles with % off flags + gold
prices.

| Deviation | Sev | Fix |
|---|---|---|
| No category tabs (Featured/Cosmetics/Coins) | **P1** | Add tabs (POC may keep one). |
| No featured pack banner | **P1** (or defer) | Green banner; the code comment already lists it as deferred — confirm. |
| Item tiles flat gray; mockup = white cards, coloured 3D icon tile, gold price pill, discount flag | **P1** | Recolor tiles; gold price chip; coloured icon tiles. |
| Buy button = hardcoded teal `#0E8177`; prices should be **gold** chips | **P1** | Gold pricing; coral for real-money CTA. |
| Header "Shop" ok; mockup has back chevron icon-button + gold coin pill top-right | **P2** | Add chevron + gold pill (code has coin pill but cream, not gold). |
| Cream `#F6E4C1` hardcoded ≠ the spec cream base `#FAFAF8` / gold tint `#FCEFC9` | **P2** | Use tokens. |

### 12 · Hatch / Evolve reveal  (mockup 12 · `EvolveReveal.tsx`)

**Best-aligned surface in the app** — correctly earns full game-juice per the rule. Dark backdrop,
radial burst, stage name, gold stars, big COLLECT button all present.

| Deviation | Sev | Fix |
|---|---|---|
| **Rarity tag missing** (Common→Rare→Epic→Mythic) — mockup shows a "Rare" chip | **P1** | Add rarity chip scaling with milestone. |
| "Open store" affordance top-left missing | **P2** | Add. |
| COLLECT button is **gold**; mockup uses a **green** collect button | **P2** | Confirm intended colour (mockup 12 = green). |
| Buddy still emoji, not illustrated creature | **P1** | Shared with Buddy fix. |
| Stars = "⭐ ⭐ ⭐" text; mockup = scattered gold star graphics | **P2** | Decorative stars. |
| Game-juice placement rule **correctly honoured** here | ✓ | — |

### 13 · Achievements  (mockup 13 · `Achievements_Screen.md`)

**Missing entirely.** Mockup: All/Journeys/Social filter chips (purple active), 3D trophy medallions
(gold unlocked / gray locked with padlock), progress counts. No route. → Build or confirm deferred.

### 14 · Achievement detail  (mockup 14)

**Missing entirely.** Mockup: centered modal, big 3D medallion, description, progress "18/50", gold
"Reward · 500 coins + frame" pill. → Build or confirm deferred.

### 15 · Inbox  (mockup 15 · `Inbox_Screen.md`)

**Missing entirely.** Mockup: Friends/Allies/Groups tabs (purple active), message rows with coloured
avatars + unread dot, compose icon-button. The Home spec lists Inbox as a core top-zone button; not
built. → Build or confirm deferred.

### 16 · Missions modal  (mockup 16 · `Missions_Modal.md` · `missions.tsx`)

Structure matches well: Missions/Login top tabs, Daily/Weekly sub-tabs, mission rows with progress +
reward + Claim, Login rail. This is a **reward surface that should carry game-juice** but is rendered
calm/flat.

| Deviation | Sev | Fix |
|---|---|---|
| Not presented as a **centered floating modal** — it's a full pushed screen | **P1** | Present as centered card modal over the scene (spec + mockup). |
| Coins = 🪙 emoji + cream pill; mockup = **gold** reward chips ("+30", "+20") | **P1** | Gold reward chips. |
| Claim button hardcoded teal `#0E8177`; mockup = **coral** Claim | **P1** | Coral claim CTA. |
| Progress fill teal `#0E8177` (wrong teal) ; mockup mission bars = **gold** | **P1** | Gold progress for missions (gold=rewards domain). |
| Daily/Weekly sub-tabs use gray selected bg; mockup = white pill on cream segmented control with gold underline on active top-tab | **P2** | Segmented control styling. |
| Missions/Login top tabs use opacity 0.35 for inactive; mockup = gold underline on active | **P2** | Add active underline. |
| Login rail (mockup 17) not styled as day cards | **P1** | See below. |
| Terminology OK — "Missions", "Coins", "Claim" | ✓ | — |

### 17 · Login modal  (mockup 17 · `Missions_Modal.md` Login tab · `missions.tsx`)

Code renders the 7-day reward as a **vertical list of gray rows** ("Day 1 · 🪙20"). Mockup is a
**2-row grid of day tiles** with coloured states: today highlighted gold with a ring, claimed dimmed,
gems/skin/chest prize icons, and a coral Claim button.

| Deviation | Sev | Fix |
|---|---|---|
| Vertical rows instead of tile grid | **P1** | 4+3 tile grid. |
| Today tile: gray `backgroundSelected` vs mockup **gold tile + ring** | **P1** | Gold highlight + ring on today. |
| Prizes are coins-only; mockup has gems (Day 3), Skin (Day 5), Chest (Day 7) | **P2** | Mixed prize icons (may be POC-deferred). |
| Claim button teal, mockup = coral | **P1** | Coral. |

### 18 · Weekly planning  (mockup 18 · `Weekly_Planning_Screen.md`)

**Missing entirely.** Mockup: "Your week" header, purple "your why" banner, per-day step groups on
cream panels with Journey-icon tiles, "Edit plan" (teal outline) + **coral "Approve week"** CTA. No
route. → Build or confirm deferred. (This is a named MVP surface.)

---

## Game-juice placement verdict

The **rule** (Design System §1, §5: depth/gloss/3D on reward/identity surfaces; calm/near-flat on work
surfaces) is only *half* observed — and by omission, not by design:

- **Reward/identity surfaces that SHOULD be juicy but are flat:** Buddy (P0), Home buddy+area buttons
  (P0), Shop featured pack + tiles (P1), Missions/Login reward chips (P1), Achievements medallions
  (missing). The one exception — **EvolveReveal — is correctly juicy** and is the model to follow.
- **Work surfaces that SHOULD stay calm and do:** Journey wizard, Step cards, Friends management,
  Missions rows. These *are* flat — but flat-because-unstyled (gray), not flat-because-calm (clean
  white/cream with restraint). Once the palette lands, verify they read as "calm & clean," not "unfinished."

Net: the app currently reads as **uniformly flat-gray** everywhere, so the intended *contrast* between
celebratory and calm surfaces does not exist yet. Restoring it depends almost entirely on the P0 fixes
(palette, coral CTA, fonts, buddy illustration, forest scene).

---

## Terminology check (UI copy)

Correct and consistent across all built screens: **Journey, Step, Starter Step, Buddy, Coins, Missions,
Ally / Allies, Support Circle, Cheer, Your why, Check in.** No off-terminology found (no "habit", "task",
"goal", "pet", "gems" in shipped copy). This is the strongest area of fidelity. Only gap: user-facing
**"Support Circle" vs. mockup 03 label "Supporters"** — reconcile the two terms.

---

## Suggested sequencing

1. **Foundations (unblocks everything):** rewrite `theme.ts` palette → load fonts + fix type scale →
   add radius tokens → shared coral PrimaryButton + gold coin chip.
2. **Identity surfaces:** Buddy illustration + forest scene → Home scene + 3D area buttons →
   EvolveReveal rarity tag.
3. **Recolor built screens** to palette: Journey wizard, Missions/Login (as modal), Shop, Friends.
4. **Scope decision with founder** on the missing screens (Journeys, Journey detail, Explore,
   Achievements, Inbox, Weekly planning, 5-tab nav) — deck vs. POC.
