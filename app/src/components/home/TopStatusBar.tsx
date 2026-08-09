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
 * The LEVEL cluster carries a thin TURQUOISE progress bar to the next level (the old
 * ResourceBar behaviour) plus a small tabular readout, so the eye reads "how far to
 * the next level" at a glance. The bar wears its own tinted ground under a hairline;
 * amber stays reserved for urgency (only the streak flame). Presentational only.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
}: {
  level: number;
  /** XP earned inside the current level — fills the progress bar. */
  xpIntoLevel: number;
  /** XP needed to reach the next level — the bar's full width. */
  xpForNextLevel: number;
  streak: number;
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

      {/* COINS — HIDDEN in the initial version (Decision Log D29): the RewardEngine keeps accruing
          Coins on `buddy.coins`, but with the Shop archived there is no sink, so we don't surface
          them yet. Re-add the Stat here (+ its divider) when Coins get a real role. */}
      <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
      <Stat
        icon="flame"
        value={streak}
        iconColor={theme.gold}
        valueColor={theme.text}
        label={t('status.streak')}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minWidth: 0,
  },
  // A compact meter (~a quarter of its old full-width self, per founder) — a fixed,
  // short track rather than one that stretches across the level cluster's free space.
  track: {
    width: 40,
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
