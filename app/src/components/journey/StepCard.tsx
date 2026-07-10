/**
 * StepCard — a single Step card for Home's "Week's steps" panel (v14 mockup
 * screen-01): a coloured icon tile, the Step name, a "{Journey} · Phase x/y"
 * line, a thin progress bar, and a 3-dot menu affordance. Supports the mockup's
 * visual states where the data allows: an "Ends today" floating badge, a green
 * DONE watermark wash for completed Steps, and a coral "Missed" tint.
 *
 * Presentational only: it reports the check-in intent upward; all reward/Buddy
 * logic runs in the engines (Engineering Bible §19). The `item`/`onCheckIn` props
 * are kept stable for existing call sites; everything else is optional so this
 * upgrade never breaks a caller that hasn't opted in yet.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { journeyGlyph, type JourneyGlyphColor } from '@/components/journey/journeyView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import type { TodayStep } from '@/core/engines/JourneyEngine';
import { useTheme } from '@/hooks/use-theme';

export type StepCardStatus = 'pending' | 'done' | 'missed';

function tileColors(theme: ReturnType<typeof useTheme>, color: JourneyGlyphColor) {
  switch (color) {
    case 'gold':
      return { bg: theme.goldTint, fg: theme.goldStrong };
    case 'green':
      return { bg: theme.successTint, fg: theme.tealStrong };
    case 'coral':
      return { bg: theme.coralTint, fg: theme.coralStrong };
    case 'purple':
      return { bg: theme.purpleTint, fg: theme.purpleStrong };
    case 'teal':
    default:
      return { bg: theme.tealTint, fg: theme.tealStrong };
  }
}

export function StepCard({
  item,
  onCheckIn,
  phase,
  phases,
  progress,
  endsToday,
  status = 'pending',
  onOpenMenu,
}: {
  item: TodayStep;
  onCheckIn: (journeyId: string, stepId: string) => void;
  /** Current Phase (1-based), if known — shown as "Journey · Phase x/y". */
  phase?: number;
  /** Total Phases in the Step's Journey, if known. */
  phases?: number;
  /** 0..1 share of the Step's Journey complete — drives the thin progress bar. */
  progress?: number;
  /** Whether this Step's window ends today — shows the floating "Ends today" badge. */
  endsToday?: boolean;
  /** Visual state: pending (default) / done (green wash + DONE watermark) / missed (coral wash). */
  status?: StepCardStatus;
  /** Opens the 3-dot quick-action menu (more info / edit / snooze / report). */
  onOpenMenu?: () => void;
}) {
  const theme = useTheme();
  const { step } = item;
  const glyph = journeyGlyph(item.journeyTitle || step.title);
  const tile = tileColors(theme, glyph.color);

  const done = status === 'done';
  const missed = status === 'missed';

  const cardBg = done ? theme.successTint : missed ? theme.dangerTint : theme.backgroundElement;
  const cardBorder = done ? theme.success : missed ? theme.danger : theme.hairline;
  const textColor = done ? theme.tealStrong : missed ? theme.danger : theme.text;
  const subColor = done ? theme.tealStrong : missed ? theme.danger : theme.textSecondary;

  const metaLine =
    phase !== undefined && phases !== undefined
      ? `${item.journeyTitle} · Phase ${phase}/${phases}`
      : item.journeyTitle;

  return (
    <View style={endsToday && styles.urgentWrap}>
      {endsToday && (
        <View style={[styles.dueTag, { backgroundColor: theme.goldTint }]}>
          <Text style={[styles.dueTagText, { color: theme.goldStrong }]}>⏱ Ends today</Text>
        </View>
      )}

      <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {done && (
          <Text style={styles.doneWatermark} pointerEvents="none">
            DONE
          </Text>
        )}

        <View style={styles.body}>
          <View style={styles.snRow}>
            <View style={[styles.mini, { backgroundColor: tile.bg }]}>
              <Text style={[styles.miniGlyph, { color: tile.fg }]}>{glyph.icon}</Text>
            </View>
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={[styles.title, { color: textColor }]}>
              {step.title}
            </ThemedText>
          </View>
          <ThemedText type="small" numberOfLines={1} style={{ color: subColor }}>
            {missed ? `Missed · still time to catch it` : done ? `Completed · nice work` : metaLine}
          </ThemedText>

          {!done && !missed && progress !== undefined && (
            <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: theme.teal },
                ]}
              />
            </View>
          )}
        </View>

        {!done && !missed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Check in on ${step.title}`}
            onPress={() => onCheckIn(item.journeyId, step.id)}
            style={({ pressed }) => [
              styles.check,
              { backgroundColor: theme.coral },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.text }}>
              Check in
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${step.title}`}
            onPress={onOpenMenu}
            hitSlop={8}
            style={styles.dots}>
            <Text style={[styles.dotsGlyph, { color: theme.textMuted }]}>⋮</Text>
          </Pressable>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  urgentWrap: {
    // Room above the card for the floating "Ends today" tag to overlap.
    marginTop: 13,
  },
  dueTag: {
    position: 'absolute',
    top: -12,
    right: 8,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  dueTagText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 10.5,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    overflow: 'hidden',
  },
  doneWatermark: {
    position: 'absolute',
    right: 34,
    top: '50%',
    marginTop: -16,
    transform: [{ rotate: '-7deg' }],
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
    color: '#2E7D3C',
    opacity: 0.15,
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    // minWidth:0 lets this flex child shrink below its content's intrinsic width
    // so the nowrap title truncates with an ellipsis instead of forcing the whole
    // card (and the scroll content) wider than the viewport (RN-web min-width:auto).
    minWidth: 0,
    gap: 4,
  },
  snRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  mini: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  miniGlyph: {
    fontSize: 13,
  },
  title: {
    flexShrink: 1,
  },
  bar: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  check: {
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dots: {
    width: 26,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsGlyph: {
    fontSize: 18,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.6,
  },
});
