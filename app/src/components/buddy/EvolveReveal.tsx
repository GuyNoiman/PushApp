/**
 * EvolveReveal — presentational only. The celebration surface shown when the
 * Buddy evolves into a new stage (Buddy_Screen.md → "Hatch / Evolve reveal"):
 * a dark screen with a radial light burst behind the new creature, its new
 * stage name, gold stars, and a COLLECT button. This is a reward/identity
 * surface that earns full game-juice; work surfaces stay calm.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { BuddyAvatar } from '@/components/buddy/BuddyAvatar';
import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import type { BuddyStage } from '@/core/types/domain';

const GOLD = '#F5C451';

export function EvolveReveal({
  visible,
  buddyName,
  toStage,
  toStageDisplayName,
  onCollect,
}: {
  visible: boolean;
  buddyName: string;
  toStage: BuddyStage;
  toStageDisplayName: string;
  onCollect: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCollect}>
      <View style={styles.backdrop}>
        <View style={styles.burst}>
          <BuddyAvatar stage={toStage} size={180} />
        </View>

        <ThemedText type="small" style={styles.eyebrow}>
          {buddyName} evolved
        </ThemedText>
        <ThemedText style={styles.stageName}>{toStageDisplayName}</ThemedText>
        <ThemedText style={styles.stars}>⭐ ⭐ ⭐</ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Collect — ${toStageDisplayName}`}
          onPress={onCollect}
          style={({ pressed }) => [styles.collectButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.collectLabel}>
            COLLECT
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(8, 8, 12, 0.92)',
  },
  burst: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 196, 81, 0.14)',
    borderWidth: 2,
    borderColor: 'rgba(245, 196, 81, 0.35)',
  },
  eyebrow: {
    color: GOLD,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  stageName: {
    fontFamily: FontFamily.headingBold,
    color: '#ffffff',
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
  },
  stars: {
    color: GOLD,
    fontSize: 20,
    lineHeight: 28,
  },
  collectButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 28,
    backgroundColor: GOLD,
  },
  collectLabel: {
    color: '#1a1400',
    letterSpacing: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
