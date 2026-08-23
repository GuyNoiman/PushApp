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
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { chevronName, isRTL } from '@/i18n/rtl';

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
  /** The next open Step's title — what this Journey is asking for now. */
  nextStep?: string;
  onPress: () => void;
}

export function JourneyCarousel({ cards }: { cards: readonly JourneyCard[] }) {
  const theme = useTheme();
  const { t } = useTranslation('home');
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
              <View style={styles.head}>
                <View style={[styles.tile, { backgroundColor: theme.tealTint }]}>
                  <Ionicons name="flag-outline" size={18} color={theme.tealStrong} />
                </View>
                <View style={styles.headText}>
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
                </View>
              </View>

              <View style={styles.progressHead}>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {t('carousel.overall')}
                </ThemedText>
                <ThemedText type="smallBold" style={[styles.pct, { color: theme.textSecondary }]}>
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

              {card.milestone ? (
                <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {Array.from({ length: card.milestone.total }, (_, i) => (
                    <View
                      key={i}
                      testID={i < card.milestone!.current ? 'milestone-dot-filled' : 'milestone-dot'}
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

              {/* The two facts that make a card actionable rather than decorative: where the arc has
                  reached, and what it is asking for next. Each is skipped when it has nothing to
                  say — a Journey with no Milestones does not get an invented one. */}
              <View style={[styles.facts, { borderTopColor: theme.hairline }]}>
                {card.milestoneLabel ? (
                  <Fact label={t('carousel.milestone')} value={card.milestoneLabel} />
                ) : null}
                {card.nextStep ? <Fact label={t('carousel.nextStep')} value={card.nextStep} /> : null}
              </View>

              <View style={[styles.cta, { borderColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  {t('carousel.open')}
                </ThemedText>
                <Ionicons name={chevronName()} size={14} color={theme.tint} />
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* THE ROW HAS TO SAY IT CAN BE DRAGGED (founder, 2026-08-24). Dots alone only read as "there
          is more" to somebody who already knows the convention, and at six near-invisible pixels
          they barely read at all. Now: a chevron on each side that EXISTS only when there is a card
          that way — the plainest possible "more over here" — around dots with real contrast, the
          current one widened into a pill so the position is legible at a glance. */}
      {cards.length > 1 ? (
        <View style={styles.pager} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons
            name={isRTL() ? 'chevron-forward' : 'chevron-back'}
            size={14}
            color={index > 0 ? theme.textMuted : 'transparent'}
          />
          {cards.map((card, i) => (
            <View
              key={card.id}
              testID="pager-dot"
              style={[
                styles.pagerDot,
                i === index && styles.pagerDotCurrent,
                { backgroundColor: i === index ? theme.tint : theme.hairline },
              ]}
            />
          ))}
          <Ionicons
            name={isRTL() ? 'chevron-back' : 'chevron-forward'}
            size={14}
            color={index < cards.length - 1 ? theme.textMuted : 'transparent'}
          />
        </View>
      ) : null}
    </View>
  );
}

/** One labelled fact on the card. The label is small and muted; the fact carries the weight. */
function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.fact}>
      <ThemedText type="small" numberOfLines={1} style={{ color: theme.textMuted }}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={2} style={{ color: theme.text }}>
        {value}
      </ThemedText>
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
    gap: Spacing.two,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  pct: {
    fontVariant: ['tabular-nums'],
  },
  facts: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
  },
  fact: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
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
  track: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three,
  },
  pagerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  /** The current card's dot is a short pill — position readable without counting. */
  pagerDotCurrent: {
    width: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
