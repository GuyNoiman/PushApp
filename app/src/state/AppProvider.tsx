/**
 * AppProvider — the single bridge between the framework-free core and React.
 * It owns one AppCore instance, starts it, and re-renders subscribers whenever a
 * domain event changes state. Components read the snapshot and call the facade;
 * they never contain business logic.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { AppCore, type Snapshot } from '@/core/AppCore';

interface AppContextValue {
  core: AppCore;
  /** Null until the core has loaded persisted state. */
  snapshot: Snapshot | null;
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const coreRef = useRef<AppCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new AppCore();
  }
  const core = coreRef.current;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (mounted) setSnapshot(core.getSnapshot());
    };
    const unsubscribe = core.subscribe(refresh);

    // Registered only after start() resolves, so a foreground event can never run
    // the rollover (and persist) over not-yet-loaded state.
    let appStateSub: { remove: () => void } | null = null;

    core.start().then(() => {
      if (!mounted) return;
      setReady(true);
      refresh();

      // Run the authoritative day/week rollover whenever the app returns to the
      // foreground (outside render), so Missions/Login reconcile with the clock.
      const onAppStateChange = (status: AppStateStatus) => {
        if (status === 'active') core.syncTime();
      };
      appStateSub = AppState.addEventListener('change', onAppStateChange);
    });

    return () => {
      mounted = false;
      unsubscribe();
      appStateSub?.remove();
    };
  }, [core]);

  return <AppContext.Provider value={{ core, snapshot, ready }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
