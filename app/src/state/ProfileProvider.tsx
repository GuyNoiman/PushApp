/**
 * ProfileProvider — the ONE source of truth for the user's own profile (Own_Profile_PRD, option A).
 * Every identity/adaptation field lives here in a single persisted object (AsyncStorage key
 * `pushapp.profile`); the framework-free modules the engines read (`i18n/addressForm`, `util/week`)
 * are MIRRORED from it, so there is one home for the data. This folds in (and replaces) the former
 * standalone AddressPreference (D31) + WeekStartPreference (D33) providers.
 *
 * PRIVACY (own vs friend, founder 2026-08-10): this is the PRIVATE self-view store — country, birth
 * date, form of address are private and must NEVER enter a friend-facing payload. The Friend Profile
 * (P1) is a filtered projection of only the public subset. Nothing here is published; the existing
 * shared-only social model is unchanged.
 *
 * Defaults come from the device region (country → week-start day); a manual week-start choice becomes
 * an override that a later country change does not replace (Week_Boundary_Preference §4). Phase 1 =
 * these fields; the profile photo is Phase 2.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  DEFAULT_COMMUNICATION_PROFILE,
  isCommunicationProfileId,
  setCommunicationProfile as syncCommunicationProfile,
  type CommunicationProfileId,
} from '@/core/communication/communicationProfile';
import { deviceCountry, weekStartForCountry, type CountryCode } from '@/core/profile/countries';
import {
  DEFAULT_ADDRESS_FORM,
  isAddressForm,
  setAddressForm as syncAddressForm,
  type AddressForm,
} from '@/i18n/addressForm';
import { isWeekday, setWeekStartDay as syncWeekStart, type Weekday } from '@/core/util/week';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const PROFILE_KEY = 'pushapp.profile';
/** Legacy keys the former standalone providers used — migrated in on first load if present. */
const LEGACY_ADDRESS_KEY = 'pushapp.addressForm';
const LEGACY_WEEK_START_KEY = 'pushapp.weekStartDay';

/** The user's own profile — the private, editable self-view. `@username`/name from sign-in stay in
 *  the social/auth layers; this holds the profile-owned fields. Photo (Phase 2) is not here yet. */
export interface Profile {
  /** User-set display name; null → fall back to the sign-in name / placeholder. */
  displayName: string | null;
  /** ISO 3166-1 alpha-2 country code — private; supplies the default week-start day. */
  country: CountryCode;
  /** ISO `YYYY-MM-DD`, or null = Not specified — private. */
  birthDate: string | null;
  /** Gender-aware form of address (D31) — private. */
  addressForm: AddressForm;
  /** Unified communication style — how PushApp speaks to the user (D40, Communication_Style_Profile_PRD). */
  communicationProfile: CommunicationProfileId;
  /** Effective week-start day (D33). */
  weekStartDay: Weekday;
  /** True once the user set the week start MANUALLY — a country change then won't replace it. */
  weekStartOverridden: boolean;
}

function defaultProfile(): Profile {
  const country = deviceCountry();
  return {
    displayName: null,
    country,
    birthDate: null,
    addressForm: DEFAULT_ADDRESS_FORM,
    communicationProfile: DEFAULT_COMMUNICATION_PROFILE,
    weekStartDay: weekStartForCountry(country),
    weekStartOverridden: false,
  };
}

/** Merge a persisted (possibly legacy/partial) object onto safe defaults, validating each field. */
function normalize(raw: unknown): Profile {
  const base = defaultProfile();
  if (raw === null || typeof raw !== 'object') return base;
  const p = raw as Partial<Profile>;
  return {
    displayName: typeof p.displayName === 'string' ? p.displayName : base.displayName,
    country: typeof p.country === 'string' && p.country.length === 2 ? p.country.toUpperCase() : base.country,
    birthDate: typeof p.birthDate === 'string' ? p.birthDate : base.birthDate,
    addressForm: isAddressForm(p.addressForm) ? p.addressForm : base.addressForm,
    communicationProfile: isCommunicationProfileId(p.communicationProfile)
      ? p.communicationProfile
      : base.communicationProfile,
    weekStartDay: isWeekday(p.weekStartDay) ? p.weekStartDay : base.weekStartDay,
    weekStartOverridden: typeof p.weekStartOverridden === 'boolean' ? p.weekStartOverridden : base.weekStartOverridden,
  };
}

