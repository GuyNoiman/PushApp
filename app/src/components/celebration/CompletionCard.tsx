/**
 * CompletionCard (Completion Celebration, I1) — the fixed, on-brand STYLED VIEW that renders ONE
 * completion-card template variant. It is the artifact the big ceremony lets the user browse and
 * share; a later native gateway captures it to an image via the forwarded `ref`.
 *
 * SECURITY-PRIVACY (PRD §3): this renders ONLY the safe {@link CompletionCard} data — a snapshotted
 * title, completion timestamp, and non-sensitive counts. It NEVER reads Step reports, a Step's
 * `why`/notes, the Dream, or any Ally. Name-revealing variants show the title; name-omitting variants
 * keep it private (`variant.revealsJourneyName`).
 *
 * Presentational only (Engineering Bible §19): every value arrives via props. Theme tokens (light +
 * dark), RTL-aware layout (`isRTL()`), safe wrap/truncation for very long names, and non-colour-only
 * cues (icon + label, not colour alone). The forwarded `ref` targets the OUTER capturable frame.
 */
import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { cardCopyKey, type CardTemplateVariant } from '@/core/celebration/cardTemplates';
import type { CompletionCard as CompletionCardData } from '@/core/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { isRTL } from '@/i18n/rtl';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';

export const CompletionCard = forwardRef<View, { card: CompletionCardData; variant: CardTemplateVariant }>(
  function CompletionCard({ card, variant }, ref) {
    const theme = useTheme();
    // Card copy addresses the user (form-of-address aware — Hebrew gendered variants resolve).
    const { t } = useAddressedTranslation('celebration');
    const rtl = isRTL();

    const stepsStat = t('card.stepsStat', { count: card.totalSteps });
    const daysStat = t('card.daysStat', { count: card.durationDays });

    return (
      <View
        ref={ref}
        // Fixed 4:5 portrait share frame — a stable aspect a future image capture can rely on.
        accessibilityRole="image"
        accessibilityLabel={[t(cardCopyKey(variant, 'headline')), variant.revealsJourneyName ? card.journeyTitleSnapshot : null]
          .filter(Boolean)
          .join(' — ')}
        style={[
          styles.frame,
          { backgroundColor: theme.backgroundElement, borderColor: theme.hairline },
        ]}>
        {/* Brand mark — icon + wordmark (never colour alone). */}
        <View style={[styles.brandRow, rtl && styles.rowRTL]}>
          <Ionicons name="flag" size={16} color={theme.tint} />
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {t('card.brand')}
          </ThemedText>
        </View>

        {/* Centre block — a celebratory glyph, the headline, the (optional) name, and a short body. */}
        <View style={styles.center}>
          <View style={[styles.medal, { backgroundColor: theme.tealTint }]}>
            <Ionicons name="ribbon" size={40} color={theme.tint} />
          </View>

          <ThemedText style={[styles.headline, { color: theme.text }]}>
            {t(cardCopyKey(variant, 'headline'))}
          </ThemedText>

          {variant.revealsJourneyName ? (
            <ThemedText
              type="subtitle"
              // Long names wrap up to three lines then ellipsize — never overflow the frame.
              numberOfLines={3}
              style={[styles.journeyName, { color: theme.tealStrong }]}>
              {card.journeyTitleSnapshot}
            </ThemedText>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
            {t(cardCopyKey(variant, 'body'))}
          </ThemedText>
        </View>

        {/* Non-sensitive stat chips — icon + label so meaning never rests on colour alone. */}
        <View style={[styles.statRow, rtl && styles.rowRTL]}>
          <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="footsteps" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {stepsStat}
            </ThemedText>
          </View>
          <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="calendar" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {daysStat}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // Under RTL, lay rows right-to-left so glyphs sit on the correct side.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  medal: {
    width: 76,
    height: 76,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  headline: {
    fontFamily: FontFamily.headingBold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  journeyName: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.chip,
  },
});
