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
- Nothing above was deleted; every file is still in `app/src/`. This index must be updated whenever a
  surface is archived or restored.
