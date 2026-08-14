/**
 * My Dreams (Dream Management, D40) — the private, on-device list of the user's Dreams. A Dream is
 * who the user is becoming; each Journey is the finite work toward one. Opened from the Settings
 * profile area.
 *
 * VIEW-ONLY by design (D40): the coach OWNS Dream creation/editing, so there are deliberately no
 * add/edit/delete controls here — the user shapes Dreams through conversation, and this screen only
 * displays what the coach has formed. A calm first-run empty state explains that.
 *
 * Presentational only (Engineering Bible §19): reads `snapshot.dreams` + `snapshot.journeys` and
 * derives each Dream's linked-Journey count via the framework-free `core/dreams` selector. Dreams
 * are private data and never leave the device (PRD §8).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { visibleDreamJourneys } from '@/components/dreams/dreamView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { journeysForDream } from '@/core/dreams/dreams';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';

/** A list row = a Dream plus the count of Journeys linked to it (primary OR secondary). */
interface DreamRow {
  id: string;
  title: string;
  journeyCount: number;
}

export default function MyDreamsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { snapshot, core } = useApp();
  const { t } = useTranslation('dreams');

  const rows = useMemo<DreamRow[]>(() => {
    const journeys = snapshot?.journeys ?? [];
    return (snapshot?.dreams ?? []).map((dream) => ({
      id: dream.id,
      title: dream.title,
      // Counts exactly what the Dream detail LISTS (`visibleDreamJourneys`) — so a canceled Journey
      // with nothing done, which that screen doesn't show, is never counted here either.
      journeyCount: visibleDreamJourneys(
        journeysForDream(dream.id, journeys),
        core.getReasonLog(),
      ).length,
    }));
  }, [snapshot?.dreams, snapshot?.journeys, core]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backA11y')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name={isRTL() ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="title">{t('title')}</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {rows.length === 0 ? (
            <EmptyState title={t('empty.title')} body={t('empty.body')} intro={t('intro')} />
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
                {t('intro')}
              </ThemedText>
              <View style={styles.list}>
                {rows.map((row) => (
                  <DreamCard
                    key={row.id}
                    title={row.title}
                    journeyCount={row.journeyCount}
                    onPress={() => router.push(`/dream/${row.id}` as Href)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DreamCard({
  title,
  journeyCount,
  onPress,
}: {
  title: string;
  journeyCount: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('dreams');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('open', { title })}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.hairline }]}>
        <View style={[styles.iconTile, { backgroundColor: theme.tealTint }]}>
          <Ionicons name="sparkles-outline" size={19} color={theme.teal} />
        </View>
        <View style={styles.cardText}>
          <ThemedText type="subtitle" numberOfLines={2} style={styles.cardTitle}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {t('journeysCount', { count: journeyCount })}
          </ThemedText>
        </View>
        <Ionicons
          name={isRTL() ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={theme.textMuted}
        />
      </ThemedView>
    </Pressable>
  );
}

function EmptyState({ title, body, intro }: { title: string; body: string; intro: string }) {
  const theme = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        {intro}
      </ThemedText>
      <ThemedView type="backgroundElement" style={[styles.empty, { borderColor: theme.hairline }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.tealTint }]}>
          <Ionicons name="sparkles-outline" size={22} color={theme.teal} />
        </View>
        <ThemedText type="default">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          {body}
        </ThemedText>
      </ThemedView>
    </View>
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
  backButton: { padding: Spacing.one },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  intro: {
    lineHeight: 20,
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
  cardTitle: {
    lineHeight: 24,
  },
  emptyWrap: {
    gap: Spacing.four,
  },
  empty: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
