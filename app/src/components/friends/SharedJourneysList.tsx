/**
 * SharedJourneysList — the Journeys THIS friend shared with THIS viewer (Friend_Profile_PRD §4.3).
 * Active only: an owner whose Journey is frozen, completed or gone has its published summary
 * withdrawn, so a non-Active Journey simply isn't in `allyProgress` to render.
 *
 * VIEWER SCOPING is the server's job, not ours: `ally_snapshots()` is SECURITY DEFINER and returns
 * only rows where the viewer is an accepted Ally AND still a friend, with the title already masked
 * to null for an Encourager bundle. This component narrows an already-authorized set to one owner
 * and renders it — it never filters for permission (PRD §7).
 *
 * Card language is the Journey card from the My Journeys tab (icon tile + title + the one teal
 * progress track), minus everything an Ally has no business seeing: no Milestone line, no Step
 * list, no end date. Deliberately NOT a second card language.
 *
 * Presentational only (Engineering Bible §19).
 */
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { AllyProgress } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';

export function SharedJourneysList({ journeys }: { journeys: readonly AllyProgress[] }) {
  const { t } = useTranslation('friendProfile');

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('shared.title')}
      </ThemedText>

      {journeys.length === 0 ? (
        <ThemedText type="small" themeColor="textMuted">
          {t('shared.empty')}
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {journeys.map((journey) => (
            <SharedJourneyCard key={journey.journeyId} journey={journey} />
          ))}
        </View>
      )}
    </View>
  );
}

/** One shared Journey: masked-or-real title, and the progress the owner chose to publish. */
function SharedJourneyCard({ journey }: { journey: AllyProgress }) {
  const theme = useTheme();
  const { t } = useTranslation('friendProfile');
  // A null title means the owner shared this as an Encourager and the SERVER masked it. Render our
  // own neutral placeholder rather than anything that could hint at the subject.
  const title = journey.title ?? t('shared.aJourney');
  const pct = Math.round(Math.max(0, Math.min(1, journey.progress)) * 100);

  return (
    <ThemedView
      type="backgroundElement"
      accessible
      accessibilityLabel={t('shared.progressA11y', { title, pct })}
      style={[styles.card, { borderColor: theme.hairline }]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconTile, { backgroundColor: theme.tealTint }]}>
          <Ionicons name="flag-outline" size={19} color={theme.teal} />
        </View>
        <ThemedText type="subtitle" numberOfLines={2} style={styles.cardTitle}>
          {title}
        </ThemedText>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.fill, { backgroundColor: theme.teal, width: `${pct}%` }]} />
        </View>
        <ThemedText type="smallBold" style={styles.pct}>
          {pct}%
        </ThemedText>
      </View>

      {journey.streak > 0 ? (
        <ThemedText type="small" themeColor="textMuted">
          {t('shared.streak', { days: journey.streak })}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    fontVariant: ['tabular-nums'],
  },
});
