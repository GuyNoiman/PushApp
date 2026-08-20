/**
 * LifeWheelChart — the wheel itself: eight sectors, each filled out to how satisfied the person is
 * with that area, with the one currently being asked about lifted out of the rest.
 *
 * THE ACTIVE SECTOR IS THE POINT OF THE DRAWING (founder, 2026-08-20: *"I'd be happy if the part
 * being talked about were more emphasised"*). While a question is on screen the wheel is not a chart,
 * it is a place marker — it says WHERE IN YOUR LIFE we are. So the active sector keeps full colour
 * and a bright outline, and every other sector drops to a fraction of its opacity. Once the wheel is
 * complete nothing is active any more and all eight come back to full strength, because at that
 * moment it stops being a place marker and becomes the reading.
 *
 * DRAWN IN CODE, like the week's dusk and for the same reasons: it re-tones between the themes,
 * stays sharp at any size, weighs nothing, and therefore travels over the air.
 *
 * Presentational only — it is handed values and told which one is active. It computes no reading and
 * knows nothing about gaps.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { LIFE_AREAS, LIFE_WHEEL_MAX, type LifeAreaId } from '@/core/tools/lifeWheel/model';
import { useTheme } from '@/hooks/use-theme';

/** Each area's own hue, taken from the founder's design. Colour here is identity, never severity. */
export const AREA_COLOR: Record<LifeAreaId, string> = {
  health: '#7FB3B0',
  relationships: '#2E8C87',
  family: '#A98BC4',
  career: '#8E7BB5',
  money: '#D9A441',
  growth: '#4FA88C',
  fun: '#E08A5F',
  environment: '#B98AC9',
};

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 104;
const SECTOR = 360 / LIFE_AREAS.length;

/** A point on the wheel. Angles run clockwise from twelve o'clock, like the labels around it. */
function point(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

/** One sector as a filled wedge from the centre out to `radius`. */
function wedge(index: number, radius: number): string {
  const start = index * SECTOR - SECTOR / 2;
  const end = start + SECTOR;
  const [x1, y1] = point(start, radius);
  const [x2, y2] = point(end, radius);
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
}

export interface LifeWheelChartProps {
  /** Satisfaction per area, 0–10. A missing area is drawn as an empty sector. */
  values: Partial<Record<LifeAreaId, number>>;
  /** The area being asked about. Null ⇒ nothing is dimmed and the wheel reads as a whole. */
  active?: LifeAreaId | null;
}

export function LifeWheelChart({ values, active = null }: LifeWheelChartProps) {
  const theme = useTheme();

  const rings = useMemo(() => [2, 4, 6, 8, 10], []);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* The grid, quiet enough to be read past. */}
        {rings.map((ring) => (
          <Circle
            key={ring}
            cx={CENTER}
            cy={CENTER}
            r={(RADIUS * ring) / LIFE_WHEEL_MAX}
            fill="none"
            stroke={theme.hairline}
            strokeWidth={1}
          />
        ))}

        {LIFE_AREAS.map((area, index) => {
          const value = values[area];
          const isActive = active === area;
          // Dimming the others is what makes the active one read as "here". 0.28 was chosen so the
          // shape of the whole wheel is still legible behind the focus, rather than disappearing.
          const opacity = active === null ? 0.85 : isActive ? 1 : 0.28;
          if (!value) {
            return isActive ? (
              <Path
                key={area}
                d={wedge(index, RADIUS)}
                fill={AREA_COLOR[area]}
                fillOpacity={0.08}
                stroke={AREA_COLOR[area]}
                strokeWidth={2}
              />
            ) : null;
          }
          return (
            <G key={area}>
              <Path
                d={wedge(index, (RADIUS * value) / LIFE_WHEEL_MAX)}
                fill={AREA_COLOR[area]}
                fillOpacity={opacity}
              />
              {isActive ? (
                // The full-radius outline shows the room this area still has, which is the thing the
                // person is being asked to judge.
                <Path
                  d={wedge(index, RADIUS)}
                  fill="none"
                  stroke={AREA_COLOR[area]}
                  strokeWidth={2}
                />
              ) : null}
            </G>
          );
        })}

        {/* The scale, on the vertical, so a number on the wheel means the same as the one under it. */}
        {rings.map((ring) => {
          const [x, y] = point(0, (RADIUS * ring) / LIFE_WHEEL_MAX);
          return (
            <SvgText
              key={`label-${ring}`}
              x={x}
              y={y + 4}
              fontSize={9}
              fill={theme.textMuted}
              textAnchor="middle">
              {String(ring)}
            </SvgText>
          );
        })}

        <Circle cx={CENTER} cy={CENTER} r={7} fill={theme.text} />
      </Svg>
    </View>
  );
}
