# Buddy 3D Rendering — Spike Findings & Handoff (2026-07-13)

Status: **VALIDATED on device.** Hopper v2 (detailed, textured GLB) renders in **Expo Go (SDK 54)
on the founder's iPhone at 60 FPS**, correctly framed, with real PBR textures + the real face.
This doc captures the hard-won expo-gl/React-Native + three.js knowledge so it is NEVER re-learned.

Decision context: **real-time 3D** was chosen (founder, 2026-07-13) — see the plan in the module
architecture (to be finalized as Engineering Decision **E5**). Species model = **Both** (a chosen
species that also evolves through mastery stages). Stack: `expo-gl` + `three@0.180` +
`@react-three/fiber@9` (RN entry `@react-three/fiber/native`), procedural animation (GLBs are not
rigged). All deps are free/OSS; **no dev build needed** — expo-gl runs in Expo Go on SDK 54.

The working reference is `app/src/app/buddy3d-spike.tsx` (+ `buddy3d-spike.polyfills.ts`,
`app/metro.config.js`), a throwaway route at `/buddy3d-spike`, NOT wired into the tabs. It is the
blueprint for the real module.

---

## ⚠️ THE RUNTIME GOTCHAS (expo-gl + RN + three) — the whole point of the spike

Every one of these caused a failure and was fixed. The real module MUST honor them.

1. **`navigator.userAgent` shim, imported FIRST.** three r180's GLTFLoader does
   `navigator.userAgent.match(...)`. In RN `navigator` exists but `.userAgent` is `undefined` →
   `TypeError: cannot read 'match' of undefined`, crashing the load synchronously. Fix:
   `buddy3d-spike.polyfills.ts` sets a benign `navigator.userAgent` and is the first import.
2. **GLB load path:** `expo-asset` (`Asset.fromModule(require('...glb'))` → `downloadAsync()`) →
   `expo-file-system` `new File(uri).arrayBuffer()` → `GLTFLoader.parse(bytes, '', onLoad, onError)`.
   Pass **`''`** (not undefined) as the resource path. Do NOT use fetch / `file://` loaders.
3. **NEVER call `gl.setSize()` / `gl.setPixelRatio()`** in a tuning effect. r3f-native owns the
   expo-gl drawing-buffer size; overriding it renders the whole scene into a small **bottom-left
   corner** of the framebuffer. Only set `outputColorSpace`, `toneMapping`, `toneMappingExposure`.
4. **NO shadows, NO PMREM/RoomEnvironment IBL, NO EffectComposer bloom.** All three allocate
   offscreen **render targets**, which misbehave on expo-gl (black screen / black render-target box).
   Light with **plain lights only**: `ambientLight` + `hemisphereLight` + a few `directionalLight`s.
   (Consequence: no soft reflections/bloom on expo-gl today — real textured GLBs read fine without.)
5. **Recompute missing vertex normals.** A GLB without normals makes `MeshStandardMaterial` compute
   NaN → **pure black** under ANY light. `if (!geom.getAttribute('normal')) geom.computeVertexNormals()`.
   (v2 already has normals; keep the guard for safety.)
6. **EMBEDDED glTF textures do NOT decode on RN** (no browser Image/Blob/createImageBitmap) →
   model renders untextured/gray + "THREE.GLTFLoader: Couldn't load texture" warnings. Fix: ship
   textures as **SEPARATE files** and load them via `new THREE.TextureLoader().loadAsync(mod)` where
   **`mod` is the `require('...png')` MODULE itself** (a number) — the `@react-three/fiber/native`
   patch resolves modules through expo-asset. **Passing a resolved `file://` URI string does NOT
   work.** Assign by material name (see `materials.json`): baseColor→`map` (sRGB), metalRough→
   `roughnessMap`+`metalnessMap` (linear, roughness=metalness=1), emissive→`emissiveMap` (sRGB).
   Set `tex.flipY = false` (glTF convention).
