/**
 * PrivacyPreview (Completion Celebration, I1) — states the EXACT privacy level of the selected card
 * variant BEFORE any share sheet opens (PRD §4 "clearly preview the exact privacy level before the
 * native share sheet opens"). It tells the user whether the Journey name is shown or kept private,
 * and reassures that reports / notes / Dream are never included.
 *
 * Presentational only (Engineering Bible §19): reads the selected variant via props, resolves copy
 * from the `celebration` namespace. Non-colour-only cue (a lock/eye icon + text), RTL-aware.
 */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';

export function PrivacyPreview({ revealsJourneyName }: { revealsJourneyName: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation('celebration');
  const rtl = isRTL();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline }]}>
      <View style={[styles.row, rtl && styles.rowRTL]}>
        <Ionicons
          name={revealsJourneyName ? 'eye-outline' : 'lock-closed'}
          size={16}
          color={theme.textSecondary}
        />
        <ThemedText type="smallBold" themeColor="textMuted" style={styles.heading}>
          {t('privacy.heading')}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: theme.text }}>
        {revealsJourneyName ? t('privacy.revealsName') : t('privacy.hidesName')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('privacy.safeNote')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
