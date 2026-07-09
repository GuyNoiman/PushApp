/**
 * InboxEmpty — a warm, non-card empty state for an Inbox tab with nothing in it
 * yet (v14 mockup screen-15): a big soft emoji, a friendly Baloo line, and a
 * muted Inter sub-line. Used for the Groups placeholder (not a POC feature), the
 * social-off state, and any tab with no items.
 *
 * Presentational only — pure props, no logic (Engineering Bible §19).
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function InboxEmpty({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.six,
  },
  emoji: {
    fontSize: 44,
    lineHeight: 54,
    marginBottom: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
