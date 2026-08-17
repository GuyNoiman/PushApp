/**
 * Dream detail (Dream Management, D40) — one Dream in one place: its coach-formed title, its "why"
 * (the meaning behind it), and the Journeys linked to it, grouped by lifecycle state. Opened from
 * My Dreams; each linked Journey navigates to its own detail (`journey/[id]`).
 *
 * VIEW-ONLY by design (D40): the coach owns Dream wording and links, so there are no edit/merge/
 * remove controls here. GUARDRAILS (PRD §4.2): a Dream is NEVER "completed" — this screen shows no
 * progress %, no completion, no "Week X of Y", and no Milestone layer on the Dream itself. Only each
 * linked Journey carries its own state, shown as a group label.
 *
 * Presentational only (Engineering Bible §19): resolves the Dream from `snapshot.dreams` by id and
 * its linked Journeys via the framework-free `core/dreams` selector, then groups them with
 * `dreamView`. A missing id (stale link, removed Dream) shows a gentle not-found. Dreams are private
 * and never leave the device (PRD §8).
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { groupDreamJourneys } from '@/components/dreams/dreamView';
import { CanceledPill } from '@/components/journeys/CanceledPill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { journeysForDream } from '@/core/dreams/dreams';
import { useTheme } from '@/hooks/use-theme';
import { isolate, isRTL } from '@/i18n/rtl';
import { useApp } from '@/state/AppProvider';

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, core } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation('dreams');

  const dismiss = () => (router.canGoBack() ? router.back() : router.replace('/my-dreams' as Href));

  const dream = snapshot?.dreams.find((d) => d.id === id);

  if (!dream) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Header onBack={dismiss} eyebrow={t('detail.eyebrow')} title={t('detail.notFoundTitle')} backLabel={t('backA11y')} />
          <View style={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('detail.notFoundBody')}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // The reason log is what tells a canceled Journey's PARTIAL reports apart from nothing at all, so
  // it has to reach the visibility rule (founder, 2026-08-14). Without it a Journey the user worked
  // on partially would silently vanish from its Dream.
  const groups = groupDreamJourneys(
    journeysForDream(dream.id, snapshot?.journeys ?? []),
    Date.now(),
    core.getReasonLog(),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header onBack={dismiss} eyebrow={t('detail.eyebrow')} title={dream.title} backLabel={t('backA11y')} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* The Dream itself: title + its "why". Deliberately no progress/completion (guardrail). */}
          <ThemedView type="backgroundElement" style={[styles.dreamCard, { borderColor: theme.hairline }]}>
            <ThemedText type="title" style={styles.dreamTitle}>
              {dream.title}
            </ThemedText>
            {dream.description ? (
              <>
                <ThemedText type="smallBold" style={[styles.whyLabel, { color: theme.tealStrong }]}>
                  {t('detail.why')}
                </ThemedText>
                <ThemedText type="default" themeColor="textSecondary" style={styles.whyText}>
                  {dream.description}
                </ThemedText>
              </>
            ) : null}
          </ThemedView>

          {/* Linked Journeys, grouped by their own lifecycle state. */}
          <View style={styles.journeysBlock}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              {t('detail.journeys')}
            </ThemedText>

            {groups.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('detail.emptyJourneys')}
              </ThemedText>
            ) : (
              groups.map((group) => (
                <View key={group.state} style={styles.group}>
                  <ThemedText type="small" themeColor="textMuted" style={styles.groupLabel}>
                    {t(`status.${group.state}`)}
                  </ThemedText>
                  <View style={styles.groupList}>
                    {group.journeys.map((view) => (
                      <JourneyRow
                        key={view.id}
                        title={view.title}
                        canceled={group.state === 'canceled'}
                        onPress={() => router.push(`/journey/${view.id}`)}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * One linked Journey. A CANCELED Journey stays here as part of the Dream's record (founder decision,
 * 2026-08-14) and wears the shared "Canceled" tag — the same one the History tab shows, so it reads
 * identically wherever it appears. It carries no percentage, no bar and no completion styling here,
 * exactly like every other row on this screen: a Dream has no progress of its own (PRD §4.2).
 */
function JourneyRow({
  title,
  canceled,
  onPress,
}: {
  title: string;
  canceled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation('dreams');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('detail.openJourney', { title })}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={[styles.journeyRow, { borderColor: theme.hairline }]}>
        <View style={[styles.iconTile, { backgroundColor: theme.tealTint }]}>
          <Ionicons name="flag-outline" size={17} color={theme.teal} />
        </View>
        <ThemedText type="default" numberOfLines={2} style={styles.journeyTitle}>
          {title}
        </ThemedText>
        {canceled && <CanceledPill />}
        <Ionicons name={isRTL() ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.textMuted} />
      </ThemedView>
    </Pressable>
  );
}

/** Back chip + a small "DREAM" eyebrow over the Dream title. Mirrors the Journey-detail header. */
function Header({
  onBack,
  eyebrow,
  title,
  backLabel,
}: {
  onBack: () => void;
  eyebrow: string;
  title: string;
  backLabel: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backChip,
          { backgroundColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}>
        {/* '›' is a Bidi-MIRRORED character, so inside an RTL paragraph the renderer would
            flip it a second time; isolating pins it to its own run and the scaleX below is
            the only mirror. "Back" then always points to where we came from. */}
        <ThemedText
          type="subtitle"
          themeColor="textSecondary"
          style={[styles.backGlyph, { transform: [{ scaleX: isRTL() ? 1 : -1 }] }]}>
          {isolate('›')}
        </ThemedText>
      </Pressable>
      <View style={styles.headerText}>
        <ThemedText type="small" themeColor="textMuted" style={styles.eyebrow}>
          {eyebrow}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    lineHeight: 26,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  eyebrow: {
    letterSpacing: 1.5,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  dreamCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  dreamTitle: {
    lineHeight: 30,
  },
  whyLabel: {
    marginTop: Spacing.one,
  },
  whyText: {
    lineHeight: 22,
  },
  journeysBlock: {
    gap: Spacing.three,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
  },
  group: {
    gap: Spacing.two,
  },
  groupLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    paddingHorizontal: Spacing.one,
  },
  groupList: {
    gap: Spacing.two,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  journeyTitle: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
