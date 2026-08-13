/**
 * CardSwiper (Completion Celebration, I1) — a small paged browser that lets the user swipe between
 * the fixed completion-card template variants (PRD §3 "swipe/browse between"). Controlled: the
 * parent owns the selected `index`; the swiper reports changes via `onIndexChange` and reflects an
 * externally-set index by scrolling to it. Prev/next chevrons back the swipe for web + accessibility.
 *
 * The `captureRef` is attached to ONLY the currently-selected card, so a future native gateway
 * captures exactly the variant on screen. Presentational only (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CompletionCard } from '@/components/celebration/CompletionCard';
import { Radius, Spacing } from '@/constants/theme';
import type { CardTemplateVariant } from '@/core/celebration/cardTemplates';
import type { CardCaptureRef } from '@/core/share';
import type { CompletionCard as CompletionCardData } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function CardSwiper({
  card,
  variants,
  index,
  onIndexChange,
  captureRef,
}: {
  card: CompletionCardData;
  variants: CardTemplateVariant[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Attached to the active card so a future native gateway captures the selected variant. */
  captureRef: CardCaptureRef;
}) {
  const theme = useTheme();
  const rtl = isRTL();
  const scrollRef = useRef<ScrollView>(null);
  // Measure our own width so each page fills the swiper exactly (portrait cards are tall, not wide).
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Reflect an externally-set index (chevron taps, or a reset) by scrolling to that page. Guarded on
  // a measured width so the first layout pass doesn't scroll to 0-width offsets.
  useEffect(() => {
    if (width > 0) scrollRef.current?.scrollTo({ x: index * width, animated: true });
  }, [index, width]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    // Round the offset to the nearest page. (RN normalises RTL scroll offsets, so this holds in
    // both directions; clamp defends against fractional over-scroll.)
    const next = Math.max(0, Math.min(variants.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (next !== index) onIndexChange(next);
  };

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(variants.length - 1, index + delta));
    if (next !== index) onIndexChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.stage} onLayout={onLayout}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            contentContainerStyle={styles.track}>
            {variants.map((variant, i) => (
              <View key={variant.id} style={{ width }}>
                <View style={styles.page}>
                  {/* Only the active page receives the capture ref (it moves as the index changes). */}
                  <CompletionCard
                    card={card}
                    variant={variant}
                    ref={i === index ? (captureRef as React.Ref<View>) : undefined}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Prev / next chevrons — direction-aware so "forward" advances the index under RTL too. */}
        {variants.length > 1 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous card"
              onPress={() => go(-1)}
              disabled={index === 0}
              hitSlop={8}
              style={[styles.chevron, styles.chevronStart, index === 0 && styles.chevronDisabled]}>
              <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next card"
              onPress={() => go(1)}
              disabled={index === variants.length - 1}
              hitSlop={8}
              style={[
                styles.chevron,
                styles.chevronEnd,
                index === variants.length - 1 && styles.chevronDisabled,
              ]}>
              <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={22} color={theme.text} />
            </Pressable>
          </>
        ) : null}
      </View>

      {/* Page dots — a shape cue (filled vs hollow), not colour alone. */}
      {variants.length > 1 ? (
        <View style={styles.dots}>
          {variants.map((variant, i) => (
            <View
              key={variant.id}
              style={[
                styles.dot,
                { borderColor: theme.tint },
                i === index ? { backgroundColor: theme.tint } : { backgroundColor: 'transparent' },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
  },
  stage: {
    justifyContent: 'center',
  },
  track: {
    alignItems: 'center',
  },
  page: {
    paddingHorizontal: Spacing.two,
  },
  chevron: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  chevronStart: {
    left: Spacing.one,
  },
  chevronEnd: {
    right: Spacing.one,
  },
  chevronDisabled: {
    opacity: 0.3,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
});
