/**
 * SectionHeader — Home's LARGE section title (2026-08-07 redesign): noticeably
 * bigger than the old uppercase eyebrow so the page has typographic rhythm and the
 * eye is drawn down the feed. A title, an optional count chip ("Today's steps · 3"
 * is rendered as title + count pill), and an optional trailing slot ("See all").
 *
 * `tone` tints the title + count: 'urgent' uses amber (the mature system reserves
 * amber for genuine time-pressure); 'default' stays in ink. Presentational only.
 *
 * The title is set in the DISPLAY SERIF (2026-08-19 redesign). A section heading is one of the few
 * places the app speaks in its own voice rather than reporting data, and the serif is what makes the
 * difference audible — see {@link FontFamily} for why this particular face and not a Latin one.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { displayFont, displayScale } from '@/constants/displayFont';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SectionHeader({
  title,
  count,
  tone = 'default',
  right,
}: {
  title: string;
  /** Optional item count, shown as a small pill after the title. */
  count?: number;
  tone?: 'default' | 'urgent';
  right?: ReactNode;
}) {
  const theme = useTheme();
  const accent = tone === 'urgent' ? theme.gold : theme.text;
  const pillBg = tone === 'urgent' ? theme.goldTint : theme.backgroundSelected;
  const pillFg = tone === 'urgent' ? theme.goldStrong : theme.textSecondary;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <ThemedText
          style={[
            styles.title,
            { color: accent, fontFamily: displayFont(), fontSize: Math.round(24 * displayScale()) },
          ]}>
          {title}
        </ThemedText>
        {count !== undefined && (
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <ThemedText type="smallBold" style={[styles.count, { color: pillFg }]}>
              {count}
            </ThemedText>
          </View>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    lineHeight: 34,
    letterSpacing: -0.2,
  },
  pill: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
