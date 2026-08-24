/**
 * Settings › What the coach remembers — the same consent, available again.
 *
 * ── WHY THIS SCREEN SHOWS THE ONBOARDING TEXT ──────────────────────────────────────────────────
 *
 * It reads its bullets from the `onboarding` namespace on purpose. A consent is agreement to
 * WORDS, and two screens describing the same promise in two slightly different ways is how the
 * words people agreed to stop matching the words we keep. One text, two places to read it.
 *
 * ── AND WHY TURNING IT OFF SAYS "AND DELETE" ───────────────────────────────────────────────────
 *
 * Because that is what happens (PRD §4/§11). Stopping future writes while keeping what was already
 * collected is the shape of promise nobody means, so the button says the true thing and the core
 * does it in the same breath.
 *
 * Presentational (Engineering Bible §19): the decision and the deletion both live in AppCore.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';

export default function CoachMemoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation('settings');
  const { core, snapshot } = useApp();

  // `snapshot` is read so the screen re-renders after the answer is recorded.
  void snapshot;
  const active = core.coachMemoryActive();
  const points = t('coachMemory.points', { ns: 'onboarding', returnObjects: true }) as string[];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back', { ns: 'common' })}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('app.coachMemory')}</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="default" themeColor="textSecondary">
            {t('coachMemory.body', { ns: 'onboarding' })}
          </ThemedText>

          {points.map((point) => (
            <ThemedText key={point} type="small" themeColor="textSecondary">
              {`· ${point}`}
            </ThemedText>
          ))}

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <ThemedText type="smallBold">
              {active ? t('app.coachMemoryOnNow') : t('app.coachMemoryOffNow')}
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={active ? t('app.coachMemoryTurnOff') : t('app.coachMemoryTurnOn')}
            onPress={() =>
              core.setCoachMemoryConsent(active ? 'withdrawn' : 'granted', i18n.language)
            }
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: active ? theme.backgroundElement : theme.tint, borderColor: active ? theme.danger : theme.tint },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: active ? theme.danger : theme.backgroundElement }}>
              {active ? t('app.coachMemoryTurnOff') : t('app.coachMemoryTurnOn')}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: { padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1 },
  cta: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
