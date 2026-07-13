/**
 * buddy3d-spike — throwaway preview route (/buddy3d-spike), NOT wired into the tabs.
 *
 * Now a thin screen over the real modular pieces: it renders <BuddyView> (the generic,
 * registry-driven renderer in src/components/buddy3d) and lets you flip through every
 * species in the generated registry to eyeball each one on device. The renderer, the
 * per-species asset packages and this switcher are all data-driven — adding a creature is
 * just dropping a package through tools/ingest_creature.py (no code change here).
 */
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuddyView } from '@/components/buddy3d/BuddyView';
import { SPECIES_IDS, SPECIES_REGISTRY } from '@/core/buddies/registry.generated';

export default function Buddy3dSpikeScreen() {
  const [index, setIndex] = useState(0);
  const [fps, setFps] = useState(0);
  const [status, setStatus] = useState('starting…');

  const id = SPECIES_IDS[index];
  const species = SPECIES_REGISTRY[id];
  const cycle = (delta: number) => setIndex((i) => (i + delta + SPECIES_IDS.length) % SPECIES_IDS.length);

  return (
    <View style={styles.root}>
      <BuddyView species={species} onFps={setFps} onStatus={setStatus} />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.hud}>
          <Text style={styles.hudText}>{species.displayName}</Text>
          <Text style={styles.fps}>{fps} FPS</Text>
          <Text style={styles.hudSub}>{status}</Text>
        </View>

        <View style={styles.switcher}>
          <TouchableOpacity style={styles.navBtn} onPress={() => cycle(-1)}>
            <Text style={styles.navBtnText}>‹ Prev</Text>
          </TouchableOpacity>
          <Text style={styles.counter}>
            {index + 1} / {SPECIES_IDS.length}
          </Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => cycle(1)}>
            <Text style={styles.navBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#15101f' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  hud: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignSelf: 'flex-start',
  },
  hudText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  fps: { color: '#68E8FF', fontSize: 28, fontWeight: '800' },
  hudSub: { color: '#CFC6E0', fontSize: 12 },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  navBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: 'rgba(104,232,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(104,232,255,0.5)',
  },
  navBtnText: { color: '#68E8FF', fontSize: 16, fontWeight: '700' },
  counter: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
