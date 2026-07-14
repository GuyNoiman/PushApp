/**
 * StepCard — a single Step card for Home's "Week's steps" panel (v14 mockup
 * screen-01): a coloured icon tile, the Step name, a "{Journey} · Phase x/y"
 * line, a thin progress bar, and a ⋯ (three-dots) menu affordance. Supports the
 * mockup's visual states where the data allows: an "Ends today" floating badge, a
 * green sealed/done wash for completed Steps, and a coral "Missed" tint.
 *
 * Reporting (Home_Screen.md "Finalized visual design", founder decision 2026-07-14):
 * swipe-right = done (calls `onCheckIn`); swipe-left = reschedule/defer (calls
 * `onReschedule`, which opens the Reschedule modal — the card springs back to rest
 * rather than flying off, since the modal is the action). A tap ⋯ (three-dots)
 * button opens a small menu with "Mark done" and "Reschedule" so nothing is
 * swipe-only. Built on `react-native-gesture-handler` + `react-native-reanimated`
 * (already app deps, bundled in Expo Go — no dev build needed).
 *
 * Presentational only: it reports the check-in/miss intent upward; all reward/
 * Buddy logic runs in the engines (Engineering Bible §19). The `item`/`onCheckIn`
 * props are kept stable for existing call sites; everything else is optional so
 * this upgrade never breaks a caller that hasn't opted in yet.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { journeyGlyph, type JourneyGlyphColor } from '@/components/journey/journeyView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import { useTheme } from '@/hooks/use-theme';

export type StepCardStatus = 'pending' | 'done' | 'missed';

// Distance a card must travel before a swipe commits to done/miss, and how far
// off-screen it flies once committed.
const SWIPE_COMMIT_DISTANCE = 96;
const SWIPE_FLY_DISTANCE = 420;

function tileColors(theme: ReturnType<typeof useTheme>, color: JourneyGlyphColor) {
  switch (color) {
    case 'gold':
      return { bg: theme.goldTint, fg: theme.goldStrong };
    case 'green':
      return { bg: theme.successTint, fg: theme.tealStrong };
    case 'coral':
      return { bg: theme.coralTint, fg: theme.coralStrong };
    case 'purple':
      return { bg: theme.purpleTint, fg: theme.purpleStrong };
    case 'teal':
    default:
      return { bg: theme.tealTint, fg: theme.tealStrong };
  }
}

export function StepCard({
  item,
  onCheckIn,
  onReschedule,
  phase,
  phases,
  progress,
  endsToday,
  status = 'pending',
  onOpenMenu,
}: {
  item: TodayStep;
  onCheckIn: (journeyId: string, stepId: string) => void;
  /** Swipe-left result — opens the "Reschedule / defer this Step" modal (founder decision 2026-07-14). Omit to disable the left-swipe (card springs back instead). */
  onReschedule?: (journeyId: string, stepId: string) => void;
  /** Current Phase (1-based), if known — shown as "Journey · Phase x/y". */
  phase?: number;
  /** Total Phases in the Step's Journey, if known. */
  phases?: number;
  /** 0..1 share of the Step's Journey complete — drives the thin progress bar. */
  progress?: number;
  /** Whether this Step's window ends today — shows the floating "Ends today" badge. */
  endsToday?: boolean;
  /** Visual state: pending (default) / done (green sealed wash) / missed (coral wash). */
  status?: StepCardStatus;
  /** Opens the ⋯ three-dots quick-action menu (Mark done / Reschedule). */
  onOpenMenu?: () => void;
}) {
  const theme = useTheme();
  const { step } = item;
  const glyph = journeyGlyph(item.journeyTitle || step.title);
  const tile = tileColors(theme, glyph.color);

  const done = status === 'done';
  const missed = status === 'missed';
  const reportable = !done && !missed;

  const cardBg = done ? theme.successTint : missed ? theme.dangerTint : theme.backgroundElement;
  const cardBorder = done ? theme.success : missed ? theme.danger : theme.hairline;
  const textColor = done ? theme.tealStrong : missed ? theme.danger : theme.text;
  const subColor = done ? theme.tealStrong : missed ? theme.danger : theme.textSecondary;

  const metaLine =
    phase !== undefined && phases !== undefined
      ? `${item.journeyTitle} · Phase ${phase}/${phases}`
      : item.journeyTitle;

  // ── Swipe-to-report ──────────────────────────────────────────────────────
  const translateX = useSharedValue(0);

  const commitCheckIn = () => onCheckIn(item.journeyId, step.id);
  const commitReschedule = () => onReschedule?.(item.journeyId, step.id);

  const pan = Gesture.Pan()
    .enabled(reportable)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_COMMIT_DISTANCE) {
        // Swipe right → done: fly off-screen right, then report.
        translateX.value = withTiming(SWIPE_FLY_DISTANCE, { duration: 180 }, () => {
          runOnJS(commitCheckIn)();
        });
      } else if (e.translationX < -SWIPE_COMMIT_DISTANCE && onReschedule) {
        // Swipe left → reschedule: the modal IS the action, so snap the card back
        // to rest (never fly off / leave a dead gap — item 3b) and open the modal.
        translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
        runOnJS(commitReschedule)();
      } else {
        // Under the threshold — spring back to rest.
        translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
      }
    });

  // A brief, elegant on-card celebration the moment a Step is checked in: a green
  // check "pops" over the card (Design_System §7 — tasteful, not childish). It fires
  // ONLY on the pending→done transition (not when an already-done card mounts/scrolls
  // into view), and snaps the card back to rest in case it flew off via swipe-right.
  const burst = useSharedValue(0);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      translateX.value = 0;
      burst.value = 0;
      burst.value = withSequence(
        withTiming(1, { duration: 240, easing: Easing.out(Easing.back(2)) }),
        withDelay(650, withTiming(0, { duration: 420 })),
      );
    }
    wasDone.current = done;
  }, [done, burst, translateX]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value,
    transform: [{ scale: 0.5 + burst.value * 0.6 }],
  }));
  // Green "done" hint fades in as the card is dragged right; a gold "reschedule"
  // hint as it's dragged left — a live preview of what letting go will do.
  const doneHintStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, translateX.value / SWIPE_COMMIT_DISTANCE)),
  }));
  const rescheduleHintStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -translateX.value / SWIPE_COMMIT_DISTANCE)),
  }));

  const card = (
    <Animated.View style={cardAnimatedStyle}>
      <ThemedView
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder },
          done && styles.doneCard,
        ]}>
        {reportable && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.swipeHint, styles.swipeHintRight, { backgroundColor: theme.successTint }, doneHintStyle]}>
              <Ionicons name="checkmark-circle" size={22} color={theme.tealStrong} />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.swipeHint, styles.swipeHintLeft, { backgroundColor: theme.goldTint }, rescheduleHintStyle]}>
              <Ionicons name="calendar-outline" size={20} color={theme.goldStrong} />
            </Animated.View>
          </>
        )}

        <View style={styles.body}>
          <View style={styles.snRow}>
            <View style={[styles.mini, { backgroundColor: tile.bg }]}>
              <Text style={[styles.miniGlyph, { color: tile.fg }]}>{glyph.icon}</Text>
            </View>
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={[styles.title, { color: textColor }]}>
              {step.title}
            </ThemedText>
          </View>
          <ThemedText type="small" numberOfLines={1} style={{ color: subColor }}>
            {missed ? `Missed · still time to catch it` : done ? `Completed · nice work` : metaLine}
          </ThemedText>

          {reportable && progress !== undefined && (
            <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: theme.teal },
                ]}
              />
            </View>
          )}
        </View>

        {/* The trailing control is a ⋯ three-dots button (founder decision
            2026-07-14): on a pending Step it opens a small menu (Mark done /
            Reschedule); the old coral check button is gone (quick-done now lives
            on swipe-right + the menu's "Mark done"). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${step.title}`}
          onPress={onOpenMenu}
          hitSlop={8}
          style={styles.dots}>
          <Text style={[styles.dotsGlyph, { color: theme.textMuted }]}>⋮</Text>
        </Pressable>
      </ThemedView>

      {/* Check-in celebration burst — pops on the moment of completion, then fades. */}
      <Animated.View pointerEvents="none" style={[styles.burst, burstStyle]}>
        <Ionicons name="checkmark-circle" size={44} color={theme.success} />
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={endsToday && styles.urgentWrap}>
      {endsToday && (
        <View style={[styles.dueTag, { backgroundColor: theme.goldTint }]}>
          <Text style={[styles.dueTagText, { color: theme.goldStrong }]}>⏱ Ends today</Text>
        </View>
      )}

      {reportable ? <GestureDetector gesture={pan}>{card}</GestureDetector> : card}
    </View>
  );
}

