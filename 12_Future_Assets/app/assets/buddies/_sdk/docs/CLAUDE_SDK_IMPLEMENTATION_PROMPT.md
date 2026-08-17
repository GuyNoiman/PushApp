Implement PUSh Creature SDK v1.0.

1. Read `shared/sdk_config.json`.
2. Build one generic `SpeciesLoader` that loads any package conforming to `shared/schema/species.schema.json`.
3. Do not write a separate loader per species.
4. Use `species.json` to locate the GLB, anchors, materials and mastery configuration.
5. Preserve all mesh and anchor names.
6. Use the canonical shared face asset from `shared/face/push_face_outline.svg`.
7. Reject a package when a required validation check fails.
8. Expose a common API: `loadSpecies`, `setMasteryLevel`, `attachWearable`, `detachWearable`, `setExpression`, and `disposeSpecies`.
9. Keep procedural animation until a later SDK version introduces a bound rig.
10. Return validation errors with exact mesh, material or anchor IDs.
