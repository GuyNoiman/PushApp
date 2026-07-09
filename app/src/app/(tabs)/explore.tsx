/**
 * Explore — the discovery surface (v14 mockup screen-04). It answers "what could I
 * become next?": a search prompt at the top, then a vertically-scrolling page of
 * HORIZONTAL carousels (Netflix/Spotify style — cards peek at the edge) — "For you"
 * Journey tiles, "Top creators" round cards, and "From brands" wide cards.
 *
 * Design fidelity only: there is no marketplace backend yet, so the rows are fed
 * representative sample content (`sampleContent.ts`). Presentational — no business
 * logic (Engineering Bible §19). The carousel rows are `flexShrink: 0` so a
 * content-heavy Explore scrolls vertically instead of flex-compressing (a real bug
 * we hit and fixed — Explore_Screen §implementation note).
 */
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandCard, CreatorCard, JourneyCard } from '@/components/explore/ExploreCards';
import { forYou, fromBrands, topCreators } from '@/components/explore/sampleContent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
const GUTTER = Spacing.four;

export default function ExploreScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Explore</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Search prompt — placeholder acts as the invitation. Non-functional for
              now (design fidelity); tapping is where search will open later. */}
          <View style={styles.searchWrap}>
            <Pressable
              accessibilityRole="search"
              accessibilityLabel="What do you want to achieve?"
              style={({ pressed }) => [
                styles.search,
                { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="compass-outline" size={22} color={theme.textMuted} />
              <ThemedText type="default" themeColor="textMuted" style={styles.searchText}>
                What do you want to achieve?
              </ThemedText>
            </Pressable>
          </View>

          <Section icon="star" accent="coral" title="For you">
            <Carousel>
              {forYou.map((item) => (
                <JourneyCard key={item.id} item={item} />
              ))}
            </Carousel>
          </Section>

          <Section icon="heart" accent="pink" title="Top creators">
            <Carousel>
              {topCreators.map((item) => (
                <CreatorCard key={item.id} item={item} />
              ))}
            </Carousel>
          </Section>

          <Section icon="bag-handle" accent="blue" title="From brands">
            <Carousel>
              {fromBrands.map((item) => (
                <BrandCard key={item.id} item={item} />
              ))}
            </Carousel>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** A titled section: a small role-coloured icon + a Baloo heading, then its row. */
function Section({
  icon,
  accent,
  title,
  children,
}: {
  icon: IoniconName;
  accent: Extract<ThemeColor, 'coral' | 'pink' | 'blue' | 'teal' | 'purple' | 'gold'>;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={theme[accent]} />
        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: theme.goldStrong }]}>
          {title}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

/** A horizontal carousel: peeking cards, left gutter matching the page, and
 *  `flexShrink: 0` so it never compresses vertically. */
function Carousel({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      contentContainerStyle={styles.carouselContent}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  header: {
    paddingHorizontal: GUTTER,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  content: {
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
  },
  pressed: {
    opacity: 0.85,
  },

  searchWrap: {
    paddingHorizontal: GUTTER,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  searchText: {
    flex: 1,
  },

  section: {
    // flexShrink:0 — a content-heavy Explore must scroll, not compress its rows.
    flexShrink: 0,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: GUTTER,
  },
  sectionTitle: {
    lineHeight: 26,
  },

  carousel: {
    flexShrink: 0,
    overflow: 'visible',
  },
  carouselContent: {
    paddingHorizontal: GUTTER,
    gap: Spacing.three,
  },
});