/** Mirror the engine-read fields into the framework-free modules so the coach/engines stay in sync. */
function applyToModules(profile: Profile): void {
  syncAddressForm(profile.addressForm);
  syncCommunicationProfile(profile.communicationProfile);
  syncWeekStart(profile.weekStartDay);
}

interface ProfileValue {
  profile: Profile;
  /**
   * False until the persisted profile has been read back and mirrored into the framework-free
   * modules. Anything that reacts to a profile field (e.g. re-resolving notification copy) must wait
   * for this, or it would act on the boot defaults and then again on the real values.
   */
  hydrated: boolean;
  setDisplayName: (name: string | null) => void;
  setBirthDate: (iso: string | null) => void;
  setAddressForm: (form: AddressForm) => void;
  /** Set the unified communication style (D40) — applies to future notification/Coach copy. */
  setCommunicationProfile: (id: CommunicationProfileId) => void;
  /** Change country; recomputes the week-start default UNLESS the user has overridden it. */
  setCountry: (code: CountryCode) => void;
  /** Manually set the week start — becomes an override that country changes won't replace. */
  setWeekStartDay: (day: Weekday) => void;
}

const ProfileContext = createContext<ProfileValue>({
  profile: defaultProfile(),
  hydrated: false,
  setDisplayName: () => {},
  setBirthDate: () => {},
  setAddressForm: () => {},
  setCommunicationProfile: () => {},
  setCountry: () => {},
  setWeekStartDay: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  // Reconcile the persisted profile once (migrating the two legacy preference keys if this is the
  // first run after the unification), and mirror it into the framework-free modules.
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        let resolved: Profile;
        if (stored != null) {
          resolved = normalize(JSON.parse(stored));
        } else {
          // First run post-unification: seed from any legacy standalone-provider values.
          const [legacyForm, legacyWeek] = await AsyncStorage.multiGet([
            LEGACY_ADDRESS_KEY,
            LEGACY_WEEK_START_KEY,
          ]).then((entries) => entries.map(([, v]) => v));
          const base = defaultProfile();
          if (isAddressForm(legacyForm)) base.addressForm = legacyForm;
          if (legacyWeek != null && isWeekday(Number(legacyWeek))) {
            base.weekStartDay = Number(legacyWeek) as Weekday;
            base.weekStartOverridden = true; // a stored week start was an explicit choice
          }
          resolved = base;
        }
        if (!mounted) return;
        setProfile(resolved);
        applyToModules(resolved);
        setHydrated(true);
      } catch {
        // A read failure still settles the profile — on the defaults — so consumers must not keep waiting.
        if (mounted) {
          applyToModules(defaultProfile());
          setHydrated(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply immediately (mirror + re-render), then persist the whole object.
  const commit = useCallback((next: Profile) => {
    setProfile(next);
    applyToModules(next);
    void AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)).catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
  }, []);

  const setDisplayName = useCallback((name: string | null) => {
    setProfile((prev) => {
      const next = { ...prev, displayName: name && name.trim() ? name.trim() : null };
      commit(next);
      return next;
    });
  }, [commit]);

  const setBirthDate = useCallback((iso: string | null) => {
    setProfile((prev) => {
      const next = { ...prev, birthDate: iso };
      commit(next);
      return next;
    });
  }, [commit]);

  const setAddressForm = useCallback((form: AddressForm) => {
    setProfile((prev) => {
      const next = { ...prev, addressForm: form };
      commit(next);
      return next;
    });
  }, [commit]);

  const setCommunicationProfile = useCallback((id: CommunicationProfileId) => {
    setProfile((prev) => {
      const next = { ...prev, communicationProfile: id };
      commit(next);
      return next;
    });
  }, [commit]);

  const setCountry = useCallback((code: CountryCode) => {
    setProfile((prev) => {
      const country = code.toUpperCase();
      // Country supplies the week-start DEFAULT — but only when the user hasn't overridden it (§4).
      const weekStartDay = prev.weekStartOverridden ? prev.weekStartDay : weekStartForCountry(country);
      const next = { ...prev, country, weekStartDay };
      commit(next);
      return next;
    });
  }, [commit]);

  const setWeekStartDay = useCallback((day: Weekday) => {
    setProfile((prev) => {
      const next = { ...prev, weekStartDay: day, weekStartOverridden: true };
      commit(next);
      return next;
    });
  }, [commit]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        hydrated,
        setDisplayName,
        setBirthDate,
        setAddressForm,
        setCommunicationProfile,
        setCountry,
        setWeekStartDay,
      }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileValue {
  return useContext(ProfileContext);
}
