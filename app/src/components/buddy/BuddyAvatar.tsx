/**
 * BuddyAvatar — the Buddy rendered as a glossy, 3D-look creature (matches the v14
 * mockup: an orange "Sprout" with a radial-gradient body, a bright specular
 * highlight, a cute face, and a soft ground shadow). Drawn with react-native-svg
 * so it stays crisp at any size and needs no image assets.
 *
 * Presentational only — it takes a `stage` (BuddyStage) + `size` and renders the
 * look for that stage: `egg` is a smooth, faceless egg; the hatched stages
 * (hatchling · sprout · companion · guardian) are the glossy creature with a
 * face, with small touches of extra detail as the stage grows. No business logic
 * (Engineering Bible §19). Every value is derived from `size` so one component
 * scales from the Home card (64) to the Buddy scene (200+).
 */
import Svg, {
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import type { BuddyStage } from '@/core/types/domain';

// The Buddy's coral-orange, tuned to the mockup: a bright highlight orange fading
// into a deeper, saturated base. Egg uses a paler cream-orange for a shell look.
const BODY_LIGHT = '#FBBE8E';
const BODY_MID = '#F58A54';
const BODY_DEEP = '#E8703C';
const EGG_LIGHT = '#FDEAD3';
const EGG_MID = '#F7CFA6';
const EGG_DEEP = '#EAB482';
const HIGHLIGHT = '#FFFFFF';
const CHEEK = '#F2765E';
const EYE = '#2E2A28';

// Whether this stage draws a face (egg is faceless; everything hatched has one).
function hasFace(stage: BuddyStage): boolean {
  return stage !== 'egg';
}

export function BuddyAvatar({
  stage,
  size = 128,
}: {
  stage: BuddyStage;
  /** Rendered box side in px; the whole creature (incl. shadow) fits inside. */
  size?: number;
}) {
  // Draw in a fixed 100×100 coordinate space and scale via the SVG box, so all
  // the geometry below is stage-independent and size-independent.
  const isEgg = stage === 'egg';
  const light = isEgg ? EGG_LIGHT : BODY_LIGHT;
  const mid = isEgg ? EGG_MID : BODY_MID;
  const deep = isEgg ? EGG_DEEP : BODY_DEEP;

  // The egg reads a touch taller/narrower than the round creature.
  const bodyRx = isEgg ? 33 : 37;
  const bodyRy = isEgg ? 40 : 37;
  const bodyCy = isEgg ? 50 : 50;

  // Later stages sit a little bigger and prouder — a subtle, non-gimmicky cue.
  const grown = stage === 'companion' || stage === 'guardian';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image">
      <Defs>
        {/* Body: light source top-left, so the gradient origin is offset up-left. */}
        <RadialGradient id="buddyBody" cx="38%" cy="32%" r="75%">
          <Stop offset="0%" stopColor={light} />
          <Stop offset="55%" stopColor={mid} />
          <Stop offset="100%" stopColor={deep} />
        </RadialGradient>
        {/* Specular highlight: a soft white glow fading to transparent. */}
        <RadialGradient id="buddyGloss" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={HIGHLIGHT} stopOpacity={0.9} />
          <Stop offset="100%" stopColor={HIGHLIGHT} stopOpacity={0} />
        </RadialGradient>
        {/* Ground shadow: dark centre fading out to nothing. */}
        <RadialGradient id="buddyShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#000000" stopOpacity={0.22} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Soft ground shadow, a flat ellipse beneath the body. */}
      <Ellipse cx={50} cy={92} rx={grown ? 27 : 24} ry={6} fill="url(#buddyShadow)" />

      {/* Body sphere. */}
      <Ellipse cx={50} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill="url(#buddyBody)" />

      {/* Big specular highlight, upper-left. */}
      <Ellipse cx={38} cy={30} rx={15} ry={11} fill="url(#buddyGloss)" transform="rotate(-25 38 30)" />
      {/* Tiny secondary sparkle for extra gloss. */}
      <Ellipse cx={30} cy={40} rx={4} ry={3} fill={HIGHLIGHT} opacity={0.55} />

      {hasFace(stage) && (
        <G>
          {/* Soft cheeks. */}
          <Ellipse cx={33} cy={58} rx={6} ry={4} fill={CHEEK} opacity={0.28} />
          <Ellipse cx={67} cy={58} rx={6} ry={4} fill={CHEEK} opacity={0.28} />

          {/* Eyes — round, glossy, with a white catch-light each. */}
          <Ellipse cx={40} cy={49} rx={4.6} ry={5.4} fill={EYE} />
          <Ellipse cx={60} cy={49} rx={4.6} ry={5.4} fill={EYE} />
          <Ellipse cx={41.6} cy={46.6} rx={1.5} ry={1.7} fill={HIGHLIGHT} />
          <Ellipse cx={61.6} cy={46.6} rx={1.5} ry={1.7} fill={HIGHLIGHT} />

          {/* Smile — a gentle upward arc. Warmer/wider as the Buddy grows. */}
          <Path
            d={grown ? 'M41 61 Q50 71 59 61' : 'M42 61 Q50 69 58 61'}
            stroke={EYE}
            strokeWidth={2.6}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      )}
    </Svg>
  );
}
