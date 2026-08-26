/**
 * One conversation — the thread, and the only screen in the app that renders a private message.
 *
 * WHAT IT SHOWS AND WHAT IT WILL NOT. Received bubbles at the logical start, own at the logical end,
 * so it mirrors correctly in Hebrew without a single hard-coded left or right. Sent and Read sit
 * quietly under the newest own message; a REQUEST never shows Read, because the sender is not
 * entitled to know whether somebody read something they did not agree to receive (PRD §10.2).
 *
 * A MESSAGE THAT CANNOT BE OPENED says so. It never renders ciphertext, and it never pretends the
 * message was something else (PRD §20).
 *
 * The encryption note appears once and quietly. A permanent banner about privacy is an advertisement
 * for privacy, and it eats the conversation (design contract §3).
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  APPROVED_MESSAGE_MAX_CHARS,
  deliveryStateOf,
  REQUEST_MESSAGE_MAX_CHARS,
  type DirectMessage,
} from '@/core/messaging';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useAuth } from '@/state/AuthProvider';
import { useMessaging } from '@/state/MessagingProvider';
import { useSocial } from '@/state/SocialProvider';

export default function ConversationScreen() {
  const theme = useTheme();
  const { t } = useTranslation('inbox');
  const { id } = useLocalSearchParams<{ id: string }>();
  const messaging = useMessaging();
  const social = useSocial();
  const { user } = useAuth();
  const me = user?.id ?? '';

  const [draft, setDraft] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);

  const conversation = useMemo(
    () => [...messaging.chats, ...messaging.requests].find((c) => c.id === id),
    [messaging.chats, messaging.requests, id],
  );

  const otherId = conversation
    ? conversation.participantIds[0] === me
      ? conversation.participantIds[1]
      : conversation.participantIds[0]
    : '';

  const name = useMemo(() => {
    const friend = social.friends.find((f) => f.profile.id === otherId);
    return friend ? friend.profile.buddySummary?.name?.trim() || `@${friend.profile.handle}` : t('someone');
  }, [social.friends, otherId, t]);

  useEffect(() => {
    if (id) void messaging.openConversation(id);
    // Keyed on the id alone: re-running on every provider change would re-fetch on each message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Mark read what is on screen. Only incoming, and only in an APPROVED conversation — a request
  // must not leak a read receipt (PRD §8.3).
  useEffect(() => {
    if (!conversation || conversation.permission !== 'approved') return;
    const unread = messaging.messages.filter((m) => m.senderId !== me && m.readAt === undefined);
    if (unread.length > 0) void messaging.markRead(conversation.id, unread.map((m) => m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messaging.messages, conversation?.permission]);

  const onSend = useCallback(async () => {
    if (!conversation) return;
    const result = await messaging.send(conversation, draft);
    if (result === null) {
      setDraft('');
      setRefusal(null);
      return;
    }
    setRefusal(
      result.reason === 'rateLimited'
        ? t('send.rateLimited', { time: new Date(result.retryAt).toLocaleTimeString() })
        : result.reason === 'tooLong'
          ? t('send.tooLong', { max: result.max })
          : t(`send.${result.reason}`),
    );
  }, [conversation, draft, messaging, t]);

  const isRequest = conversation?.permission === 'requested';
  const maxChars = isRequest ? REQUEST_MESSAGE_MAX_CHARS : APPROVED_MESSAGE_MAX_CHARS;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={name}
            onPress={() => otherId && router.push(`/friends/${otherId}` as never)}
            style={styles.headerIdentity}>
            <View style={[styles.avatar, { backgroundColor: theme.tealTint }]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {name.replace('@', '').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: theme.text }}>{name}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('conversation.more')}
            onPress={() =>
              conversation &&
              Alert.alert(name, undefined, [
                {
                  text: t('conversation.mute'),
                  onPress: () => void messaging.setMute(conversation.id, null),
                },
                {
                  text: t('conversation.block'),
                  style: 'destructive',
                  onPress: () => {
                    void messaging.block(conversation.id);
                    router.back();
                  },
                },
                { text: t('cancel', { ns: 'common' }), style: 'cancel' },
              ])
            }
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
          </Pressable>
        </View>

        <KeyboardSafeView
          style={styles.flex}
          keyboardVerticalOffset={8}>
          <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
            <ThemedText type="small" style={[styles.encryption, { color: theme.textMuted }]}>
              {t('conversation.encrypted')}
            </ThemedText>

            {isRequest ? (
              <View style={[styles.requestNote, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {t('request.privateToRead')}
                </ThemedText>
              </View>
            ) : null}

            {messaging.messages.map((message, index) => (
              <Bubble
                key={message.id}
                message={message}
                mine={message.senderId === me}
                showState={
                  message.senderId === me && index === messaging.messages.length - 1 && !isRequest
                }
              />
            ))}
          </ScrollView>

          {refusal ? (
            <ThemedText type="small" style={[styles.refusal, { color: theme.danger }]}>{refusal}</ThemedText>
          ) : null}

          <View style={[styles.composer, { borderTopColor: theme.hairline }]}>
            <TextInput
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                if (refusal) setRefusal(null);
              }}
              placeholder={t('conversation.placeholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={maxChars * 2}
              accessibilityLabel={t('conversation.placeholder')}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.hairline,
                  textAlign: START_TEXT_ALIGN,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('conversation.send')}
              accessibilityState={{ disabled: draft.trim().length === 0 }}
              disabled={draft.trim().length === 0}
              onPress={() => void onSend()}
              style={({ pressed }) => [
                styles.send,
                { backgroundColor: draft.trim().length === 0 ? theme.backgroundElement : theme.tint },
                pressed && styles.pressed,
              ]}>
              <Ionicons
                name={isRTL() ? 'arrow-back' : 'arrow-forward'}
                size={18}
                color={draft.trim().length === 0 ? theme.textMuted : theme.background}
              />
            </Pressable>
          </View>
        </KeyboardSafeView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Bubble({
  message,
  mine,
  showState,
}: {
  message: DirectMessage;
  mine: boolean;
  showState: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation('inbox');
  const state = deliveryStateOf(message, { showRead: true });

  return (
    <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirsRow]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? theme.tint : theme.backgroundElement,
            borderColor: mine ? theme.tint : theme.hairline,
          },
        ]}>
        {message.undecryptable ? (
          <ThemedText type="small" style={{ color: mine ? theme.background : theme.textMuted }}>
            {t('conversation.unavailable')}
          </ThemedText>
        ) : (
          <ThemedText type="small" style={{ color: mine ? theme.background : theme.text }}>
            {message.body}
          </ThemedText>
        )}
      </View>
      {showState ? (
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t(`conversation.state.${state}`)}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1, justifyContent: 'center' },
  icon: { padding: Spacing.two, minWidth: 38 },
  avatar: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  thread: { padding: Spacing.three, gap: Spacing.two },
  encryption: { textAlign: 'center', marginBottom: Spacing.two },
  requestNote: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three },
  bubbleRow: { gap: Spacing.one, maxWidth: '85%' },
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  refusal: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, textAlign: START_TEXT_ALIGN },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  send: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
