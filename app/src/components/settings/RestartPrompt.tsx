/**
 * RestartPrompt — a small bilingual banner shown after a language change flips
 * text direction (LTR ↔ RTL). React Native can only fully re-lay-out the app on a
 * fresh launch, and Expo Go has no auto-reload, so we ask the user to reopen the
 * app by hand. The copy is intentionally bilingual (English + Hebrew) and NOT run
 * through i18n: mid-flip the layout is half-applied, so we show both languages so
 * the message is legible whichever way the user just switched.
 *
 * Presentational only — it renders when `visible`; the screen owns the state.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function RestartPrompt({ visible }: { visible: boolean }) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={styles.line}>
        <ThemedText type="smallBold" style={styles.ltrText}>
          Reopen PushApp to finish
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.ltrText}>
          Close and reopen the app to apply the new language and direction.
        </ThemedText>
      </View>
      <View style={styles.line}>
        <ThemedText type="smallBold" style={styles.rtlText}>
          פתחו מחדש את PushApp לסיום
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.rtlText}>
          סגרו ופתחו מחדש את האפליקציה כדי להחיל את השפה והכיוון החדשים.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  line: {
    gap: Spacing.one,
  },
  // Pin each block to its own script direction so the bilingual copy reads
  // correctly regardless of the app's (mid-flip) layout direction.
  ltrText: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
