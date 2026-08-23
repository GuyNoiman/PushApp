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

import type { StepStatus } from '../status/stepStatus';

export type Visibility = 'full' | 'progress' | 'anonymous';
export type FriendStatus = 'pending' | 'accepted';
export type CheerKind = 'cheer' | 'nudge';

/**
 * A Support-Circle permission BUNDLE (Journey Support Circle, D2). Maps 1:1 onto the DB
 * `journey_allies.visibility` column, kept as the wire storage:
 * - `encourager` → 'progress': the masked title/progress/streak summary (no Step list);
 * - `companion`  → 'full': everything an Encourager sees, PLUS system-generated Step
 *   progress (names + derived statuses). Companion is offered ONLY for coach-created
 *   Journeys (a manual Journey's user-typed titles must never reach it).
 */
export type AllyBundle = 'encourager' | 'companion';

/** Consent lifecycle of one Journey↔Ally invite (D2). No data is visible before `accepted`. */
export type AllyInviteStatus = 'requested' | 'accepted' | 'declined' | 'cancelled' | 'closed';

/** Map a bundle to the DB `visibility` value it is stored as, and back. */
export function bundleToVisibility(bundle: AllyBundle): Visibility {
  return bundle === 'companion' ? 'full' : 'progress';
}
export function bundleFromVisibility(visibility: Visibility): AllyBundle {
  return visibility === 'full' ? 'companion' : 'encourager';
}

/** The owner's view of one member of a Journey's Support Circle. */
export interface AllyMember {
  profile: SocialProfile;
  bundle: AllyBundle;
  status: AllyInviteStatus;
}

/** The recipient's view of an incoming Support-Circle invite (Inbox → Requested). */
export interface AllyInvite {
  owner: SocialProfile;
  journeyId: string;
  bundle: AllyBundle;
  status: AllyInviteStatus;
  /**
   * Epoch ms the invite was sent (`journey_allies.requested_at`). Optional for the same reason as
   * {@link Friend.requestedAt}: fixtures have no server row, and the feed refuses to guess.
   */
  requestedAt?: number;
}

/**
 * One Companion Step row the OWNER publishes for a coach Journey (D2). SYSTEM-GENERATED
 * data ONLY — `stepId`, the coach-generated `title`, a derived {@link StepStatus}, and the
 * report date. NEVER a reason, note, description, "why", or any user free text (that data is
 * whitelist-barred from all sync — see {@link ProgressSummary}).
 */
export interface CompanionStepInput {
  stepId: string;
  title: string;
  status: StepStatus;
  /** Epoch ms of the last report/check-in, or null when unreported. */
  reportedAt: number | null;
}

/** What a Companion Ally reads back for one Step of a Journey they support. */
export interface CompanionStep {
  stepId: string;
  title: string;
  status: StepStatus;
  reportedAt: number | null;
  updatedAt: number;
}

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
  /**
   * Epoch ms the request was made (`friendships.created_at`). Optional ONLY because fixtures and
   * the dev sample data build Friends without a server row; every Friend that came from the
   * gateway has it. The notification feed skips a request with no time rather than invent one.
   */
  requestedAt?: number;
}

/**
 * What the OWNER publishes about one of their Journeys. Summary only.
 *
 * SECURITY-PRIVACY (G2, data minimization Bible §8): this is a WHITELIST of the ONLY
 * fields that may ever leave the device for a Journey. The Miss-Recovery reason log
 * (AppState.reasonLog) — reasons, chosen levers, and especially the on-device `note` —
 * is BARRED from this summary and from every other sync path. Equally BARRED: the adaptive
 * coach's on-device raw signal (RawBehaviorRecord), any coach conversation text, and exact
 * goal/title specifics — those never leave the device; only the bucketed OutreachInsight
 * projection may (via deriveOutreachInsight). Never add a reason/reflection/why/step-detail
 * field here without a fresh security-privacy review.
 */
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

// ── Friend Profile (Friend_Profile_PRD.md) ──────────────────────────────────

/**
 * One raw `journey_allies` row BETWEEN two specific users, in either direction. The friend
 * profile's relationship arithmetic is the only consumer; it is exported so the pure module
 * (`friendProfile.ts`) can do the counting and the gateway stays a dumb mapper (Bible §19).
 */
export interface AllyRelationRow {
  journeyId: string;
  ownerId: string;
  allyId: string;
  status: AllyInviteStatus;
  bundle: AllyBundle;
  /** Epoch ms of the accept/decline decision, or null while the invite is still `requested`. */
  decidedAt: number | null;
}

