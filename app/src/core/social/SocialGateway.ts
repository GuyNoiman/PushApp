/**
 * SocialGateway — the boundary for the POC social / Allies pillar
 * (Engineering Bible §3 vendor independence, Social_Backend_Proposal.md / E2).
 *
 * Engines and UI depend on THIS interface only. `SupabaseSocialGateway` is the
 * single file that imports the Supabase SDK — swapping providers later is one new
 * file, no caller changes. Pure TS here: no vendor imports, no React.
 *
 * Terminology (canonical — 09_Product_Philosophy/Product_Terminology.md):
 * Support Circle = friends; an Ally = a friend chosen to see a specific Journey's
 * progress and cheer. Only a progress SUMMARY ever leaves the device — never the
 * reflections, the "why", or step detail (data minimization, Bible §8).
 */

export type Visibility = 'full' | 'progress' | 'anonymous';
export type FriendStatus = 'pending' | 'accepted';
export type CheerKind = 'cheer' | 'nudge';

/** Public, cosmetic identity other users can see. No personal data. */
export interface SocialProfile {
  id: string;
  handle: string;
  buddySummary: { name?: string; stage?: string; level?: number };
}

export interface Friend {
  profile: SocialProfile;
  status: FriendStatus;
  /** 'incoming' = they asked you; 'outgoing' = you asked them. */
  direction: 'incoming' | 'outgoing';
}

/** What the OWNER publishes about one of their Journeys. Summary only. */
export interface ProgressSummary {
  journeyId: string;
  title: string;
  /** 0..1 completion. */
  progress: number;
  streak: number;
}

/** What an ALLY sees about a Journey they support (title omitted if 'anonymous'). */
export interface AllyProgress {
  owner: SocialProfile;
  journeyId: string;
  title: string | null;
  progress: number;
  streak: number;
  updatedAt: number;
  visibility: Visibility;
}

export interface Cheer {
  id: string;
  fromId: string;
  toId: string;
  journeyId: string;
  kind: CheerKind;
  createdAt: number;
}

/**
 * The social surface the POC needs. Kept intentionally thin (proposal §2):
 * identity, Support Circle, per-Journey Allies, published summaries, cheers.
 * Auth is ANONYMOUS (no email, no SMTP, no cost): the user gets an account on
 * first use and picks a handle so friends can find them. Upgradable to
 * email/password later (Commercial) for cross-device login.
 */
export interface SocialGateway {
  /** Whether the pillar is configured/active (feature flag + env present). */
  readonly enabled: boolean;

  // ── Identity / auth (anonymous — friends link by handle) ──
  /** Ensure an anonymous account/session exists. Idempotent. */
  signInAnonymously(): Promise<void>;
  signOut(): Promise<void>;
  currentProfile(): Promise<SocialProfile | null>;
  /** Set/curate the user's public handle + cosmetic buddy summary. */
  upsertProfile(handle: string, buddySummary: SocialProfile['buddySummary']): Promise<SocialProfile>;

  // ── Support Circle (friends) ──
  findByHandle(handle: string): Promise<SocialProfile | null>;
  requestFriend(profileId: string): Promise<void>;
  respondToFriend(requesterId: string, accept: boolean): Promise<void>;
  listFriends(): Promise<Friend[]>;

  // ── Allies (per-Journey sharing) ──
  setAllies(journeyId: string, allyIds: string[], visibility: Visibility): Promise<void>;
  publishProgress(summary: ProgressSummary): Promise<void>;
  /** Journeys the current user is an Ally of. */
  allyProgress(): Promise<AllyProgress[]>;
  /** Distinct ids of the current user's own Journeys that have at least one Ally. */
  mySharedJourneyIds(): Promise<string[]>;

  // ── Cheers ──
  sendCheer(toId: string, journeyId: string, kind: CheerKind): Promise<void>;
  /** Realtime incoming cheers for the current user. Returns an unsubscribe fn. */
  subscribeToCheers(onCheer: (cheer: Cheer) => void): () => void;
  /** Realtime updates to Journeys the user is an Ally of. Returns an unsubscribe fn. */
  subscribeToAllyUpdates(onUpdate: (progress: AllyProgress) => void): () => void;
}

/**
 * No-op gateway used when the social pillar is disabled (no env / flag off).
 * Guarantees the four local pillars run untouched with the feature turned off.
 */
export const NullSocialGateway: SocialGateway = {
  enabled: false,
  async signInAnonymously() {},
  async signOut() {},
  async currentProfile() { return null; },
  async upsertProfile() { throw new Error('Social pillar is disabled'); },
  async findByHandle() { return null; },
  async requestFriend() {},
  async respondToFriend() {},
  async listFriends() { return []; },
  async setAllies() {},
  async publishProgress() {},
  async allyProgress() { return []; },
  async mySharedJourneyIds() { return []; },
  async sendCheer() {},
  subscribeToCheers() { return () => {}; },
  subscribeToAllyUpdates() { return () => {}; },
};
