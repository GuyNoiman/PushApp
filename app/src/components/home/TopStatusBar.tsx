/**
 * TopStatusBar — the header strip pinned to the very top of Home (revised 2026-08-07,
 * third founder round: "drop the text labels, keep icon + number, and bring the XP
 * progress bar back into the level"). The at-a-glance stats read as pure ICON + NUMBER
 * (no captions), spread across the row:
 *
 *   [ribbon] Lvl · ▓▓▓▓░░ · xpIntoLevel / xpForNextLevel   │  [flame] streak
 *
 * COINS were dropped from this strip in the initial version (Decision Log D29) — the engine keeps
 * accruing them, but with the Shop archived there is no sink to show. Re-add the coin Stat when
 * Coins get a real role.
 *
 * THE MAIL BUTTON (2026-08-20) sits at the end of the strip, carrying the number of things actually
 * waiting. The Inbox left the tab bar so the fifth slot could become Tools, and this is where it
 * went — the founder picked it from rendered options, and it is the placement people already know
 * from Instagram: the same spot on every screen position, with the count on it. The badge is hidden
 * at zero rather than showing a "0", because a badge that is always there stops meaning anything.
 *
 * The LEVEL cluster carries a thin TURQUOISE progress bar to the next level (the old
 * ResourceBar behaviour) plus a small tabular readout, so the eye reads "how far to
 * the next level" at a glance. The bar wears its own tinted ground under a hairline;
 * amber stays reserved for urgency (only the streak flame). Presentational only.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A compact icon + number stat (coins, streak) — no caption. */
function Stat({
  icon,
  value,
  iconColor,
  valueColor,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  iconColor: string;
  valueColor: string;
  label: string;
}) {
  const { t } = useTranslation('home');
  return (
    <View style={styles.stat} accessibilityLabel={t('status.stat', { value, label })}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <ThemedText type="smallBold" style={[styles.value, { color: valueColor }]}>
        {value}
      </ThemedText>
    </View>
  );
}

export function TopStatusBar({
  level,
  xpIntoLevel,
  xpForNextLevel,
  streak,
  waiting = 0,
  onOpenInbox,
  activity = 0,
  onOpenNotifications,
}: {
  level: number;
  /** XP earned inside the current level — fills the progress bar. */
  xpIntoLevel: number;
  /** XP needed to reach the next level — the bar's full width. */
  xpForNextLevel: number;
  streak: number;
  /** How many things are waiting in the Inbox — drives the badge. Zero hides it. */
  waiting?: number;
  /** Opens the Inbox. Omitted only in tests/stories that render the strip alone. */
  onOpenInbox?: () => void;
  /**
   * How many NEW things are in the Notification Center — what other people did. A separate count
   * from `waiting`, and deliberately so: the bell and the mail must never both claim the same
   * object, or the two numbers stop meaning anything (Notification Center PRD §4.1).
   */
  activity?: number;
  /** Opens the Notification Center. */
  onOpenNotifications?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('home');
  const pct =
    xpForNextLevel > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpForNextLevel)) : 0;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.backgroundSelected, borderBottomColor: theme.hairline },
      ]}>
      {/* LEVEL — number + progress-to-next-level bar + tabular readout. */}
      <View
        style={styles.level}
        accessibilityLabel={t('status.level', { level, into: xpIntoLevel, total: xpForNextLevel })}>
        <Ionicons name="ribbon-outline" size={16} color={theme.textSecondary} />
        <ThemedText type="smallBold" style={[styles.value, { color: theme.text }]}>
          {level}
        </ThemedText>
        {/* The bar alone, without the "250 / 400" readout beside it.
            The strip carries five things now that the bell has joined it, and on a phone that read
            as clutter (founder, 2026-08-24). The numbers were the most droppable: the bar already
            says how far along the level is, the exact figures live on the profile, and the SPOKEN
            label above still carries them for a screen reader — so nothing was lost except width. */}
        <View style={[styles.track, { backgroundColor: theme.hairline }]}>
          <View style={[styles.fill, { backgroundColor: theme.tint, width: `${pct * 100}%` }]} />
        </View>
      </View>

      {/* COINS — HIDDEN in the initial version (Decision Log D29): the RewardEngine keeps accruing
          Coins on `buddy.coins`, but with the Shop archived there is no sink, so we don't surface
          them yet. Re-add the Stat here (+ its divider) when Coins get a real role. */}
      <Stat
        icon="flame"
        value={streak}
        iconColor={theme.gold}
        valueColor={theme.text}
        label={t('status.streak')}
      />

      {onOpenNotifications ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activity > 0 ? t('status.bellNew', { count: activity }) : t('status.bell')
          }
          onPress={onOpenNotifications}
          hitSlop={8}
          style={({ pressed }) => [
            styles.mail,
            { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="notifications-outline" size={16} color={theme.text} />
          {activity > 0 ? (
            <View
              style={[styles.badge, { backgroundColor: theme.tint, borderColor: theme.backgroundSelected }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <ThemedText type="smallBold" style={[styles.badgeText, { color: theme.background }]}>
                {activity > 99 ? '99+' : activity}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {onOpenInbox ? (
        <Pressable
          accessibilityRole="button"
          // The count is IN the label, not only on the badge: a screen reader must hear how much is
          // waiting, not just that there is a button here.
          accessibilityLabel={
            waiting > 0 ? t('status.inboxWaiting', { count: waiting }) : t('status.inbox')
          }
          onPress={onOpenInbox}
          hitSlop={8}
          style={({ pressed }) => [
            styles.mail,
            { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="mail-outline" size={16} color={theme.text} />
          {waiting > 0 ? (
            <View
              style={[styles.badge, { backgroundColor: theme.tint, borderColor: theme.backgroundSelected }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <ThemedText type="smallBold" style={[styles.badgeText, { color: theme.background }]}>
                {waiting > 9 ? '9+' : waiting}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `end`, not `right`: the badge follows the writing direction, so it stays on the outer corner in
  // Hebrew instead of drifting over the icon.
  badge: {
    position: 'absolute',
    top: -4,
    end: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.7,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    // Tighter than the old three-step gap: five clusters at that spacing pushed the two round
    // buttons into each other's edge on a narrow phone.
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // The level cluster takes the free width so its progress bar can stretch.
  level: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  // A compact meter: still a FIXED short track rather than one that stretches across the
  // level cluster's free space, but twice the width it was shrunk to on 2026-08-09 (founder,
  // device pass 2026-08-17) — enough to read progress at a glance while the streak and level
  // keep their room and the strip keeps its calm proportions.
  track: {
    // Stretches into the width the numeric readout used to occupy, so progress is EASIER to read
    // than it was before, not harder.
    flex: 1,
    minWidth: 56,
    maxWidth: 132,
    height: 5,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  value: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
  },
});