7. **Normalize the model, don't measure at runtime.** In a `useMemo`: `Box3.setFromObject(scene)` →
   scale to a fixed `TARGET_HEIGHT`, translate the scaled centre to the origin. Then use a **FIXED
   camera** (`position:[0,0,3.6], fov:45`). This removes all fragile runtime bounds/framing (which
   repeatedly misfired). Idle bob on an outer wrapper group so it doesn't clobber the normalize.
8. **Orientation:** v2 is **Y-up, +Z forward, feet at y=0** → no rotation. (v1 was Z-up → needed a
   `-90°` X rotation. The export spec now standardizes Y-up.)

---

## Assets in the repo

- `app/assets/buddies/hopper_v1/` — the first **procedural MVP** package (untextured, no normals,
  Z-up). Superseded; kept for provenance. ~1 MB.
- `app/assets/buddies/hopper_v2/` — the **detailed, textured** runtime package that renders
  correctly. Contains `model/hopper_v2_runtime.glb` (embedded textures, **21 MB**), the **separate**
  texture PNGs in `textures/` (baseColor 4.5 MB each — these are what the spike actually loads),
  `materials.json` (material→texture map), `anchors.json`, `mastery.json`, `assets/push_face_neutral.svg`,
  `runtime_spec.json`, `validation/`.

### 🚨 SIZE PROBLEM (the next thing to fix)
v2 is ~40 MB per character (21 MB GLB + ~18 MB baseColor PNGs). **× 19 characters ≈ 760 MB — not
viable** for the app bundle or git. The baseColor PNGs are 4.5 MB (over-sized for a stylized,
mostly-flat character). **Next ChatGPT ask:** provide **separate, compressed textures** — KTX2/Basis
or ≤1K PNG — and NOT embed them in the GLB (embedding both bloats the file AND breaks RN decoding).
This single change fixes size + the RN texture-decode issue at once.

---

## The character roster (PUSh Characters v1.0)
13 **core (free)** species: Drakon(dragon), Gembis(crystal), Nimbus(cloud), Bouldo(rock), Misty,
Hopper(rabbit — first built), Dozer(wizard), Magneto, Thorny(cactus), Shellon(turtle), Hoardy,
Chrono, Chroma(chameleon), Heartly(heart). 6 **reward/premium** species: Nova, Forest Guardian,
Ocean Spirit, Phoenix, Astral, Zenith. Each: **3 mastery levels** + the **unified robot-screen face**
(one silhouette, 8 expressions: neutral/happy/excited/sleepy/determined/surprised/sad/in-love — only
inner eyes/mouth/glow change). The face SVG silhouette is **canonical — never redraw it.**

---

## ▶ NEXT STEPS (new session, in order)
1. **Get a compressed v3 Hopper** — hand the founder the export spec update: **separate + compressed
   textures (KTX2/Basis or ≤1K), not embedded**; keep everything else from the v2 spec (normals, UVs,
   Y-up/origin/feet-y0, named separate meshes, small inset `face_screen`, anchors, mastery). Validate
   it loads + renders + is small, on device, via the spike.
2. **Promote the spike → the real module** per the architect plan: `app/src/core/buddies/`
   (framework-free: `CharacterDefinition` species registry loaded from the JSON contracts —
   generic per species; `CosmeticDefinition` registry split from characters; expressions; animation
   policy; mastery mapping) + `app/src/components/buddy3d/` (the ONLY place `three`/`expo-gl`/r3f may
   be imported — enforce with an eslint `no-restricted-imports` rule) exposing a `BuddyRenderer`
   interface (`mount/setExpression/equip/unequip/setMasteryLevel/playReaction/setIdle/dispose`).
   Behind `featureFlags.buddy3d`, on the **Buddy tab only** (one live GL context; `dispose()` on
   unmount); keep the 2D `BuddyAvatar` everywhere else (Home/Explore/etc.).
3. **Real face + expressions:** render `push_face_neutral.svg` (+ the 8 expression variants — same
   silhouette, swap inner eyes/mouth/glow) to a texture on `face_screen`, driven off bus events
   (`BuddyReacted`→happy/excited, `BuddyEvolved`→excited, reserved `StepMissed`→sad).
