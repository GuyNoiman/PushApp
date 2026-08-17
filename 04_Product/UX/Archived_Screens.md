# Archived Screens & Surfaces

> **Purpose.** As PushApp matures from the gamified-companion app into the AI adaptive coach,
> some screens/surfaces are **removed from the live app but NOT deleted** — the code stays in the
> repo so nothing is lost and any of it can be brought back. This file is the running index of what
> was archived, when, why, and how to restore it. (Founder direction, 2026-08-07: *"don't delete
> what I ask to remove — put it in an archive of removed screens and leave the app with only what's
> relevant right now."*)

Terminology and staging still follow `09_Product_Philosophy/Product_Terminology.md` and
`CLAUDE.md §3` ("the vision never shrinks — move it later, never delete it").

---

## Archived on 2026-08-07 (coach-pivot + mature-redesign pass)

| Surface | Why archived | How it's hidden (code) | How to restore |
|---|---|---|---|
| **Buddy tab** | No game avatar in the mature coach direction. (Also: the 3D `BuddyView` GLB loader can't load on web — `TypeError: this.validatePath is not a function` — so on web the stage is empty; on device it renders. Archiving removes it from view regardless.) | Native: `href: null` on the `buddy` `Tabs.Screen` (`app/src/components/app-tabs.tsx`). Web: the `buddy` `TabTrigger` removed (`app/src/components/app-tabs.web.tsx`). The `/buddy` route file and all Buddy components remain. | Restore the tab trigger / drop `href: null`. |
| **Shop** | No coins / faux-currency in the mature direction. | Route `app/src/app/shop.tsx` remains (reachable only via now-archived entry points on Buddy/Home). No longer surfaced in the nav. | Re-add an entry point once/if a real store lands. |
| **Explore marketplace** (`Top creators` + `From brands`) | Creator/brand marketplace is a **future** feature. | `const SHOW_MARKETPLACE = false` gate in `app/src/app/(tabs)/explore.tsx`. Sample content + `CreatorCard`/`BrandCard` components untouched. | Flip `SHOW_MARKETPLACE` to `true`. |
| **Journey creation wizard** (`journey/new`) | Journey creation moves **into the coach conversation** — the AI names + describes the new Journey. | *Pending* — the step-by-step wizard route still exists and is still the only manual create path until the coach create-flow is wired. Will be archived (entry points removed) once the coach can create a Journey end-to-end. | Keep until the coach create-flow lands, then hide the `/journey/new` entry points. |

---

## Archived on 2026-08-14 (entry-point-less routes)

Three screens were registered in the root `Stack` but **nothing in the app navigated to them**.
Founder cleanup decision (`04_Product/PRD/PRD_Coverage_Gaps.md`): *"Archive/remove the routes from the
shipping Stack for now. Their future product ideas remain preserved; only write a new surface PRD if
one is deliberately revived."* Unlike the 2026-08-07 pass — which hid surfaces but left the route
files in place — these files were **moved out of the expo-router tree** to `app/src/archive/screens/`,
so they are no longer routes at all. That folder is excluded from type-check, lint and the test run;
its `README.md` carries the full detail.

| Surface | Why archived | How it's hidden (code) | How to restore |
|---|---|---|---|
| **Missions** (`/missions`) | Out of the MVP (founder 2026-08-12, `MVP_Task_List.md` B3) and no entry point. The feature stays specced in `PRD/Future/Missions_PRD.md`; the `MissionEngine` + Missions state remain live in the core. | Screen moved to `app/src/archive/screens/missions.tsx`; `<Stack.Screen name="missions">` removed from `app/src/app/_layout.tsx`; the `missions` i18n namespace removed from `app/src/i18n/index.ts` (JSON archived alongside the screen). | Write a surface PRD, move the file back to `src/app/`, restore the namespace + `Stack.Screen`, and give it a real entry point. |
| **Achievements** (`/achievements`) | Out of the MVP (founder 2026-08-12, `MVP_Task_List.md` B4), no entry point, and it rendered placeholder sample data — there is no achievements engine. Feature specced in `PRD/Future/Achievements_Engine_PRD.md`. | Screen + its `sampleAchievements.ts` placeholder data moved to `app/src/archive/screens/`; `<Stack.Screen>` and the `achievements` i18n namespace removed. | As above. |
| **Weekly Planning** (`/weekly-planning`) | No entry point and **no PRD at all** (only a stale pre-redesign UX doc), plus a real data gap: `Step` has no per-weekday scheduling field, so the screen derived a display weekday per Step. Overlaps `Weekly_Review_PRD.md` + D43's two-layer split. | Screen + its test moved to `app/src/archive/screens/`; `<Stack.Screen>` removed. It used no namespace of its own. | Needs the `Step` weekday data gap closed **and** a surface PRD before it comes back. |
| **Buddy 3D spike** (`/buddy3d-spike`) | A throwaway on-device preview harness for the 3D creature renderer, with no entry point anywhere. Buddy itself is staged **Future** (Decision Log **D45**). Archived on the founder's instruction 2026-08-14, for the same reason as the three above: with file-based routing, **any** file under `src/app/` is a live deep-linkable route whether or not it carries a `<Stack.Screen>`, so `/buddy3d-spike` was reachable in a shipped build. | Screen moved to `app/src/archive/screens/buddy3d-spike.tsx`. It had no `<Stack.Screen>` registration and no i18n namespace, so nothing else needed removing. **`BuddyView` and `registry.generated` were left in place** — `components/buddy/BuddyScene.tsx` still imports them. | Move the file back to `src/app/` if the renderer needs eyeballing again; nothing else to restore. |

### Notes
- **Coins / XP / Grace-Token chips** on Home are also slated to be replaced by a single **streak**
  indicator (mature direction). Tracked with the Home rebuild, not yet done here.
- Nothing above was deleted. ⚠️ The 2026-08-17 pass below **moved several of these files out of
  `app/` entirely** — see the new paths there. This index must be updated whenever a surface is
  archived or restored.

---

## Archived on 2026-08-17 (moved out of the build — `12_Future_Assets/`)

The first EAS build uploaded a **258 MB** project archive; `app/assets/` alone was **63 MB**, nearly
all of it Buddy 3D creature assets. Founder rule: *"Anything Future should not be part of the project
and therefore not part of the build. It should live in a different, external folder. From the next
build onward, nothing Future should take up space."*

Unlike the two passes above — which moved files **within** `app/` — this pass moves them to
**`12_Future_Assets/`** at the **repository root**. EAS uploads `app/`, so anything outside it is not
uploaded, bundled, type-checked, linted or tested, while git still preserves every byte. The tree
under `12_Future_Assets/app/` mirrors `app/` one-for-one, so restoring is a straight reverse `git mv`.
**Read `12_Future_Assets/README.md` first — it carries the full restore procedure.**

| Surface | Why archived | How it's hidden (code) | How to restore |
|---|---|---|---|
| **Buddy** (`/buddy`) | Staged **Future** by **D45** (the coach, not an avatar, is the MVP's central entity). Hidden from the tab bar since 2026-08-07, but a file under `src/app/` is a live deep-linkable route however it is hidden — and its 3D assets were the bulk of the upload. | Route → `12_Future_Assets/app/src/app/(tabs)/buddy.tsx`; `<Tabs.Screen name="buddy">` removed from `app/src/components/app-tabs.tsx`; the `buddy` i18n namespace removed from `app/src/i18n/index.ts`. | Reverse the moves per `12_Future_Assets/README.md`, reinstall the five 3D packages, restore the namespace and the tab, and **remove `*.glb` from `app/.easignore`**. |
| **Buddy 3D assets + renderer + pipeline** | ≈62 MB of GLB models and PNG textures for 20 creature species, reachable only from the Buddy screen. | `assets/buddies/`, `src/components/buddy3d/`, `src/core/buddies/registry.generated.ts`, `src/components/buddy/` (except `BuddyAvatar.tsx`) and `tools/ingest_creature.py` + `tools/optimize_buddy.py` all moved under `12_Future_Assets/app/`. `@react-three/fiber`, `three`, `@types/three`, `expo-gl` and `upng-js` removed from `app/package.json`. | As above. The ingest pipeline moved intact, so new species can still be processed from the archived folder. |
| **Shop** (`/shop`) | No coins / faux-currency in the mature coach direction (already off-nav since 2026-08-07), and it had no entry point. | Route → `12_Future_Assets/app/src/app/shop.tsx`; `<Stack.Screen name="shop">` removed from `app/src/app/_layout.tsx`; the `shop` i18n namespace removed. **`ShopEngine` + `config/shopItems.ts` stay live in the core** — only the screen moved. | Needs a **surface PRD** first (2026-08-14 founder decision), then reverse the move and restore the namespace + `Stack.Screen`. |
| **The 2026-08-14 archive folder** | `app/src/archive/screens/` was already outside the router tree and excluded from tsc/eslint/jest — but still inside `app/`, so it was still being uploaded. | Whole folder → `12_Future_Assets/app/src/archive/`. Its three exclusions (`tsconfig.json` `exclude`, `eslint.config.js` `ignores`, `package.json` `jest.testPathIgnorePatterns`) were removed, since nothing in `app/` matches them any more. | Move the folder back **and re-add those three exclusions**, or the archived screens will fail the type-check and lint. |

### Notes
- **`BuddyAvatar.tsx` deliberately stayed** in `app/src/components/buddy/`:
  `components/explore/ExploreCards.tsx` still imports it for the marketplace cards. It is pure
  `react-native-svg` with no image assets, so it costs the build nothing.
- **Engines were not touched.** `BuddyEngine`, `ShopEngine` and `MissionEngine` — with their configs
  and state — remain wired into `AppCore`; Home reads Missions for collectable rewards. Only
  *surfaces and assets* moved.
- A new **`app/.easignore`** is the backstop: it keeps `node_modules/`, build output and signing
  material out of the archive, and blocks `*.glb` / `*.gltf` / `*.fbx` / `*.blend` / `*.psd` so a
  stray heavy asset cannot silently re-inflate the upload.
