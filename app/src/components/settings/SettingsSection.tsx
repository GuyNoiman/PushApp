/**
 * SettingsSection — a titled group of rows on the Settings tab. A small
 * uppercase-free caption sits above a single rounded card; rows inside are
 * separated by hairlines (drawn between children, never after the last one) so
 * the group reads as one calm block (mature palette, no gloss).
 *
 * Presentational only — it takes SettingsRow children and lays them out.
 */
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
        {title}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 && <View style={[styles.divider, { backgroundColor: theme.hairline }]} />}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginLeft: Spacing.three,
  },
});
