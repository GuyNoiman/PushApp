/**
 * ResourceBar — the floating top resource strip from the v14 mockup (screen-01 /
 * screen-10): a blue Level orb + XP progress bar sharing ONE white-outlined pill
 * reading "{into}/{next} EXP" (Home_Screen.md "Finalized visual design") so they
 * read as a single framed unit, a purple Grace-Token shield badge lettered "GT",
 * and a gold Coins pill showing a small stack of flat gold coins with a "+"
 * affordance. No background bar behind it — the pieces float directly on the page,
 * each with its own glossy depth (inner highlight + drop shadow) so it reads as
 * game UI.
 *
 * The coin stack, GT shield, and Level orb are drawn with inline `react-native-svg`
 * (bevel + rim) so each currency reads as a distinct, high-contrast game token
 * rather than a flat chip — founder-approved visual pass (2026-07-14).
 *
 * Shared by Home and Buddy (Engineering Bible: presentational only, no business
 * logic — every value is a prop).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The coin pill's own gold palette (mockup screen-01): a saturated gold FACE with a
// deeper gold frame, dark-brown numerals, and a pale cream "+" — richer than the
// flat goldTint so it reads as a framed game coin pill.
const COIN_FACE = '#F4C64B';
const COIN_EDGE = '#DFA62C';
const COIN_INK = '#7A4E00';
const COIN_PLUS_BG = '#FBE7BE';

// Coin-disc palette (used by the stack): a FLAT vertical gradient (bright top →
// deeper bottom) that reads as a flat coin face, a crisp dark-gold rim stroke, and
// an inner bevel ring — so the discs read unmistakably as stacked flat COINS, not
// eggs. Dropped the tall radial-oval gradient that made them egg-shaped (founder
// note 2026-07-14).
const COIN_DISC_LIGHT = '#FFF1C4';
const COIN_DISC_MID = '#F6C445';
const COIN_DISC_DEEP = '#DE9A16';
const COIN_DISC_RIM = '#A66D08';
const COIN_STAR = '#FFF6DE';

// GT shield gloss (top→bottom) — the purple bevel the founder liked, kept as an
// actual shield SHAPE with "GT" lettered inside.
const GT_GLOSS_TOP = '#9A8FEF';
const GT_GLOSS_BOTTOM = '#6259C6';

// Level orb bevel (light top-left → deep blue rim) for the 3D "leveling" read.
const LV_ORB_LIGHT = '#9CCBFB';
const LV_ORB_MID = '#4A80E0';
const LV_ORB_DEEP = '#185FA5';

/**
 * A small stack of flat gold coins — three overlapping FLAT discs (crisp gold rim +
 * flat top-lit face), offset vertically so you read 2–3 coin edges, with an inner
 * bevel ring, embossed star, and a shine on the front coin. Reads unmistakably as
 * coins, not eggs (founder note 2026-07-14: dropped the radial-oval gradient).
 */
function CoinStack() {
  // 5-point star centred on the front coin (cx 13, cy 13.5), outer r 3.2 / inner r 1.4.
  const star =
    '13,10.30 13.82,12.37 16.04,12.51 14.33,13.93 14.88,16.09 ' +
    '13,14.90 11.12,16.09 11.67,13.93 9.96,12.51 12.18,12.37';
  return (
    <Svg width={24} height={20} viewBox="0 0 26 22">
      <Defs>
        {/* Flat coin face: bright top → deeper bottom (a flat top highlight, NOT an
            off-centre radial oval — that read as an egg). */}
        <LinearGradient id="coinFlat" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COIN_DISC_LIGHT} />
          <Stop offset="0.55" stopColor={COIN_DISC_MID} />
          <Stop offset="1" stopColor={COIN_DISC_DEEP} />
        </LinearGradient>
      </Defs>
      {/* Two coins behind, offset up so their rims peek out — reads as a small stack. */}
      <Circle cx={13} cy={7} r={6.2} fill="url(#coinFlat)" stroke={COIN_DISC_RIM} strokeWidth={1.3} />
      <Circle cx={13} cy={10.2} r={6.6} fill="url(#coinFlat)" stroke={COIN_DISC_RIM} strokeWidth={1.3} />
      {/* Front coin: flat disc, crisp gold rim, inner bevel ring, star + shine. */}
      <Circle cx={13} cy={13.5} r={7} fill="url(#coinFlat)" stroke={COIN_DISC_RIM} strokeWidth={1.4} />
      <Circle cx={13} cy={13.5} r={4.9} fill="none" stroke={COIN_DISC_DEEP} strokeWidth={0.8} opacity={0.6} />
      <Polygon points={star} fill={COIN_STAR} />
      <Circle cx={10.6} cy={11.2} r={1.2} fill="rgba(255,255,255,0.55)" />
    </Svg>
  );
}

