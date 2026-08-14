/**
 * RelationshipSummaryCard — the compact relationship summary (Friend_Profile_PRD §4.2): how many
 * Journeys each of you opened to the other, and the total.
 *
 * COPY DISCIPLINE (deliberate): counts only. No "completed", no "finished", no achievement framing,
 * no ranking — §4.2 specifically warns that an Abandoned Journey must never read as a success, and
 * the lifecycle breakdown it asks for is NOT derivable from today's server data
 * ({@link RelationshipSummary.lifecycle} is typed as the literal `null` precisely so this component
 * cannot render a fabricated one). Neutral numbers are honest; an invented breakdown would not be.
 *
 * Presentational only (Engineering Bible §19).
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { RelationshipSummary } from '@/core/social';
import { useTheme } from '@/hooks/use-theme';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';

export function RelationshipSummaryCard({
  relationship,
  friendName,
}: {
  relationship: RelationshipSummary;
  friendName: string;
}) {
  const theme = useTheme();
  const { t } = useAddressedTranslation('friendProfile');

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.hairline }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('relationship.title')}
      </ThemedText>

      {relationship.total === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('relationship.empty')}
        </ThemedText>
      ) : (
        <View style={styles.stats}>
          <Stat value={relationship.theySupportMe} label={t('relationship.theySupport', { name: friendName })} />
          <Stat value={relationship.iSupportThem} label={t('relationship.youSupport', { name: friendName })} />
          <Stat value={relationship.total} label={t('relationship.total')} />
        </View>
      )}
    </ThemedView>
  );
}

/** One count + its label. The number carries the single teal accent; the label stays neutral ink. */
function Stat({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value}. ${label}`}
      style={styles.stat}>
      <ThemedText type="title" style={[styles.value, { color: theme.tealStrong }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
    // No fixed height: the three labels wrap to different depths and must all stay readable
    // at large Dynamic Type sizes.
    gap: Spacing.half,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  label: {
    lineHeight: 18,
  },
});
