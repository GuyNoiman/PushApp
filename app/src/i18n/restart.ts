/**
 * restart — relaunching PushApp after a language change flipped text direction.
 *
 * WHY it exists: React Native applies an LTR ↔ RTL flip only on a fresh start.
 * `I18nManager.forceRTL(...)` persists the choice natively for the next launch,
 * but the running app keeps the old layout, so a Hebrew ↔ English switch needs
 * the app to come back up.
 *
 * THE BUG THIS NOW FIXES (partner, 2026-08-20): he chose Hebrew on the first
 * screen and *"the questions were still pinned to the left instead of the
 * right"*. They were. In a release build `DevSettings.reload` is stubbed out by
 * React Native, so the app could not relaunch itself, the banner asked politely
 * for something most people will not do mid-signup, and the entire onboarding ran
 * in the wrong direction. A first impression is a bad place to ask a user to
 * fix the app's layout for it.
 *
 * WHAT CHANGED: `expo-updates` is now in the build (it landed for over-the-air
 * updates on 2026-08-19), and its `reloadAsync()` is exactly the production
 * relaunch this file said it was missing. So there are two mechanisms and the
 * right one is picked at runtime — `DevSettings.reload` in development, where
 * updates are disabled, and `Updates.reloadAsync()` in any real build.
 *
 * It is required LAZILY, inside the call, for the same reason
 * `core/auth/nativeIdentity` does it: this module is imported by the language
 * screens, which also render on web and under jest, where the native module does
 * not exist. A missing module here degrades to "we cannot restart" — which is
 * what `canRestartApp()` reports, so the UI keeps the manual instruction instead
 * of promising a relaunch that never comes.
 *
 * The copy here is deliberately BILINGUAL and NOT run through i18n, for the same
 * reason RestartPrompt is: at this exact moment the language has changed but the
 * layout has not, so we show both languages and let the user read whichever one
 * they can.
 */
import { Alert, DevSettings } from 'react-native';

/**
 * The `expo-updates` module, or null wherever it does not exist (web, Expo Go, jest). Loaded at CALL
 * time so importing this file never drags a native module into a bundle that has none.
 */
function updatesModule(): { isEnabled?: boolean; reloadAsync?: () => Promise<void> } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates') as { isEnabled?: boolean; reloadAsync?: () => Promise<void> };
  } catch {
    return null;
  }
}

/** True when the real build's own reload is available — i.e. in a build that carries expo-updates. */
function canReloadViaUpdates(): boolean {
  const updates = updatesModule();
  return updates?.isEnabled === true && typeof updates.reloadAsync === 'function';
}

/** True in development, where React Native's own reload works and updates are disabled. */
function canReloadViaDevSettings(): boolean {
  return __DEV__ && typeof DevSettings?.reload === 'function';
}

/** Can we relaunch the app ourselves right now? False → the user must do it by hand. */
export function canRestartApp(): boolean {
  return canReloadViaDevSettings() || canReloadViaUpdates();
}

/**
 * Relaunch the app so a direction flip takes effect. Does nothing if we can't.
 *
 * Development first, deliberately: in a dev client `expo-updates` is present but disabled, and
 * asking it to reload would fail where `DevSettings` simply works.
 */
export function restartApp(): void {
  if (canReloadViaDevSettings()) {
    DevSettings.reload('PushApp language change');
    return;
  }
  const updates = updatesModule();
  // Nothing to catch it if this rejects except us: a failed reload must leave the app running and
  // the banner on screen, never crash the screen the user is standing on.
  if (canReloadViaUpdates()) void updates?.reloadAsync?.().catch(() => {});
}

/**
 * Ask first, then relaunch. A restart is a real interruption, so it never happens
 * without an explicit yes. Declining is a valid answer and leaves exactly today's
 * state: the new language is already applied, the layout direction is not — which
 * is why the RestartPrompt banner stays on screen, offering the restart again.
 */
export function confirmAndRestartApp(): void {
  if (!canRestartApp()) return;
  Alert.alert(
    'Restart PushApp? · להפעיל מחדש את PushApp?',
    'The new language needs a fresh start before the app lays itself out the right way round.\n\nהשפה החדשה צריכה הפעלה מחדש כדי שהאפליקציה תיפרס בכיוון הנכון.',
    [
      { text: 'Not now · לא עכשיו', style: 'cancel' },
      { text: 'Restart · הפעלה מחדש', onPress: restartApp },
    ],
  );
}
