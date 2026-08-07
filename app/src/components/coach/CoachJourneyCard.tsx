/**
 * The two structured coach outputs in the reflect / focus step:
 *  - {@link CoachInsight} — an "honest read" line, a turquoise spark glyph + text.
 *  - {@link CoachJourneyCard} — the named Journey the coach will build: a NEW
 *    JOURNEY eyebrow, its title + description, and a numeric meta line
 *    (Milestones · weeks · domain) with tabular numerals.
 *
 * Presentational only — no navigation, no Journey creation. Building the Journey
 * is wired later behind the CTA in `coach.tsx`.
 */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CoachInsight({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.insight}>
      <Ionicons name="sparkles-outline" size={14} color={theme.teal} style={styles.insightIcon} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.insightText}>
        {text}
      </ThemedText>
    </View>
  );
}

export function CoachJourneyCard({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={styles.eyebrowRow}>
        <Ionicons name="compass-outline" size={12} color={theme.teal} />
        <ThemedText type="small" style={[styles.eyebrow, { color: theme.teal }]}>
          {eyebrow}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
        {description}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textMuted"
        style={[styles.meta, { borderTopColor: theme.hairline }]}>
        {meta}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.half,
  },
  insightIcon: {
    marginTop: 1,
  },
  insightText: {
    flex: 1,
    lineHeight: 18,
  },
  card: {
    borderRadius: Radius.card + 2,
    borderWidth: 1.4,
    padding: Spacing.three,
    marginTop: Spacing.one,
    // Soft ambient shadow (Design System §5) — separation without gloss.
    shadowColor: '#14161C',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: Spacing.two - 2,
    marginBottom: Spacing.one,
    letterSpacing: -0.2,
  },
  desc: {
    lineHeight: 19,
  },
  meta: {
    marginTop: Spacing.three - 4,
    paddingTop: Spacing.three - 4,
    borderTopWidth: 1,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
});
