/**
 * buddy3d-spike — THROWAWAY de-risking spike (NOT committed, NOT wired into the tabs).
 *
 * Renders Hopper v2 (detailed, textured GLB) in Expo Go (SDK 54) on the founder's iPhone.
 *
 * Hard-won expo-gl / RN + three lessons baked in here:
 *  - navigator.userAgent shim (polyfills, first import) — three r180 crashes without it.
 *  - NO manual gl.setSize/setPixelRatio — r3f-native owns sizing; overriding renders into a
 *    bottom-left corner of the framebuffer.
 *  - NO shadows / NO PMREM-IBL / NO EffectComposer bloom — all use render targets that
 *    misbehave on expo-gl. Plain lights only.
 *  - RECOMPUTE vertex normals if missing (procedural GLBs ship without them -> pure black).
 *  - EMBEDDED glTF textures do NOT decode on RN (no browser Image/Blob). So we load the
 *    package's SEPARATE texture PNGs via expo-asset + the native-patched TextureLoader and
 *    assign them by material name (per materials.json). This also keeps assets compressible.
 *  - Normalize the model (centre at origin, scale to a fixed height) + fixed camera, so
 *    framing never depends on fragile runtime bounds. v2 is Y-up already (no rotation).
 */
// Runtime shims for three-on-Hermes — MUST be the first import (runs before three).
import './buddy3d-spike.polyfills';

import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Separate texture files (v2 package) — loaded at runtime (embedded ones don't decode on RN).
const TEX = {
  body_basecolor: require('@/assets/buddies/hopper_v2/textures/body_basecolor.png'),
  body_metalrough: require('@/assets/buddies/hopper_v2/textures/body_metalrough.png'),
  inner_ear_basecolor: require('@/assets/buddies/hopper_v2/textures/inner_ear_basecolor.png'),
  frame_basecolor: require('@/assets/buddies/hopper_v2/textures/frame_basecolor.png'),
  frame_metalrough: require('@/assets/buddies/hopper_v2/textures/frame_metalrough.png'),
  face_neutral: require('@/assets/buddies/hopper_v2/textures/face_neutral.png'),
  screen_metalrough: require('@/assets/buddies/hopper_v2/textures/screen_metalrough.png'),
  face_emissive: require('@/assets/buddies/hopper_v2/textures/face_emissive.png'),
  accent_basecolor: require('@/assets/buddies/hopper_v2/textures/accent_basecolor.png'),
} as const;

type TexKey = keyof typeof TEX;

// GLB material NAME -> its textures (from materials.json).
const MAT_TEX: Record<string, { base?: TexKey; mr?: TexKey; emis?: TexKey }> = {
  mat_body: { base: 'body_basecolor', mr: 'body_metalrough' },
  mat_inner_ear: { base: 'inner_ear_basecolor', mr: 'body_metalrough' },
  mat_face_frame: { base: 'frame_basecolor', mr: 'frame_metalrough' },
  mat_face_screen: { base: 'face_neutral', mr: 'screen_metalrough', emis: 'face_emissive' },
  mat_teleport: { base: 'accent_basecolor', mr: 'frame_metalrough', emis: 'face_emissive' },
};

async function loadTexture(mod: number, srgb: boolean): Promise<THREE.Texture> {
  // @react-three/fiber/native patches TextureLoader to accept a require() MODULE (number)
  // and resolve it via expo-asset internally — passing a resolved file:// URI does NOT work
  // (falls back to the DOM image loader, which RN lacks). So pass the module straight in.
  const tex = await new THREE.TextureLoader().loadAsync(mod as unknown as string);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.flipY = false; // glTF UV convention
  tex.needsUpdate = true;
  return tex;
}

/**
 * Recompute missing normals, then load the SEPARATE package textures and assign them to the
 * GLB's materials by name. Also forces materials opaque + a visible base colour so a mesh is
 * never invisible even if a texture fails to load.
 */
async function applyV2Materials(root: THREE.Object3D) {
  const cache = new Map<TexKey, THREE.Texture>();
  const get = async (key: TexKey, srgb: boolean) => {
    if (!cache.has(key)) cache.set(key, await loadTexture(TEX[key], srgb));
    return cache.get(key)!;
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
    mat.color = new THREE.Color(0xffffff); // let the map show its true colour

    const spec = MAT_TEX[mat.name];
    if (!spec) continue;

    try {
      if (spec.base) mat.map = await get(spec.base, true);
      if (spec.mr) {
        const t = await get(spec.mr, false);
        mat.roughnessMap = t;
        mat.metalnessMap = t;
        mat.roughness = 1;
        mat.metalness = 1;
      }
      if (spec.emis) {
        mat.emissiveMap = await get(spec.emis, true);
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 1.25;
      }
      if (mat.name === 'mat_face_screen') mat.side = THREE.DoubleSide;
    } catch (e) {
      console.warn('[buddy3d-spike] texture load failed for', mat.name, e);
    }
    mat.needsUpdate = true;
  }
}

// World height the normalized model should occupy. The fixed camera frames a model this size.
const TARGET_HEIGHT = 2.6;

/** Loaded Hopper v2, normalized once (centre at origin, scale to TARGET_HEIGHT). Y-up already. */
function Hopper({ scene }: { scene: THREE.Group }) {
  const bob = useRef<THREE.Group>(null);

  useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = TARGET_HEIGHT / maxDim;
    scene.scale.setScalar(s);
    scene.position.set(-center.x * s, -center.y * s, -center.z * s);
  }, [scene]);

  useFrame((state) => {
    if (!bob.current) return;
    bob.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.2) * 0.06;
  });

  return (
    <group ref={bob}>
      <primitive object={scene} />
    </group>
  );
}

