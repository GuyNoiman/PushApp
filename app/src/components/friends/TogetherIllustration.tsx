/**
 * TogetherIllustration — the small drawing above the empty Support Circle: two
 * figures standing shoulder to shoulder, one in the teal accent and one in a
 * quiet neutral. It says "together" without saying anything about the person
 * looking at it (founder device pass 2026-08-17: the empty Circle should invite,
 * not just inform).
 *
 * Drawn with `react-native-svg`, deliberately: an image asset would add weight to
 * the build for one empty state, and we just moved 63 MB of unused assets OUT of
 * it. Two circles and two arcs cost nothing and re-colour with the theme.
 *
 * It carries no meaning the copy doesn't already carry, so it is hidden from
 * assistive tech rather than given a label nobody needs to hear.
 *
 * Presentational only (Engineering Bible §19) — geometry is symmetric, so it
 * reads the same under RTL and needs no mirroring.
 */
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const WIDTH = 132;
const HEIGHT = 76;

export function TogetherIllustration() {
  const theme = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={WIDTH} height={HEIGHT} viewBox="0 0 132 76" fill="none">
        {/* The other person, behind and quiet: outline only, in the hairline neutral. */}
        <Circle cx={84} cy={28} r={14} fill="none" stroke={theme.hairline} strokeWidth={2.5} />
        <Path
          d="M61 72a23 23 0 0 1 46 0"
          fill="none"
          stroke={theme.hairline}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* You, in front and in the accent — shoulders overlapping theirs. */}
        <Circle cx={48} cy={28} r={14} fill={theme.tealTint} stroke={theme.teal} strokeWidth={2.5} />
        <Path
          d="M25 72a23 23 0 0 1 46 0"
          fill={theme.tealTint}
          stroke={theme.teal}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
