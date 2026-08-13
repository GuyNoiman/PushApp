/**
 * JourneyDreamLink — the gentle "Connect this Journey to a Dream" surface shown on an UNLINKED
 * Journey's detail screen (Dream Management, D40 — F1 first cut). It offers the user's EXISTING
 * Dreams as one-tap choices; picking one links the Journey to that Dream as its primary. When the
 * user has no Dreams yet it shows a calm empty variant that points to My Dreams — Dreams are
 * COACH-OWNED (D40), so there is deliberately NO create form here.
 *
 * Presentational only (Engineering Bible §19): it holds no business logic. The caller supplies the
 * Dreams to choose from and an `onLink(dreamId)` handler wired to `core.linkJourneyToDream`; the
 * engine owns the actual link + persistence. Renders nothing when there is nothing to offer only if
 * the caller decides so — the empty variant is intentional guidance, not a blank.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { Dream } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function JourneyDreamLink({
  dreams,
  onLink,
}: {
  dreams: Dream[];
  onLink: (dreamId: string) => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation('journey');

  // No Dreams yet → point to My Dreams / the coach, never a create form (Dreams are coach-owned).
  if (dreams.length === 0) {
    return (
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: theme.hairline }]}>
        <View style={styles.header}>
          <View style={[styles.iconTile, { backgroundColor: theme.tealTint }]}>
            <Ionicons name="sparkles-outline" size={18} color={theme.teal} />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="smallBold">{t('dream.emptyTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('dream.emptyBody')}
            </ThemedText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dream.emptyAction')}
          onPress={() => router.push('/my-dreams')}
          style={({ pressed }) => [
            styles.pointerRow,
            { borderColor: theme.hairline },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.tealStrong }}>
            {t('dream.emptyAction')}
          </ThemedText>
          <Ionicons
            name={isRTL() ? 'chevron-back' : 'chevron-forward'}
            size={16}
            color={theme.tealStrong}
          />
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.hairline }]}>
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: theme.tealTint }]}>
          <Ionicons name="sparkles-outline" size={18} color={theme.teal} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{t('dream.connectTitle')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('dream.connectBody')}
          </ThemedText>
        </View>
      </View>
      <View style={styles.choices}>
        {dreams.map((dream) => (
          <Pressable
            key={dream.id}
            accessibilityRole="button"
            accessibilityLabel={t('dream.connectA11y', { title: dream.title })}
            onPress={() => onLink(dream.id)}
            style={({ pressed }) => [
              styles.choiceRow,
              { borderColor: theme.hairline },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="default" numberOfLines={1} style={styles.choiceTitle}>
              {dream.title}
            </ThemedText>
            <Ionicons name="link-outline" size={18} color={theme.tealStrong} />
          </Pressable>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  choices: {
    gap: Spacing.two,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  choiceTitle: {
    flexShrink: 1,
  },
  pointerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
