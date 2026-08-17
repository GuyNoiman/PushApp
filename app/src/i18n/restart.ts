/**
 * restart — relaunching PushApp after a language change flipped text direction.
 *
 * WHY it exists: React Native applies an LTR ↔ RTL flip only on a fresh start.
 * `I18nManager.forceRTL(...)` persists the choice natively for the next launch,
 * but the running app keeps the old layout, so a Hebrew ↔ English switch needs
 * the app to come back up. Until now we asked the user to do it by hand.
 *
 * WHAT WE CAN DO WITHOUT A NEW DEPENDENCY: `DevSettings.reload()` — React
 * Native's own reload. It is live in development and in a dev client (what we run
 * today) and a NO-OP in a production release build, because RN stubs DevSettings
 * out entirely when `__DEV__` is false. So `canRestartApp()` tells the UI the
 * truth and the manual instruction stays for the case where we genuinely cannot
 * restart, rather than the app promising a relaunch that never comes.
 *
 * The production answer is `expo-updates` and its `reloadAsync()`, which is NOT
 * installed. Adding it is a new dependency and therefore the founder's call, not
 * this file's.
 *
 * The copy here is deliberately BILINGUAL and NOT run through i18n, for the same
 * reason RestartPrompt is: at this exact moment the language has changed but the
 * layout has not, so we show both languages and let the user read whichever one
 * they can.
 */
import { Alert, DevSettings } from 'react-native';

/** Can we relaunch the app ourselves right now? False → the user must do it by hand. */
export function canRestartApp(): boolean {
  return __DEV__ && typeof DevSettings?.reload === 'function';
}

/** Relaunch the app so a direction flip takes effect. Does nothing if we can't. */
export function restartApp(): void {
  if (!canRestartApp()) return;
  DevSettings.reload('PushApp language change');
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
