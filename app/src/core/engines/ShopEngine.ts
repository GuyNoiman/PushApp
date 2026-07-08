/**
 * ShopEngine — owns the Coin-spending side of the economy: buying Buddy
 * cosmetics and equipping them. It reads prices from config/shopItems (never
 * hardcoded here), validates every purchase, mutates the Buddy through an
 * accessor, and emits ItemPurchased / ItemEquipped. Pure TS — no UI import.
 *
 * Coin *earning* stays in RewardEngine; ShopEngine only spends. It is
 * command-driven (called by the AppCore facade), so it subscribes to nothing.
 */
import type { ShopItem } from '../config/shopItems';
import type { EventBus } from '../events/EventBus';
import type { AppState, Buddy } from '../types/domain';

export class ShopEngine {
  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    private readonly items: ShopItem[],
  ) {}

  private find(itemId: string): ShopItem | undefined {
    return this.items.find((item) => item.id === itemId);
  }

  /**
   * Buy a cosmetic: deducts its price in Coins and adds it to the Buddy.
   * No-op (returns false) when the item is unknown, already owned, or the Buddy
   * cannot afford it. Returns true and emits ItemPurchased on success.
   */
  purchase(itemId: string): boolean {
    const state = this.getState();
    const buddy = state.buddy;
    const item = this.find(itemId);
    if (!item) return false;
    if (buddy.ownedCosmetics.includes(itemId)) return false;
    if (buddy.coins < item.price) return false;

    const next: Buddy = {
      ...buddy,
      coins: buddy.coins - item.price,
      ownedCosmetics: [...buddy.ownedCosmetics, itemId],
    };
    state.buddy = next;

    this.bus.emit({
      type: 'ItemPurchased',
      itemId,
      coinsSpent: item.price,
      balance: next.coins,
    });
    return true;
  }

  /**
   * Wear an owned cosmetic on the Buddy. No-op (returns false) when the item is
   * not owned. Returns true and emits ItemEquipped on success.
   */
  equip(itemId: string): boolean {
    const state = this.getState();
    if (!state.buddy.ownedCosmetics.includes(itemId)) return false;
    if (state.buddy.equippedCosmetic === itemId) return true; // already worn — no redundant save/emit

    state.buddy = { ...state.buddy, equippedCosmetic: itemId };
    this.bus.emit({ type: 'ItemEquipped', itemId });
    return true;
  }

  /** Remove whatever cosmetic the Buddy is wearing. Emits ItemEquipped(null). */
  unequip(): void {
    const state = this.getState();
    if (state.buddy.equippedCosmetic === null) return;

    state.buddy = { ...state.buddy, equippedCosmetic: null };
    this.bus.emit({ type: 'ItemEquipped', itemId: null });
  }
}
