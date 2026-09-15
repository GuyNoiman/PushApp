/**
 * conversationTrace — the opaque id that lets the SERVER answer "what does one conversation cost".
 *
 * ── WHY THERE IS AN ID AT ALL ──────────────────────────────────────────────────────────────────
 *
 * The proxy has counted bytes and requests per user since 2026-08-18, and the founder has asked
 * twice for a spending limit. Every number we could put on such a limit is currently a guess,
 * because nothing groups calls: a user's lifetime byte total cannot say whether a conversation costs
 * a tenth of a cent or four cents, and "cap a conversation at X" needs X. Grouping needs a key, so
 * the client mints one and sends it with every call. The proxy records tokens against it.
 *
 * ── WHAT THE ID IS, AND WHAT IT DELIBERATELY IS NOT ────────────────────────────────────────────
 *
 * 128 random bits, hex. It is derived from NOTHING: not the user id, not the goal, not the clock,
 * not a counter. `../util/createId` was the obvious thing to reach for and is the wrong tool here —
 * it embeds `Date.now()`, so the id would leak when the conversation started to anyone who reads a
 * row. An id that carries information is an id that has to be reasoned about every time the table is
 * queried; one that carries none never has to be.
 *
 * SECURITY-PRIVACY (G1): what leaves the device is this id and a KIND. No message, no goal, no
 * title, no fragment of anything anyone wrote. If a field here could ever carry user text, it does
 * not belong in this file.
 *
 * ── WHY THE KIND IS SENT SEPARATELY ────────────────────────────────────────────────────────────
 *
 * The product question is not "what does a conversation cost" but "what does the INTRODUCTION cost
 * compared with building a Journey" — the introduction is spent on somebody who has paid nothing.
 * Two kinds, sent as a small closed word, is what makes that comparison possible without ever
 * putting the id and the person in the same sentence.
 *
 * ── LIFETIME: THE SAME CONVERSATION THE BUDGET MEANS ───────────────────────────────────────────
 *
 * The id is keyed and cleared exactly like {@link ./conversationBudgetStore}'s budget, on purpose —
 * two different definitions of "a conversation" on two sides of the same feature is how a dashboard
 * ends up disagreeing with the thing it measures.
 *
 *   · **introduction** — one id for the life of the install, however many times first run is
 *     re-entered. Re-entering the door is the same visit.
 *   · **planning** — one id until a Journey is actually CREATED, and only then a new one.
 *
 * Nothing here blocks a call. A storage failure costs grouping accuracy, never a coach turn.
 *
 * Pure TypeScript — no React, no UI, no vendor SDK beyond the random source.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';

import type { KeyValueStore } from '../persistence/keyValueStore';
import {
  INTRODUCTION_CONVERSATION_KEY,
  PLANNING_CONVERSATION_KEY,
} from './conversationBudgetStore';

/**
 * The two conversations whose costs the founder wants compared. Same words as the budget's keys —
 * one vocabulary, so a row in the cost table and an entry in the budget store mean the same thing.
 */
export type ConversationKind =
  | typeof INTRODUCTION_CONVERSATION_KEY
  | typeof PLANNING_CONVERSATION_KEY;

export const CONVERSATION_KINDS: readonly ConversationKind[] = [
  INTRODUCTION_CONVERSATION_KEY,
  PLANNING_CONVERSATION_KEY,
];

/** What rides along with a proxied call. Two opaque fields; nothing else is allowed in here. */
export interface ConversationTag {
  /** 32 hex characters of randomness. Opaque by construction. */
  id: string;
  kind: ConversationKind;
}

/** Single source of truth for the persisted key prefix — no magic-string duplication. */
export const TRACE_KEY_PREFIX = 'pushapp.conversationTrace.v1.';

/** Exactly what {@link newConversationId} produces, and exactly what the proxy will accept. */
export const CONVERSATION_ID_PATTERN = /^[0-9a-f]{32}$/;

export function isConversationId(value: unknown): value is string {
  return typeof value === 'string' && CONVERSATION_ID_PATTERN.test(value);
}

/**
 * 128 random bits as hex.
 *
 * Web Crypto first (the browser and the dev harness), `expo-crypto` second (Hermes ships no Web
 * Crypto, so on a real phone this is the branch that runs). If BOTH are unavailable the id is still
 * produced, from `Math.random`, and that is a deliberate choice rather than an oversight: this id
 * seals nothing and authenticates nobody, so weak randomness here is a COLLISION risk — two
 * conversations' costs added together — and never a confidentiality one. A thrown error, by
 * contrast, would break a coach turn to protect a dashboard.
 */
export function newConversationId(): string {
  const bytes = new Uint8Array(16);
  const webCrypto = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } })
    .crypto;
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else if (typeof ExpoCrypto.getRandomValues === 'function') {
    ExpoCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The seam the coach reads its conversation tag through. Injected, so tests stay off-device. */
export interface ConversationTraceStore {
  /** The tag for this kind, minted on first use and stable until {@link clear}. */
  tagFor(kind: ConversationKind): Promise<ConversationTag>;
  /** Forget this kind's id, so the next call starts a new conversation. Only on a real conclusion. */
  clear(kind: ConversationKind): Promise<void>;
}

/**
 * Build a trace store over any {@link KeyValueStore}; production uses AsyncStorage.
 *
 * The in-memory cache is not an optimisation, it is the failure plan. If storage cannot be read or
 * written, every call would otherwise mint a fresh id and the table would fill with one-call
 * "conversations" — a dashboard that reports many cheap conversations where there was one expensive
 * one. With the cache, a device whose storage is broken still groups correctly for as long as the
 * app is running, and only loses grouping across a relaunch.
 */
export function makeConversationTraceStore(storage: KeyValueStore): ConversationTraceStore {
  const cache = new Map<ConversationKind, string>();

  return {
    async tagFor(kind) {
      const cached = cache.get(kind);
      if (cached) return { id: cached, kind };

      let stored: string | null = null;
      try {
        stored = await storage.getItem(TRACE_KEY_PREFIX + kind);
      } catch {
        // Unreadable storage is treated as nothing stored — see the cache note above.
      }

      // Anything we did not write ourselves is not trusted as an id; mint a new one rather than
      // send a string of unknown provenance to the server.
      const id = isConversationId(stored) ? stored : newConversationId();
      cache.set(kind, id);
      if (id !== stored) {
        try {
          await storage.setItem(TRACE_KEY_PREFIX + kind, id);
        } catch {
          // The cache carries it for this run; a relaunch starts a new conversation id.
        }
      }
      return { id, kind };
    },

    async clear(kind) {
      cache.delete(kind);
      try {
        await storage.removeItem(TRACE_KEY_PREFIX + kind);
      } catch {
        // Worst case the next conversation reuses the id and its cost is added to the last one's,
        // which is visible in the data rather than silent — and never blocks anybody.
      }
    },
  };
}

/** The default on-device store, alongside the budget it shares a definition of "conversation" with. */
export const asyncStorageConversationTrace: ConversationTraceStore =
  makeConversationTraceStore(AsyncStorage);
