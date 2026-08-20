/**
 * LifeWheelStore — where a Life Wheel lives between the moment it is answered and the moment it is
 * read, and the only place its summary is offered to the rest of the app.
 *
 * SAVED AS IT GOES, not at the end. Eight areas is more than one sitting for some people, and a tool
 * that loses your answers when the phone rings is a tool taken once and never again.
 *
 * PRIVACY (G1). The answers are ON-DEVICE ONLY: AsyncStorage, never synced, never logged, never a
 * DomainEvent. What somebody scores their family at is not ours. The derived summary is smaller than
 * the answers, and that does NOT make it shareable — "Money, gap of six" is more revealing than the
 * eight numbers it came from, not less.
 *
 * State only (Bible §19): the reading and the summary are computed by
 * {@link ../core/tools/lifeWheel/model} and {@link ../core/tools/lifeWheel/signals}.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LIFE_AREAS, readWheel, type LifeWheelAnswers } from '@/core/tools/lifeWheel/model';
import { summarise, type LifeWheelSummary } from '@/core/tools/lifeWheel/signals';

export const LIFE_WHEEL_ANSWERS_KEY = 'pushapp.lifeWheel.answers';
export const LIFE_WHEEL_SUMMARY_KEY = 'pushapp.lifeWheel.summary';

interface LifeWheelValue {
  /** False until storage has been read, so a screen never opens on an empty wheel that is not empty. */
  ready: boolean;
  answers: LifeWheelAnswers;
  /** The last COMPLETED reading's summary, or null. This is what other features may read. */
  summary: LifeWheelSummary | null;
  /** Persist the answers. A newly completed wheel also writes its summary. */
  save: (answers: LifeWheelAnswers) => void;
}

const EMPTY: LifeWheelValue = { ready: true, answers: {}, summary: null, save: () => {} };

const LifeWheelContext = createContext<LifeWheelValue>(EMPTY);

/** Read stored answers, keeping only the areas the current build knows and values that are numbers. */
function parseAnswers(raw: string | null): LifeWheelAnswers {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, { satisfaction: number; weight: number }> = {};
    for (const area of LIFE_AREAS) {
      const entry = (parsed as Record<string, unknown>)[area];
      if (typeof entry !== 'object' || entry === null) continue;
      const { satisfaction, weight } = entry as { satisfaction?: unknown; weight?: unknown };
      if (typeof satisfaction === 'number' && typeof weight === 'number') {
        out[area] = { satisfaction, weight };
      }
    }
    return out as LifeWheelAnswers;
  } catch {
    return {};
  }
}

export function LifeWheelProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<LifeWheelAnswers>({});
  const [summary, setSummary] = useState<LifeWheelSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [rawAnswers, rawSummary] = await AsyncStorage.multiGet([
          LIFE_WHEEL_ANSWERS_KEY,
          LIFE_WHEEL_SUMMARY_KEY,
        ]);
        if (!mounted) return;
        setAnswers(parseAnswers(rawAnswers[1]));
        if (rawSummary[1]) {
          try {
            setSummary(JSON.parse(rawSummary[1]) as LifeWheelSummary);
          } catch {
            // An unreadable summary is no summary. The answers are the source of truth anyway.
          }
        }
      } catch {
        // An unreadable wheel is an empty wheel — nothing here is precious enough to crash over.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = useCallback((next: LifeWheelAnswers) => {
    setAnswers(next);
    void AsyncStorage.setItem(LIFE_WHEEL_ANSWERS_KEY, JSON.stringify(next)).catch(() => {});

    // A COMPLETE wheel is the only thing that produces a summary — every finding in a reading is
    // comparative, so summarising a partial one would name whichever area happened to be answered
    // worst so far.
    const reading = readWheel(next);
    if (!reading) return;
    const fresh = summarise(reading, Date.now());
    setSummary(fresh);
    void AsyncStorage.setItem(LIFE_WHEEL_SUMMARY_KEY, JSON.stringify(fresh)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ready, answers, summary, save }),
    [ready, answers, summary, save],
  );

  return <LifeWheelContext.Provider value={value}>{children}</LifeWheelContext.Provider>;
}

export function useLifeWheel(): LifeWheelValue {
  return useContext(LifeWheelContext);
}
