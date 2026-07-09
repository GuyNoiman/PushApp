/**
 * SocialProvider — the React bridge for the POC social / Allies pillar.
 * It owns the SocialGateway session (anonymous auth + profile), exposes the
 * Support Circle / Ally / cheer state the UI renders, and publishes a progress
 * SUMMARY for each shared Journey when the local AppCore snapshot changes.
 *
 * When featureFlags.social is off (no Supabase env) it renders children with inert
 * empty values — the four local pillars are entirely unaffected (Bible §5/§14).
 * All gateway calls are wrapped so a backend hiccup surfaces a string, never a crash.
 * No business logic here: screens read this state and call these actions (§19).
 */
import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { getSocialGateway } from '@/core/social';
import type {
  AllyProgress,
  Cheer,
  Friend,
  SocialProfile,
  Visibility,
} from '@/core/social';
import { useApp } from '@/state/AppProvider';

interface SocialContextValue {
  enabled: boolean;
  profile: SocialProfile | null;
  friends: Friend[];
  allyProgress: AllyProgress[];
  incomingCheers: Cheer[];
  /** True once signed in but no public handle has been chosen yet. */
  needsHandle: boolean;
  /** Last gateway error, for the UI to surface. Null when healthy. */
  error: string | null;
  setHandle: (handle: string) => Promise<void>;
  addFriendByHandle: (handle: string) => Promise<void>;
  respondToFriend: (requesterId: string, accept: boolean) => Promise<void>;
  setAllies: (journeyId: string, allyIds: string[], visibility: Visibility) => Promise<void>;
  sendCheer: (toId: string, journeyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY: SocialContextValue = {
  enabled: false,
  profile: null,
  friends: [],
  allyProgress: [],
  incomingCheers: [],
  needsHandle: false,
  error: null,
  setHandle: async () => {},
  addFriendByHandle: async () => {},
  respondToFriend: async () => {},
  setAllies: async () => {},
  sendCheer: async () => {},
  refresh: async () => {},
};

const SocialContext = createContext<SocialContextValue>(EMPTY);

export function SocialProvider({ children }: { children: ReactNode }) {
  const gateway = getSocialGateway();
  const enabled = gateway.enabled;

  // Off: hand children the inert defaults so nothing branches on config.
  if (!enabled) {
    return <SocialContext.Provider value={EMPTY}>{children}</SocialContext.Provider>;
  }
  return <ActiveSocialProvider>{children}</ActiveSocialProvider>;
}

function ActiveSocialProvider({ children }: { children: ReactNode }) {
  const gateway = getSocialGateway();
  const { core } = useApp();

  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allyProgress, setAllyProgress] = useState<AllyProgress[]>([]);
  const [incomingCheers, setIncomingCheers] = useState<Cheer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const profileRef = useRef<SocialProfile | null>(null);
  profileRef.current = profile;

  /** Run a gateway call, surfacing any failure as a string instead of crashing. */
  const guard = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, []);

  const refresh = useCallback(async () => {
    await guard(async () => {
      const [p, f, ap] = await Promise.all([
        gateway.currentProfile(),
        gateway.listFriends(),
        gateway.allyProgress(),
      ]);
      setProfile(p);
      setFriends(f);
      setAllyProgress(ap);
    });
  }, [gateway, guard]);

