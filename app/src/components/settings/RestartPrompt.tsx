/**
 * RestartPrompt — the small bilingual banner shown after a language change flips
 * text direction (LTR ↔ RTL). React Native can only fully re-lay-out the app on a
 * fresh launch, so something has to restart it.
 *
 * Two states, and the difference is honesty about what we can actually do
 * (`@/i18n/restart` owns that question):
 *   · we CAN relaunch → the banner carries a "Restart" button, so a user who
 *     declined the confirmation at the moment of switching can still finish here.
 *   · we CANNOT (a production build, where React Native stubs DevSettings out) →
 *     the original ask stands: close and reopen the app by hand.
 *
 * The copy is intentionally bilingual (English + Hebrew) and NOT run through
 * i18n: mid-flip the layout is half-applied, so we show both languages and the
 * message is legible whichever way the user just switched. Please keep that.
 *
 * Presentational only — it renders when `visible`; the screen owns the state.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canRestartApp, restartApp } from '@/i18n/restart';

export function RestartPrompt({ visible }: { visible: boolean }) {
  const theme = useTheme();
  if (!visible) return null;

  const canRestart = canRestartApp();

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <View style={styles.line}>
        <ThemedText type="smallBold" style={styles.ltrText}>
          {canRestart ? 'Restart to finish' : 'Reopen PushApp to finish'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.ltrText}>
          {canRestart
            ? 'The new language needs a fresh start before the app lays itself out the right way round.'
            : 'Close and reopen the app to apply the new language and direction.'}
        </ThemedText>
      </View>
      <View style={styles.line}>
        <ThemedText type="smallBold" style={styles.rtlText}>
          {canRestart ? 'הפעילו מחדש לסיום' : 'פתחו מחדש את PushApp לסיום'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.rtlText}>
          {canRestart
            ? 'השפה החדשה צריכה הפעלה מחדש כדי שהאפליקציה תיפרס בכיוון הנכון.'
            : 'סגרו ופתחו מחדש את האפליקציה כדי להחיל את השפה והכיוון החדשים.'}
        </ThemedText>
      </View>

      {canRestart ? (
        // Pressing this IS the confirmation — the user asked for it by name here, so it
        // doesn't ask a second time.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restart PushApp · הפעלה מחדש של PushApp"
          onPress={restartApp}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.teal },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Restart · הפעלה מחדש
          </ThemedText>
        </Pressable>
      ) : null}
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
  button: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
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
