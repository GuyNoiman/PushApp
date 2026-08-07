/**
 * WeekDreamGroup — one Dream's slice of "This week" (revised 2026-08-07, third
 * founder round: "keep the Dream grouping and the visual connection, but give every
 * Step its OWN distinct card with a small gap — hint that each is individually
 * swipeable"). A labelled Dream header sits above the Dream's pending Steps, which
 * are strung along a TURQUOISE LEFT RAIL (a vertical line with a node dot per Step)
 * so the eye still reads "these Steps all serve this Dream" — BUT each Step is now a
 * SEPARATE floating card with a vertical GAP between them (not one fused panel), so
 * each reads as its own individually-actionable card. A subtle grip on the right
 * edge hints the card can be swiped aside.
 *
 * Each Step keeps its ⋯ report affordance; tapping a card opens the report sheet
 * (Done · Partial · Couldn't · Postpone · Reschedule). Presentational only — the
 * caller resolves the Dream title, the per-Step meta, and the press handlers.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const RAIL_W = 26;

/** One Step row inside a Dream group. */
export interface WeekStepView {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  done: boolean;
  onPress: () => void;
}

export function WeekDreamGroup({
  title,
  isDream,
  steps,
}: {
  title: string;
  /** True when the group is a real Dream (compass marker); false = a lone Journey. */
  isDream: boolean;
  steps: WeekStepView[];
}) {
  const theme = useTheme();
  const onAccent = useColorScheme() === 'dark' ? '#0A1615' : '#F5FBFB';

  return (
    <View style={styles.group}>
      {/* Dream label — the head of the rail. */}
      <View style={styles.header}>
        <View style={[styles.marker, { backgroundColor: theme.tealTint }]}>
          <Ionicons name={isDream ? 'compass' : 'flag'} size={13} color={theme.tint} />
        </View>
        <ThemedText type="smallBold" numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {title}
        </ThemedText>
      </View>

      {/* The Dream's Steps: separate cards strung along one continuous rail. */}
      <View style={styles.rows}>
        {/* The rail line runs the full height behind the cards, connecting the dots. */}
        <View style={[styles.rail, { backgroundColor: theme.tint }]} />

        {steps.map((row, i) => (
          <View key={row.key} style={[styles.rowWrap, i < steps.length - 1 && styles.rowGap]}>
            <View style={styles.railCol}>
              <View
                style={[
                  styles.node,
                  { backgroundColor: theme.tint, borderColor: theme.background },
                ]}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.done ? `${row.title}, done` : `Report on ${row.title}`}
              onPress={row.onPress}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.hairline,
                  shadowColor: '#000',
                  opacity: row.done ? 0.55 : 1,
                },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.tile, { backgroundColor: row.done ? theme.tint : theme.tealTint }]}>
                <Ionicons
                  name={row.done ? 'checkmark' : row.icon}
                  size={15}
                  color={row.done ? onAccent : theme.tint}
                />
              </View>

              <View style={styles.main}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ color: theme.text }}>
                  {row.title}
                </ThemedText>
                {row.meta.length > 0 && (
                  <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
                    {row.meta}
                  </ThemedText>
                )}
              </View>

              {row.done ? (
                <View style={[styles.check, { backgroundColor: theme.tint }]}>
                  <Ionicons name="checkmark" size={13} color={onAccent} />
                </View>
              ) : (
                <View style={styles.dots} accessibilityElementsHidden>
                  <Ionicons name="ellipsis-horizontal" size={18} color={theme.textMuted} />
                </View>
              )}

              {/* Subtle grip — hints the card can be swiped aside. */}
              <View style={[styles.grip, { backgroundColor: theme.hairline }]} accessibilityElementsHidden />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: Spacing.three,
    marginHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingLeft: 3,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13.5,
  },
  rows: {
    position: 'relative',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: RAIL_W / 2 - 1,
    width: 2,
    opacity: 0.3,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowGap: {
    marginBottom: Spacing.two,
  },
  railCol: {
    width: RAIL_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 3,
    height: 18,
    borderRadius: Radius.pill,
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.6,
  },
});
