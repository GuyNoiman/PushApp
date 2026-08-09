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
 * direction changes we call `I18nManager.forceRTL(...)` (persists natively for
 * next launch) and raise `pendingRestart` — the UI shows RestartPrompt asking the
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
  setLanguage: (language: LanguageCode) => void;
  /** True once a choice flipped text direction — the app must be reopened. */
  pendingRestart: boolean;
}

const LanguagePreferenceContext = createContext<LanguagePreferenceValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  pendingRestart: false,
});

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
          I18nManager.forceRTL(isRTLLocale(resolved));
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
    void AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, next).catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
    // A direction flip can't fully apply until the app relaunches — force it for
    // next launch and prompt the user to reopen (Expo Go won't auto-reload).
    if (isRTLLocale(next) !== I18nManager.isRTL) {
      I18nManager.forceRTL(isRTLLocale(next));
      setPendingRestart(true);
    }
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