/**
 * The compact relationship summary in the profile header (PRD §4.2).
 *
 * `lifecycle` is deliberately typed as the literal `null` and NEVER a zeroed object: the server
 * stores no Journey lifecycle status (`progress_snapshots` has no status column, and
 * `journey_allies.status` is the INVITE lifecycle — it conflates owner-removed-ally, completed and
 * deleted). A breakdown built on today's data would be WRONG, not merely absent, and PRD §4.2
 * specifically warns against implying an Abandoned Journey was a success. Typing it `null` makes it
 * impossible for a consumer to render a fabricated breakdown. It widens to a real shape once the
 * migration that adds `progress_snapshots.status` lands.
 */
export interface RelationshipSummary {
  theySupportMe: number;
  iSupportThem: number;
  total: number;
  lifecycle: null;
}

/** What removing a friend will actually cost, shown BEFORE the destructive confirm (PRD §4.5). */
export interface UnfriendImpact {
  journeysTheySupportForMe: number;
  journeysISupportForThem: number;
  pendingInvites: number;
}

/** A viewer-scoped friend profile: identity + relationship + only what THIS viewer may see. */
export interface FriendProfileView {
  profile: SocialProfile;
  relationship: RelationshipSummary;
  sharedActive: AllyProgress[];
  /** Epoch ms the view was fetched — the authorization lease the provider's cache expires on. */
  fetchedAt: number;
}

/**
 * The actions a friend profile may offer. Direct messaging is deferred post-MVP (D29/D40), so
 * it is a TYPE-LEVEL seam only — this union widens to `| 'message'` when the Inbox ships. Keeping
 * consumers data-driven off this union means no dead button and no dead i18n key today, and no
 * rework later.
 */
export type FriendAction = 'cheer' | 'remove';

/**
 * Thrown when the viewer and the requested profile are not (or are no longer) accepted friends —
 * removed, blocked, deleted, or never connected. A distinct type so the screen can render the calm
 * "not connected" state with ZERO shared data instead of a generic error (PRD §6).
 */
export class NotFriendsError extends Error {
  constructor(message = 'You are not connected with this person.') {
    super(message);
    this.name = 'NotFriendsError';
    // Keep `instanceof` reliable through Babel/Hermes' downlevel of `extends Error`.
    Object.setPrototypeOf(this, NotFriendsError.prototype);
  }
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

  // ── Friend Profile (viewer-scoped, PRD §7) ──
  /**
   * The profile of ONE accepted friend, scoped to what this viewer is authorized to see.
   * Throws {@link NotFriendsError} when the friendship is absent or not yet accepted.
   */
  friendProfile(friendId: string): Promise<FriendProfileView>;
  /** Real counts for the remove-friend confirmation — never guessed, never defaulted to 0. */
  unfriendImpact(friendId: string): Promise<UnfriendImpact>;
  /** Remove the friendship in BOTH directions. Every Ally relationship falls with it (server-side). */
  removeFriend(friendId: string): Promise<void>;

  // ── Support Circle: per-Journey Ally invites (consent-gated, D2) ──
  /**
   * Invite a friend to a Journey's Support Circle with a permission bundle. Creates (or re-opens a
   * prior declined/cancelled) invite in the `requested` state — NO Journey data is visible until the
   * recipient accepts. `companion` is valid ONLY for coach-created Journeys; the caller (provider)
   * enforces that before calling.
   */
  inviteAlly(journeyId: string, allyId: string, bundle: AllyBundle): Promise<void>;
  /** Recipient responds to an incoming invite: accept (activate) or decline (neutral, reversible). */
  respondToAllyInvite(journeyId: string, ownerId: string, accept: boolean): Promise<void>;
  /** Owner cancels a still-`requested` invite. */
  cancelInvite(journeyId: string, allyId: string): Promise<void>;
  /** Owner removes an accepted Ally (or closes any live invite) — access is cut immediately. */
  removeAlly(journeyId: string, allyId: string): Promise<void>;
  /** Owner changes an existing member's bundle between the two MVP presets (no re-acceptance, D2 §3.2). */
  changeAllyBundle(journeyId: string, allyId: string, bundle: AllyBundle): Promise<void>;
  /** The owner's Support Circle for one Journey — every non-terminal member/invite. */
  listJourneyAllies(journeyId: string): Promise<AllyMember[]>;
  /**
   * Every person who has ACCEPTED a place in ANY of my Support Circles — the global Ally list
   * (founder, 2026-08-20: *"allies are everyone who is in at least one of my support circles and is
   * not saved as a friend… we do maintain one global list that is not in the context of a
   * Journey"*).
   *
   * One query rather than one per Journey: the Circle tab shows PEOPLE, and asking the server once
   * per shared Journey to assemble a list of people would make the screen slower the more the user
   * shares — exactly backwards. Pending invites are excluded: an invitation is not yet a circle.
   */
  listAllAllies(): Promise<AllyMember[]>;
  /** Incoming Support-Circle invites still awaiting THIS user's decision (Inbox → Requested). */
  incomingAllyInvites(): Promise<AllyInvite[]>;
  /** Close every live invite for a Journey (lifecycle: complete/abandon/delete). */
  closeJourneyInvites(journeyId: string): Promise<void>;
  /** Publish the Companion Step payload for a coach Journey (replaces the prior set for that Journey). */
  publishCompanionSteps(journeyId: string, steps: CompanionStepInput[]): Promise<void>;
  /** Companion Step progress for a Journey the current user is an accepted Companion of. */
  companionSteps(ownerId: string, journeyId: string): Promise<CompanionStep[]>;

