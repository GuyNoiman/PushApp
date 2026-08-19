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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** How much time-pressure a pending Step carries — drives its icon tile. */
export type StepUrgency = 'calm' | 'warn' | 'urgent';

export function StepRow({
  icon,
  title,
  dream,
  meta,
  note,
  urgency,
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
  /** "Journey · Milestone N of M". */
  meta?: string;
  /** One short line about WHEN — carried from, belongs to, or done on. Always the caller's words. */
  note?: string;
  urgency: StepUrgency;
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
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  const completed = status === 'completed';
  // A completed Step drops out of the urgency scale entirely and settles on the calm end.
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
          { backgroundColor: theme.backgroundElement },
          completed && { backgroundColor: theme.tealWash },
          pullForward && !completed && [styles.pullForward, { borderColor: theme.hairline }],
          pressed && styles.pressed,
        ]}>
        <View style={[styles.tile, { backgroundColor: completed ? theme.tint : accentTint }]}>
          <Ionicons
            name={completed ? 'checkmark' : icon}
            size={18}
            color={completed ? onAccent : accentStrong}
          />
        </View>

        <View style={styles.main}>
          <ThemedText
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: completed ? theme.textSecondary : theme.text,
                fontFamily: displayFont(),
                fontSize: Math.round(16 * displayScale()),
              },
            ]}>
            {title}
          </ThemedText>
          <View style={styles.metaRow}>
            {dream ? (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.tealStrong }}>
                {dream}
              </ThemedText>
            ) : null}
            {meta ? (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.textMuted }}>
                {meta}
              </ThemedText>
            ) : null}
            {note ? (
              <ThemedText type="small" numberOfLines={1} style={{ color: theme.textMuted }}>
                {note}
              </ThemedText>
            ) : null}
          </View>
          {streakRole && !completed ? (
            <View style={styles.badgeRow}>
              <StepStreakBadge role={streakRole} />
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
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
  },
  // An offer from a later day: outlined and dashed, never filled like a Step the day is asking for.
  pullForward: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
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
  // The meta line wraps rather than truncating the Dream away: on a narrow phone in Hebrew, a Dream
  // title plus a Milestone position does not fit one line, and the Dream is the part worth keeping.
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
