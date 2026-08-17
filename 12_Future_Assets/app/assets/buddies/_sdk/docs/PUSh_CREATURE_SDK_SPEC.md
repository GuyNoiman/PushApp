# PUSh Creature SDK v1.0

## Purpose
This SDK defines one shared runtime contract for every PUSh creature. Claude must treat the SDK as the fixed base layer. Each species package contains only the model, materials, unique meshes and mastery data that differ from other species.

## Shared rules
1. Use glTF 2.0 Binary (`.glb`).
2. Use Y-up and +Z forward.
3. Place the character's feet on Y=0.
4. Normalize character height to 1.08 meters unless a future SDK version explicitly changes it.
5. Embed all runtime textures in the GLB.
6. Every mesh must contain vertex normals and UV coordinates.
7. Generate tangents only when a normal map is used.
8. Keep all required core meshes separate and preserve their names.
9. Use the exact shared face silhouette. Never redraw, simplify, substitute or reinterpret it.
10. `face_screen` must be a small, flat, inset mesh with clean 0–1 planar UVs.
11. Use the same anchor IDs for every species.
12. Species-specific meshes must be listed in `extraMeshes`.
13. Do not duplicate loaders, animation controllers, clothing code or face logic inside a species implementation.
14. No species may require engine-level code changes.

## Required core meshes
- head
- body
- arm_L / arm_R
- hand_L / hand_R
- leg_L / leg_R
- foot_L / foot_R
- face_frame
- face_screen

## Required anchors
- hat
- cape_neck
- shirt_center
- pants_center
- shoe_L / shoe_R
- necklace
- wrist_L / wrist_R
- hand_item_L / hand_item_R
- face_center

## Species package layout
```text
species/
  magnet/
    model/magnet_v2_runtime.glb
    textures/
    species.json
    anchors.json
    materials.json
    mastery.json
    runtime_spec.json
    validation/validation_report.json
```

## Claude integration rules
Claude should load all species through one shared loader, resolve files from `species.json`, validate against the checklist, apply wearables through shared anchors, toggle mastery meshes from `mastery.json`, preserve mesh names exactly, and report errors using exact IDs.

Claude must never create a second face system, change the shared face shape, rename required meshes or anchors, add species-specific engine logic, merge body parts in a way that prevents later rigging or cosmetics, or change the global coordinate system or scale.

## Versioning
Every compatible package must declare `sdkVersion: 1.0.0`. Breaking changes require a new SDK version.
