/**
 * JourneyCarousel — the active Journeys on Home, one card at a time, swiped through
 * (founder, 2026-08-19: *"a new module that shows summary information about the active journeys.
 * It is a swipe card, each card shows one Journey"*).
 *
 * WHY A CAROUSEL AND NOT A LIST. A list of Journeys on Home would compete with the day: the day is
 * what the user came to act on, and the Journeys are context for it. One card at a time says
 * "here is where this is going" without turning Home into the Journeys tab, and swiping is a
 * deliberate act rather than a scroll that drags four more cards past the eye.
 *
 * WHAT A CARD SAYS, and nothing more: the Dream it serves, its own name, where it has reached in its
 * arc, and how far along it is. The Milestone rail is the picture of the arc — a dot per Milestone,
 * filled up to the one the Journey is in — and it is the reason the Step rows no longer repeat
 * "Milestone 2 of 4" under every line. One fact, one home.
 *
 * The position is derived from the SHARED `currentMilestone`, the same derivation the Journey detail
 * and the Step meta read, so two surfaces can never report a different Milestone for one Journey.
 *
 * Presentational: the caller passes the already-derived cards.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { displayFont, displayScale } from '@/constants/displayFont';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

/** One Journey, as the carousel needs it. */
export interface JourneyCard {
  id: string;
  title: string;
  /** The Dream it serves, when it serves one. */
  dream?: string;
  /** Completion in [0,1]. */
  progress: number;
  /** Which Milestone it is in, 1-based, and how many there are. Absent for a Journey with no arc. */
  milestone?: { current: number; total: number };
  /** "Milestone 3 of 5" — the caller's words, already translated. */
  milestoneLabel?: string;
  onPress: () => void;
}

export function JourneyCarousel({ cards }: { cards: readonly JourneyCard[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      // Under RTL the content starts at the right, so the offset counts backwards from the last
      // card. Deriving the index rather than trusting the raw offset is what keeps the dots
      // pointing at the card the user is actually looking at in both directions.
      const raw = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(isRTL() ? Math.max(0, cards.length - 1 - raw) : raw);
    },
    [cards.length, width],
  );

  if (cards.length === 0) return null;

  // RTL reverses the visual order of a horizontal scroller, so the array is reversed to match and
  // the first card still lands under the user's thumb on the side they read from.
  const ordered = isRTL() ? [...cards].reverse() : cards;

  return (
    <View onLayout={onLayout}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        contentOffset={isRTL() ? { x: width * (cards.length - 1), y: 0 } : undefined}>
        {ordered.map((card) => (
          <View key={card.id} style={[styles.slide, width > 0 && { width }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={card.title}
              onPress={card.onPress}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                pressed && styles.pressed,
              ]}>
              {card.dream ? (
                <ThemedText type="small" numberOfLines={1} style={{ color: theme.tealStrong }}>
                  {card.dream}
                </ThemedText>
              ) : null}
              <ThemedText
                numberOfLines={2}
                style={[
                  styles.title,
                  {
                    color: theme.text,
                    fontFamily: displayFont(),
                    fontSize: Math.round(19 * displayScale()),
                  },
                ]}>
                {card.title}
              </ThemedText>

              {card.milestone ? (
                <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {Array.from({ length: card.milestone.total }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            i < card.milestone!.current ? theme.tint : theme.backgroundSelected,
                        },
                        i === card.milestone!.current - 1 && styles.dotCurrent,
                      ]}
                    />
                  ))}
                </View>
              ) : null}

              <View style={styles.footer}>
                {card.milestoneLabel ? (
                  <ThemedText type="small" numberOfLines={1} style={{ color: theme.textMuted }}>
                    {card.milestoneLabel}
                  </ThemedText>
                ) : (
                  <View />
                )}
                <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                  {`${Math.round(card.progress * 100)}%`}
                </ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: theme.tint, width: `${Math.round(card.progress * 100)}%` },
                  ]}
                />
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {cards.length > 1 ? (
        <View style={styles.pager} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {cards.map((card, i) => (
            <View
              key={card.id}
              style={[
                styles.pagerDot,
                { backgroundColor: i === index ? theme.tint : theme.backgroundSelected },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    paddingHorizontal: Spacing.four,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  title: {
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  // The arc, as a row of dots: filled up to where the Journey has reached, and the current one
  // widened into a bar so "where I am" is legible without counting.
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCurrent: {
    width: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  track: {
    height: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  pager: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.85,
  },
});
