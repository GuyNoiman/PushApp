/**
 * Journeys — the "what am I working toward?" list, now a first-class bottom-nav
 * TAB (mature redesign 2026-08-07, `mature_proposal.html` §3). Complements Home:
 * Home is step-centric ("what now?"), Journeys is journey-centric ("what am I
 * building toward?"). Was a pushed modal; promoted to a tab so it sits alongside
 * Home · Coach · Circle.
 *
 * Restyled to the mature language: elegant white/near-black cards separated by a
 * hairline + soft shadow, one turquoise accent for progress + state, tabular
 * numerals on every number, no gold/coral game chrome. Journeys are split into
 * **Active · Completed · Future** (founder decision 2026-07-14) via an underlined
 * segmented control — label-only, no counts (founder direction 2026-08-07). Each
 * card leads with the Journey's Dream as a small uppercase eyebrow above the
 * Journey title, and a monochrome Ionicon in a teal tile (no emoji-as-UI). The old
 * gold "Achievements" reward pill is dropped for now.
 *
 * Presentational only — reads snapshot.journeys and derives display values via
 * journeyView; no rewards/Buddy/Journey math lives here (Engineering Bible §19).
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  endsInLabel,
  toJourneyView,
  type JourneyBucket,
  type JourneyView,
} from '@/components/journey/journeyView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Current · Completed · Future — the segmented tabs (founder decision 2026-07-14).
// Current is the default landing tab. Future has no scheduled-start data model
// yet, so it renders a calm placeholder rather than fabricated Journeys.
type JourneyTab = 'active' | 'completed' | 'future';

// Numbers that change (counts, %) read as tabular figures — the mature
// "dashboard" feel (mature_proposal.html key decision 4).
const tabular = { fontVariant: ['tabular-nums' as const] };

/** A card = a derived JourneyView plus the optional Dream name it serves. */
interface JourneyCardData {
  view: JourneyView;
  /** The Dream this Journey serves, shown as an uppercase eyebrow. Absent when unlinked. */
  dream?: string;
}

// ── Dev-fallback samples ─────────────────────────────────────────────────────
// The POC has no real Completed or Future Journeys yet. These ONE-each samples let
// the founder see those card states; each renders ONLY when the matching real
// bucket is empty and never mixes with real data. Remove once real data exists.
const DEV_DAY = 24 * 60 * 60 * 1000;
const DEV_NOW = Date.now();
const SAMPLE_COMPLETED: JourneyCardData = {
  dream: 'Be a calmer person',
  view: {
    id: 'sample-completed',
    title: 'Morning Pages',
    bucket: 'completed',
    status: 'completed',
    progress: 1,
    doneSteps: 12,
    totalSteps: 12,
    phase: 3,
    phases: 3,
    startedAt: DEV_NOW - 90 * DEV_DAY,
    endsAt: DEV_NOW - 10 * DEV_DAY,
  },
};
const SAMPLE_FUTURE: JourneyCardData = {
  dream: 'Feel strong',
  view: {
    id: 'sample-future',
    title: 'Learn to swim',
    bucket: 'future',
    status: 'active',
    progress: 0,
    doneSteps: 0,
    totalSteps: 8,
    phase: 1,
    phases: 3,
    startedAt: DEV_NOW + 14 * DEV_DAY,
    endsAt: DEV_NOW + 74 * DEV_DAY,
  },
};

