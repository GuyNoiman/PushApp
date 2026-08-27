/**
 * The Inbox — human correspondence, and nothing else.
 *
 * WHAT LEFT, and why it is the whole point of this rewrite (Inbox PRD §5). This screen used to mix
 * accepted friends, received cheers, Ally progress, friend requests and Support-Circle invitations.
 * None of those is a message. They are things other people DID, they now live in the Notification
 * Center, and the two surfaces never count the same object — which is the rule that lets a badge
 * mean something again.
 *
 * THREE TABS (§6.2): Chats · Groups, visible and locked · Requests. There is deliberately no Friends
 * tab and no Allies tab: somebody who is both would have had one conversation in two places, and the
 * type of a relationship never changed what a conversation is.
 *
 * GROUPS IS LOCKED, NOT HIDDEN. The founder wants the future space legible, so the tab is there,
 * dimmed, labelled, and tapping it explains rather than opening an empty list (§18).
 *
 * PRIVACY: this screen never asks the server to search a message body, and the search field filters
 * names only — bodies are sealed and stay that way (§6.3).
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InboxEmpty } from '@/components/inbox/InboxEmpty';
import { InboxRow, type InboxRowData } from '@/components/inbox/InboxRow';
import { InboxTabs, type InboxTab, type InboxTabKey } from '@/components/inbox/InboxTabs';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { unreadFor, type ConversationRow } from '@/core/messaging';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useAuth } from '@/state/AuthProvider';
import { useMessaging } from '@/state/MessagingProvider';
import { useSocial } from '@/state/SocialProvider';

export default function InboxScreen() {
  const theme = useTheme();
  const { t } = useTranslation('inbox');
  const messaging = useMessaging();
  const social = useSocial();
  const { user } = useAuth();
  const me = user?.id ?? '';

  const [selected, setSelected] = useState<InboxTabKey>('chats');
  const [query, setQuery] = useState('');

  const nameOf = useCallback(
    (conversation: ConversationRow) => {
      const otherId =
        conversation.participantIds[0] === me
          ? conversation.participantIds[1]
          : conversation.participantIds[0];
      const friend = social.friends.find((f) => f.profile.id === otherId);
      return friend
        ? friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`
        : t('someone');
    },
    [social.friends, me, t],
  );

  const chatRows = useMemo<InboxRowData[]>(
    () =>
      messaging.chats.map((conversation) => ({
        id: conversation.id,
        name: nameOf(conversation),
        preview: t('chats.preview'),
        unread: false,
      })),
    [messaging.chats, nameOf, t],
  );

  const requestRows = useMemo<InboxRowData[]>(
    () =>
      messaging.requests.map((conversation) => ({
        id: conversation.id,
        name: nameOf(conversation),
        preview: t('request.preview'),
        unread: true,
        actions: [
          {
            label: t('request.accept'),
            onPress: () => void messaging.approve(conversation.id),
          },
          {
            label: t('request.delete'),
            variant: 'ghost',
            onPress: () => void messaging.block(conversation.id),
          },
        ],
      })),
    [messaging, nameOf, t],
  );

  const tabs: InboxTab[] = [
    { key: 'chats', label: t('tabs.chats') },
    { key: 'groups', label: t('tabs.groups'), locked: true, lockedLabel: t('tabs.soon') },
    { key: 'requests', label: t('tabs.requests'), count: requestRows.length || undefined },
  ];

  const rows = selected === 'chats' ? chatRows : selected === 'requests' ? requestRows : [];
  const q = query.trim().toLowerCase();
  const visibleRows = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;

  const onSelectTab = useCallback(
    (key: InboxTabKey) => {
      if (key === 'groups') {
        // Explains rather than opening an empty list (PRD §18).
        Alert.alert(t('groups.title'), t('groups.body'));
        return;
      }
      setSelected(key);
    },
    [t],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <ThemedText
            style={[
              styles.title,
              { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(22 * displayScale()) },
            ]}>
            {t('title')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('compose')}
            onPress={() => router.push('/new-message' as never)}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name="create-outline" size={22} color={theme.tint} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t('searchPlaceholder')}
              style={[styles.searchInput, { color: theme.text, textAlign: START_TEXT_ALIGN }]}
            />
          </View>
        </View>

        <InboxTabs tabs={tabs} selected={selected} onSelect={onSelectTab} />

        <KeyboardSafeScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {visibleRows.length === 0 ? (
            <InboxEmpty
              emoji={selected === 'requests' ? '📬' : '💬'}
              title={selected === 'requests' ? t('empty.requests.title') : t('empty.chats.title')}
              subtitle={selected === 'requests' ? t('empty.requests.body') : t('empty.chats.body')}
            />
          ) : (
            visibleRows.map((row) => (
              <InboxRow
                key={row.id}
                row={row}
                onPress={() => router.push(`/conversation/${row.id}` as never)}
              />
            ))
          )}
        </KeyboardSafeScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  icon: { padding: Spacing.two, minWidth: 38 },
  title: { flex: 1, textAlign: 'center' },
  searchWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: Spacing.three, gap: Spacing.two },
  pressed: { opacity: 0.75 },
});