const styles = StyleSheet.create({
  urgentWrap: {
    // Room above the card for the floating "Ends today" tag to overlap.
    marginTop: 13,
  },
  dueTag: {
    position: 'absolute',
    top: -12,
    right: 8,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  dueTagText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 10.5,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    overflow: 'hidden',
  },
  doneCard: {
    // Completed Steps read as "sealed / done and out of the way": a green wash
    // (cardBg) + dimming, sunk to the bottom of the feed (Home_Screen.md). No DONE
    // ribbon/watermark — the wash + dim is enough to read as done (founder 2026-07-14).
    opacity: 0.72,
  },
  burst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  swipeHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  swipeHintRight: {
    right: 0,
  },
  swipeHintLeft: {
    left: 0,
  },
  body: {
    flex: 1,
    // minWidth:0 lets this flex child shrink below its content's intrinsic width
    // so the nowrap title truncates with an ellipsis instead of forcing the whole
    // card (and the scroll content) wider than the viewport (RN-web min-width:auto).
    minWidth: 0,
    gap: 4,
  },
  snRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  mini: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  miniGlyph: {
    fontSize: 13,
  },
  title: {
    flexShrink: 1,
  },
  bar: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  dots: {
    width: 26,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsGlyph: {
    fontSize: 18,
    lineHeight: 18,
  },
});
