/**
 * Inbox — the messages surface (v14 mockup screen-15). A header ("Inbox" + a mail
 * glyph), Friends · Allies · Groups sub-tabs (Friends default), and an IG-style
 * list of conversation rows: rounded tinted avatar, Baloo name, Inter preview +
 * muted timestamp, coral unread dot. Unread rows sort to the top and a tab that
 * holds an unread item wears a coral dot (Inbox_Screen.md).
 *
 * Presentational only (Engineering Bible §19): it reads SocialProvider state and
 * derives the list from REAL social data —
 *   · incoming friend REQUESTS (friends, direction 'incoming', status 'pending')
 *     surface under Friends as an actionable row (Accept / Decline).
 *   · accepted friends surface under Friends.
 *   · received CHEERS surface under Allies with the cheer text.
 * When the social pillar is off (no Supabase env) it shows a friendly empty state.
 * Groups is a themed placeholder — not a POC feature.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InboxEmpty } from '@/components/inbox/InboxEmpty';
import { InboxRow, type InboxRowData } from '@/components/inbox/InboxRow';
import { InboxTabs, type InboxTab, type InboxTabKey } from '@/components/inbox/InboxTabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Cheer, Friend } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';
import { useSocial } from '@/state/SocialProvider';

// A small warm palette for the initial-circle avatars, cycled by name so every
// person gets a stable, distinct tint (Design System §2 role accents).
const AVATAR_TINTS: { bg: string; ink: string }[] = [
  { bg: Colors.light.purpleTint, ink: Colors.light.purpleStrong },
  { bg: Colors.light.tealTint, ink: Colors.light.tealStrong },
  { bg: Colors.light.coralTint, ink: Colors.light.coralStrong },
  { bg: Colors.light.goldTint, ink: Colors.light.goldStrong },
  { bg: Colors.light.blueTint, ink: Colors.light.blueStrong },
  { bg: Colors.light.pinkTint, ink: Colors.light.pink },
];

function tintFor(seed: string): { bg: string; ink: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

/** A friend's display name: their Buddy name if set, else their @handle. */
function friendName(friend: Friend): string {
  return friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`;
}

export default function InboxScreen() {
  const social = useSocial();
  const theme = useTheme();
  const [selected, setSelected] = useState<InboxTabKey>('friends');

  // ── Derive each tab's rows from real social state ──────────────────────────
  const incoming = useMemo(
    () => social.friends.filter((f) => f.status === 'pending' && f.direction === 'incoming'),
    [social.friends],
  );
  const accepted = useMemo(
    () => social.friends.filter((f) => f.status === 'accepted'),
    [social.friends],
  );

  const friendRows = useMemo<InboxRowData[]>(() => {
    const requests: InboxRowData[] = incoming.map((f) => {
      const tint = tintFor(f.profile.id);
      return {
        id: `req:${f.profile.id}`,
        name: friendName(f),
        preview: 'Wants to join your Support Circle',
        unread: true,
        tint: tint.bg,
        tintInk: tint.ink,
        actions: [
          { label: 'Accept', onPress: () => void social.respondToFriend(f.profile.id, true) },
          {
            label: 'Decline',
            variant: 'ghost',
            onPress: () => void social.respondToFriend(f.profile.id, false),
          },
        ],
      };
    });

    const buddies: InboxRowData[] = accepted.map((f) => {
      const tint = tintFor(f.profile.id);
      return {
        id: `friend:${f.profile.id}`,
        name: friendName(f),
        preview: 'In your Support Circle · say hi 👋',
        tint: tint.bg,
        tintInk: tint.ink,
      };
    });

    // Unread (requests) sort to the top (Inbox_Screen.md).
    return [...requests, ...buddies];
  }, [incoming, accepted, social]);

  const allyRows = useMemo<InboxRowData[]>(() => {
    return social.incomingCheers.map((cheer: Cheer) => {
      const from = social.friends.find((f) => f.profile.id === cheer.fromId);
      const name = from ? friendName(from) : 'A Buddy';
      const tint = tintFor(cheer.fromId);
      return {
        id: `cheer:${cheer.id}`,
        name,
        preview: cheer.kind === 'nudge' ? 'Sent you a nudge 👊' : 'Cheered you on 🎉',
        timestamp: relativeTime(cheer.createdAt),
        unread: true,
        tint: tint.bg,
        tintInk: tint.ink,
      };
    });
  }, [social.incomingCheers, social.friends]);

  const tabs: InboxTab[] = [
    { key: 'friends', label: 'Friends', unread: friendRows.some((r) => r.unread) },
    { key: 'allies', label: 'Allies', unread: allyRows.some((r) => r.unread) },
    { key: 'groups', label: 'Groups' },
  ];

  const rows = selected === 'friends' ? friendRows : selected === 'allies' ? allyRows : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Inbox</ThemedText>
          <View style={[styles.headerButton, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
          </View>
        </View>

        {!social.enabled ? (
          <InboxEmpty
            emoji="✉️"
            title="Coming together"
            subtitle="Turn on the social pillar to see messages from your Friends, Allies, and Groups here."
          />
        ) : (
          <>
            <InboxTabs tabs={tabs} selected={selected} onSelect={setSelected} />

            {social.error && (
              <ThemedView type="backgroundElement" style={[styles.errorBanner, { borderColor: theme.hairline }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {social.error}
                </ThemedText>
              </ThemedView>
            )}

            {selected === 'groups' ? (
              <InboxEmpty
                emoji="👥"
                title="Groups are on the way"
                subtitle="Group chats will appear here once you're part of one. Nothing to see yet."
              />
            ) : rows.length === 0 ? (
              <InboxEmpty
                emoji={selected === 'allies' ? '🎉' : '💬'}
                title={selected === 'allies' ? 'No cheers yet' : 'No messages yet'}
                subtitle={
                  selected === 'allies'
                    ? 'When an Ally cheers your Journey, it lands right here.'
                    : 'Add a friend from the Friends tab and start your Support Circle.'
                }
              />
            ) : (
              <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}>
                {rows.map((row) => (
                  <InboxRow key={row.id} row={row} />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
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
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  list: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