  // ── Mount: anonymous sign-in, then load profile + circle + ally progress ──
  useEffect(() => {
    let mounted = true;
    void (async () => {
      await guard(async () => {
        await gateway.signInAnonymously();
      });
      if (mounted) await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, [gateway, guard, refresh]);

  // ── Incoming cheers: append to state + fire a local notification ──
  useEffect(() => {
    let configured = false;
    const unsubscribe = gateway.subscribeToCheers((cheer) => {
      setIncomingCheers((prev) => [cheer, ...prev].slice(0, 20));
      const fromHandle = friendsHandle(friendsRef.current, cheer.fromId);
      void fireCheerNotification(fromHandle, () => {
        if (!configured) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: true,
              shouldShowList: true,
            }),
          });
          configured = true;
        }
      });
    });
    return unsubscribe;
    // Re-subscribe once the profile (uid) is known so the realtime filter binds.
  }, [gateway, profile]);

  // Keep the latest friends list available to the (stable) cheer callback.
  const friendsRef = useRef<Friend[]>([]);
  friendsRef.current = friends;

  // ── Publish progress for each shared Journey when the snapshot changes ──
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishAll = useCallback(() => {
    void guard(async () => {
      const sharedIds = await gateway.mySharedJourneyIds();
      if (sharedIds.length === 0) return;
      const journeys = core.getSnapshot().journeys;
      for (const journeyId of sharedIds) {
        const journey = journeys.find((j) => j.id === journeyId);
        if (!journey) continue;
        const total = journey.steps.length;
        const done = journey.steps.filter((s) => s.done).length;
        await gateway.publishProgress({
          journeyId,
          title: journey.title,
          progress: total > 0 ? done / total : 0,
          streak: 0, // No local streak model yet — best-effort (Bible §19).
        });
      }
    });
  }, [core, gateway, guard]);

  useEffect(() => {
    const schedule = () => {
      if (publishTimer.current) clearTimeout(publishTimer.current);
      publishTimer.current = setTimeout(publishAll, 1000); // debounce ~1s
    };
    const unsubscribe = core.subscribe(schedule);
    return () => {
      unsubscribe();
      if (publishTimer.current) clearTimeout(publishTimer.current);
    };
  }, [core, publishAll]);

  // ── Actions ──
  const setHandle = useCallback(
    async (handle: string) => {
      await guard(async () => {
        const p = await gateway.upsertProfile(handle.trim(), profileRef.current?.buddySummary ?? {});
        setProfile(p);
      });
    },
    [gateway, guard],
  );

  const addFriendByHandle = useCallback(
    async (handle: string) => {
      await guard(async () => {
        const found = await gateway.findByHandle(handle.trim());
        if (!found) throw new Error(`No one found with the handle "${handle.trim()}".`);
        await gateway.requestFriend(found.id);
      });
      await refresh();
    },
    [gateway, guard, refresh],
  );

  const respondToFriend = useCallback(
    async (requesterId: string, accept: boolean) => {
      await guard(async () => {
        await gateway.respondToFriend(requesterId, accept);
      });
      await refresh();
    },
    [gateway, guard, refresh],
  );

  const setAllies = useCallback(
    async (journeyId: string, allyIds: string[], visibility: Visibility) => {
      await guard(async () => {
        await gateway.setAllies(journeyId, allyIds, visibility);
        // Publish this Journey's summary immediately so a new Ally sees it at once.
        const journey = core.getSnapshot().journeys.find((j) => j.id === journeyId);
        if (journey) {
          const total = journey.steps.length;
          const done = journey.steps.filter((s) => s.done).length;
          await gateway.publishProgress({
            journeyId,
            title: journey.title,
            progress: total > 0 ? done / total : 0,
            streak: 0,
          });
        }
      });
    },
    [core, gateway, guard],
  );

  const sendCheer = useCallback(
    async (toId: string, journeyId: string) => {
      await guard(async () => {
        await gateway.sendCheer(toId, journeyId, 'cheer');
      });
    },
    [gateway, guard],
  );

  const value: SocialContextValue = {
    enabled: true,
    profile,
    friends,
    allyProgress,
    incomingCheers,
    needsHandle: profile === null,
    error,
    setHandle,
    addFriendByHandle,
    respondToFriend,
    setAllies,
    sendCheer,
    refresh,
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

/** Resolve a cheer sender's handle for the notification copy, best-effort. */
function friendsHandle(friends: Friend[], fromId: string): string {
  return friends.find((f) => f.profile.id === fromId)?.profile.handle ?? 'A Buddy';
}

/** Fire the local "cheered you" notification (ReminderEngine pattern). Guarded. */
async function fireCheerNotification(fromHandle: string, ensureConfigured: () => void): Promise<void> {
  try {
    ensureConfigured();
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) return; // don't prompt here; reminders own the ask
    await Notifications.scheduleNotificationAsync({
      content: { title: 'PushApp', body: `${fromHandle} cheered you! 🎉` },
      trigger: null, // deliver immediately
    });
  } catch {
    // A notification failure must never break the social flow.
  }
}

export function useSocial(): SocialContextValue {
  return useContext(SocialContext);
}
