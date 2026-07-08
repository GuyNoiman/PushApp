/**
 * AppProvider — the single bridge between the framework-free core and React.
 * It owns one AppCore instance, starts it, and re-renders subscribers whenever a
 * domain event changes state. Components read the snapshot and call the facade;
 * they never contain business logic.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

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

    core.start().then(() => {
      if (!mounted) return;
      setReady(true);
      refresh();
    });

    return () => {
      mounted = false;
      unsubscribe();
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
