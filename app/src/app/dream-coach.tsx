/**
 * The Dream conversation (Dream Management §5/§7, D40) — where Dreams are made and reshaped.
 *
 * There is no form here and there is not going to be one. A Dream is a sentence about who somebody
 * is becoming; the PRD's §7 has no edit, merge, remove or delete control anywhere, because a text
 * field invites fiddling with words while a conversation invites saying what actually changed.
 *
 * Reached from My Dreams ("talk about my Dreams") and from a Dream's own screen. What the coach
 * understood is applied as it goes (D40 removed the approval gate) and the small card under its
 * reply lists what LANDED — built from the applied changes, so a change the engine refused can never
 * appear on screen as something that happened.
 *
 * Presentational + local draft state; everything else is in {@link useDreamCoach}.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoachBubble } from '@/components/coach/CoachBubble';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { CoachInputBar } from '@/components/coach/CoachInputBar';
import { useDreamCoach } from '@/components/coach/useDreamCoach';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export default function DreamCoachScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation('dreams');
  const coach = useDreamCoach();
  const [draft, setDraft] = useState('');

  const barBottomInset = Math.max(BottomTabInset, insets.bottom);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleSend = useCallback(() => {
    const typed = draft.trim();
    if (typed.length === 0) return;
    setDraft('');
    coach.send(typed);
    scrollToEnd();
  }, [draft, coach, scrollToEnd]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backA11y')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/my-dreams' as Href))}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{t('coach.header')}</ThemedText>
        </View>

        <KeyboardSafeView
          style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.chat}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}>
            {coach.items.map((item, i) =>
              item.kind === 'changes' ? (
                <View
                  key={i}
                  style={[styles.changes, { borderColor: theme.hairline, backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">{t('coach.changed')}</ThemedText>
                  {item.lines.map((line) => (
                    <ThemedText key={line} type="small" themeColor="textSecondary">
                      {line}
                    </ThemedText>
                  ))}
                </View>
              ) : (
                <CoachBubble key={i} role={item.kind} text={item.text} />
              ),
            )}

            {coach.status === 'thinking' ? <CoachBubble role="coach" text={t('coach.thinking')} /> : null}
          </ScrollView>

          <CoachInputBar
            value={draft}
            placeholder={t('coach.placeholder')}
            bottomInset={barBottomInset}
            onChangeText={setDraft}
            onSend={handleSend}
          />
        </KeyboardSafeView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three - 2,
    borderBottomWidth: 1,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  chat: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two + 2,
  },
  changes: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.one,
  },
  pressed: { opacity: 0.7 },
});
