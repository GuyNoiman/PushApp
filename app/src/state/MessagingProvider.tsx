/**
 * MessagingProvider — the app's live view of direct conversations, and the only place plaintext
 * exists outside a single screen's render.
 *
 * WHERE THE DECRYPTION HAPPENS, and why here: the gateway carries sealed boxes and the screens want
 * sentences. Doing it in one provider means there is exactly one place where a body is readable,
 * one place to audit, and no component that could accidentally hand ciphertext to something else.
 *
 * WHAT IT REFUSES TO DO: no summarising, no searching bodies, no passing a message anywhere near the
 * coach, analytics or a log. A message that cannot be opened becomes `undecryptable` and the screen
 * says so — it never renders the bytes (Inbox PRD §20).
 *
 * State only (Bible §19): every rule about limits, permission and ordering lives in
 * {@link ../core/messaging/model}.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  boxFor,
  canSend,
  deviceKeys,
  getMessagingGateway,
  inboxBadgeCount,
  markRead as markReadIn,
  open as openSealed,
  openRequestsFor,
  pairId,
  seal,
  sortChats,
  type ConversationRow,
  type DirectMessage,
  type SealedMessageRow,
  type SendRefusal,
} from '@/core/messaging';
import { createId } from '@/core/util/id';
import { useAuth } from '@/state/AuthProvider';

interface MessagingValue {
  enabled: boolean;
  ready: boolean;
  /** Approved conversations, newest activity first. */
  chats: ConversationRow[];
  /** Open requests addressed to me. */
  requests: ConversationRow[];
  /** Unread conversations + open requests — the mail badge. */
  badge: number;
  /** Decrypted messages of the conversation currently open, oldest first. */
  messages: DirectMessage[];
  /** Load (and decrypt) one conversation. Safe to call repeatedly. */
  openConversation: (conversationId: string) => Promise<void>;
  /** Start or fetch the canonical conversation with somebody. */
  conversationWith: (userId: string, approved: boolean) => Promise<ConversationRow | null>;
  /** Send. Returns a refusal when the rules say no — never silently drops (PRD §8.2). */
  send: (conversation: ConversationRow, body: string) => Promise<SendRefusal | null>;
  approve: (conversationId: string) => Promise<void>;
  block: (conversationId: string) => Promise<void>;
  markRead: (conversationId: string, messageIds: readonly string[]) => Promise<void>;
  mutes: Record<string, number | null>;
  setMute: (conversationId: string, until: number | null | undefined) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY: MessagingValue = {
  enabled: false,
  ready: true,
  chats: [],
  requests: [],
  badge: 0,
  messages: [],
  openConversation: async () => {},
  conversationWith: async () => null,
  send: async () => null,
  approve: async () => {},
  block: async () => {},
  markRead: async () => {},
  mutes: {},
  setMute: async () => {},
  refresh: async () => {},
};

