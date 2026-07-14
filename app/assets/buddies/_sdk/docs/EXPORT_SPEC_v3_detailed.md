# PUSh Creature Export Spec v3 — "Identifiable on-device"

Goal: regenerate each PUSh creature GLB so it renders **rich and instantly identifiable**
inside the app — which runs on **React Native + expo-gl in Expo Go**, a *constrained
real-time renderer* — matching the **"PUSh Characters v1.0"** reference sheet as closely as
that runtime allows.

## The problem this fixes
The v2 GLBs shipped **flat solid colours and no surface detail**, so on device the creatures
look like featureless coloured blobs. Our runtime **cannot** do real-time shadows,
reflections, ambient occlusion, or bloom (expo-gl limitation). Therefore **all visual
richness must be BAKED INTO THE TEXTURES.**

## Per material — produce real textures (not flat colours)
1. **baseColor / albedo** — a fully **painted, detailed** texture: the material's pattern
   (scales, fur, rock cracks, crystal facets, cloud fluff, metal panels) **plus baked soft
   shading + ambient occlusion + subtle highlights**, so the form reads with depth even under
   flat lighting. **Not a single solid colour.**
2. **normal map** — for surface relief (bumps, scales, folds). Export **tangents** on any mesh
   that uses a normal map.
3. **metallicRoughness** — keep **metalness LOW (≤ 0.2)**. Our renderer has **no environment
   map**, so a truly metallic material renders **black**. Fake "metal" with a **painted metal
   albedo** + low metalness + tuned roughness.
4. **emissive + emissive map** — for anything that should **glow**: the face eyes/mouth (cyan),
   crystals, fire, energy cores. This is a big part of what makes them feel alive.

## The face (shared system)
Keep the shared robot-screen face on the small inset **`face_screen`** mesh: a face texture
(neutral) + the **8 expression variants** (swap only the inner eyes/mouth/glow) + an emissive
map for the glow. Use the **canonical face silhouette** from the SDK — never redraw it.

## Hard runtime constraints (these caused real failures before — must follow)
- **Textures as SEPARATE files, NOT embedded** in the GLB. Embedded glTF textures **do not
  decode on React Native**.
- Format **PNG** (JPG ok for opaque albedo). **Compressed**, size **≤ 1024 px** (≤ 512 px is
  plenty for a stylized creature). Keep each creature's textures small — they ship **×19+**.
- Provide **`materials.json`** mapping every material → its texture files, e.g.:
  ```json
  { "mat_body": { "baseColorTexture": "textures/body_basecolor.png",
                  "normalTexture": "textures/body_normal.png",
                  "metallicRoughnessTexture": "textures/body_metalrough.png",
                  "emissiveTexture": "textures/body_emissive.png" } }
  ```
- **Y-up, +Z forward, feet on Y=0, height ≈ 1.08 m.**
- **Every mesh:** vertex **normals** + **UVs** (no overlapping/stretched UVs); **tangents**
  where a normal map is used.
- **⚠️ KEEP THE MESH LOW-POLY.** Surface detail must come from the **normal map**, NOT from dense
  geometry. Target **≤ ~30k triangles total** and a **GLB (geometry) ≤ ~3 MB**. (A test build came
  in at **21.6 MB of geometry / 61k verts** — far too heavy ×19 characters. The detail belongs in the
  512px textures + normal maps, which were only ~1.4 MB — that part was perfect.)
- Keep the **SDK contract** unchanged: required mesh names, anchor IDs, mastery config, and the
  shared face silhouette (per *PUSh Creature SDK v1.0*).

## Deliverable — one zip per creature (same layout as v2)
```
model/<name>.glb        geometry + UVs + normals + tangents; textures NOT embedded
textures/               separate compressed PNGs:
                          *_basecolor.png, *_normal.png, *_metalrough.png, *_emissive.png,
                          face_neutral.png (+ the 8 expression variants)
materials.json          material -> texture-file map (above)
species.json anchors.json mastery.json runtime_spec.json
```

## Style target
Match the **"PUSh Characters v1.0"** reference: cute, glossy, collectible, detailed; the glowing
cyan robot face on every creature; a **distinct silhouette + material per species**. Because the
runtime can't light it that way in real time, **bake that glossy/detailed look into the albedo
(+ normal + emissive).**

---
*Our ingest pipeline (`tools/ingest_creature.py`) automatically keeps detailed textures external
and compressed, and bakes only genuinely-flat materials to factors — so detailed albedo/normal/
emissive maps produced to this spec are preserved and rendered. (The app-side reliable-texture
loading fix is tracked separately.)*
