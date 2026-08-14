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
 * **Active · History · Future** (founder decision 2026-07-14; the middle tab renamed
 * from "Completed" to "History" on 2026-08-14, when canceling landed) via an underlined
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
  byMostRecentlyEnded,
  endsInLabel,
  shortDate,
  toJourneyView,
  type JourneyBucket,
  type JourneyView,
} from '@/components/journey/journeyView';
import { CanceledPill } from '@/components/journeys/CanceledPill';
import { ParkedGoalCard } from '@/components/journeys/ParkedGoalCard';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Active · History · Future — the segmented tabs (founder decision 2026-07-14).
// Active is the default landing tab. Future is the "For later" surface: the goals the coach
// detected but the user didn't build first (Parked/deferred goals, L1) wait here.
//
// HISTORY was called "Completed" until canceling shipped (Journey Abandonment, 2026-08-14). A tab
// named "Completed" that also holds canceled Journeys is a label that lies, so the tab is now
// History and carries two labelled groups inside it: Completed, then Stopped. The `history` tab id
// still maps onto the `completed` BUCKET (`bucketOf`), which is the history surface.
type JourneyTab = 'active' | 'history' | 'future';

// Numbers that change (counts, %) read as tabular figures — the mature
// "dashboard" feel (mature_proposal.html key decision 4).
const tabular = { fontVariant: ['tabular-nums' as const] };

/** A card = a derived JourneyView plus the optional Dream name it serves. */
interface JourneyCardData {
  view: JourneyView;
  /** The Dream this Journey serves, shown as an uppercase eyebrow. Absent when unlinked. */
  dream?: string;
}

