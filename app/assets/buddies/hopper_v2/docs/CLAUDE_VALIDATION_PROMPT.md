Validate Hopper v2 end-to-end.

1. Load `model/hopper_v2_runtime.glb`.
2. Confirm it no longer renders black.
3. Confirm Y-up, +Z forward, feet at Y=0 and approximately 1.05 m height.
4. Preserve all mesh names.
5. Confirm `face_screen` is a small inset flat mesh with an unstretched face texture.
6. Compare embedded materials to `materials.json`.
7. Drive effect visibility from `mastery.json`.
8. Continue using procedural animation; this build has no bound rig or baked clips.
9. Report any remaining issue with the exact mesh or material name.
