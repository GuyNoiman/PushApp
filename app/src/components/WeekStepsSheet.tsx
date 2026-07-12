/**
 * WeekStepsSheet — Home's draggable "Week's steps" panel (Home_Screen.md
 * "Finalized visual design"): a full-width, SQUARE-top-corners cream panel that
 * sits over a frozen top zone (ResourceBar + greeting + Buddy + area buttons).
 * Dragging the panel's grabber up expands it (covering more of the frozen top);
 * dragging down collapses it back toward its resting height. Only the Steps list
 * inside the panel scrolls — the frozen top never scrolls, mirroring the framing
 * pattern of the Buddy tab's raised `BuddyInventory` sheet, but square-cornered
 * and full-bleed per the spec (Buddy's sheet is rounded/inset by comparison).
 *
 * Built on `react-native-gesture-handler` + `react-native-reanimated` (already
 * app deps, bundled in Expo Go). Presentational only — no business logic
 * (Engineering Bible §19); the parent supplies the collapsed/expanded heights and
 * gets a plain `View` for content.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

export function WeekStepsSheet({
  collapsedHeight,
  expandedHeight,
  children,
}: {
  /** The panel's resting (default) height in px. */
  collapsedHeight: number;
  /** The panel's height at full drag-up, covering more of the frozen top above it. */
  expandedHeight: number;
  children: ReactNode;
}) {
  const theme = useTheme();
  const dragRange = Math.max(0, expandedHeight - collapsedHeight);

  // 0 = resting (collapsed) height, dragRange = fully expanded. Dragging the
  // grabber up (negative translationY) grows the sheet; dragging down shrinks it.
  const extra = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = extra.value;
    })
    .onUpdate((e) => {
      extra.value = clamp(dragStart.value - e.translationY, 0, dragRange);
    })
    .onEnd((e) => {
      // Light velocity-aware settle: a fast upward flick snaps open, a fast
      // downward flick snaps closed; otherwise settle wherever released.
      const projected = extra.value - e.velocityY * 0.05;
      const target = projected > dragRange / 2 ? dragRange : 0;
      extra.value = withSpring(target, { damping: 18, stiffness: 160 });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    height: collapsedHeight + extra.value,
  }));

  return (
    <Animated.View
      // Anchored to the bottom of the (relatively-positioned) stage and grows
      // UPWARD as it expands, so the frozen top above it is always exposed
      // rather than the sheet stretching down from y:0 and covering it.
      style={[styles.panel, { backgroundColor: theme.cream }, sheetStyle]}>
      <GestureDetector gesture={pan}>
        <View style={styles.grabZone}>
          <View style={[styles.grabber, { backgroundColor: theme.hairline }]} />
        </View>
      </GestureDetector>

      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    // Full-width, SQUARE top corners (Home_Screen.md: "a full-width,
    // straight-cornered cream panel") — no borderRadius at all, unlike the
    // rounded Buddy-tab inventory sheet it otherwise mirrors the framing of.
    // Absolutely positioned, pinned to the stage's bottom edge, so it always
    // grows upward off the bottom rather than stretching down from the top and
    // covering the frozen top zone above it.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    shadowColor: '#283C1E',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  grabZone: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
