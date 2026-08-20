/**
 * SwipeableValueCard — the card you throw, in the founder's three directions.
 *
 * **right = very important · left = not for me now · down = in between.** The mapping itself is not
 * here: it is `BUCKET_GESTURE` in the model, because a direction is a meaning. This component only
 * knows how to detect a throw.
 *
 * THE DIRECTIONS ARE PHYSICAL, NOT READING-ORDER, and that is deliberate. Nearly everything else in
 * this app flips for Hebrew, because a chevron that points "forward" must point the way the language
 * runs. A card deck is the exception: throwing something away from you to the right is a physical
 * habit people bring from every other card app, and mirroring it for Hebrew would make the gesture
 * mean the opposite of what a person's hands already know. The three BUTTONS are labelled in words
 * and are the primary path, so nothing depends on guessing the mapping.
 *
 * NOTHING IS DECIDED MID-GESTURE. The card follows the finger and tilts; the bucket is committed on
 * release, and only past the distance threshold. A card that commits while you are still deciding is
 * a card that sorts your values for you.
 */
import { useCallback } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { Bucket } from '@/core/tools/values/flow';

/** How far a card has to travel before a release counts as a throw rather than a fidget. */
const THROW_DISTANCE = 96;
/** How far off screen a committed card flies before the next one appears. */
const EXIT = 520;

export interface SwipeableValueCardProps {
  /** Changes when the card does. Resets the position, so the next value starts centred. */
  cardKey: string;
  onSort: (bucket: Bucket) => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SwipeableValueCard({ cardKey, onSort, children, style }: SwipeableValueCardProps) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  /** Commit, then snap back to centre for the next card. */
  const commit = useCallback(
    (bucket: Bucket, tx: SharedValue<number>, ty: SharedValue<number>) => {
      onSort(bucket);
      tx.value = 0;
      ty.value = 0;
    },
    [onSort],
  );

  const pan = Gesture.Pan()
    .onChange((event) => {
      x.value += event.changeX;
      y.value += event.changeY;
    })
    .onEnd(() => {
      const horizontal = Math.abs(x.value);
      const vertical = y.value;

      if (horizontal > THROW_DISTANCE && horizontal > Math.abs(vertical)) {
        const bucket: Bucket = x.value > 0 ? 'core' : 'notNow';
        x.value = withTiming(Math.sign(x.value) * EXIT, { duration: 180 }, (done) => {
          if (done) runOnJS(commit)(bucket, x, y);
        });
        return;
      }
      if (vertical > THROW_DISTANCE) {
        y.value = withTiming(EXIT, { duration: 180 }, (done) => {
          if (done) runOnJS(commit)('maybe', x, y);
        });
        return;
      }
      // Not far enough to mean anything. Come back and let them keep thinking.
      x.value = withSpring(0, { damping: 18 });
      y.value = withSpring(0, { damping: 18 });
    });

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      // A small tilt in the direction of travel. It is what makes the card feel thrown rather than
      // dragged, and it is capped so a long swipe never turns the text sideways.
      { rotate: `${interpolate(x.value, [-EXIT, 0, EXIT], [-14, 0, 14], 'clamp')}deg` },
    ],
    opacity: interpolate(
      Math.max(Math.abs(x.value), Math.max(y.value, 0)),
      [0, THROW_DISTANCE, EXIT],
      [1, 1, 0.2],
      'clamp',
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      {/* `key` remounts the card when the value changes, so the shared values start from zero even
          if a commit was interrupted. */}
      <Animated.View key={cardKey} style={[styles.card, style, animated]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
});
