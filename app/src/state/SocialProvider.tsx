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

import { assertCompanionAllowed, getSocialGateway } from '@/core/social';
import type {
  AllyBundle,
  AllyInvite,
  AllyMember,
  AllyProgress,
  Cheer,
  CheerKind,
  Friend,
  SocialProfile,
} from '@/core/social';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';

export interface SocialContextValue {
  enabled: boolean;
  profile: SocialProfile | null;
  friends: Friend[];
  allyProgress: AllyProgress[];
  incomingCheers: Cheer[];
  /** Incoming Support-Circle invites awaiting this user's decision (Inbox → Requested, D2). */
  incomingAllyInvites: AllyInvite[];
  /** True once signed in but no public handle has been chosen yet. */
  needsHandle: boolean;
  /** Last gateway error, for the UI to surface. Null when healthy. */
  error: string | null;
  setHandle: (handle: string) => Promise<void>;
  addFriendByHandle: (handle: string) => Promise<void>;
  respondToFriend: (requesterId: string, accept: boolean) => Promise<void>;
  sendCheer: (toId: string, journeyId: string, kind?: CheerKind) => Promise<void>;
  // ── Support Circle (per-Journey Ally invites, D2) ──
  inviteAlly: (journeyId: string, allyId: string, bundle: AllyBundle) => Promise<void>;
  respondToAllyInvite: (journeyId: string, ownerId: string, accept: boolean) => Promise<void>;
  cancelInvite: (journeyId: string, allyId: string) => Promise<void>;
  removeAlly: (journeyId: string, allyId: string) => Promise<void>;
  changeAllyBundle: (journeyId: string, allyId: string, bundle: AllyBundle) => Promise<void>;
  /** Load the owner's Support Circle for one Journey (the screen manages its own list). */
  listJourneyAllies: (journeyId: string) => Promise<AllyMember[]>;
  closeJourneyInvites: (journeyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY: SocialContextValue = {
  enabled: false,
  profile: null,
  friends: [],
  allyProgress: [],
  incomingCheers: [],
  incomingAllyInvites: [],
  needsHandle: false,
  error: null,
  setHandle: async () => {},
  addFriendByHandle: async () => {},
  respondToFriend: async () => {},
  sendCheer: async () => {},
  inviteAlly: async () => {},
  respondToAllyInvite: async () => {},
  cancelInvite: async () => {},
  removeAlly: async () => {},
  changeAllyBundle: async () => {},
  listJourneyAllies: async () => [],
  closeJourneyInvites: async () => {},
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
  // Auth owns the session now (P2). The social pillar reacts to the uid instead
  // of minting its own anonymous account. A non-empty uid means a session exists.
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allyProgress, setAllyProgress] = useState<AllyProgress[]>([]);
  const [incomingCheers, setIncomingCheers] = useState<Cheer[]>([]);
  const [incomingAllyInvites, setIncomingAllyInvites] = useState<AllyInvite[]>([]);
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
      const [p, f, ap, invites] = await Promise.all([
        gateway.currentProfile(),
        gateway.listFriends(),
        gateway.allyProgress(),
        gateway.incomingAllyInvites(),
      ]);
      setProfile(p);
      setFriends(f);
      setAllyProgress(ap);
      setIncomingAllyInvites(invites);
    });
  }, [gateway, guard]);

  // ── React to the auth session (P2): AuthProvider owns the (anonymous) session;
  // when a uid becomes available or changes, (re)load profile + circle + ally
  // progress. On sign-out (uid → null) clear the local social state so no stale
  // friends/cheers linger. The realtime cheers channel is torn down by the
  // subscribe effect below, which re-binds on the new uid. ──
  useEffect(() => {
    let mounted = true;
    if (!uid) {
      setProfile(null);
      setFriends([]);
      setAllyProgress([]);
      setIncomingCheers([]);
      setIncomingAllyInvites([]);
      return;
    }
    void (async () => {
      if (mounted) await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, [uid, refresh]);

  // ── Incoming cheers: append to state + fire a local notification ──
  useEffect(() => {
    if (!uid) return; // no session yet — bind once the auth uid is known
    let configured = false;
    const unsubscribe = gateway.subscribeToCheers(uid, (cheer) => {
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
    // Re-subscribe once the auth uid is known so the realtime filter binds, and
    // tear down on sign-out (uid → null / changes).
  }, [gateway, uid]);

  // Keep the latest friends list available to the (stable) cheer callback.
  const friendsRef = useRef<Friend[]>([]);
  friendsRef.current = friends;

  // ── Publish progress for each shared Journey when the snapshot changes ──
  // SECURITY-PRIVACY (G2): this publish path may read ONLY the progress SUMMARY
  // (title + completion). It must NEVER read AppState.reasonLog (the Miss-Recovery
  // reasons / levers / on-device `note`) — that data is whitelist-excluded from all
  // sync (see ProgressSummary's barring note). Keep this reading `getSnapshot()`
  // journeys + `journeyProgress()` only.
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishAll = useCallback(() => {
    void guard(async () => {
      const [sharedIds, companionIds] = await Promise.all([
        gateway.mySharedJourneyIds(),
        gateway.myCompanionJourneyIds(),
      ]);
      if (sharedIds.length === 0) return;
      const snapshot = core.getSnapshot();
      const journeys = snapshot.journeys;
      for (const journeyId of sharedIds) {
        const journey = journeys.find((j) => j.id === journeyId);
        if (!journey) continue;
        await gateway.publishProgress({
          journeyId,
          title: journey.title,
          progress: core.journeyProgress(journeyId), // engine owns the math (Bible §19)
          streak: snapshot.streak, // the real engine-computed day-count streak (Bible §19)
        });
        // Companion Step progress — only for COACH Journeys that have a Companion Ally.
        // core.getCompanionSteps returns [] for a manual/legacy Journey, so a user-typed
        // Step title can never be published (D2 defense-in-depth; the whitelist bars free text).
        if (companionIds.includes(journeyId)) {
          await gateway.publishCompanionSteps(journeyId, core.getCompanionSteps(journeyId));
        }
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

  // A Cheer celebrates a friend who just moved forward; a Nudge is a gentle reach-out to a friend
  // who's gone quiet. They are semantically distinct outreach (the gateway persists the kind), so
  // the caller passes which one it is — defaulting to a Cheer.
  const sendCheer = useCallback(
    async (toId: string, journeyId: string, kind: CheerKind = 'cheer') => {
      await guard(async () => {
        await gateway.sendCheer(toId, journeyId, kind);
      });
    },
    [gateway, guard],
  );

  // ── Support Circle actions (per-Journey Ally invites, D2) ──
  // Publish the shared surface immediately on invite so it's ready the moment the invite is
  // accepted. `core.getCompanionSteps` returns [] for a non-coach Journey — so a manual Journey's
  // user-typed Step titles can never be published to a Companion (defense in depth).
  const inviteAlly = useCallback(
    async (journeyId: string, allyId: string, bundle: AllyBundle) => {
      await guard(async () => {
        const snapshot = core.getSnapshot();
        const journey = snapshot.journeys.find((j) => j.id === journeyId);
        // Security #3: refuse Companion on a non-coach Journey BEFORE any write, so a manual
        // Journey's user-typed title can never be unmasked (never sets visibility='full').
        assertCompanionAllowed(journey, bundle);
        await gateway.inviteAlly(journeyId, allyId, bundle);
        if (journey) {
          await gateway.publishProgress({
            journeyId,
            title: journey.title,
            progress: core.journeyProgress(journeyId),
            streak: snapshot.streak,
          });
          if (bundle === 'companion') {
            await gateway.publishCompanionSteps(journeyId, core.getCompanionSteps(journeyId));
          }
        }
      });
    },
    [core, gateway, guard],
  );

  const respondToAllyInvite = useCallback(
    async (journeyId: string, ownerId: string, accept: boolean) => {
      await guard(async () => {
        await gateway.respondToAllyInvite(journeyId, ownerId, accept);
      });
      await refresh();
    },
    [gateway, guard, refresh],
  );

  const cancelInvite = useCallback(
    async (journeyId: string, allyId: string) => {
      await guard(async () => {
        await gateway.cancelInvite(journeyId, allyId);
      });
    },
    [gateway, guard],
  );

  const removeAlly = useCallback(
    async (journeyId: string, allyId: string) => {
      await guard(async () => {
        await gateway.removeAlly(journeyId, allyId);
      });
    },
    [gateway, guard],
  );

  const changeAllyBundle = useCallback(
    async (journeyId: string, allyId: string, bundle: AllyBundle) => {
      await guard(async () => {
        // Security #3: same coach-only gate on a bundle switch — refuse before writing 'full'.
        const journey = core.getSnapshot().journeys.find((j) => j.id === journeyId);
        assertCompanionAllowed(journey, bundle);
        await gateway.changeAllyBundle(journeyId, allyId, bundle);
        if (bundle === 'companion') {
          await gateway.publishCompanionSteps(journeyId, core.getCompanionSteps(journeyId));
        }
      });
    },
    [core, gateway, guard],
  );

  const listJourneyAllies = useCallback(
    async (journeyId: string): Promise<AllyMember[]> => {
      try {
        const members = await gateway.listJourneyAllies(journeyId);
        setError(null);
        return members;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
        // Re-throw so the Support Circle panel can tell a failed load from a genuinely empty
        // circle (D2) — an offline blip must never read as "no members yet".
        throw e;
      }
    },
    [gateway],
  );

  const closeJourneyInvites = useCallback(
    async (journeyId: string) => {
      await guard(async () => {
        await gateway.closeJourneyInvites(journeyId);
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
    incomingAllyInvites,
    needsHandle: profile === null,
    error,
    setHandle,
    addFriendByHandle,
    respondToFriend,
    sendCheer,
    inviteAlly,
    respondToAllyInvite,
    cancelInvite,
    removeAlly,
    changeAllyBundle,
    listJourneyAllies,
    closeJourneyInvites,
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
