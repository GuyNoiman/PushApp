/**
 * AddressPreference — the user's persisted FORM OF ADDRESS (לשון פנייה), the source of truth behind
 * gender-aware i18n (Decision Log D31). Mirrors ThemePreference/LanguagePreference: a small provider
 * that owns one persisted choice (AsyncStorage, key `pushapp.addressForm`) and applies it.
 *
 * Two consumers:
 *   · React components — via {@link useAddressPreference} (re-renders on change), usually through the
 *     {@link ../i18n/useAddressedTranslation} hook which injects the form as i18next context.
 *   · The framework-free coach/engines — they can't use a hook, so this provider mirrors the value
 *     into the plain `addressForm` module ({@link setAddressForm}) which they read via `addressContext()`.
 *
 * Sourcing (D31): asked at onboarding; if a Google/Apple sign-in returns the user's gender the field
 * is auto-set (still shown + editable). Until onboarding/profile land, it's set from the Settings row.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  DEFAULT_ADDRESS_FORM,
  isAddressForm,
  setAddressForm as syncAddressForm,
  type AddressForm,
} from '@/i18n/addressForm';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const ADDRESS_FORM_KEY = 'pushapp.addressForm';

interface AddressPreferenceValue {
  form: AddressForm;
  setForm: (form: AddressForm) => void;
}

const AddressPreferenceContext = createContext<AddressPreferenceValue>({
  form: DEFAULT_ADDRESS_FORM,
  setForm: () => {},
});

export function AddressPreferenceProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<AddressForm>(DEFAULT_ADDRESS_FORM);

  // Reconcile the persisted choice once, and mirror it into the framework-free module so the coach
  // reads the right form from its first turn.
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(ADDRESS_FORM_KEY);
        if (mounted && isAddressForm(raw)) {
          setFormState(raw);
          syncAddressForm(raw);
        }
      } catch {
        // A read failure just leaves us on the default (neutral / base keys).
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply immediately (React consumers re-render; the module mirror updates the coach/engines), then
  // persist async.
  const setForm = useCallback((next: AddressForm) => {
    setFormState(next);
    syncAddressForm(next);
    void AsyncStorage.setItem(ADDRESS_FORM_KEY, next).catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
  }, []);

  return (
    <AddressPreferenceContext.Provider value={{ form, setForm }}>
      {children}
    </AddressPreferenceContext.Provider>
  );
}

export function useAddressPreference(): AddressPreferenceValue {
  return useContext(AddressPreferenceContext);
}
