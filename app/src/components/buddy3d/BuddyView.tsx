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
 *  - Colours are BAKED into each GLB as material factors (ingest_creature.py), so nothing
 *    fragile loads for the body. Only detailed FACE textures load externally, by material.
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

import type { SpeciesEntry } from '@/core/buddies/registry.generated';

const TARGET_HEIGHT = 2.6; // world height the normalized model occupies; the fixed camera frames this.

async function loadTexture(mod: number): Promise<THREE.Texture> {
  // @react-three/fiber/native patches TextureLoader to accept a require() MODULE (number)
  // and resolve it via expo-asset. Passing a resolved file:// URI does NOT work on RN.
  const tex = await new THREE.TextureLoader().loadAsync(mod as unknown as string);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // glTF UV convention
  tex.needsUpdate = true;
  return tex;
}

/** Recompute missing normals, force opaque, then overlay only the external face textures. */
async function applyMaterials(root: THREE.Object3D, entry: SpeciesEntry) {
  const cache = new Map<number, THREE.Texture>();
  const get = async (mod: number) => {
    if (!cache.has(mod)) cache.set(mod, await loadTexture(mod));
    return cache.get(mod)!;
  };

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry as THREE.BufferGeometry | undefined;
    if (g && !g.getAttribute('normal')) g.computeVertexNormals();
    meshes.push(m);
  });

  for (const mesh of meshes) {
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (!mat) continue;
    mat.transparent = false;
    mat.opacity = 1;

    const slots = entry.externalTextures[mat.name];
    if (!slots) {
      mat.needsUpdate = true; // colour already comes from the baked baseColorFactor
      continue;
    }
    try {
      if (slots.map != null) mat.map = await get(slots.map);
      if (slots.emissiveMap != null) {
        mat.emissiveMap = await get(slots.emissiveMap);
        mat.emissiveIntensity = 1.35; // keep the baked emissiveFactor tint; make it glow
      }
      if (mat.name === 'mat_face_screen') mat.side = THREE.DoubleSide;
    } catch (e) {
      console.warn('[BuddyView] face texture load failed for', mat.name, e);
    }
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
  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#eaf0ff', '#2a2140', 1.1]} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-3.5, 1.5, 3]} intensity={1.1} color="#cfd8ff" />
      <directionalLight position={[0, 3.5, -4]} intensity={1.2} color="#9fb8ff" />
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
}: {
  species: SpeciesEntry;
  onFps?: (fps: number) => void;
  onStatus?: (status: string) => void;
  background?: string;
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
      <Canvas style={styles.canvas} gl={{ antialias: true }} camera={{ position: [0, 0, 3.6], fov: 45 }}>
        <color attach="background" args={[background]} />
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
