/**
 * Confetti — a brief, classy celebration burst for the moment a Step is marked done
 * (2026-08-07 redesign; small-celebration variants added for Completion Celebration I1).
 * Built on `react-native-reanimated` (already an app dep — no new package): a handful of
 * small pieces fan out from the upper third, tumble under a little gravity, and fade in
 * ~1.1s. Tasteful, not childish (Design System §7).
 *
 * Each fire picks one of the approved small-celebration VARIANTS at random (piece count /
 * shape / palette / spread — `core/celebration/smallVariants.ts`). Every variant is tuned
 * to comparable intensity, so the pick is purely cosmetic and never signals different value
 * (PRD §2.1). Palette token keys resolve to on-brand colours here at render time.
 *
 * Reduced-motion accessibility (PRD §2.1 / §7): when the OS "Reduce Motion" setting is on,
 * the burst is replaced by a calm STATIC acknowledgement — a centred check that fades via
 * opacity only, no motion — so the moment is still recognised without animation.
 *
 * Fires whenever `fireKey` changes to a new non-zero value; an overlay that never intercepts
 * touches (pointerEvents="none"). Presentational only.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import {
  SMALL_CELEBRATION_VARIANTS,
  type SmallCelebrationShape,
  type SmallCelebrationVariant,
} from '@/core/celebration/smallVariants';

const DURATION = 1150;

// Deterministic per-piece params (no per-render randomness → stable worklets). Angle
// biases upward/outward; distance/drift/spin vary so the burst feels organic. Derived
// from the chosen variant's piece count + spread so each variant reads a touch different.
interface PieceSpec {
  angle: number; // radians, measured from +x, negative y = up
  distance: number; // px reach along the angle
  drift: number; // extra horizontal wander
  spin: number; // total rotation in degrees
  size: number;
  colorIndex: number;
}

/** Build the piece layout for a variant — deterministic given the variant (stable worklets). */
function buildPieces(variant: SmallCelebrationVariant): PieceSpec[] {
  const { pieceCount, spread } = variant;
  // Wider spread → wider fan across the top hemisphere, centred straight up (-90°).
  const span = 60 + spread * 180;
  const start = -90 - span / 2;
  return Array.from({ length: pieceCount }, (_, i) => {
    const t = pieceCount > 1 ? i / (pieceCount - 1) : 0.5;
    const deg = start + t * span + (i % 3) * 4;
    return {
      angle: (deg * Math.PI) / 180,
      distance: 90 + ((i * 37) % 70),
      drift: (i % 2 === 0 ? 1 : -1) * (10 + ((i * 13) % 26)),
      spin: (i % 2 === 0 ? 1 : -1) * (180 + ((i * 47) % 220)),
      size: 7 + (i % 3) * 2,
      colorIndex: i % 4,
    };
  });
}

/** The piece silhouette for a variant's shape — confetti flutter, star chip, or round spark. */
function shapeStyle(shape: SmallCelebrationShape, size: number) {
  switch (shape) {
    case 'sparkles':
      return { width: size, height: size, borderRadius: size / 2 };
    case 'stars':
      return { width: size, height: size, borderRadius: 2 };
    case 'confetti':
    default:
      return { width: size, height: size * 1.4, borderRadius: 2 };
  }
}

function Piece({
  piece,
  progress,
  color,
  shape,
}: {
  piece: PieceSpec;
  progress: SharedValue<number>;
  color: string;
  shape: SmallCelebrationShape;
}) {
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
      style={[styles.piece, shapeStyle(shape, piece.size), { backgroundColor: color }, style]}
    />
  );
}

/**
 * The reduced-motion replacement: a calm, centred check + short acknowledgement that fades
 * in and out on OPACITY ONLY (no translation/scale) so it respects Reduce Motion (PRD §7).
 */
function StaticAcknowledgement({ progress }: { progress: SharedValue<number> }) {
  const theme = useTheme();
  const { t } = useTranslation('celebration');

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const appear = Math.min(1, p / 0.15); // gentle fade-in over the first 15%
    const fade = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25; // fade out over the last 25%
    return { opacity: appear * Math.max(0, fade) };
  });

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={t('smallAckA11y')}
      style={[styles.ack, { backgroundColor: theme.successTint }, style]}>
      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
      <ThemedText type="smallBold" style={{ color: theme.success }}>
        {t('smallAck')}
      </ThemedText>
    </Animated.View>
  );
}

export function Confetti({ fireKey }: { fireKey: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  // The variant in play for the current burst — re-rolled on each fire (cosmetic only).
  const [variant, setVariant] = useState<SmallCelebrationVariant>(SMALL_CELEBRATION_VARIANTS[0]);

  useEffect(() => {
    if (fireKey <= 0) return;
    // Re-roll the variant every fire (all comparable — pure variety, PRD §2.1).
    setVariant(
      SMALL_CELEBRATION_VARIANTS[Math.floor(Math.random() * SMALL_CELEBRATION_VARIANTS.length)],
    );
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) });
  }, [fireKey, progress]);

  const pieces = useMemo(() => buildPieces(variant), [variant]);
  // Resolve the variant's palette token keys to on-brand colours at render time.
  const colors = useMemo(() => variant.paletteTokens.map((token) => paletteColor(theme, token)), [
    variant,
    theme,
  ]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {reduced ? (
        <StaticAcknowledgement progress={progress} />
      ) : (
        <View style={[styles.origin, { left: width / 2 }]}>
          {pieces.map((piece, i) => (
            <Piece
              key={i}
              piece={piece}
              progress={progress}
              color={colors[piece.colorIndex % colors.length]}
              shape={variant.shape}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Map a small-variant palette token key to an on-brand colour from the active theme. */
function paletteColor(theme: ReturnType<typeof useTheme>, token: string): string {
  switch (token) {
    case 'celebration.a':
      return theme.tint;
    case 'celebration.b':
      return theme.gold;
    case 'celebration.c':
      return theme.success;
    case 'celebration.d':
      return theme.coral;
    default:
      return theme.tint;
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    // Centres the reduced-motion badge; the animated burst's origin is absolute
    // (below) so this alignment does not affect it.
    alignItems: 'center',
    justifyContent: 'center',
  },
  origin: {
    position: 'absolute',
    top: '32%',
  },
  piece: {
    position: 'absolute',
  },
  ack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
});
