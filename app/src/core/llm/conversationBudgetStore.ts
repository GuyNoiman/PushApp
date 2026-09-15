/**
 * conversationBudgetStore — where a conversation's spend LIVES, so closing the screen does not
 * refill it.
 *
 * ── THE HOLE THIS CLOSES (founder, 2026-09-15) ─────────────────────────────────────────────────
 *
 * {@link ./conversationBudget} decides what one conversation may cost, and it was held in a
 * `useRef` inside `useLiveCoach`. A ref dies with the component. So somebody who started the
 * conversation, backed out and started again got a fresh six calls — and again, and again. The only
 * thing that actually stopped them was the proxy's lifetime byte cap, which is cumulative for life
 * and measured in bytes, and therefore can never say "this conversation cost too much".
 *
 * The founder cares about this most in the INTRODUCTION, because that person has not paid anything.
 *
 * ── WHAT A "CONVERSATION" IS, FOR BUDGET PURPOSES ──────────────────────────────────────────────
 *
 * A conversation survives the screen being closed, so the key does too:
 *
 *   · **introduction** — ONE conversation for the life of the install, however many times the first
 *     run is re-entered. Its spend accumulates across every attempt and never refills. That is the
 *     decision, not an oversight: re-entering the door is the same visit.
 *   · **planning** — the key is cleared when a Journey is actually CREATED, and only then. An
 *     abandoned-and-restarted planning conversation keeps its spend; a new one started after a real
 *     build starts empty. That is what makes the rule fair rather than punitive — the budget resets
 *     for finishing, not for leaving.
 *
 * ── WHAT IT IS NOT ─────────────────────────────────────────────────────────────────────────────
 *
 * Not a server-side cap. A device is not where spending is enforced (see `conversationBudget`'s own
 * header); a real per-conversation ceiling on the proxy is deliberately deferred until cost per
 * conversation is measured there. This changes WHERE the number is kept, never what it means.
 *
 * SECURITY-PRIVACY: two integers per conversation. No message, no goal, no name — nothing here is
 * user content, and nothing here syncs.
 *
 * A read that fails, or nothing stored, is an EMPTY budget: never a full one, and never a blocked
 * one. Storage trouble must not lock somebody out of the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from '../persistence/keyValueStore';
import { EMPTY_BUDGET, type BudgetState } from './conversationBudget';

/** Single source of truth for the persisted key prefix — no magic-string duplication. */
export const BUDGET_KEY_PREFIX = 'pushapp.conversationBudget.v1.';

/** The first run's introduction — one conversation, however many times it is re-entered. */
export const INTRODUCTION_CONVERSATION_KEY = 'introduction';
/** Every Journey-building conversation, until one of them actually builds a Journey. */
export const PLANNING_CONVERSATION_KEY = 'planning';

/** The seam the live coach reads and writes its budget through. Injected, so tests stay off-device. */
export interface ConversationBudgetStore {
  /** What this conversation has already spent. An unreadable or absent entry is an EMPTY budget. */
  load(conversationKey: string): Promise<BudgetState>;
  /** Write the running total back. Never throws — a lost write only means a more generous budget. */
  save(conversationKey: string, state: BudgetState): Promise<void>;
  /** Forget this conversation's spend, so the next one starts fresh. Used only on a real conclusion. */
  clear(conversationKey: string): Promise<void>;
}

/** A count we are willing to believe: a finite, non-negative whole number. */
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

/**
 * Read a stored budget defensively. Anything we did not write — a truncated string, a hand-edited
 * value, a negative number — is treated as nothing stored, which starts the conversation open rather
 * than locking it. The failure direction is chosen: an over-generous budget is a cost, a wrongly
 * closed one is a person who cannot use the app.
 */
export function parseBudgetState(raw: string | null): BudgetState {
  if (!raw) return EMPTY_BUDGET;
  try {
    const parsed = JSON.parse(raw) as { callsUsed?: unknown; tokensUsed?: unknown };
    const callsUsed = count(parsed.callsUsed);
    const tokensUsed = count(parsed.tokensUsed);
    if (callsUsed === null || tokensUsed === null) return EMPTY_BUDGET;
    return { callsUsed, tokensUsed };
  } catch {
    return EMPTY_BUDGET;
  }
}

/** Build a store over any {@link KeyValueStore}; production uses AsyncStorage. */
export function makeConversationBudgetStore(storage: KeyValueStore): ConversationBudgetStore {
  return {
    async load(conversationKey) {
      try {
        return parseBudgetState(await storage.getItem(BUDGET_KEY_PREFIX + conversationKey));
      } catch {
        return EMPTY_BUDGET;
      }
    },
    async save(conversationKey, state) {
      try {
        await storage.setItem(BUDGET_KEY_PREFIX + conversationKey, JSON.stringify(state));
      } catch {
        // A write failure only means this spend won't survive a relaunch — never crash a turn.
      }
    },
    async clear(conversationKey) {
      try {
        await storage.removeItem(BUDGET_KEY_PREFIX + conversationKey);
      } catch {
        // Same: the worst case is a budget that stays spent, which is the safe direction.
      }
    },
  };
}

/** The default on-device store, alongside the other small persisted markers. */
export const asyncStorageBudgetStore: ConversationBudgetStore =
  makeConversationBudgetStore(AsyncStorage);
