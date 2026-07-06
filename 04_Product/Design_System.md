# Design System

Status: Draft · Phase 5 · 2026-07-06

> Direction: **A (playful game-world) primary, B (calm wellness) secondary** — *"a cozy,
> encouraging world that stays clean and calm."* Concrete tokens (exact hex, fonts) are
> drafts to be finalized. Grounds on `Product_Philosophy.md` and `AI_Product_Principles.md`.

---

## 1. Design Philosophy

- **Warm and encouraging, never childish, never clinical.** Playfulness lives in color,
  roundness, Buddy, and celebration — restraint and whitespace keep it credible for young adults.
- **Delight where it celebrates, calm where it works.** Game-world energy around Buddy,
  rewards, and completion moments; clean, uncluttered clarity in the core flows (Steps, Journeys).
- **One screen, one job.** Low cognitive load; generous whitespace; a single clear focus.
- **Never shame.** Color, copy, and motion always reinforce hope and progress — never pressure or guilt.
- **Buddy is the emotional anchor.** The visual world revolves around the user's growth and their companion.
- **Emotional consistency** over cleverness (AI_Product_Principles P4).

## 2. Color Principles

- **Light, warm cream base** (not stark white) for coziness — kept from the draft.
- **A small, role-mapped palette** — each color encodes meaning, not decoration.
- **Palette (v1 — locked 2026-07-06):**
  - Base: **near-white `#FAFAF8`** (screen — neutral, not cream, per founder 2026-07-06) · cards `#FFFFFF` · border `#ECECE8` · ink `#2E2E2C` · secondary `#6E6E69` · muted `#9A9A93`.
  - **Per-area accents (wayfinding):** each functional area may carry its own accent — e.g. Missions teal · Consistency gold · Friends purple · Inbox coral.
  - **Coral** — primary / CTAs / energy: tint `#FAECE7` · main `#FF8A5B` · strong `#D85A30`.
  - **Teal** — brand + **navigation bar** + Journey/Step growth-progress: tint `#DCEFF1` · main `#2E9BA6` · strong `#1F7C86`. (Per the founder's teal reference.)
  - **Blue** — **XP / Buddy level**: tint `#E6F1FB` · main `#378ADD` · strong `#185FA5`.
  - **Purple** — social / friends / Cheer: tint `#EEEDFE` · main `#7F77DD` · strong `#534AB7`.
  - **Gold** — **coins / rewards / trophies**: tint `#FCEFC9` · main `#F0B429` · strong `#C98A0E`.
  - **Status:** success = teal · warning = gold · danger = soft coral-red `#E86A5A` (gentle — no alarm, no-shame).
- Meaningful split: **teal = real growth** (Journey progress) vs **blue = game XP** — reinforcing the product's "XP isn't growth" principle.
- Contrast meets WCAG AA on the cream base and on colored fills.

## 3. Typography

- **Display / headings · Buddy · celebrations: Baloo 2** (locked 2026-07-06) — friendly, warm, rounded.
- **Body / dense UI: Inter** — clean and highly legible.
- Two families only. Weights: Baloo 2 500 / 600; Inter 400 / 500. Sentence case always.
- Type scale (v1): display `26` · h1 `20` · h2 `16` · body `15` · caption `12`. Line-height ~1.5 body, ~1.1 display.

## 4. Spacing & Layout

- **Generous whitespace** (the calm counterweight to the color). 4px base grid;
  spacing scale 4 / 8 / 12 / 16 / 24 / 32.
- Comfortable card padding; clear section separation; one primary focus per screen.

## 5. Shape, Corners & Depth

- **Rounded, chunky corners (v1):** cards `16px` · buttons `14px` · inputs `12px` · icon buttons `10px` · chips `8px`. Primary button height `48px`; tap targets ≥ `44px`.
- **Soft, low shadows** for gentle playful depth — subtle, never heavy.
- Buddy / reward / celebration moments may use richer depth; core flows stay clean and near-flat.

## 6. Component Philosophy

Chunky, friendly, tappable; large hit targets; complexity hidden in the system.

- **Card system** — one family (rounded 16–20px, white on warm base, hairline border + soft
  shadow) across Step, Journey, Trophy, and Feed cards.
- **Buttons** — Primary: filled coral, rounded, bold label in **dark ink** (white text is unreadable on light coral — verified 2026-07-06). Optional icon. Secondary:
  tinted / outline. **Icon buttons**: rounded squares with a soft color-tint background and
  badge dots (the Home top-zone: Inbox · Missions · Consistency · Friends). Large and confident.
- **Icons** — a rounded, friendly, consistent-stroke set (playful but legible). Currency /
  reward / trophy icons are more illustrative (coins, gems, trophies).

## 7. Motion Principles

- **Playful but gentle:** springy micro-interactions for delight (check-ins, Buddy reactions, rewards).
- **Calm and quick** for navigation and core transitions — nothing jarring or aggressive.
- **Celebration** moments (Phase / Journey completion) earn richer, joyful animation (confetti, Buddy cheer).
- **Never anxious or urgent** motion (no-shame). Always respect reduced-motion.

## 8. Illustration & Buddy Visual Principles

- **Soft, rounded, characterful 2D** illustration — cute but not babyish; collectible-companion spirit.
- **Buddy** is an original creature that **evolves by Level (egg → hatchling → …)**;
  expressive and warm; non-human is welcome. Emotional states read as bright / proud when
  progressing and quieter (never sad or punishing) when drifting.
- Buddy is the **visual anchor / identity** across the app.
- Cosmetics, species, backgrounds, and frames all share the soft-rounded style.
- Empty states are **Buddy-led** gentle illustration + encouraging copy.

## 9. Accessibility

- WCAG AA contrast (text on warm base and on colored fills).
- Large tap targets (≥44px); legible minimum font sizes; dynamic-type friendly.
- **No color-only meaning** — always pair color with an icon or label.
- Reduced-motion support; calm, non-shaming language and visuals throughout.

## 10. Tone Check (apply to every visual decision)

> Does it feel **warm, hopeful, and clear** — and never pressuring or childish? If not, adjust.

## Decisions (2026-07-06)

- Direction: **A (playful game-world) primary + B (calm wellness) secondary.**
- Light warm base · small meaningful multi-accent palette used with restraint · rounded
  chunky-but-clean components · friendly rounded display + clean body type · generous
  whitespace · gentle-playful motion with richer celebrations · soft-rounded 2D illustration
  with an evolving Buddy.
- **Palette v1** (§2), **type** (Baloo 2 display / Inter body, §3), and **numeric tokens** (radii / spacing / scale, §3–5) are all locked. **Phase 5 design-system foundations complete.**
