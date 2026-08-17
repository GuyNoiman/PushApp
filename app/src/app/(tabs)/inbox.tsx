/**
 * Inbox — the messages surface, an Instagram-DM layout with our category tabs
 * restored (founder feedback 2026-08-07, reversing the previous Primary/Requested
 * split). A header ("Inbox" + a "New message" pill that is honest about messaging
 * still being deferred, see ComposeButton below), a rounded
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
 * When a list's real data is empty, that tab shows a calm empty state; Groups has
 * no POC data and shows its own empty state.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InboxEmpty } from '@/components/inbox/InboxEmpty';
import { InboxRow, type InboxRowData } from '@/components/inbox/InboxRow';
import { InboxTabs, type InboxTab, type InboxTabKey } from '@/components/inbox/InboxTabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabScrollView } from '@/components/ui/TabScrollView';
import { BottomTabInset, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { AllyProgress, Cheer, Friend, SocialProfile } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
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
  const router = useRouter();
  const { t } = useTranslation('inbox');
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
      const name = from ? friendName(from) : t('aBuddy');
      return {
        id: `cheer:${cheer.id}`,
        name,
        preview: cheer.kind === 'nudge' ? t('preview.nudge') : t('preview.cheer'),
        timestamp: relativeTime(cheer.createdAt, t),
        unread: true,
        // Only when the sender resolves to someone in the Support Circle — a cheer from an
        // unknown/removed sender has no profile to open.
        profileId: from?.status === 'accepted' ? from.profile.id : undefined,
      };
    });

    const buddies: InboxRowData[] = accepted.map((f) => ({
      id: `friend:${f.profile.id}`,
      name: friendName(f),
      preview: t('preview.inCircle'),
      profileId: f.profile.id,
    }));

    // Unread (cheers) sort to the top (Inbox_Screen.md).
    return [...cheers, ...buddies];
  }, [social.incomingCheers, social.friends, accepted, t]);

  // ALLIES — Journeys the user is an Ally of: a friend's shared progress.
  const alliesRowsReal = useMemo<InboxRowData[]>(
    () =>
      social.allyProgress.map((ap: AllyProgress) => ({
        id: `ally:${ap.journeyId}`,
        name: profileName(ap.owner),
        preview: ap.title
          ? t('preview.journeyProgress', { title: ap.title, pct: Math.round(ap.progress * 100) })
          : t('preview.sharingJourney', { pct: Math.round(ap.progress * 100) }),
        timestamp: relativeTime(ap.updatedAt, t),
      })),
    [social.allyProgress, t],
  );

  // REQUESTED — incoming connection requests, each actionable.
  const requestedRowsReal = useMemo<InboxRowData[]>(
    () =>
      incoming.map((f) => ({
        id: `req:${f.profile.id}`,
        name: friendName(f),
        preview: t('preview.wantsToJoin'),
        unread: true,
        actions: [
          { label: t('accept'), onPress: () => void social.respondToFriend(f.profile.id, true) },
          {
            label: t('decline'),
            variant: 'ghost',
            onPress: () => void social.respondToFriend(f.profile.id, false),
          },
        ],
      })),
    [incoming, social, t],
  );

  // REQUESTED — incoming Support-Circle (Ally) invites, each actionable (D2). The preview states
  // exactly what accepting will expose (Encourager vs Companion), so the recipient consents knowingly.
  const allyInviteRowsReal = useMemo<InboxRowData[]>(
    () =>
      social.incomingAllyInvites.map((inv) => ({
        id: `allyreq:${inv.owner.id}:${inv.journeyId}`,
        name: profileName(inv.owner),
        preview: inv.bundle === 'companion' ? t('preview.allyCompanion') : t('preview.allyEncourager'),
        unread: true,
        actions: [
          {
            label: t('accept'),
            onPress: () => void social.respondToAllyInvite(inv.journeyId, inv.owner.id, true),
          },
          {
            label: t('decline'),
            variant: 'ghost',
            onPress: () => void social.respondToAllyInvite(inv.journeyId, inv.owner.id, false),
          },
        ],
      })),
    [social, t],
  );

  // Each tab reads its REAL data; an empty list shows the calm per-tab empty state below.
  const friendsRows = friendsRowsReal;
  const alliesRows = alliesRowsReal;
  // Friend requests + Ally invites share the Requested tab; both are real, actionable rows.
  const requestedRows = useMemo(
    () => [...requestedRowsReal, ...allyInviteRowsReal],
    [requestedRowsReal, allyInviteRowsReal],
  );

  const tabs: InboxTab[] = [
    { key: 'friends', label: t('tabs.friends'), unread: friendsRows.some((r) => r.unread) },
    { key: 'allies', label: t('tabs.allies') },
    { key: 'groups', label: t('tabs.groups') },
    { key: 'requested', label: t('tabs.requested'), count: requestedRows.length || undefined },
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
          <ThemedText type="title">{t('title')}</ThemedText>
          <ComposeButton
            onPress={() =>
              // Honest, not dead: it says what it can't do yet and offers the thing that DOES
              // exist today (a Cheer, from Circle).
              Alert.alert(t('comingSoon.title'), t('comingSoon.body'), [
                { text: t('comingSoon.openCircle'), onPress: () => router.push('/friends' as Href) },
                { text: t('close', { ns: 'common' }), style: 'cancel' },
              ])
            }
          />
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchField, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('search', { ns: 'common' })}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={t('searchA11y')}
              textAlign={isRTL() ? 'right' : 'left'}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {q ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('clearSearch', { ns: 'common' })}
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
              title={t('noMatches.title')}
              subtitle={t('noMatches.body', { query: query.trim() })}
            />
          ) : (
            <InboxEmpty
              emoji=""
              title={emptyTitle(selected, t)}
              subtitle={emptySubtitle(selected, t)}
            />
          )
        ) : (
          // Keyboard-safe: search filters this list, so the rows under the keyboard stay
          // reachable and a row opens on the first tap (Device QA A3).
          <TabScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}>
            {/* An accepted friend's row opens their Friend Profile (Friend_Profile_PRD §8
                criterion 1). A pending REQUEST row carries no profileId, so it stays inert —
                someone who hasn't accepted yet is not a friend whose profile may be opened. */}
            {visibleRows.map((row) => (
              <InboxRow
                key={row.id}
                row={row}
                onPress={row.profileId ? () => router.push(`/friend/${row.profileId}` as Href) : undefined}
              />
            ))}
          </TabScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * "New message" — one pill, icon AND label inside it, the same shape as Circle's Invite / Add
 * buttons (founder device pass 2026-08-17: the label used to sit outside a button that wasn't even
 * pressable).
 *
 * Direct messaging is deferred post-MVP (D29 / D40) and the Friend Profile PRD is explicit that we
 * must not ship a dead or misleading message action. So this is a REAL button that does a real
 * thing: it says plainly that messages aren't here yet and points at the way you can reach someone
 * today (a Cheer, from Circle). The a11y label carries "coming later" too, so a screen-reader user
 * knows BEFORE they press, not after.
 */
function ComposeButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation('inbox');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('newMessageA11y')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.composeButton,
        { backgroundColor: theme.tealTint },
        pressed && styles.pressed,
      ]}>
      <Ionicons name="create-outline" size={16} color={theme.tealStrong} />
      <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
        {t('newMessage')}
      </ThemedText>
    </Pressable>
  );
}

/** Translated title for an empty tab. */
function emptyTitle(tab: InboxTabKey, t: TFunction<'inbox'>): string {
  switch (tab) {
    case 'requested':
      return t('empty.requested.title');
    case 'allies':
      return t('empty.allies.title');
    case 'groups':
      return t('empty.groups.title');
    default:
      return t('empty.messages.title');
  }
}

/** Translated sub-line for an empty tab. */
function emptySubtitle(tab: InboxTabKey, t: TFunction<'inbox'>): string {
  switch (tab) {
    case 'requested':
      return t('empty.requested.subtitle');
    case 'allies':
      return t('empty.allies.subtitle');
    case 'groups':
      return t('empty.groups.subtitle');
    default:
      return t('empty.messages.subtitle');
  }
}

/** Compact relative time for a cheer's timestamp, e.g. "2h" · "1d" · "now". */
function relativeTime(ms: number, t: TFunction<'inbox'>): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return t('now');
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
  // Same pill as Circle's header buttons: icon + label inside one 44pt-tall target.
  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 44,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
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
