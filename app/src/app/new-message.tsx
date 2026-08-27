/**
 * New message — who do you want to write to.
 *
 * FRIENDS AND ALLIES FIRST (PRD §9), labelled by relationship for recognition only: the label says
 * why you might know the name, it does not change what happens when you tap it. Everyone opens the
 * same canonical conversation.
 *
 * WRITING TO SOMEBODY WHO HAS NOT AGREED IS EXPLAINED BEFORE IT HAPPENS, not after: the row says it
 * will become a request. Somebody who does not want to send a request should be able to know that
 * before they type, not discover it from a state badge afterwards.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayFont, displayScale } from '@/constants/displayFont';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL, START_TEXT_ALIGN } from '@/i18n/rtl';
import { useMessaging } from '@/state/MessagingProvider';
import { useSocial } from '@/state/SocialProvider';

export default function NewMessageScreen() {
  const theme = useTheme();
  const { t } = useTranslation('inbox');
  const social = useSocial();
  const messaging = useMessaging();
  const [query, setQuery] = useState('');

  /**
   * People this person already has a relationship with. An accepted friend and an Ally are both
   * "approved" for messaging: the recipient already agreed to be in contact, so a first message is a
   * message and not a request (PRD §7).
   */
  const people = useMemo(() => {
    const friends = social.friends
      .filter((f) => f.status === 'accepted')
      .map((f) => ({
        id: f.profile.id,
        name: f.profile.buddySummary?.name?.trim() || `@${f.profile.handle}`,
        relationship: t('newMessage.friend'),
        approved: true,
      }));
    const allies = social.allies
      .filter((a) => !friends.some((f) => f.id === a.id))
      .map((a) => ({
        id: a.id,
        name: a.buddySummary?.name?.trim() || `@${a.handle}`,
        relationship: t('newMessage.ally'),
        approved: true,
      }));
    return [...friends, ...allies];
  }, [social.friends, social.allies, t]);

  const q = query.trim().toLowerCase();
  const visible = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;

  const openWith = useCallback(
    async (userId: string, approved: boolean) => {
      const conversation = await messaging.conversationWith(userId, approved);
      if (conversation) router.replace(`/conversation/${conversation.id}` as never);
    },
    [messaging],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))}
            hitSlop={8}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.text} />
          </Pressable>
          <ThemedText
            style={[
              styles.title,
              { color: theme.text, fontFamily: displayFont(), fontSize: Math.round(20 * displayScale()) },
            ]}>
            {t('newMessage.title')}
          </ThemedText>
          <View style={styles.icon} />
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('newMessage.searchPlaceholder')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t('newMessage.searchPlaceholder')}
              style={[styles.searchInput, { color: theme.text, textAlign: START_TEXT_ALIGN }]}
            />
          </View>
        </View>

        <KeyboardSafeScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {visible.length === 0 ? (
            <ThemedText type="small" style={[styles.empty, { color: theme.textMuted }]}>
              {t('newMessage.empty')}
            </ThemedText>
          ) : (
            visible.map((person) => (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                accessibilityLabel={`${person.name}, ${person.relationship}`}
                onPress={() => void openWith(person.id, person.approved)}
                style={({ pressed }) => [
                  styles.person,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.avatar, { backgroundColor: theme.tealTint }]}>
                  <ThemedText type="smallBold" style={{ color: theme.tint }}>
                    {person.name.replace('@', '').charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.personText}>
                  <ThemedText type="smallBold" style={{ color: theme.text }}>{person.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>{person.relationship}</ThemedText>
                </View>
              </Pressable>
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
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  avatar: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  personText: { flex: 1, gap: Spacing.one },
  empty: { textAlign: 'center', paddingVertical: Spacing.five, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
