/**
 * MessagingGateway — the boundary for direct messaging (Engineering Bible §3, vendor independence).
 *
 * Engines and UI depend on THIS interface only; `SupabaseMessagingGateway` is the single file that
 * imports the SDK, so swapping the backend later is one new file and no caller changes.
 *
 * WHAT CROSSES THIS BOUNDARY IS ALREADY SEALED. The gateway takes and returns ciphertext; it has no
 * method that accepts a plaintext body and no method that returns one. Encryption happens above it,
 * in `crypto.ts`, which means a future gateway — a different backend, a test double, a sync
 * daemon — cannot accidentally be handed something readable.
 *
 * Pure TS: no vendor imports, no React.
 */
import type { SealedMessage } from './crypto';
import type { ConversationPermission, MessageKind } from './model';

/** One conversation, as the server knows it. */
export interface ConversationRow {
  id: string;
  participantIds: [string, string];
  permission: ConversationPermission;
  requestedBy?: string;
  requestedAt?: number;
  approvedAt?: number;
  expiresAt?: number;
  lastMessageAt?: number;
}

/** One message, still sealed. */
export interface SealedMessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  sealed: SealedMessage;
  kind: MessageKind;
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
}

export interface MessagingGateway {
  /** Whether the pillar is configured (feature flag + backend present). */
  readonly enabled: boolean;

  /**
   * Publish this device's PUBLIC key so others can seal to it. Idempotent; called at sign-in.
   * There is deliberately no method that uploads a secret key.
   */
  publishPublicKey(publicKey: string): Promise<void>;

  /** Someone's public key, or null when they have never opened the app on a device that has one. */
  publicKeyOf(userId: string): Promise<string | null>;

  /** Every conversation this user is part of. */
  listConversations(): Promise<ConversationRow[]>;

  /** Open (or fetch) the canonical conversation with someone. */
  openConversation(withUserId: string, permission: 'requested' | 'approved'): Promise<ConversationRow>;

  /** Accept a request. Idempotent. */
  approveConversation(conversationId: string): Promise<void>;

  /** Block. Terminal for as long as it lasts. */
  blockConversation(conversationId: string): Promise<void>;

  /** The sealed messages of one conversation, oldest first. */
  listMessages(conversationId: string, limit?: number): Promise<SealedMessageRow[]>;

  /** Send an ALREADY SEALED message. The id is the caller's, so a retry cannot duplicate. */
  sendSealed(row: Omit<SealedMessageRow, 'createdAt' | 'deliveredAt' | 'readAt'>): Promise<void>;

  /** Stamp incoming messages read. Only the recipient may; the server enforces it too. */
  markRead(messageIds: readonly string[]): Promise<void>;

  /** Live incoming messages for this user. Returns an unsubscribe. */
  subscribeToMessages(uid: string, onMessage: (row: SealedMessageRow) => void): () => void;

  /** Mute state, account-scoped. `undefined` = not muted; `null` = until turned back on. */
  setMute(conversationId: string, mutedUntil: number | null | undefined): Promise<void>;
  listMutes(): Promise<Record<string, number | null>>;
}

/** The inert gateway used when messaging is not configured. Every call is a safe no-op. */
export const NullMessagingGateway: MessagingGateway = {
  enabled: false,
  async publishPublicKey() {},
  async publicKeyOf() { return null; },
  async listConversations() { return []; },
  async openConversation(withUserId) {
    return {
      id: withUserId,
      participantIds: [withUserId, withUserId],
      permission: 'requested',
    };
  },
  async approveConversation() {},
  async blockConversation() {},
  async listMessages() { return []; },
  async sendSealed() {},
  async markRead() {},
  subscribeToMessages() { return () => {}; },
  async setMute() {},
  async listMutes() { return {}; },
};
