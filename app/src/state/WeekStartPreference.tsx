/**
 * WeekStartPreference — the user's persisted WEEK-START DAY, the source of truth behind the single
 * authoritative week boundary (Week Boundary Preference PRD, D33). Mirrors the other preference
 * providers: it owns one persisted choice (AsyncStorage, key `pushapp.weekStartDay`) and mirrors it
 * into the framework-free `util/week` module so the engines (Missions rollover, Streak urgency) and
 * the Journey pager all read one definition.
 *
 * Default (PRD §2): until the user overrides it — and until the profile's `country` field lands
 * (`Own_Profile_PRD`) to drive it — the default comes from the DEVICE REGION's first day of week. The
 * device default is NOT persisted; only an explicit user choice is. So "nothing stored" always means
 * "no override" — exactly what §4 needs for a future country change to recompute the default.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  DEFAULT_WEEK_START,
  isWeekday,
  setWeekStartDay as syncWeekStart,
  type Weekday,
} from '@/core/util/week';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const WEEK_START_KEY = 'pushapp.weekStartDay';

/** The device region's first day of week (0=Sun … 6=Sat), or the app default when unavailable. */
function deviceWeekStart(): Weekday {
  try {
    // expo-localization: `firstWeekday` is 1=Sunday … 7=Saturday → shift to JS getDay() convention.
    const first = getCalendars()[0]?.firstWeekday;
    if (typeof first === 'number' && first >= 1 && first <= 7) return ((first - 1) as Weekday);
  } catch {
    // No usable calendar info — fall through to the default.
  }
  return DEFAULT_WEEK_START;
}

interface WeekStartPreferenceValue {
  weekStartDay: Weekday;
  setWeekStartDay: (day: Weekday) => void;
}

const WeekStartPreferenceContext = createContext<WeekStartPreferenceValue>({
  weekStartDay: DEFAULT_WEEK_START,
  setWeekStartDay: () => {},
});

export function WeekStartPreferenceProvider({ children }: { children: ReactNode }) {
  const [weekStartDay, setState] = useState<Weekday>(DEFAULT_WEEK_START);

  // Reconcile once: a stored value is a USER OVERRIDE and wins; otherwise derive the default from the
  // device region (and don't persist it, so it stays "no override"). Mirror into the framework-free
  // module so the coach/engines read the right boundary from their first call.
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(WEEK_START_KEY);
        const parsed = raw != null ? Number(raw) : Number.NaN;
        const resolved: Weekday = isWeekday(parsed) ? parsed : deviceWeekStart();
        if (!mounted) return;
        setState(resolved);
        syncWeekStart(resolved);
      } catch {
        // A read failure just leaves us on the default; still mirror it for consistency.
        if (mounted) syncWeekStart(DEFAULT_WEEK_START);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setWeekStartDay = useCallback((day: Weekday) => {
    setState(day);
    syncWeekStart(day);
    void AsyncStorage.setItem(WEEK_START_KEY, String(day)).catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
  }, []);

  return (
    <WeekStartPreferenceContext.Provider value={{ weekStartDay, setWeekStartDay }}>
      {children}
    </WeekStartPreferenceContext.Provider>
  );
}

export function useWeekStartPreference(): WeekStartPreferenceValue {
  return useContext(WeekStartPreferenceContext);
}
