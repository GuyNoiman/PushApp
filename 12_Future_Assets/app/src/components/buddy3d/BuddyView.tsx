/**
 * BuddyView — the generic, registry-driven 3D creature renderer.
 *
 * This is the ONE place `three` / `expo-gl` / r3f are imported. Give it any SpeciesEntry
 * from the generated registry and it renders that creature. Every hard-won expo-gl + RN
 * lesson from the spike lives here (see Buddy_3D_Spike_Findings.md):
 *  - polyfills imported FIRST (three r180 crashes on missing navigator.userAgent).
 *  - GLB via expo-asset -> File.arrayBuffer -> GLTFLoader.parse(bytes, '', ...).
 *  - NO gl.setSize/setPixelRatio (corner bug); NO shadows/PMREM-IBL/bloom (render targets
 *    break on expo-gl) — plain lights only.
 *  - Flat colours are BAKED into each GLB as material factors (ingest_creature.py); DETAILED
 *    textures (baseColor `map`, `normalMap`, `emissiveMap`) load externally, by material.
 *  - TEXTURE UPLOAD: RN/expo-gl has no browser Image/decode, so @react-three/fiber's patched
 *    TextureLoader (and embedded glTF images) render BLANK. Instead we decode each PNG's bytes
 *    to raw RGBA8 in JS (upng-js) and build a THREE.DataTexture — a plain texImage2D upload
 *    that needs no Image. This is what makes the detailed albedo + normals + face actually show.
 *  - Recompute missing normals; normalize model + fixed camera; Y-up (no rotation).
 */
import './polyfills';

import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import UPNG from 'upng-js';

import type { ExternalSlot, SpeciesEntry } from '@/core/buddies/registry.generated';

const TARGET_HEIGHT = 2.6; // world height the normalized model occupies; the fixed camera frames this.

type TexRole = 'color' | 'linear'; // sRGB for baseColor/emissive, linear for normal/data maps.

/**
 * Decode a require()'d PNG module to raw RGBA8 and build a DataTexture. We go through
 * expo-asset -> File.arrayBuffer -> UPNG (pure JS) rather than any Image-based loader because
 * expo-gl cannot decode PNGs itself; a DataTexture is a bare texImage2D upload that always works.
 */
async function loadDataTexture(mod: number, role: TexRole): Promise<THREE.Texture> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('texture asset uri is undefined');
  const bytes = await new File(uri).arrayBuffer();
  const png = UPNG.decode(bytes);
  const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]); // frame 0, tightly-packed RGBA8

  // WebGL ignores texture.flipY for DataTexture (raw-pixel) uploads — UNPACK_FLIP_Y only
  // applies to Image/Canvas sources. UPNG rows are top-to-bottom but glTF UVs put v=0 at the
  // bottom, so the image renders upside-down (Hopper's face: mouth up, eyes down). Flip the
  // rows here in JS to match the glTF UV convention.
  const rowBytes = png.width * 4;
  const flipped = new Uint8Array(rgba.length);
  for (let y = 0; y < png.height; y++) {
    flipped.set(rgba.subarray(y * rowBytes, y * rowBytes + rowBytes), (png.height - 1 - y) * rowBytes);
  }

  const tex = new THREE.DataTexture(flipped, png.width, png.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.flipY = false; // rows already flipped above; keep the WebGL unpack flag off.
  tex.colorSpace = role === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter; // our PNGs are 512² (POT) so mipmaps are safe.
  tex.generateMipmaps = true;
  tex.anisotropy = 4; // three clamps to the device max; sharpens the albedo at grazing angles.
  tex.needsUpdate = true;
  return tex;
}

/** Recompute missing normals, force opaque, then apply the external map/normalMap/emissiveMap. */
async function applyMaterials(root: THREE.Object3D, entry: SpeciesEntry) {
  const cache = new Map<string, Promise<THREE.Texture>>();
  const get = (mod: number, role: TexRole) => {
    const key = `${mod}:${role}`;
    let p = cache.get(key);
    if (!p) {
      p = loadDataTexture(mod, role);
      cache.set(key, p);
    }
    return p;
  };

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry as THREE.BufferGeometry | undefined;
    if (g && !g.getAttribute('normal')) g.computeVertexNormals();
    meshes.push(m);
  });

  const roleOf: Record<ExternalSlot, TexRole> = { map: 'color', normalMap: 'linear', emissiveMap: 'color' };

  for (const mesh of meshes) {
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (!mat) continue;
    mat.transparent = false;
    mat.opacity = 1;

    const slots = entry.externalTextures[mat.name];
    if (slots) {
      try {
        if (slots.map != null) mat.map = await get(slots.map, roleOf.map);
        if (slots.normalMap != null) {
          const g = mesh.geometry as THREE.BufferGeometry;
          if (!g.getAttribute('tangent')) {
            // three then derives tangents in-shader from screen-space derivatives, so the
            // normal map still reads — just at slightly lower quality than vertex tangents.
            console.log('[BuddyView] normalMap w/o vertex tangents (derivative fallback):', mat.name);
          }
          mat.normalMap = await get(slots.normalMap, roleOf.normalMap);
          mat.normalScale = new THREE.Vector2(1, 1);
        }
        if (slots.emissiveMap != null) {
          mat.emissiveMap = await get(slots.emissiveMap, roleOf.emissiveMap);
          mat.emissive = new THREE.Color(0xffffff); // final emissive = emissive * map; must be non-black
          mat.emissiveIntensity = 1.35;
        }
        if (mat.name === 'mat_face_screen' || mat.name === 'mat_screen') mat.side = THREE.DoubleSide;
      } catch (e) {
        console.warn('[BuddyView] texture load failed for', mat.name, e);
      }
    }

    // Keep every material in a readable band: no near-mirror (renders dark/flat with no env map
    // on expo-gl) and no 100%-rough (washes the normal detail out). metalness is already clamped
    // at ingest. This lets the plain directional lights bring out the baked albedo + normals.
    mat.roughness = Math.min(0.92, Math.max(0.45, mat.roughness));
    mat.needsUpdate = true;
  }
}

