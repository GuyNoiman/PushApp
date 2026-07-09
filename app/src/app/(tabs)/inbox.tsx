/**
 * Inbox — the messages surface (v14 mockup screen-15): threads from Friends,
 * Allies, and Groups. A themed STUB for now (header + friendly empty state); the
 * real content is built next. Presentational only — no business logic
 * (Engineering Bible §19).
 */
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function InboxScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Inbox</ThemedText>
        </View>

        <View style={styles.body}>
          <ThemedView type="backgroundElement" style={[styles.empty, { borderColor: theme.hairline }]}>
            <ThemedText style={styles.emoji}>✉️</ThemedText>
            <ThemedText type="subtitle">Coming together</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Messages from your Friends, Allies, and Groups will land here soon.
            </ThemedText>
          </ThemedView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.five,
  },
  emoji: {
    fontSize: 40,
    lineHeight: 48,
    marginBottom: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
  },
});
