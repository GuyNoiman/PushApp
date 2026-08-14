/**
 * CanceledPill — the ONE "CANCELED" / "מבוטל" tag a canceled Journey wears, wherever it appears
 * (the Journeys History tab, and under its Dream). Extracted from the History card so the two
 * surfaces can never drift into two different-looking tags for the same state.
 *
 * Deliberately NEUTRAL: a muted tint with muted ink — never green/gold/teal, never `danger`. The
 * meaning is carried by the WORD, never by colour alone (Journey Abandonment PRD §8.2, and the
 * Design System's rule that amber is reserved for urgency). It is a state label, not a warning:
 * stopping a Journey is a legitimate choice, and nothing here may read as a success OR a failure.
 *
 * Presentational only (Engineering Bible §19) — it takes nothing and derives nothing; the caller
 * decides when a Journey is canceled.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CanceledPill() {
  const theme = useTheme();
  const { t } = useTranslation('journeys');

  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold" style={[styles.label, { color: theme.textMuted }]}>
        {t('card.canceled')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
  },
});