export default function JourneysScreen() {
  const { snapshot } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('journeys');
  const [activeTab, setActiveTab] = useState<JourneyTab>('active');

  // Resolve a Journey's Dream name from its dreamId for the card eyebrow. `dreams` is on the
  // Snapshot read-model (AppCore.getSnapshot), so this reads it directly.
  const dreamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of snapshot?.dreams ?? []) map.set(d.id, d.title);
    return map;
  }, [snapshot?.dreams]);

  const buckets = useMemo(() => {
    const now = Date.now();
    const cards: JourneyCardData[] = (snapshot?.journeys ?? []).map((j) => ({
      view: toJourneyView(j, now),
      dream: j.dreamId ? dreamNameById.get(j.dreamId) : undefined,
    }));
    // History reads newest-first, by the ONE rule both its groups share: when the Journey actually
    // ended (its stop date, or its completion date). Sorted once, before the split, so Completed and
    // Stopped can never drift into two different orders. A Journey with no end stamp sorts last.
    const history = cards
      .filter((c) => c.view.bucket === 'completed')
      .sort((a, b) => byMostRecentlyEnded(a.view, b.view));
    return {
      active: cards.filter((c) => c.view.bucket === 'active'),
      // The History tab's two groups. `bucket` says WHERE a Journey is listed; `status` says what it
      // actually is — so a canceled (abandoned) Journey lands in History but never under Completed.
      completed: history.filter((c) => c.view.status !== 'abandoned'),
      stopped: history.filter((c) => c.view.status === 'abandoned'),
      history,
    };
  }, [snapshot?.journeys, dreamNameById]);

  // Label-only segments — no counts (founder direction 2026-08-07).
  const journeyTabs: { id: JourneyTab; label: string }[] = [
    { id: 'active', label: t('tabs.active') },
    { id: 'history', label: t('tabs.history') },
    { id: 'future', label: t('tabs.future') },
  ];

  // The "For later" surface (L1): the real parked goals the coach detected but the user didn't build.
  // Read-only for now (founder decision 2026-08-13) — the coach will offer activate/dismiss in context.
  const parkedGoals = snapshot?.parkedGoals ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">{t('title')}</ThemedText>
          <View style={styles.headerActions}>
            {/* My Dreams entry (T0-a) — Dreams are the "who I'm becoming" behind these Journeys. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('myDreamsA11y')}
              onPress={() => router.push('/my-dreams')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.dreamsButton,
                { borderColor: theme.hairline, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <Ionicons name="sparkles-outline" size={18} color={theme.teal} />
            </Pressable>
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
            parkedGoals.length === 0 ? (
              <EmptyState title={t('parked.empty.title')} body={t('parked.empty.body')} />
            ) : (
              <View style={styles.list}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.parkedHeading}>
                  {t('parked.heading')}
                </ThemedText>
                {parkedGoals.map((goal) => (
                  <ParkedGoalCard key={goal.id} goal={goal} />
                ))}
              </View>
            )
          ) : activeTab === 'history' ? (
            buckets.history.length === 0 ? (
              <EmptyState title={t('history.empty.title')} body={t('history.empty.body')} />
            ) : (
              <View style={styles.historyGroups}>
                {/* Completed first, then Stopped — each group only renders when it has something,
                    so a user who has never canceled anything never sees a "Stopped" header. */}
                {buckets.completed.length > 0 && (
                  <View style={styles.list}>
                    <ThemedText
                      type="smallBold"
                      themeColor="textSecondary"
                      style={styles.groupHeading}>
                      {t('history.groups.completed')}
                    </ThemedText>
                    {buckets.completed.map((card) => (
                      <JourneyCard
                        key={card.view.id}
                        view={card.view}
                        dream={card.dream}
                        bucket="completed"
                      />
                    ))}
                  </View>
                )}
                {buckets.stopped.length > 0 && (
                  <View style={styles.list}>
                    <ThemedText
                      type="smallBold"
                      themeColor="textSecondary"
                      style={styles.groupHeading}>
                      {t('history.groups.stopped')}
                    </ThemedText>
                    {buckets.stopped.map((card) => (
                      <JourneyCard
                        key={card.view.id}
                        view={card.view}
                        dream={card.dream}
                        bucket="completed"
                      />
                    ))}
                  </View>
                )}
              </View>
            )
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

  // A CANCELED Journey shares the History surface with completed ones, but it must never read as a
  // success: no percentage, no progress bar, no DONE pill, no completion framing (Journey Abandonment
  // PRD §8.2 / Friend Profile PRD §4.2). `status` is what it IS; `bucket` is only where it is listed.
  const canceled = view.status === 'abandoned';
  const completed = bucket === 'completed' && !canceled;
  const future = bucket === 'future';
  // A paused (frozen) Journey lives under the Active tab; a pill marks it so it reads apart from the
  // running ones (J3). `view.status` is the authoritative lifecycle field.
  const paused = view.status === 'frozen';
  const pct = Math.round(Math.max(0, Math.min(1, view.progress)) * 100);

  // The canceled card's one honest line, straight from the snapshot the cancel latched: "3 of 12
  // Steps done", never "Milestone 4 of 4" (which would read like an achievement).
  const sub = canceled
    ? t('card.stepsDone', { done: view.doneSteps, total: view.totalSteps })
    : completed
      ? t('card.milestoneComplete', { phases: view.phases })
      : t('card.milestone', { phase: view.phase, phases: view.phases });

  // A canceled Journey's footer is the day it was stopped — read from the stamp the cancel latched,
  // never projected. One canceled before that stamp existed shows no footer at all rather than an
  // invented date (undefined here = no footer row below).
  const foot = canceled
    ? view.endedAt != null
      ? t('card.stopped', { date: shortDate(view.endedAt) })
      : undefined
    : completed
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
        style={[
          styles.card,
          { borderColor: theme.hairline },
          (completed || canceled) && styles.completedCard,
        ]}>
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
          {/* State pill only where it adds info: DONE on Completed, CANCELED on a stopped Journey,
              SOON on Future, PAUSED on a frozen Journey. A plain running Journey shows no pill (the
              Active tab already says so). CANCELED comes from the shared {@link CanceledPill} — the
              one definition of that tag, so it reads identically here and under the Journey's Dream. */}
          {canceled ? (
            <CanceledPill />
          ) : completed || future || paused ? (
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

        {/* No bar and no percentage on a canceled Journey — the honest "N of M Steps done" line
            above is the whole measure (PRD §4.5). A Future Journey has nothing to show yet. */}
        {!future && !canceled && (
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

        {/* The footer carries a date or a projection. A canceled Journey gets its stop date and
            never an "ends in…" projection — and nothing at all when that date is unknown. */}
        {foot != null && (
          <View style={[styles.foot, { borderTopColor: theme.hairline }]}>
            <ThemedText type="small" themeColor="textMuted">
              {foot}
            </ThemedText>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dreamsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
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
  historyGroups: {
    gap: Spacing.four,
  },
  groupHeading: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  parkedHeading: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
