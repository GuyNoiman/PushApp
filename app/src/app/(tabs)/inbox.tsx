/**
 * Inbox — the messages surface, an Instagram-DM layout with our category tabs
 * restored (founder feedback 2026-08-07, reversing the previous Primary/Requested
 * split). A header ("Inbox" + a clearly-labelled compose button), a rounded
 * search field, and a four-tab switch:
 *   · FRIENDS   — accepted friends + received cheers / nudges (the conversations).
 *   · ALLIES    — Journeys the user is an Ally of (a friend's shared progress).
 *   · GROUPS    — group threads (not a POC feature yet → calm empty state).
 *   · REQUESTED — incoming connection requests, each an actionable row
 *     (Accept / Decline), mirroring IG's message requests.
 * Rows are clean IG-DM lines — a round monogram avatar, name, preview, tabular
 * timestamp, unread dot. The search field filters the current list by name,
 * client-side (no backend).
 *
 * Presentational only (Engineering Bible §19): it reads SocialProvider state and
 * derives each list from REAL social data —
 *   · incoming friend REQUESTS surface under Requested (Accept / Decline).
 *   · accepted friends + received CHEERS / nudges surface under Friends.
 *   · Journeys the user is an Ally of surface under Allies.
 * When a list's real data is empty it falls back to the dev sample (`sampleInbox`
 * / `sampleDeservePraise`, via `useSampleWhenEmpty`) so the surface always reads
 * populated; Groups has no POC data and shows a calm empty state.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InboxEmpty } from '@/components/inbox/InboxEmpty';
import { InboxRow, type InboxRowData } from '@/components/inbox/InboxRow';
import { InboxTabs, type InboxTab, type InboxTabKey } from '@/components/inbox/InboxTabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { AllyProgress, Cheer, Friend, SocialProfile } from '@/core/social';
import {
  sampleDeservePraise,
  sampleInbox,
  useSampleWhenEmpty,
  type SampleFriend,
  type SampleInboxItem,
} from '@/dev/sampleSocial';
import { useTheme } from '@/hooks/use-theme';
import { useSocial } from '@/state/SocialProvider';

/** A friend's display name: their Buddy name if set, else their @handle. */
function friendName(friend: Friend): string {
  return profileName(friend.profile);
}

/** A profile's display name: their Buddy name if set, else their @handle. */
function profileName(profile: SocialProfile): string {
  return profile.buddySummary?.name?.trim() || `@${profile.handle}`;
}

