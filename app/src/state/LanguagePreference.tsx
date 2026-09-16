/**
 * LanguagePreference — the user's explicit language choice (Settings › Language).
 *
 * Mirrors ThemePreference: a small provider that owns one persisted choice
 * (AsyncStorage, key `pushapp.languagePreference`) and applies it. Screens read
 * `language` / call `setLanguage`; the i18next side-effects live in `@/i18n`.
 *
 * First-run resolution: stored choice → else the device locale (if we ship it) →
 * else English. The i18n instance already booted on the device locale, so the
 * effect below only has to reconcile the *persisted* choice.
 *
 * Direction (RTL): switching between an LTR and an RTL language flips the whole
 * layout, which React Native can only fully apply on a fresh launch. So when the
 * direction changes we set it natively for the next launch ({@link applyDirectionForNextLaunch})
 * and raise `pendingRestart` — the UI shows RestartPrompt asking the
 * user to reopen the app. This is honest about Expo Go's lack of auto-reload.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';

import i18n, { changeLanguage as applyLanguage, resolveDeviceLanguage } from '@/i18n';
import { DEFAULT_LANGUAGE, isSupportedLanguage, type LanguageCode } from '@/i18n/languages';
import { isRTLLocale } from '@/i18n/rtl';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const LANGUAGE_PREFERENCE_KEY = 'pushapp.languagePreference';

interface LanguagePreferenceValue {
  language: LanguageCode;
  /**
   * Apply a language now and store it. The returned promise settles once the choice is STORED (it
   * never rejects), which is what a caller about to relaunch the app has to wait for — otherwise the
   * relaunched app boots on the device language instead of the one just chosen.
   */
  setLanguage: (language: LanguageCode) => Promise<void>;
  /** True once a choice flipped text direction — the app must be reopened. */
  pendingRestart: boolean;
}

const LanguagePreferenceContext = createContext<LanguagePreferenceValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
  pendingRestart: false,
});

/**
 * Set the layout direction the NEXT launch opens in, for a language.
 *
 * BOTH native switches, and the second one is the bug of 2026-09-16. React Native decides direction
 * as `forceRTL || (allowRTL && the phone's own locale is RTL)`, and `allowRTL` defaults to true. So
 * `forceRTL(false)` alone does nothing on a phone set to Hebrew: the phone's locale still wins, and
 * English is laid out right-to-left however many times the app restarts. An LTR language therefore
 * has to switch `allowRTL` off as well, and an RTL language switches both on.
 */
function applyDirectionForNextLaunch(language: LanguageCode): void {
  const rtl = isRTLLocale(language);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

export function LanguagePreferenceProvider({ children }: { children: ReactNode }) {
  // Start from whatever i18n booted on (device locale, already resolved to a
  // supported language) so the first frame matches the rendered copy.
  const [language, setLanguageState] = useState<LanguageCode>(() =>
    isSupportedLanguage(i18n.language) ? i18n.language : resolveDeviceLanguage(),
  );
  const [pendingRestart, setPendingRestart] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
        if (!mounted) return;
        // Stored choice wins; otherwise fall back to the device locale (already
        // resolved to a language we ship, or English). This is the authoritative
        // boot resolution — module scope only enabled RTL, it didn't force one.
        const resolved: LanguageCode = isSupportedLanguage(raw) ? raw : resolveDeviceLanguage();
        setLanguageState(resolved);
        if (i18n.language !== resolved) void applyLanguage(resolved);
        // React Native persists direction across launches, so this normally
        // matches already. On a genuine desync (e.g. a fresh install on an RTL
        // device) force the correct direction so the NEXT launch is right — but
        // do NOT raise pendingRestart here: the restart banner is reserved for a
        // deliberate user language change (below), never shown on a plain boot.
        if (isRTLLocale(resolved) !== I18nManager.isRTL) {
          applyDirectionForNextLaunch(resolved);
        }
      } catch {
        // A read failure just leaves us on the device-resolved language.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply immediately (translations re-render this frame), then persist async.
  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    void applyLanguage(next);
    const stored = AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, next).catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
    // A direction flip can't fully apply until the app relaunches — set it for the next launch and
    // prompt the user to reopen (Expo Go won't auto-reload). Set it on EVERY choice, not only on a
    // flip: somebody who picks Hebrew, declines the restart, then picks English again must not be
    // left with a right-to-left next launch that nothing cancelled — and the banner goes away too.
    applyDirectionForNextLaunch(next);
    setPendingRestart(isRTLLocale(next) !== I18nManager.isRTL);
    return stored;
  }, []);

  return (
    <LanguagePreferenceContext.Provider value={{ language, setLanguage, pendingRestart }}>
      {children}
    </LanguagePreferenceContext.Provider>
  );
}

export function useLanguagePreference(): LanguagePreferenceValue {
  return useContext(LanguagePreferenceContext);
}