4. **Wearables at anchors** (from `anchors.json`) + **mastery** (particle-mesh toggles + emission +
   portal per `mastery.json`) + **procedural animations** (idle bob, teleport-jump on `StepCheckedIn`).
5. Wire into `BuddyEngine` (level/stage → mastery) + Shop/inventory (items → wearable slots).
6. Then produce **all 19 characters** to the finalized (compressed) spec.

---

## ⚠️ UPDATE 2026-07-14 — DataTexture texture upload (v3 "richly detailed" render)

**Context:** v3 Hopper ships **detailed painted albedo + normal maps + emissive + 9 face
expressions** as SEPARATE ≤512² PNGs, with **no embedded textures and no texture bindings in the
GLB** — the material→texture map lives ONLY in the package's `materials.json`. Gotcha #6's fix
(load separate PNGs via the patched `THREE.TextureLoader` with the `require()` module) turned out to
**render BLANK on device** for our PNGs: r3f-native's patch sets `texture.image = {data:{localUri}}`
and relies on expo-gl's native image upload, which does not produce pixels for these files (hence the
white face). This is the deeper root cause behind #6.

**The fix that works (offline-validated; ⏳ device test pending):** decode the PNG bytes to raw RGBA
in JS and build a **`THREE.DataTexture`** — a plain `texImage2D` upload that needs no browser Image.
Added dep **`upng-js`** (pure-JS, Hermes-safe). Per texture, in `BuddyView.tsx`:
`Asset.fromModule(require).downloadAsync()` → `new File(uri).arrayBuffer()` → `UPNG.decode(bytes)` →
`new Uint8Array(UPNG.toRGBA8(png)[0])` → `new THREE.DataTexture(rgba, w, h, RGBAFormat, UnsignedByteType)`.
Set `colorSpace` = **sRGB** for `map`/`emissiveMap`, **NoColorSpace** for `normalMap`; `flipY = false`
(glTF convention — matches the old Image path; flip to `true` if a texture shows mirrored); 512² PNGs
are POT so `generateMipmaps + LinearMipmapLinear` are safe. Emissive shows only if `mat.emissive` is
non-black — force it to white when an `emissiveMap` is assigned.

**Ingest is now HYBRID** (`tools/ingest_creature.py`): if the GLB has embedded images+bindings → the
old baked path (unchanged); else read the mapping from the package's external `materials.json` + the
external texture FILES. It keeps DETAILED `map`/`normalMap`/`emissiveMap` external (copy, ≤512) and
bakes only flat metalRough → `roughness/metalnessFactor` (metal clamped ≤0.2). The registry
`ExternalSlot` now includes `normalMap`. The 9 face `expressionVariants` are recorded in the package
`materials.json` + `meta.json` for the future live-expression system. All 17 species re-ingested; the
16 v2 GLBs are byte-identical, only Hopper changed to v3 (21.6 MB geometry — accepted for this test).

**Offline validation done:** `tsc` 0 errors · `jest` 126/126 · three r180 parses the v3 GLB (21 meshes,
all with **tangents**+normals+UVs, so normal maps use the high-quality vertex-tangent path) · every
material name matches `materials.json` · UPNG decodes all 12 v3 PNGs to correct 512² RGBA · all 61
registry require-targets exist. **⏳ NEEDS ON-DEVICE:** confirm the DataTexture path actually paints on
the iPhone (detailed body albedo, readable normals, glowing neutral face), pick `flipY`, and re-tune
lights/roughness for depth. Renderer changes are confined to `app/src/components/buddy3d/`.

## Reference
- Working spike: `app/src/app/buddy3d-spike.tsx` (+ `buddy3d-spike.polyfills.ts`, `app/metro.config.js`).
- Deps added: `expo-gl`, `expo-asset`, `expo-file-system`, `three@0.180.0`, `@react-three/fiber@9.6.1`,
  `@types/three` (dev). (`@react-three/native` does NOT exist — RN support is `@react-three/fiber/native`.)
- Module design + boundaries: to be written as `Buddy_Rendering_Architecture.md` + **E5** (the architect
  plan is captured in the session transcript; re-derive from this doc + `Module_Architecture.md`).
