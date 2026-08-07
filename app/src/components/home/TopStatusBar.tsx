/**
 * TopStatusBar — the header strip pinned to the very top of Home (revised 2026-08-07,
 * third founder round: "drop the text labels, keep icon + number, and bring the XP
 * progress bar back into the level"). The three at-a-glance stats now read as pure
 * ICON + NUMBER (no "LEVEL/COINS/STREAK" captions), spread across the row:
 *
 *   [ribbon] Lvl · ▓▓▓▓░░ · xpIntoLevel / xpForNextLevel   │  [cash] coins  │  [flame] streak
 *
 * The LEVEL cluster carries a thin TURQUOISE progress bar to the next level (the old
 * ResourceBar behaviour) plus a small tabular readout, so the eye reads "how far to
 * the next level" at a glance. The bar wears its own tinted ground under a hairline;
 * amber stays reserved for urgency (only the streak flame). Presentational only.
 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

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
  return (
    <View style={styles.stat} accessibilityLabel={`${value} ${label}`}>
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
  coins,
  streak,
}: {
  level: number;
  /** XP earned inside the current level — fills the progress bar. */
  xpIntoLevel: number;
  /** XP needed to reach the next level — the bar's full width. */
  xpForNextLevel: number;
  coins: number;
  streak: number;
}) {
  const theme = useTheme();
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
        accessibilityLabel={`Level ${level}, ${xpIntoLevel} of ${xpForNextLevel} XP to next level`}>
        <Ionicons name="ribbon-outline" size={16} color={theme.textSecondary} />
        <ThemedText type="smallBold" style={[styles.value, { color: theme.text }]}>
          {level}
        </ThemedText>
        <View style={styles.xp}>
          <View style={[styles.track, { backgroundColor: theme.hairline }]}>
            <View
              style={[styles.fill, { backgroundColor: theme.tint, width: `${pct * 100}%` }]}
            />
          </View>
          <ThemedText style={[styles.xpText, { color: theme.textMuted }]}>
            {xpIntoLevel} / {xpForNextLevel}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
      {/* COINS — role is still TBD, so it reads quietly in muted ink (never amber). */}
      <Stat
        icon="cash-outline"
        value={coins}
        iconColor={theme.textMuted}
        valueColor={theme.textSecondary}
        label="coins"
      />
      <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
      <Stat
        icon="flame"
        value={streak}
        iconColor={theme.gold}
        valueColor={theme.text}
        label="day streak"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.three,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  xpText: {
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
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
