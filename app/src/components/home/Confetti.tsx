/**
 * Confetti — a brief, classy celebration burst for the moment a Step is marked done
 * (2026-08-07 redesign). Built on `react-native-reanimated` (already an app dep — no
 * new package): a handful of small pieces fan out from the upper third, tumble under
 * a little gravity, and fade in ~1.1s. Tasteful, not childish (Design System §7).
 *
 * Fires whenever `fireKey` changes to a new non-zero value; an overlay that never
 * intercepts touches (pointerEvents="none"). Presentational only.
 */
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const DURATION = 1150;
const COUNT = 16;

// Deterministic per-piece params (no per-render randomness → stable worklets). Angle
// biases upward/outward; distance/drift/spin vary so the burst feels organic.
interface PieceSpec {
  angle: number; // radians, measured from +x, negative y = up
  distance: number; // px reach along the angle
  drift: number; // extra horizontal wander
  spin: number; // total rotation in degrees
  size: number;
  colorIndex: number;
}

const PIECES: PieceSpec[] = Array.from({ length: COUNT }, (_, i) => {
  const t = i / COUNT;
  // Fan across the top hemisphere (-160°..-20°), with a little jitter per index.
  const deg = -160 + t * 140 + (i % 3) * 6;
  return {
    angle: (deg * Math.PI) / 180,
    distance: 90 + ((i * 37) % 70),
    drift: ((i % 2 === 0 ? 1 : -1) * (10 + (i * 13) % 26)),
    spin: (i % 2 === 0 ? 1 : -1) * (180 + (i * 47) % 220),
    size: 7 + (i % 3) * 2,
    colorIndex: i % 4,
  };
});

function Piece({ piece, progress, color }: { piece: PieceSpec; progress: SharedValue<number>; color: string }) {
  const dx = Math.cos(piece.angle) * piece.distance;
  const dy = Math.sin(piece.angle) * piece.distance;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Ease-out fan on the way out, gravity pulling back down as p grows.
    const ex = dx * p + piece.drift * p;
    const ey = dy * p + 260 * p * p;
    const appear = Math.min(1, p * 6); // quick pop-in
    const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3; // fade over the last 30%
    return {
      opacity: appear * Math.max(0, fade),
      transform: [
        { translateX: ex },
        { translateY: ey },
        { rotate: `${piece.spin * p}deg` },
        { scale: 0.5 + appear * 0.5 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.size, height: piece.size * 1.4, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function Confetti({ fireKey }: { fireKey: number }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  const colors = [theme.tint, theme.gold, theme.success, theme.coral];

  useEffect(() => {
    if (fireKey <= 0) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) });
  }, [fireKey, progress]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={[styles.origin, { left: width / 2 }]}>
        {PIECES.map((piece, i) => (
          <Piece key={i} piece={piece} progress={progress} color={colors[piece.colorIndex]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  origin: {
    position: 'absolute',
    top: '32%',
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});