/** The Grace-Token badge: an actual shield shape (founder-approved) lettered "GT". */
function GTShield({ stroke }: { stroke: string }) {
  return (
    <View style={styles.gtShield}>
      <Svg width={22} height={24} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gtGloss" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={GT_GLOSS_TOP} />
            <Stop offset="1" stopColor={GT_GLOSS_BOTTOM} />
          </LinearGradient>
        </Defs>
        <Path
          d="M12 3l7 3v6c0 5-3.4 7.6-7 9-3.6-1.4-7-4-7-9V6l7-3z"
          fill="url(#gtGloss)"
          stroke={stroke}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.gtShieldText}>GT</Text>
    </View>
  );
}

/**
 * The blue Level orb — a bevelled 3D disc with the level number. The white outline
 * now belongs to the shared pill (LevelMeter), not the orb, so the circle and XP bar
 * read as one framed unit (founder note 2026-07-14); the orb is a plain disc here and
 * its left half aligns with the pill's left cap.
 */
function LevelOrb({ level }: { level: number }) {
  return (
    <View style={styles.lvCirc}>
      <Svg width={28} height={28} viewBox="0 0 28 28" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="lvOrb" cx="34%" cy="28%" r="72%">
            <Stop offset="0" stopColor={LV_ORB_LIGHT} />
            <Stop offset="0.5" stopColor={LV_ORB_MID} />
            <Stop offset="1" stopColor={LV_ORB_DEEP} />
          </RadialGradient>
        </Defs>
        <Circle cx={14} cy={14} r={14} fill="url(#lvOrb)" />
      </Svg>
      <Text style={styles.lvCircText}>{level}</Text>
    </View>
  );
}

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
      {/* Level orb + XP track share ONE white-outlined pill (founder note 2026-07-14):
          outer view carries the drop shadow (overflow-hidden clips iOS shadows), the
          inner pill carries the single white frame + dark fill for both. */}
      <View style={styles.lvMeter}>
        <View style={styles.lvPill}>
          <LevelOrb level={level} />
          <View style={styles.lvTrack}>
            <View style={[styles.lvFill, { width: `${fill * 100}%`, backgroundColor: theme.blue }]} />
            <Text style={styles.lvCnt}>
              {xpInto}/{xpForNext} EXP
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.spacer} />

      {showGrace && graceTokens !== undefined && (
        <View
          style={[
            styles.gtCard,
            { backgroundColor: theme.purpleTint, borderColor: theme.purple },
          ]}>
          <GTShield stroke={theme.purpleStrong} />
          <ThemedText style={[styles.gtCount, { color: theme.purpleStrong }]}>
            {graceTokens}
          </ThemedText>
        </View>
      )}

      <View style={[styles.coinPill, { backgroundColor: COIN_FACE, borderColor: COIN_EDGE }]}>
        {/* A small stack of coins — replaces the old single flat disc so it reads
            clearly against the gold pill (founder note 2026-07-14). */}
        <CoinStack />
        <ThemedText style={[styles.coinCount, { color: COIN_INK }]}>{coins}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add coins"
          onPress={onAddCoins}
          hitSlop={6}
          style={[styles.coinPlus, { backgroundColor: COIN_PLUS_BG }]}>
          <Ionicons name="add" size={14} color={COIN_INK} />
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
    // Outer wrapper: shadow only. The inner pill uses overflow-hidden (to clip the
    // XP fill to the rounded frame), which would swallow an iOS drop shadow — so the
    // shadow lives out here on a matching rounded, opaque backing.
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: '#2B3B54',
    shadowColor: '#14336F',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  lvPill: {
    // The single framed unit: one white outline wrapping BOTH the level orb (left
    // cap) and the XP bar (founder note 2026-07-14). Inner content height = 32 - 2*2.
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#2B3B54',
    overflow: 'hidden',
  },
  lvCirc: {
    // Plain blue disc sized to the pill's inner height (28); its left half aligns
    // with the pill's left cap so the shared white frame reads as the orb's ring.
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lvCircText: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
  },
  lvTrack: {
    // Fills the pill's inner height and tucks under the orb so the orb + bar fuse
    // inside the one frame; widened so "{into}/{next} EXP" always fits (Home_Screen.md
    // "Finalized visual design").
    alignSelf: 'stretch',
    minWidth: 104,
    marginLeft: -13,
    paddingLeft: 18,
    paddingRight: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lvFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  lvCnt: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 10.5,
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
  gtShield: {
    width: 22,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudge "GT" up into the shield's wider upper body (it tapers at the point).
    paddingBottom: 3,
  },
  gtShieldText: {
    color: '#fff',
    fontFamily: FontFamily.headingBold,
    fontSize: 9,
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
  coinCount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
  },
  coinPlus: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
