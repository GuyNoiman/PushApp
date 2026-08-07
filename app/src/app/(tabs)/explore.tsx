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
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandCard, CreatorCard, JourneyCard } from '@/components/explore/ExploreCards';
import { forYou, fromBrands, topCreators } from '@/components/explore/sampleContent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
const GUTTER = Spacing.four;

// ARCHIVED (2026-08-07): the creator/brand MARKETPLACE is a future feature, hidden
// for now per founder direction. The "Top creators" + "From brands" rows (and their
// sample content + card components) are kept in the codebase, just not rendered.
// Flip to `true` to bring the marketplace back. See 04_Product/UX/Archived_Screens.md.
const SHOW_MARKETPLACE = false;

export default function ExploreScreen() {
  const theme = useTheme();
  // A real focusable input so tapping the search bar raises the keyboard. There's
  // no marketplace backend yet (design fidelity), so filtering is entirely
  // client-side over the sample content — nothing is submitted to any backend.
  const searchRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  // Case-insensitive substring match over each row's user-visible text. When the
  // query is empty the lists pass through unchanged, preserving the normal layout.
  const filteredForYou = useMemo(
    () =>
      !q
        ? forYou
        : forYou.filter((item) =>
            `${item.name} ${item.duration} ${item.steps}`.toLowerCase().includes(q),
          ),
    [q],
  );
  const filteredCreators = useMemo(
    () =>
      !q
        ? topCreators
        : topCreators.filter((item) =>
            `${item.handle} ${item.joined} ${item.journeys}`.toLowerCase().includes(q),
          ),
    [q],
  );
  const filteredBrands = useMemo(
    () =>
      !q
        ? fromBrands
        : fromBrands.filter((item) =>
            `${item.brand} ${item.journey}`.toLowerCase().includes(q),
          ),
    [q],
  );

  const hasResults =
    filteredForYou.length +
      (SHOW_MARKETPLACE ? filteredCreators.length + filteredBrands.length : 0) >
    0;
  // While searching, hide a section whose row is empty; when idle, show them all.
  const showSection = (count: number) => !isSearching || count > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Explore</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Search prompt — a real TextInput so tapping it focuses and raises the
              keyboard. Tapping anywhere on the bar (icon/padding) focuses the field. */}
          <View style={styles.searchWrap}>
            <Pressable
              accessibilityRole="search"
              accessibilityLabel="What do you want to achieve?"
              onPress={() => searchRef.current?.focus()}
              style={({ pressed }) => [
                styles.search,
                { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="compass-outline" size={22} color={theme.textMuted} />
              <TextInput
                ref={searchRef}
                value={query}
                onChangeText={setQuery}
                placeholder="What do you want to achieve?"
                placeholderTextColor={theme.textMuted}
                returnKeyType="search"
                style={[styles.searchText, styles.searchInput, { color: theme.text }]}
              />
              {/* Clear (X) — appears only with text; clears the query, keeps focus. */}
              {query.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                  <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                </Pressable>
              )}
            </Pressable>
          </View>

          {showSection(filteredForYou.length) && (
            <Section icon="star" accent="coral" title="For you">
              <Carousel>
                {filteredForYou.map((item) => (
                  <JourneyCard key={item.id} item={item} />
                ))}
              </Carousel>
            </Section>
          )}

          {SHOW_MARKETPLACE && showSection(filteredCreators.length) && (
            <Section icon="heart" accent="pink" title="Top creators">
              <Carousel>
                {filteredCreators.map((item) => (
                  <CreatorCard key={item.id} item={item} />
                ))}
              </Carousel>
            </Section>
          )}

          {SHOW_MARKETPLACE && showSection(filteredBrands.length) && (
            <Section icon="bag-handle" accent="blue" title="From brands">
              <Carousel>
                {filteredBrands.map((item) => (
                  <BrandCard key={item.id} item={item} />
                ))}
              </Carousel>
            </Section>
          )}

          {/* No client-side matches — a plain, non-alarming empty state. */}
          {isSearching && !hasResults && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No matches
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyBody}>
                Nothing here matches “{query.trim()}”. Try a different word.
              </ThemedText>
            </View>
          )}
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
  // Match ThemedText type="default" (Inter medium, body 15) so the input reads
  // identically to the old placeholder text; padding:0 keeps it vertically centred.
  searchInput: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: GUTTER,
    paddingTop: Spacing.six,
  },
  emptyTitle: {
    lineHeight: 26,
  },
  emptyBody: {
    textAlign: 'center',
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
