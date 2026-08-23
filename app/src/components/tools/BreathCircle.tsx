/**
 * BreathCircle — the calm form at the centre of A Self-Compassion Moment: a circle that widens on
 * the in-breath and settles on the out-breath, with the carried sentence inside it.
 *
 * REDUCED MOTION IS NOT A DEGRADED MODE. With the OS setting on, the circle simply does not move and
 * the words change on the same rhythm. Somebody who cannot tolerate motion gets the same practice,
 * not a lesser one (PRD §11).
 *
 * IT NEVER COUNTS ANYTHING AT THE PERSON. No timer runs down, no rounds are displayed as a score,
 * and reaching the end is not a completion — the practice is over when the person says it is.
 *
 * Presentational only (Engineering Bible §19).
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BREATH_IN_MS, BREATH_OUT_MS } from '@/core/tools/selfCompassion/model';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

export interface BreathCircleProps {
  /** The sentence held inside the circle. May be empty — the breath works without one. */
  phrase?: string;
  /** What to say on the in-breath and the out-breath. */
  inLabel: string;
  outLabel: string;
  tintColor: string;
  accentColor: string;
  size?: number;
}

export function BreathCircle({ phrase, inLabel, outLabel, tintColor, accentColor, size = 220 }: BreathCircleProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(0.85)).current;
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // The words follow the same rhythm whether or not the circle moves, so reduced motion changes
    // what you see and not what you do.
    const cycle = (next: 'in' | 'out') => {
      if (cancelled) return;
      setPhase(next);
      timer = setTimeout(() => cycle(next === 'in' ? 'out' : 'in'), next === 'in' ? BREATH_IN_MS : BREATH_OUT_MS);
    };
    cycle('in');

    if (!reduced) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1, duration: BREATH_IN_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.85, duration: BREATH_OUT_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        loop.stop();
      };
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reduced, scale]);

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={phrase ?? inLabel}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tintColor,
            transform: reduced ? [] : [{ scale }],
          },
        ]}>
        {phrase ? (
          <ThemedText type="smallBold" style={[styles.phrase, { color: theme.text }]}>{phrase}</ThemedText>
        ) : null}
      </Animated.View>
      <ThemedText type="small" style={{ color: accentColor }}>
        {phase === 'in' ? inLabel : outLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.three },
  circle: { alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  phrase: { textAlign: 'center' },
});