export default function JourneysScreen() {
  const { snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('journeys');
  const [activeTab, setActiveTab] = useState<JourneyTab>('active');

  // Resolve a Journey's Dream name from its dreamId. Dreams are NOT on the Snapshot
  // read-model yet, so we read them defensively: the moment getSnapshot() surfaces
  // `dreams`, real Journeys show their Dream eyebrow with no further change here.
  // TODO(snapshot): expose `dreams` on Snapshot (AppCore.getSnapshot) so real
  // Journeys can render their Dream eyebrow from journey.dreamId.
  const dreamNameById = useMemo(() => {
    const map = new Map<string, string>();
    const dreams = (snapshot as { dreams?: { id: string; title: string }[] } | null)?.dreams ?? [];
    for (const d of dreams) map.set(d.id, d.title);
    return map;
  }, [snapshot]);

  const buckets = useMemo(() => {
    const now = Date.now();
    const cards: JourneyCardData[] = (snapshot?.journeys ?? []).map((j) => ({
      view: toJourneyView(j, now),
      dream: j.dreamId ? dreamNameById.get(j.dreamId) : undefined,
    }));
    return {
      active: cards.filter((c) => c.view.bucket === 'active'),
      completed: cards.filter((c) => c.view.bucket === 'completed'),
    };
  }, [snapshot?.journeys, dreamNameById]);

  // Label-only segments — no counts (founder direction 2026-08-07).
  const journeyTabs: { id: JourneyTab; label: string }[] = [
    { id: 'active', label: t('tabs.active') },
    { id: 'completed', label: t('tabs.completed') },
    { id: 'future', label: t('tabs.future') },
  ];

  // Dev fallback: show ONE sample when a real bucket is empty so those states are
  // visible. Future has no real data model yet, so it always shows its sample.
  const completedCards = buckets.completed.length > 0 ? buckets.completed : [SAMPLE_COMPLETED];
  const futureCards: JourneyCardData[] = [SAMPLE_FUTURE];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">{t('title')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('createA11y')}
            onPress={() => router.push('/journey/new')}
            style={({ pressed }) => [
              styles.newButton,
              { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="add" size={18} color={theme.teal} />
            <ThemedText type="smallBold" style={{ color: theme.teal }}>
              {t('createJourney')}
            </ThemedText>
          </Pressable>
        </View>

        {/* Underlined segmented control (Current · Completed · Future) — the active
            tab carries a thin teal underline; counts read as tabular figures. */}
        <View style={[styles.segmented, { borderBottomColor: theme.hairline }]}>
          {journeyTabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                onPress={() => setActiveTab(tab.id)}
                style={styles.segItem}>
                <ThemedText type="smallBold" themeColor={active ? 'text' : 'textMuted'}>
                  {tab.label}
                </ThemedText>
                {active && <View style={[styles.segUnderline, { backgroundColor: theme.teal }]} />}
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'future' ? (
            <View style={styles.list}>
              {futureCards.map((card) => (
                <JourneyCard key={card.view.id} view={card.view} dream={card.dream} bucket="future" />
              ))}
            </View>
          ) : activeTab === 'completed' ? (
            <View style={styles.list}>
              {completedCards.map((card) => (
                <JourneyCard
                  key={card.view.id}
                  view={card.view}
                  dream={card.dream}
                  bucket="completed"
                />
              ))}
            </View>
          ) : buckets.active.length === 0 ? (
            <EmptyState title={t('empty.title')} body={t('empty.body')} />
          ) : (
            <View style={styles.list}>
              {buckets.active.map((card) => (
                <JourneyCard key={card.view.id} view={card.view} dream={card.dream} bucket="active" />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.empty, { borderColor: theme.hairline }]}>
      <ThemedText type="default">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
        {body}
      </ThemedText>
    </ThemedView>
  );
}

function JourneyCard({
  view,
  dream,
  bucket,
}: {
  view: JourneyView;
  dream?: string;
  bucket: JourneyBucket;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('journeys');

  const completed = bucket === 'completed';
  const future = bucket === 'future';
  // A paused (frozen) Journey lives under the Active tab; a pill marks it so it reads apart from the
  // running ones (J3). `view.status` is the authoritative lifecycle field.
  const paused = view.status === 'frozen';
  const pct = Math.round(Math.max(0, Math.min(1, view.progress)) * 100);

  const sub = completed
    ? t('card.milestoneComplete', { phases: view.phases })
    : t('card.milestone', { phase: view.phase, phases: view.phases });

  const foot = completed
    ? t('card.completed')
    : future
      ? t('card.starts', {
          date: new Date(view.startedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
        })
      : endsInLabel(view.endsAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('card.open', { title: view.title })}
      onPress={() => router.push(`/journey/${view.id}`)}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: theme.hairline }, completed && styles.completedCard]}>
        <View style={styles.cardTop}>
          {/* TODO(icon): expert-driven, user-editable icon — each domain expert
              will supply its own Ionicon and the user can override it. Neutral for now. */}
          <View style={[styles.iconTile, { backgroundColor: theme.tealTint }]}>
            <Ionicons name="flag-outline" size={19} color={theme.teal} />
          </View>
          <View style={styles.cardText}>
            {dream ? (
              <ThemedText
                type="small"
                themeColor="textMuted"
                numberOfLines={1}
                style={styles.eyebrow}>
                {dream}
              </ThemedText>
            ) : null}
            <ThemedText type="subtitle" numberOfLines={1} style={styles.cardTitle}>
              {view.title}
            </ThemedText>
          </View>
          {/* State pill only where it adds info: DONE on Completed, SOON on Future, PAUSED on a
              frozen Journey. A plain running Journey shows no pill (the Active tab already says so). */}
          {completed || future || paused ? (
            <View
              style={[
                styles.statePill,
                {
                  backgroundColor: completed
                    ? theme.backgroundSelected
                    : paused
                      ? theme.goldTint
                      : theme.tealTint,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: completed
                    ? theme.textMuted
                    : paused
                      ? theme.goldStrong
                      : theme.tealStrong,
                  fontSize: 10,
                }}>
                {completed ? t('card.done') : paused ? t('card.paused') : t('card.soon')}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
          {sub}
        </ThemedText>

        {!future && (
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[styles.fill, { backgroundColor: theme.teal, width: `${pct}%` }]}
              />
            </View>
            <ThemedText type="smallBold" style={[styles.pct, tabular]}>
              {pct}%
            </ThemedText>
          </View>
        )}

        <View style={[styles.foot, { borderTopColor: theme.hairline }]}>
          <ThemedText type="small" themeColor="textMuted">
            {foot}
          </ThemedText>
        </View>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  segItem: {
    paddingBottom: Spacing.three,
    alignItems: 'center',
  },
  segUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  completedCard: {
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  cardTitle: {
    lineHeight: 22,
  },
  statePill: {
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    flexShrink: 0,
  },
  sub: {
    marginTop: Spacing.half,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    flexShrink: 0,
  },
  foot: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
