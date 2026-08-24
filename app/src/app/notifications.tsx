/**
 * The Notification Center — one calm, chronological place for the things other PEOPLE did.
 *
 * WHAT IT IS NOT is half the specification (PRD §1, §3): not a feed, not ranked, not infinite, and
 * not a second home for messages. A cheer, a nudge, a friend request and an invitation to support a
 * Journey are things somebody did FOR you and they belong here; a message belongs in the Inbox, and
 * the two counters must never claim the same object.
 *
 * SEEN IS WHAT YOU ACTUALLY SAW (PRD §7). A row becomes seen when it really enters the visible list,
 * not when the screen opens — so a badge does not empty itself because you glanced at the top of a
 * list of twenty. No dwell time is required: seeing it IS the event.
 *
 * A REQUEST STAYS ACTIONABLE AFTER IT IS SEEN. `new` and `unresolved` are different things, and
 * conflating them is how an app quietly loses somebody's question.
 *
 * THE ACTION HIERARCHY IS THE PRD's (§8): tapping the row IS the navigation, so there is no View
 * button; Accept is the one filled action and Decline is quiet text, never a red destructive twin.
 *
 * PRIVACY: a row carries ids and names, never a Journey title, a Step, a reflection or anything the
 * recipient is not currently authorised to see.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  buildNotifications,
  pruneReadIds,
  unreadNotificationCount,
  type AppNotification,
} from '@/core/social/notifications';
import { notificationReadStore } from '@/core/social/notificationReads';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useMirrorInvites } from '@/hooks/useMirrorInvites';
import { useSocial } from '@/state/SocialProvider';

export default function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation('notify');
  const social = useSocial();
  const mirrorInvites = useMirrorInvites();

  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(false);
  /** Ids whose row has actually been on screen this session — the seen rule of §7. */
  const seenThisSession = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await notificationReadStore.load();
      if (mounted) {
        setReadIds(stored);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const items = useMemo(
    () =>
      buildNotifications({
        receivedCheers: social.incomingCheers,
        friends: social.friends,
        incomingAllyInvites: social.incomingAllyInvites,
        mirrorInvites,
        readIds,
      }),
    [social.incomingCheers, social.friends, social.incomingAllyInvites, mirrorInvites, readIds],
  );

  /**
   * Mark a row seen because it was rendered into view. Batched into the stored set on unmount so a
   * scroll does not write to storage on every frame, and PRUNED so the set cannot grow forever.
   */
  const markSeen = useCallback((id: string) => {
    seenThisSession.current.add(id);
  }, []);

  useEffect(
    () => () => {
      if (seenThisSession.current.size === 0) return;
      const merged = new Set([...readIds, ...seenThisSession.current]);
      void notificationReadStore.save(pruneReadIds(merged, items));
    },
    [items, readIds],
  );

  const nameOf = useCallback(
    (actorId: string) => {
      const friend = social.friends.find((f) => f.profile.id === actorId);
      if (friend) return friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}`;
      const invite = social.incomingAllyInvites.find((i) => i.owner.id === actorId);
      if (invite) return invite.owner.buddySummary?.name?.trim() || `@${invite.owner.handle}`;
      return t('someone');
    },
    [social.friends, social.incomingAllyInvites, t],
  );

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, []);

  const unread = unreadNotificationCount(items);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={close}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText
              style={[
                styles.title,
                { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(22 * displayScale()) },
              ]}>
              {t('center.title')}
            </ThemedText>
            {unread > 0 ? (
              <ThemedText type="small" style={{ color: theme.tint }}>
                {t('center.newCount', { count: unread })}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.icon} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {ready && items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={28} color={theme.textMuted} />
              <ThemedText type="small" style={[styles.emptyText, { color: theme.textMuted }]}>
                {t('center.empty')}
              </ThemedText>
            </View>
          ) : null}

          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              name={nameOf(item.actorId)}
              onSeen={markSeen}
              onAccept={
                item.kind === 'friendRequest'
                  ? () => void social.respondToFriend(item.actorId, true)
                  : item.kind === 'allyInvite' && item.journeyId
                    ? () => void social.respondToAllyInvite(item.journeyId!, item.actorId, true)
                    : undefined
              }
              onDecline={
                item.kind === 'friendRequest'
                  ? () => void social.respondToFriend(item.actorId, false)
                  : item.kind === 'allyInvite' && item.journeyId
                    ? () => void social.respondToAllyInvite(item.journeyId!, item.actorId, false)
                    : undefined
              }
              onOpen={
                item.kind === 'mirrorInvite'
                  ? // A Mirror invitation is not an inline yes/no: the promise about what happens to
                    // what you write has to be read before you answer, so the row opens the screen
                    // that carries it (Notification Center PRD §8.2 — anything needing review opens
                    // detail instead of offering quick actions).
                    () => router.push('/mirror-answer' as never)
                  : item.actionable
                    ? undefined
                    : () => router.push(`/friends/${item.actorId}` as never)
              }
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * One row. It reports itself SEEN when it is laid out with a real height — the closest honest
 * approximation of "entered the viewport" without a virtualised list, and it errs toward NOT marking
 * (a row that never rendered never reports). Showing something twice is recoverable; hiding it is
 * not (PRD §7, storage-failure rule).
 */
function NotificationRow({
  item,
  name,
  onSeen,
  onAccept,
  onDecline,
  onOpen,
}: {
  item: AppNotification;
  name: string;
  onSeen: (id: string) => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onOpen?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('notify');

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (event.nativeEvent.layout.height > 0) onSeen(item.id);
    },
    [item.id, onSeen],
  );

  const body = t(`center.kinds.${item.kind}`, { name });
  const detail =
    item.kind === 'allyInvite' && item.bundle
      ? t(`center.bundles.${item.bundle}`)
      : undefined;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.row,
        {
          backgroundColor: item.read ? theme.backgroundElement : theme.backgroundSelected,
          borderColor: theme.hairline,
        },
      ]}>
      <Pressable
        accessibilityRole={onOpen ? 'button' : 'text'}
        accessibilityLabel={[body, detail, item.read ? undefined : t('center.new')]
          .filter(Boolean)
          .join('. ')}
        disabled={!onOpen}
        onPress={onOpen}
        style={({ pressed }) => [styles.rowMain, pressed && onOpen ? styles.pressed : null]}>
        <View style={[styles.avatar, { backgroundColor: theme.tealTint }]}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {name.replace('@', '').charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.rowText}>
          <ThemedText type="small" style={{ color: theme.text }}>{body}</ThemedText>
          {detail ? (
            <ThemedText type="small" style={{ color: theme.textMuted }}>{detail}</ThemedText>
          ) : null}
        </View>
        {!item.read ? <View style={[styles.dot, { backgroundColor: theme.tint }]} /> : null}
      </Pressable>

      {/* Accept is the one filled action; Decline is quiet text, never a red twin (PRD §8.2). */}
      {onAccept && onDecline ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('center.accept')}
            onPress={onAccept}
            style={({ pressed }) => [
              styles.accept,
              { backgroundColor: theme.tint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>{t('center.accept')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('center.decline')}
            onPress={onDecline}
            style={({ pressed }) => [styles.decline, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.textMuted }}>{t('center.decline')}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { padding: Spacing.two, minWidth: 38 },
  headerText: { flex: 1, alignItems: 'center' },
  title: { textAlign: 'center' },
  content: { padding: Spacing.three, gap: Spacing.two },
  row: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  accept: { flex: 1, borderRadius: Radius.button, paddingVertical: Spacing.two, alignItems: 'center' },
  decline: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
  emptyText: { textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
