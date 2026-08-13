/**
 * BigCelebration (Completion Celebration, I1) — the one-shot celebratory animation for the big
 * Journey-completion ceremony (PRD §2.2). Distinct from — and larger than — the per-Step confetti:
 * a full-width radiant burst behind the card. It plays ONCE when `play` flips true (the fresh
 * completion path); the reopen path never plays it.
 *
 * ACCESSIBILITY (PRD §2.2 / §7): when the OS "Reduce Motion" setting is on, the burst is replaced by
 * a calm STATIC glow that fades on OPACITY ONLY — no motion — so the moment is still marked. Note
 * the big ceremony is NOT governed by the small-celebration toggle; only Reduce Motion softens it.
 *
 * A non-interactive overlay (pointerEvents="none"); presentational only (Engineering Bible §19).
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

const DURATION = 1600;
const PIECE_COUNT = 40;

interface Ray {
  angle: number;
  distance: number;
  size: number;
  colorIndex: number;
  spin: number;
}

/** Deterministic radiant layout — pieces fan out in a full circle (stable worklets). */
function buildRays(): Ray[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const deg = (360 / PIECE_COUNT) * i;
    return {
      angle: (deg * Math.PI) / 180,
      distance: 140 + ((i * 53) % 120),
      size: 8 + (i % 3) * 3,
      colorIndex: i % 4,
      spin: (i % 2 === 0 ? 1 : -1) * (180 + ((i * 41) % 240)),
    };
  });
}

function RayPiece({ ray, progress, color }: { ray: Ray; progress: SharedValue<number>; color: string }) {
  const dx = Math.cos(ray.angle) * ray.distance;
  const dy = Math.sin(ray.angle) * ray.distance;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const appear = Math.min(1, p * 5);
    const fade = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    return {
      opacity: appear * Math.max(0, fade),
      transform: [
        { translateX: dx * p },
        { translateY: dy * p + 120 * p * p },
        { rotate: `${ray.spin * p}deg` },
        { scale: 0.4 + appear * 0.6 },
      ],
    };
  });

  return <Animated.View style={[styles.piece, { width: ray.size, height: ray.size, backgroundColor: color }, style]} />;
}

/** The reduced-motion replacement: a soft central glow that fades in and out on opacity only. */
function StaticGlow({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const appear = Math.min(1, p / 0.2);
    const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    return { opacity: 0.35 * appear * Math.max(0, fade) };
  });
  return <Animated.View style={[styles.glow, { backgroundColor: color }, style]} />;
}

export function BigCelebration({ play }: { play: boolean }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  const rays = useMemo(buildRays, []);
  const colors = useMemo(() => [theme.tint, theme.gold, theme.success, theme.coral], [theme]);

  useEffect(() => {
    if (!play) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) });
  }, [play, progress]);

  if (!play) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {reduced ? (
        <StaticGlow progress={progress} color={theme.tint} />
      ) : (
        <View style={[styles.origin, { left: width / 2 }]}>
          {rays.map((ray, i) => (
            <RayPiece key={i} ray={ray} progress={progress} color={colors[ray.colorIndex]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  origin: {
    position: 'absolute',
    top: '38%',
  },
  piece: {
    position: 'absolute',
    borderRadius: 3,
  },
  glow: {
    width: 260,
    height: 260,
    borderRadius: 130,
  },
});
