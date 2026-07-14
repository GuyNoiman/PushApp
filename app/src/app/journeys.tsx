/**
 * Journeys — the "what am I working toward?" list (04_Product/UX/Journeys_Screen.md,
 * finalized mockup v14, screen-02). Complements Home: Home is step-centric ("what
 * now?"), Journeys is journey-centric. Pushed over the tabs like missions/shop.
 *
 * Journeys are split into **Current · Completed · Future** segmented tabs (founder
 * decision 2026-07-14), matching the Shop's sub-tab rhythm. Current = active (no
 * `completedAt`); Completed = has `completedAt`; Future has no scheduled-start data
 * model yet, so it renders a calm "Coming soon" placeholder (no fabricated data)
 * until a real scheduling model lands. Each card speaks the Home step-card language
 * exactly — a small 26px Journey icon tile (colour keyed to the Journey's theme via
 * the shared `journeyGlyph`, same as StepCard), name, "Phase x/y · ends-in", and a
 * thin teal progress bar. Two bottom buttons: New (coral +) and a prominent gold
 * **Achievements** reward surface.
 *
 * Presentational only — reads snapshot.journeys and derives display values via
 * journeyView; no rewards/Buddy/Journey math lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  endsInLabel,
  journeyGlyph,
  toJourneyView,
  type JourneyBucket,
  type JourneyGlyphColor,
  type JourneyView,
} from '@/components/journey/journeyView';
import { BottomTabInset, Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

const GOLD_STRONG = Colors.light.goldStrong;
const GOLD_TINT = Colors.light.goldTint;
const CORAL = Colors.light.coral;

// Current · Completed · Future — the segmented tabs (founder decision 2026-07-14),
// mirroring the Shop's sub-tab pattern. Current is the default landing tab.
type JourneyTab = 'active' | 'completed' | 'future';

const JOURNEY_TABS: { id: JourneyTab; label: string }[] = [
  { id: 'active', label: 'Current' },
  { id: 'completed', label: 'Completed' },
  { id: 'future', label: 'Future' },
];

// Same tile-tint mapping as StepCard, so a Journey's icon always reads the same
// colour on Home and here (Design System §2 — colour encodes meaning).
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

export default function JourneysScreen() {
  const { snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<JourneyTab>('active');

  const buckets = useMemo(() => {
    const now = Date.now();
    const views = (snapshot?.journeys ?? []).map((j) => toJourneyView(j, now));
    return {
      active: views.filter((v) => v.bucket === 'active'),
      completed: views.filter((v) => v.bucket === 'completed'),
    };
  }, [snapshot?.journeys]);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // "Empty" = the user has no real Journeys at all (Current + Completed both empty).
  // The Future tab is a placeholder (no scheduled-start model yet), so it never
  // counts toward emptiness.
  const isEmpty = buckets.active.length === 0 && buckets.completed.length === 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Journeys</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Close
            </ThemedText>
          </Pressable>
        </View>

        {/* Segmented tabs (Current · Completed · Future) — same rhythm as the Shop's
            sub-tabs, painted in the reward gold used across this screen. */}
        <View style={styles.tabRow}>
          {JOURNEY_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  active
                    ? { backgroundColor: GOLD_TINT }
                    : { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={active ? { color: GOLD_STRONG } : undefined}
                  themeColor={active ? undefined : 'textSecondary'}>
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'future' ? (
            <FutureComingSoon />
          ) : activeTab === 'completed' ? (
            buckets.completed.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.empty}>
                <ThemedText type="default">No completed Journeys yet 🌱</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Finish a Journey and it will move here as a keepsake of what you did.
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={styles.list}>
                {buckets.completed.map((view) => (
                  <JourneyCard key={view.id} view={view} bucket="completed" />
                ))}
              </View>
            )
          ) : isEmpty ? (
            // Preserve the original empty state: shown on Current when the user has
            // no real Journeys at all yet.
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="default">No Journeys yet 🌱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Start your first Journey and it will appear here as you make progress.
              </ThemedText>
            </ThemedView>
          ) : buckets.active.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="default">No current Journeys 🌱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Start a new Journey, or revisit your completed ones in the Completed tab.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.list}>
              {buckets.active.map((view) => (
                <JourneyCard key={view.id} view={view} bucket="active" />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new Journey"
            onPress={() => router.push('/journey/new')}
            style={({ pressed }) => [
              styles.footerButton,
              { backgroundColor: theme.coralTint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="title" style={[styles.footerPlus, { color: CORAL }]}>
              +
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Achievements"
            onPress={() => router.push('/achievements')}
            style={({ pressed }) => [
              styles.footerButton,
              styles.achievements,
              pressed && styles.pressed,
            ]}>
            {/* Soft top-gloss wash — a light echo of GlossyTile's highlight, kept
                subtle since this is a full-width pill, not a chunky icon tile. */}
            <View pointerEvents="none" style={styles.achievementsGloss} />
            <ThemedText style={styles.trophy}>🏆</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Future tab — a calm "Coming soon" placeholder. There is no scheduled/future-start
 * data model yet, so we surface the tab (founder wants Current / Completed / Future)
 * without fabricating any Journeys.
 * TODO(data model): when a scheduled-start model lands, render real future Journeys
 * here (bucket 'future') instead of this placeholder.
 */
function FutureComingSoon() {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.comingSoon, { borderColor: theme.hairline }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Coming soon 🌱
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted" style={styles.comingSoonText}>
        Journeys you schedule to start later will wait for you here.
      </ThemedText>
    </ThemedView>
  );
}

function JourneyCard({ view, bucket }: { view: JourneyView; bucket: JourneyBucket }) {
  const theme = useTheme();
  const router = useRouter();

  const completed = bucket === 'completed';
  const future = bucket === 'future';

  const glyph = journeyGlyph(view.title);
  const tile = tileColors(theme, glyph.color);

  const meta = completed
    ? null
    : future
      ? `Starts ${new Date(view.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : `Phase ${view.phase}/${view.phases} · ${endsInLabel(view.endsAt)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${view.title}`}
      onPress={() => router.push(`/journey/${view.id}`)}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView
        type={future ? 'background' : 'backgroundElement'}
        style={[
          styles.card,
          { borderColor: theme.hairline },
          bucket === 'active' && { borderColor: theme.teal, borderWidth: 1.5 },
          future && { backgroundColor: GOLD_TINT, borderColor: 'transparent' },
          completed && styles.completedCard,
        ]}>
        <View style={styles.cardTop}>
          <View
            style={[
              styles.iconTile,
              { backgroundColor: completed ? theme.backgroundSelected : tile.bg },
            ]}>
            <ThemedText style={[styles.icon, { color: tile.fg }]}>{glyph.icon}</ThemedText>
          </View>
          <View style={styles.cardText}>
            <ThemedText
              type="subtitle"
              numberOfLines={1}
              themeColor={completed ? 'textSecondary' : 'text'}
              style={styles.cardTitle}>
              {view.title}
            </ThemedText>
            {meta && (
              <ThemedText type="small" themeColor="textSecondary">
                {meta}
              </ThemedText>
            )}
          </View>
          {completed ? (
            <View style={[styles.doneStamp, { borderColor: theme.teal }]}>
              <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
                DONE
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="subtitle" themeColor="textMuted" style={styles.chevron}>
              ›
            </ThemedText>
          )}
        </View>

        {bucket === 'active' && (
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: theme.teal, width: `${Math.round(view.progress * 100)}%` },
              ]}
            />
          </View>
        )}
      </ThemedView>
    </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  completedCard: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconTile: {
    // Matches StepCard's `mini` tile exactly — Journey cards speak the same
    // small-icon language as Home's Step cards (Journeys_Screen.md, mockup v14).
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 13,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
  cardTitle: {
    lineHeight: 26,
  },
  chevron: {
    lineHeight: 26,
  },
  doneStamp: {
    borderWidth: 1.5,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  footerButton: {
    flex: 1,
    height: 64,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievements: {
    // A tasteful reward surface — gold with a soft lift (Design System §2/§5).
    backgroundColor: Colors.light.gold,
    overflow: 'hidden',
    shadowColor: GOLD_STRONG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  achievementsGloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '60%',
    backgroundColor: '#FFFFFF',
    opacity: 0.25,
  },
  footerPlus: {
    lineHeight: 34,
  },
  trophy: {
    fontSize: 28,
    lineHeight: 34,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  comingSoon: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  comingSoonText: {
    textAlign: 'center',
  },
});
