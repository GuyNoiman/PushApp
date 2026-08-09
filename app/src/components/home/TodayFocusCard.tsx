/**
 * TodayFocusCard — one card in Home's "Today's focus" STACK (revised 2026-08-07,
 * third founder round: "show the next Step of every active Journey, not just one, as
 * a small stack of urgency-coloured cards"). Each card renders a pending Step:
 *
 *   - a Step title + the Journey/Milestone meta beneath it,
 *   - a thin TURQUOISE progress bar showing how far the parent Journey has come,
 *   - a left accent edge + icon-tile wash that INTENSIFY as the day runs out — calm
 *     turquoise → amber ('warn') → red ('urgent') — so time-pressure reads at a glance.
 *
 * The old "Your focus right now" chip is GONE — the stack no longer needs a
 * single-hero caption. Tapping a card (or the ⋯) opens the report sheet; it never
 * instant-completes. Presentational only — the caller supplies title, meta,
 * progress, urgency, and the press handler.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { SwipeableStepRow } from '@/components/home/SwipeableStepRow';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** How much time-pressure a pending Step carries — drives its accent. */
export type StepUrgency = 'calm' | 'warn' | 'urgent';

// The card's corner radius, shared with the swipe-reveal panels behind it.
const CARD_RADIUS = Radius.card + 2;

export function TodayFocusCard({
  icon,
  title,
  meta,
  progress,
  urgency,
  onPress,
  onDone,
  onPostpone,
  onLetGo,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  /** Parent Journey completion in [0,1] — drives the turquoise progress bar. */
  progress: number;
  urgency: StepUrgency;
  /** Opens the report sheet (Done · Partial · Couldn't · Postpone · Reschedule). */
  onPress: () => void;
  /** Swipe-right → report done (fires Home's confetti). */
  onDone: () => void;
  /** Swipe-left Postpone button. */
  onPostpone: () => void;
  /** Swipe-left Let-go button. */
  onLetGo: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');

  // The edge + icon-tile share the urgency accent and intensify with it.
  const accent =
    urgency === 'urgent' ? theme.danger : urgency === 'warn' ? theme.gold : theme.tint;
  const accentTint =
    urgency === 'urgent'
      ? theme.dangerTint
      : urgency === 'warn'
        ? theme.goldTint
        : theme.tealTint;
  const accentStrong =
    urgency === 'urgent' ? theme.danger : urgency === 'warn' ? theme.goldStrong : theme.tealStrong;
  // The accent edge widens as the day runs out, so pressure reads at a glance.
  const edgeWidth = urgency === 'urgent' ? 6 : urgency === 'warn' ? 5 : 4;
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <SwipeableStepRow
      onDone={onDone}
      onPostpone={onPostpone}
      onLetGo={onLetGo}
      borderRadius={CARD_RADIUS}
      containerStyle={styles.swipe}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('step.report', { title })}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.hairline, shadowColor: '#000' },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.edge, { backgroundColor: accent, width: edgeWidth }]} />

        <View style={styles.head}>
          <View style={[styles.tile, { backgroundColor: accentTint }]}>
            <Ionicons name={icon} size={20} color={accentStrong} />
          </View>
          <View style={styles.main}>
            <ThemedText numberOfLines={2} style={[styles.title, { color: theme.text }]}>
              {title}
            </ThemedText>
            {meta.length > 0 && (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
                {meta}
              </ThemedText>
            )}
          </View>
          <View style={styles.dots} accessibilityElementsHidden>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.fill, { backgroundColor: theme.tint, width: `${pct}%` }]} />
          </View>
          <ThemedText type="smallBold" style={[styles.pct, { color: theme.textSecondary }]}>
            {pct}%
          </ThemedText>
        </View>
      </Pressable>
    </SwipeableStepRow>
  );
}

const styles = StyleSheet.create({
  // The swipe wrapper carries the card's outer margin so the reveal panels align to
  // the card's edges (the card itself is now flush inside the swipeable).
  swipe: {
    marginHorizontal: Spacing.four,
  },
  card: {
    padding: Spacing.three,
    paddingStart: Spacing.three + Spacing.one,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    gap: Spacing.two,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  edge: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  dots: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  pct: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.85,
  },
});
