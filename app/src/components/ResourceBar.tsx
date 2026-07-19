/**
 * ResourceBar — the floating top resource strip from the v14 mockup (screen-01 /
 * screen-10): a blue Level orb overlapping a SEPARATE XP progress-bar ellipse
 * reading "{into}/{next} EXP" (Home_Screen.md "Finalized visual design") — the orb
 * and the bar keep their own distinct shapes/sizes, each wearing its own thin white
 * ring (founder reverted the "merged pill" on 2026-07-14; the only new bit is the
 * white outline now also wraps the XP bar). Plus a purple Grace-Token shield badge
 * lettered "GT", and a gold Coins pill showing a little pile of gold coins with one
 * face-on coin leaning against the front, and a "+" affordance. No background bar
 * behind it — the pieces float directly on the page, each with its own glossy depth
 * (inner highlight + drop shadow) so it reads as game UI.
 *
 * The coin pile, GT shield, and Level orb are drawn with inline `react-native-svg`
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
  Ellipse,
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

// Coin-disc palette (used by the pile): a bright top-lit gold for the coin faces,
// a deeper gold for the edge-on side bands (the "rims" of the stacked cylinders),
// and a crisp dark-gold rim stroke so each coin separates cleanly against the gold
// pill background. Founder note 2026-07-14: a little PILE of edge-on coins + one
// face-on coin leaning against the front.
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
 * One edge-on coin in the pile — a short gold cylinder seen slightly from the side:
 * a deeper-gold side band (the visible rim) capped by a bright top ellipse, both with
 * a crisp dark-gold rim stroke. Drawn back-to-front by the caller so the coins above
 * cover all but each lower coin's rim, reading as a stack.
 */
function EdgeCoin({ cx, cy, rx, ry, band }: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  band: number;
}) {
  return (
    <>
      {/* Side band (its horizontal top/bottom edges are hidden under the ellipses,
          leaving only the vertical rim strokes showing). */}
      <Path
        d={`M ${cx - rx} ${cy} H ${cx + rx} V ${cy + band} H ${cx - rx} Z`}
        fill={COIN_DISC_DEEP}
        stroke={COIN_DISC_RIM}
        strokeWidth={1}
      />
      {/* Bottom edge — rounds the cylinder base and gives the bottom rim. */}
      <Ellipse cx={cx} cy={cy + band} rx={rx} ry={ry} fill={COIN_DISC_DEEP} stroke={COIN_DISC_RIM} strokeWidth={1} />
      {/* Top face — bright top-lit gold. */}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#coinTop)" stroke={COIN_DISC_RIM} strokeWidth={1.1} />
    </>
  );
}

/**
 * A little pile of gold coins: three EDGE-ON coins stacked so you read three rims,
 * with one full FACE-ON coin (embossed star + shine) leaning against the front of
 * the pile toward the viewer. Crisp dark-gold rims keep it high-contrast against the
 * gold pill (founder note 2026-07-14).
 */
function CoinStack() {
  // 5-point star embossed on the face-on coin (centre cx 8, cy 13.5, outer 3 / inner 1.3).
  const star =
    '8,10.5 8.764,12.448 10.853,12.573 9.236,13.902 9.763,15.927 ' +
    '8,14.8 6.237,15.927 6.764,13.902 5.147,12.573 7.236,12.448';
  return (
    <Svg width={27} height={21} viewBox="0 0 28 22">
      <Defs>
        {/* Edge-on top faces: flat top-lit vertical gradient. */}
        <LinearGradient id="coinTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={COIN_DISC_LIGHT} />
          <Stop offset="0.55" stopColor={COIN_DISC_MID} />
          <Stop offset="1" stopColor={COIN_DISC_DEEP} />
        </LinearGradient>
        {/* Face-on coin: a rounder radial gradient so the front coin reads as a full disc. */}
        <RadialGradient id="coinFace" cx="38%" cy="30%" r="72%">
          <Stop offset="0" stopColor={COIN_DISC_LIGHT} />
          <Stop offset="0.55" stopColor={COIN_DISC_MID} />
          <Stop offset="1" stopColor={COIN_DISC_DEEP} />
        </RadialGradient>
      </Defs>
      {/* The pile — three edge-on coins, back (lowest) drawn first so each upper coin
          covers all but the lower one's rim. */}
      <EdgeCoin cx={17.5} cy={11.5} rx={5} ry={1.9} band={2.6} />
      <EdgeCoin cx={17.5} cy={9.4} rx={5} ry={1.9} band={2.6} />
      <EdgeCoin cx={17.5} cy={7.3} rx={5} ry={1.9} band={2.6} />
      {/* Face-on coin leaning against the FRONT of the pile — full disc, crisp rim,
          inner bevel ring, embossed star + shine. */}
      <Circle cx={8} cy={13.5} r={6} fill="url(#coinFace)" stroke={COIN_DISC_RIM} strokeWidth={1.4} />
      <Circle cx={8} cy={13.5} r={4.2} fill="none" stroke={COIN_DISC_DEEP} strokeWidth={0.8} opacity={0.6} />
      <Polygon points={star} fill={COIN_STAR} />
      <Circle cx={5.8} cy={11.1} r={1.2} fill="rgba(255,255,255,0.55)" />
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
 * The blue Level orb — a comfortably-sized bevelled 3D disc (~40px) with the level
 * number, wearing its OWN thin white ring (the container border) and overlapping the
 * left of the separate XP bar. Founder reverted the "merged pill" on 2026-07-14: the
 * orb stays a distinct, full-size disc rather than a shrunken shared left cap.
 */
function LevelOrb({ level }: { level: number }) {
  return (
    <View style={styles.lvCirc}>
      <Svg width={40} height={40} viewBox="0 0 40 40" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="lvOrb" cx="34%" cy="28%" r="72%">
            <Stop offset="0" stopColor={LV_ORB_LIGHT} />
            <Stop offset="0.5" stopColor={LV_ORB_MID} />
            <Stop offset="1" stopColor={LV_ORB_DEEP} />
          </RadialGradient>
        </Defs>
        <Circle cx={20} cy={20} r={20} fill="url(#lvOrb)" />
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
      {/* Level orb overlapping a SEPARATE, white-outlined XP bar (founder reverted the
          merged pill 2026-07-14): the orb keeps its own white ring, the XP bar wears a
          matching white ring — two distinct shapes, not one fused pill. */}
      <View style={styles.lvMeter}>
        <LevelOrb level={level} />
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
    // Orb + separate XP bar sit in a row; the orb overlaps the bar's left end. Each
    // piece carries its own depth (the orb its shadow, the bar its border).
    flexDirection: 'row',
    alignItems: 'center',
  },
  lvCirc: {
    // Comfortably-sized blue 3D disc (~40px) with its OWN thin white ring (the border
    // draws inward over the disc's outer edge). Overlaps the XP bar's left end; kept
    // full-size — NOT shrunk into a shared pill cap (founder note 2026-07-14).
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 16,
  },
  lvTrack: {
    // The XP bar — its OWN separate rounded ellipse tucked under the orb, now with a
    // matching thin white ring (the new bit, founder note 2026-07-14) so both the orb
    // and the bar read as outlined. Widened so "{into}/{next} EXP" always fits.
    height: 24,
    minWidth: 104,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#2B3B54',
    marginLeft: -16,
    paddingLeft: 20,
    paddingRight: 10,
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
