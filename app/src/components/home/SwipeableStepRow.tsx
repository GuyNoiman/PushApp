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
 *     This is the ONLY gesture that reports anything; the other direction decides nothing
 *     on its own (device QA 2026-08-17 — see `doneSwipeDirection`).
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
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

// How far the row must be dragged before a release commits. Right (Done) asks for a
// slightly longer pull so a completion is always deliberate; left (reveal) opens sooner.
const DONE_ACTION_WIDTH = 104;
const DONE_THRESHOLD = 60;
const ACTIONS_THRESHOLD = 44;
const ROUND_BTN = 46;

// A near-white glyph reads cleanly on the saturated round buttons in both themes.
const ON_ACCENT = '#FFFFFF';

/**
 * The drag direction whose release COMMITS Done, for the active layout direction.
 *
 * `ReanimatedSwipeable` reports the direction the ROW MOVED — not which panel appeared.
 * Dragging RIGHT is exactly what uncovers `renderLeftActions`, and dragging LEFT uncovers
 * `renderRightActions` (gesture-handler 2.28, `dispatchImmediateEvents`:
 * `toValue > 0 ? SwipeDirection.RIGHT : SwipeDirection.LEFT`). We put the Done wash on the
 * LEFT panel in LTR and on the RIGHT panel under RTL, so the drag that commits Done is
 * RIGHT in LTR and LEFT under RTL.
 *
 * Reading that backwards is what made a swipe toward the Postpone / Let-go buttons report a
 * Step DONE while the green wash committed nothing (device QA 2026-08-17). Exported so the
 * mapping is pinned by a test in BOTH directions rather than re-derived by eye.
 */
export function doneSwipeDirection(rtl: boolean): SwipeDirection {
  return rtl ? SwipeDirection.LEFT : SwipeDirection.RIGHT;
}

/**
 * The green/teal "Done" wash revealed while swiping right; the check pops with drag. It exists ONLY
 * for the duration of the gesture — it is a preview of the commit, never the resting state of a
 * completed Step. Once the report lands the caller renders the row non-swipeable (`enabled={false}`),
 * which unmounts this panel entirely and leaves the Step's own card — title, Journey, Milestone —
 * on screen with its completed chip (device QA 2026-08-17).
 */
function DoneReveal({
  progress,
  borderRadius,
  background,
}: {
  progress: SharedValue<number>;
  borderRadius: number;
  background: string;
}) {
  const { t } = useTranslation('home');
  const iconStyle = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return { opacity: Math.min(1, p * 1.5), transform: [{ scale: 0.7 + p * 0.3 }] };
  });

  return (
    <View style={[styles.doneReveal, { backgroundColor: background, borderRadius }]}>
      <Animated.View style={[styles.doneInner, iconStyle]}>
        <Ionicons name="checkmark-circle" size={26} color={ON_ACCENT} />
        <ThemedText style={styles.doneLabel}>{t('done', { ns: 'common' })}</ThemedText>
      </Animated.View>
    </View>
  );
}

