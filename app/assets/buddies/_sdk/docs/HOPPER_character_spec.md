# Hopper — "The Teleporter" (character spec v1.0, from the founder's reference sheet, 2026-05-12)

The authoritative look/spec for the Hopper species. The founder's reference sheet is the visual
source of truth; this captures the parsed data so it survives outside chat. Regenerate Hopper to
THIS (plus the runtime constraints in `EXPORT_SPEC_v3_detailed.md`).

**Identity:** purple bunny; energetic · curious · impulsive. **Signature = teleport tail + big ears.**
**Proportions:** large head (cuteness/expression), short limbs (bouncy/soft), big ears, tail as the
signature feature.

## Colors
| Part | Hex |
|------|-----|
| Primary body | `#BBB6FF` |
| Secondary (belly) | `#A09CFF` |
| Inner ears | `#FFB3D6` (pink) |
| Spots gradient | `#FF9CF0` → `#7C6BFF` |
| Portal core | `#8DF0FF` |
| Portal outer | `#7C6BFF` |
| Face screen | `#0D0F13` (near-black) |
| Face glow | `#00E5FF` (cyan) |

## Materials (stylized, not realistic)
- **Body:** soft matte rubber, slightly micro-rough.
- **Spots:** slightly glossy, smooth.
- **Face screen:** glossy glass, high reflect — the **rounded "Option 2" silhouette** (never square;
  100% identical shape across all 8 expressions + materials).
- **Tail portal:** emissive + additive soft bloom + particles.

## Parts (model sheet)
Ear L/R · Head · Face Screen (rounded SVG) · Body · Arm L/R · **Hand L/R** · Leg L/R · **Tail (Portal)**
· **Spots (pattern)**. Rig: 15 body bones + 3 tail + controls; face driven by the shared SVG expression
system (8 expressions, eyes/mouth only change).

## Dimensions (relative)
Ear 40 · Head 32 · Body 38 · Leg 20 (cm-scale on the sheet); body width 46, depth 32. Height (ears up) = 100%.

## Gaps in the current ingested v3 Hopper (to fix on regen)
Missing: belly secondary color · bigger ears · hands · larger head/forehead · teleport tail · spots
pattern. Wrong: face screen is square (must be the rounded silhouette). Also geometry was 21.6MB — too
heavy; keep low-poly (detail from normal maps). Face texture rendered upside-down → fixed app-side by
flipping DataTexture rows (BuddyView).
