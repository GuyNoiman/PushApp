/**
 * SwipeableStepRow — the shared iPhone-Messages-style swipe wrapper for a Step row on
 * Home (2026-08-07 founder round: "swipe a step like an iMessage — right to complete,
 * left to reveal round action buttons"). It wraps a Step card (the Today's-focus card
 * and each This-week card reuse the SAME wrapper) and layers two reveal panels behind
 * it:
 *
 *   - Swipe RIGHT → a calm green/teal "Done" wash with a checkmark slides in from the
 *     left; releasing past the threshold (or a full swipe) reports the Step DONE via
 *     `onDone` — the SAME path the ⋯ menu's Done uses, so the screen's confetti fires.
 *   - Swipe LEFT → two round action buttons appear (like the iOS Messages screenshot):
 *       · Postpone — a round amber button (clock) → `onPostpone`
 *       · Let go   — a round red button (a gentle heart-off) → `onLetGo`, framed as a
 *         no-shame let-go, not a punishment.
 *
 * The row settles back to rest after any action. The ⋯ menu still carries the fuller
 * options (Partial / Reschedule) — swipe is only the quick path for the three common
 * actions. Presentational only (Engineering Bible §19): every handler is a facade call
 * threaded down from Home; this file holds no business logic.
 *
 * Built on `ReanimatedSwipeable` from `react-native-gesture-handler` (the current,
 * non-deprecated Swipeable — same reanimated stack the app already uses). NOTE (web):
 * gesture-handler's Swipeable is tuned for native; the founder tests on device.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// How far the row must be dragged before a release commits. Right (Done) asks for a
// slightly longer pull so a completion is always deliberate; left (reveal) opens sooner.
const DONE_ACTION_WIDTH = 104;
const DONE_THRESHOLD = 60;
const ACTIONS_THRESHOLD = 44;
const ROUND_BTN = 46;

// A near-white glyph reads cleanly on the saturated round buttons in both themes.
const ON_ACCENT = '#FFFFFF';

/** The green/teal "Done" wash revealed while swiping right; the check pops with drag. */
function DoneReveal({
  progress,
  borderRadius,
  background,
}: {
  progress: SharedValue<number>;
  borderRadius: number;
  background: string;
}) {
  const iconStyle = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return { opacity: Math.min(1, p * 1.5), transform: [{ scale: 0.7 + p * 0.3 }] };
  });

  return (
    <View style={[styles.doneReveal, { backgroundColor: background, borderRadius }]}>
      <Animated.View style={[styles.doneInner, iconStyle]}>
        <Ionicons name="checkmark-circle" size={26} color={ON_ACCENT} />
        <ThemedText style={styles.doneLabel}>Done</ThemedText>
      </Animated.View>
    </View>
  );
}

/** The two round buttons revealed while swiping left — Postpone (amber) + Let go (red). */
function RightActions({
  progress,
  theme,
  onPostpone,
  onLetGo,
}: {
  progress: SharedValue<number>;
  theme: ReturnType<typeof useTheme>;
  onPostpone: () => void;
  onLetGo: () => void;
}) {
  const enter = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return { opacity: p, transform: [{ translateX: (1 - p) * 28 }] };
  });

  return (
    <Animated.View style={[styles.rightActions, enter]}>
      <View style={styles.action}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Postpone this step"
          onPress={onPostpone}
          style={({ pressed }) => [
            styles.roundBtn,
            { backgroundColor: theme.gold },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="time-outline" size={22} color={ON_ACCENT} />
        </Pressable>
        <ThemedText style={[styles.actionLabel, { color: theme.textSecondary }]}>Postpone</ThemedText>
      </View>

      <View style={styles.action}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Let this step go, no shame"
          onPress={onLetGo}
          style={({ pressed }) => [
            styles.roundBtn,
            { backgroundColor: theme.danger },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="heart-dislike-outline" size={22} color={ON_ACCENT} />
        </Pressable>
        <ThemedText style={[styles.actionLabel, { color: theme.textSecondary }]}>Let go</ThemedText>
      </View>
    </Animated.View>
  );
}

export function SwipeableStepRow({
  children,
  onDone,
  onPostpone,
  onLetGo,
  enabled = true,
  borderRadius = Radius.card,
  containerStyle,
}: {
  children: React.ReactNode;
  /** Swipe-right commit → report the Step done (routes through Home's Done + confetti). */
  onDone: () => void;
  /** Swipe-left Postpone button → the existing postpone facade path. */
  onPostpone: () => void;
  /** Swipe-left Let-go button → the existing no-shame let-go facade path. */
  onLetGo: () => void;
  /** When false the row renders plain (e.g. an already-done Step is not swipeable). */
  enabled?: boolean;
  /** Corner radius for the reveal panels — match the wrapped card. */
  borderRadius?: number;
  /** Layout for the swipe container (e.g. the card's horizontal margin or flex). */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const ref = useRef<SwipeableMethods | null>(null);

  if (!enabled) return <>{children}</>;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      leftThreshold={DONE_THRESHOLD}
      rightThreshold={ACTIONS_THRESHOLD}
      overshootRight={false}
      containerStyle={containerStyle}
      renderLeftActions={(progress) => (
        <DoneReveal progress={progress} borderRadius={borderRadius} background={theme.success} />
      )}
      renderRightActions={(progress, _translation, methods) => (
        <RightActions
          progress={progress}
          theme={theme}
          onPostpone={() => {
            onPostpone();
            methods.close();
          }}
          onLetGo={() => {
            onLetGo();
            methods.close();
          }}
        />
      )}
      onSwipeableWillOpen={(direction) => {
        // Left actions open on a swipe-RIGHT → that's the Done commit. Fire the shared
        // Done path (confetti pops on Home) and settle the row back to rest.
        if (direction === SwipeDirection.LEFT) {
          onDone();
          ref.current?.close();
        }
      }}>
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  doneReveal: {
    flex: 1,
    width: DONE_ACTION_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: Spacing.four,
  },
  doneInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  doneLabel: {
    color: ON_ACCENT,
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  action: {
    alignItems: 'center',
    gap: 4,
  },
  roundBtn: {
    width: ROUND_BTN,
    height: ROUND_BTN,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.headingMedium,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.7,
  },
});
