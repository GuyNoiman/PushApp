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
 * A Step reported COMPLETED stays right here (device QA 2026-08-17) and keeps its
 * whole identity — title, Journey, Milestone, the Journey bar it just moved, at exactly
 * the same width as every other card. It only SETTLES: the urgency accent drops to calm
 * turquoise, the tile becomes a check, the ink softens and the lift goes flat. No status
 * pill: the check and the settled card carry the meaning, so the pill was only repeating
 * them (founder, device pass 2026-08-17). Seeing what you finished sitting beside what is
 * still open is the honest picture of a day — and quietly, it is the reward. No celebration
 * lives here (the report already fires the confetti, and the ceremony belongs to finishing a
 * Journey — D42). A completed card is no longer swipeable, but it is still tappable, so a
 * mistaken report can be changed. A PARTIAL or a couldn't stays fully open and actionable and
 * keeps its chip — a partial is real work and must never read as nothing.
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
import { StepStatusChip } from '@/components/home/StepStatusChip';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { StepStatus } from '@/core/status/stepStatus';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  status,
  locked = false,
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
  /**
   * The Step's derived reporting status (D36) — shows a calm Completed / Partial / Not-completed
   * chip, and `completed` additionally settles the whole card (calm accent, check tile, no lift).
   */
  status: StepStatus;
  /** True when the Step sits in a closed (past) week — swipe report actions are disabled (D36). */
  locked?: boolean;
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
  // A near-white/near-black glyph reads cleanly on the filled completed tile in both themes —
  // the same pairing the done row in "This week" uses, so the two surfaces stay one vocabulary.
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  // A completed Step is the opposite of urgent: it drops OUT of the urgency scale entirely
  // (never amber, never red) and settles on the calm turquoise end.
  const completed = status === 'completed';

  // The edge + icon-tile share the urgency accent and intensify with it.
  const accent =
    completed || urgency === 'calm' ? theme.tint : urgency === 'urgent' ? theme.danger : theme.gold;
  const accentTint =
    completed || urgency === 'calm'
      ? theme.tealTint
      : urgency === 'urgent'
        ? theme.dangerTint
        : theme.goldTint;
  const accentStrong =
    completed || urgency === 'calm'
      ? theme.tealStrong
      : urgency === 'urgent'
        ? theme.danger
        : theme.goldStrong;
  // The accent edge widens as the day runs out, so pressure reads at a glance.
  const edgeWidth = completed ? 4 : urgency === 'urgent' ? 6 : urgency === 'warn' ? 5 : 4;
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <SwipeableStepRow
      // A reported Step is settled: swipe (Done / Postpone / Let go) is retired on it, exactly
      // as a closed week retires it. The tap path stays open so the report can be changed.
      enabled={!locked && !completed}
      onDone={onDone}
      onPostpone={onPostpone}
      onLetGo={onLetGo}
      borderRadius={CARD_RADIUS}
      containerStyle={styles.swipe}>
      <Pressable
        accessibilityRole="button"
        // State is announced, never left to colour: a completed card says so in its label.
        accessibilityLabel={
          completed ? t('step.doneA11y', { title }) : t('step.report', { title })
        }
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.hairline, shadowColor: '#000' },
          // Settled, not shouting: the card stops lifting off the page once it is done.
          completed && styles.completedCard,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.edge, { backgroundColor: accent, width: edgeWidth }]} />

        <View style={styles.head}>
          <View
            style={[styles.tile, { backgroundColor: completed ? theme.tint : accentTint }]}>
            <Ionicons
              name={completed ? 'checkmark' : icon}
              size={20}
              color={completed ? onAccent : accentStrong}
            />
          </View>
          <View style={styles.main}>
            <ThemedText
              numberOfLines={2}
              style={[styles.title, { color: completed ? theme.textSecondary : theme.text }]}>
              {title}
            </ThemedText>
            {meta.length > 0 && (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
                {meta}
              </ThemedText>
            )}
          </View>
          {/* Partial and couldn't wear their chip — it is the only place those outcomes are
              written, and a partial is real work. A completed Step renders no chip at all (the
              chip itself decides that): the check tile and the settled card already say it. */}
          <StepStatusChip status={status} />
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
  // A finished Step lies flat on the page: no shadow, no lift. Nothing is muted away — every
  // detail stays readable — it simply stops competing with what is still open.
  completedCard: {
    shadowOpacity: 0,
    elevation: 0,
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