const MessagingContext = createContext<MessagingValue>(EMPTY);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const gateway = getMessagingGateway();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messagesByConversation, setMessages] = useState<Record<string, DirectMessage[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [mutes, setMutes] = useState<Record<string, number | null>>({});

  /** This device's keypair, and the public keys of people we are talking to. */
  const keys = useRef<{ publicKey: string; secretKey: string } | null>(null);
  const theirKeys = useRef<Record<string, string>>({});

  const publicKeyOf = useCallback(
    async (userIdToFind: string): Promise<string | null> => {
      const cached = theirKeys.current[userIdToFind];
      if (cached) return cached;
      const fetched = await gateway.publicKeyOf(userIdToFind);
      if (fetched) theirKeys.current[userIdToFind] = fetched;
      return fetched;
    },
    [gateway],
  );

  /** Open a sealed row for this reader. Never throws, never yields ciphertext. */
  const decrypt = useCallback(
    async (row: SealedMessageRow, me: string): Promise<DirectMessage> => {
      const base: DirectMessage = {
        id: row.id,
        conversationId: row.conversationId,
        senderId: row.senderId,
        body: '',
        kind: row.kind,
        createdAt: row.createdAt,
        ...(row.deliveredAt !== undefined ? { deliveredAt: row.deliveredAt } : {}),
        ...(row.readAt !== undefined ? { readAt: row.readAt } : {}),
      };
      const mine = keys.current;
      if (!mine) return { ...base, undecryptable: true };
      const iAmSender = row.senderId === me;
      // Sealed to me by them, or to me by me — either way the other end of the box is the SENDER's
      // public key, which for my own messages is my own.
      const senderKey = iAmSender ? mine.publicKey : await publicKeyOf(row.senderId);
      if (!senderKey) return { ...base, undecryptable: true };
      const text = openSealed(
        { ciphertext: boxFor(row.sealed, iAmSender), nonce: row.sealed.nonce },
        mine.secretKey,
        senderKey,
      );
      return text === null ? { ...base, undecryptable: true } : { ...base, body: text };
    },
    [publicKeyOf],
  );

  const refresh = useCallback(async () => {
    if (!gateway.enabled || !userId) {
      setReady(true);
      return;
    }
    try {
      const [rows, mutedRows] = await Promise.all([gateway.listConversations(), gateway.listMutes()]);
      setConversations(rows);
      setMutes(mutedRows);
    } catch {
      // Offline or signed out: the cached lists stay, and nothing claims a false state.
    } finally {
      setReady(true);
    }
  }, [gateway, userId]);

  // This device's identity, published so other people can seal to it.
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const pair = await deviceKeys();
      if (!mounted) return;
      keys.current = pair;
      if (pair && gateway.enabled && userId) {
        try {
          await gateway.publishPublicKey(pair.publicKey);
        } catch {
          // A key we could not publish means people cannot write to us yet; the next launch retries.
        }
      }
      await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, [gateway, userId, refresh]);

  // Live incoming messages.
  useEffect(() => {
    if (!gateway.enabled || !userId) return;
    const unsubscribe = gateway.subscribeToMessages(userId, (row) => {
      void (async () => {
        const message = await decrypt(row, userId);
        setMessages((current) => {
          const list = current[row.conversationId] ?? [];
          if (list.some((m) => m.id === message.id)) return current; // dedupe by canonical id
          return { ...current, [row.conversationId]: [...list, message] };
        });
        setConversations((current) =>
          current.map((c) =>
            c.id === row.conversationId ? { ...c, lastMessageAt: row.createdAt } : c,
          ),
        );
      })();
    });
    return unsubscribe;
  }, [gateway, userId, decrypt]);

  const openConversation = useCallback(
    async (conversationId: string) => {
      setOpenId(conversationId);
      if (!gateway.enabled || !userId) return;
      try {
        const rows = await gateway.listMessages(conversationId);
        const decrypted = await Promise.all(rows.map((row) => decrypt(row, userId)));
        setMessages((current) => ({ ...current, [conversationId]: decrypted }));
      } catch {
        // Keep whatever is cached rather than emptying a thread on a failed fetch.
      }
    },
    [gateway, userId, decrypt],
  );

  const conversationWith = useCallback(
    async (otherId: string, approved: boolean) => {
      if (!gateway.enabled || !userId) return null;
      const row = await gateway.openConversation(otherId, approved ? 'approved' : 'requested');
      setConversations((current) =>
        current.some((c) => c.id === row.id) ? current.map((c) => (c.id === row.id ? row : c)) : [...current, row],
      );
      return row;
    },
    [gateway, userId],
  );

  const send = useCallback(
    async (conversation: ConversationRow, body: string): Promise<SendRefusal | null> => {
      if (!userId) return { reason: 'blocked' };
      const now = Date.now();
      const mine = (messagesByConversation[conversation.id] ?? []).filter((m) => m.senderId === userId);
      const refusal = canSend(
        {
          id: conversation.id,
          participantIds: conversation.participantIds,
          permission: conversation.permission,
          ...(conversation.expiresAt !== undefined ? { expiresAt: conversation.expiresAt } : {}),
        },
        body,
        mine,
        now,
      );
      if (refusal) return refusal;

      const otherId =
        conversation.participantIds[0] === userId
          ? conversation.participantIds[1]
          : conversation.participantIds[0];
      const mineKeys = keys.current;
      const theirs = await publicKeyOf(otherId);
      // No key for them yet means they have never opened the app on a device that has one. Refusing
      // is the honest answer: an "unencrypted just this once" fallback is how a guarantee dies.
      if (!mineKeys || !theirs) return { reason: 'blocked' };

      const sealed = seal(body, mineKeys.secretKey, mineKeys.publicKey, theirs);
      const id = createId('msg');
      const optimistic: DirectMessage = {
        id,
        conversationId: conversation.id,
        senderId: userId,
        body,
        kind: 'text',
        createdAt: now,
      };
      setMessages((current) => ({
        ...current,
        [conversation.id]: [...(current[conversation.id] ?? []), optimistic],
      }));
      try {
        await gateway.sendSealed({
          id,
          conversationId: conversation.id,
          senderId: userId,
          sealed,
          kind: 'text',
        });
      } catch {
        // The message stays on screen as sent-pending rather than disappearing; the next open
        // reconciles against the server, which is the source of truth.
      }
      return null;
    },
    [gateway, userId, messagesByConversation, publicKeyOf],
  );

  const approve = useCallback(
    async (conversationId: string) => {
      await gateway.approveConversation(conversationId);
      setConversations((current) =>
        current.map((c) =>
          c.id === conversationId
            ? { ...c, permission: 'approved', approvedAt: Date.now(), expiresAt: undefined }
            : c,
        ),
      );
    },
    [gateway],
  );

  const block = useCallback(
    async (conversationId: string) => {
      await gateway.blockConversation(conversationId);
      setConversations((current) =>
        current.map((c) => (c.id === conversationId ? { ...c, permission: 'blocked' } : c)),
      );
    },
    [gateway],
  );

  const markRead = useCallback(
    async (conversationId: string, messageIds: readonly string[]) => {
      if (!userId || messageIds.length === 0) return;
      setMessages((current) => ({
        ...current,
        [conversationId]: markReadIn(current[conversationId] ?? [], messageIds, userId, Date.now()),
      }));
      try {
        await gateway.markRead(messageIds);
      } catch {
        // A receipt that did not reach the server is re-sent next time the thread opens.
      }
    },
    [gateway, userId],
  );

  const setMute = useCallback(
    async (conversationId: string, until: number | null | undefined) => {
      await gateway.setMute(conversationId, until);
      setMutes((current) => {
        const next = { ...current };
        if (until === undefined) delete next[conversationId];
        else next[conversationId] = until;
        return next;
      });
    },
    [gateway],
  );

  const value = useMemo<MessagingValue>(() => {
    const now = Date.now();
    const asDomain = conversations.map((c) => ({
      id: c.id,
      participantIds: c.participantIds,
      permission: c.permission,
      ...(c.requestedAt !== undefined ? { requestedAt: c.requestedAt } : {}),
      ...(c.approvedAt !== undefined ? { approvedAt: c.approvedAt } : {}),
      ...(c.expiresAt !== undefined ? { expiresAt: c.expiresAt } : {}),
      ...(c.lastMessageAt !== undefined ? { lastMessageAt: c.lastMessageAt } : {}),
    }));
    const byId = new Map(conversations.map((c) => [c.id, c]));
    return {
      enabled: gateway.enabled,
      ready,
      chats: sortChats(asDomain).map((c) => byId.get(c.id)!),
      requests: userId ? openRequestsFor(asDomain, userId, now).map((c) => byId.get(c.id)!) : [],
      badge: userId ? inboxBadgeCount(asDomain, messagesByConversation, userId, now) : 0,
      messages: openId ? (messagesByConversation[openId] ?? []) : [],
      openConversation,
      conversationWith,
      send,
      approve,
      block,
      markRead,
      mutes,
      setMute,
      refresh,
    };
  }, [
    gateway.enabled,
    ready,
    conversations,
    messagesByConversation,
    openId,
    userId,
    openConversation,
    conversationWith,
    send,
    approve,
    block,
    markRead,
    mutes,
    setMute,
    refresh,
  ]);

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging(): MessagingValue {
  return useContext(MessagingContext);
}

/** The canonical conversation id for a pair — re-exported so screens do not import the engine. */
export { pairId };
