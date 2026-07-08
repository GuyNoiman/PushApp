/**
 * Placeholder tab. Explore (discovery), Shop, and Friends/Allies are out of the
 * POC scope (04_Product/POC_and_MVP_Scope.md §1.4) — staged, not built here.
 * Kept minimal so the tab bar has a second destination.
 */
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Explore</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            Coming later. The POC focuses on the Journey + Buddy loop on Home.
          </ThemedText>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
});
