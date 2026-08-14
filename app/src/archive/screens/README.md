# Archived screens

Screens that were **removed from the live app but not deleted**. Nothing here ships: this folder
sits outside the expo-router tree (`src/app/`), so nothing in it is a route, and it is excluded from
the type-check (`tsconfig.json`), the lint program (`eslint.config.js`) and the test run
(`package.json` › `jest.testPathIgnorePatterns`). Expect the code to drift from the live modules it
imports — that is what an archive is.

The running index of every archived surface is `04_Product/UX/Archived_Screens.md`. Read it first.

---

## Archived on 2026-08-14 — three entry-point-less routes

All three were registered in the root `Stack` but **nothing in the app navigated to them**. Founder
cleanup decision, recorded in `04_Product/PRD/PRD_Coverage_Gaps.md`: *"Archive/remove the routes from
the shipping Stack for now. Their future product ideas remain preserved; only write a new surface PRD
if one is deliberately revived."*

| File | Was | Why archived |
|---|---|---|
| `missions.tsx` | `/missions` (transparent modal) | Missions left the MVP (founder, 2026-08-12 — `MVP_Task_List.md` B3). The feature is specced in `04_Product/PRD/Future/Missions_PRD.md`; the `MissionEngine` and its state stay live in the core. |
| `achievements.tsx` | `/achievements` (modal) | Achievements left the MVP (founder, 2026-08-12 — `MVP_Task_List.md` B4). There is no achievements engine, so the screen rendered placeholder data. Feature specced in `04_Product/PRD/Future/Achievements_Engine_PRD.md`. |
| `weekly-planning.tsx` | `/weekly-planning` (modal) | No PRD at all, only a stale pre-redesign UX doc, and a known data gap: `Step` has no per-weekday scheduling field, so the screen hashed a display weekday per Step. Overlaps `Weekly_Review_PRD.md` + D43. |

Moved with them, because nothing else used them:

- `sampleAchievements.ts` — design-placeholder data, imported only by `achievements.tsx` (was
  `src/components/achievements/`). The import in `achievements.tsx` now points at `./sampleAchievements`.
- `i18n/en|he/missions.json` + `i18n/en|he/achievements.json` — the `missions` and `achievements`
  copy namespaces, used only by these two screens. Both were removed from `NAMESPACES` and
  `resources` in `src/i18n/index.ts`.
- `__tests__/weekly-planning.test.tsx` — pins that the screen gates on `isRunning`, so a frozen or
  future Journey leaks no Steps. The predicate itself remains covered by
  `src/core/util/__tests__/journeyStatus.test.ts`; only the screen-level wiring is parked here.

Left alone because they are **shared with live code**: `isRunning` / `journeyStatus.ts`, the
`MissionEngine` + `MissionsState` (Home's "rewards ready to collect" reads the core), `ThemedText` /
`ThemedView` / `GlossyTile`, and the theme constants.

### Reviving one

A revived screen needs a **surface PRD first** (founder decision above) — the existing Future PRDs
cover the *features*, not the screens. Then: move the file back into `src/app/`, restore its i18n
namespace in `src/i18n/index.ts`, re-add its `<Stack.Screen>` in `src/app/_layout.tsx`, give it a
real entry point, move its test back, and update `04_Product/UX/Archived_Screens.md`.

### Added 2026-08-14 — `buddy3d-spike.tsx`

A throwaway preview harness for the 3D creature renderer, archived on the founder's instruction for
the same reason as the three screens above: it had no entry point, but **any** file under `src/app/`
is a live deep-linkable route under file-based routing, registered or not. Buddy is staged **Future**
(Decision Log **D45**), so the harness is parked rather than deleted.

It carried no `<Stack.Screen>` and no i18n namespace, so nothing else had to be removed.
**`src/components/buddy3d/BuddyView.tsx` and `src/core/buddies/registry.generated.ts` were deliberately
left in place** — `src/components/buddy/BuddyScene.tsx` still imports them, so they are shared, not
orphaned by this move.
