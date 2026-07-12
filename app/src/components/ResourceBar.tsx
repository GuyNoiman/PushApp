/**
 * ResourceBar — the floating top resource strip from the v14 mockup (screen-01 /
 * screen-10): a blue Level circle fused into a dark XP pill reading "{into}/{next}
 * EXP" (Home_Screen.md "Finalized visual design"), a purple "GT" (Grace Token)
 * chip, and a gold Coins pill (a distinct star-coin icon, separate from the
 * check-in glyph elsewhere) with a small "+" affordance. No background bar behind
 * it — the pieces float directly on the page, each with its own glossy depth
 * (inner highlight + drop shadow) so it reads as game UI.
 *
 * Shared by Home and Buddy (Engineering Bible: presentational only, no business
 * logic — every value is a prop).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ResourceBar({
  level,
  xpInto,
  xpForNext,
  coins,
  graceTokens,
  showGrace = true,
  onAddCoins,
}: {
  /** Buddy level, shown in the blue circle. */
  level: number;
  /** XP earned into the current level. */
  xpInto: number;
  /** XP required to reach the next level. */
  xpForNext: number;
  /** Coin balance, shown in the gold pill. */
  coins: number;
  /** Grace Token count. TODO(data model): Grace Tokens not yet in AppState — pass a placeholder until an engine tracks them. */
  graceTokens?: number;
  /** Whether to render the GT chip at all (hide until Grace Tokens ship, if desired). */
  showGrace?: boolean;
  /** Tapping the coin pill's "+" — e.g. open the Shop / earn-more flow. */
  onAddCoins?: () => void;
}) {
  const theme = useTheme();
  const fill = xpForNext > 0 ? Math.max(0, Math.min(1, xpInto / xpForNext)) : 0;

  return (
    <View style={styles.row}>
      {/* Level circle fused into the dark XP track. */}
      <View style={styles.lvMeter}>
        <View style={[styles.lvCirc, { backgroundColor: theme.blue }]}>
          <Text style={styles.lvCircText}>{level}</Text>
        </View>
        <View style={styles.lvTrack}>
          <View style={[styles.lvFill, { width: `${fill * 100}%`, backgroundColor: theme.blue }]} />
          <Text style={styles.lvCnt}>
            {xpInto}/{xpForNext} EXP
          </Text>
        </View>
      </View>

      <View style={styles.spacer} />

      {showGrace && graceTokens !== undefined && (
        <View
          style={[
            styles.gtCard,
            { backgroundColor: theme.purpleTint, borderColor: theme.purple },
          ]}>
          <View style={[styles.gtBadge, { backgroundColor: theme.purple }]}>
            <Text style={styles.gtBadgeText}>GT</Text>
          </View>
          <ThemedText style={[styles.gtCount, { color: theme.purpleStrong }]}>
            {graceTokens}
          </ThemedText>
        </View>
      )}

      <View style={[styles.coinPill, { backgroundColor: theme.goldTint, borderColor: theme.gold }]}>
        {/* Star-coin — a distinct glyph from the Step-card check-in icon (Ionicons,
            not an emoji/character glyph), per the founder's "give each a clear,
            distinct icon" correction. */}
        <View style={[styles.coinStar, { backgroundColor: theme.gold }]}>
          <Ionicons name="star" size={12} color="#fff" />
        </View>
        <ThemedText style={[styles.coinCount, { color: theme.goldStrong }]}>{coins}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add coins"
          onPress={onAddCoins}
          hitSlop={6}
          style={styles.coinPlus}>
          <Ionicons name="add" size={14} color={theme.goldStrong} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },

  // ── Level meter ────────────────────────────────────────────────────────
  lvMeter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lvCirc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#14336F',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  lvCircText: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
  },
  lvTrack: {
    // Widened (was 76) so "{into}/{next} EXP" always fits without wrapping or
    // truncating (Home_Screen.md "Finalized visual design": "make the meter a
    // bit wider").
    height: 21,
    minWidth: 100,
    borderRadius: 11,
    backgroundColor: '#2B3B54',
    marginLeft: -12,
    paddingLeft: 16,
    paddingRight: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lvFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 11,
    opacity: 0.85,
  },
  lvCnt: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 9.5,
    textAlign: 'center',
  },

  // ── Grace Token chip ──────────────────────────────────────────────────
  gtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingLeft: 2,
    paddingRight: 8,
    borderRadius: 13,
    borderWidth: 1.5,
    marginLeft: 8,
    shadowColor: '#4E2AA6',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gtBadge: {
    width: 23,
    height: 19,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gtBadgeText: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 9.5,
    letterSpacing: 0.3,
  },
  gtCount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
  },

  // ── Coins pill ────────────────────────────────────────────────────────
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingLeft: 3,
    paddingRight: 3,
    borderRadius: 13,
    borderWidth: 1.5,
    marginLeft: 8,
    shadowColor: '#966400',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coinStar: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
  },
  coinPlus: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