  // ── Allies (per-Journey sharing) ──
  publishProgress(summary: ProgressSummary): Promise<void>;
  /**
   * Stop serving a Journey's published summary WITHOUT touching its Support Circle (PRD §4.3).
   * Used when a shared Journey leaves the Active state (frozen / completed / gone): the
   * `journey_allies` rows stay `accepted`, so resuming republishes and the Journey reappears for
   * the same Allies with the same bundle. Closing the invites instead would be irreversible —
   * `respondToAllyInvite` only accepts a `requested` row.
   */
  withdrawProgress(journeyId: string): Promise<void>;
  /** Journeys the current user is an Ally of. */
  allyProgress(): Promise<AllyProgress[]>;
  /** Distinct ids of the current user's own Journeys that have at least one Ally. */
  mySharedJourneyIds(): Promise<string[]>;
  /** Distinct ids of the current user's own Journeys that have at least one COMPANION (full) Ally. */
  myCompanionJourneyIds(): Promise<string[]>;

  // ── Cheers ──
  sendCheer(toId: string, journeyId: string, kind: CheerKind): Promise<void>;
  /**
   * Realtime incoming cheers for a KNOWN user. The caller passes the uid it
   * already holds (from the auth session) so the realtime filter always binds —
   * the gateway no longer keeps its own uid cache to race against. Returns an
   * unsubscribe fn.
   */
  subscribeToCheers(uid: string, onCheer: (cheer: Cheer) => void): () => void;
  /**
   * Cheers and nudges RECEIVED, newest first, within the last `days`.
   *
   * WHY IT WAS MISSING UNTIL NOW: the only path for a cheer was the realtime subscription, so a
   * cheer that arrived while the app was closed was never seen by anybody — the row was written and
   * the app simply never asked for it. The rows have always been there and RLS has always allowed
   * the recipient to read them (`cheers_read`: `to_id = auth.uid()`); nothing needed to change on
   * the server for this.
   */
  listReceivedCheers(days: number): Promise<Cheer[]>;
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
  // Deliberately ASYMMETRIC with the no-ops around them: the two READS throw, the destructive
  // WRITE is inert. A silent empty profile or a silent `0` impact count in front of an
  // irreversible action is exactly what PRD §4.5 forbids — the caller must surface an error
  // rather than let someone confirm against invented numbers. `removeFriend` has nothing to
  // remove with the pillar off, so it no-ops like `removeAlly`.
  async friendProfile() { throw new Error('Social pillar is disabled'); },
  async unfriendImpact() { throw new Error('Social pillar is disabled'); },
  async removeFriend() {},
  async inviteAlly() {},
  async respondToAllyInvite() {},
  async cancelInvite() {},
  async removeAlly() {},
  async changeAllyBundle() {},
  async listJourneyAllies() { return []; },
  async listAllAllies() { return []; },
  async incomingAllyInvites() { return []; },
  async closeJourneyInvites() {},
  async publishCompanionSteps() {},
  async companionSteps() { return []; },
  async publishProgress() {},
  async withdrawProgress() {},
  async allyProgress() { return []; },
  async mySharedJourneyIds() { return []; },
  async myCompanionJourneyIds() { return []; },
  async sendCheer() {},
  subscribeToCheers() { return () => {}; },
  async listReceivedCheers() { return []; },
  subscribeToAllyUpdates() { return () => {}; },
};