export default function InboxScreen() {
  const social = useSocial();
  const theme = useTheme();
  const [selected, setSelected] = useState<InboxTabKey>('friends');
  const [query, setQuery] = useState('');

  // ── Derive each list's rows from real social state ─────────────────────────
  const incoming = useMemo(
    () => social.friends.filter((f) => f.status === 'pending' && f.direction === 'incoming'),
    [social.friends],
  );
  const accepted = useMemo(
    () => social.friends.filter((f) => f.status === 'accepted'),
    [social.friends],
  );

  // FRIENDS — accepted friends + received cheers / nudges (the conversations).
  const friendsRowsReal = useMemo<InboxRowData[]>(() => {
    const cheers: InboxRowData[] = social.incomingCheers.map((cheer: Cheer) => {
      const from = social.friends.find((f) => f.profile.id === cheer.fromId);
      const name = from ? friendName(from) : 'A Buddy';
      return {
        id: `cheer:${cheer.id}`,
        name,
        preview: cheer.kind === 'nudge' ? 'Sent you a nudge' : 'Cheered you on',
        timestamp: relativeTime(cheer.createdAt),
        unread: true,
      };
    });

    const buddies: InboxRowData[] = accepted.map((f) => ({
      id: `friend:${f.profile.id}`,
      name: friendName(f),
      preview: 'In your Support Circle',
    }));

    // Unread (cheers) sort to the top (Inbox_Screen.md).
    return [...cheers, ...buddies];
  }, [social.incomingCheers, social.friends, accepted]);

  // ALLIES — Journeys the user is an Ally of: a friend's shared progress.
  const alliesRowsReal = useMemo<InboxRowData[]>(
    () =>
      social.allyProgress.map((ap: AllyProgress) => ({
        id: `ally:${ap.journeyId}`,
        name: profileName(ap.owner),
        preview: ap.title
          ? `${ap.title} · ${Math.round(ap.progress * 100)}%`
          : `Sharing a Journey · ${Math.round(ap.progress * 100)}%`,
        timestamp: relativeTime(ap.updatedAt),
      })),
    [social.allyProgress],
  );

  // REQUESTED — incoming connection requests, each actionable.
  const requestedRowsReal = useMemo<InboxRowData[]>(
    () =>
      incoming.map((f) => ({
        id: `req:${f.profile.id}`,
        name: friendName(f),
        preview: 'Wants to join your Support Circle',
        unread: true,
        actions: [
          { label: 'Accept', onPress: () => void social.respondToFriend(f.profile.id, true) },
          {
            label: 'Decline',
            variant: 'ghost',
            onPress: () => void social.respondToFriend(f.profile.id, false),
          },
        ],
      })),
    [incoming, social],
  );

  // ── Fall back to the dev sample per-list so the tabs read populated (founder
  // feedback). Sample rows carry no real target — their inline actions are inert
  // placeholders, never persisted or sent. Groups has no POC data → empty state. ──
  const sampleFriendsRows = useMemo<InboxRowData[]>(
    () => sampleInbox.filter((s) => s.kind !== 'request').map((s) => sampleRow(s)),
    [],
  );
  const sampleAlliesRows = useMemo<InboxRowData[]>(
    () => sampleDeservePraise.map((f) => sampleAllyRow(f)),
    [],
  );
  const sampleRequestedRows = useMemo<InboxRowData[]>(
    () =>
      sampleInbox
        .filter((s) => s.kind === 'request')
        .map((s) =>
          sampleRow(s, [
            { label: 'Accept', onPress: () => {} },
            { label: 'Decline', variant: 'ghost', onPress: () => {} },
          ]),
        ),
    [],
  );

  const friendsRows = useSampleWhenEmpty(friendsRowsReal, sampleFriendsRows);
  const alliesRows = useSampleWhenEmpty(alliesRowsReal, sampleAlliesRows);
  const requestedRows = useSampleWhenEmpty(requestedRowsReal, sampleRequestedRows);

  const tabs: InboxTab[] = [
    { key: 'friends', label: 'Friends', unread: friendsRows.some((r) => r.unread) },
    { key: 'allies', label: 'Allies' },
    { key: 'groups', label: 'Groups' },
    { key: 'requested', label: 'Requested', count: requestedRows.length || undefined },
  ];

  const rows =
    selected === 'friends'
      ? friendsRows
      : selected === 'allies'
        ? alliesRows
        : selected === 'requested'
          ? requestedRows
          : []; // groups — no POC data yet

  // Client-side name filter (Instagram-style search — no backend).
  const q = query.trim().toLowerCase();
  const visibleRows = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Inbox</ThemedText>
          <View style={styles.compose}>
            <View style={[styles.composeButton, { backgroundColor: theme.tealTint }]}>
              <Ionicons name="create-outline" size={20} color={theme.tint} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              New message
            </ThemedText>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchField, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search messages by name"
              style={[styles.searchInput, { color: theme.text }]}
            />
            {q ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <InboxTabs tabs={tabs} selected={selected} onSelect={setSelected} />

        {social.error && (
          <ThemedView
            type="backgroundElement"
            style={[styles.errorBanner, { borderColor: theme.hairline }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {social.error}
            </ThemedText>
          </ThemedView>
        )}

        {visibleRows.length === 0 ? (
          q ? (
            <InboxEmpty
              emoji=""
              title="No matches"
              subtitle={`No conversations match "${query.trim()}".`}
            />
          ) : (
            <InboxEmpty emoji="" title={emptyTitle(selected)} subtitle={emptySubtitle(selected)} />
          )
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {visibleRows.map((row) => (
              <InboxRow key={row.id} row={row} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Map a dev-sample inbox item to a presentational row. */
function sampleRow(item: SampleInboxItem, actions?: InboxRowData['actions']): InboxRowData {
  return {
    id: `sample:${item.id}`,
    name: item.name,
    initials: item.initials,
    preview: item.text.charAt(0).toUpperCase() + item.text.slice(1),
    timestamp: item.when,
    unread: true,
    actions,
  };
}

/** Map a dev-sample friend to an Allies row (a friend whose Journey you support). */
function sampleAllyRow(friend: SampleFriend): InboxRowData {
  return {
    id: `sample-ally:${friend.id}`,
    name: friend.name,
    initials: friend.initials,
    preview: friend.status,
  };
}

/** Baloo title for an empty tab. */
function emptyTitle(tab: InboxTabKey): string {
  switch (tab) {
    case 'requested':
      return 'No requests';
    case 'allies':
      return 'No Allies yet';
    case 'groups':
      return 'No groups yet';
    default:
      return 'No messages yet';
  }
}

/** Muted sub-line for an empty tab. */
function emptySubtitle(tab: InboxTabKey): string {
  switch (tab) {
    case 'requested':
      return 'When someone asks to join your Support Circle, it lands here.';
    case 'allies':
      return 'When a friend makes you an Ally on a Journey, their progress shows here.';
    case 'groups':
      return "Group threads aren't here yet. This is where your Circle's shared spaces will live.";
    default:
      return 'Add a friend from your Circle and start your Support Circle.';
  }
}

/** Compact relative time for a cheer's timestamp, e.g. "2h" · "1d" · "now". */
function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
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
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    paddingVertical: 0,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  list: {
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
