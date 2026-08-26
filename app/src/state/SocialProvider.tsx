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
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { assertCompanionAllowed, getSocialGateway } from '@/core/social';
// From its own module rather than the barrel: the barrel is what the provider's tests mock, and a
// pure derivation should not disappear because a test stubbed the gateway next to it.
import { globalAllies } from '@/core/social/circleRows';
// Imported from the module itself, not the barrel: this is a runtime VALUE (an `instanceof`
// check), and the barrel pulls the Supabase-backed gateway in with it.
import { NotFriendsError } from '@/core/social/SocialGateway';
import type {
  AllyBundle,
  AllyInvite,
  AllyMember,
  AllyProgress,
  Cheer,
  CheerKind,
  Friend,
  FriendProfileView,
  JourneyStatusEvent,
  SocialProfile,
  UnfriendImpact,
} from '@/core/social';
import { isRunning } from '@/core/util/journeyStatus';

/**
 * How far back the bell looks for pause/resume events (R6, D79). A pause is news; a pause from six
 * weeks ago is history, and history belongs on the Journey, not in an activity feed. The server
 * prunes to the same horizon, so the two cannot drift into disagreeing about what still exists.
 */
const JOURNEY_STATUS_EVENT_DAYS = 30;
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';

export interface SocialContextValue {
  enabled: boolean;
  profile: SocialProfile | null;
  friends: Friend[];
  allyProgress: AllyProgress[];
  /**
   * Everyone in at least one of my Support Circles who is NOT a friend — the global Ally list behind
   * Circle's second tab (founder, 2026-08-20). Derived, never stored: the truth is the circles.
   */
  allies: SocialProfile[];
  incomingCheers: Cheer[];
  /** Incoming Support-Circle invites awaiting this user's decision (Inbox → Requested, D2). */
  incomingAllyInvites: AllyInvite[];
  /**
   * Recent pause/resume events on Journeys this user is an Ally of (R6, D79). Bounded to the last
   * {@link JOURNEY_STATUS_EVENT_DAYS} days: an event is only interesting while it is news.
   */
  journeyStatusEvents: JourneyStatusEvent[];
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
  // ── Friend Profile (Friend_Profile_PRD.md) ──
  /**
   * One friend's viewer-scoped profile, served from the short-lived memory cache when fresh.
   * Rejects with `NotFriendsError` when the friendship is gone, and re-throws every other
   * failure so the screen can tell a failed load from an empty profile.
   */
  loadFriendProfile: (friendId: string, opts?: { force?: boolean }) => Promise<FriendProfileView>;
  /** Real impact counts for the remove-friend confirmation. Never cached — never guessed. */
  loadUnfriendImpact: (friendId: string) => Promise<UnfriendImpact>;
  /** Remove a friend (both directions, Allies included). Rejects if the server refused. */
  removeFriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * How long a fetched friend profile may be reused before the friendship is re-verified — the
 * "short authorization lease" of PRD §6. Short on purpose: the other person can withdraw a
 * Journey, or the friendship itself, at any moment.
 */
const FRIEND_PROFILE_TTL_MS = 60_000;

const EMPTY: SocialContextValue = {
  enabled: false,
  profile: null,
  friends: [],
  allyProgress: [],
  allies: [],
  incomingCheers: [],
  incomingAllyInvites: [],
  journeyStatusEvents: [],
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
  // Same deliberate asymmetry as NullSocialGateway: the two READS reject rather than hand back an
  // empty profile or a fabricated `0` impact count in front of a destructive action, while the
  // destructive write itself is inert with the pillar off.
  loadFriendProfile: async () => { throw new Error('Social pillar is disabled'); },
  loadUnfriendImpact: async () => { throw new Error('Social pillar is disabled'); },
  removeFriend: async () => {},
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
  const [circleMembers, setCircleMembers] = useState<AllyMember[]>([]);
  const [incomingCheers, setIncomingCheers] = useState<Cheer[]>([]);
  const [incomingAllyInvites, setIncomingAllyInvites] = useState<AllyInvite[]>([]);
  const [journeyStatusEvents, setJourneyStatusEvents] = useState<JourneyStatusEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const profileRef = useRef<SocialProfile | null>(null);
  profileRef.current = profile;

  // ── Friend-profile cache — the answer to PRD §6/§7 ────────────────────────────────────────
  // PROCESS MEMORY ONLY. Nothing about a friend is ever written to AsyncStorage or the
  // EncryptedLocalRepository: not the handle, the buddy name, a Journey title, progress, streak,
  // Step names, completion text or report media. Because the cache physically cannot reach disk,
  // the PRD's "encrypt any short-lived cache" requirement is met BY CONSTRUCTION instead of by
  // adding a second crypto path to keep correct.
  //
  // The authorization lease is {@link FRIEND_PROFILE_TTL_MS}; past it the profile is refetched, which
  // re-runs both the friendship check and the server-side `are_friends()` gate. Entries are purged
  // on remove-friend, cleared on sign-out / uid change, and cleared when the app returns to the
  // foreground. A lapsed entry is dropped BEFORE the refetch, so a failed refresh can never render
  // stale data the viewer may no longer be allowed to see — only a fresh entry ever renders.
  //
  // The profile deliberately never asks for Companion Steps: Step names stay on the Journey ally
  // view. Least exposure, and it removes the "don't durably cache Step names" risk class here.
  const friendProfileCache = useRef<Map<string, FriendProfileView>>(new Map());

  const purgeFriendProfile = useCallback((friendId: string) => {
    friendProfileCache.current.delete(friendId);
  }, []);

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
      const [p, f, ap, invites, members, statusEvents] = await Promise.all([
        gateway.currentProfile(),
        gateway.listFriends(),
        gateway.allyProgress(),
        gateway.incomingAllyInvites(),
        gateway.listAllAllies(),
        // Best-effort on its own: a pause notice failing to load must not take the whole circle
        // down with it, which is what an unguarded rejection inside Promise.all would do.
        gateway.allyJourneyStatusEvents(JOURNEY_STATUS_EVENT_DAYS).catch(() => []),
      ]);
      setProfile(p);
      setFriends(f);
      setAllyProgress(ap);
      setIncomingAllyInvites(invites);
      setCircleMembers(members);
      setJourneyStatusEvents(statusEvents);
    });
  }, [gateway, guard]);

  // ── React to the auth session (P2): AuthProvider owns the (anonymous) session;
  // when a uid becomes available or changes, (re)load profile + circle + ally
  // progress. On sign-out (uid → null) clear the local social state so no stale
  // friends/cheers linger. The realtime cheers channel is torn down by the
  // subscribe effect below, which re-binds on the new uid. ──
  useEffect(() => {
    let mounted = true;
    // Any change of identity (including sign-out) invalidates every cached friend profile — it was
    // fetched for a different viewer's authorization.
    friendProfileCache.current.clear();
    if (!uid) {
      setProfile(null);
      setFriends([]);
      setAllyProgress([]);
      setIncomingCheers([]);
      setIncomingAllyInvites([]);
      setJourneyStatusEvents([]);
      setCircleMembers([]);
      return;
    }
    void (async () => {
      if (mounted) await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, [uid, refresh]);

  // ── Revalidate friend profiles on foreground (PRD §6) ──
  // Anything can have changed while the app was in the background — the friend may have removed
  // us, or stopped sharing a Journey. Dropping the whole map means the next profile opened is
  // fetched fresh, with the friendship re-checked, rather than trusting a lease taken before.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') friendProfileCache.current.clear();
    });
    return () => subscription.remove();
  }, []);

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
        // PRD §4.3 (Friend Profile): an Ally sees ACTIVE Journeys only. Anything else — frozen,
        // completed, abandoned, any lifecycle status added later, or a Journey that no longer
        // exists on this device — has its published summary and its Companion Step names
        // WITHDRAWN instead of refreshed. Gated on the POSITIVE `isRunning` predicate on purpose:
        // an allowlist keeps every future lifecycle state private by default instead of letting it
        // leak through a negation nobody remembered to update.
        //
        // Withdrawing the SNAPSHOT (not the invites) is the whole point: `closeJourneyInvites`
        // would be irreversible for the recipient (`respondToAllyInvite` only accepts a still
        // `requested` row), whereas leaving `journey_allies` accepted means resuming a Frozen
        // Journey republishes it below and it reappears for the same Allies with the same bundle.
        // The Step clear runs unconditionally: a Journey that used to be Companion must stop
        // serving Step names even after its Companion Ally is gone (the delete is idempotent).
        if (!journey || !isRunning(journey)) {
          await gateway.withdrawProgress(journeyId);
          await gateway.publishCompanionSteps(journeyId, []);
          continue;
        }
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

  // ── Friend Profile actions (Friend_Profile_PRD.md) ──
  // These follow the `listJourneyAllies` pattern rather than `guard()`: they set `error` AND
  // re-throw, because a profile screen must be able to tell a failed load from a genuinely empty
  // profile. Swallowing here would render "nothing shared" over an offline blip.
  const loadFriendProfile = useCallback(
    async (friendId: string, opts?: { force?: boolean }): Promise<FriendProfileView> => {
      const cached = friendProfileCache.current.get(friendId);
      if (!opts?.force && cached && Date.now() - cached.fetchedAt < FRIEND_PROFILE_TTL_MS) {
        return cached;
      }
      // Drop the lapsed entry BEFORE the refetch — never stale-on-error.
      friendProfileCache.current.delete(friendId);
      try {
        const view = await gateway.friendProfile(friendId);
        friendProfileCache.current.set(friendId, view);
        setError(null);
        return view;
      } catch (e) {
        // "You're not connected" is an authorization STATE the screen renders on purpose, not a
        // gateway failure — surfacing it in the shared error banner would light up the Circle tab
        // for something that is working exactly as designed.
        setError(e instanceof NotFriendsError ? null : e instanceof Error ? e.message : 'Something went wrong.');
        throw e;
      }
    },
    [gateway],
  );

  const loadUnfriendImpact = useCallback(
    async (friendId: string): Promise<UnfriendImpact> => {
      // Never cached: these counts sit in front of an irreversible action, so they are read fresh
      // every time the confirmation opens.
      try {
        const impact = await gateway.unfriendImpact(friendId);
        setError(null);
        return impact;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
        // Re-thrown so the confirmation can disable itself instead of showing an invented 0.
        throw e;
      }
    },
    [gateway],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      // Destructive and confirmed by a sheet that must stay open when the server refuses — so this
      // sets `error` like guard() does but also RE-THROWS, and only purges/refreshes once the
      // removal actually landed. The Ally rows fall server-side via `cascade_unfriend()`.
      try {
        await gateway.removeFriend(friendId);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
        throw e;
      }
      purgeFriendProfile(friendId);
      await refresh();
    },
    [gateway, purgeFriendProfile, refresh],
  );

  const closeJourneyInvites = useCallback(
    async (journeyId: string) => {
      await guard(async () => {
        await gateway.closeJourneyInvites(journeyId);
      });
    },
    [gateway, guard],
  );

  // Derived on read, not stored: the Ally list is a VIEW of the circles minus the friends, so it
  // cannot fall out of step with either of them.
  const allies = useMemo(() => globalAllies(circleMembers, friends), [circleMembers, friends]);

  const value: SocialContextValue = {
    enabled: true,
    profile,
    friends,
    allyProgress,
    allies,
    incomingCheers,
    incomingAllyInvites,
    journeyStatusEvents,
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
    loadFriendProfile,
    loadUnfriendImpact,
    removeFriend,
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