/** Plain always-on lights — no shadows, no IBL (both break on expo-gl). */
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

/** Color space + tone mapping only (NEVER call gl.setSize/setPixelRatio — corner bug). */
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

/** On-screen FPS counter. */
function FpsProbe({ onFps }: { onFps: (fps: number) => void }) {
  const frames = useRef(0);
  const last = useRef(0);
  useFrame((state) => {
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

export default function Buddy3dSpikeScreen() {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('starting…');
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const step = (label: string) => {
      console.log('[buddy3d-spike] step:', label);
      if (!cancelled) setStatus(label);
    };

    (async () => {
      try {
        step('resolving asset');
        const asset = Asset.fromModule(
          require('@/assets/buddies/hopper_v2/model/hopper_v2_runtime.glb'),
        );

        step('downloading GLB (21MB)');
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) throw new Error('asset uri is undefined');

        step('reading bytes');
        const bytes = await new File(uri).arrayBuffer();
        if (!bytes || bytes.byteLength === 0) throw new Error('read 0 bytes from glb');

        step('parsing GLB');
        const loader = new GLTFLoader();
        loader.parse(
          bytes,
          '',
          (gltf) => {
            if (cancelled) return;
            const meshNames: string[] = [];
            gltf.scene.traverse((o) => {
              if ((o as THREE.Mesh).isMesh) meshNames.push(o.name);
            });
            console.log(`[buddy3d-spike] loaded ${meshNames.length} meshes:`, meshNames.join(', '));

            step('loading textures');
            (async () => {
              try {
                await applyV2Materials(gltf.scene);
              } catch (e) {
                console.warn('[buddy3d-spike] applyV2Materials failed', e);
              }
              if (cancelled) return;
              step(`ready · ${meshNames.length} meshes`);
              setScene(gltf.scene);
            })();
          },
          (err) => {
            console.error('[buddy3d-spike] GLTF parse error', err);
            if (!cancelled) setError(`parse: ${String(err)}`);
          },
        );
      } catch (e) {
        console.error('[buddy3d-spike] load error at step:', status, e);
        if (!cancelled) setError(`${status}: ${String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Canvas style={styles.canvas} gl={{ antialias: true }} camera={{ position: [0, 0, 3.6], fov: 45 }}>
        <color attach="background" args={['#15101f']} />
        <RendererTuning />
        <Lights />
        {scene && <Hopper scene={scene} />}
        <FpsProbe onFps={setFps} />
      </Canvas>

      <SafeAreaView pointerEvents="none" style={styles.overlay} edges={['top']}>
        <View style={styles.hud}>
          <Text style={styles.hudText}>Hopper v2 spike</Text>
          <Text style={styles.fps}>{fps} FPS</Text>
          <Text style={styles.hudSub}>{error ? `ERROR: ${error}` : status}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#15101f' },
  canvas: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  hud: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignSelf: 'flex-start',
  },
  hudText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  fps: { color: '#68E8FF', fontSize: 28, fontWeight: '800' },
  hudSub: { color: '#CFC6E0', fontSize: 12 },
});