function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      std?.map?.dispose();
      std?.normalMap?.dispose();
      std?.emissiveMap?.dispose();
      std?.dispose?.();
    }
  });
}

const FRAME_MARGIN = 1.32; // extra air around the creature so it never touches the edges

/** Normalized creature (centre at origin, scale to TARGET_HEIGHT) with a gentle idle bob.
 *  The camera distance is auto-fit to the model's bounding sphere AND the current canvas
 *  aspect (portrait phones are narrow), so every creature — tall, wide, big-eared — sits
 *  fully inside the frame with margin, regardless of shape. */
function Creature({ scene }: { scene: THREE.Group }) {
  const bob = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  const radius = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const sz = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
    const s = TARGET_HEIGHT / maxDim;
    scene.scale.setScalar(s);
    scene.position.set(-center.x * s, -center.y * s, -center.z * s);
    return new THREE.Box3().setFromObject(scene).getBoundingSphere(new THREE.Sphere()).radius;
  }, [scene]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = size.width / Math.max(size.height, 1);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    // distance so the bounding sphere fits both axes; the narrower (horizontal, on portrait) wins.
    const dist = Math.max(radius / Math.sin(vFov / 2), radius / Math.sin(hFov / 2));
    cam.position.set(0, 0, dist * FRAME_MARGIN);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, radius]);

  useFrame((state) => {
    if (bob.current) bob.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.2) * 0.06;
  });
  return (
    <group ref={bob}>
      <primitive object={scene} />
    </group>
  );
}

function Lights() {
  // Plain lights only (no IBL/shadows on expo-gl). Ambient/hemisphere are pulled down a touch
  // vs. the flat-colour era so the KEY directional casts a real gradient across the surface —
  // that gradient is what makes the v3 normal maps + painted albedo read with depth. Fill + rim
  // keep the shadow side from going muddy.
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#eaf0ff', '#2a2140', 0.8]} />
      <directionalLight position={[3, 4, 5]} intensity={2.7} />
      <directionalLight position={[-3.5, 1.5, 3]} intensity={1.0} color="#cfd8ff" />
      <directionalLight position={[0, 3.5, -4]} intensity={1.1} color="#9fb8ff" />
    </>
  );
}

function RendererTuning() {
  const { gl } = useThree();
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);
  return null;
}

function FpsProbe({ onFps }: { onFps?: (fps: number) => void }) {
  const frames = useRef(0);
  const last = useRef(0);
  useFrame((state) => {
    if (!onFps) return;
    frames.current += 1;
    const now = state.clock.getElapsedTime();
    if (last.current === 0) last.current = now;
    if (now - last.current >= 0.5) {
      onFps(Math.round(frames.current / (now - last.current)));
      frames.current = 0;
      last.current = now;
    }
  });
  return null;
}

export function BuddyView({
  species,
  onFps,
  onStatus,
  background = '#15101f',
  transparent = false,
}: {
  species: SpeciesEntry;
  onFps?: (fps: number) => void;
  onStatus?: (status: string) => void;
  background?: string;
  /**
   * Render the creature over a transparent canvas instead of filling it with
   * `background`. Used by the Buddy tab, where the creature has to composite onto
   * the forest scene's own sky/ground bands — an opaque background there would
   * paint a solid rectangle over them. The spike route keeps the default (opaque)
   * so its dark backdrop is unchanged.
   */
  transparent?: boolean;
}) {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Group | null = null;
    setScene(null);
    onStatus?.(`loading ${species.displayName}…`);

    (async () => {
      try {
        const asset = Asset.fromModule(species.glb);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) throw new Error('asset uri is undefined');
        const bytes = await new File(uri).arrayBuffer();

        new GLTFLoader().parse(
          bytes,
          '',
          (gltf) => {
            if (cancelled) return;
            (async () => {
              try {
                await applyMaterials(gltf.scene, species);
              } catch (e) {
                console.warn('[BuddyView] applyMaterials failed', e);
              }
              if (cancelled) {
                disposeScene(gltf.scene);
                return;
              }
              loaded = gltf.scene;
              setScene(gltf.scene);
              onStatus?.(`ready · ${species.displayName}`);
            })();
          },
          (err) => {
            console.error('[BuddyView] GLTF parse error', err);
            if (!cancelled) onStatus?.(`ERROR: ${String(err)}`);
          },
        );
      } catch (e) {
        console.error('[BuddyView] load error', e);
        if (!cancelled) onStatus?.(`ERROR: ${String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
      if (loaded) disposeScene(loaded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species]);

  return (
    <View style={styles.root}>
      <Canvas
        style={styles.canvas}
        gl={{ antialias: true, alpha: transparent }}
        camera={{ position: [0, 0, 3.6], fov: 45 }}>
        {/* Attaching a scene background makes the canvas opaque; skip it entirely in
            transparent mode so the forest scene behind shows through. */}
        {!transparent && <color attach="background" args={[background]} />}
        <RendererTuning />
        <Lights />
        {scene && <Creature scene={scene} />}
        <FpsProbe onFps={onFps} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1 },
});