/** The two round buttons revealed while swiping left — Postpone (amber) + Let go (red). */
function RightActions({
  progress,
  theme,
  rtl,
  onPostpone,
  onLetGo,
}: {
  progress: SharedValue<number>;
  theme: ReturnType<typeof useTheme>;
  /** Under RTL the buttons reveal from the opposite side, so the entrance slide flips. */
  rtl: boolean;
  onPostpone: () => void;
  onLetGo: () => void;
}) {
  const { t } = useTranslation('home');
  // The slide-in direction is a plain captured number so the worklet stays direction-aware
  // without reading I18nManager off the UI thread.
  const dir = rtl ? -1 : 1;
  const enter = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return { opacity: p, transform: [{ translateX: (1 - p) * 28 * dir }] };
  });

  return (
    <Animated.View style={[styles.rightActions, enter]}>
      <View style={styles.action}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('swipe.postponeA11y')}
          onPress={onPostpone}
          style={({ pressed }) => [
            styles.roundBtn,
            { backgroundColor: theme.gold },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="time-outline" size={22} color={ON_ACCENT} />
        </Pressable>
        <ThemedText style={[styles.actionLabel, { color: theme.textSecondary }]}>
          {t('postpone', { ns: 'common' })}
        </ThemedText>
      </View>

      <View style={styles.action}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('swipe.letGoA11y')}
          onPress={onLetGo}
          style={({ pressed }) => [
            styles.roundBtn,
            { backgroundColor: theme.danger },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="heart-dislike-outline" size={22} color={ON_ACCENT} />
        </Pressable>
        <ThemedText style={[styles.actionLabel, { color: theme.textSecondary }]}>
          {t('letGo', { ns: 'common' })}
        </ThemedText>
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

  // A non-swipeable row (already reported, or a closed week) still renders inside the SAME
  // container the swipeable would have used, so it keeps the card's margins and comes out
  // exactly as wide as every other row. Returning the children bare dropped `containerStyle`
  // and let a completed card grow to full bleed (device QA 2026-08-17).
  if (!enabled) return <View style={containerStyle}>{children}</View>;

  // RTL-aware direction: the gesture encodes "swipe toward completion = Done". In LTR
  // the Done wash sits on the START (left) side and is revealed by dragging the card
  // toward the END (a swipe right, which opens the LEFT panel); the round Postpone /
  // Let-go buttons sit on the END (right) side. Under RTL the whole axis mirrors, so we
  // SWAP which physical side renders which panel (and the matching thresholds + the
  // drag direction that commits Done) to keep "swipe toward the start edge = Done"
  // consistent. NOTE: I18nManager.forceRTL is a no-op on web, so this mirroring is
  // code-level and must be device-verified by the founder.
  const rtl = isRTL();

  const renderDone = (progress: SharedValue<number>) => (
    <DoneReveal progress={progress} borderRadius={borderRadius} background={theme.success} />
  );
  const renderButtons = (
    progress: SharedValue<number>,
    _translation: SharedValue<number>,
    methods: SwipeableMethods,
  ) => (
    <RightActions
      progress={progress}
      theme={theme}
      rtl={rtl}
      onPostpone={() => {
        onPostpone();
        methods.close();
      }}
      onLetGo={() => {
        onLetGo();
        methods.close();
      }}
    />
  );

  // The drag whose release commits Done — see `doneSwipeDirection` for why it is the drag
  // direction and not the panel side. Every OTHER direction must leave the Step untouched.
  const doneDirection = doneSwipeDirection(rtl);

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      // Done keeps its longer, deliberate pull; the buttons open sooner — thresholds
      // follow the Done wash to whichever side it lives on.
      leftThreshold={rtl ? ACTIONS_THRESHOLD : DONE_THRESHOLD}
      rightThreshold={rtl ? DONE_THRESHOLD : ACTIONS_THRESHOLD}
      // No overshoot on the round-buttons side (their reveal is a fixed width).
      overshootLeft={rtl ? false : undefined}
      overshootRight={rtl ? undefined : false}
      containerStyle={containerStyle}
      renderLeftActions={rtl ? renderButtons : renderDone}
      renderRightActions={rtl ? renderDone : renderButtons}
      onSwipeableWillOpen={(direction) => {
        // ONLY the Done wash's own drag commits: the opposite drag reveals the round
        // Postpone / Let-go buttons and must never report a Step done — the user is
        // reaching for a button there, and nothing is decided until they press one.
        if (direction === doneDirection) {
          onDone();
          // Ask twice, deliberately. A `close()` issued WHILE the open animation is being
          // started can be swallowed by it on device, which leaves the card parked off to
          // the side and only the green wash on screen (device QA 2026-08-17). Repeating on
          // the next frame guarantees the row returns to rest even then. Harmless when the
          // first close already took, and a no-op once the row has unmounted.
          ref.current?.close();
          requestAnimationFrame(() => ref.current?.close());
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
    // flex-start + paddingStart keep the check flush to the card's revealed (leading)
    // edge in both directions.
    justifyContent: 'flex-start',
    paddingStart: Spacing.four,
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
