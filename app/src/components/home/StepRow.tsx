/**
 * StepRow — one Step, as a ROW inside the day's card (2026-08-19 redesign).
 *
 * It replaces `TodayFocusCard`, which was a tall standalone card per Step. The founder's design
 * direction puts the day's Steps INSIDE one surface, as rows, so that a day reads as a day rather
 * than as a stack of competing cards — and so that four Steps fit on a screen where two used to.
 *
 * WHAT A COMPACT ROW MUST STILL CARRY, because each of these is a decision and not decoration:
 *  - the **Dream** the Step ultimately serves, since the list is flat and the grouping went onto
 *    the row itself;
 *  - the **streak role** — "recommended today" / "needed today" — which is the app finally showing
 *    the rule it already applies (D26.4 / Open Work 1.1);
 *  - the **reporting status** (partial / couldn't), because a partial is real work and must never
 *    read as nothing;
 *  - a **note** about WHEN: the day a missed Step came from, the day a pulled-forward Step belongs
 *    to, or the day it was actually done.
 * They live on ONE meta line under the title, in that order, so the row stays short when a Step has
 * nothing to say and grows only when it does.
 *
 * WHAT IT DROPPED: the parent Journey's progress bar. In a row it was a second, unrelated number
 * competing with the Step's own state — and progress now has a home of its own in the Journeys
 * carousel, where a whole Journey is the subject.
 *
 * A SETTLED ROW keeps the founder's chosen treatment from the card version (2026-08-19, "option
 * ד1"): the teal wash and the check tile. The oversized watermark check does not come with it — it
 * was designed for a tall card and would be texture across a 64px row rather than behind it.
 *
 * THE LIGHTNESS PASS (founder, 2026-08-19: *"it still feels a bit heavy — I want it to breathe, to
 * be lighter and less crowded"*). Every removal below is a thing that was competing for attention
 * rather than earning it:
 *  - the row has NO fill and NO border of its own. It sits on the page, separated by air and a
 *    hairline, instead of being a small card inside a bigger card;
 *  - the icon lost its coloured tile and is now just the glyph, so the colour still carries urgency
 *    without a second shape around it;
 *  - the meta line is the DREAM only. The Journey and the Milestone position moved out — they are
 *    what the Journeys card is for, and repeating them under every Step was the same fact three
 *    times on one screen;
 *  - `recommended` is quiet TEXT and only `binding` keeps a pill. A badge on every row is a badge
 *    that says nothing; a badge on the one that binds the week is information.
 *
 * Presentational only. Swipe (Done / Postpone / Let go) is retired on a completed or locked row,
 * exactly as before; the tap path stays open so a mistaken report can be changed.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { StepStatusChip } from '@/components/home/StepStatusChip';
import { StepStreakBadge } from '@/components/home/StepStreakBadge';
import { SwipeableStepRow } from '@/components/home/SwipeableStepRow';
import { ThemedText } from '@/components/themed-text';
import { displayFont, displayScale } from '@/constants/displayFont';
import { Radius, Spacing } from '@/constants/theme';
import type { StepStatus } from '@/core/status/stepStatus';
import type { StreakRole } from '@/core/util/urgency';
import { useTheme } from '@/hooks/use-theme';

export function StepRow({
  icon,
  title,
  dream,
  note,
  status,
  streakRole,
  pullForward = false,
  locked = false,
  onPress,
  onDone,
  onPostpone,
  onLetGo,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** The Dream this Step's Journey serves — the grouping, moved onto the row. */
  dream?: string;
  /** One short line about WHEN — carried from, belongs to, or done on. Always the caller's words. */
  note?: string;
  status: StepStatus;
  /** `recommended` while the week has slack, `binding` once it does not. Today's list only. */
  streakRole?: StreakRole;
  /** A Step of a LATER day, offered early: dashed, and it never claims the day's own attention. */
  pullForward?: boolean;
  /** True in a closed (past) week — swipe report actions are disabled (D36). */
  locked?: boolean;
  onPress: () => void;
  onDone: () => void;
  onPostpone: () => void;
  onLetGo: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const completed = status === 'completed';
  /**
   * THE GLYPH IS CALM, ALWAYS (founder, 2026-08-19, on the web build). It used to take an urgency
   * colour from the hour of the day, which meant that after eight in the evening every icon in the
   * list turned red — an alarm about nothing, in an app whose promise is no penalty for a life that
   * got in the way. And it was saying, badly, what the streak badge now says precisely: whether
   * missing this Step costs anything. One signal, in words, in one place.
   */
  const glyphColor = theme.tealStrong;

  return (
    <SwipeableStepRow
      enabled={!locked && !completed}
      onDone={onDone}
      onPostpone={onPostpone}
      onLetGo={onLetGo}
      borderRadius={Radius.card}
      containerStyle={styles.swipe}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={completed ? t('step.doneA11y', { title }) : t('step.report', { title })}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pullForward && !completed && [styles.pullForward, { borderColor: theme.hairline }],
          pressed && styles.pressed,
        ]}>
        <View style={styles.glyph}>
          <Ionicons
            name={completed ? 'checkmark-circle' : icon}
            size={completed ? 22 : 20}
            color={completed ? theme.tint : glyphColor}
          />
        </View>

        <View style={styles.main}>
          <ThemedText
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: completed ? theme.textMuted : theme.text,
                fontFamily: displayFont(),
                fontSize: Math.round(16 * displayScale()),
              },
            ]}>
            {title}
          </ThemedText>
          <View style={styles.metaRow}>
            {dream ? (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.textMuted }}>
                {dream}
              </ThemedText>
            ) : null}
            {note ? (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.textMuted }}>
                {note}
              </ThemedText>
            ) : null}
            {/* The calm side of the streak rule is a whisper, not a badge: it says "missing this
                costs nothing" and must never look like something being asked of you. */}
            {streakRole === 'recommended' && !completed ? (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.tealStrong }}>
                {t('streakRole.recommended.label')}
              </ThemedText>
            ) : null}
          </View>
          {streakRole === 'binding' && !completed ? (
            <View style={styles.badgeRow}>
              <StepStreakBadge role="binding" />
            </View>
          ) : null}
        </View>

        <View style={styles.trailing}>
          <StepStatusChip status={status} />
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.textMuted} />
        </View>
      </Pressable>
    </SwipeableStepRow>
  );
}

const styles = StyleSheet.create({
  swipe: {
    marginBottom: Spacing.one,
  },
  // No fill, no border: a Step is a line on the page. Generous vertical padding is what separates
  // one from the next, because air separates more calmly than a box does.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.card,
  },
  // An offer from a later day: outlined and dashed, never filled like a Step the day is asking for.
  pullForward: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  // A fixed box so every title starts at the same x whether the glyph is a check or a walk icon.
  glyph: {
    width: 24,
    alignItems: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.one,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
