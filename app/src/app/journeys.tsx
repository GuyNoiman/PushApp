/**
 * Journeys — the "what am I working toward?" list (04_Product/UX/Journeys_Screen.md,
 * finalized mockup v14, screen-02). Complements Home: Home is step-centric ("what
 * now?"), Journeys is journey-centric. Pushed over the tabs like missions/shop.
 *
 * Journeys are grouped **Active / Future / Completed** with counts. Each card speaks
 * the Home step-card language — a small Journey icon tile, name, "Journey · Phase
 * x/y · ends-in", and a thin teal progress bar. Two bottom buttons: New (coral +)
 * and a prominent gold **Achievements** reward surface.
 *
 * Presentational only — reads snapshot.journeys and derives display values via
 * journeyView; no rewards/Buddy/Journey math lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  endsInLabel,
  toJourneyView,
  type JourneyBucket,
  type JourneyView,
} from '@/components/journey/journeyView';
import { BottomTabInset, Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

const GOLD = Colors.light.gold;
const GOLD_STRONG = Colors.light.goldStrong;
const GOLD_TINT = Colors.light.goldTint;
const CORAL = Colors.light.coral;

// A small stable glyph per Journey so cards read like the mockup's icon tiles.
// (The domain has no icon field yet; derived from the title for now.)
function journeyGlyph(title: string): string {
  const t = title.toLowerCase();
  if (/run|walk|jog|km|fit|gym|workout/.test(t)) return '🔥';
  if (/span|french|german|lang|learn|study|read/.test(t)) return '💬';
  if (/medit|calm|breath|mind|yoga/.test(t)) return '🌿';
  if (/draw|paint|art|music|write/.test(t)) return '🎨';
  return '🧭';
}

export default function JourneysScreen() {
  const { snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();

  const buckets = useMemo(() => {
    const now = Date.now();
    const views = (snapshot?.journeys ?? []).map((j) => toJourneyView(j, now));
    return {
      active: views.filter((v) => v.bucket === 'active'),
      future: views.filter((v) => v.bucket === 'future'),
      completed: views.filter((v) => v.bucket === 'completed'),
    };
  }, [snapshot?.journeys]);

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const isEmpty =
    buckets.active.length === 0 && buckets.future.length === 0 && buckets.completed.length === 0;

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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isEmpty ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="default">No Journeys yet 🌱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Start your first Journey and it will appear here as you make progress.
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              <Section title="Active" bucket="active" items={buckets.active} glyph={journeyGlyph} />
              <Section title="Future" bucket="future" items={buckets.future} glyph={journeyGlyph} />
              <Section
                title="Completed"
                bucket="completed"
                items={buckets.completed}
                glyph={journeyGlyph}
              />
            </>
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
              { backgroundColor: GOLD },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.trophy}>🏆</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  title,
  bucket,
  items,
  glyph,
}: {
  title: string;
  bucket: JourneyBucket;
  items: JourneyView[];
  glyph: (title: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={{ color: Colors.light.goldStrong }}>
          {title}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textMuted">
          ({items.length})
        </ThemedText>
      </View>
      {items.map((view) => (
        <JourneyCard key={view.id} view={view} bucket={bucket} glyph={glyph(view.title)} />
      ))}
    </View>
  );
}

function JourneyCard({
  view,
  bucket,
  glyph,
}: {
  view: JourneyView;
  bucket: JourneyBucket;
  glyph: string;
}) {
  const theme = useTheme();
  const router = useRouter();

  const completed = bucket === 'completed';
  const future = bucket === 'future';

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
              { backgroundColor: completed ? theme.backgroundSelected : theme.tealTint },
            ]}>
            <ThemedText style={styles.icon}>{glyph}</ThemedText>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
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
    width: 40,
    height: 40,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    lineHeight: 26,
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
    shadowColor: GOLD_STRONG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
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
});
