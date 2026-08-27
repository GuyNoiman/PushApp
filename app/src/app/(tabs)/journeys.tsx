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
import { Pressable, StyleSheet, View } from 'react-native';
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
import { TabScrollView } from '@/components/ui/TabScrollView';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  futureStartState,
  listFutureJourneys,
  type FutureStartState,
} from '@/core/journeys/futureJourneys';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/AppProvider';

// Active · History · Future — the segmented tabs (founder decision 2026-07-14).
// Active is the default landing tab. FUTURE is the "for later" surface, and it holds TWO different
// things that are deliberately never conflated (Future Journey Management §12, approved for this
// pass): real FUTURE JOURNEYS — complete, approved plans saved for later — as the primary content,
// and BELOW them, under their own "Ideas for later" heading, the parked goals the coach detected but
// the user didn't build (L1). A parked goal is an aspiration with no plan; a Future Journey is a
// finished plan with no start yet. They look different, they are grouped apart, and neither is ever
// presented as the other.
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
  /**
   * For a FUTURE Journey only: which not-started-yet state it is in, resolved by the pure selector
   * (scheduled for a day · its day has come around · no date at all). The card renders one calm start
   * line from it and never a projection.
   */
  futureStart?: FutureStartState;
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
    // The Future list's ORDER is owned by the pure selector (§7: scheduled by nearest start, then the
    // manual-start ones) — the screen never re-sorts it, so the tab and the Coach can never disagree.
    const future = listFutureJourneys(snapshot?.journeys ?? []).map((j) => ({
      view: toJourneyView(j, now),
      dream: j.dreamId ? dreamNameById.get(j.dreamId) : undefined,
      futureStart: futureStartState(j, now),
    }));
    return {
      active: cards.filter((c) => c.view.bucket === 'active'),
      // The History tab's two groups. `bucket` says WHERE a Journey is listed; `status` says what it
      // actually is — so a canceled (abandoned) Journey lands in History but never under Completed.
      completed: history.filter((c) => c.view.status !== 'abandoned'),
      stopped: history.filter((c) => c.view.status === 'abandoned'),
      history,
      future,
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
  // How full the Future list is (§10). At the review threshold the tab shows ONE calm line, and at
  // the cap it says so plainly. Neither ever blocks anything here: the cap is a focus mechanism, not
  // an error, so there is no warning colour, no icon, and nothing to dismiss.
  const capacity = snapshot?.futureCapacity;
  const capacityLine = capacity?.capReached
    ? t('future.capacity.full', { max: capacity.max })
    : capacity?.offerReview
      ? t('future.capacity.review', { count: capacity.count })
      : undefined;

  // The next thing this Journey is actually asking for. A card that says only "65%" tells you where
  // you are and not what to do; one line of the next Step turns the list into something you can act
  // on. First Step that is still open, in plan order — dropped Steps are out of scope, and a Journey
  // with nothing open (everything reported) simply shows no line.
  const nextStepTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const journey of snapshot?.journeys ?? []) {
      const next = journey.steps.find((step) => !step.done && !step.dropped);
      if (next) map.set(journey.id, next.title);
    }
    return map;
  }, [snapshot?.journeys]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Two rows since 2026-08-24. With both actions carrying a word, the title and the subtitle
            no longer fit beside them, and the subtitle wrapped mid-phrase for no reason (founder).
            The subtitle now owns a full-width line under the title, where it cannot be squeezed. */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText type="display" numberOfLines={1} style={styles.headerTitle}>
              {t('title')}
            </ThemedText>
            <View style={styles.headerActions}>
            {/* My Dreams entry (T0-a) — Dreams are the "who I'm becoming" behind these Journeys.
                It CARRIES ITS WORD now: an icon-only button here was unreadable, and its sparkles
                glyph was the same one two tools use (founder, 2026-08-24). */}
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
              <Ionicons name="telescope-outline" size={18} color={theme.teal} />
              <ThemedText type="smallBold" style={{ color: theme.teal }}>
                {t('dreams')}
              </ThemedText>
            </Pressable>
            {/* THE MANUAL "NEW JOURNEY" BUTTON IS HIDDEN (founder, 2026-08-28).
                A Journey built by hand skips everything that makes a plan fit a person: the
                understanding, the diagnosis, the authored library, the variant match, the pace
                bounded by what they said they have. It also cannot be shared as Companion, because
                its Step titles are the user's own words. While the coach IS the way in — which is
                what the onboarding revision just made true — offering a second door that leads to a
                worse plan is offering people a way to get less.
                The route, the wizard and every test of it are UNTOUCHED: it is still reachable and
                still works, and bringing the button back is deleting this comment. */}
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.headerSubtitle}>
            {t('subtitle')}
          </ThemedText>
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

        {/* Tab-aware: tapping this tab while already on it returns the page to the top. */}
        <TabScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'future' ? (
            buckets.future.length === 0 && parkedGoals.length === 0 ? (
              <EmptyState title={t('future.empty.title')} body={t('future.empty.body')} />
            ) : (
              <View style={styles.groups}>
                {/* The Future Journeys themselves — the primary content, as full cards. Unheaded:
                    the tab already says Future, and a second heading here would compete with the
                    one below that keeps the parked ideas distinct. */}
                {buckets.future.length > 0 && (
                  <View style={styles.list}>
                    {buckets.future.map((card) => (
                      <JourneyCard
                        key={card.view.id}
                        view={card.view}
                        dream={card.dream}
                        bucket="future"
                        futureStart={card.futureStart}
                      />
                    ))}
                  </View>
                )}
                {capacityLine != null && buckets.future.length > 0 && (
                  <ThemedText type="small" themeColor="textMuted" style={styles.capacityLine}>
                    {capacityLine}
                  </ThemedText>
                )}
                {/* Ideas for later — parked goals, under their own heading and their own card. An
                    idea has no plan behind it; a Future Journey does. Never merged into one list. */}
                {parkedGoals.length > 0 && (
                  <View style={styles.list}>
                    <ThemedText
                      type="smallBold"
                      themeColor="textSecondary"
                      style={styles.parkedHeading}>
                      {t('parked.heading')}
                    </ThemedText>
                    {parkedGoals.map((goal) => (
                      <ParkedGoalCard key={goal.id} goal={goal} />
                    ))}
                  </View>
                )}
              </View>
            )
          ) : activeTab === 'history' ? (
            buckets.history.length === 0 ? (
              <EmptyState title={t('history.empty.title')} body={t('history.empty.body')} />
            ) : (
              <View style={styles.groups}>
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
                <JourneyCard
                  key={card.view.id}
                  view={card.view}
                  dream={card.dream}
                  bucket="active"
                  nextStep={nextStepTitles.get(card.view.id)}
                />
              ))}
            </View>
          )}
        </TabScrollView>
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
  futureStart,
  nextStep,
}: {
  view: JourneyView;
  dream?: string;
  bucket: JourneyBucket;
  /** Present only on a Future card — which not-started-yet state to word the start line from. */
  futureStart?: FutureStartState;
  /** The next open Step's title, on a RUNNING Journey only — what this Journey is asking for now. */
  nextStep?: string;
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
  //
  // A FUTURE card's one line is its START instead: no Milestone count, because a Milestone count on
  // a Journey that hasn't begun reads as position inside a plan already underway (§7 "no progress
  // implying work has begun"). A scheduled start whose day has come around while activation was
  // blocked says "ready when you are" — never late, never overdue (§7).
  //
  // A running/completed card reads its position from the Journey's REAL Milestones (`view.milestone`,
  // shared with Home). A Journey that HAS no Milestones gets no line at all — `undefined` here, and
  // the row below is skipped — rather than a Milestone count conjured out of its Step count (A1).
  const milestone = view.milestone;
  const sub = future
    ? futureStart?.kind === 'scheduled'
      ? t('card.starts', { date: shortDate(futureStart.at) })
      : futureStart?.kind === 'ready'
        ? t('card.readyWhenYouAre')
        : t('card.startWhenReady')
    : canceled
      ? t('card.stepsDone', { done: view.doneSteps, total: view.totalSteps })
      : milestone === undefined
        ? undefined
        : completed
          ? t('card.milestoneComplete', { total: milestone.total })
          : t('card.milestone', { current: milestone.current, total: milestone.total });

  // A canceled Journey's footer is the day it was stopped — read from the stamp the cancel latched,
  // never projected. One canceled before that stamp existed shows no footer at all rather than an
  // invented date (undefined here = no footer row below).
  //
  // A FUTURE card has NO footer: its start already reads above, and an "ends in…" projection on a
  // Journey that hasn't started would invent a deadline out of nothing.
  const foot = future
    ? undefined
    : canceled
      ? view.endedAt != null
        ? t('card.stopped', { date: shortDate(view.endedAt) })
        : undefined
      : completed
        ? t('card.completed')
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
            <ThemedText type="displaySmall" numberOfLines={1} style={styles.cardTitle}>
              {view.title}
            </ThemedText>
          </View>
          {/* State pill only where it adds info: DONE on Completed, CANCELED on a stopped Journey,
              PLANNED on Future, PAUSED on a frozen Journey. A plain running Journey shows no pill (the
              Active tab already says so). CANCELED comes from the shared {@link CanceledPill} — the
              one definition of that tag, so it reads identically here and under the Journey's Dream.
              The Future chip carries a calendar glyph in the calm teal tint (§7 "a calendar/state
              indicator") — never the amber the app reserves for urgency: a plan saved for later is
              the opposite of urgent. */}
          {canceled ? (
            <CanceledPill />
          ) : future ? (
            <View style={[styles.statePill, styles.futureChip, { backgroundColor: theme.tealTint }]}>
              <Ionicons name="calendar-outline" size={11} color={theme.tealStrong} />
              <ThemedText type="smallBold" style={{ color: theme.tealStrong, fontSize: 10 }}>
                {t('card.planned')}
              </ThemedText>
            </View>
          ) : completed || paused ? (
            <View
              style={[
                styles.statePill,
                { backgroundColor: completed ? theme.backgroundSelected : theme.goldTint },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: completed ? theme.textMuted : theme.goldStrong,
                  fontSize: 10,
                }}>
                {completed ? t('card.done') : t('card.paused')}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Nothing to say — a Journey with no Milestones — shows nothing here. */}
        {sub != null && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
            {sub}
          </ThemedText>
        )}

        {/* What it is asking for next. Only on a running Journey: a finished one asks for nothing,
            a canceled one must never read as still going, and one that has not started has no next
            Step yet — it has a start date. */}
        {nextStep && !completed && !canceled && !future ? (
          <View style={styles.nextStep}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={theme.tealStrong} />
            <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
              {t('card.nextStep', { title: nextStep })}
            </ThemedText>
          </View>
        ) : null}

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
            never an "ends in…" projection — and nothing at all when that date is unknown.
            NO RULE ABOVE IT since 2026-08-24 (founder): the progress bar and the date are two lines
            of the same small card, and a line between them divided a thing that was never two. */}
        {foot != null && (
          <View style={styles.foot}>
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
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerTitle: { flexShrink: 1, minWidth: 0 },
  headerSubtitle: {},
  // The title and its line share a column so the actions stay pinned to the top of the block and do
  // not drift down when the subtitle wraps in a longer language.
  headerText: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dreamsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
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
  // A vertical stack of labelled groups — History's Completed/Stopped, and Future's Journeys +
  // Ideas for later.
  groups: {
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
  futureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  capacityLine: {
    paddingHorizontal: Spacing.one,
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
    marginTop: Spacing.two,
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
