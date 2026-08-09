/**
 * EditCoachScreen — the coach-led EDIT surface for one Journey (task J1). Reached from the Journey
 * screen's pencil (route `/coach?mode=edit&journeyId=…`). It reuses the shared presentational coach
 * components and is driven ENTIRELY by {@link ./useJourneyEditCoach}: the transcript, a "thinking"
 * state during the one understanding call, the localized approval card, and an Apply / Adjust CTA bar.
 * Nothing mutates until the user taps Apply.
 *
 * i18n-aware: every user-facing string comes from `t()`; canonical terms (Journey / Step) are
 * preserved in the copy. Presentational + local draft state only — business logic lives in the hook
 * (Engineering Bible §19).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CoachBubble } from '@/components/coach/CoachBubble';
import { CoachEditProposalCard } from '@/components/coach/CoachEditProposalCard';
import { CoachInputBar } from '@/components/coach/CoachInputBar';
import { useJourneyEditCoach } from '@/components/coach/useJourneyEditCoach';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function EditCoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation('coach');
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();
  const coach = useJourneyEditCoach({ journeyId });

  const barBottomInset = Math.max(BottomTabInset, insets.bottom);

  /** The bottom input-bar draft (the free-text change request). */
  const [draft, setDraft] = useState('');

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleSend = useCallback(() => {
    const typed = draft.trim();
    if (typed.length === 0) return;
    setDraft('');
    coach.sendChange(typed);
    scrollToEnd();
  }, [draft, coach, scrollToEnd]);

  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/journey/${journeyId}`);
  }, [router, journeyId]);

  const headerBorder = useMemo(() => ({ borderBottomColor: theme.hairline }), [theme.hairline]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, headerBorder]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('closeConversation')}
            onPress={dismiss}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{t('edit.header')}</ThemedText>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.chat}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}>
            {coach.items.map((item, i) =>
              item.kind === 'coach' ? (
                <CoachBubble key={i} role="coach" text={item.text} />
              ) : (
                <CoachBubble key={i} role="user" text={item.text} />
              ),
            )}

            {coach.status === 'thinking' && <CoachBubble role="coach" text={t('edit.thinking')} />}

            {coach.proposal && coach.proposal.changes.length > 0 && (
              <CoachEditProposalCard changes={coach.proposal.changes} />
            )}
          </ScrollView>

          {/* Bottom region: the change-request input, or the Apply / Adjust bar once a proposal is ready. */}
          {coach.awaitingInput && (
            <CoachInputBar
              value={draft}
              placeholder={t('edit.placeholder')}
              bottomInset={barBottomInset}
              onChangeText={setDraft}
              onSend={handleSend}
            />
          )}

          {coach.proposal && (
            <View
              style={[
                styles.ctaBar,
                { backgroundColor: theme.background, paddingBottom: Spacing.three + barBottomInset },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('edit.apply')}
                onPress={coach.apply}
                style={({ pressed }) => [styles.ctaPrimary, { backgroundColor: theme.teal }, pressed && styles.pressed]}>
                <Ionicons name="checkmark" size={17} color={theme.backgroundElement} />
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
                  {t('edit.apply')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('edit.adjust')}
                onPress={coach.adjust}
                style={({ pressed }) => [styles.ctaSecondary, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('edit.adjust')}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three - 2,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chat: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two + 2,
  },
  ctaBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: Radius.card,
    shadowColor: '#14161C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ctaSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
