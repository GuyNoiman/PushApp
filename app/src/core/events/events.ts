/**
 * DomainEvent union — the vocabulary the engines speak over the EventBus.
 * Engines never call each other directly; they emit and react to these events
 * (Engineering Bible §7 event-driven). Pure TS — no React/UI/vendor imports.
 */
import type { Buddy, BuddyStage, CheckIn, Journey, Step } from '../types/domain';

export interface JourneyCreated {
  type: 'JourneyCreated';
  journey: Journey;
}

export interface StepCheckedIn {
  type: 'StepCheckedIn';
  journeyId: string;
  step: Step;
  checkIn: CheckIn;
}

export interface JourneyCompleted {
  type: 'JourneyCompleted';
  journey: Journey;
}

export interface RewardGranted {
  type: 'RewardGranted';
  xp: number;
  coins: number;
  reason: 'StepCheckedIn' | 'JourneyCompleted';
  sourceJourneyId: string;
  sourceStepId?: string;
}

export interface BuddyReacted {
  type: 'BuddyReacted';
  buddy: Buddy;
  gainedXp: number;
  gainedCoins: number;
}

export interface BuddyEvolved {
  type: 'BuddyEvolved';
  buddy: Buddy;
  fromStage: BuddyStage;
  toStage: BuddyStage;
}

/** A Shop cosmetic was bought: Coins were spent and the item added to the Buddy. */
export interface ItemPurchased {
  type: 'ItemPurchased';
  itemId: string;
  coinsSpent: number;
  /** The Buddy's Coin balance after the purchase. */
  balance: number;
}

/** The equipped cosmetic changed. `itemId` is null when the Buddy was unequipped. */
export interface ItemEquipped {
  type: 'ItemEquipped';
  itemId: string | null;
}

export type DomainEvent =
  | JourneyCreated
  | StepCheckedIn
  | JourneyCompleted
  | RewardGranted
  | BuddyReacted
  | BuddyEvolved
  | ItemPurchased
  | ItemEquipped;

export type DomainEventType = DomainEvent['type'];

/** Narrow the union to the single event shape for a given type string. */
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
