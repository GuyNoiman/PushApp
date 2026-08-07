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

### Notes
- **Coins / XP / Grace-Token chips** on Home are also slated to be replaced by a single **streak**
  indicator (mature direction). Tracked with the Home rebuild, not yet done here.
- Nothing above was deleted; every file is still in `app/src/`. This index must be updated whenever a
  surface is archived or restored.
